"""
AquaShield AI - Forecasting Engine Trainer & Direct Frontend Sync
Implements Monotonically Constrained Ordinal Classification,
Climatology-Benchmarked Regression, and Temperature Scaling Probability Calibration.
"""
import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, log_loss, mean_absolute_error

try:
    import lightgbm as lgb
    # Monotonic constraints: [DOY_SIN:0, DOY_COS:0, EC:+1, DISCHARGE:-1, DISCHARGE_LAG:-1, others:0]
    MONOTONE = [0, 0, 1, -1, -1, 0, 0, 0, 0, 0]
    
    def make_binary_classifier():
        return lgb.LGBMClassifier(
            n_estimators=120, learning_rate=0.04, max_depth=4,
            min_child_samples=15, subsample=0.85, colsample_bytree=0.85,
            monotone_constraints=MONOTONE, random_state=42, verbose=-1
        )
    def make_regressor():
        return lgb.LGBMRegressor(
            n_estimators=120, learning_rate=0.04, max_depth=4,
            monotone_constraints=MONOTONE, random_state=42, verbose=-1
        )
    MODEL_NAME = "LightGBM Monotonic Ordinal System"
except ImportError:
    from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor
    MONOTONE = [0, 0, 1, -1, -1, 0, 0, 0, 0, 0]
    def make_binary_classifier():
        return HistGradientBoostingClassifier(
            max_iter=120, learning_rate=0.04, max_depth=4,
            monotonic_cst=MONOTONE, random_state=42
        )
    def make_regressor():
        return HistGradientBoostingRegressor(
            max_iter=120, learning_rate=0.04, max_depth=4,
            monotonic_cst=MONOTONE, random_state=42
        )
    MODEL_NAME = "scikit-learn Monotonic Ordinal System"

BASE_DIR = Path(__file__).resolve().parent
CSV = BASE_DIR / "BWDB_Salinity_Dataset.csv"
HORIZONS = {"30D": 28, "60D": 56, "90D": 91}
TEST_START = pd.Timestamp("2023-01-01")
CALIB_START = pd.Timestamp("2022-01-01")
THRESHOLDS = (1500, 3000)
RISK_NAMES = ["Low", "Medium", "High"]

STATION_DISTANCES = {"SW1": 92, "SW135": 68, "SW242": 67}

ACTIONS = {
    "Low": "Routine monitoring. Surface reserves and community intakes operating normally.",
    "Medium": "Precautionary Advisory: Advise Union water committees to monitor salinity and conserve freshwater reserves.",
    "High": "CRITICAL PROTOCOL: Prepare municipal rainwater storage. Alert DPHE & local authorities to stage mobile treatment capacity."
}

FEATURES = [
    "DOY_SIN", "DOY_COS", "EC HIGHTIDE micromho/cm", "UPSTREAM_DISCHARGE_M3S",
    "DISCHARGE_LAG_30D", "RAINFALL_MM", "RAINFALL_4W_SUM", "NDWI_PROXY",
    "SOIL_MOISTURE", "TIDAL_SPRING_INDEX"
]
CALENDAR = ["DOY_SIN", "DOY_COS"]

# Objective, neutral feature attribution descriptors
FEATURE_HUMAN_LABELS = {
    "EC HIGHTIDE micromho/cm": "Baseline River Salinity Level",
    "UPSTREAM_DISCHARGE_M3S": "Upstream Freshwater Discharge Level",
    "DISCHARGE_LAG_30D": "Antecedent 30-Day Discharge Deficit",
    "TIDAL_SPRING_INDEX": "Spring-Neap Lunar Phase",
    "RAINFALL_4W_SUM": "Cumulative Coastal Precipitation",
    "NDWI_PROXY": "Surface Water Extent Proxy",
    "SOIL_MOISTURE": "Antecedent Soil Wetness",
    "DOY_SIN": "Annual Seasonal Phase",
    "DOY_COS": "Annual Meteorological Timing"
}

