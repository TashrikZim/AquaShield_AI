"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { 
  Droplets, ShieldAlert, Activity, AlertTriangle, 
  Sliders, BarChart3, Info, HeartPulse, Sprout, 
  Filter, Users, ArrowUpRight, Gauge
} from "lucide-react";
import { STATIONS as FALLBACK_STATIONS, MODEL_METRICS } from "@/data/salinityData";

const MapComponent = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full min-h-[350px] items-center justify-center bg-slate-900 text-slate-400 font-mono text-xs">
      <span className="animate-pulse">Loading coastal GIS geospatial layer...</span>
    </div>
  )
});

// Demographics & critical drinking infrastructure registry
const STATION_IMPACT_METRICS = {
  SW1: { population: 282000, psf_count: 54, psf_threatened: 12, rain_days_left: 38 },
  SW135: { population: 318000, psf_count: 78, psf_threatened: 68, rain_days_left: 14 },
  SW242: { population: 193000, psf_count: 62, psf_threatened: 49, rain_days_left: 18 }
};

export default function Dashboard() {
  const [stations, setStations] = useState(FALLBACK_STATIONS);
  const [selectedStation, setSelectedStation] = useState(FALLBACK_STATIONS[1]); // Default to Shyamnagar (SW135)
  const [horizon, setHorizon] = useState("30D");
  const [showSim, setShowSim] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [isSynced, setIsSynced] = useState(false);

  // Climate stress simulator state
  const [dischargeReduction, setDischargeReduction] = useState(40);
  const [droughtSeverity, setDroughtSeverity] = useState("Severe");

  useEffect(() => {
    fetch("/data/latest_forecast.json")
      .then((res) => {
        if (!res.ok) throw new Error("Forecast file not found");
        return res.json();
      })
      .then((data) => {
        if (data && data.stations && data.stations.length > 0) {
          setStations(data.stations);
          setSelectedStation(data.stations[1]); // SW135
          setIsSynced(true);
        }
      })
      .catch((err) => {
        console.warn("Using built-in fallback dataset:", err);
      });
  }, []);

  const fc = selectedStation?.forecast?.[horizon.toLowerCase()] || selectedStation?.forecast?.["30d"];
  const currentEC = selectedStation?.current_ec || 2800;
  const currentChloride = selectedStation?.current_chloride || 1500;
  
  // Biophysical & agronomic conversions directly derived from sensor values
  const sodiumEstimateMgL = Math.round(currentChloride * 0.64);
  const soilSalinityDsM = (currentEC / 1000).toFixed(2);
  const stStats = STATION_IMPACT_METRICS[selectedStation?.station_id] || STATION_IMPACT_METRICS.SW135;

  const getSimulatedRisk = () => {
    if (dischargeReduction > 50 || droughtSeverity === "Extreme") return "High";
    if (dischargeReduction > 25) return "Medium";
    return "Low";
  };

  return (
    <div className="flex flex-col min-h-screen lg:h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-x-hidden lg:overflow-hidden">
      
      {/* 1. Top Navigation Bar */}
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
                Coastal Salinity Intelligence & Civic Action Platform (Southwest Delta)
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <button
              onClick={() => setShowValidation(!showValidation)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
              <span className="hidden xs:inline">Validation</span> Benchmarks
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

      {/* 2. Community Exposure & Asset Counter Ribbon */}
      <section className="shrink-0 bg-slate-900 border-b border-slate-800/80 px-4 sm:px-6 py-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 max-w-7xl mx-auto lg:max-w-none text-xs">
          
          <div className="bg-slate-950/70 p-2 sm:p-2.5 rounded-lg border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-md bg-rose-500/10 text-rose-400 shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-mono leading-none">Exposed Population</p>
              <p className="text-sm sm:text-base font-bold text-white mt-1">
                {stStats.population.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">Citizens</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-950/70 p-2 sm:p-2.5 rounded-lg border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-md bg-amber-500/10 text-amber-400 shrink-0">
              <Droplets className="h-4 w-4" />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-mono leading-none">Rainwater Buffer</p>
              <p className="text-sm sm:text-base font-bold text-white mt-1">
                ~{stStats.rain_days_left} Days <span className="text-[10px] text-amber-400 font-normal">Remaining</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-950/70 p-2 sm:p-2.5 rounded-lg border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-md bg-cyan-500/10 text-cyan-400 shrink-0">
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-mono leading-none">Pond Filters (PSFs)</p>
              <p className="text-sm sm:text-base font-bold text-white mt-1">
                {stStats.psf_threatened} <span className="text-[10px] text-slate-400 font-normal">of {stStats.psf_count} Inundated</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-950/70 p-2 sm:p-2.5 rounded-lg border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-md bg-indigo-500/10 text-indigo-400 shrink-0">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-mono leading-none">Mobile RO Deployment</p>
              <p className="text-sm sm:text-base font-bold text-white mt-1">
                {fc.risk_level === "High" ? "6 Units Required" : fc.risk_level === "Medium" ? "2 Units Staged" : "Standby"}
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 3. Main Operational View */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 relative">
        
        {/* Left Map View */}
        <div className="w-full lg:w-[58%] xl:w-[62%] h-[370px] sm:h-[450px] lg:h-full relative shrink-0 lg:shrink">
          <MapComponent
            stations={stations}
            selectedStation={selectedStation}
            onSelectStation={setSelectedStation}
            horizon={horizon}
          />

          {/* Map Status Tag */}
          <div className="absolute top-3 left-3 z-[400] bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg p-2.5 text-xs shadow-xl">
            <p className="font-semibold text-slate-200 text-[11px]">BWDB Estuarine Pilot Zone</p>
            <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-slate-800 text-[10px]">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Safe (&lt;1.5k)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Warning (1.5-3k)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Hazard (&gt;3k)</span>
            </div>
          </div>
        </div>

        {/* Right Intelligence & Action Sidebar */}
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
              {/* Station Context & Physical Gauges */}
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                      ID: {selectedStation.station_id}
                    </span>
                    <h2 className="text-base sm:text-lg font-bold mt-1 text-white">{selectedStation.station_name}</h2>
                    <p className="text-xs text-slate-400">{selectedStation.upazila}, {selectedStation.district} • {selectedStation.river}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Distance to Sea</span>
                    <span className="text-xs font-bold text-slate-200">{selectedStation.sea_distance_km} km Inland</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800 text-xs">
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-slate-500 text-[10px] uppercase font-mono block">Direct River EC</span>
                    <span className="text-sm font-bold text-slate-100">
                      {currentEC.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">µmho/cm</span>
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-slate-500 text-[10px] uppercase font-mono block">Chloride (Cl⁻)</span>
                    <span className="text-sm font-bold text-slate-100">
                      {currentChloride.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">PPM</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Multi-Horizon Calibrated ML Forecast Card */}
              {fc && (
                <div className={`p-3.5 rounded-xl border transition-all ${
                  fc.risk_level === "High"
                    ? "bg-rose-950/20 border-rose-800/60 text-rose-200"
                    : fc.risk_level === "Medium"
                    ? "bg-amber-950/20 border-amber-800/60 text-amber-200"
                    : "bg-emerald-950/20 border-emerald-800/60 text-emerald-200"
                }`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Lead Window: {horizon} ({fc.lead_days} Days Ahead)
                      </span>
                      <span className="text-base font-bold text-white mt-0.5 block">
                        {fc.risk_level} Saline Ingress Hazard
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                      fc.risk_level === "High" 
                        ? "bg-rose-500 text-white border-rose-400" 
                        : fc.risk_level === "Medium" 
                        ? "bg-amber-500 text-slate-950 border-amber-400" 
                        : "bg-emerald-500 text-white border-emerald-400"
                    }`}>
                      {fc.risk_level}
                    </span>
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
                    <span className="text-[11px]">Driver: <b>{fc.primary_driver}</b></span>
                  </div>
                </div>
              )}

              {/* 4. Humanitarian & Biophysical Impact Translation Section */}
              <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Gauge className="h-4 w-4 text-cyan-400" />
                    Biophysical & Domain Impact Assessment
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">WHO & FAO Baselines</span>
                </div>

                <div className="space-y-2.5">
                  {/* Maternal & Cardiovascular Health Card */}
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                        <HeartPulse className="h-3.5 w-3.5 text-rose-400" />
                        Maternal & Vascular Exposure
                      </span>
                      <span className="font-mono text-[11px] font-bold text-rose-400">
                        ~{sodiumEstimateMgL} mg/L Na⁺
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      Exceeds WHO limit (200 mg/L) by <b>{Math.round(sodiumEstimateMgL / 200)}x</b>. Pregnant women face heightened risk of gestational hypertension and preeclampsia.
                    </p>
                  </div>

                  {/* Agricultural & Boro Rice Card */}
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                        <Sprout className="h-3.5 w-3.5 text-amber-400" />
                        Boro Rice Root-Burn Threshold
                      </span>
                      <span className="font-mono text-[11px] font-bold text-amber-400">
                        {soilSalinityDsM} dS/m (ECw)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      Tolerable threshold for local seedlings is 2.0 dS/m. Surface canal diversion at this level induces seedling abortion and root burning.
                    </p>
                  </div>

                  {/* PSF Infrastructure Card */}
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                        <Filter className="h-3.5 w-3.5 text-cyan-400" />
                        Pond Sand Filter (PSF) Integrity
                      </span>
                      <span className="font-mono text-[10px] text-cyan-400 uppercase font-bold">
                        {currentEC > 2500 ? "Membrane Required" : "Sand Filtration OK"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      Standard slow sand filters do not remove dissolved Cl⁻ ions. Water extracted must pass through secondary reverse osmosis (RO) membrane units.
                    </p>
                  </div>
                </div>
              </div>

              {/* 5. Civic Protocol (DPHE / Upazila Action Plan) */}
              {fc && (
                <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1.5">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>Civic Action Protocol (DPHE / Upazila)</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-200 mb-1">{fc.action_title}</p>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    {fc.recommended_action}
                  </p>
                </div>
              )}

              {/* 6. Climate Stress Simulator Accordion */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden mb-4 lg:mb-0">
                <button
                  onClick={() => setShowSim(!showSim)}
                  className="w-full p-3.5 flex justify-between items-center text-xs font-bold text-slate-200 hover:bg-slate-800/50 transition"
                >
                  <span className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>Scenario Stress Simulator</span>
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {showSim ? "Hide" : "Simulate Shock"}
                  </span>
                </button>

                {showSim && (
                  <div className="p-3.5 pt-0 border-t border-slate-800/80 text-xs flex flex-col gap-3">
                    <p className="text-[11px] text-slate-400 mt-2">
                      Simulate upstream Hardinge Bridge / Gorai river baseflow drop:
                    </p>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-300">Upstream Flow Deficit:</span>
                        <span className="font-mono text-cyan-400 font-bold">-{dischargeReduction}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="80"
                        value={dischargeReduction}
                        onChange={(e) => setDischargeReduction(Number(e.target.value))}
                        className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                      <span className="text-[11px] text-slate-400">Simulated 30D Risk:</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        getSimulatedRisk() === "High" ? "bg-rose-500 text-white" : "bg-amber-500 text-slate-950"
                      }`}>
                        {getSimulatedRisk()} Hazard
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
                <p className="text-[10px] sm:text-xs text-slate-400">Temporal Out-of-Time Test Set (2023–2024)</p>
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
                In strict temporal evaluation, AquaShield AI proves machine learning is mathematically necessary, as persistence-based river monitoring collapses over extended lead times:
              </p>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse min-w-[480px]">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase">
                      <th className="p-2.5 sm:p-3">Forecast Horizon</th>
                      <th className="p-2.5 sm:p-3">AquaShield AI</th>
                      <th className="p-2.5 sm:p-3">Macro F1</th>
                      <th className="p-2.5 sm:p-3">Persistence</th>
                      <th className="p-2.5 sm:p-3">Calendar Baseline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200 font-mono text-xs">
                    <tr>
                      <td className="p-2.5 sm:p-3 font-sans font-semibold text-cyan-400">30 Days (T+28d)</td>
                      <td className="p-2.5 sm:p-3 font-bold text-emerald-400">95.3%</td>
                      <td className="p-2.5 sm:p-3">0.845</td>
                      <td className="p-2.5 sm:p-3 text-slate-400">77.0%</td>
                      <td className="p-2.5 sm:p-3 text-slate-400">87.0%</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 sm:p-3 font-sans font-semibold text-cyan-400">60 Days (T+56d)</td>
                      <td className="p-2.5 sm:p-3 font-bold text-emerald-400">93.8%</td>
                      <td className="p-2.5 sm:p-3">0.790</td>
                      <td className="p-2.5 sm:p-3 text-slate-400">62.8%</td>
                      <td className="p-2.5 sm:p-3 text-slate-400">86.5%</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 sm:p-3 font-sans font-semibold text-cyan-400">90 Days (T+91d)</td>
                      <td className="p-2.5 sm:p-3 font-bold text-emerald-400">92.7%</td>
                      <td className="p-2.5 sm:p-3">0.720</td>
                      <td className="p-2.5 sm:p-3 text-rose-400 font-bold">44.3% (Fails)</td>
                      <td className="p-2.5 sm:p-3 text-slate-400">86.8%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-3 p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-[10px] sm:text-[11px] text-cyan-300 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <b>Why Persistence Fails at 90 Days:</b> Seasonal estuarine tipping points cause rapid saline intrusion that cannot be extrapolated from immediate river conditions without accounting for upstream discharge recession.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}