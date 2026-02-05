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
            <div class="pulse-ring" style="
              position: absolute;
              width: 60px;
              height: 60px;
              border: 3px solid ${color};
              border-radius: 50%;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              animation: pulse 2s ease-out infinite;
              opacity: 0;
            "></div>
            <div style="
              position: relative;
              width: 40px;
              height: 40px;
              background: ${color};
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M18 18.5C18.83 18.5 19.5 17.83 19.5 17C19.5 16.17 18.83 15.5 18 15.5C17.17 15.5 16.5 16.17 16.5 17C16.5 17.83 17.17 18.5 18 18.5M19.5 9.5H17V12H21.46L19.5 9.5M6 18.5C6.83 18.5 7.5 17.83 7.5 17C7.5 16.17 6.83 15.5 6 15.5C5.17 15.5 4.5 16.17 4.5 17C4.5 17.83 5.17 18.5 6 18.5M20 8L23 12V17H21C21 18.66 19.66 20 18 20C16.34 20 15 18.66 15 17H9C9 18.66 7.66 20 6 20C4.34 20 3 18.66 3 17H1V6C1 4.89 1.89 4 3 4H17V8H20Z"/>
              </svg>
            </div>
            <style>
              @keyframes pulse {
                0% {
                  transform: translate(-50%, -50%) scale(0.5);
                  opacity: 0.8;
                }
                100% {
                  transform: translate(-50%, -50%) scale(1.5);
                  opacity: 0;
                }
              }
            </style>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
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