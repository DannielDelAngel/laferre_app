import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, RefreshCw, Users, Navigation } from 'lucide-react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';

const MapaRastreo = dynamic(() => import('./MapaRastreo'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] bg-zinc-100 flex items-center justify-center rounded-xl">
      <div className="text-center">
        <div className="animate-spin h-12 w-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-zinc-600">Cargando mapa...</p>
      </div>
    </div>
  ),
});

interface BackBtnProps {
  onBack: () => void;
}

const BackBtn = ({ onBack }: BackBtnProps) => (
  <button
    onClick={onBack}
    className="mb-4 flex items-center gap-2 text-orange-500 hover:text-orange-600 font-semibold"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="w-5 h-5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
    Volver
  </button>
);

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

const VistaRastreoRutas = ({ setVistaPerfil }: any) => {
  const [ubicaciones, setUbicaciones] = useState<UbicacionRuta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date>(new Date());

  const cargarUbicaciones = async () => {
    try {
      // Obtener la última ubicación de cada ruta activa
      const { data, error } = await supabase
        .from('rastreo_rutas')
        .select('*')
        .eq('en_ruta', true)
        .order('ultima_actualizacion', { ascending: false });

      if (error) throw error;

      // Filtrar para obtener solo la última ubicación de cada cuenta
      const ubicacionesUnicas = data?.reduce((acc: UbicacionRuta[], curr: UbicacionRuta) => {
        if (!acc.find((u) => u.cuenta_id === curr.cuenta_id)) {
          acc.push(curr);
        }
        return acc;
      }, []) || [];

      setUbicaciones(ubicacionesUnicas);
      setUltimaActualizacion(new Date());
    } catch (error) {
      console.error('Error cargando ubicaciones:', error);
    } finally {
      setCargando(false);
    }
  };

useEffect(() => {
    cargarUbicaciones();

    // Suscripción a cambios en tiempo real
    const channel = supabase
      .channel('rastreo-cambios')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rastreo_rutas',
          filter: 'en_ruta=eq.true'
        },
        (payload) => {
          console.log('Cambio detectado:', payload);
          
          if (payload.eventType === 'DELETE' || 
              (payload.eventType === 'UPDATE' && !payload.new.en_ruta)) {
            // Remover de la lista
            setUbicaciones(prev => 
              prev.filter(u => u.id !== payload.old.id)
            );
          } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const nuevaUbi = payload.new as UbicacionRuta;
            
            // Actualizar o agregar
            setUbicaciones(prev => {
              const index = prev.findIndex(u => u.cuenta_id === nuevaUbi.cuenta_id);
              if (index >= 0) {
                const updated = [...prev];
                updated[index] = nuevaUbi;
                return updated;
              } else {
                return [...prev, nuevaUbi];
              }
            });
          }
          
          setUltimaActualizacion(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatearTiempo = (timestamp: string) => {
    const fecha = new Date(timestamp);
    const ahora = new Date();
    const diff = ahora.getTime() - fecha.getTime();
    const minutos = Math.floor(diff / 60000);

    if (minutos < 1) return 'Hace menos de 1 min';
    if (minutos < 60) return `Hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    return `Hace ${horas}h ${minutos % 60}min`;
  };

  return (
    <motion.div
      key="rastreo-rutas"
      className="min-h-screen pb-20"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
    >
      <div className="px-6 py-6">
        <BackBtn onBack={() => setVistaPerfil('menu')} />

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-zinc-900">Rastreo de Rutas</h2>
          
          <button
            onClick={() => cargarUbicaciones()}
            className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
          >
            <RefreshCw size={20} className={cargando ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Users size={18} className="text-orange-500" />
              <span className="text-xs text-zinc-600">Rutas activas</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900">{ubicaciones.length}</p>
          </div>
        </div>

        {/* Última actualización */}
        <p className="text-xs text-zinc-500 text-center mb-4">
          Última actualización: {ultimaActualizacion.toLocaleTimeString('es-MX')}
        </p>

        {/* Mapa */}
        {cargando ? (
          <div className="h-[400px] bg-zinc-100 flex items-center justify-center rounded-xl">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-zinc-600">Cargando ubicaciones...</p>
            </div>
          </div>
        ) : ubicaciones.length === 0 ? (
          <div className="h-[400px] bg-zinc-50 border-2 border-dashed border-zinc-300 flex items-center justify-center rounded-xl">
            <div className="text-center">
              <MapPin size={48} className="text-zinc-400 mx-auto mb-3" />
              <p className="text-zinc-600 font-semibold">No hay rutas activas</p>
              <p className="text-sm text-zinc-500 mt-1">
                Las rutas aparecerán aquí cuando inicien su recorrido
              </p>
            </div>
          </div>
        ) : (
          <MapaRastreo ubicaciones={ubicaciones} />
        )}

        {/* Lista de rutas */}
        {ubicaciones.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-bold text-zinc-900 mb-3">Rutas Activas</h3>
            <div className="space-y-3">
              {ubicaciones.map((ubi) => (
                <motion.div
                  key={ubi.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <Navigation size={20} className="text-orange-600" />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900">{ubi.nombre_ruta}</p>
                        <p className="text-xs text-zinc-500">{ubi.cuenta_id}</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                      En ruta
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-zinc-600">Latitud:</span>
                      <p className="font-mono text-zinc-900">{ubi.latitud.toFixed(6)}</p>
                    </div>
                    <div>
                      <span className="text-zinc-600">Longitud:</span>
                      <p className="font-mono text-zinc-900">{ubi.longitud.toFixed(6)}</p>
                    </div>
                    {ubi.velocidad !== null && (
                      <div>
                        <span className="text-zinc-600">Velocidad:</span>
                        <p className="font-semibold text-zinc-900">
                          {(ubi.velocidad * 3.6).toFixed(1)} km/h
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-zinc-600">Precisión:</span>
                      <p className="font-semibold text-zinc-900">±{ubi.precision_metros.toFixed(0)}m</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-zinc-200">
                    <p className="text-xs text-zinc-500">
                      {formatearTiempo(ubi.ultima_actualizacion)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default VistaRastreoRutas;