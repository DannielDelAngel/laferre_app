'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface UbicacionRuta {
  id: number;
  cuenta_id: string;
  nombre_ruta: string;
  latitud: number;
  longitud: number;
  velocidad: number | null;
  precision_metros: number;
  ultima_actualizacion: string;
  en_ruta: boolean;
}

interface MapaRastreoProps {
  ubicaciones: UbicacionRuta[];
}

const MapaRastreo = ({ ubicaciones }: MapaRastreoProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Inicializar mapa solo una vez
    if (!mapRef.current) {
      // Centro de Monterrey, México
      const center: [number, number] = [25.6866, -100.3161];

      mapRef.current = L.map(containerRef.current).setView(center, 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    return () => {
      // Cleanup al desmontar
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Limpiar marcadores existentes
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (ubicaciones.length === 0) return;

    // Crear icono personalizado
    const createCustomIcon = (color: string) => {
      return L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="position: relative;">
            <div style="
              width: 40px;
              height: 40px;
              background: ${color};
              border: 3px solid white;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              box-shadow: 0 3px 10px rgba(0,0,0,0.3);
            "></div>
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -60%) rotate(45deg);
              width: 12px;
              height: 12px;
              background: white;
              border-radius: 50%;
            "></div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
      });
    };

    // Colores para diferentes rutas
    const colors = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];

    // Agregar marcadores
    const bounds = L.latLngBounds([]);

    ubicaciones.forEach((ubi, index) => {
      const color = colors[index % colors.length];
      const icon = createCustomIcon(color);

      const marker = L.marker([ubi.latitud, ubi.longitud], { icon })
        .addTo(mapRef.current!)
        .bindPopup(
          `
          <div style="min-width: 200px;">
            <h3 style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #18181b;">
              ${ubi.nombre_ruta}
            </h3>
            <div style="font-size: 14px; color: #52525b; line-height: 1.6;">
              <p><strong>Cuenta:</strong> ${ubi.cuenta_id}</p>
              ${
                ubi.velocidad !== null
                  ? `<p><strong>Velocidad:</strong> ${(ubi.velocidad * 3.6).toFixed(1)} km/h</p>`
                  : ''
              }
              <p><strong>Precisión:</strong> ±${ubi.precision_metros.toFixed(0)}m</p>
              <p style="font-size: 12px; color: #71717a; margin-top: 8px;">
                ${new Date(ubi.ultima_actualizacion).toLocaleString('es-MX')}
              </p>
            </div>
          </div>
        `,
          {
            maxWidth: 250,
          }
        );

      markersRef.current.push(marker);
      bounds.extend([ubi.latitud, ubi.longitud]);
    });

    // Ajustar vista para mostrar todos los marcadores
    if (ubicaciones.length > 0) {
      mapRef.current.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 15,
      });
    }
  }, [ubicaciones]);

  return (
    <div
      ref={containerRef}
      className="h-[400px] md:h-[600px] rounded-xl overflow-hidden shadow-lg border-2 border-zinc-200"
    />
  );
};

export default MapaRastreo;