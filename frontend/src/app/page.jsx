"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { 
  Droplets, ShieldAlert, Activity, AlertTriangle, 
  Sliders, BarChart3, Info, MapPin, CheckCircle2
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

export default function Dashboard() {
  const [stations, setStations] = useState(FALLBACK_STATIONS);
  const [selectedStation, setSelectedStation] = useState(FALLBACK_STATIONS[1]); // Default to Shyamnagar
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

  const getSimulatedRisk = () => {
    if (dischargeReduction > 50 || droughtSeverity === "Extreme") return "High";
    if (dischargeReduction > 25) return "Medium";
    return "Low";
  };

  return (
    <div className="flex flex-col min-h-screen lg:h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-x-hidden lg:overflow-hidden">
      {/* Top Header */}
      <header className="shrink-0 border-b border-slate-800 bg-slate-900/90 px-4 sm:px-6 py-3 z-20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 max-w-7xl mx-auto lg:max-w-none">
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Droplets className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-none">AquaShield AI</h1>
                <span className="bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  {isSynced ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> : null}
                  {isSynced ? "Pipeline Synced" : "Demo Mode"}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-1 line-clamp-1">
                Predictive Coastal Salinity Decision Support (Southwest Bangladesh)
              </p>
            </div>
          </div>

          {/* Controls: Horizon Switcher & Validation Modal Button */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t border-slate-800/80 sm:border-0">
            <button
              onClick={() => setShowValidation(!showValidation)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
              <span className="hidden xs:inline">Validation</span> Benchmarks
            </button>

            <div className="flex items-center bg-slate-800/80 rounded-lg p-1 border border-slate-700">
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

      {/* Main Workspace (Column on mobile, row on desktop) */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 relative">
        {/* Left Map Section */}
        <div className="w-full lg:w-[60%] xl:w-[65%] h-[380px] sm:h-[460px] lg:h-full relative shrink-0 lg:shrink">
          <MapComponent
            stations={stations}
            selectedStation={selectedStation}
            onSelectStation={setSelectedStation}
            horizon={horizon}
          />

          {/* Map Overlay Badge (Legend) */}
          <div className="absolute top-3 left-3 z-[400] bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg p-2.5 sm:p-3 text-xs shadow-xl max-w-[260px] sm:max-w-none">
            <p className="font-semibold text-slate-200 text-[11px] sm:text-xs">Estuary Monitoring Zone</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Select a station to inspect risk drivers</p>
            <div className="flex items-center gap-3 sm:gap-4 mt-2 pt-2 border-t border-slate-800 text-[10px] sm:text-[11px] flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500"></span> Safe (&lt;1.5k)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-500"></span> Warning (1.5-3k)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-rose-500"></span> Hazard (&gt;3k)</span>
            </div>
          </div>
        </div>

        {/* Right Intelligence Sidebar */}
        <div className="w-full lg:w-[40%] xl:w-[35%] h-auto lg:h-full overflow-y-auto p-4 sm:p-6 bg-slate-900/80 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col gap-4">
          
          {/* Mobile Station Quick-Tap Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:hidden">
            <span className="text-[10px] uppercase font-mono text-slate-500 shrink-0">Stations:</span>
            {stations.map((st) => (
              <button
                key={st.station_id}
                onClick={() => setSelectedStation(st)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition ${
                  selectedStation?.station_id === st.station_id
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                }`}
              >
                {st.station_name}
              </button>
            ))}
          </div>

          {selectedStation && (
            <>
              {/* Station Details Header */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                      Station ID: {selectedStation.station_id}
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold mt-1.5 text-white">{selectedStation.station_name}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedStation.upazila}, {selectedStation.district} • {selectedStation.river}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Coast Distance</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-200">{selectedStation.sea_distance_km} km to Sea</span>
                  </div>
                </div>

                {/* River Current Readings */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-800 text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                    <span className="text-slate-500 text-[10px] uppercase font-mono block">Current River EC</span>
                    <span className="text-sm sm:text-base font-bold text-slate-200">
                      {selectedStation.current_ec?.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">µmho/cm</span>
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                    <span className="text-slate-500 text-[10px] uppercase font-mono block">Chloride Est.</span>
                    <span className="text-sm sm:text-base font-bold text-slate-200">
                      {selectedStation.current_chloride?.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">PPM</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Calibrated Predictive Risk Card */}
              {fc && (
                <div className={`p-4 rounded-xl border transition-all ${
                  fc.risk_level === "High"
                    ? "bg-rose-950/20 border-rose-800/60 text-rose-200"
                    : fc.risk_level === "Medium"
                    ? "bg-amber-950/20 border-amber-800/60 text-amber-200"
                    : "bg-emerald-950/20 border-emerald-800/60 text-emerald-200"
                }`}>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Forecast Lead Time: {horizon} ({fc.lead_days} Days)
                      </span>
                      <span className="text-base sm:text-lg font-bold text-white mt-0.5 block">
                        {fc.risk_level} Salinity Intrusion Risk
                      </span>
                    </div>
                    <span className={`px-2.5 sm:px-3 py-1 text-xs font-bold rounded-lg border shrink-0 ${
                      fc.risk_level === "High" 
                        ? "bg-rose-500 text-white border-rose-400" 
                        : fc.risk_level === "Medium" 
                        ? "bg-amber-500 text-slate-950 border-amber-400" 
                        : "bg-emerald-500 text-white border-emerald-400"
                    }`}>
                      {fc.risk_level}
                    </span>
                  </div>

                  {/* Confidence Breakdown */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] sm:text-[11px] text-slate-400 mb-1.5 font-mono">
                      <span>Model Confidence</span>
                      <span>Temperature Calibrated</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400 text-[10px] block truncate">Safe (&lt;1.5k)</span>
                        <span className="font-bold text-emerald-400 text-xs sm:text-sm">{fc.probabilities?.low}%</span>
                      </div>
                      <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400 text-[10px] block truncate">Warn (1.5-3k)</span>
                        <span className="font-bold text-amber-400 text-xs sm:text-sm">{fc.probabilities?.medium}%</span>
                      </div>
                      <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400 text-[10px] block truncate">Hazard (&gt;3k)</span>
                        <span className="font-bold text-rose-400 text-xs sm:text-sm">{fc.probabilities?.high}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Environmental Causal Factor */}
                  <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex items-start gap-2 text-xs text-slate-300">
                    <Activity className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-mono block">Primary Hydrological Driver</span>
                      <span className="font-medium text-slate-200 text-xs sm:text-sm">{fc.primary_driver}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Civic Action Protocol */}
              {fc && (
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold mb-2">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>Civic Action Protocol (DPHE / Upazila)</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-200 mb-1">{fc.action_title}</p>
                  <p className="text-slate-400 leading-relaxed text-[11px] sm:text-xs">
                    {fc.recommended_action}
                  </p>
                </div>
              )}

              {/* Climate Stress Simulator Accordion */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden mb-6 lg:mb-0">
                <button
                  onClick={() => setShowSim(!showSim)}
                  className="w-full p-4 flex justify-between items-center text-xs font-bold text-slate-200 hover:bg-slate-800/50 transition"
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
                  <div className="p-4 pt-0 border-t border-slate-800/80 text-xs flex flex-col gap-3">
                    <p className="text-[11px] text-slate-400 mt-2">
                      Simulate upstream Gorai/Padma flow reduction to evaluate estuary saltwater intrusion response:
                    </p>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-300">Hardinge Flow Deficit:</span>
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