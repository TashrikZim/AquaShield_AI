"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L, { LatLngTuple } from "leaflet";

import { Station } from "@/data/salinityData";
import { ForecastHorizon, RiskLevel } from "@/lib/hydrology";

interface MapProps {
  stations: Station[];
  selectedStation: Station | null;
  onSelectStation: (st: Station) => void;
  horizon: ForecastHorizon;
}

function MapRecenter({ center }: { center: LatLngTuple }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 9, { duration: 1.2 });
    }
  }, [center, map]);
  return null;
}

function ResizeObserverHelper() {
  const map = useMap();
  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => map.invalidateSize(), 200);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [map]);
  return null;
}

const createPinIcon = (riskLevel: RiskLevel) => {
  const color = riskLevel === "High" ? "#ef4444" : riskLevel === "Medium" ? "#f59e0b" : "#10b981";
  return L.divIcon({
    className: "custom-marker-pin",
    html: `
      <div style="background-color: ${color}; width: 22px; height: 22px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 10px rgba(0,0,0,0.6);"></div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
};

export default function Map({ stations, selectedStation, onSelectStation, horizon }: MapProps) {
  const defaultCenter: LatLngTuple = [22.45, 89.45];
  const activeCenter: LatLngTuple = selectedStation 
    ? [selectedStation.latitude, selectedStation.longitude] 
    : defaultCenter;

  return (
    <div className="w-full h-full min-h-[350px] relative">
      <MapContainer 
        center={defaultCenter} 
        zoom={9} 
        scrollWheelZoom={false}
        touchZoom={true}
        style={{ height: "100%", width: "100%", minHeight: "350px" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ResizeObserverHelper />
        <MapRecenter center={activeCenter} />

        {stations.map((st) => {
          const fc = st.forecast[horizon.toLowerCase()];
          const risk: RiskLevel = fc ? fc.risk_level : "Low";

          return (
            <Marker
              key={st.station_id}
              position={[st.latitude, st.longitude]}
              icon={createPinIcon(risk)}
              eventHandlers={{
                click: () => onSelectStation(st),
              }}
            >
              <Popup>
                <div className="p-1 font-sans text-xs text-slate-900">
                  <p className="font-bold text-sm">{st.station_name}</p>
                  <p className="text-slate-600">{st.river} • {st.upazila}</p>
                  <p className="mt-1 font-semibold">
                    {horizon} Status: <span style={{ color: risk === "High" ? "#dc2626" : risk === "Medium" ? "#d97706" : "#16a34a" }}>{risk} Risk</span>
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}