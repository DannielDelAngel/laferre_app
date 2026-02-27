"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Plus,
  Trash2,
  Edit2,
  X,
  Search,
  Check,
  PackagePlus,
  FolderOpen,
  Layers,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";


interface Subcategoria {
  id_categoria: number;
  nombre_categoria: string;
  img?: string;
}

interface Grupo {
  id: number;
  nombre: string;
  subcategoria_id: number;
  orden: number;
  _total?: number;
  imagen?: string;  
}

interface Producto {
  id: number;
  TITULO: string;
  CODIGO: string;
  IMAGEN?: string;
  CATEGORIA_ID?: number;
}

const BackBtn = ({ onBack }: { onBack: () => void }) => (
  <button
    onClick={onBack}
    className="flex items-center gap-1 text-zinc-500 hover:text-zinc-800 mb-5 text-sm font-medium transition"
  >
    <ChevronLeft size={18} />
    Volver
  </button>
);

export default function GestionarGruposView({
  setVistaPerfil,
}: {
  setVistaPerfil: (v: string) => void;
}) {
  const [pantalla, setPantalla] = useState<"subcategorias" | "grupos" | "productos">(
    "subcategorias"
  );

  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [subcatSeleccionada, setSubcatSeleccionada] = useState<Subcategoria | null>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<Grupo | null>(null);
  const [productosGrupo, setProductosGrupo] = useState<Producto[]>([]);
  const [todosProductos, setTodosProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [nombreGrupo, setNombreGrupo] = useState("");
  const [ordenGrupo, setOrdenGrupo] = useState("0");
  const [editandoGrupo, setEditandoGrupo] = useState<Grupo | null>(null);
  const [mostrarFormGrupo, setMostrarFormGrupo] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [imagenFile, setImagenFile] = useState<File | null>(null);
const [imagenPreview, setImagenPreview] = useState("");

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      const { data } = await supabase
        .from("categorias")
        .select("id_categoria, nombre_categoria, img")
        .order("nombre_categoria", { ascending: true });
      setSubcategorias(data || []);
      setCargando(false);
    };
    cargar();
  }, []);

  const cargarGrupos = useCallback(async (subcatId: number) => {
    setCargando(true);
    const { data } = await supabase
      .from("grupos")
      .select("id, nombre, subcategoria_id, orden, imagen")
      .eq("subcategoria_id", subcatId)
      .order("orden", { ascending: true });

    const gruposConTotal: Grupo[] = await Promise.all(
      (data || []).map(async (g: any) => {
        const { count } = await supabase
          .from("grupos_productos")
          .select("id", { count: "exact", head: true })
          .eq("grupo_id", g.id);
        return { ...g, _total: count ?? 0 };
      })
    );

    setGrupos(gruposConTotal);
    setCargando(false);
  }, []);

  const cargarProductosGrupo = useCallback(async (grupoId: number) => {
    setCargando(true);
    const { data } = await supabase
      .from("grupos_productos")
      .select("producto_id, productos(id, TITULO, CODIGO, IMAGEN)")
      .eq("grupo_id", grupoId);

    const prods: Producto[] = (data || []).map((r: any) => r.productos).filter(Boolean);
    setProductosGrupo(prods);
    setCargando(false);
  }, []);

  const cargarTodosProductos = useCallback(async (subcatId: number) => {
    const { data } = await supabase
      .from("productos")
      .select("id, TITULO, CODIGO, IMAGEN, CATEGORIA_ID")
      .eq("CATEGORIA_ID", subcatId)
      .order("TITULO", { ascending: true })
      .limit(500);
    setTodosProductos(data || []);
  }, []);

  const seleccionarSubcat = (subcat: Subcategoria) => {
    setSubcatSeleccionada(subcat);
    cargarGrupos(subcat.id_categoria);
    setPantalla("grupos");
    setError("");
    setMensaje("");
  };

  const seleccionarGrupo = (grupo: Grupo) => {
    setGrupoSeleccionado(grupo);
    cargarProductosGrupo(grupo.id);
    cargarTodosProductos(grupo.subcategoria_id);
    setPantalla("productos");
    setBusqueda("");
    setError("");
    setMensaje("");
  };

  const abrirFormNuevo = () => {
    setEditandoGrupo(null);
    setNombreGrupo("");
    setOrdenGrupo("0");
    setMostrarFormGrupo(true);
  };

  const abrirFormEditar = (g: Grupo) => {
  setEditandoGrupo(g);
  setNombreGrupo(g.nombre);
  setOrdenGrupo(String(g.orden));
  setImagenPreview(g.imagen || "");
  setImagenFile(null);
  setMostrarFormGrupo(true);
};

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) { setError("Selecciona una imagen válida"); return; }
  if (file.size > 800 * 1024) { setError("La imagen no debe superar 800 KB"); return; }
  setImagenFile(file);
  const reader = new FileReader();
  reader.onloadend = () => setImagenPreview(reader.result as string);
  reader.readAsDataURL(file);
};

  const guardarGrupo = async () => {
  if (!nombreGrupo.trim() || !subcatSeleccionada) return;
  setGuardando(true);
  setError("");
  setMensaje("");

  let urlImagen = editandoGrupo ? (editandoGrupo as any).imagen || "" : "";

  if (imagenFile) {
    const timestamp = Date.now();
    const ext = imagenFile.name.split(".").pop();
    const nombreArchivo = `grupo_${timestamp}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("imagenes_categorias")
      .upload(nombreArchivo, imagenFile, { cacheControl: "public, max-age=31536000", upsert: true });

    if (uploadError) {
      setError("Error al subir la imagen");
      setGuardando(false);
      return;
    }
    const { data } = supabase.storage.from("imagenes_categorias").getPublicUrl(nombreArchivo);
    urlImagen = data.publicUrl;
  }

  const payload = {
    nombre: nombreGrupo.trim().toUpperCase(),
    orden: parseInt(ordenGrupo) || 0,
    subcategoria_id: subcatSeleccionada.id_categoria,
    imagen: urlImagen,
  };

  if (editandoGrupo) {
    const { error: err } = await supabase.from("grupos").update(payload).eq("id", editandoGrupo.id);
    if (err) { setError("Error al actualizar el grupo"); }
    else { setMensaje("Grupo actualizado correctamente"); }
  } else {
    const { error: err } = await supabase.from("grupos").insert([payload]);
    if (err) { setError("Error al crear el grupo"); }
    else { setMensaje("Grupo creado correctamente"); }
  }

  setGuardando(false);
  setMostrarFormGrupo(false);
  setImagenFile(null);
  setImagenPreview("");
  cargarGrupos(subcatSeleccionada.id_categoria);
  setTimeout(() => setMensaje(""), 2500);
};

  const eliminarGrupo = async (g: Grupo) => {
    if (!confirm(`¿Eliminar grupo "${g.nombre}"? Se quitarán todos sus productos.`)) return;
    setGuardando(true);
    await supabase.from("grupos").delete().eq("id", g.id);
    setGuardando(false);
    cargarGrupos(subcatSeleccionada!.id_categoria);
    setMensaje("Grupo eliminado");
    setTimeout(() => setMensaje(""), 2000);
  };

  const toggleProducto = async (prod: Producto) => {
    if (!grupoSeleccionado) return;
    const yaEsta = productosGrupo.some((p) => p.id === prod.id);

    if (yaEsta) {
      await supabase
        .from("grupos_productos")
        .delete()
        .eq("grupo_id", grupoSeleccionado.id)
        .eq("producto_id", prod.id);
      setProductosGrupo((prev) => prev.filter((p) => p.id !== prod.id));
    } else {
      await supabase.from("grupos_productos").insert([
        { grupo_id: grupoSeleccionado.id, producto_id: prod.id },
      ]);
      setProductosGrupo((prev) => [...prev, prod]);
    }
  };

  const productosFiltrados = busqueda.trim()
    ? todosProductos.filter(
        (p) =>
          p.TITULO?.toLowerCase().includes(busqueda.toLowerCase()) ||
          p.CODIGO?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : todosProductos;

  return (
    <motion.div
      key="gestionar-grupos"
      className="min-h-screen pb-24"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="px-4 py-6">

        <BackBtn
          onBack={() => {
            if (pantalla === "productos") { setPantalla("grupos"); setGrupoSeleccionado(null); }
            else if (pantalla === "grupos") { setPantalla("subcategorias"); setSubcatSeleccionada(null); }
            else { setVistaPerfil("menu"); }
          }}
        />

        <div className="flex items-center gap-2 mb-1">
          <Layers size={20} className="text-orange-500" />
          <h2 className="text-xl font-bold text-zinc-900">Gestionar Grupos</h2>
        </div>

        {/* breadcrumb */}
        <p className="text-xs text-zinc-400 mb-5">
          Subcategorías
          {subcatSeleccionada && (
            <> &rsaquo; <span className="text-zinc-600 font-medium">{subcatSeleccionada.nombre_categoria}</span></>
          )}
          {grupoSeleccionado && (
            <> &rsaquo; <span className="text-orange-500 font-medium">{grupoSeleccionado.nombre}</span></>
          )}
        </p>

        {/* mensajes */}
        <AnimatePresence>
          {mensaje && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 p-3 rounded-xl bg-green-50 text-green-700 text-sm font-medium border border-green-200"
            >
              {mensaje}
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm font-medium border border-red-200"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* LISTA DE SUBCATEGORIAS */}
        {pantalla === "subcategorias" && (
  <div>
    {/* Buscador */}
    <div className="relative mb-4">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar subcategoría..."
        className="w-full pl-9 pr-4 py-2.5 border border-zinc-300 rounded-xl text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
      />
      {busqueda && (
        <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2">
          <X size={14} className="text-zinc-400" />
        </button>
      )}
    </div>

    <p className="text-sm text-zinc-500 mb-3">Selecciona una subcategoría para gestionar sus grupos:</p>

    {cargando && (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-zinc-200 animate-pulse" />
        ))}
      </div>
    )}

    {!cargando && subcategorias
      .filter((s) => s.nombre_categoria.toLowerCase().startsWith(busqueda.toLowerCase()))
      .map((sub) => (
        <button
          key={sub.id_categoria}
          onClick={() => seleccionarSubcat(sub)}
          className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-zinc-200 hover:border-orange-400 hover:bg-orange-50 transition bg-white text-left mb-2"
        >
          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-zinc-100 flex-shrink-0">
            {sub.img ? (
              <Image src={sub.img} alt={sub.nombre_categoria} fill className="object-contain" />
            ) : (
              <FolderOpen size={20} className="m-auto mt-2 text-zinc-400" />
            )}
          </div>
          <span className="font-semibold text-zinc-800">{sub.nombre_categoria}</span>
          <ChevronLeft size={16} className="ml-auto rotate-180 text-zinc-400" />
        </button>
      ))}

    {!cargando && subcategorias.filter((s) =>
      s.nombre_categoria.toLowerCase().includes(busqueda.toLowerCase())
    ).length === 0 && (
      <p className="text-center text-zinc-400 py-10 text-sm">Sin resultados para "{busqueda}"</p>
    )}
  </div>
)}

        {/* GRUPOS DE LA SUBCATEGORÍA */}
        {pantalla === "grupos" && subcatSeleccionada && (
          <div>
            {/* Botón agregar grupo */}
            <button
              onClick={abrirFormNuevo}
              className="w-full mb-4 py-3 rounded-xl bg-orange-500 text-white font-semibold flex items-center justify-center gap-2 hover:bg-orange-600 active:scale-[0.98] transition"
            >
              <Plus size={18} />
              Nuevo Grupo
            </button>

            <AnimatePresence>
              {mostrarFormGrupo && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="mb-4 p-4 rounded-2xl border-2 border-orange-300 bg-orange-50 shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-zinc-800">
                      {editandoGrupo ? "Editar grupo" : "Nuevo grupo"}
                    </h3>
                    <button onClick={() => setMostrarFormGrupo(false)}>
                      <X size={18} className="text-zinc-500" />
                    </button>
                  </div>

                  {/* Imagen del grupo */}
<label className="block text-xs font-medium text-zinc-600 mb-1">Imagen del grupo</label>
<div className="flex flex-col items-center gap-2 mb-4">
  <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center">
    {imagenPreview ? (
      <img src={imagenPreview} alt="preview" className="w-full h-full object-contain" />
    ) : (
      <Layers size={28} className="text-zinc-300" />
    )}
  </div>
  <input
    type="file"
    accept="image/*"
    onChange={handleImagenChange}
    className="text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
  />
</div>

                  <label className="block text-xs font-medium text-zinc-600 mb-1">
                    Nombre del grupo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nombreGrupo}
                    onChange={(e) => setNombreGrupo(e.target.value)}
                    placeholder="Ej: HERRAMIENTAS ELÉCTRICAS"
                    className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 mb-3"
                  />

                  <label className="block text-xs font-medium text-zinc-600 mb-1">Orden</label>
                  <input
                    type="number"
                    value={ordenGrupo}
                    onChange={(e) => setOrdenGrupo(e.target.value)}
                    placeholder="0"
                    className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 mb-4"
                  />

                  <button
                    onClick={guardarGrupo}
                    disabled={guardando || !nombreGrupo.trim()}
                    className="w-full py-3 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50 transition"
                  >
                    {guardando ? "Guardando..." : editandoGrupo ? "Guardar cambios" : "Crear grupo"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Lista de grupos */}
            {cargando && (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-zinc-200 animate-pulse" />
                ))}
              </div>
            )}

            {!cargando && grupos.length === 0 && (
              <div className="text-center py-12">
                <Layers size={40} className="mx-auto text-zinc-300 mb-3" />
                <p className="text-zinc-400 text-sm">
                  Esta subcategoría no tiene grupos aún.
                </p>
                <p className="text-zinc-400 text-xs mt-1">
                  Crea el primero con el botón de arriba.
                </p>
              </div>
            )}

            <div className="space-y-2">
              {grupos.map((grupo) => (
                <div
                  key={grupo.id}
                  className="flex items-center gap-3 p-3 rounded-xl border-2 border-zinc-200 bg-white hover:border-orange-300 transition"
                >

                  <button
                    onClick={() => seleccionarGrupo(grupo)}
                    className="flex-1 text-left"
                  >
                    <p className="font-semibold text-zinc-800">{grupo.nombre}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {grupo._total ?? 0} producto{(grupo._total ?? 0) !== 1 ? "s" : ""} · Orden: {grupo.orden}
                    </p>
                  </button>

                  {/* acciones */}
                  <button
                    onClick={() => abrirFormEditar(grupo)}
                    className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition"
                    title="Editar grupo"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => eliminarGrupo(grupo)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-400 transition"
                    title="Eliminar grupo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRODUCTOS DEL GRUPO */}
        {pantalla === "productos" && grupoSeleccionado && (
          <div>
            {/* Buscador */}
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o código..."
                className="w-full pl-9 pr-4 py-2.5 border border-zinc-300 rounded-xl text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              {busqueda && (
                <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X size={14} className="text-zinc-400" />
                </button>
              )}
            </div>

            {/* Info */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-zinc-500">
                <span className="font-semibold text-orange-500">{productosGrupo.length}</span>{" "}
                producto{productosGrupo.length !== 1 ? "s" : ""} en el grupo
              </p>
              <p className="text-xs text-zinc-400">
                {productosFiltrados.length} visibles
              </p>
            </div>

            {/* Lista de todos los productos de la subcategoría */}
            {cargando && (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-zinc-200 animate-pulse" />
                ))}
              </div>
            )}

            {!cargando && todosProductos.length === 0 && (
              <div className="text-center py-12">
                <PackagePlus size={40} className="mx-auto text-zinc-300 mb-3" />
                <p className="text-zinc-400 text-sm">
                  Esta subcategoría no tiene productos asignados.
                </p>
              </div>
            )}

            <div className="space-y-2">
              {productosFiltrados.map((prod) => {
                const enGrupo = productosGrupo.some((p) => p.id === prod.id);
                return (
                  <button
                    key={prod.id}
                    onClick={() => toggleProducto(prod)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition text-left ${
                      enGrupo
                        ? "border-orange-400 bg-orange-50"
                        : "border-zinc-200 bg-white hover:border-zinc-300"
                    }`}
                  >
                    {/* Imagen */}
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-zinc-100 flex-shrink-0">
                      {prod.IMAGEN ? (
                        <Image src={prod.IMAGEN} alt={prod.TITULO} fill className="object-contain" />
                      ) : (
                        <div className="w-full h-full bg-zinc-200" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-800 line-clamp-1">{prod.TITULO}</p>
                      <p className="text-xs text-zinc-400">{prod.CODIGO}</p>
                    </div>

                    {/* Toggle check */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition ${
                        enGrupo ? "bg-orange-500 text-white" : "bg-zinc-200 text-transparent"
                      }`}
                    >
                      <Check size={14} />
                    </div>
                  </button>
                );
              })}
            </div>

            {!cargando && busqueda && productosFiltrados.length === 0 && (
              <p className="text-center text-zinc-400 py-10 text-sm">
                Sin resultados para "{busqueda}"
              </p>
            )}
          </div>
        )}

      </div>
    </motion.div>
  );
}