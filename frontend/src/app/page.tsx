"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { 
  Droplets, ShieldAlert, Activity, AlertTriangle, 
  Sliders, BarChart3, Info, HeartPulse, Sprout, 
  Filter, Users, Gauge, BookOpen, Compass, Cpu
} from "lucide-react";

import { STATIONS as FALLBACK_STATIONS, Station } from "@/data/salinityData";
import { 
  UPAZILA_REGISTRY, 
  calculateBiophysics, 
  calculateLogistics, 
  getRiskColorTokens,
  ForecastHorizon,
  RiskLevel
} from "@/lib/hydrology";

interface StressSimStep {
  risk_level: RiskLevel;
  simulated_ec: number;
  deficit_pct: number;
}

interface HorizonMetric {
  train_rows: number;
  test_rows: number;
  temp_scaling_T: number[];
  model_risk: { accuracy: number; macro_f1: number };
  baseline_persistence: { accuracy: number; macro_f1: number };
  ec_regression_mae: {
    model_mae: number;
    persistence_mae: number;
    climatology_mae: number;
  };
}

interface MetricsPayload {
  surrogate_demonstration_data: boolean;
  model_architecture: string;
  test_start_date: string;
  features: string[];
  horizons: Record<string, HorizonMetric>;
}

const MapComponent = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full min-h-[350px] items-center justify-center bg-slate-900 text-slate-400 font-mono text-xs">
      <span className="animate-pulse">Loading coastal GIS geospatial layer...</span>
    </div>
  )
});

