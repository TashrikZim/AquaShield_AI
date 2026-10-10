"""
AquaShield AI - Estuarine Hydrodynamics Surrogate Dataset Generator
Generates synthetic daily-aggregated weekly hydrological time-series using an 
illustrative 1D estuarine advection-dispersion surrogate relation.
"""
from pathlib import Path
import numpy as np
import pandas as pd

rng = np.random.default_rng(42)

STATIONS = [
    {
        "district": "Bagerhat", "upazila": "Bagerhat Sadar", "river": "Alaipur Khal Daratona",
        "station_id": "SW1", "station_name": "Bagerhat", "lat": 22.64626, "lon": 89.80163,
        "sea_dist_km": 92.0, "conveyance_fraction": 1.15
    },
    {
        "district": "Satkhira", "upazila": "Shyamnagar", "river": "Kholpetua River",
        "station_id": "SW135", "station_name": "Shyamnagar", "lat": 22.33021, "lon": 89.10254,
        "sea_dist_km": 68.0, "conveyance_fraction": 0.85
    },
    {
        "district": "Khulna", "upazila": "Koyra", "river": "Kobadak River",
        "station_id": "SW242", "station_name": "Koyra", "lat": 22.34185, "lon": 89.30042,
        "sea_dist_km": 67.0, "conveyance_fraction": 0.95
    },
]

HORIZONS = {"30D": 4, "60D": 8, "90D": 13}
THRESHOLDS = (1500, 3000)

dates = pd.date_range(start="2015-01-07", end="2024-12-30", freq="7D")
doy = dates.dayofyear.values
year_strength = {y: rng.uniform(0.90, 1.10) for y in np.unique(dates.year)}
ys = np.array([year_strength[y] for y in dates.year])

# ------------------------------------------------------------------------------
# Continuous Asymmetric Annual Hydrograph (No piecewise jump in September)
# Fast rise during early monsoon (sigma=38d), slower drainage post-monsoon (sigma=62d)
# ------------------------------------------------------------------------------
peak_doy = 225.0
sigma_rise = 38.0
sigma_fall = 62.0

monsoon_weight = np.where(
    doy < peak_doy,
    np.exp(-((doy - peak_doy) ** 2) / (2 * sigma_rise ** 2)),
    np.exp(-((doy - peak_doy) ** 2) / (2 * sigma_fall ** 2))
)

# Baseflow drawdown smoothly transitions without step-discontinuities
baseflow_floor = 180.0
dry_season_drawdown = 650.0 * np.exp(-doy / 55.0) + 120.0 * np.exp(-(365.0 - doy) / 40.0)
raw_hydrograph = (baseflow_floor + dry_season_drawdown + 14500.0 * monsoon_weight) * ys

# Real-world astronomical lunar spring-neap tidal approximation
# Synthesized with orbital period ~14.77 days relative to fixed epoch
epoch_days = (dates - pd.Timestamp("2015-01-01")).days.values
lunar_tide_index = np.abs(np.sin(2 * np.pi * epoch_days / 14.765))

# Autoregressive AR(1) river discharge continuity filter
rho = 0.85
noise_std = 25.0
base_discharge = np.zeros(len(dates))
current_ar = 0.0

for t in range(len(dates)):
    current_ar = rho * current_ar + rng.normal(0, noise_std)
    base_discharge[t] = np.clip(raw_hydrograph[t] + current_ar, 80.0, 26000.0)

records, sl = [], 1
S_SEA = 32000.0   # Coastal dry-season Bay of Bengal estuarine boundary (µmho/cm)
S_RIVER = 280.0   # Upstream freshwater background (µmho/cm)

