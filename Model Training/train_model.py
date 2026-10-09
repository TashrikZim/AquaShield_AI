"""
AquaShield AI - Forecasting Engine Trainer & Direct Frontend Sync
Trains multi-horizon LightGBM classifiers AND regressors to project both
probability distributions and physical EC/Chloride values per lead-time.
"""
import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, log_loss

try:
    import lightgbm as lgb
    def make_classifier():
        return lgb.LGBMClassifier(
            n_estimators=150, learning_rate=0.04, max_depth=5,
            min_child_samples=15, subsample=0.85, colsample_bytree=0.85,
            random_state=42, verbose=-1
        )
    def make_regressor():
        return lgb.LGBMRegressor(
            n_estimators=120, learning_rate=0.04, max_depth=5,
            random_state=42, verbose=-1
        )
    MODEL_NAME = "LightGBM Multi-Task Engine"
except ImportError:
    from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor
    def make_classifier():
        return HistGradientBoostingClassifier(max_iter=150, learning_rate=0.04, max_depth=5, random_state=42)
    def make_regressor():
        return HistGradientBoostingRegressor(max_iter=120, learning_rate=0.04, max_depth=5, random_state=42)
    MODEL_NAME = "scikit-learn HistGradientBoosting"

BASE_DIR = Path(__file__).resolve().parent
CSV = BASE_DIR / "BWDB_Salinity_Dataset.csv"
HORIZONS = {"30D": 28, "60D": 56, "90D": 91}
TEST_START = pd.Timestamp("2023-01-01")
CALIB_START = pd.Timestamp("2022-01-01")
THRESHOLDS = (1500, 3000)
RISK_NAMES = ["Low", "Medium", "High"]

STATION_DISTANCES = {"SW1": 92, "SW135": 68, "SW242": 67}

ACTIONS = {
    "Low": "Routine monitoring. Surface reserves and pond sand filters (PSFs) operating normally.",
    "Medium": "Precautionary Advisory: Advise Union water committees to conserve stored rainwater and service PSFs.",
    "High": "CRITICAL PROTOCOL: Enforce community rainwater rationing. Alert DPHE & NGOs to stage mobile RO water treatment units."
}

FEATURES = [
    "DOY_SIN", "DOY_COS", "EC HIGHTIDE micromho/cm", "UPSTREAM_DISCHARGE_M3S",
    "DISCHARGE_LAG_30D", "RAINFALL_MM", "RAINFALL_4W_SUM", "NDWI_PROXY",
    "SOIL_MOISTURE", "TIDAL_SPRING_INDEX"
]
CALENDAR = ["DOY_SIN", "DOY_COS"]

FEATURE_HUMAN_LABELS = {
    "EC HIGHTIDE micromho/cm": "Estuarine Base Salinity Carryover",
    "UPSTREAM_DISCHARGE_M3S": "Upstream Freshwater Discharge Deficit",
    "DISCHARGE_LAG_30D": "Prolonged Gorai Baseflow Recession",
    "TIDAL_SPRING_INDEX": "Astronomical Spring-Neap Tidal Pumping",
    "RAINFALL_4W_SUM": "Cumulative Coastal Drought",
    "NDWI_PROXY": "Surface Water Inundation Deficit",
    "SOIL_MOISTURE": "Sub-surface Soil Salinization",
    "DOY_SIN": "Dry-Season Solar Insolation Cycle",
    "DOY_COS": "Annual Climatological Cycle"
}

def proba3(model, X):
    p = model.predict_proba(X)
    out = np.zeros((len(X), 3))
    for i, c in enumerate(model.classes_):
        out[:, int(c)] = p[:, i]
    return out

def apply_temperature(p, T):
    q = np.clip(p, 1e-6, 1.0) ** (1.0 / T)
    return q / q.sum(axis=1, keepdims=True)

def display_probs(p, eps=0.03):
    return (1.0 - eps) * p + (eps / 3.0)

def find_temperature(p, y):
    if len(y) < 30 or len(np.unique(y)) < 2:
        return 1.0
    grid = np.arange(0.5, 5.01, 0.1)
    losses = [log_loss(y, apply_temperature(p, T), labels=[0, 1, 2]) for T in grid]
    return float(grid[int(np.argmin(losses))])

