"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// FIX iconos en Next.js
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

interface Props {
  lat: number;
  lng: number;
  nombreLocal?: string;
}

export default function MapaUbicacion({ lat, lng, nombreLocal }: Props) {
  const posicion: [number, number] = [lat, lng];

  return (
    <div className="relative z-0 h-64 w-full rounded-xl overflow-hidden border border-zinc-300 my-3">

      <MapContainer
  center={posicion}
  zoom={16}
  scrollWheelZoom={false}
  style={{
    height: "100%",
    width: "100%",
    zIndex: 0,
  }}
>

        <TileLayer
          attribution="© OpenStreetMap"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={posicion}>
          <Popup>📍 {nombreLocal || "Ubicación del local"}</Popup>
        </Marker>
      </MapContainer>

      <div className="text-xs text-center p-2 bg-zinc-50">
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
          target="_blank"
          className="text-blue-600 font-semibold"
        >
          Abrir en Google Maps ↗
        </a>
      </div>
    </div>
  );
}
