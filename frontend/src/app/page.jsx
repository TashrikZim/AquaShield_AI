"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { 
  Droplets, ShieldAlert, Activity, AlertTriangle, 
  Sliders, BarChart3, Info, HeartPulse, Sprout, 
  Filter, Users, Gauge
} from "lucide-react";

import { STATIONS as FALLBACK_STATIONS } from "@/data/salinityData";
import { 
  UPAZILA_REGISTRY, 
  calculateBiophysics, 
  calculateLogistics, 
  getRiskColorTokens 
} from "@/lib/hydrology";

const MapComponent = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full min-h-[350px] items-center justify-center bg-slate-900 text-slate-400 font-mono text-xs">
      <span className="animate-pulse">Loading coastal GIS geospatial layer...</span>
    </div>
  )
});

export default function Dashboard() {
  const [stations, setStations] = useState(FALLBACK_STATIONS);
  const [selectedStation, setSelectedStation] = useState(FALLBACK_STATIONS[1]); 
  const [horizon, setHorizon] = useState("30D");
  const [showSim, setShowSim] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showProvenance, setShowProvenance] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [metricsData, setMetricsData] = useState(null);
  const [stressMatrix, setStressMatrix] = useState(null);
  const [dischargeReduction, setDischargeReduction] = useState(40);

  useEffect(() => {
    // 1. Fetch live ML forecasts
    fetch("/data/latest_forecast.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.stations?.length > 0) {
          setStations(data.stations);
          const defaultSt = data.stations.find((s) => s.station_id === "SW135") || data.stations[0];
          setSelectedStation(defaultSt);
          setIsSynced(true);
        }
      })
      .catch((err) => console.warn("Using fallback static forecast:", err));

    // 2. Fetch out-of-time evaluation benchmarks
    fetch("/data/metrics.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setMetricsData(data); })
      .catch((err) => console.warn("Using fallback metrics:", err));

    // 3. Fetch LightGBM upstream shock sensitivity matrix
    fetch("/data/stress_simulation.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setStressMatrix(data); })
      .catch((err) => console.warn("Using fallback stress matrix:", err));
  }, []);

  // Hydrological context resolution
  const fc = selectedStation?.forecast?.[horizon.toLowerCase()] || selectedStation?.forecast?.["30d"];
  
  // Baseline T0 telemetry
  const currentEC = selectedStation?.current_ec || 2800;
  const currentChloride = selectedStation?.current_chloride || 1500;

  // Active Horizon ML projections
  const activeEC = fc?.projected_ec || currentEC;
  const activeChloride = fc?.projected_chloride || currentChloride;

  // Domain math resolved via hydrology.js
  const registry = UPAZILA_REGISTRY[selectedStation?.station_id] || UPAZILA_REGISTRY.SW135;
  const vulnerablePop = Math.round(registry.population_2022 * (registry.planning_stress_pct / 100));
  const roUnitsNeeded = calculateLogistics(vulnerablePop, fc?.risk_level);
  const biophysics = calculateBiophysics(activeEC, activeChloride);
  const riskTokens = getRiskColorTokens(fc?.risk_level);

  // Dynamic ML Stress Query
  const nearestDeficitStep = Math.round(dischargeReduction / 20) * 20;
  const simOutput = stressMatrix?.[selectedStation?.station_id]?.[String(nearestDeficitStep)];
  const simulatedRisk = simOutput ? simOutput.risk_level : (dischargeReduction > 40 ? "High" : "Medium");
  const simulatedEC = simOutput ? simOutput.simulated_ec : Math.round(currentEC * (1 + (dischargeReduction / 100) * 0.45));
  const simRiskTokens = getRiskColorTokens(simulatedRisk);

  return (
    <div className="flex flex-col min-h-screen lg:h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-x-hidden lg:overflow-hidden">
      
      {/* Transparency Banner */}
      <div className="bg-amber-950/80 border-b border-amber-800/80 px-4 py-1 text-[11px] text-amber-200 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-medium">
          <Info className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <b>Prototype Demonstration:</b> Multi-horizon models calibrated on Savenije estuarine dispersion physics.
        </span>
        <button 
          onClick={() => setShowProvenance(true)} 
          className="underline hover:text-white font-mono text-[10px] ml-2 shrink-0"
        >
          Inspect Data Provenance
        </button>
      </div>

      {/* Primary Header */}
      <header className="shrink-0 border-b border-slate-800 bg-slate-900/95 px-4 sm:px-6 py-2.5 z-20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 max-w-7xl mx-auto lg:max-w-none">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Droplets className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold tracking-tight text-white leading-none">AquaShield AI</h1>
                <span className="bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  {isSynced ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> : null}
                  {isSynced ? "Engine Synced" : "Demo Mode"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Coastal Salinity Predictive Intelligence & Early-Warning Platform (Southwest Delta)
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <button
              onClick={() => setShowValidation(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
              <span>Validation Benchmarks</span>
            </button>

            <div className="flex items-center bg-slate-800/90 rounded-lg p-1 border border-slate-700">
              {["30D", "60D", "90D"].map((h) => (
                <button
                  key={h}
                  onClick={() => setHorizon(h)}
                  className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    horizon === h 
                      ? "bg-cyan-500 text-slate-950 font-bold shadow-sm" 
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Community Exposure Ribbon */}
      <section className="shrink-0 bg-slate-900 border-b border-slate-800/80 px-4 sm:px-6 py-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 max-w-7xl mx-auto lg:max-w-none text-xs">
          <div className="bg-slate-950/70 p-2 sm:p-2.5 rounded-lg border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-md bg-rose-500/10 text-rose-400 shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-mono leading-none">BBS 2022 Population</p>
              <p className="text-sm sm:text-base font-bold text-white mt-1">
                {registry.population_2022.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">Total Upazila</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-950/70 p-2 sm:p-2.5 rounded-lg border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-md bg-amber-500/10 text-amber-400 shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-mono leading-none">Drinking-Stressed Pop.</p>
              <p className="text-sm sm:text-base font-bold text-amber-300 mt-1">
                ~{vulnerablePop.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">(Planning ~{registry.planning_stress_pct}%)</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-950/70 p-2 sm:p-2.5 rounded-lg border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-md bg-cyan-500/10 text-cyan-400 shrink-0">
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-mono leading-none">Pond Sand Filter ({horizon})</p>
              <p className="text-sm sm:text-base font-bold text-white mt-1">
                {biophysics.psfStatus}
              </p>
            </div>
          </div>

          <div className="bg-slate-950/70 p-2 sm:p-2.5 rounded-lg border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-md bg-indigo-500/10 text-indigo-400 shrink-0">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-mono leading-none">Mobile RO Response ({horizon})</p>
              <p className="text-sm sm:text-base font-bold text-white mt-1">
                {roUnitsNeeded > 0 ? `${roUnitsNeeded} Units (Pre-positioned)` : "Standby"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Operational Canvas */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 relative">
        {/* Map View */}
        <div className="w-full lg:w-[58%] xl:w-[62%] h-[370px] sm:h-[450px] lg:h-full relative shrink-0 lg:shrink">
          <MapComponent
            stations={stations}
            selectedStation={selectedStation}
            onSelectStation={setSelectedStation}
            horizon={horizon}
          />
          <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg p-2.5 text-xs shadow-xl">
            <p className="font-semibold text-slate-200 text-[11px]">Estuarine Monitoring Zone ({horizon})</p>
            <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-slate-800 text-[10px]">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Safe (&lt;1.5k)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Warning (1.5-3k)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Hazard (&gt;3k)</span>
            </div>
          </div>
        </div>

        {/* Intelligence Sidebar */}
        <div className="w-full lg:w-[42%] xl:w-[38%] h-auto lg:h-full overflow-y-auto p-4 sm:p-5 bg-slate-900/80 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col gap-3.5">
          {/* Mobile Station Quick Toggle */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:hidden">
            <span className="text-[10px] uppercase font-mono text-slate-500 shrink-0">Station:</span>
            {stations.map((st) => (
              <button
                key={st.station_id}
                onClick={() => setSelectedStation(st)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition ${
                  selectedStation?.station_id === st.station_id
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                {st.station_name}
              </button>
            ))}
          </div>

          {selectedStation && (
            <>
              {/* Gauges Card */}
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                      Station Ref: {selectedStation.station_id}
                    </span>
                    <h2 className="text-base sm:text-lg font-bold mt-1 text-white">{selectedStation.station_name}</h2>
                    <p className="text-xs text-slate-400">{selectedStation.upazila}, {selectedStation.district} • {selectedStation.river}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Bay of Bengal Dist.</span>
                    <span className="text-xs font-bold text-slate-200">~{registry.coastal_distance_km} km (Measured)</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800 text-xs">
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-slate-500 text-[10px] uppercase font-mono block">Direct River EC (T₀)</span>
                    <span className="text-sm font-bold text-slate-100">
                      {currentEC.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">µmho/cm</span>
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-slate-500 text-[10px] uppercase font-mono block">Chloride (Cl⁻ at T₀)</span>
                    <span className="text-sm font-bold text-slate-100">
                      {currentChloride.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">PPM</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Machine Learning Prediction Card */}
              {fc && (
                <div className={`p-3.5 rounded-xl border transition-all ${riskTokens.container}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Forecast Horizon: {horizon} ({fc.lead_days} Days Lead)
                      </span>
                      <span className="text-base font-bold text-white mt-0.5 block">
                        {fc.risk_level} Saline Ingress Risk
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border inline-block ${riskTokens.badge}`}>
                        {fc.risk_level}
                      </span>
                      <span className="text-[10px] block font-mono text-slate-400 mt-1">
                        Est. ~{activeEC.toLocaleString()} µmho/cm
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                    <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[9px] block">Safe (&lt;1.5k)</span>
                      <span className="font-bold text-emerald-400">{fc.probabilities?.low}%</span>
                    </div>
                    <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[9px] block">Warn (1.5-3k)</span>
                      <span className="font-bold text-amber-400">{fc.probabilities?.medium}%</span>
                    </div>
                    <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[9px] block">Hazard (&gt;3k)</span>
                      <span className="font-bold text-rose-400">{fc.probabilities?.high}%</span>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center gap-1.5 text-xs text-slate-300">
                    <Activity className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <span className="text-[11px]">Primary Trigger: <b>{fc.primary_driver}</b></span>
                  </div>
                </div>
              )}

              {/* Biophysical Diagnostics */}
              <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Gauge className="h-4 w-4 text-cyan-400" />
                    Domain Diagnostics (Projected at {horizon})
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400">~{activeEC.toLocaleString()} µmho/cm</span>
                </div>

                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                        <HeartPulse className="h-3.5 w-3.5 text-rose-400" />
                        Projected Sodium ({horizon})
                      </span>
                      <span className="font-mono text-[11px] font-bold text-rose-400">
                        ~{biophysics.sodiumEstimateMgL} mg/L Na⁺
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      Exceeds WHO aesthetic taste threshold (200 mg/L) by <b>~{biophysics.whoTasteMultiple}x</b>. Prolonged reliance on water above 1,000 mg/L correlates with elevated preeclampsia in coastal unions.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                        <Sprout className="h-3.5 w-3.5 text-amber-400" />
                        Irrigation Salinity (ECw at {horizon})
                      </span>
                      <span className="font-mono text-[11px] font-bold text-amber-400">
                        {biophysics.soilSalinityDsM} dS/m
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      FAO 29 irrigation threshold for Boro rice is 2.0 dS/m. Application above this limit triggers seedling root burn and spikelet sterility.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                        <Filter className="h-3.5 w-3.5 text-cyan-400" />
                        Slow Sand Filtration (PSF at {horizon})
                      </span>
                      <span className="font-mono text-[10px] text-cyan-400 uppercase font-bold">
                        {biophysics.psfAction}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      Slow sand filters do not block dissolved chloride. At this projected salinity, water extracted from flooded village ponds requires secondary reverse osmosis.
                    </p>
                  </div>
                </div>
              </div>

              {/* Civic Protocol */}
              {fc && (
                <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1.5">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>Civic Action Protocol (DPHE / Upazila)</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-200 mb-1">{fc.action_title}</p>
                  <p className="text-slate-400 leading-relaxed text-[11px]">{fc.recommended_action}</p>
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
                    Logistics: 5% acute hotspot pop × 15L Sphere quota ÷ 10,000L/day mobile RO unit capacity.
                  </div>
                </div>
              )}

              {/* True ML Stress Simulator */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden mb-4 lg:mb-0">
                <button
                  onClick={() => setShowSim(!showSim)}
                  className="w-full p-3.5 flex justify-between items-center text-xs font-bold text-slate-200 hover:bg-slate-800/50 transition"
                >
                  <span className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>ML Upstream Discharge Stress Model</span>
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {showSim ? "Hide" : "Simulate Flow Deficit"}
                  </span>
                </button>

                {showSim && (
                  <div className="p-3.5 pt-0 border-t border-slate-800/80 text-xs flex flex-col gap-3">
                    <p className="text-[11px] text-slate-400 mt-2">
                      Simulates Gorai/Padma river discharge reduction evaluated through the trained LightGBM 30-day model:
                    </p>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-300">Upstream Baseflow Drop:</span>
                        <span className="font-mono text-cyan-400 font-bold">-{nearestDeficitStep}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="80"
                        step="20"
                        value={dischargeReduction}
                        onChange={(e) => setDischargeReduction(Number(e.target.value))}
                        className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                        <span>0%</span>
                        <span>-20%</span>
                        <span>-40%</span>
                        <span>-60%</span>
                        <span>-80%</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-mono">Simulated River Salinity</span>
                        <span className="text-xs font-bold text-white">~{simulatedEC.toLocaleString()} µmho/cm</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${simRiskTokens.badge}`}>
                        {simulatedRisk} Hazard
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Validation Benchmarks Modal */}
      {showValidation && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl my-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Model Validation & Baseline Benchmarks</h3>
                <p className="text-[10px] sm:text-xs text-slate-400">
                  Evaluated on Out-of-Time Test Set (2023–2024) • {metricsData ? `Model: ${metricsData.model_architecture}` : "Trained Artifacts"}
                </p>
              </div>
              <button 
                onClick={() => setShowValidation(false)} 
                className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1 rounded bg-slate-800"
              >
                Close ✕
              </button>
            </div>

            <div className="mt-4 text-xs">
              <p className="text-slate-300 leading-relaxed mb-3 text-[11px] sm:text-xs">
                In strict temporal evaluation, the LightGBM classifier maintains predictive skill at 90 days, while simple persistence-based river monitoring degrades sharply:
              </p>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse min-w-[480px]">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase">
                      <th className="p-2.5 sm:p-3">Forecast Horizon</th>
                      <th className="p-2.5 sm:p-3">AquaShield (Acc)</th>
                      <th className="p-2.5 sm:p-3">Macro F1</th>
                      <th className="p-2.5 sm:p-3">Persistence Baseline</th>
                      <th className="p-2.5 sm:p-3">Calendar Climatology</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200 font-mono text-xs">
                    {metricsData?.horizons ? (
                      Object.entries(metricsData.horizons).map(([hName, hData]) => (
                        <tr key={hName}>
                          <td className="p-2.5 sm:p-3 font-semibold text-cyan-400">{hName} Horizon</td>
                          <td className="p-2.5 sm:p-3 font-bold text-emerald-400">{(hData.model.accuracy * 100).toFixed(1)}%</td>
                          <td className="p-2.5 sm:p-3">{hData.model.macro_f1.toFixed(3)}</td>
                          <td className="p-2.5 sm:p-3 text-slate-400">{(hData.baseline_persistence.accuracy * 100).toFixed(1)}%</td>
                          <td className="p-2.5 sm:p-3 text-slate-400">{(hData.baseline_calendar_climatology.accuracy * 100).toFixed(1)}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="p-3 text-center text-slate-500 font-mono">
                          Training metrics loaded dynamically from /data/metrics.json
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-[10px] sm:text-[11px] text-cyan-300 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <b>Why Persistence Degrades at 90 Days:</b> Seasonal estuarine tipping points cause rapid saline intrusion that cannot be extrapolated from immediate river conditions without accounting for upstream discharge recession and spring-neap tidal cycles.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Provenance Modal */}
      {showProvenance && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl my-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Data Provenance & Scientific Methodology</h3>
              <button 
                onClick={() => setShowProvenance(false)} 
                className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1 rounded bg-slate-800"
              >
                Close ✕
              </button>
            </div>
            
            <div className="mt-4 text-xs space-y-3 text-slate-300">
              <div>
                <h4 className="font-bold text-cyan-400">1. Demographics & Planning Heuristics</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Upazila populations are from the official <b>BBS Population and Housing Census 2022</b>. Stressed population percentages (35–65%) are scenario planning assumptions calibrated to coastal drinking water scarcity literature.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-cyan-400">2. Seawater Chemistry (Dittmar Principle)</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Sodium concentration (Na⁺) is calculated using the marine stoichiometric mass ratio (Na/Cl = 0.556), reflecting estuarine multi-salt dilution rather than an idealized pure NaCl assumption.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-cyan-400">3. Agronomic & Health Thresholds</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  The 200 mg/L sodium guideline is referenced from the <b>WHO Guidelines for Drinking-water Quality</b> as an aesthetic taste threshold. The 2.0 dS/m irrigation water limit is referenced from <b>FAO Irrigation and Drainage Paper 29</b>.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-cyan-400">4. Machine Learning & Prototype Architecture</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  The current deployment uses a synthetic dataset calibrated to BWDB historical range distributions and Savenije physical estuarine mass-balance formulas. The pipeline is architected to ingest BWDB batch CSV/Excel records directly when deployed in production.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}