def apply_temperature_binary(p, T):
    # Logit temperature scaling: p_cal = sigmoid(logit(p) / T)
    p_clipped = np.clip(p, 1e-6, 1.0 - 1e-6)
    logit = np.log(p_clipped / (1.0 - p_clipped))
    return 1.0 / (1.0 + np.exp(-logit / T))

def find_temperature_binary(p, y):
    if len(y) < 30 or len(np.unique(y)) < 2:
        return 1.0
    grid = np.arange(0.5, 4.01, 0.05)
    losses = [log_loss(y, apply_temperature_binary(p, T)) for T in grid]
    return float(grid[int(np.argmin(losses))])

def predict_ordinal_probs(m1, m2, T1, T2, X):
    p1 = apply_temperature_binary(m1.predict_proba(X)[:, 1], T1)
    p2 = apply_temperature_binary(m2.predict_proba(X)[:, 1], T2)
    # P(EC >= 3000) cannot exceed P(EC >= 1500)
    p2 = np.minimum(p1, p2)
    
    p_low = 1.0 - p1
    p_med = p1 - p2
    p_high = p2
    
    P = np.column_stack([p_low, p_med, p_high])
    return P / P.sum(axis=1, keepdims=True)

def scores_multiclass(y, pred):
    return {
        "accuracy": round(float(accuracy_score(y, pred)), 3),
        "macro_f1": round(float(f1_score(y, pred, average="macro", labels=[0, 1, 2], zero_division=0)), 3)
    }

parser = argparse.ArgumentParser()
parser.add_argument("--as-of", default=None, help="Replay forecast as of date (YYYY-MM-DD)")
args = parser.parse_args()

df = pd.read_csv(CSV)
df["DATE_DT"] = pd.to_datetime(df["DATE"], format="%d-%b-%y")
synthetic = True

out_dir = BASE_DIR / "results"
model_dir = BASE_DIR / "models"
nextjs_dir = BASE_DIR.parent / "frontend" / "public" / "data"

out_dir.mkdir(exist_ok=True)
model_dir.mkdir(exist_ok=True)
nextjs_dir.mkdir(parents=True, exist_ok=True)

feature_medians = df[FEATURES].median().to_dict()

metrics = {
    "surrogate_demonstration_data": synthetic,
    "model_architecture": MODEL_NAME,
    "test_start_date": str(TEST_START.date()),
    "features": FEATURES,
    "horizons": {}
}

final_bundles = {}

print("\n" + "="*80)
print("AQUASHIELD AI - ORDINAL TEMPORAL EVALUATION (OUT-OF-TIME 2023-2024)")
print("="*80)

# Build seasonal climatology lookup on training data (day of year median per station)
train_climatology = df[df["DATE_DT"] < TEST_START].groupby(["STATION ID", "MONTH"])["EC HIGHTIDE micromho/cm"].median()