export default function Dashboard() {
  const [stations, setStations] = useState<Station[]>(FALLBACK_STATIONS);
  const [selectedStation, setSelectedStation] = useState<Station>(FALLBACK_STATIONS[1]); 
  const [horizon, setHorizon] = useState<ForecastHorizon>("30D");
  const [asOfDate, setAsOfDate] = useState<string>("2024-12-30");
  const [showSim, setShowSim] = useState<boolean>(false);
  const [showValidation, setShowValidation] = useState<boolean>(false);
  const [showProvenance, setShowProvenance] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [metricsData, setMetricsData] = useState<MetricsPayload | null>(null);
  const [stressMatrix, setStressMatrix] = useState<Record<string, Record<string, StressSimStep>> | null>(null);
  const [dischargeReduction, setDischargeReduction] = useState<number>(40);

  useEffect(() => {
    fetch("/data/latest_forecast.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { stations?: Station[]; as_of_date?: string } | null) => {
        if (data?.stations && data.stations.length > 0) {
          setStations(data.stations);
          if (data.as_of_date) setAsOfDate(data.as_of_date);
          const defaultSt = data.stations.find((s) => s.station_id === "SW135") || data.stations[0];
          setSelectedStation(defaultSt);
          setIsSynced(true);
        }
      })
      .catch((err) => console.warn("Awaiting live forecast artifacts:", err));

    fetch("/data/metrics.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: MetricsPayload | null) => { if (data) setMetricsData(data); })
      .catch((err) => console.warn("Awaiting metrics artifacts:", err));

    fetch("/data/stress_simulation.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Record<string, Record<string, StressSimStep>> | null) => { if (data) setStressMatrix(data); })
      .catch((err) => console.warn("Awaiting stress artifacts:", err));
  }, []);

  const fc = selectedStation?.forecast?.[horizon.toLowerCase()] || selectedStation?.forecast?.["30d"];
  
  const currentEC = selectedStation?.current_ec ?? 2800;
  const currentChloride = selectedStation?.current_chloride ?? 1500;
  const activeEC = fc?.projected_ec ?? currentEC;
  const activeChloride = fc?.projected_chloride ?? currentChloride;

  const registry = UPAZILA_REGISTRY[selectedStation?.station_id] || UPAZILA_REGISTRY.SW135;
  const vulnerablePop = Math.round(registry.population_2022 * (registry.planning_stress_pct / 100));
  const roUnitsNeeded = calculateLogistics(vulnerablePop, fc?.risk_level);
  const biophysics = calculateBiophysics(activeEC, activeChloride);
  const riskTokens = getRiskColorTokens(fc?.risk_level);

  // Dynamic ML Stress Query
  const nearestDeficitStep = Math.round(dischargeReduction / 20) * 20;
  const simOutput = stressMatrix?.[selectedStation?.station_id]?.[String(nearestDeficitStep)];
  const simulatedRisk: RiskLevel = simOutput?.risk_level ?? "Medium";
  const simulatedEC = simOutput?.simulated_ec ?? Math.round(currentEC * 1.35);
  const simRiskTokens = getRiskColorTokens(simulatedRisk);

  return (
    <div className="flex flex-col min-h-screen lg:h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-x-hidden lg:overflow-hidden">
      
      {/* Transparency Banner */}
      <div className="bg-amber-950/80 border-b border-amber-800/80 px-4 py-1 text-[11px] text-amber-200 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-medium">
          <Info className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <b>Prototype Demonstration:</b> Multi-horizon surrogate model calibrated to historical estuarine distributions.
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
                  {isSynced ? `As of ${asOfDate}` : "Offline Standby"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Coastal Salinity Predictive Intelligence & Early-Warning Platform (Southwest Delta)
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 flex-wrap">
            {/* Clean Static Metric & Domain Guide Button */}
            <button
              onClick={() => setShowGuide(true)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg border border-cyan-800 bg-cyan-950/40 text-cyan-300 hover:text-white hover:bg-cyan-900/60 transition shadow-sm"
              title="Open domain guide and metric definitions"
            >
              <BookOpen className="h-3.5 w-3.5 text-cyan-400" />
              <span>Metric & Domain Guide</span>
            </button>

            {/* Validation Benchmarks Button */}
            <button
              onClick={() => setShowValidation(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
              <span>Validation Benchmarks</span>
            </button>

            {/* Horizon Selector */}
            <div className="flex items-center bg-slate-800/90 rounded-lg p-1 border border-slate-700">
              {(["30D", "60D", "90D"] as ForecastHorizon[]).map((h) => (
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
              <p className="text-slate-500 text-[10px] uppercase font-mono leading-none">PSF Intake Status ({horizon})</p>
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
              <p className="text-slate-500 text-[10px] uppercase font-mono leading-none">Mobile RO Staging ({horizon})</p>
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
                    <span className="text-xs font-bold text-slate-200">~{registry.coastal_distance_km} km (Indicative)</span>
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
              {fc ? (
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
                    <span className="text-[11px]">Primary Model Feature: <b>{fc.primary_driver}</b></span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 text-xs font-mono">
                  Syncing model artifacts... Please run python train_model.py
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
                      {biophysics.whoTasteMultiple >= 1.0 ? (
                        <>Exceeds WHO aesthetic taste threshold (200 mg/L) by <b>~{biophysics.whoTasteMultiple}x</b>. Water is unpalatable without treatment.</>
                      ) : (
                        <>Within WHO aesthetic drinking guidelines (&lt;200 mg/L Na⁺). Normal aesthetic range.</>
                      )}
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
                      FAO 29 irrigation guideline threshold for Boro rice is 2.0 dS/m. Prolonged canal diversion above this level induces osmotic stress and reduces crop yields.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                        <Filter className="h-3.5 w-3.5 text-cyan-400" />
                        Slow Sand Filtration (PSF Intake at {horizon})
                      </span>
                      <span className="font-mono text-[10px] text-cyan-400 uppercase font-bold">
                        {biophysics.psfAction}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      Slow sand filters remove pathogens and turbidity but cannot filter dissolved salt ions. When river salinity breaches 1,500 µS/cm, intake gates must close to protect community ponds.
                    </p>
                  </div>
                </div>
              </div>

              {/* Civic Action Protocol Card */}
              {fc && (
                <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1.5">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>Civic Action Protocol (DPHE / Upazila)</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-200 mb-1">{fc.action_title}</p>
                  <p className="text-slate-400 leading-relaxed text-[11px]">{fc.recommended_action}</p>
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
                    Logistics: Planning basis assumes 5% acute hotspot population × 15L Sphere quota ÷ 10,000L/day unit capacity.
                  </div>
                </div>
              )}

              {/* Dynamic Physical Upstream Stress Simulator */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden mb-4 lg:mb-0">
                <button
                  onClick={() => setShowSim(!showSim)}
                  className="w-full p-3.5 flex justify-between items-center text-xs font-bold text-slate-200 hover:bg-slate-800/50 transition"
                >
                  <span className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>Upstream Baseflow Deficit Stress Model</span>
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {showSim ? "Hide" : "Simulate Flow Deficit"}
                  </span>
                </button>

                {showSim && (
                  <div className="p-3.5 pt-0 border-t border-slate-800/80 text-xs flex flex-col gap-3">
                    <p className="text-[11px] text-slate-400 mt-2">
                      Simulates estuarine response to upstream freshwater discharge reduction:
                    </p>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-300">Upstream Discharge Cut:</span>
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

      {/* Clean Metric & Domain Guide Modal (Zero Unescaped JSX Blocks) */}
      {showGuide && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl my-auto max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-800 text-cyan-300">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">AquaShield AI - Comprehensive Domain & Metric Guide</h3>
                    <span className="bg-cyan-950 border border-cyan-800 text-cyan-300 text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold">
                      v2.4
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Physical hydrology, chemical stoichiometry, agronomic guidelines, logistics math, and ML benchmarks</p>
                </div>
              </div>
              <button 
                onClick={() => setShowGuide(false)} 
                className="text-slate-400 hover:text-white text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition"
              >
                Close ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto pr-2 mt-4 space-y-4 text-xs text-slate-300">
              
              {/* Section 1: Estuarine Hydrodynamics & Salinity Metrics */}
              <section className="bg-slate-950/90 p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-cyan-400 text-sm flex items-center gap-2">
                  <Droplets className="h-4 w-4" /> 1. River Salinity & Physical Hydrodynamics
                </h4>
                <div className="mt-3 space-y-2.5 text-[11px] leading-relaxed">
                  <p>
                    <b className="text-white">Electrical Conductivity (EC in µmho/cm or µS/cm):</b> Quantifies water&apos;s ionic conduction capability, directly proportional to dissolved salt concentration. In coastal hydrology, 1 µmho/cm = 1 µS/cm (microsiemens per centimeter). 1,000 µS/cm = 1 dS/m (decisiemens per meter).
                  </p>
                  <p>
                    <b className="text-white">Total Dissolved Solids (TDS Approximation):</b> For coastal deltaic river waters, TDS in mg/L is empirically estimated as:
                    <span className="block mt-1 font-mono text-[10px] text-cyan-300 bg-slate-900 p-2 rounded border border-slate-800/80">
                      TDS (mg/L) ≈ EC (µS/cm) × 0.64
                    </span>
                    Thus, 1,500 µS/cm corresponds to ~960 mg/L TDS, and 3,000 µS/cm corresponds to ~1,920 mg/L TDS.
                  </p>
                  <p>
                    <b className="text-white">Chloride (Cl⁻ in PPM or mg/L):</b> The primary marine anion. Corrodes steel and pump impellers, and disrupts freshwater fish and wetland ecology when sustained above 600 PPM.
                  </p>
                  <p>
                    <b className="text-white">Sodium Stoichiometry (Na⁺ via Dittmar Principle):</b> In open marine and estuarine seawater, the ratio of dissolved conservative ions remains constant regardless of dilution. Applying the oceanic stoichiometric mass ratio:
                    <span className="block mt-1 font-mono text-[10px] text-cyan-300 bg-slate-900 p-2 rounded border border-slate-800/80">
                      Estimated Na⁺ (mg/L) = Chloride (PPM) × 0.556
                    </span>
                    This prevents assuming an idealized pure NaCl solution and reflects multi-salt estuarine dynamics.
                  </p>
                </div>
              </section>

              {/* Section 2: Public Health & Agronomic Thresholds */}
              <section className="bg-slate-950/90 p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-cyan-400 text-sm flex items-center gap-2">
                  <Sprout className="h-4 w-4" /> 2. Health & Agronomic Guidelines
                </h4>
                <div className="mt-3 space-y-2.5 text-[11px] leading-relaxed">
                  <p>
                    <b className="text-white">WHO Aesthetic Taste Limit (200 mg/L Na⁺):</b> The formal guideline established in the <i>WHO Guidelines for Drinking-water Quality</i>. At concentrations above 200 mg/L, drinking water tastes distinctly brackish. While non-toxic acutely, long-term consumption in coastal communities contributes significantly to hypertension and renal stress.
                  </p>
                  <p>
                    <b className="text-white">FAO 29 Irrigation Salinity Ceiling (2.0 dS/m ECw):</b> <i>FAO Irrigation and Drainage Paper 29</i> sets 2.0 dS/m (2,000 µmho/cm) as the severe restriction boundary for Boro rice irrigation. Diverting canal water exceeding this threshold induces root-zone osmotic drought, inhibits nutrient uptake, and causes spikelet sterility during reproductive flowering.
                  </p>
                  <p>
                    <b className="text-white">Capillary Upward Flux in Coastal Polders:</b> During dry-season months (February–May), high surface evaporation pulls shallow saline groundwater upward into agricultural topsoil. Irrigating with brackish canal water accelerates topsoil salinization exponentially.
                  </p>
                </div>
              </section>

              {/* Section 3: Treatment Limits & Humanitarian Staging */}
              <section className="bg-slate-950/90 p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-cyan-400 text-sm flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" /> 3. Treatment Infrastructure & Sphere Logistics
                </h4>
                <div className="mt-3 space-y-2.5 text-[11px] leading-relaxed">
                  <p>
                    <b className="text-white">Pond Sand Filter (PSF) Barrier Limit (1,500 µmho/cm):</b> Community slow sand filtration physically traps suspended silt and pathogens, but <i>cannot remove dissolved ionic salts</i>. When surrounding tidal river salinity breaches 1,500 µS/cm, intake gates must close immediately to prevent saline contamination of drinking ponds.
                  </p>
                  <p>
                    <b className="text-white">Mobile Reverse Osmosis (RO) Staging Math:</b> Scaled against the <i>Sphere Humanitarian Charter minimum emergency standard</i> (15 Liters/person/day for drinking and basic sanitation) and standard trailer-mounted DPHE mobile RO treatment plant capacity (10,000 Liters/day) covering an initial 5% acute hotspot population:
                  </p>
                  <div className="p-2.5 bg-slate-900 rounded-lg font-mono text-[10px] text-cyan-300 border border-slate-800">
                    RO Units Needed = ceil( (Vulnerable Population × 0.05 × 15 L/day) ÷ 10,000 L/day capacity )
                  </div>
                </div>
              </section>

              {/* Section 4: Operational Risk Classification Matrix */}
              <section className="bg-slate-950/90 p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-cyan-400 text-sm flex items-center gap-2">
                  <Gauge className="h-4 w-4" /> 4. Operational Risk Threshold Bands
                </h4>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60">
                    <span className="font-bold text-emerald-400 block text-xs">Low Risk (&lt;1,500 µS/cm)</span>
                    <span className="text-slate-300 text-[10px] block mt-1 leading-snug">
                      Potable with standard PSF. Unrestricted agricultural diversion. Normal municipal water committee operations.
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60">
                    <span className="font-bold text-amber-400 block text-xs">Medium Risk (1,500–3,000 µS/cm)</span>
                    <span className="text-slate-300 text-[10px] block mt-1 leading-snug">
                      PSF intake gates closed. Household rainwater rationing active. Union Parishad inspects embankment sluices.
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60">
                    <span className="font-bold text-rose-400 block text-xs">High Risk (&gt;3,000 µS/cm)</span>
                    <span className="text-slate-300 text-[10px] block mt-1 leading-snug">
                      Acute marine ingress. Full irrigation moratorium. Deploy mobile RO water trucks to designated union hotspots.
                    </span>
                  </div>
                </div>
              </section>

              {/* Section 5: Machine Learning Architecture & Monotonic Guarantees */}
              <section className="bg-slate-950/90 p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-cyan-400 text-sm flex items-center gap-2">
                  <Cpu className="h-4 w-4" /> 5. Machine Learning System & Monotonic Constraints
                </h4>
                <div className="mt-3 space-y-2.5 text-[11px] leading-relaxed">
                  <p>
                    <b className="text-white">Monotonic Ordinal Formulation:</b> Risk is ordinal (0 &lt; 1 &lt; 2). Rather than unconstrained multiclass trees, the engine trains two binary LightGBM classifiers (P(EC &ge; 1,500) and P(EC &ge; 3,000)) with monotonic constraints:
                    <span className="block mt-1 font-mono text-[10px] text-cyan-300 bg-slate-900 p-2 rounded border border-slate-800/80">
                      Discharge constraint = -1 &nbsp;|&nbsp; 30D Lag constraint = -1 &nbsp;|&nbsp; Current EC constraint = +1
                    </span>
                    This mathematically prevents non-physical inversion: reducing upstream freshwater discharge can never predict a drop in future salinity.
                  </p>
                  <p>
                    <b className="text-white">Probability Calibration via Temperature Scaling:</b> Raw boosting probability outputs often suffer from overconfidence. The pipeline applies logit-space Temperature Scaling (Guo et al., 2017) calibrated on held-out validation years to ensure predicted percentages reflect true empirical likelihoods.
                  </p>
                  <p>
                    <b className="text-white">Strict Out-of-Time Temporal Split:</b> Models are trained strictly on pre-2023 data and evaluated out-of-time on 2023–2024 test sets, preventing data leakage common in random k-fold cross-validation.
                  </p>
                </div>
              </section>

              {/* Section 6: Station Geographical Characteristics */}
              <section className="bg-slate-950/90 p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-cyan-400 text-sm flex items-center gap-2">
                  <Compass className="h-4 w-4" /> 6. Southwest Coastal Station Registry
                </h4>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px] min-w-[500px]">
                    <thead>
                      <tr className="bg-slate-900 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                        <th className="p-2">Station Ref</th>
                        <th className="p-2">Name & Upazila</th>
                        <th className="p-2">River System</th>
                        <th className="p-2">Distance to Sea</th>
                        <th className="p-2">Hydrological Sensitivity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300 font-mono">
                      <tr>
                        <td className="p-2 font-bold text-cyan-400">SW1</td>
                        <td className="p-2 font-sans text-white">Bagerhat Sadar</td>
                        <td className="p-2 font-sans">Alaipur Khal Daratona</td>
                        <td className="p-2">~92 km</td>
                        <td className="p-2 font-sans text-[10px] text-slate-400">Inland buffer. Strongly protected by Gorai freshwater flush until late dry season.</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-cyan-400">SW135</td>
                        <td className="p-2 font-sans text-white">Shyamnagar Coastal</td>
                        <td className="p-2 font-sans">Kholpetua River</td>
                        <td className="p-2">~68 km</td>
                        <td className="p-2 font-sans text-[10px] text-slate-400">Direct estuarine marine exposure. Severe tidal pumping and high salinity saturation.</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-cyan-400">SW242</td>
                        <td className="p-2 font-sans text-white">Koyra Estuary</td>
                        <td className="p-2 font-sans">Kobadak River</td>
                        <td className="p-2">~67 km</td>
                        <td className="p-2 font-sans text-[10px] text-slate-400">Tidal delta fringe. Prone to embankment overtopping and severe dry-season baseflow deficit.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

            </div>
          </div>
        </div>
      )}

      {/* Validation Benchmarks Modal */}
      {showValidation && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl my-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Model Validation & Baseline Benchmarks</h3>
                <p className="text-[10px] sm:text-xs text-slate-400">
                  Out-of-Time Test Set (2023–2024) • {metricsData ? `Architecture: ${metricsData.model_architecture}` : "Trained Models"}
                </p>
              </div>
              <button 
                onClick={() => setShowValidation(false)} 
                className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1 rounded bg-slate-800 transition"
              >
                Close ✕
              </button>
            </div>

            <div className="mt-4 text-xs">
              <p className="text-slate-300 leading-relaxed mb-3 text-[11px] sm:text-xs">
                Evaluated against Persistence and Seasonal Climatology baselines. Ordinal monotonicity guarantees physical consistency:
              </p>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase">
                      <th className="p-2.5 sm:p-3">Horizon</th>
                      <th className="p-2.5 sm:p-3">AquaShield (Acc)</th>
                      <th className="p-2.5 sm:p-3">Macro F1</th>
                      <th className="p-2.5 sm:p-3">Model EC MAE</th>
                      <th className="p-2.5 sm:p-3">Climatology MAE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200 font-mono text-xs">
                    {metricsData?.horizons ? (
                      Object.entries(metricsData.horizons).map(([hName, hData]) => (
                        <tr key={hName}>
                          <td className="p-2.5 sm:p-3 font-semibold text-cyan-400">{hName} Horizon</td>
                          <td className="p-2.5 sm:p-3 font-bold text-emerald-400">{(hData.model_risk.accuracy * 100).toFixed(1)}%</td>
                          <td className="p-2.5 sm:p-3">{hData.model_risk.macro_f1.toFixed(3)}</td>
                          <td className="p-2.5 sm:p-3 text-cyan-300">{hData.ec_regression_mae.model_mae} µS/cm</td>
                          <td className="p-2.5 sm:p-3 text-slate-400">{hData.ec_regression_mae.climatology_mae} µS/cm</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-3 text-center text-slate-500 font-mono">
                          Run python train_model.py to generate live validation artifacts.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-[10px] sm:text-[11px] text-cyan-300 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <b>Evaluation Context:</b> Evaluated across complete seasonal cycles. The model combines current salinity persistence with upstream hydrological trends, maintaining predictive value against seasonal climatology baselines.
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
                className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1 rounded bg-slate-800 transition"
              >
                Close ✕
              </button>
            </div>
            
            <div className="mt-4 text-xs space-y-3 text-slate-300">
              <div>
                <h4 className="font-bold text-cyan-400">1. Demographics & Planning Assumptions</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Upazila populations reflect official <b>BBS Population and Housing Census 2022</b> records. Stressed population percentages (35–65%) are scenario planning parameters calibrated to regional water scarcity literature.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-cyan-400">2. Seawater Stoichiometry (Dittmar Principle)</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Sodium concentration (Na⁺) is derived using the standard marine stoichiometric mass ratio (Na/Cl ~ 0.556), reflecting estuarine multi-ion dilution rather than pure NaCl assumption.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-cyan-400">3. Agronomic & Drinking Guidelines</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  The 200 mg/L sodium threshold references the <b>WHO Guidelines for Drinking-water Quality</b> aesthetic taste limit. The 2.0 dS/m irrigation limit references <b>FAO Irrigation and Drainage Paper 29</b> for rice salinity tolerance.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-cyan-400">4. Hydrological Modeling Prototype</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  This demonstration uses a synthetic surrogate time series modeled on an illustrative 1D estuarine dispersion relation and historical BWDB distributions. Formal BWDB gauge data requests have been submitted, and the architecture accepts operational CSV exports directly.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}