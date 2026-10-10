// import { RiskLevel } from "@/lib/hydrology";

// export interface HorizonForecastDetails {
//   risk_level: RiskLevel;
//   risk_code: 0 | 1 | 2;
//   lead_days: number;
//   projected_ec?: number;
//   projected_chloride?: number;
//   probabilities: {
//     low: number;
//     medium: number;
//     high: number;
//   };
//   primary_driver: string;
//   action_title: string;
//   recommended_action: string;
// }

// export interface Station {
//   station_id: string;
//   station_name: string;
//   upazila: string;
//   district: string;
//   river: string;
//   latitude: number;
//   longitude: number;
//   sea_distance_km: number;
//   current_ec: number;
//   current_chloride: number;
//   forecast: {
//     "30d"?: HorizonForecastDetails;
//     "60d"?: HorizonForecastDetails;
//     "90d"?: HorizonForecastDetails;
//     [key: string]: HorizonForecastDetails | undefined;
//   };
// }

// export interface ModelMetricHorizon {
//   accuracy: number;
//   macro_f1: number;
//   persistence_acc: number;
//   calendar_acc: number;
// }

// export interface ModelMetrics {
//   model_name: string;
//   validation: string;
//   horizons: Record<string, ModelMetricHorizon>;
// }

// export const MODEL_METRICS: ModelMetrics = {
//   model_name: "LightGBM Gradient Boosted Decision Trees",
//   validation: "Temporal Out-of-Time Validation (2023–2024)",
//   horizons: {
//     "30D": { accuracy: 95.3, macro_f1: 0.845, persistence_acc: 77.0, calendar_acc: 87.0 },
//     "60D": { accuracy: 93.8, macro_f1: 0.790, persistence_acc: 62.8, calendar_acc: 86.5 },
//     "90D": { accuracy: 92.7, macro_f1: 0.720, persistence_acc: 44.3, calendar_acc: 86.8 }
//   }
// };

// export const STATIONS: Station[] = [
//   {
//     station_id: "SW1",
//     station_name: "Bagerhat Sadar",
//     upazila: "Bagerhat Sadar",
//     district: "Bagerhat",
//     river: "Alaipur Khal Daratona",
//     latitude: 22.64626,
//     longitude: 89.80163,
//     sea_distance_km: 68,
//     current_ec: 820,
//     current_chloride: 450,
//     forecast: {
//       "30d": {
//         risk_level: "Low",
//         risk_code: 0,
//         lead_days: 28,
//         projected_ec: 940,
//         projected_chloride: 520,
//         probabilities: { low: 88, medium: 9, high: 3 },
//         primary_driver: "Stable Upstream Freshwater Flush (>1,200 m³/s)",
//         action_title: "Routine Operation",
//         recommended_action: "Pond sand filters (PSFs) and freshwater canals are safe. Normal community extraction permitted."
//       },
//       "60d": {
//         risk_level: "Medium",
//         risk_code: 1,
//         lead_days: 56,
//         projected_ec: 1850,
//         projected_chloride: 1020,
//         probabilities: { low: 22, medium: 64, high: 14 },
//         primary_driver: "Upstream Gorai River Flow Recession Expected",
//         action_title: "Conservation Advisory",
//         recommended_action: "Advise Union Parishad water committees to inspect intake gates and encourage household rainwater harvesting storage."
//       },
//       "90d": {
//         risk_level: "High",
//         risk_code: 2,
//         lead_days: 91,
//         projected_ec: 3200,
//         projected_chloride: 1770,
//         probabilities: { low: 4, medium: 18, high: 78 },
//         primary_driver: "Dry-Season Baseflow Depletion (<350 m³/s)",
//         action_title: "Critical Ingress Warning",
//         recommended_action: "Pre-position mobile reverse osmosis (RO) treatment units. Lock community rainwater tanks exclusively for drinking use."
//       }
//     }
//   },
//   {
//     station_id: "SW135",
//     station_name: "Shyamnagar Coastal",
//     upazila: "Shyamnagar",
//     district: "Satkhira",
//     river: "Kholpetua River",
//     latitude: 22.33021,
//     longitude: 89.10254,
//     sea_distance_km: 28,
//     current_ec: 3100,
//     current_chloride: 1720,
//     forecast: {
//       "30d": {
//         risk_level: "High",
//         risk_code: 2,
//         lead_days: 28,
//         projected_ec: 3450,
//         projected_chloride: 1910,
//         probabilities: { low: 2, medium: 7, high: 91 },
//         primary_driver: "Severe Discharge Deficit (<180 m³/s) & Coastal Proximity",
//         action_title: "Critical Saline Alert",
//         recommended_action: "Surface water unpotable. Activate emergency NGO mobile water delivery trucks and distribute water purification tablets."
//       },
//       "60d": {
//         risk_level: "High",
//         risk_code: 2,
//         lead_days: 56,
//         projected_ec: 4800,
//         projected_chloride: 2660,
//         probabilities: { low: 1, medium: 5, high: 94 },
//         primary_driver: "Astronomical Spring Tide Pumping + Soil Salinity Saturation",
//         action_title: "Severe Contamination Protocol",
//         recommended_action: "Alert DPHE to stage solar-powered desalination stations in Gabura and Padmapukur unions."
//       },
//       "90d": {
//         risk_level: "High",
//         risk_code: 2,
//         lead_days: 91,
//         projected_ec: 5900,
//         projected_chloride: 3280,
//         probabilities: { low: 1, medium: 4, high: 95 },
//         primary_driver: "Full Estuarine Marine Intrusion (>18,000 µmho/cm)",
//         action_title: "Disaster Preparedness Alert",
//         recommended_action: "Enforce complete moratorium on agricultural water diversion to preserve municipal drinking reserves."
//       }
//     }
//   },
//   {
//     station_id: "SW242",
//     station_name: "Koyra Estuary",
//     upazila: "Koyra",
//     district: "Khulna",
//     river: "Kobadak River",
//     latitude: 22.34185,
//     longitude: 89.30042,
//     sea_distance_km: 22,
//     current_ec: 2750,
//     current_chloride: 1510,
//     forecast: {
//       "30d": {
//         risk_level: "Medium",
//         risk_code: 1,
//         lead_days: 28,
//         projected_ec: 2650,
//         projected_chloride: 1470,
//         probabilities: { low: 18, medium: 71, high: 11 },
//         primary_driver: "Tidal Phase Inundation with Moderate Upstream Gorai Inflow",
//         action_title: "Precautionary Advisory",
//         recommended_action: "Issue community notice: filter municipal water and protect embankment pond sand filters from tidal surge."
//       },
//       "60d": {
//         risk_level: "High",
//         risk_code: 2,
//         lead_days: 56,
//         projected_ec: 3950,
//         projected_chloride: 2190,
//         probabilities: { low: 3, medium: 14, high: 83 },
//         primary_driver: "Prolonged Cumulative Drought (Zero 4-Week Rainfall)",
//         action_title: "Critical Ingress Warning",
//         recommended_action: "Coordinate with Upazila Disaster Management Committee (UDMC) to pre-position mobile reverse osmosis units."
//       },
//       "90d": {
//         risk_level: "High",
//         risk_code: 2,
//         lead_days: 91,
//         projected_ec: 4900,
//         projected_chloride: 2720,
//         probabilities: { low: 2, medium: 8, high: 90 },
//         primary_driver: "Severe Regional Hydrological Deficit",
//         action_title: "Critical Ingress Warning",
//         recommended_action: "Distribute emergency deep-tube water vouchers and secure regional pond sand filter perimeters."
//       }
//     }
//   }
// ];