for name, days in HORIZONS.items():
    target = f"TARGET_RISK_{name}"
    target_ec = f"TARGET_EC_{name}"
    d = df.dropna(subset=[target, target_ec]).copy()
    d[target] = d[target].astype(int)
    
    gap_end = d["DATE_DT"] + pd.Timedelta(days=days)
    train = d[gap_end < TEST_START]
    test = d[d["DATE_DT"] >= TEST_START]
    
    fit_part = train[gap_end[train.index] < CALIB_START]
    calib_part = train[train["DATE_DT"] >= CALIB_START]

    # Target 1: EC >= 1500; Target 2: EC >= 3000
    y1_fit = (fit_part[target] >= 1).astype(int)
    y2_fit = (fit_part[target] >= 2).astype(int)
    y1_cal = (calib_part[target] >= 1).astype(int)
    y2_cal = (calib_part[target] >= 2).astype(int)

    # Train calibration models
    m1_cal = make_binary_classifier().fit(fit_part[FEATURES], y1_fit)
    m2_cal = make_binary_classifier().fit(fit_part[FEATURES], y2_fit)
    T1 = find_temperature_binary(m1_cal.predict_proba(calib_part[FEATURES])[:, 1], y1_cal.values)
    T2 = find_temperature_binary(m2_cal.predict_proba(calib_part[FEATURES])[:, 1], y2_cal.values)

    # Train operational models on full pre-2023 training set
    m1_train = make_binary_classifier().fit(train[FEATURES], (train[target] >= 1).astype(int))
    m2_train = make_binary_classifier().fit(train[FEATURES], (train[target] >= 2).astype(int))
    reg_train = make_regressor().fit(train[FEATURES], train[target_ec])

    # Out-of-time inference
    p_test = predict_ordinal_probs(m1_train, m2_train, T1, T2, test[FEATURES])
    pred_risk = p_test.argmax(axis=1)
    y_test = test[target].values
    pred_ec = reg_train.predict(test[FEATURES])
    y_test_ec = test[target_ec].values

    # Baseline calculations
    persist_pred = pd.cut(
        test["EC HIGHTIDE micromho/cm"],
        bins=[-np.inf, THRESHOLDS[0] - 1e-9, THRESHOLDS[1], np.inf],
        labels=[0, 1, 2]
    ).astype(int).values
    
    test_months = (test["DATE_DT"] + pd.Timedelta(days=days)).dt.month
    climatology_ec = [train_climatology.get((st, m), 1500.0) for st, m in zip(test["STATION ID"], test_months)]
    
    mae_model = round(float(mean_absolute_error(y_test_ec, pred_ec)), 1)
    mae_persist = round(float(mean_absolute_error(y_test_ec, test["EC HIGHTIDE micromho/cm"])), 1)
    mae_climatology = round(float(mean_absolute_error(y_test_ec, climatology_ec)), 1)

    m = {
        "train_rows": int(len(train)), "test_rows": int(len(test)),
        "temp_scaling_T": [round(T1, 2), round(T2, 2)],
        "model_risk": scores_multiclass(y_test, pred_risk),
        "baseline_persistence": scores_multiclass(y_test, persist_pred),
        "ec_regression_mae": {
            "model_mae": mae_model,
            "persistence_mae": mae_persist,
            "climatology_mae": mae_climatology
        }
    }
    metrics["horizons"][name] = m
    
    print(f"[{name} Horizon | T+{days}d]")
    print(f"  Risk Accuracy : {m['model_risk']['accuracy']} | Macro-F1: {m['model_risk']['macro_f1']} (Persistence: {m['baseline_persistence']['accuracy']})")
    print(f"  EC Regression : MAE {mae_model} µS/cm vs Climatology {mae_climatology} µS/cm | Persistence {mae_persist} µS/cm\n")

    # Fit final operational models across the full dataset
    final_m1 = make_binary_classifier().fit(d[FEATURES], (d[target] >= 1).astype(int))
    final_m2 = make_binary_classifier().fit(d[FEATURES], (d[target] >= 2).astype(int))
    final_reg = make_regressor().fit(d[FEATURES], d[target_ec])
    final_bundles[name] = {
        "m1": final_m1, "m2": final_m2, "reg": final_reg,
        "T1": T1, "T2": T2, "horizon_days": days
    }
    joblib.dump(final_bundles[name], model_dir / f"aquashield_ordinal_{name}.pkl")

# Generate live dashboard payload
src = df if args.as_of is None else df[df["DATE_DT"] <= pd.Timestamp(args.as_of)]
latest = src.sort_values("DATE_DT").groupby("STATION ID").tail(1)
as_of_date = str(latest["DATE_DT"].max().date())
stations_output = []
stress_simulation_matrix = {}

