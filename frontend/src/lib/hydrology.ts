/**
 * AquaShield AI - Coastal Hydrology & Biophysical Logic Engine
 * Objective biophysical thresholds, demographic registry, and emergency logistics.
 */

export type RiskLevel = "Low" | "Medium" | "High";
export type ForecastHorizon = "30D" | "60D" | "90D";

export interface UpazilaData {
  name: string;
  population_2022: number;
  planning_stress_pct: number;
  coastal_distance_km: number;
}

export interface BiophysicsResult {
  sodiumEstimateMgL: number;
  soilSalinityDsM: string;
  whoTasteMultiple: number;
  psfStatus: string;
  psfAction: string;
}

export interface RiskColorTokens {
  badge: string;
  container: string;
  indicator: string;
  text: string;
}

// BBS Census 2022 Upazila Populations & Documented Scenario Stress Shares
export const UPAZILA_REGISTRY: Record<string, UpazilaData> = {
  SW1: { 
    name: "Bagerhat Sadar", 
    population_2022: 288673, 
    planning_stress_pct: 35,
    coastal_distance_km: 92
  },
  SW135: { 
    name: "Shyamnagar", 
    population_2022: 365970, 
    planning_stress_pct: 65, 
    coastal_distance_km: 68
  },
  SW242: { 
    name: "Koyra", 
    population_2022: 220102, 
    planning_stress_pct: 60, 
    coastal_distance_km: 67
  }
};

/**
 * Calculates biophysical health and agronomic indicators.
 * @param ec - Electrical Conductivity (µmho/cm)
 * @param chloride - Chloride concentration (ppm)
 */
export function calculateBiophysics(ec: number, chloride: number): BiophysicsResult {
  // Marine stoichiometric mass ratio: Na/Cl ~ 0.556
  const sodiumEstimateMgL = Math.round(chloride * 0.556);
  
  // Agronomic conversion: 1 dS/m = 1000 µmho/cm
  const soilSalinityDsM = (ec / 1000).toFixed(2);
  
  // WHO Guidelines for Drinking-water Quality: Aesthetic taste threshold = 200 mg/L
  // Returns raw ratio rounded to one decimal place without artificial flooring
  const whoTasteMultiple = Math.round((sodiumEstimateMgL / 200) * 10) / 10;

  // Pond Sand Filter (PSF) intake threshold: river EC > 1,500 indicates salinity barrier breach
  const psfStatus = ec > 1500 ? "Saline Bypass Required" : "Normal Sand Filtration";
  const psfAction = ec > 1500 ? "Membrane Treatment Required" : "Sand Filtration Operational";

  return {
    sodiumEstimateMgL,
    soilSalinityDsM,
    whoTasteMultiple,
    psfStatus,
    psfAction
  };
}

/**
 * Calculates emergency logistics based on Sphere Humanitarian Standards.
 * Parameters: 15 L/person/day emergency quota; Mobile RO unit capacity: 10,000 L/day.
 * Assumes a baseline 5% acute hotspot population requiring first-line mobile supply.
 */
export function calculateLogistics(vulnerablePop: number, riskLevel?: RiskLevel): number {
  if (riskLevel === "High") {
    return Math.max(1, Math.round((vulnerablePop * 0.05 * 15) / 10000));
  }
  if (riskLevel === "Medium") {
    return 1;
  }
  return 0;
}

export function getRiskColorTokens(level?: RiskLevel): RiskColorTokens {
  switch (level) {
    case "High":
      return {
        badge: "bg-rose-500 text-white border-rose-400",
        container: "bg-rose-950/20 border-rose-800/60 text-rose-200",
        indicator: "bg-rose-500",
        text: "text-rose-400"
      };
    case "Medium":
      return {
        badge: "bg-amber-500 text-slate-950 border-amber-400",
        container: "bg-amber-950/20 border-amber-800/60 text-amber-200",
        indicator: "bg-amber-500",
        text: "text-amber-400"
      };
    default:
      return {
        badge: "bg-emerald-500 text-white border-emerald-400",
        container: "bg-emerald-950/20 border-emerald-800/60 text-emerald-200",
        indicator: "bg-emerald-500",
        text: "text-emerald-400"
      };
  }
}