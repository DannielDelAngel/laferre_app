"use client";

import { useEffect, useState } from "react";

export default function ContadorEntrega() {
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

  if (segundosActuales >= segundosLimite) {
    return (
      <p className="text-sm text-zinc-600">
        Tu pedido llegará{" "}
        <span className="font-semibold text-blue-600">mañana</span>. Ordena
        antes de las 10 AM para entrega el mismo día.
      </p>
    );
  }

  const restantes = segundosLimite - segundosActuales;

  const h = Math.floor(restantes / 3600);
  const m = Math.floor((restantes % 3600) / 60);
  const s = restantes % 60;

  const progreso = (segundosActuales / segundosLimite) * 100;

  return (
    <div>
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
    </div>
  );
}
