"""
AquaShield AI - Dynamic Physical Scenario Generator
Every scenario is an evolving time-series hydrograph (dQ/dt != 0).
Eliminates flatline static values to ensure 30D -> 60D -> 90D horizons
exhibit real physical lead-time progression across all test modes.
"""
from pathlib import Path
import numpy as np
import pandas as pd

rng = np.random.default_rng(42)

STATIONS = [
    {
        "district": "Bagerhat", "upazila": "Bagerhat Sadar", "river": "Alaipur Khal Daratona",
        "station_id": "SW1", "station_name": "Bagerhat", "lat": 22.64626, "lon": 89.80163,
        "sea_dist_km": 92.0, "conveyance_fraction": 1.18
    },
    {
        "district": "Satkhira", "upazila": "Shyamnagar", "river": "Kholpetua River",
        "station_id": "SW135", "station_name": "Shyamnagar", "lat": 22.33021, "lon": 89.10254,
        "sea_dist_km": 68.0, "conveyance_fraction": 0.82
    },
    {
        "district": "Khulna", "upazila": "Koyra", "river": "Kobadak River",
        "station_id": "SW242", "station_name": "Koyra", "lat": 22.34185, "lon": 89.30042,
        "sea_dist_km": 67.0, "conveyance_fraction": 0.98
    },
]

HORIZONS = {"30D": 4, "60D": 8, "90D": 13}
THRESHOLDS = (1500, 3000)

dates = pd.date_range(start="2015-01-07", end="2024-12-30", freq="7D")
doy = dates.dayofyear.values
year_strength = {y: rng.uniform(0.85, 1.15) for y in np.unique(dates.year)}
ys = np.array([year_strength[y] for y in dates.year])

# ==============================================================================
#                 DYNAMIC HYDROLOGICAL SCENARIOS SWITCHBOARD
#         (Keep ONE active at a time; comment out the other three)
# ==============================================================================

# --- SCENARIO 1: REALISTIC BASELINE (DEFAULT) ---
# Normal dry-season drawdown. 30D: Green/Amber/Red -> 60D: Amber/Red/Red -> 90D: Red/Red/Red
monsoon = np.exp(-((doy - 225) ** 2) / (2 * 42.0 ** 2))
dry_drawdown = np.where(
    doy <= 135,
    180.0 + 820.0 * np.exp(-doy / 48.0),
    np.where(doy > 260, 950.0 + 3800.0 * np.exp(-(doy - 260) / 36.0), 0.0)
)
treaty_cycle = np.where(doy <= 151, 60.0 * np.sin(2 * np.pi * doy / 10.0), 0.0)
norwester = np.where((doy >= 100) & (doy <= 145) & (rng.random(len(dates)) < 0.10), rng.uniform(150.0, 350.0, len(dates)), 0.0)
raw_hydrograph = (dry_drawdown + treaty_cycle + norwester + 13500.0 * monsoon) * (ys ** 1.15)
lunar_tide_index = np.abs(np.sin(2 * np.pi * doy / 14.765))
test_mode = "REALISTIC_BASELINE"

# --- SCENARIO 2: PROGRESSIVE UNSEASONAL FLOOD FLUSH ---
# Starts dry in January (Red/Amber), but an extreme early monsoon surge hits in March/April.
# 30D: High Salinity -> 60D: Moderate Dilution -> 90D: Complete Green Freshwater Flush!
# monsoon_early = np.exp(-((doy - 75) ** 2) / (2 * 25.0 ** 2))
# dry_drawdown = np.where(doy <= 50, 300.0 * np.exp(-doy / 30.0), 0.0)
# raw_hydrograph = (dry_drawdown + 22000.0 * monsoon_early + 14000.0 * np.exp(-((doy - 225) ** 2) / (2 * 42.0 ** 2))) * (ys ** 1.1)
# lunar_tide_index = np.abs(np.sin(2 * np.pi * doy / 14.765)) * 0.4
# test_mode = "EARLY_FLOOD_FLUSH"

# --- SCENARIO 3: ACCELERATED FLASH DROUGHT SHOCK ---
# Upstream Gorai offtake silts shut rapidly. Baseflow drops 4x faster than normal.
# 30D: Safe pockets remain -> 60D: Severe Ingress -> 90D: Catastrophic Delta Contamination.
# monsoon = np.exp(-((doy - 225) ** 2) / (2 * 42.0 ** 2))
# flash_drought = np.where(
#     doy <= 135,
#     60.0 + 600.0 * np.exp(-doy / 18.0),  # Rapid decay to 60 m3/s
#     np.where(doy > 260, 600.0 * np.exp(-(doy - 260) / 25.0), 0.0)
# )
# raw_hydrograph = (flash_drought + 9000.0 * monsoon) * (ys ** 1.15)
# lunar_tide_index = np.abs(np.sin(2 * np.pi * doy / 14.765)) * 1.2
# test_mode = "FLASH_DROUGHT"

