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

  if (!entregaMismoDia) {
    return (
      <div className="mb-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg
            className="w-5 h-5 text-orange-600"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="font-semibold text-orange-900">
            Tiempo de entrega
          </span>
        </div>

        <p className="text-sm text-orange-800">
          Tu pedido será entregado de{" "}
          <span className="font-bold">1 a 3 días hábiles</span>
        </p>
      </div>
    );
  }

  const horaLimite = 10; // 10 AM
  const segundosActuales =
    now.getHours() * 3600 +
    now.getMinutes() * 60 +
    now.getSeconds();

  const segundosLimite = horaLimite * 3600;

  return (
    <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <svg
          className="w-5 h-5 text-blue-600"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="font-semibold text-blue-900">
          Entrega el mismo día
        </span>
      </div>

      {segundosActuales < segundosLimite ? (
        (() => {
          const restantes = segundosLimite - segundosActuales;
          const h = Math.floor(restantes / 3600);
          const m = Math.floor((restantes % 3600) / 60);
          const s = restantes % 60;
          const progreso = (segundosActuales / segundosLimite) * 100;

          return (
            <>
              <p className="text-sm text-blue-800 mb-2">
                ¡Ordena en los próximos{" "}
                <span className="font-bold text-blue-600">
                  {String(h).padStart(2, "0")}:
                  {String(m).padStart(2, "0")}:
                  {String(s).padStart(2, "0")}
                </span>{" "}
                para recibir tu pedido hoy!
              </p>

              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(progreso, 100)}%` }}
                />
              </div>
            </>
          );
        })()
      ) : (
        <p className="text-sm text-zinc-600">
          Tu pedido llegará{" "}
          <span className="font-semibold text-blue-600">mañana</span>.
          Ordena antes de las 10 AM para entrega el mismo día.
        </p>
      )}
    </div>
  );
}
