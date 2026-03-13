"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { Search, X, Edit2, CheckCircle, Package, ChevronDown, ChevronUp } from "lucide-react";

interface ItemInventario {
  id: number;
  TITULO: string;
  CODIGO: string;
  IMAGEN: string;
  cantidad: number;
}

interface InventarioGuardado {
  id: number;
  numero_cuenta: string;
  nombre_usuario: string;
  lista_productos: string;
  created_at: string;
}

const STORAGE_KEY = (numeroCuenta: string) => `inventario_progreso_${numeroCuenta}`;

const InventarioPanel = ({ supabase: sb, cuenta, esAdmin }: any) => {
  const client = sb || supabase;

  const [codigoInput, setCodigoInput] = useState("");
  const [cantidadInput, setCantidadInput] = useState("");
  const [productoEncontrado, setProductoEncontrado] = useState<any>(null);
  const [esperandoCantidad, setEsperandoCantidad] = useState(false);
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [cantidadEditar, setCantidadEditar] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [exito, setExito] = useState(false);

  const [vistaAdmin, setVistaAdmin] = useState<"inventario" | "historial">("inventario");
  const [historial, setHistorial] = useState<InventarioGuardado[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [expandidoId, setExpandidoId] = useState<number | null>(null);

  // Scanner físico
  const [bufferEscaneo, setBufferEscaneo] = useState("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cantidadRef = useRef<HTMLInputElement>(null);
  const codigoRef = useRef<HTMLInputElement>(null);

  // Cargar progreso desde localStorage al montar
  useEffect(() => {
    if (!cuenta?.numero_cuenta) return;
    const guardado = localStorage.getItem(STORAGE_KEY(cuenta.numero_cuenta));
    if (guardado) {
      try {
        const parsed = JSON.parse(guardado);
        setItems(parsed);
      } catch {}
    }
  }, [cuenta]);

  // Función específica para cuando escanea físicamente
const escanearProducto = async (codigo: string) => {
  if (!codigo.trim()) return;
  setError("");

  const { data } = await client
    .from("productos")
    .select("id, TITULO, CODIGO, IMAGEN")
    .or(`CODIGO.eq.${codigo.trim()},C_PRODUCTO.eq.${codigo.trim()}`)
    .single();

  if (!data) {
    setError(`No se encontró: ${codigo.trim()}`);
    return;
  }
// Si ya existe el producto en la lista, suma 1 a la cantidad
  setItems((prev) => {
    const existente = prev.find((i) => i.id === data.id);
    if (existente) {
      return prev.map((i) => i.id === data.id ? { ...i, cantidad: i.cantidad + 1 } : i);
    }
    return [...prev, { ...data, cantidad: 1 }];
  });
};

  // Guardar progreso en localStorage cada vez que cambia items
  useEffect(() => {
    if (!cuenta?.numero_cuenta) return;
    if (items.length > 0) {
      localStorage.setItem(STORAGE_KEY(cuenta.numero_cuenta), JSON.stringify(items));
    } else {
      localStorage.removeItem(STORAGE_KEY(cuenta.numero_cuenta));
    }
  }, [items, cuenta]);

  // Scanner físico 
  useEffect(() => {
  if (esperandoCantidad) return;

  const handleKeyPress = (e: KeyboardEvent) => {
    if (
      document.activeElement === codigoRef.current ||
      document.activeElement === cantidadRef.current
    ) return;

    if (e.key === "Enter") {
      if (bufferEscaneo.trim()) {
        escanearProducto(bufferEscaneo.trim()); 
        setBufferEscaneo("");
      }
      return;
    }
    setBufferEscaneo((prev) => prev + e.key);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (bufferEscaneo.trim()) {
        escanearProducto(bufferEscaneo.trim()); 
        setBufferEscaneo("");
      }
    }, 100);
  };

  window.addEventListener("keypress", handleKeyPress);
  return () => {
    window.removeEventListener("keypress", handleKeyPress);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };
}, [bufferEscaneo, esperandoCantidad]);

  useEffect(() => {
    if (esperandoCantidad) {
      setTimeout(() => cantidadRef.current?.focus(), 100);
    }
  }, [esperandoCantidad]);

  const buscarProducto = async (codigo: string) => {
  if (!codigo.trim()) return;
  setBuscando(true);
  setError("");
  const { data, error } = await client
    .from("productos")
    .select("id, TITULO, CODIGO, IMAGEN")
    .or(`CODIGO.eq.${codigo.trim()},C_PRODUCTO.eq.${codigo.trim()}`)
    .single();

  setBuscando(false);
  if (error || !data) {
    setError(`No se encontró el código: ${codigo.trim()}`);
    setProductoEncontrado(null);
    return;
  }
  setProductoEncontrado(data);
  setEsperandoCantidad(true);
  setCodigoInput(codigo.trim());
};

  const agregarItem = () => {
    if (!productoEncontrado) return;
    const cant = parseFloat(cantidadInput);
    if (isNaN(cant) || cant <= 0) {
      setError("Ingresa una cantidad válida");
      return;
    }
    const existente = items.find((i) => i.id === productoEncontrado.id);
    if (existente) {
      setItems((prev) =>
        prev.map((i) => i.id === productoEncontrado.id ? { ...i, cantidad: cant } : i)
      );
    } else {
      setItems((prev) => [...prev, { ...productoEncontrado, cantidad: cant }]);
    }
    setCodigoInput("");
    setCantidadInput("");
    setProductoEncontrado(null);
    setEsperandoCantidad(false);
    setError("");
  };

  const handleCodigoKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); buscarProducto(codigoInput); }
  };

  const handleCantidadKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); agregarItem(); }
    if (e.key === "Escape") {
      setEsperandoCantidad(false);
      setProductoEncontrado(null);
      setCantidadInput("");
      setCodigoInput("");
      setError("");
    }
  };

  const guardarEdicion = (id: number) => {
    const cant = parseFloat(cantidadEditar);
    if (isNaN(cant) || cant <= 0) return;
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, cantidad: cant } : i));
    setEditandoId(null);
    setCantidadEditar("");
  };

  const eliminarItem = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const generarString = () => items.map((i) => `${i.CODIGO}*${i.cantidad}`).join("-");

  const confirmarInventario = async () => {
    if (items.length === 0) return;
    setConfirmando(true);

    // Actualizar existencias
    const actualizaciones = items.map((item) =>
      client.from("productos").update({ existencia: item.cantidad }).eq("id", item.id)
    );
    const resultados = await Promise.all(actualizaciones);
    const hayError = resultados.some((r: any) => r.error);
    if (hayError) {
      setError("Error al actualizar algunas existencias");
      setConfirmando(false);
      return;
    }

    // Guardar registro
    const { error } = await client.from("inventarios").insert({
      cuenta_id: cuenta?.id,
      numero_cuenta: cuenta?.numero_cuenta,
      nombre_usuario: cuenta?.cliente || cuenta?.ferreteria || cuenta?.numero_cuenta,
      lista_productos: generarString(),
    });

    setConfirmando(false);
    if (error) { setError("Error al guardar el inventario"); return; }

    // Limpiar localStorage
    localStorage.removeItem(STORAGE_KEY(cuenta.numero_cuenta));
    setExito(true);
    setItems([]);
    setTimeout(() => setExito(false), 3000);
  };

  const cargarHistorial = async () => {
    setCargandoHistorial(true);
    const { data } = await client
      .from("inventarios")
      .select("*")
      .order("created_at", { ascending: false });
    setHistorial(data || []);
    setCargandoHistorial(false);
  };

  useEffect(() => {
    if (vistaAdmin === "historial" && esAdmin) cargarHistorial();
  }, [vistaAdmin]);

  const parsearLista = (lista: string) =>
  lista.split("-").map((item) => {
    const [codigo, cantidad] = item.split("*");
    return { codigo, cantidad };
  });

  return (
    <div className="px-4 pb-32">
      <h2 className="text-xl font-bold text-zinc-900 mb-4">Inventario</h2>

      {esAdmin && (
        <div className="flex gap-2 mb-5 bg-zinc-100 rounded-xl p-1">
          <button
            onClick={() => setVistaAdmin("inventario")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
              vistaAdmin === "inventario" ? "bg-white text-orange-500 shadow" : "text-zinc-500"
            }`}
          >
            Hacer Inventario
          </button>
          <button
            onClick={() => setVistaAdmin("historial")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
              vistaAdmin === "historial" ? "bg-white text-orange-500 shadow" : "text-zinc-500"
            }`}
          >
            Historial
          </button>
        </div>
      )}

      {vistaAdmin === "inventario" && (
        <>
          {/* Progreso guardado banner */}
          {items.length > 0 && !esperandoCantidad && (
            <div className="mb-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 flex items-center justify-between">
              <p className="text-xs text-blue-700 font-medium">
                Progreso guardado — {items.length} producto(s)
              </p>
              <button
                onClick={() => { setItems([]); localStorage.removeItem(STORAGE_KEY(cuenta?.numero_cuenta)); }}
                className="text-xs text-blue-400 hover:text-blue-600 underline"
              >
                Limpiar
              </button>
            </div>
          )}

          {/* Input código manual */}
          {!esperandoCantidad && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wide">
                Código de producto
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                <input
                  ref={codigoRef}
                  type="text"
                  value={codigoInput}
                  onChange={(e) => { setCodigoInput(e.target.value); setError(""); }}
                  onKeyDown={handleCodigoKeyDown}
                  placeholder="Escanea o ingresa código"
                  className="w-full rounded-xl border text-zinc-700 border-zinc-300 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              {buscando && <p className="text-xs text-zinc-400 mt-1">Buscando...</p>}
              <p className="text-xs text-zinc-400 mt-1">
                El escáner físico también funciona automáticamente
              </p>
            </div>
          )}

          {/* Input cantidad */}
          {esperandoCantidad && productoEncontrado && (
            <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white border border-zinc-200 flex-shrink-0">
                  {productoEncontrado.IMAGEN ? (
                    <Image src={productoEncontrado.IMAGEN} alt={productoEncontrado.TITULO} fill className="object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={20} className="text-zinc-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-900 text-sm truncate">{productoEncontrado.TITULO}</p>
                  <p className="text-xs text-zinc-500">{productoEncontrado.CODIGO}</p>
                </div>
              </div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wide">
                Cantidad encontrada
              </label>
              <div className="flex gap-2">
                <input
                  ref={cantidadRef}
                  type="number"
                  value={cantidadInput}
                  onChange={(e) => { setCantidadInput(e.target.value); setError(""); }}
                  onKeyDown={handleCantidadKeyDown}
                  placeholder="Cantidad"
                  className="flex-1 rounded-xl border text-zinc-700 border-orange-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <button onClick={agregarItem} className="px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold">✓</button>
                <button
                  onClick={() => {
                    setEsperandoCantidad(false);
                    setProductoEncontrado(null);
                    setCantidadInput("");
                    setCodigoInput("");
                    setError("");
                  }}
                  className="px-3 py-2.5 rounded-xl bg-zinc-200 text-zinc-600"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-xs text-zinc-400 mt-1">Esc para cancelar</p>
            </div>
          )}

          {error && (
            <div className="mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {exito && (
            <div className="mb-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <CheckCircle size={18} className="text-green-500" />
              <p className="text-sm text-green-700 font-semibold">Inventario guardado y existencias actualizadas</p>
            </div>
          )}

          {items.length > 0 && (
            <>
              <div className="space-y-2 mb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl p-3 shadow-sm">
                    <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-zinc-100 flex-shrink-0">
                      {item.IMAGEN ? (
                        <Image src={item.IMAGEN} alt={item.TITULO} fill className="object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={16} className="text-zinc-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-800 truncate">{item.TITULO}</p>
                      <p className="text-xs text-zinc-400">{item.CODIGO}</p>
                    </div>
                    {editandoId === item.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={cantidadEditar}
                          onChange={(e) => setCantidadEditar(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") guardarEdicion(item.id);
                            if (e.key === "Escape") { setEditandoId(null); setCantidadEditar(""); }
                          }}
                          autoFocus
                          className="w-20 border border-orange-400 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                        <button onClick={() => guardarEdicion(item.id)} className="text-green-500">
                          <CheckCircle size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditandoId(item.id); setCantidadEditar(String(item.cantidad)); }}
                          className="flex items-center gap-1 bg-zinc-100 hover:bg-zinc-200 rounded-lg px-2.5 py-1 text-sm font-bold text-zinc-700 transition"
                        >
                          {item.cantidad}
                          <Edit2 size={12} className="text-zinc-400" />
                        </button>
                        <button onClick={() => eliminarItem(item.id)} className="text-zinc-300 hover:text-red-400 transition">
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={confirmarInventario}
                disabled={confirmando}
                className={`w-full py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
                  confirmando
                    ? "bg-zinc-300 text-zinc-500 cursor-not-allowed"
                    : "bg-orange-500 text-white hover:bg-orange-600"
                }`}
              >
                {confirmando ? (
                  <>
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Confirmar Inventario ({items.length} productos)
                  </>
                )}
              </button>
            </>
          )}

          {items.length === 0 && !esperandoCantidad && !buscando && (
            <div className="text-center py-12 bg-zinc-50 rounded-xl border border-zinc-200">
              <Package size={40} className="mx-auto text-zinc-300 mb-2" />
              <p className="text-zinc-400 text-sm">Escanea o ingresa un código para comenzar</p>
            </div>
          )}
        </>
      )}

      {vistaAdmin === "historial" && esAdmin && (
        <>
          {cargandoHistorial ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" />
            </div>
          ) : historial.length === 0 ? (
            <div className="text-center py-12 bg-zinc-50 rounded-xl border border-zinc-200">
              <Package size={40} className="mx-auto text-zinc-300 mb-2" />
              <p className="text-zinc-400 text-sm">No hay inventarios registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historial.map((inv) => {
                const expandido = expandidoId === inv.id;
                const productos = parsearLista(inv.lista_productos);
                return (
                  <div key={inv.id} className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                    <button
                      onClick={() => setExpandidoId(expandido ? null : inv.id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition"
                    >
                      <div className="text-left">
                        <p className="font-semibold text-zinc-800 text-sm">
                          {inv.nombre_usuario || inv.numero_cuenta}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {new Date(inv.created_at).toLocaleDateString("es-MX", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}{" "}
                          {new Date(inv.created_at).toLocaleTimeString("es-MX", {
                            hour: "2-digit", minute: "2-digit",
                          })}
                          {" · "}{productos.length} productos
                        </p>
                      </div>
                      {expandido ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
                    </button>
                    {expandido && (
  <div className="px-4 pb-4 border-t border-zinc-100">
    <div className="mt-3 space-y-1">
      {productos.map((p, i) => (
        <div key={i} className="flex justify-between items-center py-1.5 border-b border-zinc-100 last:border-0">
          <span className="text-sm font-mono text-zinc-600">{p.codigo}</span>
          <span className="text-sm font-bold text-zinc-800">× {p.cantidad}</span>
        </div>
      ))}
    </div>
    <div className="mt-3 bg-zinc-50 border border-zinc-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">String de inventario</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(inv.lista_productos);
            const btn = document.getElementById(`copy-btn-${inv.id}`);
            if (btn) { btn.textContent = "¡Copiado!"; setTimeout(() => { btn.textContent = "Copiar"; }, 2000); }
          }}
          id={`copy-btn-${inv.id}`}
          className="text-xs text-orange-500 hover:text-orange-600 font-semibold transition"
        >
          Copiar
        </button>
      </div>
      <p className="text-xs font-mono text-zinc-600 break-all leading-relaxed">
        {inv.lista_productos}
      </p>
    </div>
  </div>
)}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InventarioPanel;