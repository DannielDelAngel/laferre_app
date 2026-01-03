"use client";

import { useEffect, useState } from "react";

type Props = {
  entregaMismoDia?: boolean;
};

export default function ContadorEntrega({ entregaMismoDia }: Props) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const horaLimite = 10; // 10 AM 
  const segundosActuales =
    now.getHours() * 3600 +
    now.getMinutes() * 60 +
    now.getSeconds();

  const segundosLimite = horaLimite * 3600;

  if (!entregaMismoDia) {
    return (
      <div className="w-full px-3"> 
        <div className="bg-white/90 backdrop-blur border border-white/40 rounded-xl px-4 py-2 shadow-md mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-zinc-800">
              Tiempo de entrega: 
            </span>
          </div>

          <p className="text-xs text-zinc-700">
            Realiza tu pedido y recibeloen un plazo de {" "}
            <span className="font-bold">1 a 3 días hábiles.</span>
          </p>
        </div>
      </div>
    );
  }

return (
  <div className="w-full px-3">
    <div className="bg-white/90 backdrop-blur border border-white/40 rounded-lg px-3 py-2 shadow-md">
      {segundosActuales < segundosLimite ? (
        (() => {
          const restantes = segundosLimite - segundosActuales;
          const h = Math.floor(restantes / 3600);
          const m = Math.floor((restantes % 3600) / 60);
          const s = restantes % 60;
          const progreso = (segundosActuales / segundosLimite) * 100;

          return (
            <>
              <p className="text-xs sm:text-sm text-zinc-700 mb-1 leading-tight">
                <span className="font-bold text-zinc-900">
      Tiempo de entrega:
    </span>{" "}
                ¡Realiza tu pedido dentro de las proximas{" "}
                <span className="font-bold text-green-600">
                  {String(h).padStart(2, "0")}:
                  {String(m).padStart(2, "0")}:
                  {String(s).padStart(2, "0")}
                </span>
                 {" "}horas y recibibelo hoy mismo.
              </p>

              <div className="w-full bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-green-600 h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(progreso, 100)}%` }}
                />
              </div>
            </>
          );
        })()
      ) : (
        <p className="text-xs sm:text-sm text-zinc-700 mb-1 leading-tight">
                <span className="font-bold text-zinc-900">
      Tiempo de entrega:
    </span>{" "}
                Realiza tu pedido antes de las <span className="font-bold text-green-600">
                10 a.m.
                </span> y recibelo el mismo dia.
              </p>
      )}
    </div>
  </div>
);

}
