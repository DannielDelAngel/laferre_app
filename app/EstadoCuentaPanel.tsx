"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FileText, Upload, Search, X, ChevronRight, ChevronLeft } from "lucide-react";

const EstadoCuentaPanel = ({ supabase: sb, cuenta, esAdmin }: any) => {
  const client = sb || supabase;
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [cargandoCuentas, setCargandoCuentas] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<any>(null);
  const [estadoExistente, setEstadoExistente] = useState<any>(null);
  const [cargandoEstado, setCargandoEstado] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [exitoSubida, setExitoSubida] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [estadoCuenta, setEstadoCuenta] = useState<any>(null);
  const [cargando, setCargando] = useState(false);

  // cuentas
  useEffect(() => {
    if (!esAdmin) return;
    const cargar = async () => {
      setCargandoCuentas(true);
      const { data } = await client
        .from("cuentas")
        .select("id, numero_cuenta, cliente, ferreteria")
        .order("cliente", { ascending: true });
      setCuentas(data || []);
      setCargandoCuentas(false);
    };
    cargar();
  }, []);


  useEffect(() => {
    if (!cuentaSeleccionada) return;
    const cargar = async () => {
      setCargandoEstado(true);
      setEstadoExistente(null);
      setPdfFile(null);
      setErrorMsg("");
      setExitoSubida(false);
      const { data } = await client
        .from("estados_cuenta")
        .select("*")
        .eq("cuenta_id", cuentaSeleccionada.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setEstadoExistente(data || null);
      setCargandoEstado(false);
    };
    cargar();
  }, [cuentaSeleccionada]);

  useEffect(() => {
    if (esAdmin || !cuenta?.id) return;
    const cargar = async () => {
      setCargando(true);
      const { data } = await client
        .from("estados_cuenta")
        .select("*")
        .eq("cuenta_id", cuenta.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setEstadoCuenta(data || null);
      setCargando(false);
    };
    cargar();
  }, [cuenta]);

  const cuentasFiltradas = cuentas.filter((c) => {
    const q = busqueda.toLowerCase();
    return (
      (c.cliente || "").toLowerCase().includes(q) ||
      (c.ferreteria || "").toLowerCase().includes(q) ||
      (c.numero_cuenta || "").toLowerCase().includes(q)
    );
  });

  const subirPDF = async () => {
    if (!pdfFile || !cuentaSeleccionada) return;
    setSubiendo(true);
    setErrorMsg("");

    // Borrar PDF anterior 
    if (estadoExistente?.pdf_url) {
      try {
        const url = new URL(estadoExistente.pdf_url);
        const pathParts = url.pathname.split("/pedidos-pdf/");
        if (pathParts[1]) {
          await client.storage.from("pedidos-pdf").remove([pathParts[1]]);
        }
      } catch {}
    }

    const nombreArchivo = `estado_cuenta_${cuentaSeleccionada.id}_${Date.now()}.pdf`;

    const { error: uploadError } = await client.storage
      .from("pedidos-pdf")
      .upload(nombreArchivo, pdfFile, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      setErrorMsg("Error al subir el archivo: " + uploadError.message);
      setSubiendo(false);
      return;
    }

    const { data: urlData } = client.storage
      .from("pedidos-pdf")
      .getPublicUrl(nombreArchivo);

    if (estadoExistente?.id) {
      await client.from("estados_cuenta").delete().eq("id", estadoExistente.id);
    }

    const { error: dbError } = await client.from("estados_cuenta").insert({
      cuenta_id: cuentaSeleccionada.id,
      numero_cuenta: cuentaSeleccionada.numero_cuenta,
      pdf_url: urlData.publicUrl,
    });

    if (dbError) {
      setErrorMsg("Error al guardar el registro: " + dbError.message);
      setSubiendo(false);
      return;
    }

    // Refrescar estado existente
    const { data: nuevo } = await client
      .from("estados_cuenta")
      .select("*")
      .eq("cuenta_id", cuentaSeleccionada.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setEstadoExistente(nuevo || null);
    setSubiendo(false);
    setExitoSubida(true);
    setPdfFile(null);
    setTimeout(() => setExitoSubida(false), 3000);
  };

  // vista admin
  if (esAdmin) {

    if (cuentaSeleccionada) {
      return (
        <div className="-mx-10 px-4 pb-32">
          <button
            onClick={() => { setCuentaSeleccionada(null); setEstadoExistente(null); setPdfFile(null); setErrorMsg(""); setExitoSubida(false); }}
            className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 mb-5 transition"
          >
            <ChevronLeft size={16} /> Regresar
          </button>

          <div className="mb-5">
            <p className="text-lg font-bold text-zinc-900">{cuentaSeleccionada.cliente || cuentaSeleccionada.ferreteria}</p>
            <p className="text-sm text-zinc-400">{cuentaSeleccionada.numero_cuenta}</p>
          </div>

          {exitoSubida && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-semibold">
              ✓ PDF subido correctamente
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {cargandoEstado ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-7 w-7 border-4 border-orange-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* PDF existente */}
              {estadoExistente ? (
                <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">PDF actual</p>
                  <p className="text-xs text-zinc-400 mb-3">
                    Subido el{" "}
                    {new Date(estadoExistente.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                    {" · "}
                    {new Date(estadoExistente.created_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <a
                    href={estadoExistente.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 font-semibold underline"
                  >
                    <FileText size={15} /> Ver PDF actual
                  </a>
                </div>
              ) : (
                <div className="mb-5 bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-center">
                  <FileText size={28} className="mx-auto text-zinc-300 mb-1" />
                  <p className="text-sm text-zinc-400">Este cliente no tiene PDF subido</p>
                </div>
              )}

              {/* Subir o Actualizar PDF */}
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                {estadoExistente ? "Actualizar PDF" : "Subir PDF"}
              </p>

              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-orange-300 rounded-xl cursor-pointer hover:bg-orange-50 transition">
                {pdfFile ? (
                  <div className="text-center px-4">
                    <FileText size={24} className="mx-auto text-orange-500 mb-1" />
                    <p className="text-sm text-zinc-700 font-medium truncate max-w-[220px]">{pdfFile.name}</p>
                    <p className="text-xs text-zinc-400">{(pdfFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload size={24} className="mx-auto text-orange-400 mb-1" />
                    <p className="text-sm text-zinc-500">Toca para seleccionar un PDF</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => { setPdfFile(e.target.files?.[0] || null); setErrorMsg(""); }}
                />
              </label>

              {pdfFile && (
                <button
                  onClick={subirPDF}
                  disabled={subiendo}
                  className="mt-4 w-full py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {subiendo ? (
                    <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Subiendo...</>
                  ) : (
                    <><Upload size={16} /> {estadoExistente ? "Actualizar Estado de Cuenta" : "Subir Estado de Cuenta"}</>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      );
    }

    // Lista de clientes
    return (
      <div className="-mx-10 px-4 pb-32">
        <h2 className="text-xl font-bold text-zinc-900 mb-4">Estado de Cuenta</h2>

        {/* Buscador */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o número de cuenta"
            className="w-full rounded-xl border border-zinc-300 pl-9 pr-9 py-2.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          {busqueda && (
            <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
              <X size={14} />
            </button>
          )}
        </div>

        {cargandoCuentas ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin h-7 w-7 border-4 border-orange-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-2">
            {cuentasFiltradas.map((c) => (
              <button
                key={c.id}
                onClick={() => setCuentaSeleccionada(c)}
                className="w-full flex items-center justify-between bg-white border border-zinc-200 rounded-xl px-4 py-3 hover:bg-orange-50 transition shadow-sm text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-800">{c.cliente || c.ferreteria || "Sin nombre"}</p>
                  <p className="text-xs text-zinc-400">{c.numero_cuenta}</p>
                </div>
                <ChevronRight size={16} className="text-zinc-400 flex-shrink-0" />
              </button>
            ))}

            {cuentasFiltradas.length === 0 && (
              <div className="text-center py-12 bg-zinc-50 rounded-xl border border-zinc-200">
                <p className="text-zinc-400 text-sm">No se encontraron cuentas</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // vista cliente 
  return (
    <div className="-mx-10 px-4 pb-32">
      {cargando ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" />
        </div>
      ) : !estadoCuenta ? (
        <div className="text-center py-16 bg-zinc-50 rounded-xl border border-zinc-200">
          <FileText size={40} className="mx-auto text-zinc-300 mb-2" />
          <p className="text-zinc-400 text-sm">No tienes un estado de cuenta disponible</p>
        </div>
      ) : (
        <div>
          <div className="mb-4 text-center">
            <p className="text-sm font-semibold text-zinc-500">Último estado de cuenta</p>
            <p className="text-xs text-zinc-400 mt-1">
              {new Date(estadoCuenta.created_at).toLocaleDateString("es-MX", {
                day: "2-digit", month: "long", year: "numeric",
              })}{" · "}
              {new Date(estadoCuenta.created_at).toLocaleTimeString("es-MX", {
                hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>

          <div className="w-full rounded-xl overflow-hidden border border-zinc-200 shadow-sm" style={{ height: "75vh" }}>
            <iframe src={estadoCuenta.pdf_url} className="w-full h-full" title="Estado de Cuenta" />
          </div>

          <a
            href={estadoCuenta.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-zinc-300 text-zinc-600 text-sm font-semibold hover:bg-zinc-50 transition"
          >
            <FileText size={16} /> Abrir en nueva pestaña
          </a>
        </div>
      )}
    </div>
  );
};

export default EstadoCuentaPanel;