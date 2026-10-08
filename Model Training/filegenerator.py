"""
AquaShield AI - Hydrological Dataset Generator (Competition-Grade)
Simulates BWDB coastal river salinity time series with estuarine mass balance,
astronomical tidal cycles, and station-specific microclimates.
"""
import numpy as np
import pandas as pd

rng = np.random.default_rng(42)

STATIONS = [
    {
        "district": "Bagerhat", "upazila": "Bagerhat Sadar", "river": "Alaipur Khal Daratona",
        "station_id": "SW1", "station_name": "Bagerhat", "lat": 22.64626, "lon": 89.80163,
        "sea_dist_km": 68.0, "salt_scale": 1.00
    },
    {
        "district": "Satkhira", "upazila": "Shyamnagar", "river": "Kholpetua River",
        "station_id": "SW135", "station_name": "Shyamnagar", "lat": 22.33021, "lon": 89.10254,
        "sea_dist_km": 28.0, "salt_scale": 1.15
    },
    {
        "district": "Khulna", "upazila": "Koyra", "river": "Kobadak River",
        "station_id": "SW242", "station_name": "Koyra", "lat": 22.34185, "lon": 89.30042,
        "sea_dist_km": 22.0, "salt_scale": 1.20
    },
]

HORIZONS = {"30D": 4, "60D": 8, "90D": 13}  # 4, 8, 13 weeks ahead
THRESHOLDS = (1500, 3000)                   # micromho/cm: Safe (<1500), Warning (1500-3000), Critical (>3000)

dates = pd.date_range(start="2015-01-07", end="2024-12-30", freq="7D")
doy = dates.dayofyear.values

# Astronomical 14.76-day Spring/Neap Lunar Tidal Cycle (Amavasya / Purnima bore force)
lunar_phase = np.abs(np.sin(2 * np.pi * doy / 14.765))

# Baseline inter-annual monsoon variability
year_strength = {y: rng.uniform(0.65, 1.35) for y in np.unique(dates.year)}
ys = np.array([year_strength[y] for y in dates.year])

monsoon = np.exp(-((doy - 225) ** 2) / (2 * 45.0 ** 2))
tail = np.where(doy > 260, 2600 * np.exp(-(doy - 260) / 45.0), 0.0)
base_discharge = np.clip((350 + 13500 * monsoon + tail) * (ys ** 1.4), 60, None)

records, sl = [], 1

for st in STATIONS:
    # 1. Station Microclimate Variance (Prevents identical synthetic values across stations)
    st_noise = rng.normal(1.0, 0.04)
    st_discharge = np.clip(
        base_discharge * (1.0 + (st["sea_dist_km"] - 40) * 0.003) + rng.normal(0, 60, len(dates)),
        50,
        None
    )
    
    rain_prob = np.clip((0.10 + 0.85 * monsoon) * st_noise, 0, 0.95)
    st_rainfall = (rng.random(len(dates)) < rain_prob) * rng.gamma(2.0, 20.0, len(dates)) * (0.3 + 1.4 * monsoon) * ys
    
    # 2. Estuarine Mass Balance Simulation with Tidal Pumping
    flush_power = np.clip(
        st_discharge / 4800.0 + pd.Series(st_rainfall).rolling(2, min_periods=1).sum().values / 110.0,
        0,
        2.2
    )
    
    sea_baseline = 22000 * st["salt_scale"]
    s_now = 0.08 * sea_baseline
    salt_series = []
    
    for f, tide in zip(flush_power, lunar_phase):
        # High spring tides force saltwater intrusion further inland under low discharge
        tidal_intrusion = 0.08 * max(0.0, 1.0 - f) * (1.0 + 0.35 * tide) * (sea_baseline - s_now)
        river_flush = 0.58 * min(f, 1.6) * s_now
        s_now = float(np.clip(s_now + tidal_intrusion - river_flush, 0.0, sea_baseline))
        salt_series.append(s_now)
    
    salt_arr = np.array(salt_series)
    ec_high = np.clip((280 + salt_arr) * (1 + rng.normal(0, 0.03, len(dates))), 250, None)
    
    # 3. Satellite Spectral Proxies (Track hydrological wetness, NOT direct salt)
    rain_4w = pd.Series(st_rainfall).rolling(4, min_periods=1).sum().values
    wetness = np.clip(rain_4w / 280.0 * 0.5 + st_discharge / 13000.0 * 0.5, 0, 1)
    ndwi = np.clip(0.08 + 0.32 * wetness + rng.normal(0, 0.04, len(dates)), -0.3, 0.6)
    soil_moist = np.clip(0.12 + 0.28 * wetness + rng.normal(0, 0.03, len(dates)), 0.05, 0.45)
    
    for i, d in enumerate(dates):
        eh = int(ec_high[i])
        el = int(eh * rng.uniform(0.960, 0.985))
        records.append({
            "SL": sl,
            "DISTRICT": st["district"],
            "UPAZILA": st["upazila"],
            "RIVER": st["river"],
            "STATION ID": st["station_id"],
            "STATION": st["station_name"],
            "DATE": d.strftime("%d-%b-%y").upper(),
            "MONTH": int(d.month),
            "DAY_OF_YEAR": int(doy[i]),
            "DOY_SIN": round(float(np.sin(2 * np.pi * doy[i] / 365.25)), 4),
            "DOY_COS": round(float(np.cos(2 * np.pi * doy[i] / 365.25)), 4),
            "EC HIGHTIDE micromho/cm": eh,
            "EC LOWTIDE micromho/cm": el,
            "CHLORIDE HIGHTIDE PPM": int(eh * rng.uniform(0.53, 0.57)),
            "CHLORIDE LOWTIDE PPM": int(el * rng.uniform(0.53, 0.57)),
            "UPSTREAM_DISCHARGE_M3S": round(float(st_discharge[i]), 1),
            "RAINFALL_MM": round(float(st_rainfall[i]), 1),
            "NDWI_PROXY": round(float(ndwi[i]), 3),
            "SOIL_MOISTURE": round(float(soil_moist[i]), 3),
            "TIDAL_SPRING_INDEX": round(float(lunar_phase[i]), 3),
            "LATITUDE": st["lat"],
            "LONGITUDE": st["lon"],
            "DATA_SOURCE": "SYNTHETIC_DEMO",
        })
        sl += 1

df = pd.DataFrame(records)
g = df.groupby("STATION ID")

# Features calculated strictly looking backwards (no bfill lookahead bias)
df["DISCHARGE_LAG_30D"] = g["UPSTREAM_DISCHARGE_M3S"].shift(4).round(1)
df["RAINFALL_4W_SUM"] = g["RAINFALL_MM"].transform(lambda x: x.rolling(4, min_periods=4).sum()).round(1)
df = df.dropna(subset=["DISCHARGE_LAG_30D", "RAINFALL_4W_SUM"]).copy()

def classify_risk(v):
    if pd.isna(v):
        return np.nan
    return 0 if v < THRESHOLDS[0] else (1 if v <= THRESHOLDS[1] else 2)

g = df.groupby("STATION ID")
for name, weeks in HORIZONS.items():
    df[f"TARGET_EC_{name}"] = g["EC HIGHTIDE micromho/cm"].shift(-weeks)
    df[f"TARGET_RISK_{name}"] = df[f"TARGET_EC_{name}"].apply(classify_risk)

df.to_csv("BWDB_Salinity_Dataset.csv", index=False)
print(f"Generated {len(df)} rows across {df['STATION ID'].nunique()} stations. Saved to BWDB_Salinity_Dataset.csv")