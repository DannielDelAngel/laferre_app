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
      <div className="bg-white/90 backdrop-blur border border-white/40 rounded-xl px-4 py-2 shadow-md max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <svg
            className="w-4 h-4 text-orange-500"
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
          <span className="text-xs font-semibold text-zinc-800">
            Tiempo de entrega
          </span>
        </div>

        <p className="text-xs text-zinc-700">
          Entrega en{" "}
          <span className="font-bold">1 a 3 días hábiles</span>
        </p>
      </div>
    );
  }

 return (
  <div className="bg-white/95 backdrop-blur border border-white/50 rounded-xl px-4 py-2 shadow-lg mx-auto ml-4 mr-4">
    <div className="flex items-center gap-2 mb-1">
      <svg
        className={`w-4 h-4 ${
          segundosActuales < segundosLimite
            ? "text-green-600"
            : "text-orange-500"
        }`}
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

      <span className="text-sm font-bold text-zinc-900">
        {segundosActuales < segundosLimite
          ? "Entrega el mismo día"
          : "Tiempo de entrega"}
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
            <p className="text-xs text-zinc-700 mb-1">
              ¡Ordena en los próximos{" "}
              <span className="font-bold text-green-600">
                {String(h).padStart(2, "0")}:
                {String(m).padStart(2, "0")}:
                {String(s).padStart(2, "0")}
              </span>{" "}
              para recibir tu pedido hoy!
            </p>

            <div className="w-full bg-zinc-200 rounded-full h-1.5">
              <div
                className="bg-green-600 h-1.5 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(progreso, 100)}%` }}
              />
            </div>
          </>
        );
      })()
    ) : (

      <div className="">
      <p className="text-sm text-zinc-600">
          Ordena antes de las{" "}
          <span className="font-semibold text-green-600">10 AM </span>
          para entrega el mismo día.
        </p>
      </div>

    )}
  </div>
);

}
