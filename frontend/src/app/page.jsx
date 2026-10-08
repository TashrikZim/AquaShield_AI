"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { 
  Droplets, ShieldAlert, Activity, AlertTriangle, 
  Layers, Sliders, CheckCircle2, ChevronRight, BarChart3, Info
} from "lucide-react";
import { STATIONS, MODEL_METRICS } from "@/data/salinityData";

// Dynamic import with SSR disabled to prevent Leaflet hydration errors
const MapComponent = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-400 font-mono text-xs">
      <span className="animate-pulse">Loading coastal GIS geospatial layer...</span>
    </div>
  )
});

export default function Dashboard() {
  const [stations] = useState(STATIONS);
  const [selectedStation, setSelectedStation] = useState(STATIONS[1]); // Default to Shyamnagar
  const [horizon, setHorizon] = useState("30D");
  const [showSim, setShowSim] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  // Climate stress simulator local state
  const [dischargeReduction, setDischargeReduction] = useState(40);
  const [droughtSeverity, setDroughtSeverity] = useState("Severe");

  const fc = selectedStation.forecast[horizon.toLowerCase()];
  const currentMetrics = MODEL_METRICS.horizons[horizon];

  // Dynamic risk calculation for simulator preview
  const getSimulatedRisk = () => {
    if (dischargeReduction > 50 || droughtSeverity === "Extreme") return "High";
    if (dischargeReduction > 25) return "Medium";
    return "Low";
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Top Header */}
      <header className="h-16 shrink-0 border-b border-slate-800 bg-slate-900/90 px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Droplets className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white leading-none">AquaShield AI</h1>
              <span className="bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full">
                Hack for Humanity 2026
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Predictive Coastal Salinity Decision Support (Southwest Bangladesh)</p>
          </div>
        </div>

        {/* Horizon Toggle & Modal Triggers */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowValidation(!showValidation)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
            Validation Benchmarks
          </button>

          <div className="flex items-center bg-slate-800/80 rounded-lg p-1 border border-slate-700">
            {["30D", "60D", "90D"].map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  horizon === h 
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-sm" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {h} Horizon
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Map Section (65%) */}
        <div className="w-[65%] h-full relative">
          <MapComponent
            stations={stations}
            selectedStation={selectedStation}
            onSelectStation={setSelectedStation}
            horizon={horizon}
          />

          {/* Map Overlay Badge */}
          <div className="absolute top-4 left-4 z-[400] bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg px-3 py-2 text-xs shadow-xl">
            <p className="font-semibold text-slate-200">Pilot Estuary Monitoring Zone</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Click station pin to inspect predictive drivers</p>
            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-slate-800 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Low (&lt;1500)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Med (1500-3000)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> High (&gt;3000)</span>
            </div>
          </div>
        </div>

        {/* Right Intelligence Sidebar (35%) */}
        <div className="w-[35%] h-full overflow-y-auto p-6 bg-slate-900/70 border-l border-slate-800 flex flex-col gap-4">
          {/* Station Details Header */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                  Station ID: {selectedStation.station_id}
                </span>
                <h2 className="text-xl font-bold mt-1.5 text-white">{selectedStation.station_name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedStation.upazila}, {selectedStation.district} • {selectedStation.river}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Coast Proximity</span>
                <span className="text-xs font-bold text-slate-200">{selectedStation.sea_distance_km} km to Sea</span>
              </div>
            </div>

            {/* Current River Baseline Gauges */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-800 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 text-[10px] uppercase font-mono block">Current River EC</span>
                <span className="text-sm font-bold text-slate-200">
                  {selectedStation.current_ec.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">µmho/cm</span>
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 text-[10px] uppercase font-mono block">Chloride Concentration</span>
                <span className="text-sm font-bold text-slate-200">
                  {selectedStation.current_chloride.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">PPM</span>
                </span>
              </div>
            </div>
          </div>

          {/* Calibrated Predictive Risk Card */}
          <div className={`p-4 rounded-xl border transition-all ${
            fc.risk_level === "High"
              ? "bg-rose-950/20 border-rose-800/60 text-rose-200"
              : fc.risk_level === "Medium"
              ? "bg-amber-950/20 border-amber-800/60 text-amber-200"
              : "bg-emerald-950/20 border-emerald-800/60 text-emerald-200"
          }`}>
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Forecast Lead Time: {horizon} ({fc.lead_days} Days)
                </span>
                <span className="text-lg font-bold text-white mt-0.5 block">
                  {fc.risk_level} Salinity Intrusion Risk
                </span>
              </div>
              <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                fc.risk_level === "High" 
                  ? "bg-rose-500 text-white border-rose-400" 
                  : fc.risk_level === "Medium" 
                  ? "bg-amber-500 text-slate-950 border-amber-400" 
                  : "bg-emerald-500 text-white border-emerald-400"
              }`}>
                {fc.risk_level} Risk
              </span>
            </div>

            {/* Probability Distribution */}
            <div className="mt-4">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1.5 font-mono">
                <span>Model Confidence</span>
                <span>Calibrated (T-Scaled)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Safe (&lt;1.5k)</span>
                  <span className="font-bold text-emerald-400">{fc.probabilities.low}%</span>
                </div>
                <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Warning (1.5-3k)</span>
                  <span className="font-bold text-amber-400">{fc.probabilities.medium}%</span>
                </div>
                <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Hazard (&gt;3k)</span>
                  <span className="font-bold text-rose-400">{fc.probabilities.high}%</span>
                </div>
              </div>
            </div>

            {/* Primary Causal Driver */}
            <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex items-start gap-2 text-xs text-slate-300">
              <Activity className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-mono block">Primary Hydrological Driver</span>
                <span className="font-medium text-slate-200">{fc.primary_driver}</span>
              </div>
            </div>
          </div>

          {/* Civic Action Protocol */}
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-cyan-400 font-bold mb-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>Civic Action Protocol (DPHE / Upazila)</span>
            </div>
            <p className="text-sm font-semibold text-slate-200 mb-1">{fc.action_title}</p>
            <p className="text-slate-400 leading-relaxed text-xs">
              {fc.recommended_action}
            </p>
          </div>

          {/* Climate Stress Scenario Simulator Toggle */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <button
              onClick={() => setShowSim(!showSim)}
              className="w-full p-4 flex justify-between items-center text-xs font-bold text-slate-200 hover:bg-slate-800/50 transition"
            >
              <span className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-cyan-400" />
                Scenario Stress Simulator (Upstream Shock)
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">
                {showSim ? "Hide" : "Open Simulator"}
              </span>
            </button>

            {showSim && (
              <div className="p-4 pt-0 border-t border-slate-800/80 text-xs flex flex-col gap-3">
                <p className="text-[11px] text-slate-400">
                  Simulate upstream Gorai/Padma river discharge shock to test estuarine saltwater intrusion:
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
        </div>
      </div>

      {/* Validation Benchmarks Modal */}
      {showValidation && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Model Validation & Baseline Benchmarks</h3>
                <p className="text-xs text-slate-400">Temporal Out-of-Time Test Set (2023–2024)</p>
              </div>
              <button 
                onClick={() => setShowValidation(false)}
                className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1 rounded bg-slate-800"
              >
                Close ✕
              </button>
            </div>

            <div className="mt-4 text-xs">
              <p className="text-slate-300 leading-relaxed mb-4">
                In strict temporal evaluation, AquaShield AI demonstrates that coastal salinity requires non-linear machine learning, as persistence-based river monitoring collapses over extended lead times:
              </p>

              <div className="overflow-hidden rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase">
                      <th className="p-3">Forecast Horizon</th>
                      <th className="p-3">AquaShield AI (Acc)</th>
                      <th className="p-3">Macro F1</th>
                      <th className="p-3">Persistence Baseline</th>
                      <th className="p-3">Calendar Baseline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200 font-mono text-xs">
                    <tr>
                      <td className="p-3 font-sans font-semibold text-cyan-400">30 Days (T+28d)</td>
                      <td className="p-3 font-bold text-emerald-400">95.3%</td>
                      <td className="p-3">0.845</td>
                      <td className="p-3 text-slate-400">77.0%</td>
                      <td className="p-3 text-slate-400">87.0%</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-sans font-semibold text-cyan-400">60 Days (T+56d)</td>
                      <td className="p-3 font-bold text-emerald-400">93.8%</td>
                      <td className="p-3">0.790</td>
                      <td className="p-3 text-slate-400">62.8%</td>
                      <td className="p-3 text-slate-400">86.5%</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-sans font-semibold text-cyan-400">90 Days (T+91d)</td>
                      <td className="p-3 font-bold text-emerald-400">92.7%</td>
                      <td className="p-3">0.720</td>
                      <td className="p-3 text-rose-400 font-bold">44.3% (Fails)</td>
                      <td className="p-3 text-slate-400">86.8%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-[11px] text-cyan-300 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <b>Why Persistence Collapses at 90 Days:</b> Seasonal estuarine tipping points cause rapid saline intrusion that cannot be extrapolated from immediate river conditions without accounting for upstream discharge recession.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}