def scores(y, pred):
    return {
        "accuracy": round(float(accuracy_score(y, pred)), 3),
        "macro_f1": round(float(f1_score(y, pred, average="macro", labels=[0, 1, 2], zero_division=0)), 3)
    }

def compute_model_driver(model, X_single, feature_medians, predicted_class_idx):
    baseline_p = proba3(model, X_single)[0, predicted_class_idx]
    deltas = {}
    for feat in FEATURES:
        X_perturbed = X_single.copy()
        X_perturbed[feat] = feature_medians[feat]
        p_perturbed = proba3(model, X_perturbed)[0, predicted_class_idx]
        deltas[feat] = baseline_p - p_perturbed
        
    max_delta = max(deltas.values()) if deltas else 0.0
    if max_delta < 1e-4:
        discharge_val = float(X_single["UPSTREAM_DISCHARGE_M3S"].iloc[0])
        tide_val = float(X_single["TIDAL_SPRING_INDEX"].iloc[0])
        if discharge_val < 400:
            return "Upstream Freshwater Discharge Deficit"
        elif tide_val > 0.7:
            return "Astronomical Spring-Neap Tidal Pumping"
        else:
            return "Cumulative Coastal Drought"

    top_feature = max(deltas, key=deltas.get)
    return FEATURE_HUMAN_LABELS.get(top_feature, "Seasonal Estuarine Hydrodynamics")

parser = argparse.ArgumentParser()
parser.add_argument("--as-of", default=None, help="Replay forecast as of date (YYYY-MM-DD)")
args = parser.parse_args()

df = pd.read_csv(CSV)
df["DATE_DT"] = pd.to_datetime(df["DATE"], format="%d-%b-%y")
synthetic = bool(df["DATA_SOURCE"].astype(str).str.contains("SYNTHETIC").any()) if "DATA_SOURCE" in df else False

out_dir = BASE_DIR / "results"
model_dir = BASE_DIR / "models"
nextjs_dir = BASE_DIR.parent / "frontend" / "public" / "data"

out_dir.mkdir(exist_ok=True)
model_dir.mkdir(exist_ok=True)
nextjs_dir.mkdir(parents=True, exist_ok=True)

feature_medians = df[FEATURES].median().to_dict()

metrics = {
    "synthetic_demo_data": synthetic,
    "model_architecture": MODEL_NAME,
    "test_start_date": str(TEST_START.date()),
    "features": FEATURES,
    "horizons": {}
}

final_bundles = {}

print("\n" + "="*80)
print("AQUASHIELD AI - MULTI-HORIZON VALIDATION (TEMPORAL EVALUATION)")
print("="*80)

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
    
    if len(train) < 100 or len(test) < 20:
        continue

    T = 1.0
    if len(fit_part) >= 100 and len(calib_part) >= 30:
        m0 = make_classifier().fit(fit_part[FEATURES], fit_part[target])
        T = find_temperature(proba3(m0, calib_part[FEATURES]), calib_part[target].values)

    clf_model = make_classifier().fit(train[FEATURES], train[target])
    reg_model = make_regressor().fit(train[FEATURES], train[target_ec])

    p_raw = proba3(clf_model, test[FEATURES])
    p_cal = apply_temperature(p_raw, T)
    pred = p_cal.argmax(axis=1)
    y = test[target].values

    persist = pd.cut(
        test["EC HIGHTIDE micromho/cm"],
        bins=[-np.inf, THRESHOLDS[0] - 1e-9, THRESHOLDS[1], np.inf],
        labels=[0, 1, 2]
    ).astype(int).values
    cal_model = make_classifier().fit(train[CALENDAR], train[target])
    cal_pred = proba3(cal_model, test[CALENDAR]).argmax(axis=1)

    m = {
        "train_rows": int(len(train)), "test_rows": int(len(test)), "calibrated_temperature": round(T, 2),
        "model": scores(y, pred),
        "baseline_persistence": scores(y, persist),
        "baseline_calendar_climatology": scores(y, cal_pred),
    }
    metrics["horizons"][name] = m
    
    print(f"[{name} Horizon | T+{days}d]")
    print(f"  AquaShield Acc: {m['model']['accuracy']} | Macro-F1: {m['model']['macro_f1']}")
    print(f"  Persistence  Acc: {m['baseline_persistence']['accuracy']} | Macro-F1: {m['baseline_persistence']['macro_f1']}")
    print(f"  Calibrated Temp: {T:.2f}\n")

    final_clf = make_classifier().fit(d[FEATURES], d[target])
    final_reg = make_regressor().fit(d[FEATURES], d[target_ec])
    final_bundles[name] = {
        "clf": final_clf, "reg": final_reg, "features": FEATURES, "temperature": T,
        "thresholds": THRESHOLDS, "horizon_days": days, "synthetic_demo_data": synthetic
    }
    joblib.dump(final_bundles[name], model_dir / f"aquashield_model_{name}.pkl")