# --- SCENARIO 4: SPRING TIDE RESONANCE EVENT ---
# Modest river baseflow, but lunar perigee spring tides amplify exponentially by Day 60-90.
# monsoon = np.exp(-((doy - 225) ** 2) / (2 * 42.0 ** 2))
# raw_hydrograph = (350.0 + 12000.0 * monsoon) * (ys ** 1.1)
# lunar_tide_index = np.clip(np.abs(np.sin(2 * np.pi * doy / 14.765)) * (0.6 + 0.8 * (doy / 120.0)), 0.0, 1.5)
# test_mode = "SPRING_TIDE_RESONANCE"

# ==============================================================================

# AR(1) River Memory Filter (Preserves time-series continuity)
rho = 0.88
noise_std = 20.0
base_discharge = np.zeros(len(dates))
current_ar = 0.0

for t in range(len(dates)):
    current_ar = rho * current_ar + rng.normal(0, noise_std)
    base_discharge[t] = np.clip(raw_hydrograph[t] + current_ar, 40.0, 26000.0)

records, sl = [], 1
S_SEA = 24500.0
S_RIVER = 280.0

for st in STATIONS:
    dist = st["sea_dist_km"]
    conveyance = st["conveyance_fraction"]
    st_discharge = np.clip(base_discharge * conveyance + rng.normal(0, 15, len(dates)), 35, None)

    if test_mode == "FLASH_DROUGHT":
        st_rainfall = np.zeros(len(dates))
    elif test_mode == "EARLY_FLOOD_FLUSH":
        st_rainfall = np.where((doy >= 45) & (doy <= 100), rng.uniform(60.0, 140.0, len(dates)), 0.0)
    else:
        m_prob = np.exp(-((doy - 225) ** 2) / (2 * 42.0 ** 2))
        rain_prob = np.clip(0.06 + 0.85 * m_prob, 0, 0.95)
        st_rainfall = (rng.random(len(dates)) < rain_prob) * rng.gamma(2.0, 18.0, len(dates)) * (0.3 + 1.3 * m_prob)

    # Savenije's 1D Estuarine Advection-Dispersion Law
    gamma = 0.44
    L_d = 29.5 * ((600.0 / st_discharge) ** gamma) * (1.0 + 0.28 * lunar_tide_index)
    salinity_equilibrium = S_RIVER + (S_SEA - S_RIVER) * np.exp(-dist / L_d)

    ec_series = []
    current_ec = salinity_equilibrium[0]
    for target_ec in salinity_equilibrium:
        current_ec += 0.44 * (target_ec - current_ec)
        ec_series.append(current_ec)

    ec_high = np.clip(np.array(ec_series) * (1 + rng.normal(0, 0.02, len(dates))), 220, None)

    rain_4w = pd.Series(st_rainfall).rolling(4, min_periods=1).sum().values
    wetness = np.clip(rain_4w / 280.0 * 0.5 + st_discharge / 12000.0 * 0.5, 0, 1)
    ndwi = np.clip(0.08 + 0.32 * wetness + rng.normal(0, 0.02, len(dates)), -0.3, 0.6)
    soil_moist = np.clip(0.12 + 0.28 * wetness + rng.normal(0, 0.02, len(dates)), 0.05, 0.45)

    for i, d in enumerate(dates):
        eh = int(ec_high[i])
        el = int(eh * rng.uniform(0.960, 0.982))
        records.append({
            "SL": sl, "DISTRICT": st["district"], "UPAZILA": st["upazila"], "RIVER": st["river"],
            "STATION ID": st["station_id"], "STATION": st["station_name"],
            "DATE": d.strftime("%d-%b-%y").upper(), "MONTH": int(d.month), "DAY_OF_YEAR": int(doy[i]),
            "DOY_SIN": round(float(np.sin(2 * np.pi * doy[i] / 365.25)), 4),
            "DOY_COS": round(float(np.cos(2 * np.pi * doy[i] / 365.25)), 4),
            "EC HIGHTIDE micromho/cm": eh, "EC LOWTIDE micromho/cm": el,
            "CHLORIDE HIGHTIDE PPM": int(eh * 0.556),
            "CHLORIDE LOWTIDE PPM": int(el * 0.556),
            "UPSTREAM_DISCHARGE_M3S": round(float(st_discharge[i]), 1),
            "RAINFALL_MM": round(float(st_rainfall[i]), 1),
            "NDWI_PROXY": round(float(ndwi[i]), 3),
            "SOIL_MOISTURE": round(float(soil_moist[i]), 3),
            "TIDAL_SPRING_INDEX": round(float(lunar_tide_index[i]), 3),
            "LATITUDE": st["lat"], "LONGITUDE": st["lon"],
            "DATA_SOURCE": "SYNTHETIC_SAVENIJE_PHYSICS",
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
print(f"Active Scenario: [{test_mode}] -> Savenije Dynamic Advection-Dispersion Pipeline")