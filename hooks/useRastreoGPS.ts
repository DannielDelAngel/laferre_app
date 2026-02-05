import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface RastreoConfig {
  cuentaId: string;
  nombreRuta: string;
  distanciaMinima?: number; // metros mínimos para actualizar (default: 10m)
  tiempoMinimo?: number; // milisegundos mínimos entre updates (default: 5s)
  habilitado: boolean;
}

export const useRastreoGPS = (config: RastreoConfig) => {
  const [rastreando, setRastreando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ultimaUbicacion, setUltimaUbicacion] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const ultimaPosicionRef = useRef<{ lat: number; lng: number } | null>(null);
  const ultimoUpdateRef = useRef<number>(0);

  const DISTANCIA_MINIMA = config.distanciaMinima || 10; // 10 metros (más preciso)
  const TIEMPO_MINIMO = config.tiempoMinimo || 5000; // 5 segundos (más tiempo real)
  const TIEMPO_HEARTBEAT = 30000; // 30 segundos - actualización forzada aunque no se mueva

  // Calcular distancia entre dos puntos (fórmula de Haversine)
  const calcularDistancia = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distancia en metros
  };

  // Actualizar ubicación en Supabase con UPSERT
  const actualizarUbicacion = async (
    lat: number,
    lng: number,
    velocidad: number | null,
    precision: number
  ) => {
    try {
      // Usar UPSERT para crear o actualizar basado en cuenta_id
      const { error } = await supabase
        .from('rastreo_rutas')
        .upsert({
          cuenta_id: config.cuentaId,
          nombre_ruta: config.nombreRuta,
          latitud: lat,
          longitud: lng,
          velocidad: velocidad,
          precision_metros: precision,
          en_ruta: true,
          ultima_actualizacion: new Date().toISOString(),
        }, {
          onConflict: 'cuenta_id',
        });

      if (error) throw error;

      ultimoUpdateRef.current = Date.now();
      ultimaPosicionRef.current = { lat, lng };
      setUltimaUbicacion({ lat, lng });
      
      console.log(`📍 Posición guardada - Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`);
    } catch (err: any) {
      console.error('Error actualizando ubicación:', err);
      setError(err.message);
    }
  };

  // Handler de posición
  const handlePosicion = (position: GeolocationPosition) => {
    const { latitude, longitude, speed, accuracy } = position.coords;
    const ahora = Date.now();

    // Actualizar UI siempre (para mostrar movimiento en tiempo real)
    setUltimaUbicacion({ lat: latitude, lng: longitude });

    // Condiciones para actualizar EN LA BASE DE DATOS:
    let debeActualizar = false;

    // 1. Primera ubicación
    if (!ultimaPosicionRef.current) {
      debeActualizar = true;
    }
    // 2. Han pasado más de 30 segundos (heartbeat)
    else if (ahora - ultimoUpdateRef.current > TIEMPO_HEARTBEAT) {
      debeActualizar = true;
    }
    // 3. Movimiento significativo + tiempo mínimo
    else if (ahora - ultimoUpdateRef.current > TIEMPO_MINIMO) {
      const distancia = calcularDistancia(
        ultimaPosicionRef.current.lat,
        ultimaPosicionRef.current.lng,
        latitude,
        longitude
      );

      if (distancia > DISTANCIA_MINIMA) {
        debeActualizar = true;
        console.log(`🚗 Movimiento detectado: ${distancia.toFixed(1)}m`);
      }
    }

    if (debeActualizar) {
      actualizarUbicacion(latitude, longitude, speed, accuracy);
    }
  };

  // Handler de error
  const handleError = (error: GeolocationPositionError) => {
    let mensaje = 'Error de geolocalización';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        mensaje = 'Permiso de ubicación denegado';
        break;
      case error.POSITION_UNAVAILABLE:
        mensaje = 'Ubicación no disponible';
        break;
      case error.TIMEOUT:
        mensaje = 'Tiempo de espera agotado';
        break;
    }
    setError(mensaje);
    setRastreando(false);
    console.error('Error de geolocalización:', mensaje);
  };

  // Iniciar rastreo
  const iniciarRastreo = () => {
    if (!('geolocation' in navigator)) {
      setError('Geolocalización no soportada');
      return;
    }

    const opciones: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosicion,
      handleError,
      opciones
    );

    setRastreando(true);
    setError(null);
    console.log('🎯 Rastreo GPS iniciado');
  };

  // Detener rastreo
  const detenerRastreo = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Marcar como fuera de ruta usando cuenta_id
    if (config.cuentaId) {
      try {
        const { error } = await supabase
          .from('rastreo_rutas')
          .update({ en_ruta: false })
          .eq('cuenta_id', config.cuentaId)
          .eq('en_ruta', true);

        if (error) throw error;
        console.log('🛑 Ruta detenida en BD');
      } catch (err) {
        console.error('Error al finalizar rastreo:', err);
      }
    }

    setRastreando(false);
    setUltimaUbicacion(null);
    ultimaPosicionRef.current = null;
    ultimoUpdateRef.current = 0;
  };

  // Effect para manejar el rastreo según habilitado
  useEffect(() => {
    if (config.habilitado && !rastreando) {
      iniciarRastreo();
    } else if (!config.habilitado && rastreando) {
      detenerRastreo();
    }

    // Cleanup al desmontar
    return () => {
      if (rastreando) {
        detenerRastreo();
      }
    };
  }, [config.habilitado]);

  return {
    rastreando,
    error,
    ultimaUbicacion,
    iniciarRastreo,
    detenerRastreo,
  };
};