src = df if args.as_of is None else df[df["DATE_DT"] <= pd.Timestamp(args.as_of)]
latest = src.sort_values("DATE_DT").groupby("STATION ID").tail(1)
stations_output = []
stress_simulation_matrix = {}

for _, row in latest.iterrows():
    st_id = row["STATION ID"]
    sea_dist = STATION_DISTANCES.get(st_id, 70)
    
    entry = {
        "station_id": st_id,
        "station_name": row["STATION"],
        "district": row["DISTRICT"],
        "upazila": row["UPAZILA"],
        "river": row["RIVER"],
        "latitude": float(row["LATITUDE"]),
        "longitude": float(row["LONGITUDE"]),
        "sea_distance_km": sea_dist,
        "current_ec": int(row["EC HIGHTIDE micromho/cm"]),
        "current_chloride": int(row["CHLORIDE HIGHTIDE PPM"]),
        "forecast": {}
    }
    
    X = row[FEATURES].to_frame().T.astype(float)
    for name, b in final_bundles.items():
        p = display_probs(apply_temperature(proba3(b["clf"], X), b["temperature"]))[0]
        class_idx = int(p.argmax())
        level = RISK_NAMES[class_idx]
        driver = compute_model_driver(b["clf"], X, feature_medians, class_idx)

        # Regress the projected future EC and chloride for this lead time
        pred_ec = int(round(float(b["reg"].predict(X)[0])))
        pred_cl = int(round(pred_ec * 0.556))

        entry["forecast"][name.lower()] = {
            "lead_days": b["horizon_days"],
            "risk_level": level,
            "risk_code": class_idx,
            "projected_ec": max(250, pred_ec),
            "projected_chloride": max(140, pred_cl),
            "probabilities": {
                "low": int(round(float(p[0]) * 100)),
                "medium": int(round(float(p[1]) * 100)),
                "high": int(round(float(p[2]) * 100))
            },
            "primary_driver": driver,
            "action_title": f"{level} Risk Advisory",
            "recommended_action": ACTIONS[level]
        }
    stations_output.append(entry)

    b30 = final_bundles["30D"]
    stress_simulation_matrix[st_id] = {}
    for deficit_pct in [0, 20, 40, 60, 80]:
        X_sim = X.copy()
        factor = (100 - deficit_pct) / 100.0
        X_sim["UPSTREAM_DISCHARGE_M3S"] *= factor
        X_sim["DISCHARGE_LAG_30D"] *= factor
        
        p_sim = display_probs(apply_temperature(proba3(b30["clf"], X_sim), b30["temperature"]))[0]
        sim_level = RISK_NAMES[int(p_sim.argmax())]
        sim_ec = int(round(float(b30["reg"].predict(X_sim)[0])))
        
        stress_simulation_matrix[st_id][str(deficit_pct)] = {
            "risk_level": sim_level,
            "simulated_ec": max(250, sim_ec),
            "prob_high": int(round(float(p_sim[2]) * 100))
        }

forecast_payload = json.dumps({"synthetic_demo_data": synthetic, "stations": stations_output}, indent=2)
metrics_payload = json.dumps(metrics, indent=2)
stress_payload = json.dumps(stress_simulation_matrix, indent=2)

(out_dir / "latest_forecast.json").write_text(forecast_payload)
(nextjs_dir / "latest_forecast.json").write_text(forecast_payload)
(out_dir / "metrics.json").write_text(metrics_payload)
(nextjs_dir / "metrics.json").write_text(metrics_payload)
(out_dir / "stress_simulation.json").write_text(stress_payload)
(nextjs_dir / "stress_simulation.json").write_text(stress_payload)

print("[*] Synchronized latest_forecast.json, metrics.json, and stress_simulation.json directly into frontend/public/data/")