for _, row in latest.iterrows():
    st_id = row["STATION ID"]
    entry = {
        "station_id": st_id,
        "station_name": row["STATION"],
        "district": row["DISTRICT"],
        "upazila": row["UPAZILA"],
        "river": row["RIVER"],
        "latitude": float(row["LATITUDE"]),
        "longitude": float(row["LONGITUDE"]),
        "sea_distance_km": STATION_DISTANCES.get(st_id, 70),
        "current_ec": int(row["EC HIGHTIDE micromho/cm"]),
        "current_chloride": int(row["CHLORIDE HIGHTIDE PPM"]),
        "forecast": {}
    }
    
    X = row[FEATURES].to_frame().T.astype(float)
    for name, b in final_bundles.items():
        p_raw = predict_ordinal_probs(b["m1"], b["m2"], b["T1"], b["T2"], X)[0]
        class_idx = int(p_raw.argmax())
        level = RISK_NAMES[class_idx]

        # Simple feature perturbation attribution on high risk probability
        base_p_high = p_raw[2]
        deltas = {}
        for feat in FEATURES:
            X_p = X.copy()
            X_p[feat] = feature_medians[feat]
            p_p = predict_ordinal_probs(b["m1"], b["m2"], b["T1"], b["T2"], X_p)[0]
            deltas[feat] = abs(base_p_high - p_p[2])
        top_feature = max(deltas, key=deltas.get)
        driver = FEATURE_HUMAN_LABELS.get(top_feature, "Seasonal Estuarine Cycle")

        pred_ec = int(round(float(b["reg"].predict(X)[0])))
        pred_cl = int(round(pred_ec * 0.556))

        entry["forecast"][name.lower()] = {
            "lead_days": b["horizon_days"],
            "risk_level": level,
            "risk_code": class_idx,
            "projected_ec": max(250, pred_ec),
            "projected_chloride": max(140, pred_cl),
            "probabilities": {
                "low": int(round(float(p_raw[0]) * 100)),
                "medium": int(round(float(p_raw[1]) * 100)),
                "high": int(round(float(p_raw[2]) * 100))
            },
            "primary_driver": driver,
            "action_title": f"{level} Risk Advisory",
            "recommended_action": ACTIONS[level]
        }
    stations_output.append(entry)

    # Physical dynamic stress test: Simulates sustained upstream reduction through Savenije response
    b30 = final_bundles["30D"]
    stress_simulation_matrix[st_id] = {}
    base_q = float(X["UPSTREAM_DISCHARGE_M3S"].iloc[0])
    base_ec = float(X["EC HIGHTIDE micromho/cm"].iloc[0])
    
    for deficit_pct in [0, 20, 40, 60, 80]:
        factor = (100 - deficit_pct) / 100.0
        # Physical estuarine steady-state equilibrium shift: EC ~ Q^(-0.45)
        sim_ec = int(round(base_ec * (factor ** -0.45)))
        sim_level = "High" if sim_ec >= 3000 else ("Medium" if sim_ec >= 1500 else "Low")
        
        stress_simulation_matrix[st_id][str(deficit_pct)] = {
            "risk_level": sim_level,
            "simulated_ec": sim_ec,
            "deficit_pct": deficit_pct
        }

forecast_payload = json.dumps({
    "as_of_date": as_of_date,
    "surrogate_demonstration_data": synthetic,
    "stations": stations_output
}, indent=2)

metrics_payload = json.dumps(metrics, indent=2)
stress_payload = json.dumps(stress_simulation_matrix, indent=2)

(out_dir / "latest_forecast.json").write_text(forecast_payload)
(nextjs_dir / "latest_forecast.json").write_text(forecast_payload)
(out_dir / "metrics.json").write_text(metrics_payload)
(nextjs_dir / "metrics.json").write_text(metrics_payload)
(out_dir / "stress_simulation.json").write_text(stress_payload)
(nextjs_dir / "stress_simulation.json").write_text(stress_payload)

print(f"[*] Synchronized latest_forecast.json (As-of: {as_of_date}) and metrics to frontend/public/data/")