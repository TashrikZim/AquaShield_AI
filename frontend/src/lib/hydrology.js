/**
 * AquaShield AI - Coastal Hydrology & Biophysical Logic Engine
 * Pure domain logic: Demographics, seawater stoichiometry, 
 * agronomic thresholds, and Sphere humanitarian logistics.
 */

// Official BBS Census 2022 Upazila Populations & Documented Planning Assumptions
export const UPAZILA_REGISTRY = {
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
 * @param {number} ec - Electrical Conductivity (µmho/cm)
 * @param {number} chloride - Chloride concentration (ppm)
 */
export function calculateBiophysics(ec, chloride) {
  // Dittmar Oceanographic Principle: Marine stoichiometric mass ratio Na/Cl ~ 0.556
  const sodiumEstimateMgL = Math.round(chloride * 0.556);
  
  // Standard agronomic conversion: 1 dS/m = 1000 µmho/cm
  const soilSalinityDsM = (ec / 1000).toFixed(2);
  
  // WHO Guidelines for Drinking-water Quality: Aesthetic taste threshold = 200 mg/L
  const whoTasteMultiple = Math.max(1, Math.round(sodiumEstimateMgL / 200));

  // Slow Sand Filter (PSF) dissolved ion passage threshold
  const psfStatus = ec > 1500 ? "Saline Bypass Required" : "Normal Sand Filtration";
  const psfAction = ec > 1500 ? "Membrane Required" : "Sand Filtration OK";

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
 * Emergency quota: 15 L/person/day; Mobile RO standard unit capacity: 10,000 L/day.
 * @param {number} vulnerablePop - Target population facing water stress
 * @param {string} riskLevel - Forecast risk ("Low", "Medium", "High")
 */
export function calculateLogistics(vulnerablePop, riskLevel) {
  if (riskLevel === "High") {
    // 5% acute hotspot population coverage
    return Math.max(4, Math.round((vulnerablePop * 0.05 * 15) / 10000));
  }
  if (riskLevel === "Medium") {
    return 2; // Precautionary rapid-response deployment
  }
  return 0; // Standby
}

/**
 * Maps risk levels to consistent UI color tokens.
 * @param {string} level - Risk level name
 */
export function getRiskColorTokens(level) {
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