for st in STATIONS:
    dist = st["sea_dist_km"]
    conveyance = st["conveyance_fraction"]
    st_discharge = np.clip(base_discharge * conveyance + rng.normal(0, 15, len(dates)), 35, None)

    # Seasonal rainfall probabilities
    m_prob = np.exp(-((doy - 225) ** 2) / (2 * 45.0 ** 2))
    rain_prob = np.clip(0.04 + 0.80 * m_prob, 0, 0.95)
    st_rainfall = (rng.random(len(dates)) < rain_prob) * rng.gamma(2.0, 18.0, len(dates)) * (0.2 + 1.2 * m_prob)

    # Simplified 1D estuarine dispersion surrogate relation
    gamma = 0.45
    L_d = 32.0 * ((600.0 / st_discharge) ** gamma) * (1.0 + 0.25 * lunar_tide_index)
    salinity_equilibrium = S_RIVER + (S_SEA - S_RIVER) * np.exp(-dist / L_d)

    # Estuarine flushing lag (reservoir retention response)
    ec_series = []
    current_ec = salinity_equilibrium[0]
    for target_ec in salinity_equilibrium:
        current_ec += 0.40 * (target_ec - current_ec)
        ec_series.append(current_ec)

    ec_high = np.clip(np.array(ec_series) * (1 + rng.normal(0, 0.03, len(dates))), 220, None)

    # Environmental proxies with independent sensor noise
    rain_4w = pd.Series(st_rainfall).rolling(4, min_periods=1).sum().values
    wetness = np.clip(rain_4w / 280.0 * 0.5 + st_discharge / 12000.0 * 0.5, 0, 1)
    ndwi = np.clip(0.06 + 0.30 * wetness + rng.normal(0, 0.03, len(dates)), -0.3, 0.6)
    soil_moist = np.clip(0.10 + 0.26 * wetness + rng.normal(0, 0.03, len(dates)), 0.05, 0.45)

    for i, d in enumerate(dates):
        eh = int(ec_high[i])
        el = int(eh * rng.uniform(0.94, 0.98))
        # Realistic empirical chloride ratio with natural geochemical variance (0.53 - 0.58)
        cl_ratio = rng.uniform(0.535, 0.575)
        records.append({
            "SL": sl, "DISTRICT": st["district"], "UPAZILA": st["upazila"], "RIVER": st["river"],
            "STATION ID": st["station_id"], "STATION": st["station_name"],
            "DATE": d.strftime("%d-%b-%y").upper(), "MONTH": int(d.month), "DAY_OF_YEAR": int(doy[i]),
            "DOY_SIN": round(float(np.sin(2 * np.pi * doy[i] / 365.25)), 4),
            "DOY_COS": round(float(np.cos(2 * np.pi * doy[i] / 365.25)), 4),
            "EC HIGHTIDE micromho/cm": eh, "EC LOWTIDE micromho/cm": el,
            "CHLORIDE HIGHTIDE PPM": int(eh * cl_ratio),
            "CHLORIDE LOWTIDE PPM": int(el * cl_ratio),
            "UPSTREAM_DISCHARGE_M3S": round(float(st_discharge[i]), 1),
            "RAINFALL_MM": round(float(st_rainfall[i]), 1),
            "NDWI_PROXY": round(float(ndwi[i]), 3),
            "SOIL_MOISTURE": round(float(soil_moist[i]), 3),
            "TIDAL_SPRING_INDEX": round(float(lunar_tide_index[i]), 3),
            "LATITUDE": st["lat"], "LONGITUDE": st["lon"],
            "DATA_SOURCE": "SIMULATED_ESTUARINE_SURROGATE",
        })
        sl += 1

df = pd.DataFrame(records)
g = df.groupby("STATION ID")

df["DISCHARGE_LAG_30D"] = g["UPSTREAM_DISCHARGE_M3S"].shift(4).round(1)
df["RAINFALL_4W_SUM"] = g["RAINFALL_MM"].transform(lambda x: x.rolling(4, min_periods=4).sum()).round(1)
df = df.dropna(subset=["DISCHARGE_LAG_30D", "RAINFALL_4W_SUM"]).copy()

def classify_risk(v):
    if pd.isna(v): return np.nan
    return 0 if v < THRESHOLDS[0] else (1 if v <= THRESHOLDS[1] else 2)

g = df.groupby("STATION ID")
for name, weeks in HORIZONS.items():
    df[f"TARGET_EC_{name}"] = g["EC HIGHTIDE micromho/cm"].shift(-weeks)
    df[f"TARGET_RISK_{name}"] = df[f"TARGET_EC_{name}"].apply(classify_risk)

output_path = Path(__file__).resolve().parent / "BWDB_Salinity_Dataset.csv"
df.to_csv(output_path, index=False)
print(f"Generated {len(df)} rows across {df['STATION ID'].nunique()} stations.")
print("Active Surrogate: Continuous Asymmetric Hydrograph & Unbiased Lunar Phase.")