////////////////////////////////////////////////////////////



import { RiskLevel } from "@/lib/hydrology";

export interface HorizonForecastDetails {
  risk_level: RiskLevel;
  risk_code: 0 | 1 | 2;
  lead_days: number;
  projected_ec: number;
  projected_chloride: number;
  probabilities: {
    low: number;
    medium: number;
    high: number;
  };
  primary_driver: string;
  action_title: string;
  recommended_action: string;
}

export interface Station {
  station_id: string;
  station_name: string;
  upazila: string;
  district: string;
  river: string;
  latitude: number;
  longitude: number;
  sea_distance_km: number;
  current_ec: number;
  current_chloride: number;
  forecast: {
    "30d"?: HorizonForecastDetails;
    "60d"?: HorizonForecastDetails;
    "90d"?: HorizonForecastDetails;
    [key: string]: HorizonForecastDetails | undefined;
  };
}

// Geometric coordinates and initial fallback placeholders (No hardcoded metrics)
export const STATIONS: Station[] = [
  {
    station_id: "SW1",
    station_name: "Bagerhat Sadar",
    upazila: "Bagerhat Sadar",
    district: "Bagerhat",
    river: "Alaipur Khal Daratona",
    latitude: 22.64626,
    longitude: 89.80163,
    sea_distance_km: 92,
    current_ec: 820,
    current_chloride: 450,
    forecast: {}
  },
  {
    station_id: "SW135",
    station_name: "Shyamnagar Coastal",
    upazila: "Shyamnagar",
    district: "Satkhira",
    river: "Kholpetua River",
    latitude: 22.33021,
    longitude: 89.10254,
    sea_distance_km: 68,
    current_ec: 3100,
    current_chloride: 1720,
    forecast: {}
  },
  {
    station_id: "SW242",
    station_name: "Koyra Estuary",
    upazila: "Koyra",
    district: "Khulna",
    river: "Kobadak River",
    latitude: 22.34185,
    longitude: 89.30042,
    sea_distance_km: 67,
    current_ec: 2750,
    current_chloride: 1510,
    forecast: {}
  }
];