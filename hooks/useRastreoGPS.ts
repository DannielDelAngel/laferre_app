import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface RastreoConfig {
  cuentaId: string;
  nombreRuta: string;
  distanciaMinima?: number; // metros mínimos para actualizar (default: 50m)
  tiempoMinimo?: number; // milisegundos mínimos entre updates (default: 30s)
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
  const registroIdRef = useRef<number | null>(null);

  const DISTANCIA_MINIMA = config.distanciaMinima || 50; // 50 metros
  const TIEMPO_MINIMO = config.tiempoMinimo || 30000; // 30 segundos
  const TIEMPO_HEARTBEAT = 300000; // 5 minutos - actualización forzada aunque no se mueva

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

  // Actualizar ubicación en Supabase
  const actualizarUbicacion = async (
    lat: number,
    lng: number,
    velocidad: number | null,
    precision: number
  ) => {
    try {
      if (!registroIdRef.current) {
        // Crear nuevo registro
        const { data, error } = await supabase
          .from('rastreo_rutas')
          .insert({
            cuenta_id: config.cuentaId,
            nombre_ruta: config.nombreRuta,
            latitud: lat,
            longitud: lng,
            velocidad: velocidad,
            precision_metros: precision,
            en_ruta: true,
          })
          .select('id')
          .single();

        if (error) throw error;
        if (data) registroIdRef.current = data.id;
      } else {
        // Actualizar registro existente
        const { error } = await supabase
          .from('rastreo_rutas')
          .update({
            latitud: lat,
            longitud: lng,
            velocidad: velocidad,
            precision_metros: precision,
            ultima_actualizacion: new Date().toISOString(),
          })
          .eq('id', registroIdRef.current);

        if (error) throw error;
      }

      ultimoUpdateRef.current = Date.now();
      ultimaPosicionRef.current = { lat, lng };
      setUltimaUbicacion({ lat, lng });
    } catch (err: any) {
      console.error('Error actualizando ubicación:', err);
      setError(err.message);
    }
  };

  // Handler de posición
  const handlePosicion = (position: GeolocationPosition) => {
    const { latitude, longitude, speed, accuracy } = position.coords;
    const ahora = Date.now();

    // Condiciones para actualizar:
    let debeActualizar = false;

    // 1. Primera ubicación
    if (!ultimaPosicionRef.current) {
      debeActualizar = true;
    }
    // 2. Han pasado más de 5 minutos (heartbeat)
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
  };

  // Detener rastreo
  const detenerRastreo = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Marcar como fuera de ruta
    if (registroIdRef.current) {
      try {
        await supabase
          .from('rastreo_rutas')
          .update({ en_ruta: false })
          .eq('id', registroIdRef.current);
      } catch (err) {
        console.error('Error al finalizar rastreo:', err);
      }
      registroIdRef.current = null;
    }

    setRastreando(false);
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