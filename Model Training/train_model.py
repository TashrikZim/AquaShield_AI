"""
AquaShield AI - Forecasting Engine Trainer
Trains 30, 60, and 90-day predictive models with leak-free temporal splitting,
baseline benchmarking, temperature calibration, and dashboard exports.
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
    def make_model():
        return lgb.LGBMClassifier(
            n_estimators=150, learning_rate=0.04, max_depth=5,
            min_child_samples=15, subsample=0.85, colsample_bytree=0.85,
            random_state=42, verbose=-1
        )
    MODEL_NAME = "LightGBM Classifier"
except ImportError:
    from sklearn.ensemble import HistGradientBoostingClassifier
    def make_model():
        return HistGradientBoostingClassifier(
            max_iter=150, learning_rate=0.04, max_depth=5, random_state=42
        )
    MODEL_NAME = "scikit-learn HistGradientBoosting"

CSV = "BWDB_Salinity_Dataset.csv"
HORIZONS = {"30D": 28, "60D": 56, "90D": 91}
TEST_START = pd.Timestamp("2023-01-01")
CALIB_START = pd.Timestamp("2022-01-01")
THRESHOLDS = (1500, 3000)
RISK_NAMES = ["Low", "Medium", "High"]

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

parser = argparse.ArgumentParser()
parser.add_argument("--as-of", default=None, help="Replay forecast as of date (YYYY-MM-DD)")
args = parser.parse_args()

df = pd.read_csv(CSV)
df["DATE_DT"] = pd.to_datetime(df["DATE"], format="%d-%b-%y")
synthetic = bool(df["DATA_SOURCE"].astype(str).str.contains("SYNTHETIC").any()) if "DATA_SOURCE" in df else False

out_dir, model_dir = Path("results"), Path("models")
out_dir.mkdir(exist_ok=True)
model_dir.mkdir(exist_ok=True)

metrics = {
    "synthetic_demo_data": synthetic,
    "model_architecture": MODEL_NAME,
    "test_start_date": str(TEST_START.date()),
    "features": FEATURES,
    "horizons": {}
}

test_frames, importances, final_bundles = [], [], {}

print("\n" + "="*80)
print("AQUASHIELD AI - MULTI-HORIZON VALIDATION (TEMPORAL EVALUATION)")
print("="*80)

for name, days in HORIZONS.items():
    target = f"TARGET_RISK_{name}"
    d = df.dropna(subset=[target]).copy()
    d[target] = d[target].astype(int)
    
    gap_end = d["DATE_DT"] + pd.Timedelta(days=days)
    train = d[gap_end < TEST_START]
    test = d[d["DATE_DT"] >= TEST_START]
    
    fit_part = train[gap_end[train.index] < CALIB_START]
    calib_part = train[train["DATE_DT"] >= CALIB_START]
    
    if len(train) < 100 or len(test) < 20:
        continue

    # Temperature scaling on held-out validation year (2022)
    T = 1.0
    if len(fit_part) >= 100 and len(calib_part) >= 30:
        m0 = make_model().fit(fit_part[FEATURES], fit_part[target])
        T = find_temperature(proba3(m0, calib_part[FEATURES]), calib_part[target].values)

    # Train model on all historical training data
    model = make_model().fit(train[FEATURES], train[target])
    p_raw = proba3(model, test[FEATURES])
    p_cal = apply_temperature(p_raw, T)
    pred = p_cal.argmax(axis=1)
    y = test[target].values

    # Baselines
    persist = pd.cut(
        test["EC HIGHTIDE micromho/cm"],
        bins=[-np.inf, THRESHOLDS[0] - 1e-9, THRESHOLDS[1], np.inf],
        labels=[0, 1, 2]
    ).astype(int).values
    cal_model = make_model().fit(train[CALENDAR], train[target])
    cal_pred = proba3(cal_model, test[CALENDAR]).argmax(axis=1)

    m = {
        "train_rows": int(len(train)), "test_rows": int(len(test)), "calibrated_temperature": round(T, 2),
        "model": scores(y, pred),
        "baseline_persistence": scores(y, persist),
        "baseline_calendar_climatology": scores(y, cal_pred),
        "log_loss_raw": round(float(log_loss(y, apply_temperature(p_raw, 1.0), labels=[0, 1, 2])), 3),
        "log_loss_calibrated": round(float(log_loss(y, p_cal, labels=[0, 1, 2])), 3)
    }
    metrics["horizons"][name] = m
    
    print(f"[{name} Horizon | T+{days}d]")
    print(f"  AquaShield AI Acc: {m['model']['accuracy']} | Macro-F1: {m['model']['macro_f1']}")
    print(f"  Persistence   Acc: {m['baseline_persistence']['accuracy']} | Macro-F1: {m['baseline_persistence']['macro_f1']}")
    print(f"  Calendar Climatology: {m['baseline_calendar_climatology']['accuracy']} | Macro-F1: {m['baseline_calendar_climatology']['macro_f1']}")
    print(f"  Probability Calibration: Temp={T:.2f} (Log-Loss: {m['log_loss_raw']} -> {m['log_loss_calibrated']})\n")

    t = test[["STATION ID", "STATION", "DATE_DT", "EC HIGHTIDE micromho/cm"]].copy()
    t.columns = ["station_id", "station_name", "date", "ec_now_uscm"]
    t["horizon"] = name
    t["actual_risk"] = [RISK_NAMES[i] for i in y]
    t["predicted_risk"] = [RISK_NAMES[i] for i in pred]
    t[["p_low", "p_medium", "p_high"]] = display_probs(p_cal).round(3)
    test_frames.append(t)

    fi = getattr(model, "feature_importances_", None)
    if fi is not None:
        importances.append(pd.DataFrame({"horizon": name, "feature": FEATURES, "importance": fi}))

    # Train production model bundle on all available records
    final_model = make_model().fit(d[FEATURES], d[target])
    final_bundles[name] = {
        "model": final_model, "features": FEATURES, "temperature": T,
        "thresholds": THRESHOLDS, "horizon_days": days, "synthetic_demo_data": synthetic
    }
    joblib.dump(final_bundles[name], model_dir / f"aquashield_model_{name}.pkl")

(out_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))
pd.concat(test_frames).assign(date=lambda x: x["date"].dt.strftime("%Y-%m-%d")).to_csv(out_dir / "test_predictions.csv", index=False)
if importances:
    pd.concat(importances).sort_values(["horizon", "importance"], ascending=[True, False]).to_csv(
        out_dir / "feature_importance.csv", index=False
    )

# Pre-computed Live Forecast for Frontend Dashboard
src = df if args.as_of is None else df[df["DATE_DT"] <= pd.Timestamp(args.as_of)]
latest = src.sort_values("DATE_DT").groupby("STATION ID").tail(1)
stations_output = []

for _, row in latest.iterrows():
    entry = {
        "station_id": row["STATION ID"], "station_name": row["STATION"],
        "district": row["DISTRICT"], "upazila": row["UPAZILA"], "river": row["RIVER"],
        "latitude": float(row["LATITUDE"]), "longitude": float(row["LONGITUDE"]),
        "as_of": str(row["DATE_DT"].date()), "current_ec_uscm": int(row["EC HIGHTIDE micromho/cm"]),
        "current_chloride_ppm": int(row["CHLORIDE HIGHTIDE PPM"]),
        "forecast": {}
    }
    X = row[FEATURES].to_frame().T.astype(float)
    for name, b in final_bundles.items():
        p = display_probs(apply_temperature(proba3(b["model"], X), b["temperature"]))[0]
        level = RISK_NAMES[int(p.argmax())]
        
        # Primary causal driver identification
        if row["UPSTREAM_DISCHARGE_M3S"] < 400:
            driver = "Upstream River Discharge Deficit (<400 m³/s)"
        elif row["TIDAL_SPRING_INDEX"] > 0.7:
            driver = "Astronomical Spring Tide Penetration"
        elif row["RAINFALL_4W_SUM"] < 5.0:
            driver = "Prolonged Cumulative Drought (0 mm rainfall)"
        else:
            driver = "Seasonal Estuarine Hydrodynamics"

        entry["forecast"][name.lower()] = {
            "days_ahead": b["horizon_days"],
            "risk_level": level,
            "risk_code": int(p.argmax()),
            "probabilities": {
                "low": round(float(p[0]), 3),
                "medium": round(float(p[1]), 3),
                "high": round(float(p[2]), 3)
            },
            "primary_driver": driver,
            "recommended_action": ACTIONS[level]
        }
    stations_output.append(entry)

(out_dir / "latest_forecast.json").write_text(json.dumps(
    {"synthetic_demo_data": synthetic, "stations": stations_output}, indent=2
))
print(f"Artifacts saved to {out_dir}/ and models saved to {model_dir}/")