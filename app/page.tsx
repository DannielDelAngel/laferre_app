"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  SquareStack,
  Search,
  ShoppingCart,
  Codesandbox,
  MapPin,
  Hammer,
  X,
  Megaphone,
  Star,
  History,
  Menu,
  FileQuestionMark,
  LogOut,
  UserCog,
  EyeOff,
  Eye,
  DatabaseBackup,
  PackagePlus,
  Box,
  Boxes,
  Users,
  FilePenLine,
  Edit2,
  ChevronLeft,
  ScanBarcode,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import { AnimatePresence, motion } from "framer-motion";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { createPortal } from "react-dom";
import InstallPWA from "@/app/InstallPWA";
import ContadorEntrega from "@/app/ContadorEntrega";
import { div } from "framer-motion/client";

const SkeletonImage = ({ src, alt, className }: any) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 bg-zinc-200 animate-pulse rounded-xl" />
      )}
      <Image
        src={src}
        alt={alt}
        fill
        className={`${className} transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

interface Cuenta {
  numero_cuenta: string;
  cliente?: string;
  numero_tel?: string;
  entrega_mismo_dia?: boolean;
  [key: string]: any;
}

const VistaProducto = ({
  producto,
  onBack,
  esAdmin,
  carrito,
  setCarrito,
  cuenta,
  supabase,
  marcas,
  esFavorito,
  toggleFavorito,
  categoriasAdmin,
}: any) => {
  const [esFavoritoLocal, setEsFavoritoLocal] = useState(
    esFavorito ? esFavorito(producto.id) : false
  );

  // Función para obtener el nombre de la marca
  const getNombreMarca = (id: number) => {
    if (!id || !marcas) return "Sin marca";
    const marca = marcas.find((m: any) => m.id === id);
    return marca ? marca.nombre_marca : "Sin marca";
  };

  const handleToggleFavorito = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEsFavoritoLocal(!esFavoritoLocal);
    if (toggleFavorito) toggleFavorito(producto);
  };

  const itemEnCarrito = carrito.find((p: any) => p.id === producto.id);
  const esDesdeCarrito = !!itemEnCarrito;

  const [cantidad, setCantidad] = useState(
    esDesdeCarrito ? itemEnCarrito.cantidad.toString() : "1"
  );

  // Estados para edición
  const [modoEdicion, setModoEdicion] = useState(false);
  const [titulo, setTitulo] = useState(producto.TITULO || "");
  const [descripcion, setDescripcion] = useState(producto.DESCRIPCION || "");
  const [categoriaId, setCategoriaId] = useState(
    producto.CATEGORIA_ID ? String(producto.CATEGORIA_ID) : ""
  );
  const [marcaId, setMarcaId] = useState(
    producto.marca_id ? String(producto.marca_id) : ""
  );

  const [imagenAmpliada, setImagenAmpliada] = useState(false);
  const [scale, setScale] = useState(1);
  const [posicion, setPosicion] = useState({ x: 0, y: 0 });
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState(producto.IMAGEN || "");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [numeroCuentaConfirm, setNumeroCuentaConfirm] = useState("");
  const [errorEliminar, setErrorEliminar] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [imagenesProducto, setImagenesProducto] = useState<string[]>([
    producto.IMAGEN,
  ]);
  const [imagenActualIndex, setImagenActualIndex] = useState(0);
  const [imagenesAdicionalesFiles, setImagenesAdicionalesFiles] = useState<
    File[]
  >([]);
  const [imagenesAdicionalesDB, setImagenesAdicionalesDB] = useState<any[]>([]);
  const [visible, setVisible] = useState(producto.visible ?? true);
const [liquidacion, setLiquidacion] = useState(producto.liquidacion ?? false);
const [topVentas, setTopVentas] = useState(producto.top_ventas ?? false);
const [actualizandoToggle, setActualizandoToggle] = useState(false);

const handleToggleVisible = async () => {
  setActualizandoToggle(true);
  try {
    const nuevoValor = !visible;
    const { error } = await supabase
      .from('productos')
      .update({ visible: nuevoValor })
      .eq('id', producto.id);

    if (!error) {
      setVisible(nuevoValor);
      producto.visible = nuevoValor;
    }
  } catch (error) {
    console.error('Error actualizando visibilidad:', error);
  } finally {
    setActualizandoToggle(false);
  }
};

const handleToggleLiquidacion = async () => {
  setActualizandoToggle(true);
  try {
    const nuevoValor = !liquidacion;
    const { error } = await supabase
      .from('productos')
      .update({ liquidacion: nuevoValor })
      .eq('id', producto.id);

    if (!error) {
      setLiquidacion(nuevoValor);
      producto.liquidacion = nuevoValor;
    }
  } catch (error) {
    console.error('Error actualizando liquidación:', error);
  } finally {
    setActualizandoToggle(false);
  }
};

const handleToggleTopVentas = async () => {
  setActualizandoToggle(true);
  try {
    const nuevoValor = !topVentas;
    const { error } = await supabase
      .from('productos')
      .update({ top_ventas: nuevoValor })
      .eq('id', producto.id);

    if (!error) {
      setTopVentas(nuevoValor);
      producto.top_ventas = nuevoValor;
    }
  } catch (error) {
    console.error('Error actualizando top ventas:', error);
  } finally {
    setActualizandoToggle(false);
  }
};

  useEffect(() => {
    const cargarImagenesAdicionales = async () => {
      const { data } = await supabase
        .from("imagenes_producto")
        .select("*")
        .eq("producto_id", producto.id)
        .order("orden", { ascending: true });

      if (data && data.length > 0) {
        setImagenesAdicionalesDB(data);
        setImagenesProducto([
          producto.IMAGEN,
          ...data.map((img: any) => img.url),
        ]);
      }
    };

    cargarImagenesAdicionales();
  }, [producto.id]);

  const handleChange = (e: any) => {
    const value = e.target.value;

    if (value === "") {
      setCantidad("");
      return;
    }

    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1) {
      setCantidad(num.toString());
    }
  };

  const handleBlur = () => {
    if (cantidad === "" || parseInt(cantidad) < 1) {
      setCantidad("1");
    }
  };

  const handleAdd = (): void =>
    setCantidad((c: string): string =>
      c === "" ? "1" : (parseInt(c, 10) + 1).toString()
    );

  const handleSubtract = (): void =>
    setCantidad((c: string): string => {
      if (c === "" || parseInt(c, 10) <= 1) return "1";
      return (parseInt(c, 10) - 1).toString();
    });

  // FUNCIÓN PARA AGREGAR O MODIFICAR EN CARRITO
  const agregarOModificarCarrito = () => {
    const cant = parseInt(cantidad) || 1;

    if (esDesdeCarrito) {
      // Modificar cantidad existente
      setCarrito((prev: any[]) => {
        return prev.map((p) =>
          p.id === producto.id
            ? {
                ...p,
                cantidad: cant,
                subtotal: cant * p.P_MAYOREO,
              }
            : p
        );
      });
    } else {
      // Agregar nuevo o sumar cantidad
      setCarrito((prev: any[]) => {
        const existe = prev.find((p) => p.id === producto.id);
        if (existe) {
          return prev.map((p) =>
            p.id === producto.id
              ? {
                  ...p,
                  cantidad: p.cantidad + cant,
                  subtotal: (p.cantidad + cant) * p.P_MAYOREO,
                }
              : p
          );
        } else {
          return [
            ...prev,
            {
              ...producto,
              cantidad: cant,
              subtotal: cant * producto.P_MAYOREO,
            },
          ];
        }
      });
    }

    onBack();
  };

  // FUNCIÓN PARA ELIMINAR DEL CARRITO
  const eliminarDelCarrito = () => {
    setCarrito((prev: any[]) => prev.filter((p) => p.id !== producto.id));
    onBack();
  };

  const handleImagenChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validaciones
    if (!file.type.startsWith("image/")) {
      setMensaje("Por favor selecciona una imagen válida.");
      return;
    }

    if (file.size > 800 * 1024) {
      setMensaje("La imagen no debe superar los 800 KB");
      return;
    }

    // Eliminar imagen vieja si existe
    if (producto.IMAGEN) {
      const nombreArchivoViejo = producto.IMAGEN.split("/").pop();
      await supabase.storage
        .from("imagenes_productos")
        .remove([nombreArchivoViejo]);
    }

    // Guardar archivo para subir luego
    setImagenFile(file);

    // Vista previa inmediata
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagenPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const eliminarImagenAdicional = async (imagenId: number, url: string) => {
    try {
      // Eliminar del storage
      const urlParts = url.split("/");
      const nombreArchivo = urlParts[urlParts.length - 1];
      await supabase.storage.from("imagenes_productos").remove([nombreArchivo]);

      // Eliminar de la base de datos
      const { error } = await supabase
        .from("imagenes_producto")
        .delete()
        .eq("id", imagenId);

      if (!error) {
        // Actualizar estados locales
        const nuevasImagenesDB = imagenesAdicionalesDB.filter(
          (img) => img.id !== imagenId
        );
        setImagenesAdicionalesDB(nuevasImagenesDB);
        setImagenesProducto([
          producto.IMAGEN,
          ...nuevasImagenesDB.map((img: any) => img.url),
        ]);

        // Si la imagen eliminada era la actual, volver a la primera
        if (
          imagenActualIndex > 0 &&
          imagenActualIndex >= nuevasImagenesDB.length + 1
        ) {
          setImagenActualIndex(0);
        }

        setMensaje("Imagen eliminada correctamente");
        setTimeout(() => setMensaje(""), 2000);
      }
    } catch (error) {
      console.error("Error eliminando imagen:", error);
      setMensaje("Error al eliminar la imagen");
    }
  };

  const guardarCambios = async () => {
    if (!esAdmin) return;

    setGuardando(true);
    setMensaje("");

    try {
      let urlImagen = producto.IMAGEN;

      if (imagenFile) {
        const timestamp = Date.now();
        const extension = imagenFile.name.split(".").pop();
        const nombreArchivo = `producto_${producto.id}_${timestamp}.${extension}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("imagenes_productos")
          .upload(nombreArchivo, imagenFile, {
            cacheControl: "public, max-age=31536000",
            upsert: true,
          });

        if (uploadError) {
          console.error("Error subiendo imagen:", uploadError);
          setMensaje("Error al subir la imagen");
          setGuardando(false);
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage
          .from("imagenes_productos")
          .getPublicUrl(nombreArchivo);

        urlImagen = publicUrl;
      }

      const { error: updateError } = await supabase
        .from("productos")
        .update({
          TITULO: titulo,
          DESCRIPCION: descripcion,
          CATEGORIA_ID: parseInt(categoriaId),
          marca_id: marcaId ? parseInt(marcaId) : null,
          IMAGEN: urlImagen,
        })
        .eq("id", producto.id);

      if (updateError) {
        console.error("Error actualizando producto:", updateError);
        setMensaje("Error al guardar los cambios");
      } else {
        setMensaje("Producto actualizado correctamente");
        setModoEdicion(false);

        producto.TITULO = titulo;
        producto.DESCRIPCION = descripcion;
        producto.CATEGORIA_ID = parseInt(categoriaId);
        producto.marca_id = marcaId ? parseInt(marcaId) : null;
        producto.IMAGEN = urlImagen;
        setImagenFile(null);

        setTimeout(() => {
          setMensaje("");
        }, 3000);
      }

      // Subir imágenes adicionales si hay
      if (imagenesAdicionalesFiles.length > 0) {
        for (let i = 0; i < imagenesAdicionalesFiles.length; i++) {
          const file = imagenesAdicionalesFiles[i];
          const timestamp = Date.now();
          const extension = file.name.split(".").pop();
          const nombreArchivo = `producto_${producto.id}_adicional_${i}_${timestamp}.${extension}`;

          const { error: uploadError } = await supabase.storage
            .from("imagenes_productos")
            .upload(nombreArchivo, file, {
              cacheControl: "public, max-age=31536000",
              upsert: true,
            });

          if (!uploadError) {
            const {
              data: { publicUrl },
            } = supabase.storage
              .from("imagenes_productos")
              .getPublicUrl(nombreArchivo);

            await supabase.from("imagenes_producto").insert({
              producto_id: producto.id,
              url: publicUrl,
              orden: i + 1,
            });
          }
        }

        setImagenesAdicionalesFiles([]);
      }
    } catch (error) {
      console.error("Error:", error);
      setMensaje("Ocurrió un error inesperado");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarProducto = async () => {
    if (!esAdmin) return;

    setEliminando(true);
    setErrorEliminar("");

    if (numeroCuentaConfirm.trim() !== cuenta?.numero_cuenta) {
      setErrorEliminar("Número de cuenta incorrecto");
      setEliminando(false);
      return;
    }

    try {
      if (producto.IMAGEN && producto.IMAGEN.includes("imagenes_productos")) {
        const urlParts = producto.IMAGEN.split("/");
        const nombreArchivo = urlParts[urlParts.length - 1];

        const { error: deleteImageError } = await supabase.storage
          .from("imagenes_productos")
          .remove([nombreArchivo]);

        if (deleteImageError) {
          console.error("Error eliminando imagen:", deleteImageError);
        }
      }

      // Eliminar imágenes adicionales del storage
      const { data: imagenesAdicionales } = await supabase
        .from("imagenes_producto")
        .select("url")
        .eq("producto_id", producto.id);

      if (imagenesAdicionales) {
        for (const img of imagenesAdicionales) {
          const urlParts = img.url.split("/");
          const nombreArchivo = urlParts[urlParts.length - 1];
          await supabase.storage
            .from("imagenes_productos")
            .remove([nombreArchivo]);
        }
      }
      const { error: deleteError } = await supabase
        .from("productos")
        .delete()
        .eq("id", producto.id);

      if (deleteError) {
        console.error("Error eliminando producto:", deleteError);
        setErrorEliminar("Error al eliminar el producto");
        setEliminando(false);
        return;
      }

      setMostrarModalEliminar(false);
      setMensaje("Producto eliminado correctamente");

      setTimeout(() => {
        onBack();
      }, 1000);
    } catch (error) {
      console.error("Error:", error);
      setErrorEliminar("Ocurrió un error inesperado");
    } finally {
      setEliminando(false);
    }
  };

  const cantidadNum = parseInt(cantidad) || 1;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={producto.id}
        className="min-h-screen fixed inset-0 z-50 text-zinc-900"
        style={{ backgroundColor: "#fff" }}
      >
        <div className="absolute inset-0 bg-white" />
        <motion.div
          initial={{ x: 120 }}
          animate={{ x: 0 }}
          exit={{ x: 120 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(event, info) => {
            if (info.offset.x > 100 && !modoEdicion) onBack();
          }}
          className="relative w-full h-full overflow-y-auto"
        >
          {/* Botón regresar */}
          <button
            onClick={onBack}
            className="absolute top-9 left-7 bg-transparent hover:bg-white/20 text-orange-500 rounded-full p-4 shadow transition text-xl z-10"
          >
            ←
          </button>

          {/* Favorito */}
          {!esAdmin && !modoEdicion && (
            <motion.button
              onClick={handleToggleFavorito}
              whileTap={{ scale: 0.85 }}
              className="absolute top-9 right-7 bg-white hover:bg-orange-50 text-orange-500 rounded-full p-3 shadow transition z-10"
            >
              <AnimatePresence mode="wait">
                {esFavoritoLocal ? (
                  <motion.svg
                    key="filled"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                      clipRule="evenodd"
                    />
                  </motion.svg>
                ) : (
                  <motion.svg
                    key="outline"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                    />
                  </motion.svg>
                )}
              </AnimatePresence>
            </motion.button>
          )}

          {/* Botón editar (solo admin y no desde carrito) */}
          {esAdmin && !modoEdicion && !esDesdeCarrito && (
            <button
              onClick={() => setModoEdicion(true)}
              className="absolute top-9 right-7 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow transition z-10"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                />
              </svg>
            </button>
          )}

          {/* MODO EDICIÓN (ADMIN) */}
          {modoEdicion && esAdmin ? (
            <div className="px-6 py-20">
              <h2 className="text-xl font-bold text-zinc-900 mb-6">
                Editar Producto
              </h2>

              {/* Imagen */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Imagen
                </label>
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-48 h-48 rounded-lg overflow-hidden border-2 border-zinc-300">
                    <Image
                      src={imagenPreview || "/placeholder.jpg"}
                      alt="Preview"
                      fill
                      className="object-contain"
                      loading="lazy"
                    />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImagenChange}
                    className="text-sm text-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Imágenes Adicionales (opcional - máximo 4)
                </label>

                {/* Mostrar imágenes existentes */}
                {imagenesAdicionalesDB.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-zinc-600 mb-2">
                      Imágenes actuales:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {imagenesAdicionalesDB.map((img, index) => (
                        <div
                          key={img.id}
                          className="relative border rounded-lg p-2"
                        >
                          <div className="relative w-full h-24 mb-1">
                            <Image
                              src={img.url}
                              alt={`Adicional ${index + 1}`}
                              fill
                              className="object-contain rounded"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              eliminarImagenAdicional(img.id, img.url)
                            }
                            className="w-full bg-red-500 hover:bg-red-600 text-white text-xs py-1 rounded"
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input para agregar nuevas */}
                {imagenesAdicionalesDB.length +
                  imagenesAdicionalesFiles.length <
                  4 && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const totalImagenes =
                          imagenesAdicionalesDB.length + files.length;
                        if (totalImagenes > 4) {
                          setMensaje("Máximo 4 imágenes adicionales en total");
                          return;
                        }
                        setImagenesAdicionalesFiles(files);
                      }}
                      className="text-sm text-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {imagenesAdicionalesFiles.length > 0 && (
                      <p className="text-xs text-zinc-500 mt-1">
                        {imagenesAdicionalesFiles.length} imagen(es) nueva(s)
                        para agregar
                      </p>
                    )}
                  </>
                )}

                <p className="text-xs text-zinc-400 mt-1">
                  Total:{" "}
                  {imagenesAdicionalesDB.length +
                    imagenesAdicionalesFiles.length}{" "}
                  de 4
                </p>
              </div>

              {/* Título */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Título
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700"
                />
              </div>

              {/* Descripción */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={3}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700"
                />
              </div>

              {/* Código */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Código (no editable)
                </label>
                <input
                  type="text"
                  value={producto.CODIGO}
                  disabled
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-500 bg-zinc-100"
                />
              </div>

              {/* Precio */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Precio (no editable)
                </label>
                <input
                  type="text"
                  value={`$${producto.P_MAYOREO?.toFixed(2)}`}
                  disabled
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-500 bg-zinc-100"
                />
              </div>

              {/* Categoría */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Categoría
                </label>
                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700"
                >
                  <option value="">Seleccionar categoría</option>
                  {categoriasAdmin.map((cat: any) => (
                    <option
                      key={cat.id_categoria}
                      value={String(cat.id_categoria)}
                    >
                      {cat.nombre_categoria}
                    </option>
                  ))}
                </select>
              </div>

              {/* Marca */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Marca
                </label>
                <select
                  value={marcaId}
                  onChange={(e) => setMarcaId(e.target.value)}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700"
                >
                  <option value="">Sin marca</option>
                  {marcas.map((marca: any) => (
                    <option key={marca.id} value={marca.id}>
                      {marca.nombre_marca}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mensaje */}
              {mensaje && (
                <div
                  className={`mb-4 p-3 rounded-lg text-sm ${
                    mensaje.includes("Error")
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-green-50 text-green-700 border border-green-200"
                  }`}
                >
                  {mensaje}
                </div>
              )}

              {/* Botones */}
              <div className="space-y-3">
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setModoEdicion(false);
                      setTitulo(producto.TITULO || "");
                      setDescripcion(producto.DESCRIPCION || "");
                      setCategoriaId(
                        producto.CATEGORIA_ID
                          ? String(producto.CATEGORIA_ID)
                          : ""
                      );
                      setMarcaId(
                        producto.marca_id ? String(producto.marca_id) : ""
                      );
                      setImagenFile(null);
                      setImagenPreview(producto.IMAGEN || "");
                      setMensaje("");
                    }}
                    disabled={guardando}
                    className="flex-1 border border-zinc-300 py-3 rounded-xl font-semibold text-zinc-600 hover:bg-zinc-50 transition disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={guardarCambios}
                    disabled={guardando || !titulo}
                    className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {guardando ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                        Guardando...
                      </span>
                    ) : (
                      "Guardar Cambios"
                    )}
                  </button>
                </div>

                <button
                  onClick={() => setMostrarModalEliminar(true)}
                  disabled={guardando}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                  Eliminar Producto
                </button>
              </div>
            </div>
          ) : (
            // MODO VISTA NORMAL
            <>
              {/* Badge si es desde carrito */}
              {esDesdeCarrito && (
                <div className="absolute top-20 right-7 bg-orange-500 text-white text-xs px-3 py-1 rounded-full font-semibold z-10">
                  En carrito
                </div>
              )}

              {/* Imagen */}
              {/* Imagen con carrusel si hay adicionales */}
              <div className="relative">
                <div
                  className="flex justify-center mb-3 pt-20 cursor-pointer"
                  onClick={() => {
                    if (!modoEdicion) setImagenAmpliada(true);
                  }}
                >
                  <div className="relative w-60 h-60">
                    <SkeletonImage
                      src={
                        imagenesProducto[imagenActualIndex] ||
                        "/placeholder.jpg"
                      }
                      alt={producto.TITULO}
                      className="object-contain"
                    />
                  </div>
                </div>

                {/* Controles del carrusel - solo si hay más de 1 imagen */}
                {imagenesProducto.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setImagenActualIndex((prev) =>
                          prev > 0 ? prev - 1 : imagenesProducto.length - 1
                        )
                      }
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg z-10"
                    >
                      <ChevronLeft size={20} className="text-orange-500" />
                    </button>

                    <button
                      onClick={() =>
                        setImagenActualIndex((prev) =>
                          prev < imagenesProducto.length - 1 ? prev + 1 : 0
                        )
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg z-10"
                    >
                      <ChevronLeft
                        size={20}
                        className="rotate-180 text-orange-500"
                      />
                    </button>

                    {/* Indicadores de página */}
                    <div className="flex justify-center gap-2 mt-2">
                      {imagenesProducto.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setImagenActualIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            idx === imagenActualIndex
                              ? "bg-orange-500 w-6"
                              : "bg-zinc-300"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Detalles */}
              <h2 className="text-center text-[20px] font-bold text-zinc-900 leading-snug px-2">
                {producto.TITULO}
              </h2>

              {/* Descripción / Información Adicional */}
              {producto.DESCRIPCION && (
                <div className="mt-5 px-4">
                  <h3 className="text-sm font-semibold text-zinc-900 mb-2">
                    Información Adicional
                  </h3>
                  <p className="text-sm text-zinc-600 leading-relaxed bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                    {producto.DESCRIPCION}
                  </p>
                </div>
              )}

{/* Toggles de Admin */}
{esAdmin && !modoEdicion && (
  <div className="mt-5 px-4">
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-bold text-blue-900 mb-3">
        Configuración del Producto
      </h3>
      
      {/* Toggle Visible */}
      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            visible ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            {visible ? (
              <Eye size={20} className="text-blue-600" />
            ) : (
              <EyeOff size={20} className="text-gray-600" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-800">
              {visible ? 'Producto Visible' : 'Producto Oculto'}
            </p>
            <p className="text-xs text-zinc-500">
              {visible ? 'Los clientes pueden ver este producto' : 'Solo visible para administradores'}
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={visible}
            onChange={handleToggleVisible}
            disabled={actualizandoToggle}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:w-5 after:h-5 after:rounded-full after:transition-all peer-checked:after:translate-x-full disabled:opacity-50"></div>
        </label>
      </div>

      {/* Toggle Liquidación */}
      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            liquidacion ? 'bg-red-100' : 'bg-gray-100'
          }`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className={`w-5 h-5 ${liquidacion ? 'text-red-600' : 'text-gray-600'}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-800">
              {liquidacion ? 'En Liquidación' : 'Venta Regular'}
            </p>
            <p className="text-xs text-zinc-500">
              {liquidacion ? 'Producto marcado como liquidación' : 'Sin liquidacion'}
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={liquidacion}
            onChange={handleToggleLiquidacion}
            disabled={actualizandoToggle}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-red-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:w-5 after:h-5 after:rounded-full after:transition-all peer-checked:after:translate-x-full disabled:opacity-50"></div>
        </label>
      </div>

      {/* Toggle Top Ventas */}
      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            topVentas ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            <Star size={20} className={topVentas ? 'text-green-600 fill-green-600' : 'text-gray-600'} />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-800">
              {topVentas ? 'Producto Destacado' : 'Producto Regular'}
            </p>
            <p className="text-xs text-zinc-500">
              {topVentas ? 'Marcado como más vendido' : 'Sin destacar especialmente'}
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={topVentas}
            onChange={handleToggleTopVentas}
            disabled={actualizandoToggle}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-green-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:w-5 after:h-5 after:rounded-full after:transition-all peer-checked:after:translate-x-full disabled:opacity-50"></div>
        </label>
      </div>

      {actualizandoToggle && (
        <div className="flex items-center justify-center gap-2 text-blue-600 text-xs">
          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span>Actualizando...</span>
        </div>
      )}
    </div>
  </div>
)}



              <div className="mt-4 text-sm text-zinc-700 px-2">
                <div className="flex justify-between py-2">
                  <span className="font-medium">Código</span>
                  <span>{producto.CODIGO}</span>
                </div>

                <div className="flex justify-between py-2">
                  <span className="font-medium">Marca</span>
                  <span className="text-orange-500 font-semibold">
                    {getNombreMarca(producto.marca_id)}
                  </span>
                </div>

                <div className="flex justify-between py-2">
                  <span className="font-medium">Precio</span>
                  <span>
                    $
                    {producto.P_MAYOREO?.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {!esAdmin && (
                  <div className="flex justify-between py-2">
                    <span className="font-medium">Total de artículo</span>
                    <span>
                      $
                      {(cantidadNum * producto.P_MAYOREO).toLocaleString(
                        "en-US",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-5 px-4">
                <div className="flex justify-between items-center gap-3">
                  {/* Botón restar */}
                  <button
                    onClick={handleSubtract}
                    className="w-12 h-12 border text-black border-zinc-400 rounded-xl text-2xl"
                  >
                    −
                  </button>

                  {/* Input editable */}
                  <input
                    type="number"
                    min="1"
                    value={cantidad}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="w-20 text-center border border-zinc-400 rounded-xl text-lg font-semibold text-black py-2"
                  />

                  {/* Botón sumar */}
                  <button
                    onClick={handleAdd}
                    className="w-12 h-12 bg-orange-500 text-white rounded-xl text-2xl"
                  >
                    +
                  </button>
                </div>

                {/* Botón principal */}
                <button
                  onClick={agregarOModificarCarrito}
                  className="w-full mt-5 bg-orange-500 text-white py-3 rounded-xl font-bold shadow hover:bg-orange-600 transition"
                >
                  {esDesdeCarrito ? "Modificar cantidad" : "Agregar al carrito"}
                </button>
              </div>
            </>
          )}

          {/* Modal de Imagen Ampliada con Zoom */}
          {imagenAmpliada && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-[9999] flex items-center justify-center"
              onClick={() => {
                if (scale === 1) {
                  setImagenAmpliada(false);
                  setScale(1);
                  setPosicion({ x: 0, y: 0 });
                }
              }}
            >
              {/* Botón cerrar */}
              <button
                onClick={() => {
                  setImagenAmpliada(false);
                  setScale(1);
                  setPosicion({ x: 0, y: 0 });
                }}
                className="absolute top-4 right-4 z-[10000] bg-gray-800 text-white rounded-full p-3 hover:bg-white/30 transition"
              >
                <X size={24} />
              </button>

              {/* Controles de zoom */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-4 bg-gray-800 rounded-full px-6 py-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setScale(Math.max(1, scale - 0.5));
                    if (scale - 0.5 <= 1) {
                      setPosicion({ x: 0, y: 0 });
                    }
                  }}
                  disabled={scale <= 1}
                  className="text-white text-2xl font-bold disabled:opacity-30"
                >
                  −
                </button>
                <span className="text-white font-semibold min-w-[60px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setScale(Math.min(4, scale + 0.5));
                  }}
                  disabled={scale >= 4}
                  className="text-white text-2xl font-bold disabled:opacity-30"
                >
                  +
                </button>
              </div>

              {/* Imagen con zoom y drag */}
              <motion.div
                className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none"
                drag={scale > 1}
                dragConstraints={{
                  left: scale > 1 ? -((scale - 1) * 200) : 0,
                  right: scale > 1 ? (scale - 1) * 200 : 0,
                  top: scale > 1 ? -((scale - 1) * 200) : 0,
                  bottom: scale > 1 ? (scale - 1) * 200 : 0,
                }}
                dragElastic={0.1}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (scale > 1) {
                    setScale(1);
                    setPosicion({ x: 0, y: 0 });
                  } else {
                    setScale(2);
                  }
                }}
                style={{
                  scale: scale,
                  x: posicion.x,
                  y: posicion.y,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <Image
                  src={
                    imagenesProducto[imagenActualIndex] || "/placeholder.jpg"
                  }
                  alt={producto.TITULO}
                  fill
                  className="object-contain select-none pointer-events-none"
                  draggable={false}
                />
              </motion.div>

              {/* Indicador de ayuda */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-700 text-white text-sm px-4 py-2 rounded-full shadow-md">
                {scale === 1
                  ? "Toca para cerrar • Doble toca para zoom"
                  : "Arrastra para mover • Doble toca para alejar"}
              </div>
            </motion.div>
          )}

          {/* Modal de Confirmación para Eliminar */}
          {mostrarModalEliminar && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl w-[90%] max-w-md p-6 shadow-2xl"
              >
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-8 h-8 text-red-600"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-zinc-900 text-center mb-2">
                  ¿Eliminar Producto?
                </h3>

                <p className="text-sm text-zinc-600 text-center mb-6">
                  Esta acción no se puede deshacer. El producto y su imagen
                  serán eliminados permanentemente.
                </p>

                <div className="bg-zinc-50 rounded-lg p-3 mb-4 border border-zinc-200">
                  <p className="text-xs text-zinc-500 mb-1">
                    Producto a eliminar:
                  </p>
                  <p className="text-sm font-semibold text-zinc-900">
                    {producto.TITULO}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Código: {producto.CODIGO}
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">
                    Confirma tu número de cuenta para continuar
                  </label>
                  <input
                    type="text"
                    value={numeroCuentaConfirm}
                    onChange={(e) => {
                      setNumeroCuentaConfirm(e.target.value);
                      setErrorEliminar("");
                    }}
                    placeholder="Ingresa tu número de cuenta"
                    className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    disabled={eliminando}
                  />
                  {errorEliminar && (
                    <p className="text-red-500 text-sm mt-2">{errorEliminar}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setMostrarModalEliminar(false);
                      setNumeroCuentaConfirm("");
                      setErrorEliminar("");
                    }}
                    disabled={eliminando}
                    className="flex-1 border border-zinc-300 py-3 rounded-xl font-semibold text-zinc-600 hover:bg-zinc-50 transition disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={eliminarProducto}
                    disabled={eliminando || !numeroCuentaConfirm}
                    className="flex-1 bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {eliminando ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                        Eliminando...
                      </span>
                    ) : (
                      "Eliminar"
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default function HomePage() {
  const [cuentaActiva, setCuentaActiva] = useState<string | null>(null);
  const [numCuentaInput, setNumCuentaInput] = useState("");
  const [errorLogin, setErrorLogin] = useState("");
  const [vistaPerfil, setVistaPerfil] = useState("menu"); // menu | apoyo | settings | address | pedidos
  const [cuenta, setCuenta] = useState<Cuenta | null>(null); // datos completos de supabase
  const [mostrarExito, setMostrarExito] = useState(false);
  const [categoriasAdmin, setCategoriasAdmin] = useState<any[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("categorias");
  const [searchTerm, setSearchTerm] = useState("");
  const [categorias, setCategorias] = useState<any[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<
    any | null
  >(null);
  const [articulos, setArticulos] = useState<any[]>([]);
  const [scrollPos, setScrollPos] = useState(0);
  const scrollRef = useRef(null);
  const [productos, setProductos] = useState<any[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<any | null>(
    null
  );
  const [carrito, setCarrito] = useState<any[]>([]);
  const [mostrarModalPedido, setMostrarModalPedido] = useState(false);
  const [enviarDomicilio, setEnviarDomicilio] = useState(false);
  const [recogerLocal, setRecogerLocal] = useState(false); 
  const [cliente, setCliente] = useState("");
  const [ferreteria, setFerreteria] = useState("");
  const [direccion, setDireccion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");
  const [numeroCuenta, setNumeroCuenta] = useState("");
  const [errorCuenta, setErrorCuenta] = useState(""); //error si no existe
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [itemsPedido, setItemsPedido] = useState([]);
  const [cargandoItems, setCargandoItems] = useState(false);
  const [actualizacionReciente, setActualizacionReciente] = useState(false);
  const esAdmin = cuenta?.numero_cuenta === "Admin01";
  const esMostrador = cuenta?.numero_cuenta === "Mostrador";
  const [mostrar, setMostrar] = useState(false);
  const [subTab, setSubTab] = useState("categorias"); // categorias | marcas
  const [marcas, setMarcas] = useState<any[]>([]);
  const [marcaSeleccionada, setMarcaSeleccionada] = useState<any | null>(null);
  const [mostrarModalCategoria, setMostrarModalCategoria] = useState(false);
  const [mostrarModalMarca, setMostrarModalMarca] = useState(false);
  const [modoEdicionCatMarca, setModoEdicionCatMarca] = useState<
    "agregar" | "eliminar"
  >("agregar");
  const [itemSeleccionado, setItemSeleccionado] = useState<any>(null);
  const [macroCategorias, setMacroCategorias] = useState<any[]>([]);
  const [macroCategoriaSeleccionada, setMacroCategoriaSeleccionada] = useState<
    any | null
  >(null);
  const [origenProducto, setOrigenProducto] = useState<"catalogo" | "carrito">(
    "catalogo"
  );
  const [productosMostrados, setProductosMostrados] = useState(10);
  const [mostrarModalSaldoPendiente, setMostrarModalSaldoPendiente] =
    useState(false);
  const [documentosPendientesModal, setDocumentosPendientesModal] = useState<
    any[]
  >([]);
  const [pedidoCompleto, setPedidoCompleto] = useState(false);
  const [ocultarBarra, setOcultarBarra] = useState(false);
  const [favoritos, setFavoritos] = useState<any[]>([]);
  const [bannerAnuncio, setBannerAnuncio] = useState<any>(null);
const [cargandoBanner, setCargandoBanner] = useState(true);
const [pullStartY, setPullStartY] = useState(0);
const [pullDistance, setPullDistance] = useState(0);
const [isPulling, setIsPulling] = useState(false);
const [isRefreshing, setIsRefreshing] = useState(false);
const hayTipoEntregaSeleccionado = enviarDomicilio || recogerLocal;

const cerrarModalPedido = () => {
  setMostrarModalPedido(false);
  setEnviarDomicilio(false);
  setRecogerLocal(false);
};

const handleTouchStart = (e: React.TouchEvent) => {
  if (window.scrollY === 0) {
    setPullStartY(e.touches[0].clientY);
    setIsPulling(true);
  }
};

const handleTouchMove = (e: React.TouchEvent) => {
  if (!isPulling || window.scrollY > 0) return;
  
  const currentY = e.touches[0].clientY;
  const distance = currentY - pullStartY;
  
  if (distance > 0) {
    setPullDistance(Math.min(distance, 150)); 
  }
};

const handleTouchEnd = async () => {
  if (pullDistance > 80 && !isRefreshing) {
    setIsRefreshing(true);
    
    // Vibración si está disponible
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    // Recargar la página
    setTimeout(() => {
      window.location.reload();
    }, 300);
  }
  
  setIsPulling(false);
  setPullDistance(0);
};

 /// Lógica de Banner en tiempo real 
  useEffect(() => {
    const fetchBanner = async () => {
      const { data, error } = await supabase
        .from("banner_anuncios")
        .select("*")
        .eq("activo", true)
        .maybeSingle();

      if (error) {
        console.error("Error al cargar banner:", error);
      } else {
        setBannerAnuncio(data);
      }
      setCargandoBanner(false);
    };

    fetchBanner();

    const channel = supabase
      .channel("cambios-banner-anuncios") // Canal único
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "banner_anuncios",
        },
        (payload) => {
          console.log("Cambio en banner detectado:", payload);
          fetchBanner();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  // Cargar favoritos desde localStorage
  useEffect(() => {
    if (cuenta?.numero_cuenta) {
      const saved = localStorage.getItem(`favoritos_${cuenta.numero_cuenta}`);
      if (saved) {
        setFavoritos(JSON.parse(saved));
      }
    }
  }, [cuenta]);

  // Guardar favoritos en localStorage
  useEffect(() => {
    if (cuenta?.numero_cuenta) {
      localStorage.setItem(
        `favoritos_${cuenta.numero_cuenta}`,
        JSON.stringify(favoritos)
      );
    }
  }, [favoritos, cuenta]);

  const toggleFavorito = (producto: any) => {
    const esFavorito = favoritos.some((fav) => fav.id === producto.id);
    let nuevosFavoritos;

    if (esFavorito) {
      nuevosFavoritos = favoritos.filter((fav) => fav.id !== producto.id);
    } else {
      nuevosFavoritos = [...favoritos, producto];
    }

    setFavoritos(nuevosFavoritos);
    localStorage.setItem("favoritos", JSON.stringify(nuevosFavoritos));
  };

  const esFavorito = useCallback(
    (productoId: number) => {
      return favoritos.some((p) => p.id === productoId);
    },
    [favoritos]
  );

  const buscarStateRef = useRef<{
    categoria: any;
    marca: any;
    searchTerm: string;
    productos: any[];
  }>({
    categoria: null,
    marca: null,
    searchTerm: "",
    productos: [],
  });

  useEffect(() => {
    const totalCarrito = carrito.reduce((sum, p) => sum + p.subtotal, 0);

    if (totalCarrito >= 1000 && !pedidoCompleto) {
      setPedidoCompleto(true);

      // Esperar 10 segundos y ocultar la barra con animación
      setTimeout(() => {
        setOcultarBarra(true);
      }, 5000);
    } else if (totalCarrito < 1000) {
      // Resetear estados cuando baja del mínimo
      setPedidoCompleto(false);
      setOcultarBarra(false);
    }
  }, [carrito, pedidoCompleto]);

  useEffect(() => {
    if (activeTab !== "buscar") {
      buscarStateRef.current = {
        categoria: categoriaSeleccionada,
        marca: marcaSeleccionada,
        searchTerm,
        productos,
      };
    }

    localStorage.setItem("scrollPos", window.scrollY.toString());
    const savedScroll = localStorage.getItem("scrollPos");
    if (savedScroll) {
      setTimeout(() => {
        window.scrollTo({
          top: parseInt(savedScroll),
          behavior: "instant",
        });
      }, 50);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "buscar") {
      setCategoriaSeleccionada(buscarStateRef.current.categoria);
      setMarcaSeleccionada(buscarStateRef.current.marca);
      setSearchTerm(buscarStateRef.current.searchTerm);
      setProductos(buscarStateRef.current.productos);
    }
  }, [activeTab]);

  useEffect(() => {
    const cargarCategorias = async () => {
      const { data } = await supabase
        .from("categorias")
        .select(
          "id_categoria, nombre_categoria, img, orden, macro_categoria_id"
        )
        .order("orden", { ascending: true });

      setCategoriasAdmin(data || []);
    };

    cargarCategorias();
  }, []);

  const articulosFiltrados = articulos.filter((a) => {
    if (!esAdmin && !a.visible) return false;

    const term = searchTerm.toLowerCase();

    return (
      (a.TITULO && a.TITULO.toLowerCase().includes(term)) ||
      (a.CODIGO && a.CODIGO.toLowerCase().includes(term))
    );
  });

  const getPathFromUrl = (url: string) => {
    try {
      const parts = url.split("/imagenes_categorias/");
      return parts[1] || null;
    } catch {
      return null;
    }
  };

  // Vista de Edición de Categorías/Subcategorías
  const VistaEdicionCategorias = ({
    setVistaPerfil,
    supabase,
    categorias,
    setCategorias,
    macroCategorias,
    setMacroCategorias,
    cuenta,
  }: any) => {
    const [tipo, setTipo] = useState<"macro" | "subcategoria">("macro");
    const [itemSeleccionado, setItemSeleccionado] = useState<any>(null);
    const [nombre, setNombre] = useState("");
    const [orden, setOrden] = useState("");
    const [imagenFile, setImagenFile] = useState<File | null>(null);
    const [imagenPreview, setImagenPreview] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState("");
    const [categoriasEdicion, setCategoriasEdicion] = useState<any[]>([]);

    useEffect(() => {
      if (tipo === "subcategoria") {
        const cargarTodas = async () => {
          const { data, error } = await supabase
            .from("categorias")
            .select(
              "id_categoria, nombre_categoria, img, orden, macro_categoria_id"
            )
            .order("orden", { ascending: true });

          if (!error) setCategoriasEdicion(data || []);
        };

        cargarTodas();
      }
    }, [tipo]);

    const handleSeleccionar = (item: any) => {
      setItemSeleccionado(item);
      setNombre(item.nombre || item.nombre_categoria);
      setOrden(String(item.orden));
      setImagenPreview(item.img || "");
      setImagenFile(null);
      setMensaje("");
    };

    const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (!file.type.startsWith("image/")) {
          setMensaje("Por favor selecciona una imagen válida");
          return;
        }
        if (file.size > 800 * 1024) {
          setMensaje("La imagen no debe superar los 800 KB");
          return;
        }

        setImagenFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setImagenPreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    };

    const guardarCambios = async () => {
      if (!itemSeleccionado) return;

      setGuardando(true);
      setMensaje("");

      const imagenAnterior = itemSeleccionado.img;

      try {
        let urlImagen = imagenAnterior;
        if (imagenFile) {
          const timestamp = Date.now();
          const extension = imagenFile.name.split(".").pop();
          const nombreArchivo = `${tipo}_${itemSeleccionado.id}_${timestamp}.${extension}`;

          const { error: uploadError } = await supabase.storage
            .from("imagenes_categorias")
            .upload(nombreArchivo, imagenFile, {
              cacheControl: "public, max-age=31536000",
              upsert: true,
            });

          if (uploadError) {
            setMensaje("Error al subir la imagen");
            setGuardando(false);
            return;
          }

          const { data } = supabase.storage
            .from("imagenes_categorias")
            .getPublicUrl(nombreArchivo);

          urlImagen = data.publicUrl;
        }

        const tabla = tipo === "macro" ? "macro_categorias" : "categorias";
        const campoNombre = tipo === "macro" ? "nombre" : "nombre_categoria";
        const campoId = tipo === "macro" ? "id" : "id_categoria";

        const { error: updateError } = await supabase
          .from(tabla)
          .update({
            [campoNombre]: nombre.trim().toUpperCase(),
            orden: parseInt(orden),
            img: urlImagen,
          })
          .eq(campoId, itemSeleccionado[campoId]);

        if (updateError) {
          setMensaje("Error al actualizar");
          console.error(updateError);
          setGuardando(false);
          return;
        }

        /* borrar imagen anterior */
        if (imagenFile && imagenAnterior && imagenAnterior !== urlImagen) {
          const pathAnterior = getPathFromUrl(imagenAnterior);

          if (pathAnterior) {
            await supabase.storage
              .from("imagenes_categorias")
              .remove([pathAnterior]);
          }
        }

        setMensaje("Cambios guardados correctamente");

        if (tipo === "macro") {
          const { data } = await supabase
            .from("macro_categorias")
            .select("id, nombre, img, orden")
            .order("orden", { ascending: true });
          setMacroCategorias(data || []);
        } else {
          const { data } = await supabase
            .from("categorias")
            .select(
              "id_categoria, nombre_categoria, img, orden, macro_categoria_id"
            )
            .order("orden", { ascending: true });
          setCategorias(data || []);
        }

        setTimeout(() => {
          setItemSeleccionado(null);
          setNombre("");
          setOrden("");
          setImagenPreview("");
          setImagenFile(null);
          setMensaje("");
        }, 2000);
      } catch (error) {
        console.error(error);
        setMensaje("Ocurrió un error inesperado");
      } finally {
        setGuardando(false);
      }
    };

    const items =
      tipo === "macro"
        ? [...macroCategorias].sort((a, b) => a.orden - b.orden)
        : [...categoriasEdicion].sort((a, b) => a.orden - b.orden);

    return (
      <div className="min-h-screen px-6 py-6">
        <BackBtn onBack={() => setVistaPerfil("menu")} />
        <h2 className="text-xl font-bold text-zinc-900 mb-6">
          Editar Categorías
        </h2>

        {/* Selector de tipo */}
        <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 shadow-sm">
          <button
            onClick={() => {
              setTipo("macro");
              setItemSeleccionado(null);
              setMensaje("");
            }}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              tipo === "macro"
                ? "bg-orange-500 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            Categorías
          </button>
          <button
            onClick={() => {
              setTipo("subcategoria");
              setItemSeleccionado(null);
              setMensaje("");
            }}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              tipo === "subcategoria"
                ? "bg-orange-500 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            Subcategorías
          </button>
        </div>

        {!itemSeleccionado ? (
          /* LISTA DE ITEMS */
          <div className="space-y-2">
            <p className="text-sm text-zinc-600 mb-3">
              Selecciona{" "}
              {tipo === "macro" ? "una categoría" : "una subcategoría"} para
              editar:
            </p>
            {items.map((item: any) => (
              <div
                key={item.id || item.id_categoria}
                onClick={() => handleSeleccionar(item)}
                className="flex items-center justify-between p-3 rounded-xl border-2 border-zinc-200 cursor-pointer hover:border-blue-400 transition bg-white"
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                    <img
                      src={item.img || "/placeholder.jpg"}
                      alt={item.nombre || item.nombre_categoria}
                      sizes="48px"
                      className="object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-800">
                      {item.nombre || item.nombre_categoria}
                    </p>
                    <p className="text-xs text-zinc-500">Orden: {item.orden}</p>
                  </div>
                </div>
                <Edit2 size={18} className="text-blue-500" />
              </div>
            ))}
          </div>
        ) : (
          /* FORMULARIO DE EDICIÓN */
          <div>
            {/* Imagen */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Imagen
              </label>
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-48 h-48 rounded-lg overflow-hidden border-2 border-zinc-300">
                  <img
                    src={imagenPreview || "/placeholder.jpg"}
                    alt="Preview"
                    sizes="48px"
                    className="object-cover"
                    loading="lazy"
                  />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImagenChange}
                  className="text-sm text-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>

            {/* Nombre */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Nombre
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Orden */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Orden
              </label>
              <input
                type="number"
                value={orden}
                onChange={(e) => setOrden(e.target.value)}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Mensaje */}
            {mensaje && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm ${
                  mensaje.includes("Error")
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-green-50 text-green-700 border border-green-200"
                }`}
              >
                {mensaje}
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setItemSeleccionado(null);
                  setNombre("");
                  setOrden("");
                  setImagenPreview("");
                  setImagenFile(null);
                  setMensaje("");
                }}
                disabled={guardando}
                className="flex-1 border border-zinc-300 py-3 rounded-xl font-semibold text-zinc-600 hover:bg-zinc-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardarCambios}
                disabled={guardando || !nombre || !orden}
                className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const BackBtn = ({ onBack }: any) => {
    if (typeof document === "undefined") return null;

    const btn = (
      <motion.button
        initial={{ opacity: 0, y: -8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.96 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        whileTap={{ scale: 0.93 }}
        onClick={onBack}
        className="fixed top-5 left-4 z-[9999] bg-transparent hover:bg-white/20 bg-white text-orange-500 rounded-full p-4 shadow-lg transition text-2xl"
        aria-label="Volver"
      >
        <ChevronLeft size={34} />
      </motion.button>
    );

    return createPortal(btn, document.body);
  };
  {
    useEffect(() => {
      const saved = localStorage.getItem("cuenta_user");
      if (saved) {
        setCuenta(JSON.parse(saved));
      }
    }, []);
  }

  // componete zoom imagenes
  const ApoyoViewer = ({ selectedApoyo, setSelectedApoyo }: any) => {
    const [scale, setScale] = useState(1);
    const [isZoomed, setIsZoomed] = useState(false);

    // Zoom con scroll (desktop)
    const handleWheel = (e: any) => {
      e.preventDefault();
      if (!isZoomed) return; // Solo cuando ya está acercado
      const newScale = Math.min(Math.max(scale + e.deltaY * -0.001, 1), 3);
      setScale(newScale);
    };

    // Doble click/tap para zoom rápido
    const handleDoubleClick = () => {
      if (isZoomed) {
        setScale(1);
        setIsZoomed(false);
      } else {
        setScale(2);
        setIsZoomed(true);
      }
    };

    return (
      <motion.div
        className="fixed inset-0 bg-black/90 z-[999] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={() => !isZoomed && setSelectedApoyo(null)} // Cerrar si no está cerca
      >
        <motion.div
          className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none"
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          drag={isZoomed ? "x" : false}
          dragConstraints={{ left: -200, right: 200 }}
          style={{ scale }}
        >
          <Image
            src={selectedApoyo?.imagen}
            alt={selectedApoyo?.titulo}
            fill
            className="object-contain select-none"
            draggable={false}
          />
        </motion.div>

        <button
          onClick={() => {
            setSelectedApoyo(null);
            setScale(1);
          }}
          className="absolute top-4 left-4 bg-white/20 backdrop-blur text-white text-sm px-4 py-2 rounded-full"
        >
          ←
        </button>
      </motion.div>
    );
  };
  // fin del componente zomm img

  // verifica si hay una cuenta logeada al cargar la pagina
  useEffect(() => {
    const init = async () => {
      const saved = localStorage.getItem("cuentaActiva");
      if (saved) {
        setCuentaActiva(saved);

        // Intentar cargar los datos completos de la cuenta desde Supabase
        try {
          const { data, error } = await supabase
            .from("cuentas")
            .select("*")
            .eq("numero_cuenta", saved)
            .single();

          if (!error && data) {
            localStorage.setItem("cuenta_user", JSON.stringify(data));
            setCuenta(data);
          }
        } catch (err) {
          console.error("Error cargando cuenta guardada:", err);
        }
      }
    };

    init();
  }, []);

  // sincronizar carrito con localstorage
  useEffect(() => {
    if (cuenta?.numero_cuenta) {
      const saved = localStorage.getItem(`carrito_${cuenta.numero_cuenta}`);
      if (saved) {
        setCarrito(JSON.parse(saved));
      }
    }
  }, [cuenta]);
  // guardar carrito en localstorage al actualizar
  useEffect(() => {
    if (cuenta?.numero_cuenta) {
      localStorage.setItem(
        `carrito_${cuenta.numero_cuenta}`,
        JSON.stringify(carrito)
      );
    }
  }, [carrito, cuenta]);
  // limpiar carrito si no hay cuenta
  useEffect(() => {
    if (!cuenta) {
      setCarrito([]);
    }
  }, [cuenta]);

  // funcion para validar la cuenta ingresada
  const validarCuenta = async () => {
    setErrorLogin("");

    const { data, error } = await supabase
      .from("cuentas")
      .select("*")
      .eq("numero_cuenta", numCuentaInput.trim())
      .single();

    if (error || !data) {
      setErrorLogin("Cuenta no encontrada. Verifica tu número.");
      return;
    }

    // Guardar sesión (ALMACENAR TODOS LOS DATOS)
    localStorage.setItem("cuenta_user", JSON.stringify(data));

    // Guardar en estado global
    setCuenta(data);

    // Guardar solo el número de cuenta si lo necesitas
    setCuentaActiva(numCuentaInput.trim());
    localStorage.setItem("cuentaActiva", numCuentaInput.trim());
  };

  {
    /* categorias extracion */
  }
  useEffect(() => {
    const fetchCategorias = async () => {
      const { data, error } = await supabase
        .from("categorias")
        .select(
          "id_categoria, nombre_categoria, img, orden, macro_categoria_id"
        )
        .order("orden", { ascending: true });

      if (error) {
        console.error("Error cargando categorías:", error.message);
      } else {
        setCategorias(data || []);
      }
    };

    fetchCategorias();
  }, []);

  // macro-categorias extracion
  useEffect(() => {
    const fetchMacroCategorias = async () => {
      const { data, error } = await supabase
        .from("macro_categorias")
        .select("id, nombre, img, orden")
        .order("orden", { ascending: true });

      if (error) {
        console.error("Error cargando macro-categorías:", error.message);
      } else {
        setMacroCategorias(data || []);
      }
    };

    fetchMacroCategorias();
  }, []);

  // marcas extracion
  useEffect(() => {
    const fetchMarcas = async () => {
      const { data, error } = await supabase
        .from("marcas")
        .select("id, nombre_marca, img")
        .order("nombre_marca", { ascending: true });

      if (error) {
        console.error("Error cargando marcas:", error.message);
      } else {
        setMarcas(data || []);
      }
    };

    fetchMarcas();
  }, []);

  // Cargar todos los productos al entrar a la pestaña de "buscar"
  const fetchProductos = async () => {
    const { data, error } = await supabase
      .from("productos")
      .select(
        "id, TITULO, CODIGO, IMAGEN, P_MAYOREO, visible, liquidacion, top_ventas, marca_id, CATEGORIA_ID"
      );

    const productosNormalizados = (data || []).map((producto) => ({
      ...producto,
      visible: producto.visible ?? true,
    }));

    if (error) {
      console.error("Error cargando productos:", error.message);
    } else {
      setProductos(productosNormalizados);
      setProductosMostrados(10);
    }
  };

  useEffect(() => {
    if (activeTab === "buscar" && productos.length === 0) {
      fetchProductos();
    }
  }, [activeTab, productos.length]);

  interface Apoyo {
    titulo: string;
    imagen: string;
  }

  const [selectedApoyo, setSelectedApoyo] = useState<Apoyo | null>(null);

  // Componente para gestionar marcas
  const GestionarMarcasView = ({ setVistaPerfil }: any) => {
    const [nombre, setNombre] = useState("");
    const [imagenFile, setImagenFile] = useState<File | null>(null);
    const [imagenPreview, setImagenPreview] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState("");
    const [modoEliminar, setModoEliminar] = useState(false);
    const [marcaEliminar, setMarcaEliminar] = useState<any>(null);
    const [numeroCuentaConfirm, setNumeroCuentaConfirm] = useState("");
    const [errorEliminar, setErrorEliminar] = useState("");

    const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (!file.type.startsWith("image/")) {
          setMensaje("Por favor selecciona un archivo de imagen válido");
          return;
        }
        if (file.size > 800 * 1024) {
          setMensaje("La imagen no debe superar los 800 KB");
          return;
        }

        setImagenFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setImagenPreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    };

    const agregarMarca = async () => {
      setGuardando(true);
      setMensaje("");

      if (!nombre) {
        setMensaje("Por favor ingresa el nombre de la marca");
        setGuardando(false);
        return;
      }

      try {
        let urlImagen = "";

        if (imagenFile) {
          const timestamp = Date.now();
          const extension = imagenFile.name.split(".").pop();
          const nombreArchivo = `marca_${timestamp}.${extension}`;

          const { error: uploadError } = await supabase.storage
            .from("imagenes_categorias")
            .upload(nombreArchivo, imagenFile, {
              cacheControl: "public, max-age=31536000",
              upsert: true,
            });

          if (uploadError) {
            setMensaje("Error al subir la imagen");
            setGuardando(false);
            return;
          }

          const {
            data: { publicUrl },
          } = supabase.storage
            .from("imagenes_categorias")
            .getPublicUrl(nombreArchivo);
          urlImagen = publicUrl;
        }

        const { error } = await supabase.from("marcas").insert([
          {
            nombre_marca: nombre,
            img: urlImagen,
          },
        ]);

        if (error) {
          setMensaje(
            error.code === "23505"
              ? "Ya existe una marca con ese nombre"
              : "Error al agregar marca"
          );
        } else {
          setMensaje("Marca agregada correctamente");
          // Recargar marcas
          const { data } = await supabase
            .from("marcas")
            .select("id, nombre_marca, img")
            .order("nombre_marca", { ascending: true });
          setMarcas(data || []);

          setTimeout(() => {
            setNombre("");
            setImagenFile(null);
            setImagenPreview("");
            setMensaje("");
          }, 2000);
        }
      } catch (error) {
        setMensaje("Ocurrió un error inesperado");
      } finally {
        setGuardando(false);
      }
    };

    const eliminarMarca = async () => {
      if (!marcaEliminar) return;
      setGuardando(true);
      setErrorEliminar("");

      if (numeroCuentaConfirm.trim() !== cuenta?.numero_cuenta) {
        setErrorEliminar("Número de cuenta incorrecto");
        setGuardando(false);
        return;
      }

      try {
        // Eliminar imagen si existe
        if (
          marcaEliminar.img &&
          marcaEliminar.img.includes("imagenes_categorias")
        ) {
          const urlParts = marcaEliminar.img.split("/");
          const nombreArchivo = urlParts[urlParts.length - 1];
          await supabase.storage
            .from("imagenes_categorias")
            .remove([nombreArchivo]);
        }

        const { error } = await supabase
          .from("marcas")
          .delete()
          .eq("id", marcaEliminar.id);

        if (error) {
          setErrorEliminar("Error al eliminar la marca");
        } else {
          setMensaje("Marca eliminada correctamente");
          // Recargar marcas
          const { data } = await supabase
            .from("marcas")
            .select("id, nombre_marca, img")
            .order("nombre_marca", { ascending: true });
          setMarcas(data || []);

          setModoEliminar(false);
          setMarcaEliminar(null);
          setNumeroCuentaConfirm("");
        }
      } catch (error) {
        setErrorEliminar("Ocurrió un error inesperado");
      } finally {
        setGuardando(false);
      }
    };

    return (
      <motion.div
        key="gestionar-marcas"
        className="min-h-screen"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="px-6 py-6">
          <BackBtn onBack={() => setVistaPerfil("menu")} />

          <h2 className="text-xl font-bold text-zinc-900 mb-6">
            Gestionar Marcas
          </h2>

          {/* Pestañas */}
          <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setModoEliminar(false)}
              className={`flex-1 py-3 rounded-lg font-semibold transition ${
                !modoEliminar
                  ? "bg-orange-500 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              Agregar
            </button>
            <button
              onClick={() => setModoEliminar(true)}
              className={`flex-1 py-3 rounded-lg font-semibold transition ${
                modoEliminar
                  ? "bg-red-500 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              Eliminar
            </button>
          </div>

          {!modoEliminar ? (
            /* MODO AGREGAR */
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Imagen
                </label>
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-48 h-48 rounded-lg overflow-hidden border-2 border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center">
                    {imagenPreview ? (
                      <Image
                        src={imagenPreview}
                        alt="Preview"
                        fill
                        className="object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-center text-zinc-400">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-12 h-12 mx-auto mb-2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                          />
                        </svg>
                        <p className="text-sm">Sin imagen</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImagenChange}
                    className="text-sm text-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Nombre de la Marca <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: TRUPER"
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {mensaje && (
                <div
                  className={`mb-4 p-3 rounded-lg text-sm ${
                    mensaje.includes("Error") || mensaje.includes("ingresa")
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-green-50 text-green-700 border border-green-200"
                  }`}
                >
                  {mensaje}
                </div>
              )}

              <button
                onClick={agregarMarca}
                disabled={guardando || !nombre}
                className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {guardando ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                    Guardando...
                  </span>
                ) : (
                  "Agregar Marca"
                )}
              </button>
            </>
          ) : (
            /* MODO ELIMINAR */
            <>
              <p className="text-sm text-zinc-600 mb-4">
                Selecciona una marca para eliminar:
              </p>
              <div className="space-y-2 mb-4">
                {marcas.map((marca) => (
                  <div
                    key={marca.id}
                    onClick={() => setMarcaEliminar(marca)}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition ${
                      marcaEliminar?.id === marca.id
                        ? "border-red-500 bg-red-50"
                        : "border-zinc-200 hover:border-red-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                        <Image
                          src={marca.img || "/placeholder.jpg"}
                          alt={marca.nombre_marca}
                          fill
                          className="object-contain"
                          loading="lazy"
                        />
                      </div>
                      <span className="font-semibold text-zinc-800">
                        {marca.nombre_marca}
                      </span>
                    </div>
                    {marcaEliminar?.id === marca.id && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-6 h-6 text-red-500"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                  </div>
                ))}
              </div>

              {marcaEliminar && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-zinc-700 mb-2">
                      Confirma tu número de cuenta
                    </label>
                    <input
                      type="text"
                      value={numeroCuentaConfirm}
                      onChange={(e) => {
                        setNumeroCuentaConfirm(e.target.value);
                        setErrorEliminar("");
                      }}
                      placeholder="Ingresa tu número de cuenta"
                      className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                      disabled={guardando}
                    />
                    {errorEliminar && (
                      <p className="text-red-500 text-sm mt-2">
                        {errorEliminar}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={eliminarMarca}
                    disabled={guardando || !numeroCuentaConfirm}
                    className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {guardando ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                        Eliminando...
                      </span>
                    ) : (
                      "Eliminar Marca"
                    )}
                  </button>
                </>
              )}

              {mensaje && (
                <div className="mt-4 p-3 rounded-lg text-sm bg-green-50 text-green-700 border border-green-200">
                  {mensaje}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    );
  };

  const GestionarMacroCategoriasView = ({ setVistaPerfil }: any) => {
    const [nombre, setNombre] = useState("");
    const [orden, setOrden] = useState("");
    const [imagenFile, setImagenFile] = useState<File | null>(null);
    const [imagenPreview, setImagenPreview] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState("");
    const [modoEliminar, setModoEliminar] = useState(false);
    const [macroEliminar, setMacroEliminar] = useState<any>(null);
    const [numeroCuentaConfirm, setNumeroCuentaConfirm] = useState("");
    const [errorEliminar, setErrorEliminar] = useState("");

    const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (!file.type.startsWith("image/")) {
          setMensaje("Por favor selecciona un archivo de imagen válido");
          return;
        }
        if (file.size > 800 * 1024) {
          setMensaje("La imagen no debe superar los 800 KB");
          return;
        }

        setImagenFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setImagenPreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    };

    const agregarMacroCategoria = async () => {
      setGuardando(true);
      setMensaje("");

      const nombreNormalizado = nombre.trim().toUpperCase();

      if (!nombreNormalizado || !orden) {
        setMensaje("Por favor completa todos los campos obligatorios");
        setGuardando(false);
        return;
      }

      try {
        let urlImagen = "";

        if (imagenFile) {
          const timestamp = Date.now();
          const extension = imagenFile.name.split(".").pop();
          const nombreArchivo = `macro_categoria_${timestamp}.${extension}`;

          const { error: uploadError } = await supabase.storage
            .from("imagenes_categorias")
            .upload(nombreArchivo, imagenFile, {
              cacheControl: "public, max-age=31536000",
              upsert: true,
            });

          if (uploadError) {
            setMensaje("Error al subir la imagen");
            setGuardando(false);
            return;
          }

          const {
            data: { publicUrl },
          } = supabase.storage
            .from("imagenes_categorias")
            .getPublicUrl(nombreArchivo);
          urlImagen = publicUrl;
        }

        const { error } = await supabase.from("macro_categorias").insert([
          {
            nombre: nombreNormalizado,
            orden: parseInt(orden),
            img: urlImagen,
          },
        ]);

        if (error) {
          console.error(error);
          setMensaje(
            error.code === "23505"
              ? "Ya existe una macro-categoría con ese nombre"
              : "Error al agregar"
          );
        } else {
          setMensaje("Macro-categoría agregada correctamente");

          // Recargar macro-categorías
          const { data } = await supabase
            .from("macro_categorias")
            .select("id, nombre, img, orden")
            .order("orden", { ascending: true });
          setMacroCategorias(data || []);

          setTimeout(() => {
            setNombre("");
            setOrden("");
            setImagenFile(null);
            setImagenPreview("");
            setMensaje("");
          }, 2000);
        }
      } catch (error) {
        setMensaje("Ocurrió un error inesperado");
      } finally {
        setGuardando(false);
      }
    };

    const eliminarMacroCategoria = async () => {
      if (!macroEliminar) return;
      setGuardando(true);
      setErrorEliminar("");

      if (numeroCuentaConfirm.trim() !== cuenta?.numero_cuenta) {
        setErrorEliminar("Número de cuenta incorrecto");
        setGuardando(false);
        return;
      }

      try {
        // Eliminar imagen si existe
        if (
          macroEliminar.img &&
          macroEliminar.img.includes("imagenes_categorias")
        ) {
          const urlParts = macroEliminar.img.split("/");
          const nombreArchivo = urlParts[urlParts.length - 1];
          await supabase.storage
            .from("imagenes_categorias")
            .remove([nombreArchivo]);
        }

        const { error } = await supabase
          .from("macro_categorias")
          .delete()
          .eq("id", macroEliminar.id);

        if (error) {
          setErrorEliminar("Error al eliminar la macro-categoría");
        } else {
          setMensaje("Macro-categoría eliminada correctamente");

          // Recargar macro-categorías
          const { data } = await supabase
            .from("macro_categorias")
            .select("id, nombre, img, orden")
            .order("orden", { ascending: true });
          setMacroCategorias(data || []);

          setModoEliminar(false);
          setMacroEliminar(null);
          setNumeroCuentaConfirm("");
        }
      } catch (error) {
        setErrorEliminar("Ocurrió un error inesperado");
      } finally {
        setGuardando(false);
      }
    };

    return (
      <motion.div
        key="gestionar-macro-categorias"
        className="min-h-screen"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="px-6 py-6">
          <BackBtn onBack={() => setVistaPerfil("menu")} />

          <h2 className="text-xl font-bold text-zinc-900 mb-6">
            Gestionar Categorías
          </h2>

          {/* Pestañas */}
          <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setModoEliminar(false)}
              className={`flex-1 py-3 rounded-lg font-semibold transition ${
                !modoEliminar
                  ? "bg-orange-500 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              Agregar
            </button>
            <button
              onClick={() => setModoEliminar(true)}
              className={`flex-1 py-3 rounded-lg font-semibold transition ${
                modoEliminar
                  ? "bg-red-500 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              Eliminar
            </button>
          </div>

          {!modoEliminar ? (
            /* MODO AGREGAR */
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Imagen
                </label>
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-48 h-48 rounded-lg overflow-hidden border-2 border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center">
                    {imagenPreview ? (
                      <Image
                        src={imagenPreview}
                        alt="Preview"
                        fill
                        className="object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-center text-zinc-400">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-12 h-12 mx-auto mb-2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                          />
                        </svg>
                        <p className="text-sm">Sin imagen</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImagenChange}
                    className="text-sm text-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: HERRAMIENTAS ELÉCTRICAS"
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Orden <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={orden}
                  onChange={(e) => setOrden(e.target.value)}
                  placeholder="1"
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {mensaje && (
                <div
                  className={`mb-4 p-3 rounded-lg text-sm ${
                    mensaje.includes("Error") || mensaje.includes("completa")
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-green-50 text-green-700 border border-green-200"
                  }`}
                >
                  {mensaje}
                </div>
              )}

              <button
                onClick={agregarMacroCategoria}
                disabled={guardando || !nombre || !orden}
                className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {guardando ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                    Guardando...
                  </span>
                ) : (
                  "Agregar Categoría"
                )}
              </button>
            </>
          ) : (
            /* MODO ELIMINAR */
            <>
              <p className="text-sm text-zinc-600 mb-4">
                Selecciona una categoría para eliminar:
              </p>
              <div className="space-y-2 mb-4">
                {macroCategorias.map((macro) => (
                  <div
                    key={macro.id}
                    onClick={() => setMacroEliminar(macro)}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition ${
                      macroEliminar?.id === macro.id
                        ? "border-red-500 bg-red-50"
                        : "border-zinc-200 hover:border-red-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                        <Image
                          src={macro.img || "/placeholder.jpg"}
                          alt={macro.nombre}
                          fill
                          className="object-cover"
                          loading="lazy"
                        />
                      </div>
                      <span className="font-semibold text-zinc-800">
                        {macro.nombre}
                      </span>
                    </div>
                    {macroEliminar?.id === macro.id && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-6 h-6 text-red-500"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                  </div>
                ))}
              </div>

              {macroEliminar && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-zinc-700 mb-2">
                      Confirma tu número de cuenta
                    </label>
                    <input
                      type="text"
                      value={numeroCuentaConfirm}
                      onChange={(e) => {
                        setNumeroCuentaConfirm(e.target.value);
                        setErrorEliminar("");
                      }}
                      placeholder="Ingresa tu número de cuenta"
                      className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                      disabled={guardando}
                    />
                    {errorEliminar && (
                      <p className="text-red-500 text-sm mt-2">
                        {errorEliminar}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={eliminarMacroCategoria}
                    disabled={guardando || !numeroCuentaConfirm}
                    className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {guardando ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                        Eliminando...
                      </span>
                    ) : (
                      "Eliminar Macro-Categoría"
                    )}
                  </button>
                </>
              )}

              {mensaje && (
                <div className="mt-4 p-3 rounded-lg text-sm bg-green-50 text-green-700 border border-green-200">
                  {mensaje}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    );
  };

  const AsignarCategoriasView = ({ setVistaPerfil }: any) => {
    const [categoriaSeleccionada, setCategoriaSeleccionada] =
      useState<any>(null);
    const [macroSeleccionada, setMacroSeleccionada] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState("");

    const asignarMacro = async () => {
      if (!categoriaSeleccionada || !macroSeleccionada) return;

      setGuardando(true);
      setMensaje("");

      try {
        const { error } = await supabase
          .from("categorias")
          .update({ macro_categoria_id: parseInt(macroSeleccionada) })
          .eq("id_categoria", categoriaSeleccionada.id_categoria);

        if (error) {
          setMensaje("Error al asignar categoría");
        } else {
          setMensaje("Asignación exitosa");

          // Recargar categorías
          const { data } = await supabase
            .from("categorias")
            .select(
              "id_categoria, nombre_categoria, img, orden, macro_categoria_id"
            )
            .order("orden", { ascending: true });
          setCategorias(data || []);

          setTimeout(() => {
            setCategoriaSeleccionada(null);
            setMacroSeleccionada("");
            setMensaje("");
          }, 2000);
        }
      } catch (error) {
        setMensaje("Ocurrió un error inesperado");
      } finally {
        setGuardando(false);
      }
    };

    return (
      <motion.div
        key="asignar-categorias"
        className="min-h-screen"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="px-6 py-6">
          <BackBtn onBack={() => setVistaPerfil("menu")} />

          <h2 className="text-xl font-bold text-zinc-900 mb-6">
            Asignar Categorías
          </h2>

          <p className="text-sm text-zinc-600 mb-4">
            Selecciona una Subcategoría para asignarle una Categoría:
          </p>

          <div className="space-y-2 mb-4">
            {categoriasAdmin.map((cat) => (
              <div
                key={cat.id_categoria}
                onClick={() => setCategoriaSeleccionada(cat)}
                className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition ${
                  categoriaSeleccionada?.id_categoria === cat.id_categoria
                    ? "border-orange-500 bg-orange-50"
                    : "border-zinc-200 hover:border-orange-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                    <Image
                      src={cat.img || "/placeholder.jpg"}
                      alt={cat.nombre_categoria}
                      fill
                      className="object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <span className="font-semibold text-zinc-800 block">
                      {cat.nombre_categoria}
                    </span>
                    {cat.macro_categoria_id && (
                      <span className="text-xs text-zinc-500">Ya asignada</span>
                    )}
                  </div>
                </div>
                {categoriaSeleccionada?.id_categoria === cat.id_categoria && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-6 h-6 text-orange-500"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </div>
            ))}
          </div>

          {categoriaSeleccionada && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-zinc-700 mb-2">
                  Selecciona la Categoría
                </label>
                <select
                  value={macroSeleccionada}
                  onChange={(e) => setMacroSeleccionada(e.target.value)}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Seleccionar...</option>
                  {macroCategorias.map((macro) => (
                    <option key={macro.id} value={macro.id}>
                      {macro.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {mensaje && (
                <div
                  className={`mb-4 p-3 rounded-lg text-sm ${
                    mensaje.includes("Error")
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-green-50 text-green-700 border border-green-200"
                  }`}
                >
                  {mensaje}
                </div>
              )}

              <button
                onClick={asignarMacro}
                disabled={guardando || !macroSeleccionada}
                className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {guardando ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                    Asignando...
                  </span>
                ) : (
                  "Asignar Categoría"
                )}
              </button>
            </>
          )}
        </div>
      </motion.div>
    );
  };

  const GestionarBannerView = ({ setVistaPerfil }: any) => {
  const [banners, setBanners] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modoVista, setModoVista] = useState<'lista' | 'agregar' | 'editar'>('lista');
  const [bannerSeleccionado, setBannerSeleccionado] = useState<any>(null);
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [color, setColor] = useState('blue');
  const [guardando, setGuardando] = useState(false);
  const [mensajeInfo, setMensajeInfo] = useState('');

  const coloresDisponibles = [
    { valor: 'blue', nombre: 'Azul (Info)', clase: 'bg-blue-50 border-blue-200 text-blue-800' },
    { valor: 'yellow', nombre: 'Amarillo (Advertencia)', clase: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
    { valor: 'red', nombre: 'Rojo (Importante)', clase: 'bg-red-50 border-red-200 text-red-800' },
    { valor: 'green', nombre: 'Verde (Éxito)', clase: 'bg-green-50 border-green-200 text-green-800' },
  ];

  useEffect(() => {
    cargarBanners();
}, []);

  const cargarBanners = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('banner_anuncios')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBanners(data);
    }
    setCargando(false);
  };

  const limpiarFormulario = () => {
    setTitulo('');
    setMensaje('');
    setColor('blue');
    setMensajeInfo('');
    setBannerSeleccionado(null);
  };

  const agregarBanner = async () => {
    setGuardando(true);
    setMensajeInfo('');

    if (!titulo.trim() || !mensaje.trim()) {
      setMensajeInfo('Por favor completa todos los campos');
      setGuardando(false);
      return;
    }

    try {
      const { error } = await supabase.from('banner_anuncios').insert([
        {
          titulo: titulo.trim(),
          mensaje: mensaje.trim(),
          color: color,
          activo: false,
        },
      ]);

      if (error) {
        setMensajeInfo('Error al agregar el banner');
      } else {
        setMensajeInfo('Banner agregado correctamente');
        await cargarBanners();
        setTimeout(() => {
          limpiarFormulario();
          setModoVista('lista');
        }, 1500);
      }
    } catch (error) {
      setMensajeInfo('Ocurrió un error inesperado');
    } finally {
      setGuardando(false);
    }
  };

  const editarBanner = async () => {
    if (!bannerSeleccionado) return;

    setGuardando(true);
    setMensajeInfo('');

    if (!titulo.trim() || !mensaje.trim()) {
      setMensajeInfo('Por favor completa todos los campos');
      setGuardando(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('banner_anuncios')
        .update({
          titulo: titulo.trim(),
          mensaje: mensaje.trim(),
          color: color,
        })
        .eq('id', bannerSeleccionado.id);

      if (error) {
        setMensajeInfo('Error al actualizar el banner');
      } else {
        setMensajeInfo('Banner actualizado correctamente');
        await cargarBanners();
        setTimeout(() => {
          limpiarFormulario();
          setModoVista('lista');
        }, 1500);
      }
    } catch (error) {
      setMensajeInfo('Ocurrió un error inesperado');
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (bannerId: number, activoActual: boolean) => {
    try {
      // Si se va a activar este banner, desactivar todos los demás
      if (!activoActual) {
        await supabase
          .from('banner_anuncios')
          .update({ activo: false })
          .neq('id', bannerId);
      }

      const { error } = await supabase
        .from('banner_anuncios')
        .update({ activo: !activoActual })
        .eq('id', bannerId);

      if (!error) {
        await cargarBanners();
      }
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    }
  };

  const eliminarBanner = async (bannerId: number) => {
    if (!confirm('¿Estás seguro de eliminar este banner?')) return;

    try {
      const { error } = await supabase
        .from('banner_anuncios')
        .delete()
        .eq('id', bannerId);

      if (!error) {
        await cargarBanners();
      }
    } catch (error) {
      console.error('Error al eliminar:', error);
    }
  };

  const abrirEdicion = (banner: any) => {
    setBannerSeleccionado(banner);
    setTitulo(banner.titulo);
    setMensaje(banner.mensaje);
    setColor(banner.color);
    setModoVista('editar');
  };

  const getClaseColor = (colorValue: string) => {
    const colorObj = coloresDisponibles.find(c => c.valor === colorValue);
    return colorObj?.clase || 'bg-blue-50 border-blue-200 text-blue-800';
  };

  return (
    <motion.div
      key="gestionar-banner"
      className="min-h-screen"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="px-6 py-6">
        <BackBtn
          onBack={() => {
            if (modoVista !== 'lista') {
              limpiarFormulario();
              setModoVista('lista');
            } else {
              setVistaPerfil('menu');
            }
          }}
        />

        <h2 className="text-xl font-bold text-zinc-900 mb-6">
          Gestionar Banner de Anuncios
        </h2>

        {/* VISTA LISTA */}
        {modoVista === 'lista' && (
          <>
            <button
              onClick={() => setModoVista('agregar')}
              className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition mb-4"
            >
              + Agregar Nuevo Anuncio
            </button>

            {cargando ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {banners.map((banner) => (
                  <div
                    key={banner.id}
                    className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <p className="font-bold text-zinc-900 text-lg">{banner.titulo}</p>
                        <p className="text-sm text-zinc-600 mt-1">{banner.mensaje}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-3">
                        <input
                          type="checkbox"
                          checked={banner.activo}
                          onChange={() => toggleActivo(banner.id, banner.activo)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-green-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:w-5 after:h-5 after:rounded-full after:transition-all peer-checked:after:translate-x-full"></div>
                      </label>
                    </div>

                    <div className={`p-2 rounded-lg mb-3 ${getClaseColor(banner.color)}`}>
                      <p className="text-xs font-semibold">Vista previa</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => abrirEdicion(banner)}
                        className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminarBanner(banner.id)}
                        className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}

                {banners.length === 0 && (
                  <p className="text-center text-zinc-500 py-10">
                    No hay banners registrados
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* VISTA AGREGAR/EDITAR */}
        {(modoVista === 'agregar' || modoVista === 'editar') && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Cierre por día festivo"
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Mensaje <span className="text-red-500">*</span>
              </label>
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Descripción del anuncio"
                rows={3}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Color del Banner
              </label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {coloresDisponibles.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Vista previa */}
            {titulo || mensaje ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Vista Previa
                </label>
                <div className={`rounded-xl p-4 border-2 ${getClaseColor(color)}`}>
                  <div className="flex items-start gap-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-6 h-6 flex-shrink-0"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"
                      />
                    </svg>
                    <div>
                      <p className="font-bold text-sm">{titulo || 'Título del anuncio'}</p>
                      <p className="text-xs mt-1">{mensaje || 'Mensaje del anuncio'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {mensajeInfo && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm ${
                  mensajeInfo.includes('Error')
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}
              >
                {mensajeInfo}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  limpiarFormulario();
                  setModoVista('lista');
                }}
                disabled={guardando}
                className="flex-1 border border-zinc-300 py-3 rounded-xl font-semibold text-zinc-600 hover:bg-zinc-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={modoVista === 'agregar' ? agregarBanner : editarBanner}
                disabled={guardando || !titulo || !mensaje}
                className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {guardando ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                    Guardando...
                  </span>
                ) : (
                  modoVista === 'agregar' ? 'Agregar Banner' : 'Guardar Cambios'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

  const GestionarCuentasView = ({ setVistaPerfil }: any) => {
    const [cuentas, setCuentas] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    const [modoVista, setModoVista] = useState<"lista" | "agregar" | "editar">(
      "lista"
    );
    const [cuentaSeleccionada, setCuentaSeleccionada] = useState<any>(null);
    const [numeroCuenta, setNumeroCuenta] = useState("");
    const [cliente, setCliente] = useState("");
    const [ferreteria, setFerreteria] = useState("");
    const [direccion, setDireccion] = useState("");
    const [numeroTel, setNumeroTel] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState("");
    const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
    const [numeroCuentaConfirm, setNumeroCuentaConfirm] = useState("");
    const [errorEliminar, setErrorEliminar] = useState("");
    const [eliminando, setEliminando] = useState(false);
    const [entregaMismoDia, setEntregaMismoDia] = useState(false);
    const [horarios, setHorarios] = useState<any[]>([
      {
        dia: 0,
        nombre: "Domingo",
        hora_inicio: "",
        hora_fin: "",
        cerrado: true,
      },
      {
        dia: 1,
        nombre: "Lunes",
        hora_inicio: "",
        hora_fin: "",
        cerrado: false,
      },
      {
        dia: 2,
        nombre: "Martes",
        hora_inicio: "",
        hora_fin: "",
        cerrado: false,
      },
      {
        dia: 3,
        nombre: "Miércoles",
        hora_inicio: "",
        hora_fin: "",
        cerrado: false,
      },
      {
        dia: 4,
        nombre: "Jueves",
        hora_inicio: "",
        hora_fin: "",
        cerrado: false,
      },
      {
        dia: 5,
        nombre: "Viernes",
        hora_inicio: "",
        hora_fin: "",
        cerrado: false,
      },
      {
        dia: 6,
        nombre: "Sábado",
        hora_inicio: "",
        hora_fin: "",
        cerrado: false,
      },
    ]);
    const [tieneSaldoPendiente, setTieneSaldoPendiente] = useState(false);
    const [documentosPendientes, setDocumentosPendientes] = useState<any[]>([]);
    const [nuevoDocumento, setNuevoDocumento] = useState({
      tipo: "nota",
      numero: "",
      monto: "",
    });

    useEffect(() => {
      cargarCuentas();
    }, []);

    const cargarCuentas = async () => {
      setCargando(true);
      const { data, error } = await supabase
        .from("cuentas")
        .select("*")
        .order("numero_cuenta", { ascending: true });

      if (!error && data) {
        setCuentas(data);
      }
      setCargando(false);
    };

    const limpiarFormulario = () => {
      setNumeroCuenta("");
      setCliente("");
      setFerreteria("");
      setDireccion("");
      setNumeroTel("");
      setMensaje("");
      setCuentaSeleccionada(null);
      setTieneSaldoPendiente(false);
      setDocumentosPendientes([]);
      setNuevoDocumento({ tipo: "nota", numero: "", monto: "" });
      setHorarios([
        {
          dia: 0,
          nombre: "Domingo",
          hora_inicio: "",
          hora_fin: "",
          cerrado: true,
        },
        {
          dia: 1,
          nombre: "Lunes",
          hora_inicio: "",
          hora_fin: "",
          cerrado: false,
        },
        {
          dia: 2,
          nombre: "Martes",
          hora_inicio: "",
          hora_fin: "",
          cerrado: false,
        },
        {
          dia: 3,
          nombre: "Miércoles",
          hora_inicio: "",
          hora_fin: "",
          cerrado: false,
        },
        {
          dia: 4,
          nombre: "Jueves",
          hora_inicio: "",
          hora_fin: "",
          cerrado: false,
        },
        {
          dia: 5,
          nombre: "Viernes",
          hora_inicio: "",
          hora_fin: "",
          cerrado: false,
        },
        {
          dia: 6,
          nombre: "Sábado",
          hora_inicio: "",
          hora_fin: "",
          cerrado: false,
        },
      ]);
    };

    const agregarCuenta = async () => {
      setGuardando(true);
      setMensaje("");

      if (!numeroCuenta.trim()) {
        setMensaje("El número de cuenta es obligatorio");
        setGuardando(false);
        return;
      }

      try {
        const { error } = await supabase.from("cuentas").insert([
          {
            numero_cuenta: numeroCuenta.trim(),
            cliente: cliente.trim() || null,
            ferreteria: ferreteria.trim() || null,
            direccion: direccion.trim() || null,
            numero_tel: numeroTel.trim() || null,
            entrega_mismo_dia: false,
          },
        ]);

        if (error) {
          if (error.code === "23505") {
            setMensaje("Ya existe una cuenta con ese número");
          } else {
            setMensaje("Error al agregar la cuenta");
          }
        } else {
          setMensaje("Cuenta agregada correctamente");
          await cargarCuentas();
          setTimeout(() => {
            limpiarFormulario();
            setModoVista("lista");
          }, 1500);
        }
      } catch (error) {
        setMensaje("Ocurrió un error inesperado");
      } finally {
        setGuardando(false);
      }
    };

    const editarCuenta = async () => {
      if (!cuentaSeleccionada) return;

      if (!numeroCuenta.trim()) {
        setMensaje("El número de cuenta es obligatorio");
        return;
      }

      setGuardando(true);
      setMensaje("");

      try {
        // Actualizar información de la cuenta
        const { error } = await supabase
          .from("cuentas")
          .update({
            numero_cuenta: numeroCuenta.trim(),
            cliente: cliente.trim() || null,
            ferreteria: ferreteria.trim() || null,
            direccion: direccion.trim() || null,
            numero_tel: numeroTel.trim() || null,
            entrega_mismo_dia: entregaMismoDia,
            tiene_saldo_pendiente: tieneSaldoPendiente,
          })
          .eq("id", cuentaSeleccionada.id);

        if (error) {
          if (error.code === "23505") {
            setMensaje("Ya existe una cuenta con ese número");
          } else {
            setMensaje("Error al actualizar la cuenta");
          }
          setGuardando(false);
          return;
        }

        // Actualizar horarios (código existente)
        const { error: deleteError } = await supabase
          .from("horarios_recepcion")
          .delete()
          .eq("cuenta_id", cuentaSeleccionada.id);

        if (deleteError) {
          console.error("Error eliminando horarios:", deleteError);
        }

        const horariosParaInsertar = horarios
          .filter((h) => !h.cerrado && h.hora_inicio && h.hora_fin)
          .map((h) => ({
            cuenta_id: cuentaSeleccionada.id,
            dia_semana: h.dia,
            hora_inicio: h.hora_inicio,
            hora_fin: h.hora_fin,
            cerrado: false,
          }));

        if (horariosParaInsertar.length > 0) {
          const { error: insertError } = await supabase
            .from("horarios_recepcion")
            .insert(horariosParaInsertar);

          if (insertError) {
            console.error("Error insertando horarios:", insertError);
          }
        }

        const diasCerrados = horarios
          .filter((h) => h.cerrado)
          .map((h) => ({
            cuenta_id: cuentaSeleccionada.id,
            dia_semana: h.dia,
            hora_inicio: null,
            hora_fin: null,
            cerrado: true,
          }));

        if (diasCerrados.length > 0) {
          await supabase.from("horarios_recepcion").insert(diasCerrados);
        }

        // Gestionar documentos pendientes
        if (tieneSaldoPendiente) {
          // Eliminar documentos anteriores
          await supabase
            .from("documentos_pendientes")
            .delete()
            .eq("cuenta_id", cuentaSeleccionada.id);

          // Insertar nuevos documentos
          if (documentosPendientes.length > 0) {
            const docsParaInsertar = documentosPendientes.map((doc) => ({
              cuenta_id: cuentaSeleccionada.id,
              tipo_documento: doc.tipo_documento,
              numero_documento: doc.numero_documento,
              monto: parseFloat(doc.monto),
              pagado: false,
            }));

            const { error: docsError } = await supabase
              .from("documentos_pendientes")
              .insert(docsParaInsertar);

            if (docsError) {
              console.error("Error insertando documentos:", docsError);
            }
          }
        } else {
          // Si ya no tiene saldo pendiente, eliminar todos los documentos
          await supabase
            .from("documentos_pendientes")
            .delete()
            .eq("cuenta_id", cuentaSeleccionada.id);
        }

        setMensaje("Cuenta actualizada correctamente");
        await cargarCuentas();
        setTimeout(() => {
          limpiarFormulario();
          setModoVista("lista");
        }, 1500);
      } catch (err) {
        console.error("Error en editarCuenta:", err);
        setMensaje("Ocurrió un error inesperado");
      } finally {
        setGuardando(false);
      }
    };

    const eliminarCuenta = async () => {
      if (!cuentaSeleccionada) return;

      setEliminando(true);
      setErrorEliminar("");

      if (numeroCuentaConfirm.trim() !== cuentaSeleccionada.numero_cuenta) {
        setErrorEliminar("Número de cuenta incorrecto");
        setEliminando(false);
        return;
      }

      try {
        const { error } = await supabase
          .from("cuentas")
          .delete()
          .eq("id", cuentaSeleccionada.id);

        if (error) {
          setErrorEliminar("Error al eliminar la cuenta");
        } else {
          setMensaje("Cuenta eliminada correctamente");
          await cargarCuentas();
          setMostrarModalEliminar(false);
          limpiarFormulario();
          setModoVista("lista");
        }
      } catch (error) {
        setErrorEliminar("Ocurrió un error inesperado");
      } finally {
        setEliminando(false);
      }
    };

    const abrirEdicion = async (cuentaItem: any) => {
      setCuentaSeleccionada(cuentaItem);
      setNumeroCuenta(cuentaItem.numero_cuenta);
      setCliente(cuentaItem.cliente || "");
      setFerreteria(cuentaItem.ferreteria || "");
      setDireccion(cuentaItem.direccion || "");
      setNumeroTel(cuentaItem.numero_tel ? String(cuentaItem.numero_tel) : "");
      setEntregaMismoDia(cuentaItem.entrega_mismo_dia || false);
      setModoVista("editar");
      setTieneSaldoPendiente(cuentaItem.tiene_saldo_pendiente || false);

      // Cargar horarios de la base de datos
      try {
        const { data: horariosData, error } = await supabase
          .from("horarios_recepcion")
          .select("*")
          .eq("cuenta_id", cuentaItem.id)
          .order("dia_semana", { ascending: true });

        if (error) {
          console.error("Error cargando horarios:", error);
        }

        if (horariosData && horariosData.length > 0) {
          const horariosMap = new Map(
            horariosData.map((h: any) => [h.dia_semana, h])
          );
          setHorarios([
            {
              dia: 0,
              nombre: "Domingo",
              hora_inicio: "",
              hora_fin: "",
              cerrado: true,
              ...horariosMap.get(0),
            },
            {
              dia: 1,
              nombre: "Lunes",
              hora_inicio: "",
              hora_fin: "",
              cerrado: false,
              ...horariosMap.get(1),
            },
            {
              dia: 2,
              nombre: "Martes",
              hora_inicio: "",
              hora_fin: "",
              cerrado: false,
              ...horariosMap.get(2),
            },
            {
              dia: 3,
              nombre: "Miércoles",
              hora_inicio: "",
              hora_fin: "",
              cerrado: false,
              ...horariosMap.get(3),
            },
            {
              dia: 4,
              nombre: "Jueves",
              hora_inicio: "",
              hora_fin: "",
              cerrado: false,
              ...horariosMap.get(4),
            },
            {
              dia: 5,
              nombre: "Viernes",
              hora_inicio: "",
              hora_fin: "",
              cerrado: false,
              ...horariosMap.get(5),
            },
            {
              dia: 6,
              nombre: "Sábado",
              hora_inicio: "",
              hora_fin: "",
              cerrado: false,
              ...horariosMap.get(6),
            },
          ]);
        } else {
          // Si no hay horarios, usar valores por defecto
          setHorarios([
            {
              dia: 0,
              nombre: "Domingo",
              hora_inicio: "",
              hora_fin: "",
              cerrado: true,
            },
            {
              dia: 1,
              nombre: "Lunes",
              hora_inicio: "",
              hora_fin: "",
              cerrado: false,
            },
            {
              dia: 2,
              nombre: "Martes",
              hora_inicio: "",
              hora_fin: "",
              cerrado: false,
            },
            {
              dia: 3,
              nombre: "Miércoles",
              hora_inicio: "",
              hora_fin: "",
              cerrado: false,
            },
            {
              dia: 4,
              nombre: "Jueves",
              hora_inicio: "",
              hora_fin: "",
              cerrado: false,
            },
            {
              dia: 5,
              nombre: "Viernes",
              hora_inicio: "",
              hora_fin: "",
              cerrado: false,
            },
            {
              dia: 6,
              nombre: "Sábado",
              hora_inicio: "",
              hora_fin: "",
              cerrado: false,
            },
          ]);
        }

        const { data: docsData, error: docsError } = await supabase
          .from("documentos_pendientes")
          .select("*")
          .eq("cuenta_id", cuentaItem.id)
          .eq("pagado", false)
          .order("created_at", { ascending: false });

        if (!docsError && docsData) {
          setDocumentosPendientes(docsData);
        }
      } catch (error) {
        console.error("Error en abrirEdicion:", error);
      }
    };

    return (
      <motion.div
        key="gestionar-cuentas"
        className="min-h-screen"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="px-6 py-6">
          <BackBtn
            onBack={() => {
              if (modoVista !== "lista") {
                limpiarFormulario();
                setModoVista("lista");
              } else {
                setVistaPerfil("menu");
              }
            }}
          /> 

          <h2 className="text-xl font-bold text-zinc-900 mb-6">
            Gestionar Cuentas
          </h2>

          {/* VISTA LISTA */}
          {modoVista === "lista" && (
            <>
              <button
                onClick={() => setModoVista("agregar")}
                className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition mb-4"
              >
                + Agregar Nueva Cuenta
              </button>

              {cargando ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {cuentas.map((cuentaItem) => (
                    <div
                      key={cuentaItem.id}
                      onClick={() => abrirEdicion(cuentaItem)}
                      className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm cursor-pointer hover:bg-zinc-50 transition"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          {cuentaItem.cliente &&
                          cuentaItem.cliente !== "null" ? (
                            <p className="font-bold text-zinc-900 text-lg">
                              {cuentaItem.cliente}
                            </p>
                          ) : (
                            <p className="text-zinc-500 text-sm italic">
                              Sin nombre de cliente
                            </p>
                          )}

                          {cuentaItem.ferreteria && (
                            <p className="text-sm text-zinc-500 mt-1">
                              {cuentaItem.ferreteria}
                            </p>
                          )}
                          {cuentaItem.numero_tel && (
                            <p className="text-xs text-zinc-400 mt-1">
                              Tel. {cuentaItem.numero_tel}
                            </p>
                          )}
                        </div>
                        <span className="text-zinc-400">›</span>
                      </div>
                    </div>
                  ))}

                  {cuentas.length === 0 && (
                    <p className="text-center text-zinc-500 py-10">
                      No hay cuentas registradas
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* VISTA AGREGAR */}
          {modoVista === "agregar" && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Número de Cuenta <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={numeroCuenta}
                  onChange={(e) => setNumeroCuenta(e.target.value)}
                  placeholder="Ej: C001"
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Nombre del Cliente
                </label>
                <input
                  type="text"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Ferretería
                </label>
                <input
                  type="text"
                  value={ferreteria}
                  onChange={(e) => setFerreteria(e.target.value)}
                  placeholder="Nombre del negocio"
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Dirección
                </label>
                <textarea
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Dirección completa"
                  rows={3}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={numeroTel}
                  onChange={(e) => setNumeroTel(e.target.value)}
                  placeholder="Número de teléfono"
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {mensaje && (
                <div
                  className={`mb-4 p-3 rounded-lg text-sm ${
                    mensaje.includes("Error") || mensaje.includes("obligatorio")
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-green-50 text-green-700 border border-green-200"
                  }`}
                >
                  {mensaje}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    limpiarFormulario();
                    setModoVista("lista");
                  }}
                  disabled={guardando}
                  className="flex-1 border border-zinc-300 py-3 rounded-xl font-semibold text-zinc-600 hover:bg-zinc-50 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={agregarCuenta}
                  disabled={guardando || !numeroCuenta}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {guardando ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                      Guardando...
                    </span>
                  ) : (
                    "Agregar Cuenta"
                  )}
                </button>
              </div>
            </>
          )}

          {/* VISTA EDITAR */}
          {modoVista === "editar" && cuentaSeleccionada && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Número de Cuenta
                </label>
                <input
                  type="text"
                  value={numeroCuenta}
                  onChange={(e) => setNumeroCuenta(e.target.value)}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Nombre del Cliente
                </label>
                <input
                  type="text"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Ferretería
                </label>
                <input
                  type="text"
                  value={ferreteria}
                  onChange={(e) => setFerreteria(e.target.value)}
                  placeholder="Nombre del negocio"
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Dirección
                </label>
                <textarea
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Dirección completa"
                  rows={3}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Sección de Horarios de Recepción - Solo si entrega_mismo_dia está activo */}

              <div className="mb-4">
                <label className="block text-sm font-semibold text-zinc-700 mb-3">
                  Horarios de Recepción de Pedidos
                </label>
                <p className="text-xs text-zinc-500 mb-3">
                  Define los horarios en los que esta cuenta puede recibir
                  pedidos\
                </p>

                <div className="space-y-2">
                  {horarios.map((horario, index) => (
                    <div
                      key={horario.dia}
                      className="bg-white border border-zinc-200 rounded-lg p-3"
                    >
                      {/* Encabezado del día */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-zinc-800 text-sm">
                          {horario.nombre}
                        </span>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-xs text-zinc-500">Cerrado</span>
                          <input
                            type="checkbox"
                            checked={horario.cerrado}
                            onChange={(e) => {
                              const nuevosHorarios = [...horarios];
                              nuevosHorarios[index].cerrado = e.target.checked;
                              if (e.target.checked) {
                                nuevosHorarios[index].hora_inicio = "";
                                nuevosHorarios[index].hora_fin = "";
                              }
                              setHorarios(nuevosHorarios);
                            }}
                            className="w-4 h-4 accent-orange-500"
                          />
                        </label>
                      </div>

                      {/* Inputs de horarios */}
                      {!horario.cerrado && (
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <label className="block text-xs text-zinc-500 mb-1">
                              Apertura
                            </label>
                            <input
                              type="time"
                              value={horario.hora_inicio}
                              onChange={(e) => {
                                const nuevosHorarios = [...horarios];
                                nuevosHorarios[index].hora_inicio =
                                  e.target.value;
                                setHorarios(nuevosHorarios);
                              }}
                              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <span className="text-zinc-400 mt-5">-</span>
                          <div className="flex-1">
                            <label className="block text-xs text-zinc-500 mb-1">
                              Cierre
                            </label>
                            <input
                              type="time"
                              value={horario.hora_fin}
                              onChange={(e) => {
                                const nuevosHorarios = [...horarios];
                                nuevosHorarios[index].hora_fin = e.target.value;
                                setHorarios(nuevosHorarios);
                              }}
                              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                        </div>
                      )}

                      {/* Mensaje de cerrado */}
                      {horario.cerrado && (
                        <p className="text-xs text-zinc-400 italic">
                          No se reciben pedidos este día
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={numeroTel}
                  onChange={(e) => setNumeroTel(e.target.value)}
                  placeholder="Número de teléfono"
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={entregaMismoDia}
                    onChange={(e) => setEntregaMismoDia(e.target.checked)}
                    className="w-5 h-5 accent-orange-500"
                  />
                  <span className="text-sm font-medium text-zinc-700">
                    Entrega el mismo día (antes de 10 AM)
                  </span>
                </label>
                <p className="text-xs text-zinc-500 mt-1 ml-7">
                  Si está activo, el cliente verá un contador para pedidos antes
                  de las 10 AM
                </p>
              </div>
              {/* Toggle de Saldo Pendiente */}
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tieneSaldoPendiente}
                    onChange={(e) => setTieneSaldoPendiente(e.target.checked)}
                    className="w-5 h-5 accent-orange-500"
                  />
                  <span className="text-sm font-medium text-zinc-700">
                    Tiene saldo pendiente de pago
                  </span>
                </label>
                <p className="text-xs text-zinc-500 mt-1 ml-7">
                  Al activar, la cuenta no podrá realizar pedidos hasta liquidar
                </p>
              </div>

              {/* Gestión de Documentos Pendientes */}
              {tieneSaldoPendiente && (
                <div className="mb-4 border-2 border-red-200 rounded-xl p-4 bg-red-50">
                  <h4 className="text-sm font-bold text-red-800 mb-3">
                    Documentos Pendientes de Pago
                  </h4>

                  {/* Lista de documentos existentes */}
                  {documentosPendientes.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {documentosPendientes.map((doc, index) => (
                        <div
                          key={doc.id || index}
                          className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-300"
                        >
                          <div className="flex-1">
                            <span className="inline-block px-2 py-1 rounded text-xs font-semibold mr-2 bg-red-100 text-red-800">
                              {doc.tipo_documento.toUpperCase()}
                            </span>
                            <span className="text-sm font-medium text-zinc-800">
                              #{doc.numero_documento}
                            </span>
                            <p className="text-xs text-zinc-600 mt-1">
                              Monto: ${parseFloat(doc.monto).toFixed(2)}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setDocumentosPendientes((prev) =>
                                prev.filter((d) => d.id !== doc.id)
                              );
                            }}
                            className="text-red-600 hover:text-red-800 transition"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ))}

                      {/* Total */}
                      <div className="bg-red-100 rounded-lg p-3 border-2 border-red-400">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-red-900">
                            Total Adeudo:
                          </span>
                          <span className="text-lg font-bold text-red-900">
                            $
                            {documentosPendientes
                              .reduce(
                                (sum, doc) => sum + parseFloat(doc.monto),
                                0
                              )
                              .toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Formulario para agregar nuevo documento */}
                  <div className="bg-white rounded-lg p-3 border border-red-300">
                    <p className="text-xs font-semibold text-zinc-700 mb-2">
                      Agregar documento pendiente
                    </p>

                    <div className="space-y-2">
                      {/* Tipo de documento */}
                      <div>
                        <label className="block text-xs text-zinc-600 mb-1">
                          Tipo de documento
                        </label>
                        <select
                          value={nuevoDocumento.tipo}
                          onChange={(e) =>
                            setNuevoDocumento((prev) => ({
                              ...prev,
                              tipo: e.target.value,
                            }))
                          }
                          className="w-full border border-zinc-300 rounded-lg px-2 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option value="nota">Nota</option>
                          <option value="factura">Factura</option>
                        </select>
                      </div>

                      {/* Número de documento */}
                      <div>
                        <label className="block text-xs text-zinc-600 mb-1">
                          Número de documento
                        </label>
                        <input
                          type="text"
                          value={nuevoDocumento.numero}
                          onChange={(e) =>
                            setNuevoDocumento((prev) => ({
                              ...prev,
                              numero: e.target.value,
                            }))
                          }
                          placeholder="Ej: 12345"
                          className="w-full border border-zinc-300 rounded-lg px-2 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>

                      {/* Monto */}
                      <div>
                        <label className="block text-xs text-zinc-600 mb-1">
                          Monto
                        </label>
                        <div className="relative">
                          <span className="absolute left-2 top-2 text-zinc-500 text-sm">
                            $
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={nuevoDocumento.monto}
                            onChange={(e) =>
                              setNuevoDocumento((prev) => ({
                                ...prev,
                                monto: e.target.value,
                              }))
                            }
                            placeholder="0.00"
                            className="w-full border border-zinc-300 rounded-lg pl-6 pr-2 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                      </div>

                      {/* Botón agregar */}
                      <button
                        onClick={() => {
                          if (!nuevoDocumento.numero || !nuevoDocumento.monto) {
                            alert("Por favor completa todos los campos");
                            return;
                          }

                          setDocumentosPendientes((prev) => [
                            ...prev,
                            {
                              id: Date.now(), // ID temporal
                              tipo_documento: nuevoDocumento.tipo,
                              numero_documento: nuevoDocumento.numero,
                              monto: nuevoDocumento.monto,
                              pagado: false,
                            },
                          ]);

                          // Limpiar formulario
                          setNuevoDocumento({
                            tipo: "nota",
                            numero: "",
                            monto: "",
                          });
                        }}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="w-4 h-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 4.5v15m7.5-7.5h-15"
                          />
                        </svg>
                        Agregar Documento
                      </button>
                    </div>
                  </div>

                  {/* Advertencia */}
                  <div className="mt-3 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                    <div className="flex gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-5 h-5 text-yellow-600 flex-shrink-0"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                        />
                      </svg>
                      <p className="text-xs text-yellow-800">
                        Esta cuenta no podrá realizar pedidos hasta que se
                        liquiden todos los documentos pendientes
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {mensaje && (
                <div
                  className={`mb-4 p-3 rounded-lg text-sm ${
                    mensaje.includes("Error")
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-green-50 text-green-700 border border-green-200"
                  }`}
                >
                  {mensaje}
                </div>
              )}

              <div className="space-y-3">
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      limpiarFormulario();
                      setModoVista("lista");
                    }}
                    disabled={guardando}
                    className="flex-1 border border-zinc-300 py-3 rounded-xl font-semibold text-zinc-600 hover:bg-zinc-50 transition disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={editarCuenta}
                    disabled={guardando}
                    className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {guardando ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                        Guardando...
                      </span>
                    ) : (
                      "Guardar Cambios"
                    )}
                  </button>
                </div>

                <button
                  onClick={() => setMostrarModalEliminar(true)}
                  disabled={guardando}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                  Eliminar Cuenta
                </button>
              </div>
            </>
          )}
        </div>

        {/* Modal de Confirmación para Eliminar */}
        {mostrarModalEliminar && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl w-[90%] max-w-md p-6 shadow-2xl"
            >
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-8 h-8 text-red-600"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>

              <h3 className="text-xl font-bold text-zinc-900 text-center mb-2">
                ¿Eliminar Cuenta?
              </h3>

              <p className="text-sm text-zinc-600 text-center mb-6">
                Esta acción no se puede deshacer. La cuenta será eliminada
                permanentemente.
              </p>

              <div className="bg-zinc-50 rounded-lg p-3 mb-4 border border-zinc-200">
                <p className="text-xs text-zinc-500 mb-1">Cuenta a eliminar:</p>
                <p className="text-sm font-semibold text-zinc-900">
                  {cuentaSeleccionada?.numero_cuenta}
                </p>
                {cuentaSeleccionada?.cliente && (
                  <p className="text-xs text-zinc-500 mt-1">
                    {cuentaSeleccionada.cliente}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-zinc-700 mb-2">
                  Confirma el número de cuenta para continuar
                </label>
                <input
                  type="text"
                  value={numeroCuentaConfirm}
                  onChange={(e) => {
                    setNumeroCuentaConfirm(e.target.value);
                    setErrorEliminar("");
                  }}
                  placeholder="Ingresa tu número de cuenta"
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={eliminando}
                />
                {errorEliminar && (
                  <p className="text-red-500 text-sm mt-2">{errorEliminar}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setMostrarModalEliminar(false);
                    setNumeroCuentaConfirm("");
                    setErrorEliminar("");
                  }}
                  disabled={eliminando}
                  className="flex-1 border border-zinc-300 py-3 rounded-xl font-semibold text-zinc-600 hover:bg-zinc-50 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={eliminarCuenta}
                  disabled={eliminando || !numeroCuentaConfirm}
                  className="flex-1 bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {eliminando ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                      Eliminando...
                    </span>
                  ) : (
                    "Eliminar"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    );
  };

  // Componente para gestionar categorías
  const GestionarCategoriasView = ({ setVistaPerfil }: any) => {
    const [nombre, setNombre] = useState("");
    const [orden, setOrden] = useState("");
    const [imagenFile, setImagenFile] = useState<File | null>(null);
    const [imagenPreview, setImagenPreview] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState("");
    const [modoEliminar, setModoEliminar] = useState(false);
    const [categoriaEliminar, setCategoriaEliminar] = useState<any>(null);
    const [numeroCuentaConfirm, setNumeroCuentaConfirm] = useState("");
    const [errorEliminar, setErrorEliminar] = useState("");

    const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (!file.type.startsWith("image/")) {
          setMensaje("Por favor selecciona un archivo de imagen válido");
          return;
        }
        if (file.size > 800 * 1024) {
          setMensaje("La imagen no debe superar los 800 KB");
          return;
        }

        setImagenFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setImagenPreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    };

    const agregarCategoria = async () => {
      setGuardando(true);
      setMensaje("");

      const nombreNormalizado = nombre.trim().toUpperCase();

      if (!nombreNormalizado || !orden) {
        setMensaje("Por favor completa todos los campos obligatorios");
        setGuardando(false);
        return;
      }

      try {
        let urlImagen = "";

        if (imagenFile) {
          const timestamp = Date.now();
          const extension = imagenFile.name.split(".").pop();
          const nombreArchivo = `categoria_${timestamp}.${extension}`;

          const { error: uploadError } = await supabase.storage
            .from("imagenes_categorias")
            .upload(nombreArchivo, imagenFile, {
              cacheControl: "public, max-age=31536000",
              upsert: true,
            });

          if (uploadError) {
            setMensaje("Error al subir la imagen");
            setGuardando(false);
            return;
          }

          const {
            data: { publicUrl },
          } = supabase.storage
            .from("imagenes_categorias")
            .getPublicUrl(nombreArchivo);
          urlImagen = publicUrl;
        }

        const { error } = await supabase.from("categorias").insert([
          {
            nombre_categoria: nombreNormalizado,
            orden: parseInt(orden),
            img: urlImagen,
          },
        ]);

        if (error) {
          console.error(error);
          setMensaje(error.message);
        } else {
          setMensaje("Categoría agregada correctamente");
          // Recargar categorías
          const { data } = await supabase
            .from("categorias")
            .select("id_categoria, nombre_categoria, img, orden")
            .order("orden", { ascending: true });
          setCategorias(data || []);

          setTimeout(() => {
            setNombre("");
            setOrden("");
            setImagenFile(null);
            setImagenPreview("");
            setMensaje("");
          }, 2000);
        }
      } catch (error) {
        setMensaje("Ocurrió un error inesperado");
      } finally {
        setGuardando(false);
      }
    };

    const eliminarCategoria = async () => {
      if (!categoriaEliminar) return;
      setGuardando(true);
      setErrorEliminar("");

      if (numeroCuentaConfirm.trim() !== cuenta?.numero_cuenta) {
        setErrorEliminar("Número de cuenta incorrecto");
        setGuardando(false);
        return;
      }

      try {
        // Eliminar imagen si existe
        if (
          categoriaEliminar.img &&
          categoriaEliminar.img.includes("imagenes_categorias")
        ) {
          const urlParts = categoriaEliminar.img.split("/");
          const nombreArchivo = urlParts[urlParts.length - 1];
          await supabase.storage
            .from("imagenes_categorias")
            .remove([nombreArchivo]);
        }

        const { error } = await supabase
          .from("categorias")
          .delete()
          .eq("id_categoria", categoriaEliminar.id_categoria);

        if (error) {
          setErrorEliminar("Error al eliminar la categoría");
        } else {
          setMensaje("Categoría eliminada correctamente");
          // Recargar categorías
          const { data } = await supabase
            .from("categorias")
            .select("id_categoria, nombre_categoria, img, orden")
            .order("orden", { ascending: true });
          setCategorias(data || []);

          setModoEliminar(false);
          setCategoriaEliminar(null);
          setNumeroCuentaConfirm("");
        }
      } catch (error) {
        setErrorEliminar("Ocurrió un error inesperado");
      } finally {
        setGuardando(false);
      }
    };

    return (
      <motion.div
        key="gestionar-categorias"
        className="min-h-screen"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="px-6 py-6">
          <BackBtn onBack={() => setVistaPerfil("menu")} />

          <h2 className="text-xl font-bold text-zinc-900 mb-6">
            Gestionar Subcategorías
          </h2>

          {/* Pestañas */}
          <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setModoEliminar(false)}
              className={`flex-1 py-3 rounded-lg font-semibold transition ${
                !modoEliminar
                  ? "bg-orange-500 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              Agregar
            </button>
            <button
              onClick={() => setModoEliminar(true)}
              className={`flex-1 py-3 rounded-lg font-semibold transition ${
                modoEliminar
                  ? "bg-red-500 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              Eliminar
            </button>
          </div>

          {!modoEliminar ? (
            /* MODO AGREGAR */
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Imagen
                </label>
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-48 h-48 rounded-lg overflow-hidden border-2 border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center">
                    {imagenPreview ? (
                      <Image
                        src={imagenPreview}
                        alt="Preview"
                        fill
                        className="object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-center text-zinc-400">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-12 h-12 mx-auto mb-2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                          />
                        </svg>
                        <p className="text-sm">Sin imagen</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImagenChange}
                    className="text-sm text-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: HERRAMIENTAS"
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Orden <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={orden}
                  onChange={(e) => setOrden(e.target.value)}
                  placeholder="1"
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {mensaje && (
                <div
                  className={`mb-4 p-3 rounded-lg text-sm ${
                    mensaje.includes("Error") || mensaje.includes("completa")
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-green-50 text-green-700 border border-green-200"
                  }`}
                >
                  {mensaje}
                </div>
              )}

              <button
                onClick={agregarCategoria}
                disabled={guardando || !nombre || !orden}
                className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {guardando ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                    Guardando...
                  </span>
                ) : (
                  "Agregar Categoría"
                )}
              </button>
            </>
          ) : (
            /* MODO ELIMINAR */
            <>
              <p className="text-sm text-zinc-600 mb-4">
                Selecciona una categoría para eliminar:
              </p>
              <div className="space-y-2 mb-4">
                {categoriasAdmin.map((cat) => (
                  <div
                    key={cat.id_categoria}
                    onClick={() => setCategoriaEliminar(cat)}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition ${
                      categoriaEliminar?.id_categoria === cat.id_categoria
                        ? "border-red-500 bg-red-50"
                        : "border-zinc-200 hover:border-red-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                        <Image
                          src={cat.img || "/placeholder.jpg"}
                          alt={cat.nombre_categoria}
                          fill
                          className="object-cover"
                          loading="lazy"
                        />
                      </div>
                      <span className="font-semibold text-zinc-800">
                        {cat.nombre_categoria}
                      </span>
                    </div>
                    {categoriaEliminar?.id_categoria === cat.id_categoria && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-6 h-6 text-red-500"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                  </div>
                ))}
              </div>

              {categoriaEliminar && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-zinc-700 mb-2">
                      Confirma tu número de cuenta
                    </label>
                    <input
                      type="text"
                      value={numeroCuentaConfirm}
                      onChange={(e) => {
                        setNumeroCuentaConfirm(e.target.value);
                        setErrorEliminar("");
                      }}
                      placeholder="Ingresa tu número de cuenta"
                      className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                      disabled={guardando}
                    />
                    {errorEliminar && (
                      <p className="text-red-500 text-sm mt-2">
                        {errorEliminar}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={eliminarCategoria}
                    disabled={guardando || !numeroCuentaConfirm}
                    className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {guardando ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                        Eliminando...
                      </span>
                    ) : (
                      "Eliminar Categoría"
                    )}
                  </button>
                </>
              )}

              {mensaje && (
                <div className="mt-4 p-3 rounded-lg text-sm bg-green-50 text-green-700 border border-green-200">
                  {mensaje}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    );
  };

  // Componente para actualizar la base de datos desde CSV
  const ActualizarBDView = ({ setVistaPerfil }: any) => {
    const [archivo, setArchivo] = useState<File | null>(null);
    const [procesando, setProcesando] = useState(false);
    const [progreso, setProgreso] = useState(0);
    const [resultado, setResultado] = useState<any>(null);
    const [error, setError] = useState("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        // Validar que sea CSV
        if (!file.name.endsWith(".csv")) {
          setError("Por favor selecciona un archivo CSV válido");
          return;
        }
        setArchivo(file);
        setError("");
        setResultado(null);
      }
    };

    const procesarCSV = async () => {
      if (!archivo) {
        setError("Selecciona un archivo CSV primero");
        return;
      }

      setProcesando(true);
      setProgreso(0);
      setError("");
      setResultado(null);

      try {
        // Leer el archivo CSV
        const texto = await archivo.text();

        // Parsear CSV usando Papaparse
        const Papa = await import("papaparse");
        const parseResult = Papa.parse(texto, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          transformHeader: (header: string) => header.trim().toUpperCase(),
        });

        if (parseResult.errors.length > 0) {
          setError(`Errores en el CSV: ${parseResult.errors[0].message}`);
          setProcesando(false);
          return;
        }

        const datos = parseResult.data as any[];

        // Validar que tenga las columnas necesarias
        if (datos.length === 0) {
          setError("El archivo CSV está vacío");
          setProcesando(false);
          return;
        }

        const primeraFila: any = datos[0];
        if (!primeraFila.CODIGO && !primeraFila.codigo) {
          setError("El CSV debe tener una columna 'CODIGO' o 'codigo'");
          setProcesando(false);
          return;
        }

        let actualizados = 0;
        let noEncontrados = 0;
        let errores = 0;
        const productosNoEncontrados: string[] = [];

        // Procesar cada fila
        for (let i = 0; i < datos.length; i++) {
          const fila: any = datos[i];

          // Obtener valores del CSV (soportar diferentes nombres de columnas)
          const codigo = fila.CODIGO || fila.codigo;
          const precio =
            fila.P_MAYOREO || fila.p_mayoreo || fila.PRECIO || fila.precio;
          const descripcion = fila.DESCRIPCION || fila.descripcion;
          const cProducto = fila.C_PRODUCTO || fila.c_producto;
          const titulo = fila.TITULO || fila.titulo;

          if (!codigo) {
            errores++;
            continue;
          }

          // Preparar objeto de actualización solo con campos que existan
          const datosActualizar: any = {};
          if (precio !== undefined && precio !== null)
            datosActualizar.P_MAYOREO = parseFloat(precio);
          if (descripcion !== undefined && descripcion !== null)
            datosActualizar.DESCRIPCION = descripcion;
          if (cProducto !== undefined && cProducto !== null)
            datosActualizar.C_PRODUCTO = cProducto;
          if (titulo !== undefined && titulo !== null)
            datosActualizar.TITULO = titulo;

          // Si no hay nada que actualizar, saltar
          if (Object.keys(datosActualizar).length === 0) {
            errores++;
            continue;
          }

          try {
            // Buscar el producto por código
            const { data: producto, error: errorBusqueda } = await supabase
              .from("productos")
              .select("id, CODIGO, P_MAYOREO, DESCRIPCION, C_PRODUCTO, TITULO")
              .eq("CODIGO", codigo)
              .single();

            if (errorBusqueda || !producto) {
              noEncontrados++;
              productosNoEncontrados.push(codigo);
              continue;
            }

            // Actualizar los campos
            const { error: errorActualizar } = await supabase
              .from("productos")
              .update(datosActualizar)
              .eq("id", producto.id);

            if (errorActualizar) {
              errores++;
              console.error(`Error actualizando ${codigo}:`, errorActualizar);
            } else {
              actualizados++;
            }
          } catch (err) {
            errores++;
            console.error(`Error procesando ${codigo}:`, err);
          }

          // Actualizar progreso
          setProgreso(Math.round(((i + 1) / datos.length) * 100));
        }

        // Mostrar resultados
        setResultado({
          total: datos.length,
          actualizados,
          noEncontrados,
          errores,
          productosNoEncontrados: productosNoEncontrados.slice(0, 10), // Mostrar solo los primeros 10
        });
      } catch (err: any) {
        setError(`Error procesando el archivo: ${err.message}`);
      } finally {
        setProcesando(false);
      }
    };

    return (
      <motion.div
        key="actualizar-bd"
        className="min-h-screen"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="px-6 py-6">
          <BackBtn onBack={() => setVistaPerfil("menu")} />

          <h2 className="text-xl font-bold text-zinc-900 mb-4">
            Actualizar Base de Datos
          </h2>

          {/* Instrucciones */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              📋 Instrucciones:
            </h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>
                El archivo CSV debe tener la columna: <strong>CODIGO</strong>{" "}
                (obligatoria)
              </li>
              <li>
                Columnas opcionales: <strong>P_MAYOREO</strong>,{" "}
                <strong>DESCRIPCION</strong>, <strong>C_PRODUCTO</strong>,{" "}
                <strong>TITULO</strong>
              </li>
              <li>
                También acepta minúsculas: codigo, p_mayoreo, precio,
                descripcion, c_producto, titulo
              </li>
              <li>
                la columna CODIGO debe ser tipo "general" y P_MAYOREO tipo
                "numero"
              </li>
              <li>
                Ejemplo de formato:
                <pre className="bg-white p-2 mt-1 rounded text-xs overflow-x-auto">
                  <div className="relative w-full h-30 mb-2">
                    <Image
                      src="/ejemplodoc.png"
                      alt="ejemplo formato CSV"
                      fill
                      className="object-contain object-left"
                      loading="lazy"
                    />
                  </div>
                </pre>
              </li>
              <li>
                Solo se actualizarán los productos que existan en la base de
                datos
              </li>
            </ul>
          </div>

          {/* Selector de archivo */}
          <div className="bg-white border border-zinc-300 rounded-xl p-4 mb-4">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Seleccionar archivo CSV
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={procesando}
              className="w-full text-sm text-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 disabled:opacity-50"
            />

            {archivo && (
              <p className="mt-2 text-sm text-zinc-600">
                📄 {archivo.name} ({(archivo.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* Errores */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Barra de progreso */}
          {procesando && (
            <div className="bg-white border border-zinc-300 rounded-xl p-4 mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-zinc-700">
                  Procesando...
                </span>
                <span className="text-sm font-medium text-zinc-700">
                  {progreso}%
                </span>
              </div>
              <div className="w-full bg-zinc-200 rounded-full h-2.5">
                <div
                  className="bg-orange-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progreso}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Resultados */}
          {resultado && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-green-900 mb-2">
                Proceso completado
              </h3>
              <div className="space-y-1 text-sm text-green-800">
                <p>
                  Total de filas: <strong>{resultado.total}</strong>
                </p>
                <p>
                  Actualizados: <strong>{resultado.actualizados}</strong>
                </p>
                <p>
                  No encontrados: <strong>{resultado.noEncontrados}</strong>
                </p>
                <p>
                  Errores: <strong>{resultado.errores}</strong>
                </p>
              </div>

              {resultado.productosNoEncontrados.length > 0 && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-sm font-semibold text-green-900 mb-1">
                    Productos no encontrados (primeros 10):
                  </p>
                  <ul className="text-xs text-green-700 list-disc list-inside">
                    {resultado.productosNoEncontrados.map(
                      (codigo: string, i: number) => (
                        <li key={i}>{codigo}</li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Botón de acción */}
          <button
            onClick={procesarCSV}
            disabled={!archivo || procesando}
            className={`w-full py-3 rounded-xl font-semibold transition ${
              !archivo || procesando
                ? "bg-zinc-300 text-zinc-500 cursor-not-allowed"
                : "bg-orange-500 text-white hover:bg-orange-600"
            }`}
          >
            {procesando ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                Procesando...
              </span>
            ) : (
              "Actualizar Precios"
            )}
          </button>
        </div>
      </motion.div>
    );
  };

  const AgregarProductoView = ({ setVistaPerfil }: any) => {
    const [titulo, setTitulo] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [codigo, setCodigo] = useState("");
    const [precio, setPrecio] = useState("");
    const [categoriaId, setCategoriaId] = useState("");
    const [marcaId, setMarcaId] = useState("");
    const [imagenFile, setImagenFile] = useState<File | null>(null);
    const [imagenPreview, setImagenPreview] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState("");
    const [imagenesAdicionalesFiles, setImagenesAdicionalesFiles] = useState<
      File[]
    >([]);

    const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        // Validar que sea imagen
        if (!file.type.startsWith("image/")) {
          setMensaje("Por favor selecciona un archivo de imagen válido");
          return;
        }

        // Validar tamaño
        if (file.size > 800 * 1024) {
          setMensaje("La imagen no debe superar los 800 KB");
          return;
        }

        setImagenFile(file);

        // Crear preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagenPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    };

    const agregarProducto = async () => {
      setGuardando(true);
      setMensaje("");

      // Validaciones
      if (!titulo || !codigo || !precio || !categoriaId) {
        setMensaje("Por favor completa todos los campos obligatorios");
        setGuardando(false);
        return;
      }

      try {
        let urlImagen = "";

        // Si hay imagen, subirla primero
        if (imagenFile) {
          const timestamp = Date.now();
          const extension = imagenFile.name.split(".").pop();
          const nombreArchivo = `producto_nuevo_${timestamp}.${extension}`;

          const { data: uploadData, error: uploadError } =
            await supabase.storage
              .from("imagenes_productos")
              .upload(nombreArchivo, imagenFile, {
                cacheControl: "public, max-age=31536000",
                upsert: true,
              });

          if (uploadError) {
            console.error("Error subiendo imagen:", uploadError);
            setMensaje("Error al subir la imagen");
            setGuardando(false);
            return;
          }

          // Obtener URL pública
          const {
            data: { publicUrl },
          } = supabase.storage
            .from("imagenes_productos")
            .getPublicUrl(nombreArchivo);

          urlImagen = publicUrl;
        }

        // Insertar producto en la base de datos
        const { data: productoInsertado, error: insertError } = await supabase
          .from("productos")
          .insert([
            {
              TITULO: titulo,
              DESCRIPCION: descripcion,
              CODIGO: codigo,
              P_MAYOREO: parseFloat(precio),
              CATEGORIA_ID: parseInt(categoriaId),
              marca_id: marcaId ? parseInt(marcaId) : null,
              IMAGEN: urlImagen,
              visible: true,
            },
          ])
          .select()
          .single();

        // Subir imágenes adicionales si hay
        if (imagenesAdicionalesFiles.length > 0 && productoInsertado) {
          for (let i = 0; i < imagenesAdicionalesFiles.length; i++) {
            const file = imagenesAdicionalesFiles[i];
            const timestamp = Date.now();
            const extension = file.name.split(".").pop();
            const nombreArchivo = `producto_${productoInsertado.id}_adicional_${i}_${timestamp}.${extension}`;

            const { error: uploadError } = await supabase.storage
              .from("imagenes_productos")
              .upload(nombreArchivo, file, {
                cacheControl: "public, max-age=31536000",
                upsert: true,
              });

            if (!uploadError) {
              const {
                data: { publicUrl },
              } = supabase.storage
                .from("imagenes_productos")
                .getPublicUrl(nombreArchivo);

              await supabase.from("imagenes_producto").insert({
                producto_id: productoInsertado.id,
                url: publicUrl,
                orden: i + 1,
              });
            }
          }
        }
        if (insertError) {
          console.error("Error agregando producto:", insertError);

          // Verificar si es error de código duplicado
          if (insertError.code === "23505") {
            setMensaje("Ya existe un producto con ese código");
          } else {
            setMensaje("Error al agregar el producto");
          }
        } else {
          setMensaje("Producto agregado correctamente");

          // Limpiar formulario
          setTimeout(() => {
            setTitulo("");
            setDescripcion("");
            setCodigo("");
            setPrecio("");
            setCategoriaId("");
            setMarcaId("");
            setImagenFile(null);
            setImagenPreview("");
            setMensaje("");
          }, 2000);
        }
      } catch (error) {
        console.error("Error:", error);
        setMensaje("Ocurrió un error inesperado");
      } finally {
        setGuardando(false);
      }
    };

    return (
      <motion.div
        key="agregar-producto"
        className="min-h-screen"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="px-6 py-6">
          <BackBtn onBack={() => setVistaPerfil("menu")} />

          <h2 className="text-xl font-bold text-zinc-900 mb-6">
            Agregar Producto
          </h2>

          {/* Imagen */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Imagen del Producto
            </label>
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-48 h-48 rounded-lg overflow-hidden border-2 border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center">
                {imagenPreview ? (
                  <Image
                    src={imagenPreview}
                    alt="Preview"
                    fill
                    className="object-contain"
                    loading="lazy"
                  />
                ) : (
                  <div className="text-center text-zinc-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-12 h-12 mx-auto mb-2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                      />
                    </svg>
                    <p className="text-sm">Sin imagen</p>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImagenChange}
                className="text-sm text-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
              />
            </div>
          </div>

          {/* AGREGAR ESTA SECCIÓN COMPLETA AQUÍ */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Imágenes Adicionales (opcional - máximo 4)
            </label>

            {/* Input para agregar nuevas */}
            {imagenesAdicionalesFiles.length < 4 && (
              <>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const totalImagenes = files.length;
                    if (totalImagenes > 4) {
                      setMensaje("Máximo 4 imágenes adicionales");
                      return;
                    }
                    setImagenesAdicionalesFiles(files);
                  }}
                  className="text-sm text-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {imagenesAdicionalesFiles.length > 0 && (
                  <p className="text-xs text-zinc-500 mt-1">
                    {imagenesAdicionalesFiles.length} imagen(es) seleccionada(s)
                  </p>
                )}
              </>
            )}

            <p className="text-xs text-zinc-400 mt-1">
              Total: {imagenesAdicionalesFiles.length} de 4
            </p>
          </div>

          {/* Título */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Martillo de Goma 16oz"
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Descripción */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Descripción detallada del producto (opcional)"
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Código */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Código <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ej: 19129T"
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Precio */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Precio de Mayoreo <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-zinc-500">$</span>
              <input
                type="number"
                step="0.01"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="0.00"
                className="w-full border border-zinc-300 rounded-lg pl-8 pr-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Categoría */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Subcategoría
            </label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700"
            >
              <option value="">Seleccionar Subcategoría</option>
              {categoriasAdmin.map((cat) => (
                <option key={cat.id_categoria} value={String(cat.id_categoria)}>
                  {cat.nombre_categoria}
                </option>
              ))}
            </select>
          </div>
          {/* Marca */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Marca
            </label>
            <select
              value={marcaId}
              onChange={(e) => setMarcaId(e.target.value)}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Sin marca</option>
              {marcas.map((marca) => (
                <option key={marca.id} value={marca.id}>
                  {marca.nombre_marca}
                </option>
              ))}
            </select>
          </div>

          {/* Mensaje */}
          {mensaje && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${
                mensaje.includes("Error") || mensaje.includes("completa")
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-green-50 text-green-700 border border-green-200"
              }`}
            >
              {mensaje}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3">
            <button
              onClick={() => setVistaPerfil("menu")}
              disabled={guardando}
              className="flex-1 border border-zinc-300 py-3 rounded-xl font-semibold text-zinc-600 hover:bg-zinc-50 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={agregarProducto}
              disabled={
                guardando || !titulo || !codigo || !precio || !categoriaId
              }
              className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {guardando ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                  Guardando...
                </span>
              ) : (
                "Agregar Producto"
              )}
            </button>
          </div>
        </div>
      </motion.div>
    );
  };
  // Función para enviar el pedido

  const enviarPedido = async () => {
    try {
      setEnviando(true);
      setMensajeExito("");
      setErrorCuenta("");

      if (!cuenta) {
        setMensajeExito("Error: cuenta no cargada. Intente nuevamente.");
        setEnviando(false);
        return;
      }

      // saldo pendiente
      if (cuenta.tiene_saldo_pendiente) {
        const { data: docsPendientes, error: docsError } = await supabase
          .from("documentos_pendientes")
          .select("*")
          .eq("cuenta_id", cuenta.id)
          .eq("pagado", false);

        if (!docsError && docsPendientes && docsPendientes.length > 0) {
          setDocumentosPendientesModal(docsPendientes);
          setMostrarModalSaldoPendiente(true);
          setMostrarModalPedido(false);
          setEnviando(false);
          return;
        }
      }

      // Calcular el total
      const total = carrito.reduce(
        (sum, p) =>
          sum + (p.subtotal ?? (p.cantidad ?? 0) * (p.P_MAYOREO ?? 0)),
        0
      );

      // Calcular subtotal (sin IVA), IVA y total
      const subtotalSinIVA = total / 1.08;
      const iva = total - subtotalSinIVA;
      const totalConIVA = total;

      // Guardar pedido en Supabase
      const { data: pedidoInsertado, error: errorPedido } = await supabase
        .from("pedidos")
        .insert([
          {
            cuenta_id: cuenta.id,
            total: total,
          },
        ])
        .select()
        .single();

      if (errorPedido) {
        console.error("Error registrando pedido:", errorPedido);
      } else {
        console.log("Pedido registrado");
      }

      const jsPDFModule = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const { jsPDF } = jsPDFModule;

      const pedidoId = pedidoInsertado.id;
      const numeroCotizacion = pedidoId;
      const fecha = new Date().toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const hora = new Date().toLocaleTimeString("es-MX");

      // Cargar logo como base64
      const getImageBase64 = async (url: string): Promise<string> => {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };

      const logoBase64 = await getImageBase64("/logo-pdf.png");

      // Función para dibujar el encabezado (se usará en cada página)
      const dibujarEncabezado = (doc: any) => {
        // Logo en la esquina superior izquierda
        doc.addImage(logoBase64, "PNG", 14, 14, 50, 15);

        // Información empresa
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text("SARA DEL PILAR GUZMAN GALINDO", 70, 10);
        doc.setFont("helvetica", "normal");
        doc.text("GUGS701012E14", 70, 14);
        doc.text("Av. del maestro # 24 -", 70, 18);
        doc.text("Col. Praxedis Balboa C.P. 87430", 70, 22);
        doc.text("H. Matamoros, Tamaulipas, MÉXICO", 70, 26);
        doc.text("Tel 8682724481 gmail.", 70, 30);
        doc.text("bodegaferreterademty@hotmail.com", 70, 34);

        // Cotización y Fecha (lado derecho)
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Pedido", 165, 10);
        doc.setFontSize(10);
        doc.text(numeroCotizacion.toString(), 170, 16);

        doc.setFontSize(9);
        doc.text("Fecha", 172, 24);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(fecha, 167, 30);

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("Moneda: MXN", 165, 38);

        // Línea separadora
        doc.setLineWidth(0.3);
        doc.line(14, 42, 196, 42);

        // Sección RECEPTOR
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text("RECEPTOR", 14, 48);

        doc.setFont("helvetica", "normal");
        doc.text(`Nombre: ${cliente || cuenta?.cliente || "N/A"}`, 14, 54);
        doc.text(`Domicilio: ${cuenta?.direccion || ""}`, 14, 59);
        doc.text(`Ferretería: ${cuenta?.ferreteria || ""}`, 140, 59);
        doc.text(`Tel: ${cuenta?.numero_tel || ""}`, 140, 54);
        doc.text(
          `Ciudad: Heroica Matamoros, Matamoros, Tamaulipas, México`,
          14,
          64
        );
      };

      // PDF PARA ENVÍO (docEnvio)
      const docEnvio = new jsPDF();

      // Tabla de productos
      const productosTabla = carrito.map((p) => [
        p.CODIGO || "",
        p.cantidad,
        p.TITULO,
        `$ ${p.P_MAYOREO.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        `$ ${p.subtotal.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      ]);

      autoTableModule.default(docEnvio, {
        head: [["CÓDIGO", "CANT", "DESCRIPCIÓN", "P. UNIT.", "IMPORTE"]],
        body: productosTabla,
        startY: 69,
        styles: {
          fontSize: 7,
          cellPadding: 1.5,
          lineColor: [180, 180, 180],
          lineWidth: 0.1,
          textColor: [0, 0, 0],
        },
        headStyles: {
          fillColor: [230, 230, 230],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          halign: "center",
          fontSize: 7,
        },
        columnStyles: {
          0: { cellWidth: 28, halign: "center" },
          1: { cellWidth: 15, halign: "center" },
          2: { cellWidth: 82, halign: "left" },
          3: { cellWidth: 22, halign: "right" },
          4: { cellWidth: 22, halign: "right" },
        },
        theme: "grid",
        margin: { left: 14, right: 14, top: 69 },
        // Hook para dibujar el encabezado en cada nueva página
        didDrawPage: (data: any) => {
          dibujarEncabezado(docEnvio);
        },
      });

      const finalYEnvio = (docEnvio as any).lastAutoTable?.finalY || 100;

      // Nota de tipo de entrega (solo en la última página)
      docEnvio.setFontSize(7);
      docEnvio.setFont("helvetica", "normal");
      if (enviarDomicilio) {
        docEnvio.text("TIPO DE ENTREGA: A DOMICILIO", 14, finalYEnvio + 8);
      } else if (recogerLocal) {
        docEnvio.text("TIPO DE ENTREGA: RECOGER EN LOCAL", 14, finalYEnvio + 8);
      }

      // AGREGAR TOTALES EN LA ÚLTIMA PÁGINA (PDF de Envío)
      const yTotales = finalYEnvio + 18;
      docEnvio.setFontSize(8);
      docEnvio.setFont("helvetica", "bold");
      {
        /* 
    docEnvio.text("Subtotal:", 145, yTotales);
    docEnvio.text(`$ ${subtotalSinIVA.toFixed(2)}`, 175, yTotales, { align: "right" });
    docEnvio.text("IVA (8%):", 145, yTotales + 5);
    docEnvio.text(`$ ${iva.toFixed(2)}`, 175, yTotales + 5, { align: "right" });
    */
      }
      docEnvio.setLineWidth(0.5);
      docEnvio.line(145, yTotales + 8, 196, yTotales + 8);
      docEnvio.setFontSize(9);
      docEnvio.text("TOTAL NETO:", 145, yTotales + 13);
      docEnvio.text(
        `$ ${totalConIVA.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        195,
        yTotales + 13,
        {
          align: "right",
        }
      );

      // Pie de página con fecha/hora y número de página
      const pageCount2 = (docEnvio as any).getNumberOfPages();
      for (let i = 1; i <= pageCount2; i++) {
        docEnvio.setPage(i);
        const pageHeight = docEnvio.internal.pageSize.height;
        docEnvio.setFontSize(7);
        docEnvio.text(`Página ${i} de ${pageCount2}`, 14, pageHeight - 8);
        docEnvio.text(`${fecha} ${hora}`, 160, pageHeight - 8);
      }

      // Enviar PDF por correo
      const pdfBase64 = docEnvio.output("datauristring");
      await fetch("/api/enviar-pedido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfBase64,
          correoDestino: "bfmpedidos@gmail.com",
        }),
      });

      // PDF PARA CLIENTE (docCliente)
      const docCliente = new jsPDF();

      // Tabla
      autoTableModule.default(docCliente, {
        head: [["CÓDIGO", "CANT", "DESCRIPCIÓN", "P. UNIT.", "IMPORTE"]],
        body: productosTabla,
        startY: 69,
        styles: {
          fontSize: 7,
          cellPadding: 1.5,
          lineColor: [180, 180, 180],
          lineWidth: 0.1,
          textColor: [0, 0, 0],
        },
        headStyles: {
          fillColor: [230, 230, 230],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          halign: "center",
          fontSize: 7,
        },
        columnStyles: {
          0: { cellWidth: 28, halign: "center" },
          1: { cellWidth: 15, halign: "center" },
          2: { cellWidth: 95, halign: "left" },
          3: { cellWidth: 22, halign: "right" },
          4: { cellWidth: 22, halign: "right" },
        },
        theme: "grid",
        margin: { left: 14, right: 14, top: 69 },
        // Hook para dibujar el encabezado en cada nueva página
        didDrawPage: (data: any) => {
          dibujarEncabezado(docCliente);
        },
      });

      const finalYCliente = (docCliente as any).lastAutoTable?.finalY || 100;

      // Tipo de entrega (solo en la última página)
      docCliente.setFontSize(7);
      docCliente.setFont("helvetica", "normal");
      if (enviarDomicilio) {
        docCliente.text("TIPO DE ENTREGA: A DOMICILIO", 14, finalYCliente + 8);
      } else if (recogerLocal) {
        docCliente.text("TIPO DE ENTREGA: RECOGER EN LOCAL", 14, finalYCliente + 8);
      }

      // AGREGAR TOTALES EN LA ÚLTIMA PÁGINA (PDF de Cliente)
      const yTotalesCliente = finalYCliente + 18;
      docCliente.setFontSize(8);
      docCliente.setFont("helvetica", "bold");
      {
        /* 
    docCliente.text("Subtotal:", 145, yTotales);
    docCliente.text(`$ ${subtotalSinIVA.toFixed(2)}`, 175, yTotales, { align: "right" });
    docCliente.text("IVA (8%):", 145, yTotales + 5);
    docCliente.text(`$ ${iva.toFixed(2)}`, 175, yTotales + 5, { align: "right" });
    */
      }
      docCliente.setLineWidth(0.5);
      docCliente.line(145, yTotalesCliente + 8, 196, yTotalesCliente + 8);
      docCliente.setFontSize(9);
      docCliente.text("TOTAL NETO:", 145, yTotalesCliente + 13);
      docCliente.text(
        `$ ${totalConIVA.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        195,
        yTotalesCliente + 13,
        { align: "right" }
      );

      // Pie de página
      const pageCount = (docCliente as any).getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        docCliente.setPage(i);
        const pageHeight = docCliente.internal.pageSize.height;
        docCliente.setFontSize(7);
        docCliente.text(`Página ${i} de ${pageCount}`, 14, pageHeight - 8);
        docCliente.text(`${fecha} ${hora}`, 160, pageHeight - 8);
      }

      // Guardar PDF en Supabase Storage
      const pdfBlob = docCliente.output("blob");
      const nombreArchivoPDF = `pedido_${pedidoId}_${Date.now()}.pdf`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("pedidos-pdf")
        .upload(nombreArchivoPDF, pdfBlob, {
          contentType: "application/pdf",
          cacheControl: "public, max-age=31536000",
          upsert: true,
        });

      if (uploadError) {
        console.error("Error subiendo PDF a Supabase:", uploadError);
      } else {
        console.log("PDF subido correctamente");

        // Obtener URL pública del PDF
        const {
          data: { publicUrl },
        } = supabase.storage.from("pedidos-pdf").getPublicUrl(nombreArchivoPDF);

        // Actualizar el pedido con la URL del PDF
        const { error: updateError } = await supabase
          .from("pedidos")
          .update({ pdf_url: publicUrl })
          .eq("id", pedidoId);

        if (updateError) {
          console.error("Error actualizando URL del PDF:", updateError);
        }
      }

      // Descargar PDF localmente para el cliente
      {
        /*  
    const nombreArchivo = `Pedido_${cliente.replace(/\s+/g, "_")}.pdf`;
    docCliente.save(nombreArchivo);
     */
      }

      setMensajeExito("Su pedido ha sido enviado con éxito.");
      setMostrarModalPedido(false);
      setCarrito([]);
      setMostrarExito(true);
    } catch (error) {
      console.error("Error al enviar pedido:", error);
      setMensajeExito(
        "Ocurrió un error al enviar el pedido. Intente nuevamente."
      );
    } finally {
      setEnviando(false);
    }
  };

  const apoyos = [
    {
      titulo: "INSTALACIÓN DE LAVABO",
      imagen: "/apoyo_lavabo.jpg",
    },
    {
      titulo: "INSTALACIÓN DE FREGADERO",
      imagen: "/apoyo_fregadero.jpg",
    },
    {
      titulo: "INSTALACIÓN DE GAS",
      imagen: "/apoyo_gas.jpg",
    },
    {
      titulo: "TIPOS DE SOLVENTES",
      imagen: "/apoyo_solventes.jpg",
    },
  ];

  const SelectorEstado = ({ estadoActual, pedidoId, onEstadoChange }: any) => {
    const estados = [
      {
        valor: "revision",
        label: "En Revisión",
        color: "bg-yellow-100 text-yellow-800",
      },
      {
        valor: "recibido",
        label: "Recibido",
        color: "bg-blue-100 text-blue-800",
      },
      {
        valor: "surtiendo",
        label: "Surtiendo",
        color: "bg-purple-100 text-purple-800",
      },
      {
        valor: "encajado",
        label: "Encajado",
        color: "bg-indigo-100 text-indigo-800",
      },
      {
        valor: "en_camino",
        label: "En Camino",
        color: "bg-orange-100 text-orange-800",
      },
      {
        valor: "completado",
        label: "Completado",
        color: "bg-green-100 text-green-800",
      },
      {
        valor: "listo_para_recoger",
        label: "Listo para recoger",
        color: "bg-emerald-100 text-emerald-800",
      },
    ];

    const [cambiando, setCambiando] = useState(false);

    const cambiarEstado = async (nuevoEstado: string) => {
      setCambiando(true);
      try {
        const { error } = await supabase
          .from("pedidos")
          .update({ estado: nuevoEstado })
          .eq("id", pedidoId);

        if (error) throw error;

        onEstadoChange(nuevoEstado);
        setActualizacionReciente(true);
        setTimeout(() => setActualizacionReciente(false), 2000);
      } catch (error) {
        console.error("Error actualizando estado:", error);
        alert("Error al actualizar el estado");
      } finally {
        setCambiando(false);
      }
    };

    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-4 mb-4">
        <label className="text-sm font-semibold text-zinc-700 mb-2 block">
          Estado del Pedido
        </label>
        <select
          value={estadoActual || "revision"}
          onChange={(e) => cambiarEstado(e.target.value)}
          disabled={cambiando}
          className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm font-medium text-black focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-zinc-100"
        >
          {estados.map((estado) => (
            <option key={estado.valor} value={estado.valor}>
              {estado.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const BadgeEstado = ({ estado }: any) => {
    const estados: Record<string, { label: string; color: string }> = {
      revision: {
        label: "En Revisión",
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      },
      recibido: {
        label: "Recibido",
        color: "bg-blue-100 text-blue-800 border-blue-200",
      },
      surtiendo: {
        label: "Surtiendo",
        color: "bg-purple-100 text-purple-800 border-purple-200",
      },
      encajado: {
        label: "Encajado",
        color: "bg-indigo-100 text-indigo-800 border-indigo-200",
      },
      en_camino: {
        label: "En Camino",
        color: "bg-orange-100 text-orange-800 border-orange-200",
      },
      completado: {
        label: "Completado",
        color: "bg-green-100 text-green-800 border-green-200",
      },
      listo_para_recoger: {
        label: "Listo para recoger",
        color: "bg-emerald-100 text-emerald-800 border-emerald-200",
      },
    };

    const estadoInfo = estados[estado] ?? estados["revision"];

    return (
      <span
        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${estadoInfo.color}`}
      >
        {estadoInfo.label}
      </span>
    );
  };

  const HistorialPedidos = ({ cuenta, setVistaPerfil }: any) => {
    const [pedidos, setPedidos] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState<any>(null);
    const [cargandoPDF, setCargandoPDF] = useState(false);
    const [cuentaPedido, setCuentaPedido] = useState<any>(null);
    const [actualizacionReciente, setActualizacionReciente] = useState(false);
    const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
    const [pedidoAEliminar, setPedidoAEliminar] = useState<any>(null);
    const [numeroCuentaConfirm, setNumeroCuentaConfirm] = useState("");
    const [errorEliminar, setErrorEliminar] = useState("");
    const [eliminando, setEliminando] = useState(false);

    const eliminarPedido = async () => {
      if (!pedidoAEliminar) return;

      setEliminando(true);
      setErrorEliminar("");

      if (numeroCuentaConfirm.trim() !== cuenta?.numero_cuenta) {
        setErrorEliminar("Número de cuenta incorrecto");
        setEliminando(false);
        return;
      }

      try {
        // Eliminar el PDF del storage si existe
        if (
          pedidoAEliminar.pdf_url &&
          pedidoAEliminar.pdf_url.includes("pedidos-pdf")
        ) {
          const urlParts = pedidoAEliminar.pdf_url.split("/");
          const nombreArchivo = urlParts[urlParts.length - 1];

          const { error: deleteFileError } = await supabase.storage
            .from("pedidos-pdf")
            .remove([nombreArchivo]);

          if (deleteFileError) {
            console.error("Error eliminando PDF:", deleteFileError);
          }
        }

        // Eliminar el pedido
        const { error: deletePedidoError } = await supabase
          .from("pedidos")
          .delete()
          .eq("id", pedidoAEliminar.id);

        if (deletePedidoError) {
          setErrorEliminar("Error al eliminar el pedido");
          console.error(deletePedidoError);
        } else {
          // Actualizar la lista local
          setPedidos((prev) => prev.filter((p) => p.id !== pedidoAEliminar.id));

          if (pedidoSeleccionado?.id === pedidoAEliminar.id) {
            setPedidoSeleccionado(null);
          }

          setMostrarModalEliminar(false);
          setPedidoAEliminar(null);
          setNumeroCuentaConfirm("");
        }
      } catch (error) {
        console.error("Error:", error);
        setErrorEliminar("Ocurrió un error inesperado");
      } finally {
        setEliminando(false);
      }
    };

    useEffect(() => {
      const fetchPedidos = async () => {
        if (!cuenta?.id && !esAdmin) return;

        let query = supabase
          .from("pedidos")
          .select(
            `
    id, 
    total, 
    created_at,
    cuenta_id,
    pdf_url,
    estado,
    cuentas (
      numero_cuenta,
      cliente,
      ferreteria,
      numero_tel,
      entrega_mismo_dia
    )
  `
          )
          .order("created_at", { ascending: false });

        if (!esAdmin) {
          query = query.eq("cuenta_id", cuenta.id);
        }

        const { data, error } = await query;

        if (!error && data) {
          setPedidos(data);
        }
        setCargando(false);
      };

      fetchPedidos();
      const channel = supabase
        .channel("pedidos-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "pedidos",
            ...(esAdmin ? {} : { filter: `cuenta_id=eq.${cuenta?.id}` }),
          },
          async (payload) => {
            console.log("Cambio detectado:", payload);

            if (payload.eventType === "UPDATE") {
              const { data: pedidoActualizado } = await supabase
                .from("pedidos")
                .select(
                  `
    id, 
    total, 
    created_at,
    cuenta_id,
    pdf_url,
    estado,
    cuentas (
      numero_cuenta,
      cliente,
      ferreteria,
      numero_tel,
      entrega_mismo_dia
    )
  `
                )
                .eq("id", payload.new.id)
                .single();

              if (pedidoActualizado) {
                setPedidos((prev) =>
                  prev.map((p) =>
                    p.id === pedidoActualizado.id ? pedidoActualizado : p
                  )
                );

                if (pedidoSeleccionado?.id === pedidoActualizado.id) {
                  setPedidoSeleccionado(pedidoActualizado);
                  setCuentaPedido(pedidoActualizado.cuentas || cuenta);
                }

                setActualizacionReciente(true);
                setTimeout(() => setActualizacionReciente(false), 2000);
              }
            } else if (payload.eventType === "INSERT") {
              const { data: nuevoPedido } = await supabase
                .from("pedidos")
                .select(
                  `
    id, 
    total, 
    created_at,
    cuenta_id,
    pdf_url,
    estado,
    cuentas (
      numero_cuenta,
      cliente,
      ferreteria,
      numero_tel,
      entrega_mismo_dia
    )
  `
                )
                .eq("id", payload.new.id)
                .single();

              if (nuevoPedido) {
                setPedidos((prev) => [nuevoPedido, ...prev]);
                setActualizacionReciente(true);
                setTimeout(() => setActualizacionReciente(false), 2000);
              }
            } else if (payload.eventType === "DELETE") {
              setPedidos((prev) => prev.filter((p) => p.id !== payload.old.id));

              if (pedidoSeleccionado?.id === payload.old.id) {
                setPedidoSeleccionado(null);
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [cuenta, esAdmin, pedidoSeleccionado?.id]);

    const verDetallePedido = (pedido: any) => {
      setPedidoSeleccionado(pedido);
      setCuentaPedido(pedido.cuentas || cuenta);
    };

    const actualizarEstadoLocal = (nuevoEstado: string) => {
      // Ya no es necesario porque Realtime lo maneja
    };

    const descargarPDF = async () => {
      if (!pedidoSeleccionado?.pdf_url) return;

      setCargandoPDF(true);
      try {
        const response = await fetch(pedidoSeleccionado.pdf_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Pedido_${pedidoSeleccionado.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error("Error descargando PDF:", error);
        alert("Error al descargar el PDF");
      } finally {
        setCargandoPDF(false);
      }
    };

    if (pedidoSeleccionado) {
      return (
        <motion.div
          key="detalle-pedido"
          className="min-h-screen"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(event, info) => {
            if (info.offset.x > 100) {
              setPedidoSeleccionado(null);
            }
          }}
        >
          <BackBtn
            onBack={() => {
              setPedidoSeleccionado(null);
            }}
          />
          <h2 className="text-xl font-bold text-zinc-900 mb-2">
            Detalle del Pedido
          </h2>

          {esAdmin && (
            <SelectorEstado
              estadoActual={pedidoSeleccionado.estado}
              pedidoId={pedidoSeleccionado.id}
              onEstadoChange={actualizarEstadoLocal}
            />
          )}

          {!esAdmin && (
            <div className="mb-4">
              <BadgeEstado estado={pedidoSeleccionado.estado} />
            </div>
          )}

         {/* Información de tiempo de entrega - ACTUALIZADO */}
{esAdmin && (
  <div className="bg-white rounded-xl border border-zinc-200 p-4 mb-4 shadow-sm">
    <div className="flex items-center gap-2 mb-3">
      <svg
        className="w-5 h-5 text-zinc-600"
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
      <span className="font-semibold text-zinc-800">
        Logística de Entrega
      </span>
    </div>

    {(() => {
      // Analizamos la fecha de CREACIÓN del pedido, no la fecha actual
      const fechaPedido = new Date(pedidoSeleccionado.created_at);
      const horaPedido = fechaPedido.getHours(); // Hora en formato 0-23

      // Obtenemos configuración de la cuenta
      const tieneEntregaMismoDia =
        pedidoSeleccionado.cuentas?.entrega_mismo_dia || false;

      // Lógica espejo del Modal de Confirmación
      if (tieneEntregaMismoDia) {
        if (horaPedido < 10) {
          // Caso: Mismo día (Antes de las 10 AM)
          return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
                <div>
                  <p className="text-sm text-green-900 font-bold">
                    Prioridad: Entrega Hoy Mismo
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    El pedido entró a las {horaPedido}:
                    {fechaPedido.getMinutes().toString().padStart(2, "0")}{" "}
                    (Antes de las 10 AM).
                  </p>
                  <p className="text-xs font-semibold text-green-800 mt-2 bg-green-100 px-2 py-1 rounded inline-block">
                    Acción: Surtir y enviar hoy.
                  </p>
                </div>
              </div>
            </div>
          );
        } else {
          // Caso: Siguiente día hábil (Después de las 10 AM)
          return (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-blue-900 font-bold">
                    Programar Siguiente Día Hábil
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    El pedido entró a las {horaPedido}:
                    {fechaPedido.getMinutes().toString().padStart(2, "0")}{" "}
                    (Después de las 10 AM).
                  </p>
                  <p className="text-xs font-semibold text-blue-800 mt-2 bg-blue-100 px-2 py-1 rounded inline-block">
                    Acción: Programar ruta para mañana.
                  </p>
                </div>
              </div>
            </div>
          );
        }
      } else {
        // Caso: Envío Estándar
        return (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
              </div>
              <div>
                <p className="text-sm text-orange-900 font-bold">
                  Envío Estándar (1-3 días)
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  La cuenta tiene configuración de entrega estándar.
                </p>
                <p className="text-xs font-semibold text-orange-800 mt-2 bg-orange-100 px-2 py-1 rounded inline-block">
                  Acción: Enviar en ruta normal.
                </p>
              </div>
            </div>
          </div>
        );
      }
    })()}
  </div>
)}
          <div className="bg-white rounded-xl border border-zinc-200 p-4 mb-4 shadow-sm">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-zinc-600">Pedido #</span>
              <span className="font-semibold text-zinc-900">
                {pedidoSeleccionado.id}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-zinc-600">Fecha</span>
              <span className="font-semibold text-zinc-900">
                {new Date(pedidoSeleccionado.created_at).toLocaleDateString(
                  "es-MX",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }
                )}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-zinc-600">Cliente</span>
              <span className="font-semibold text-zinc-900">
                {cuentaPedido?.cliente || "N/A"}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-zinc-600">Ferretería</span>
              <span className="font-semibold text-zinc-900">
                {cuentaPedido?.ferreteria || "N/A"}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-zinc-600">Cuenta</span>
              <span className="font-semibold text-zinc-900">
                {cuentaPedido?.numero_cuenta}
              </span>
            </div>
            {cuentaPedido?.numero_tel && (
              <div className="flex justify-between mb-2">
                <span className="text-sm text-zinc-600">Teléfono</span>
                <span className="font-semibold text-zinc-900">
                  {cuentaPedido.numero_tel}
                </span>
              </div>
            )}
            <div className="border-t border-zinc-200 mt-3 pt-3 flex justify-between">
              <span className="font-bold text-zinc-900">Total</span>
              <span className="font-bold text-orange-500 text-lg">
                ${pedidoSeleccionado.total.toFixed(2)}
              </span>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-zinc-900 mb-3">
            Documento del Pedido
          </h3>

          {pedidoSeleccionado.pdf_url ? (
            <div className="space-y-3">
              <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
                <iframe
                  src={pedidoSeleccionado.pdf_url}
                  className="w-full h-[500px]"
                  title="Vista previa del pedido"
                />
              </div>

              <button
                onClick={descargarPDF}
                disabled={cargandoPDF}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold shadow-sm transition flex items-center justify-center gap-2 disabled:bg-orange-300"
              >
                {cargandoPDF ? (
                  <>
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                    Descargando...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                      />
                    </svg>
                    Descargar PDF
                  </>
                )}
              </button>
              {esAdmin && (
                <button
                  onClick={() => {
                    setPedidoAEliminar(pedidoSeleccionado);
                    setMostrarModalEliminar(true);
                  }}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold shadow-sm transition flex items-center justify-center gap-2 mt-3"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                  Eliminar Pedido
                </button>
              )}
            </div>
          ) : (
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-12 h-12 mx-auto text-zinc-400 mb-2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              <p className="text-zinc-500 text-sm">
                PDF no disponible para este pedido
              </p>
            </div>
          )}
          {/* Modal de Confirmación para Eliminar */}
          {mostrarModalEliminar && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl w-[90%] max-w-md p-6 shadow-2xl"
              >
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-8 h-8 text-red-600"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                  </svg>
                </div>

                <h3 className="text-xl font-bold text-zinc-900 text-center mb-2">
                  ¿Eliminar Pedido?
                </h3>

                <p className="text-sm text-zinc-600 text-center mb-6">
                  Esta acción no se puede deshacer. El pedido y su PDF serán
                  eliminados permanentemente.
                </p>

                <div className="bg-zinc-50 rounded-lg p-3 mb-4 border border-zinc-200">
                  <p className="text-xs text-zinc-500 mb-1">
                    Pedido a eliminar:
                  </p>
                  <p className="text-sm font-semibold text-zinc-900">
                    Pedido #{pedidoAEliminar?.id}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Total: ${pedidoAEliminar?.total?.toFixed(2)}
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">
                    Confirma número de cuenta:
                  </label>
                  <input
                    type="password"
                    value={numeroCuentaConfirm}
                    onChange={(e) => {
                      setNumeroCuentaConfirm(e.target.value);
                      setErrorEliminar("");
                    }}
                    placeholder="Ingresa tu número de cuenta"
                    className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    disabled={eliminando}
                  />
                  {errorEliminar && (
                    <p className="text-red-500 text-sm mt-2">{errorEliminar}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setMostrarModalEliminar(false);
                      setPedidoAEliminar(null);
                      setNumeroCuentaConfirm("");
                      setErrorEliminar("");
                    }}
                    disabled={eliminando}
                    className="flex-1 border border-zinc-300 py-3 rounded-xl font-semibold text-zinc-600 hover:bg-zinc-50 transition disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={eliminarPedido}
                    disabled={eliminando || !numeroCuentaConfirm}
                    className="flex-1 bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {eliminando ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                        Eliminando...
                      </span>
                    ) : (
                      "Eliminar"
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      );
    }

    return (
      <motion.div
        key={vistaPerfil}
        className="min-h-screen"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(event, info) => {
          if (info.offset.x > 100) {
            setVistaPerfil("menu");
          }
        }}
      >
        <BackBtn onBack={() => setVistaPerfil("menu")} />

        <h2 className="text-xl font-bold text-zinc-900 mb-4">
          {esAdmin ? "Todos los Pedidos" : "Tus Pedidos"}
        </h2>

        {cargando ? (
          <p className="text-center text-zinc-500">Cargando...</p>
        ) : pedidos.length === 0 ? (
          <p className="text-center text-zinc-500 mt-8">
            No hay pedidos registrados
          </p>
        ) : (
          <div className="space-y-3">
            {pedidos.map((pedido) => (
              <div
                key={pedido.id}
                onClick={() => verDetallePedido(pedido)}
                className="border border-zinc-200 rounded-xl p-4 bg-white shadow-sm cursor-pointer hover:bg-zinc-50 transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-zinc-900">
                      Pedido #{pedido.id}
                    </p>
                    {esAdmin && pedido.cuentas && (
                      <p className="text-xs text-zinc-600 mt-1">
                        {pedido.cuentas.cliente || "Sin nombre"} -{" "}
                        {pedido.cuentas.numero_cuenta}
                      </p>
                    )}
                    <p className="text-sm text-zinc-500 mt-1">
                      {new Date(pedido.created_at).toLocaleDateString("es-MX")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <BadgeEstado estado={pedido.estado} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <span className="text-zinc-400 text-sm">Ver detalles →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  interface ToggleVisibilidadParams {
    productoId: number;
    visibleActual: boolean;
  }

  interface Producto {
    id: number;
    visible: boolean;
    liquidacion?: boolean;
    top_ventas?: boolean;
    [key: string]: any;
  }

  const toggleVisibilidad = async (
    productoId: ToggleVisibilidadParams["productoId"],
    visibleActual: ToggleVisibilidadParams["visibleActual"]
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from("productos")
        .update({ visible: !visibleActual })
        .eq("id", productoId);

      if (error) throw error;

      // Actualizar el estado local para reflejar el cambio inmediatamente
      setArticulos((prevArticulos: Producto[]) =>
        prevArticulos.map((art: Producto) =>
          art.id === productoId ? { ...art, visible: !visibleActual } : art
        )
      );

      // Opcional: Mostrar mensaje de éxito
      console.log("Visibilidad actualizada correctamente");
    } catch (error) {
      console.error("Error al actualizar visibilidad:", error);
      // Opcional: Mostrar mensaje de error al usuario
    }
  };

  const toggleLiquidacion = async (
    productoId: number,
    liquidacionActual: boolean
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from("productos")
        .update({ liquidacion: !liquidacionActual })
        .eq("id", productoId);

      if (error) throw error;

      setArticulos((prevArticulos: Producto[]) =>
        prevArticulos.map((art: Producto) =>
          art.id === productoId
            ? { ...art, liquidacion: !liquidacionActual }
            : art
        )
      );

      console.log("Liquidación actualizada correctamente");
    } catch (error) {
      console.error("Error al actualizar liquidación:", error);
    }
  };

  const toggleTopVentas = async (
    productoId: number,
    topVentasActual: boolean
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from("productos")
        .update({ top_ventas: !topVentasActual })
        .eq("id", productoId);

      if (error) throw error;

      setArticulos((prevArticulos: Producto[]) =>
        prevArticulos.map((art: Producto) =>
          art.id === productoId ? { ...art, top_ventas: !topVentasActual } : art
        )
      );

      console.log("Top ventas actualizado correctamente");
    } catch (error) {
      console.error("Error al actualizar top ventas:", error);
    }
  };

  const HorariosDisplay = ({ cuentaId }: { cuentaId: number }) => {
    const [horarios, setHorarios] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);

    const diasSemana = [
      { dia: 0, nombre: "Domingo" },
      { dia: 1, nombre: "Lunes" },
      { dia: 2, nombre: "Martes" },
      { dia: 3, nombre: "Miércoles" },
      { dia: 4, nombre: "Jueves" },
      { dia: 5, nombre: "Viernes" },
      { dia: 6, nombre: "Sábado" },
    ];

    useEffect(() => {
      const cargarHorarios = async () => {
        if (!cuentaId) return;

        setCargando(true);
        const { data, error } = await supabase
          .from("horarios_recepcion")
          .select("*")
          .eq("cuenta_id", cuentaId)
          .order("dia_semana", { ascending: true });

        if (!error && data) {
          setHorarios(data);
        }
        setCargando(false);
      };

      cargarHorarios();
    }, [cuentaId]);

    if (cargando) {
      return (
        <div className="flex justify-center py-4">
          <div className="animate-spin h-6 w-6 border-2 border-zinc-300 border-t-orange-500 rounded-full"></div>
        </div>
      );
    }

    if (horarios.length === 0) {
      return (
        <p className="text-xs text-zinc-500 italic">
          No hay horarios de recepción configurados
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {diasSemana.map((dia) => {
          const horario = horarios.find((h) => h.dia_semana === dia.dia);

          return (
            <div
              key={dia.dia}
              className="flex items-center justify-between py-2 border-b border-zinc-200 last:border-b-0"
            >
              <span className="text-sm font-medium text-zinc-700">
                {dia.nombre}
              </span>
              {horario && !horario.cerrado ? (
                <span className="text-xs text-zinc-600">
                  {horario.hora_inicio} - {horario.hora_fin}
                </span>
              ) : (
                <span className="text-xs text-zinc-400 italic">Cerrado</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // visualizacion personal de la cuenta

  const ConfigForm = ({ cuenta, setCuenta }: any) => {
    return (
      <motion.div
        key="settings"
        className="min-h-screen"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(event, info) => {
          if (info.offset.x > 100) {
            setVistaPerfil("menu");
          }
        }}
      >
        <BackBtn onBack={() => setVistaPerfil("menu")} />

        <div className="space-y-4">
          <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
            <label className="block text-xs font-semibold text-zinc-500 mb-1">
              Nombre del cliente
            </label>
            <p className="text-sm text-zinc-700">
              {cuenta?.cliente || "No especificado"}
            </p>
          </div>

          <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
            <label className="block text-xs font-semibold text-zinc-500 mb-1">
              Nombre del negocio
            </label>
            <p className="text-sm text-zinc-700">
              {cuenta?.ferreteria || "No especificado"}
            </p>
          </div>

          <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
            <label className="block text-xs font-semibold text-zinc-500 mb-2">
              Dirección
            </label>
            <p className="text-sm text-zinc-700 whitespace-pre-wrap">
              {cuenta?.direccion || "No hay dirección registrada"}
            </p>
          </div>

          <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
            <label className="block text-xs font-semibold text-zinc-500 mb-1">
              Teléfono
            </label>
            <p className="text-sm text-zinc-700">
              {cuenta?.numero_tel || "No especificado"}
            </p>
          </div>

          {/* Horarios de recepción */}

          <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
            <label className="block text-xs font-semibold text-zinc-500 mb-3">
              Horarios de Recepción
            </label>
            <HorariosDisplay cuentaId={cuenta?.id} />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <svg
              className="w-12 h-12 mx-auto text-blue-500 mb-2"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-blue-800">
              Esta información solo puede ser modificada por el administrador
            </p>
          </div>
        </div>
      </motion.div>
    );
  };

  //aqui termina vista producto
  const getNombreMarca = (marcaId: number) => {
    if (!marcaId) return "Sin marca";
    const marca = marcas.find((m) => m.id === marcaId);
    return marca ? marca.nombre_marca : "Sin marca";
  };

  // Mostrar vista de producto si hay uno seleccionado
  if (productoSeleccionado) {
    return (
      <VistaProducto
        producto={productoSeleccionado}
        onBack={() => {
          setProductoSeleccionado(null);
          const savedScroll = localStorage.getItem("scrollProducto");
          if (savedScroll) {
            setTimeout(() => {
              window.scrollTo({
                top: parseInt(savedScroll),
                behavior: "instant",
              });
            }, 50);
          }
        }}
        esAdmin={esAdmin}
        carrito={carrito}
        setCarrito={setCarrito}
        cuenta={cuenta}
        supabase={supabase}
        marcas={marcas}
        esFavorito={esFavorito}
        toggleFavorito={toggleFavorito}
        categoriasAdmin={categoriasAdmin}
      />
    );
  }

  const MenuItem = ({ label, icon, onClick, danger }: any) => (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      className={`w-full flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border 
      ${
        danger ? "text-red-500 border-red-300" : "text-zinc-700 border-zinc-200"
      }
    `}
    >
      <div className="flex items-center gap-4 text-lg">
        <span className="text-xl">{icon}</span>
        <span className="font-semibold">{label}</span>
      </div>
      <span className="text-zinc-400">{">"}</span>
    </motion.button>
  );

  return (
    <>
      <InstallPWA />
      <AnimatePresence mode="wait">
        {/* LOGIN ANTES DE ENTRAR A LA APP */}
        {!cuentaActiva ? (
          <motion.div
            key="login"
            initial={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="min-h-screen bg-gradient-to-tr from-slate-50 to-gray-50 flex flex-col justify-center shadow items-center p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-md bg-white rounded-xl shadow p-9"
            >
              <h1 className="text-2xl font-bold text-zinc-800 mb-4">
                Ingresar a catálogo
              </h1>

              <p className="text-zinc-600 mb-6">
                Introduce tu número de cuenta para continuar
              </p>

              <div className="relative w-full">
                <input
                  type={mostrar ? "text" : "password"}
                  placeholder="Número de cuenta"
                  value={numCuentaInput}
                  onChange={(e) => setNumCuentaInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      validarCuenta();
                    }
                  }}
                  className="border border-zinc-300 text-zinc-600 rounded-lg px-4 py-3 w-full text-center text-lg"
                />
                <button
                  type="button"
                  onClick={() => setMostrar(!mostrar)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {mostrar ? (
                      <motion.div
                        key="off"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Eye size={22} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="on"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                      >
                        <EyeOff size={22} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </div>

              <AnimatePresence>
                {errorLogin && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-red-500 text-sm mt-2"
                  >
                    {errorLogin}
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                onClick={validarCuenta}
                className="mt-5 bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition"
              >
                Entrar
              </button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="flex min-h-screen flex-col  bg-white font-sans"
          >
            <header className="p-6 pt-6 bg-orange-500 sticky top-0 z-50 border-zinc-200">
              {/* <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="flex items-center justify-center gap-3 mb-4"
                >
                  
                  <div className="relative w-30 h-20">
                    <Image
                      src="/logo-bfm.jpg"
                      alt="Logo Bodega Ferretera de Monterrey"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <h1 className="text-2xl font-bold text-zinc-900">
                    BODEGA FERRETERA DE MONTERREY
                  </h1>
                  
                </motion.div>
              </AnimatePresence>*/}

              <AnimatePresence>
                {activeTab === "carrito" && cuenta && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="absolute top-5 px-3 left-0 right-0 z-10"
                  >
                    <ContadorEntrega
                      entregaMismoDia={cuenta.entrega_mismo_dia}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
  {activeTab === "ubicacion" && (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="absolute top-7 px-3 left-0 right-0 z-10"
    >
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-6 py-2 flex items-center justify-center gap-2 shadow-sm">
  <Star size={15} className="text-yellow-800" />

  <span className="text-sm font-semibold text-yellow-800">
    Mis favoritos
  </span>
</div>

    </motion.div>
  )}
</AnimatePresence>


              <div className="max-w-2xl mx-auto">
                <AnimatePresence mode="wait">
                  {!["carrito", "perfil", "ubicacion"].includes(activeTab) ? (
                    <motion.div
                      key="header-search"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <div className="flex items-center gap-2">
                        {/* Botón volver - solo si hay algo seleccionado */}
                        <AnimatePresence>
                          {(macroCategoriaSeleccionada ||
                            categoriaSeleccionada ||
                            marcaSeleccionada) &&
                            activeTab !== "buscar" && (
                              <motion.button
                                initial={{ opacity: 0, x: -20, scale: 0.8 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -20, scale: 0.8 }}
                                transition={{
                                  duration: 0.3,
                                  ease: [0.4, 0, 0.2, 1],
                                }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                  if (
                                    categoriaSeleccionada ||
                                    marcaSeleccionada
                                  ) {
                                    setCategoriaSeleccionada(null);
                                    setMarcaSeleccionada(null);
                                    setSearchTerm("");
                                    setProductos([]);
                                    const savedScroll =
                                      localStorage.getItem("scrollPos");
                                    if (savedScroll) {
                                      setTimeout(() => {
                                        window.scrollTo({
                                          top: parseInt(savedScroll),
                                          behavior: "instant",
                                        });
                                      }, 50);
                                    }
                                  } else if (macroCategoriaSeleccionada) {
                                    setMacroCategoriaSeleccionada(null);
                                    setSearchTerm("");
                                    setProductos([]);
                                    const savedScroll =
                                      localStorage.getItem("scrollPos");
                                    if (savedScroll) {
                                      setTimeout(() => {
                                        window.scrollTo({
                                          top: parseInt(savedScroll),
                                          behavior: "instant",
                                        });
                                      }, 50);
                                    }
                                  }
                                }}
                                className="bg-white text-orange-500 rounded-full p-2 transition-colors flex-shrink-0 shadow-md hover:bg-orange-50"
                              >
                                <ChevronLeft size={20} />
                              </motion.button>
                            )}
                        </AnimatePresence>

                        {/* Campo de búsqueda */}
                        <AnimatePresence mode="wait">
                          {(activeTab === "buscar" ||
                            activeTab === "categorias") && (
                            <motion.div
                              key="search-bar"
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ duration: 0.2 }}
                              className="relative flex-1"
                            >
                              <input
                                ref={searchInputRef}
                                type="text"
                                placeholder={
                                  categoriaSeleccionada
                                    ? `Buscar en ${categoriaSeleccionada.nombre_categoria}`
                                    : marcaSeleccionada
                                    ? `Buscar en ${marcaSeleccionada.nombre_marca}`
                                    : "Buscar en Bodega Ferretera De Monterrey..."
                                }
                                value={searchTerm}
                                onChange={async (e) => {
                                  const value = e.target.value;
                                  setSearchTerm(value);

                                  if (value.trim() === "") {
                                    setProductos([]);
                                    return;
                                  }

                                  const palabras = value.trim().split(/\s+/);

                                  let query = supabase
                                    .from("productos")
                                    .select("*");

                                  if (categoriaSeleccionada) {
                                    query = query.eq(
                                      "CATEGORIA_ID",
                                      categoriaSeleccionada.id_categoria
                                    );
                                  } else if (marcaSeleccionada) {
                                    query = query.eq(
                                      "marca_id",
                                      marcaSeleccionada.id
                                    );
                                  }

                                  palabras.forEach((palabra) => {
                                    query = query.or(
                                      `TITULO.ilike.%${palabra}%,CODIGO.ilike.%${palabra}%,C_PRODUCTO.ilike.%${palabra}%`
                                    );
                                  });

                                  query = query.limit(50);

                                  const { data, error } = await query;

                                  if (error) {
                                    console.error(
                                      "Error buscando productos:",
                                      error.message
                                    );
                                  } else {
                                    const productosNormalizados = (
                                      data || []
                                    ).map((producto) => ({
                                      ...producto,
                                      visible: producto.visible ?? true,
                                    }));
                                    setProductos(productosNormalizados);
                                    setProductosMostrados(10);
                                  }
                                }}
                                onFocus={() => {
                                  if (searchTerm.trim()) {
                                    const fetchProductos = async () => {
                                      let query = supabase
                                        .from("productos")
                                        .select(
                                          "id, TITULO, CODIGO, IMAGEN, P_MAYOREO, visible, marca_id, CATEGORIA_ID"
                                        );

                                      if (categoriaSeleccionada) {
                                        query = query.eq(
                                          "CATEGORIA_ID",
                                          categoriaSeleccionada.id_categoria
                                        );
                                      } else if (marcaSeleccionada) {
                                        query = query.eq(
                                          "marca_id",
                                          marcaSeleccionada.id
                                        );
                                      }

                                      query = query
                                        .or(
                                          `TITULO.ilike.%${searchTerm}%,CODIGO.ilike.%${searchTerm}%,C_PRODUCTO.ilike.%${searchTerm}%`
                                        )
                                        .limit(50);
                                      const { data } = await query;

                                      const productosNormalizados = (
                                        data || []
                                      ).map((producto) => ({
                                        ...producto,
                                        visible: producto.visible ?? true,
                                      }));
                                      setProductos(productosNormalizados);
                                      setProductosMostrados(10);
                                    };

                                    fetchProductos();
                                  }
                                }}
                                className="w-full rounded-full border bg-white border-zinc-300 pl-10 pr-10 py-2.5 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-white transition-all duration-200"
                              />
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />

                              {/* Botón limpiar búsqueda */}
                              <AnimatePresence>
                                {searchTerm && (
                                  <motion.button
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => {
                                      setSearchTerm("");
                                      setProductos([]);
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                                  >
                                    <X size={18} />
                                  </motion.button>
                                )}
                              </AnimatePresence>

                              {/* Botón escáner (solo en Buscar) */}
                              <AnimatePresence>
                                {!searchTerm && (
                                  <motion.button
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => {
                                      if (activeTab !== "buscar") {
                                        setActiveTab("buscar");
                                      }
                                      setScannerOpen(true);
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-500 hover:text-orange-600 transition-colors"
                                  >
                                    <ScanBarcode size={20} />
                                  </motion.button>
                                )}
                              </AnimatePresence>

                              {/* Sugerencias de búsqueda */}
                              <AnimatePresence>
                                {searchTerm &&
                                  productos.length > 0 &&
                                  !categoriaSeleccionada &&
                                  !marcaSeleccionada &&
                                  activeTab !== "buscar" && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -10 }}
                                      transition={{
                                        duration: 0.3,
                                        ease: [0.4, 0, 0.2, 1],
                                      }}
                                      className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-96 overflow-y-auto z-50"
                                    >
                                      {productos
                                        .filter(
                                          (prod) =>
                                            esAdmin || (prod.visible ?? true)
                                        )
                                        .slice(0, 10)
                                        .map((prod, index) => (
                                          <motion.div
                                            key={prod.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{
                                              delay: index * 0.03,
                                              duration: 0.2,
                                            }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                              setProductoSeleccionado(prod);
                                              setSearchTerm("");
                                              setProductos([]);
                                            }}
                                            className="flex items-center gap-3 p-3 hover:bg-zinc-50 cursor-pointer border-b border-zinc-100 last:border-b-0 transition-colors"
                                          >
                                            <div className="relative w-12 h-12 rounded-md overflow-hidden bg-zinc-100 flex-shrink-0">
                                              <Image
                                                src={
                                                  prod.IMAGEN ||
                                                  "/placeholder.jpg"
                                                }
                                                alt={prod.TITULO}
                                                fill
                                                className="object-contain"
                                              />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className="font-semibold text-sm text-zinc-800 truncate">
                                                {prod.TITULO}
                                              </p>
                                              <p className="text-xs text-zinc-500">
                                                Código: {prod.CODIGO}
                                              </p>
                                              {!esAdmin && !esMostrador && (
                                                <p className="text-xs text-orange-500 font-semibold">
                                                  ${prod.P_MAYOREO?.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}
                                                </p>
                                              )}
                                            </div>
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              fill="none"
                                              viewBox="0 0 24 24"
                                              strokeWidth={2}
                                              stroke="currentColor"
                                              className="w-4 h-4 text-zinc-400 flex-shrink-0"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M8.25 4.5l7.5 7.5-7.5 7.5"
                                              />
                                            </svg>
                                          </motion.div>
                                        ))}

                                      {productos.length > 10 && (
                                        <div className="p-3 text-center text-xs text-zinc-500 bg-zinc-50">
                                          Mostrando 10 de {productos.length}{" "}
                                          resultados
                                        </div>
                                      )}
                                    </motion.div>
                                  )}
                              </AnimatePresence>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Breadcrumb */}
                      <AnimatePresence>
                        {(macroCategoriaSeleccionada ||
                          categoriaSeleccionada ||
                          marcaSeleccionada) &&
                          activeTab !== "buscar" && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{
                                duration: 0.3,
                                ease: [0.4, 0, 0.2, 1],
                              }}
                              className="flex items-center gap-2 mt-3 text-xs text-amber-100 overflow-x-auto pb-1"
                            >
                              <button
                                onClick={() => {
                                  setMacroCategoriaSeleccionada(null);
                                  setCategoriaSeleccionada(null);
                                  setMarcaSeleccionada(null);
                                  setSearchTerm("");
                                  setProductos([]);
                                }}
                                className="hover:text-white whitespace-nowrap transition-colors"
                              >
                                Inicio
                              </button>

                              {macroCategoriaSeleccionada && (
                                <>
                                  <ChevronLeft
                                    size={12}
                                    className="rotate-180 flex-shrink-0"
                                  />
                                  <button
                                    onClick={() => {
                                      setCategoriaSeleccionada(null);
                                      setMarcaSeleccionada(null);
                                      setSearchTerm("");
                                      setProductos([]);
                                    }}
                                    className="hover:text-white whitespace-nowrap transition-colors"
                                  >
                                    {macroCategoriaSeleccionada.nombre.length >
                                    20
                                      ? macroCategoriaSeleccionada.nombre.slice(
                                          0,
                                          20
                                        ) + "…"
                                      : macroCategoriaSeleccionada.nombre}
                                  </button>
                                </>
                              )}

                              {categoriaSeleccionada && (
                                <>
                                  <ChevronLeft
                                    size={12}
                                    className="rotate-180 flex-shrink-0"
                                  />
                                  <span className="text-white font-semibold whitespace-nowrap">
                                    {categoriaSeleccionada.nombre_categoria}
                                  </span>
                                </>
                              )}

                              {marcaSeleccionada && (
                                <>
                                  <ChevronLeft
                                    size={12}
                                    className="rotate-180 flex-shrink-0"
                                  />
                                  <span className="text-white font-semibold whitespace-nowrap">
                                    {marcaSeleccionada.nombre_marca}
                                  </span>
                                </>
                              )}
                            </motion.div>
                          )}
                      </AnimatePresence>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="header-simple"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="h-[44px]"
                    />
                  )}
                </AnimatePresence>
              </div>
            </header>

            {/* Contenido dinámico */}
            <main className="flex-1 pt-5 px-4 pb-32 overflow-hidden">
              <AnimatePresence mode="wait">
                {/* Categorías */}
                {activeTab === "categorias" && (
                  <motion.div
                    key="categorias"
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    {/* Banner de anuncio */}
<AnimatePresence>
  {!cargandoBanner && bannerAnuncio && (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="px-6 mb-4"
    >
      <div className={`rounded-xl p-4 border-2 shadow-sm ${
        bannerAnuncio.color === 'blue' ? 'bg-blue-50 border-blue-200' :
        bannerAnuncio.color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
        bannerAnuncio.color === 'red' ? 'bg-red-50 border-red-200' :
        bannerAnuncio.color === 'green' ? 'bg-green-50 border-green-200' :
        'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-start gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className={`w-6 h-6 flex-shrink-0 ${
              bannerAnuncio.color === 'blue' ? 'text-blue-600' :
              bannerAnuncio.color === 'yellow' ? 'text-yellow-600' :
              bannerAnuncio.color === 'red' ? 'text-red-600' :
              bannerAnuncio.color === 'green' ? 'text-green-600' :
              'text-blue-600'
            }`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"
            />
          </svg>
          <div className="flex-1">
            <p className={`font-bold text-sm ${
              bannerAnuncio.color === 'blue' ? 'text-blue-900' :
              bannerAnuncio.color === 'yellow' ? 'text-yellow-900' :
              bannerAnuncio.color === 'red' ? 'text-red-900' :
              bannerAnuncio.color === 'green' ? 'text-green-900' :
              'text-blue-900'
            }`}>
              {bannerAnuncio.titulo}
            </p>
            <p className={`text-xs mt-1 ${
              bannerAnuncio.color === 'blue' ? 'text-blue-800' :
              bannerAnuncio.color === 'yellow' ? 'text-yellow-800' :
              bannerAnuncio.color === 'red' ? 'text-red-800' :
              bannerAnuncio.color === 'green' ? 'text-green-800' :
              'text-blue-800'
            }`}>
              {bannerAnuncio.mensaje}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>
                    {/* Si no hay nada seleccionado, mostrar pestañas con Macro-Categorías y Marcas */}
                    {!macroCategoriaSeleccionada &&
                    !categoriaSeleccionada &&
                    !marcaSeleccionada ? (
                      <motion.div
                        key="menu-principal"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -30 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="px-3 mt-4"
                      >
                        {/* Pestañas Categorías / Marcas */}
                        <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 shadow-sm">
                          <button
                            onClick={() => setSubTab("categorias")}
                            className={`flex-1 py-3 rounded-lg font-semibold transition ${
                              subTab === "categorias"
                                ? "bg-orange-500 text-white"
                                : "text-zinc-600 hover:bg-zinc-100"
                            }`}
                          >
                            CATEGORÍAS
                          </button>
                          <button
                            onClick={() => setSubTab("marcas")}
                            className={`flex-1 py-3 rounded-lg font-semibold transition ${
                              subTab === "marcas"
                                ? "bg-orange-500 text-white"
                                : "text-zinc-600 hover:bg-zinc-100"
                            }`}
                          >
                            MARCAS
                          </button>
                        </div>

                        {/* Grid de Macro-Categorías */}
                        {subTab === "categorias" && (
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                            {macroCategorias.map((macro) => (
                              <div
                                key={macro.id}
                                onClick={async () => {
                                  localStorage.setItem(
                                    "scrollPos",
                                    window.scrollY.toString()
                                  );
                                  if (window.scrollY > 100) {
                                    window.scrollTo({
                                      top: 0,
                                      behavior: "instant",
                                    });
                                  }
                                  setCategorias([]);
                                  setMacroCategoriaSeleccionada(macro);

                                  // Cargar categorías de esta macro-categoría
                                  const { data, error } = await supabase
                                    .from("categorias")
                                    .select(
                                      "id_categoria, nombre_categoria, img, orden"
                                    )
                                    .eq("macro_categoria_id", macro.id)
                                    .order("orden", { ascending: true });

                                  setCategorias(data || []);
                                  requestAnimationFrame(() => {
                                    window.scrollTo({
                                      top: 0,
                                      behavior: "instant",
                                    });
                                  });
                                }}
                                className="rounded-xl overflow-hidden bg-white shadow hover:shadow-md transition cursor-pointer"
                              >
                                <div className="relative w-full h-40">
                                  <SkeletonImage
                                    src={macro.img || "/placeholder.jpg"}
                                    alt={macro.nombre}
                                    className="object-contain"
                                  />
                                </div>
                                <div className="p-2 text-center font-semibold text-zinc-800 text-sm">
                                  {macro.nombre}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {macroCategorias.length === 0 &&
                          subTab === "categorias" && (
                            <div className="flex items-center justify-center py-20">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                                className="w-12 h-12 border-4 border-zinc-200 border-t-orange-500 rounded-full"
                              />
                            </div>
                          )}
                        {/* Grid de Marcas */}
                        {subTab === "marcas" && (
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                            {marcas.map((marca) => (
                              <div
                                key={marca.id}
                                onClick={async () => {
                                  localStorage.setItem(
                                    "scrollPos",
                                    window.scrollY.toString()
                                  );
                                  if (window.scrollY > 100) {
                                    window.scrollTo({
                                      top: 0,
                                      behavior: "instant",
                                    });
                                  }
                                  setArticulos([]);
                                  setMarcaSeleccionada(marca);

                                  const { data, error } = await supabase
                                    .from("productos")
                                    .select(
                                      "id, TITULO, CODIGO, IMAGEN, P_MAYOREO, visible, liquidacion, top_ventas, marca_id, CATEGORIA_ID"
                                    )

                                    .eq("marca_id", marca.id);

                                  const productosNormalizados = (
                                    data || []
                                  ).map((producto) => ({
                                    ...producto,
                                    visible: producto.visible ?? true,
                                  }));

                                  setArticulos(
                                    error ? [] : productosNormalizados
                                  );
                                  requestAnimationFrame(() => {
                                    window.scrollTo({
                                      top: 0,
                                      behavior: "instant",
                                    });
                                  });
                                }}
                                className="rounded-xl overflow-hidden bg-white shadow hover:shadow-md transition cursor-pointer"
                              >
                                <div className="relative w-full h-28 sm:h-36 md:h-40 overflow-hidden">
                                  <SkeletonImage
                                    src={marca.img || "/placeholder.jpg"}
                                    alt={marca.nombre_marca}
                                    className="object-contain object-center w-full h-full"
                                  />
                                </div>
                                <div className="p-2 text-center font-semibold text-zinc-800 text-sm truncate">
                                  {marca.nombre_marca}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ) : macroCategoriaSeleccionada &&
                      !categoriaSeleccionada &&
                      !marcaSeleccionada ? (
                      /* Mostrar subcategorías dentro de la categoría seleccionada */
                      <motion.div
                        key="categorias-en-macro"
                        className="min-h-screen"
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragEnd={(event, info) => {
                          if (info.offset.x > 100) {
                            setMacroCategoriaSeleccionada(null);
                          }
                        }}
                      >
                        <h2 className="text-xl font-bold text-zinc-800 mb-4">
                          {macroCategoriaSeleccionada.nombre}
                        </h2>

                        {/* Grid de Categorías dentro de la macro */}
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                          {categorias.map((cat) => (
                            <div
                              key={cat.id_categoria}
                              onClick={async () => {
                                localStorage.setItem(
                                  "scrollPos",
                                  window.scrollY.toString()
                                );
                                if (window.scrollY > 100) {
                                  window.scrollTo({
                                    top: 0,
                                    behavior: "instant",
                                  });
                                }
                                setArticulos([]);
                                setCategoriaSeleccionada(cat);

                                const { data, error } = await supabase
                                  .from("productos")
                                  .select("*")

                                  .eq("CATEGORIA_ID", cat.id_categoria);

                                const productosNormalizados = (data || []).map(
                                  (producto) => ({
                                    ...producto,
                                    visible: producto.visible ?? true,
                                  })
                                );

                                setArticulos(
                                  error ? [] : productosNormalizados
                                );
                                requestAnimationFrame(() => {
                                  window.scrollTo({
                                    top: 0,
                                    behavior: "instant",
                                  });
                                });
                              }}
                              className="rounded-xl overflow-hidden bg-white shadow hover:shadow-md transition cursor-pointer"
                            >
                              <div className="relative w-full h-40">
                                <SkeletonImage
                                  src={cat.img || "/placeholder.jpg"}
                                  alt={cat.nombre_categoria}
                                  className="object-contain"
                                />
                              </div>
                              <div className="p-2 text-center font-semibold text-zinc-800 text-sm">
                                {cat.nombre_categoria}
                              </div>
                            </div>
                          ))}
                        </div>

                        {categorias.length === 0 && (
                          <p className="text-center text-zinc-500 py-10">
                            No hay subcategorías en esta categoría.
                          </p>
                        )}
                      </motion.div>
                    ) : (
                      /* Vista de productos (cuando hay categoría o marca seleccionada) */
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={
                            categoriaSeleccionada?.id_categoria ||
                            marcaSeleccionada?.id
                          }
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -30 }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                          className="pb-20"
                          drag="x"
                          dragConstraints={{ left: 0, right: 0 }}
                          onDragEnd={(event, info) => {
                            if (info.offset.x > 100) {
                              setCategoriaSeleccionada(null);
                              setMarcaSeleccionada(null);
                              const savedScroll =
                                localStorage.getItem("scrollPos");
                              if (savedScroll) {
                                setTimeout(() => {
                                  window.scrollTo({
                                    top: parseInt(savedScroll),
                                    behavior: "instant",
                                  });
                                }, 50);
                              }
                            }
                          }}
                        >
                          {/* Banner búsqueda */}
                          <AnimatePresence>
                            {searchTerm && (
                              <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="mb-4"
                              >
                                <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-2">
                                  <p className="text-sm text-orange-800">
                                    Buscando:
                                    <span className="font-semibold ml-1">
                                      "{searchTerm}"
                                    </span>
                                    {articulosFiltrados.length > 0 && (
                                      <span className="ml-2 text-orange-700">
                                        ({articulosFiltrados.length} resultado
                                        {articulosFiltrados.length !== 1
                                          ? "s"
                                          : ""}
                                        )
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <div className="relative w-full h-70 rounded-xl overflow-hidden mb-3">
                            <SkeletonImage
                              src={
                                categoriaSeleccionada?.img ||
                                marcaSeleccionada?.img ||
                                "/placeholder.jpg"
                              }
                              alt={
                                categoriaSeleccionada?.nombre_categoria ||
                                marcaSeleccionada?.nombre_marca
                              }
                              className="object-contain"
                            />
                          </div>

                          <div className="flex items-center justify-between mb-3">
                            <h2 className="text-xl font-bold text-zinc-800">
                              {categoriaSeleccionada?.nombre_categoria ||
                                marcaSeleccionada?.nombre_marca}
                            </h2>
                          </div>

                          {/* Grid productos */}
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 pb-10">
                            <AnimatePresence>
                              {articulos
                                .filter((a) => {
                                  if (!esAdmin && !a.visible) return false;
                                  return (
                                    (a.TITULO &&
                                      a.TITULO.toLowerCase().includes(
                                        searchTerm.toLowerCase()
                                      )) ||
                                    (a.CODIGO &&
                                      a.CODIGO.toLowerCase().includes(
                                        searchTerm.toLowerCase()
                                      ))
                                  );
                                })
                                .map((art) => (
                                  <motion.div
                                    key={art.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{
                                      duration: 0.2,
                                      ease: "easeOut",
                                    }}
                                    onClick={() => {
                                      const scrollY = window.scrollY;
                                      localStorage.setItem(
                                        "scrollProducto",
                                        scrollY.toString()
                                      );
                                      setProductoSeleccionado(art);
                                    }}
                                    className="rounded-xl overflow-hidden bg-white shadow hover:shadow-md transition cursor-pointer"
                                  >
                                    <div className="relative w-full h-40 bg-white">
                                      <SkeletonImage
                                        src={art.IMAGEN || "/placeholder.jpg"}
                                        alt={art.TITULO}
                                        className="object-contain"
                                      />
                                      {/* Badges de Liquidación y Top Ventas */}
                                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                                        {art.liquidacion && (
                                          <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                                            LIQUIDACIÓN
                                          </span>
                                        )}
                                        {art.top_ventas && (
                                          <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                                            MAS VENDIDOS
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="p-2">
                                      <p className="text-xs text-orange-500 font-medium">
                                        {getNombreMarca(art.marca_id)}
                                      </p>
                                      <p className="text-sm font-semibold text-zinc-700 line-clamp-2">
                                        {art.TITULO}
                                      </p>
                                      <p className="text-xs text-zinc-500 mt-1">
                                        {art.CODIGO}
                                      </p>

                                      {!esAdmin && !esMostrador &&(
                                        <p className="text-sm font-bold text-orange-500 mt-1">
                                          ${" "}
                                          {art.P_MAYOREO?.toLocaleString(
                                            "en-US",
                                            {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            }
                                          )}
                                        </p>
                                      )}

                                      {/* Toggle (solo admin) */}
                                      {esAdmin && (
                                        <div
                                          className="flex flex-col gap-2 mt-2"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {/* Toggle Visible */}
                                          <div className="flex items-center gap-2">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={art.visible}
                                                onChange={() =>
                                                  toggleVisibilidad(
                                                    art.id,
                                                    art.visible
                                                  )
                                                }
                                                className="sr-only peer"
                                              />
                                              <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:w-5 after:h-5 after:rounded-full after:transition-all peer-checked:after:translate-x-full"></div>
                                            </label>
                                            <span className="text-xs text-zinc-500">
                                              {art.visible
                                                ? "Visible"
                                                : "Oculto"}
                                            </span>
                                          </div>

                                          {/* Toggle Liquidación */}
                                          <div className="flex items-center gap-2">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={
                                                  art.liquidacion ?? false
                                                }
                                                onChange={() =>
                                                  toggleLiquidacion(
                                                    art.id,
                                                    art.liquidacion ?? false
                                                  )
                                                }
                                                className="sr-only peer"
                                              />
                                              <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-red-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:w-5 after:h-5 after:rounded-full after:transition-all peer-checked:after:translate-x-full"></div>
                                            </label>
                                            <span className="text-xs text-zinc-500">
                                              {art.liquidacion
                                                ? "En Liquidación"
                                                : "Liquidación"}
                                            </span>
                                          </div>

                                          {/* Toggle Top Ventas */}
                                          <div className="flex items-center gap-2">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={
                                                  art.top_ventas ?? false
                                                }
                                                onChange={() =>
                                                  toggleTopVentas(
                                                    art.id,
                                                    art.top_ventas ?? false
                                                  )
                                                }
                                                className="sr-only peer"
                                              />
                                              <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-green-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:w-5 after:h-5 after:rounded-full after:transition-all peer-checked:after:translate-x-full"></div>
                                            </label>
                                            <span className="text-xs text-zinc-500">
                                              {art.top_ventas
                                                ? "Top Ventas"
                                                : "Top Ventas"}
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                ))}
                            </AnimatePresence>

                            {articulos.filter((a) => {
                              if (!esAdmin && !a.visible) return false;
                              return (
                                (a.TITULO &&
                                  a.TITULO.toLowerCase().includes(
                                    searchTerm.toLowerCase()
                                  )) ||
                                (a.CODIGO &&
                                  a.CODIGO.toLowerCase().includes(
                                    searchTerm.toLowerCase()
                                  ))
                              );
                            }).length === 0 && (
                              <motion.p
                                className="text-center text-zinc-500 py-10 col-span-full"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                {searchTerm
                                  ? `No se encontraron productos que coincidan con "${searchTerm}"`
                                  : `No hay productos en esta ${
                                      categoriaSeleccionada
                                        ? "categoría"
                                        : "marca"
                                    }.`}
                              </motion.p>
                            )}
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </motion.div>
                )}

                {/* Buscar */}
                {activeTab === "buscar" && (
                  <motion.div
                    key="buscar"
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="mt-4 px-4 pb-32">
                      {/* Escáner de código de barras */}
                      {scannerOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mb-4 rounded-xl overflow-hidden border-2 border-orange-300 shadow-lg bg-white"
                        >
                          {/* Indicador de estado */}
                          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                              <span className="text-white text-sm font-medium">
                                Escaneando código de barras...
                              </span>
                            </div>
                            <button
                              onClick={() => setScannerOpen(false)}
                              className="text-white hover:bg-white/20 rounded-full p-1 transition"
                            >
                              <X size={18} />
                            </button>
                          </div>

                          {/* Cámara del escáner */}
                          <div className="relative bg-black">
                            <BarcodeScannerComponent
                              width="100%"
                              height={280}
                              onUpdate={async (err: any, result) => {
                                if (result) {
                                  const codigo = result.getText();

                                  if (codigo) {
                                    if ("vibrate" in navigator)
                                      navigator.vibrate(100);
                                    setSearchTerm(codigo);
                                    setTimeout(
                                      () => setScannerOpen(false),
                                      300
                                    );

                                    try {
                                      // Buscar producto por código
                                      const { data, error } = await supabase
                                        .from("productos")
                                        .select(
                                          "id, TITULO, CODIGO, IMAGEN, P_MAYOREO, visible, liquidacion, top_ventas, marca_id, CATEGORIA_ID, C_PRODUCTO"
                                        )
                                        .or(
                                          `TITULO.ilike.%${codigo}%,CODIGO.ilike.%${codigo}%,C_PRODUCTO.ilike.%${codigo}%`
                                        )
                                        .limit(50);

                                      if (error) {
                                        console.error(
                                          "Error buscando por código:",
                                          error.message
                                        );
                                        alert(
                                          "Error al buscar el producto. Intenta de nuevo."
                                        );
                                        return;
                                      }

                                      // Normalizar visible
                                      const productosNormalizados = (
                                        data || []
                                      ).map((producto) => ({
                                        ...producto,
                                        visible: producto.visible ?? true,
                                      }));

                                      setProductos(productosNormalizados);
                                      setProductosMostrados(10);
                                      if (productosNormalizados.length > 0) {
                                        console.log(
                                          ` ${productosNormalizados.length} producto(s) encontrado(s)`
                                        );
                                      } else {
                                        alert(
                                          `No se encontraron productos con el código: ${codigo}`
                                        );
                                      }
                                    } catch (error) {
                                      console.error(
                                        "Error procesando código:",
                                        error
                                      );
                                      alert(
                                        "Ocurrió un error al procesar el código escaneado."
                                      );
                                    }
                                  }
                                } else if (err) {
                                  if (
                                    (err as Error)?.name !== "NotFoundException"
                                  ) {
                                    console.error("Error del escáner:", err);
                                  }
                                }
                              }}
                            />

                            {/* Overlay con guía de escaneo */}
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                              <div className="border-2 border-white w-64 h-32 rounded-lg shadow-2xl">
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-orange-500"></div>
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-orange-500"></div>
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-orange-500"></div>
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-orange-500"></div>
                              </div>
                            </div>
                            <div className="absolute bottom-4 left-0 right-0 text-center">
                              <p className="text-white text-sm font-medium bg-black/60 backdrop-blur-sm inline-block px-4 py-2 rounded-full">
                                Centra el código de barras en el marco
                              </p>
                            </div>
                          </div>

                          {/* Botones de acción */}
                          <div className="flex gap-2 p-3 bg-zinc-50">
                            <button
                              onClick={() => setScannerOpen(false)}
                              className="flex-1 bg-white border border-zinc-300 text-zinc-700 py-2.5 rounded-lg font-semibold hover:bg-zinc-50 transition flex items-center justify-center gap-2"
                            >
                              <X size={18} />
                              Cancelar
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* Resultados */}
                      <div className="mt-4 space-y-3">
                        {productos
                          .filter((prod) => esAdmin || (prod.visible ?? true))
                          .slice(0, productosMostrados)
                          .map((prod) => (
                            <div
                              key={prod.id}
                              onClick={() => {
                                const scrollY = window.scrollY;
                                localStorage.setItem(
                                  "scrollProducto",
                                  scrollY.toString()
                                );
                                setProductoSeleccionado(prod);
                              }}
                              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div className="relative w-12 h-12 rounded-md overflow-hidden bg-zinc-100">
                                  <Image
                                    src={
                                      prod.IMAGEN ||
                                      "https://via.placeholder.com/150?text=Sin+imagen"
                                    }
                                    alt={prod.TITULO || "Imagen de producto"}
                                    fill
                                    className="object-contain"
                                  />
                                </div>
                                <div>
                                  <p className="font-semibold">{prod.TITULO}</p>
                                  <p className="text-xs text-zinc-500">
                                    Código: {prod.CODIGO}
                                  </p>
                                  {!esAdmin && !esMostrador &&(
                                    <p className="text-xs text-orange-500 font-semibold">
                                      ${prod.P_MAYOREO?.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span className="text-zinc-400">{">"}</span>
                            </div>
                          ))}

                        {productos.filter(
                          (prod) => esAdmin || (prod.visible ?? true)
                        ).length > productosMostrados && (
                          <button
                            onClick={() =>
                              setProductosMostrados((prev) => prev + 10)
                            }
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-semibold transition mt-4"
                          >
                            Ver más productos (
                            {productos.filter(
                              (prod) => esAdmin || (prod.visible ?? true)
                            ).length - productosMostrados}{" "}
                            restantes)
                          </button>
                        )}

                        {searchTerm && productos.length === 0 && (
                          <p className="text-center text-zinc-500 py-10">
                            No se encontraron resultados.
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Carrito */}
                {activeTab === "carrito" && (
                  <motion.div
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="mt-4 px-3 pb-13">
                      {carrito.length === 0 ? (
                        <p className="text-center text-zinc-500 mt-16">
                          Tu carrito está vacío
                        </p>
                      ) : (
                        <>
                          {/* Productos */}
                          <div className="space-y-3">
                            {carrito.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-3 border border-zinc-200 rounded-xl p-3 bg-white shadow-sm"
                              >
                                {/* Imagen */}
                                <div
                                  className="relative w-16 h-16 bg-zinc-100 rounded-md overflow-hidden flex-shrink-0 cursor-pointer"
                                  onClick={() => {
                                    localStorage.setItem(
                                      "scrollProducto",
                                      scrollY.toString()
                                    );
                                    setProductoSeleccionado(item);
                                  }}
                                >
                                  <Image
                                    src={item.IMAGEN || "/placeholder.jpg"}
                                    alt={item.TITULO}
                                    fill
                                    className="object-contain"
                                  />
                                </div>

                                {/* Información del producto */}
                                <div
                                  className="flex-1 min-w-0 cursor-pointer"
                                  onClick={() => {
                                    localStorage.setItem(
                                      "scrollProducto",
                                      scrollY.toString()
                                    );
                                    setProductoSeleccionado(item);
                                  }}
                                >
                                  <p className="text-sm font-semibold text-zinc-800 line-clamp-2 leading-tight">
                                    {item.TITULO}
                                  </p>
                                  <p className="text-xs text-zinc-500 mt-1">
                                    Código: {item.CODIGO}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <p className="text-xs text-zinc-600">
                                      {item.cantidad} × $
                                      {item.P_MAYOREO.toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </p>
                                    <span className="text-xs text-zinc-400">
                                      |
                                    </span>
                                    <p className="text-sm font-bold text-orange-500">
                                      $
                                      {item.subtotal.toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </p>
                                  </div>
                                </div>

                                {/* Botón eliminar */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCarrito((prev) =>
                                      prev.filter((p) => p.id !== item.id)
                                    );
                                  }}
                                  className="w-9 h-9 bg-orange-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center flex-shrink-0 transition"
                                  aria-label="Eliminar producto"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* Total */}

                          {/* Barra de progreso*/}
                          <AnimatePresence>
                            {!ocultarBarra &&
                              (() => {
                                const totalCarrito = carrito.reduce(
                                  (sum, p) => sum + p.subtotal,
                                  0
                                );
                                const minimoRequerido = 1000;
                                const progreso = Math.min(
                                  (totalCarrito / minimoRequerido) * 100,
                                  100
                                );
                                const faltante = Math.max(
                                  minimoRequerido - totalCarrito,
                                  0
                                );

                                return (
                                  <motion.div
                                    key="barra-progreso"
                                    initial={{ opacity: 0, x: -100 }}
                                    animate={{
                                      opacity: 1,
                                      x: 0,
                                      scale:
                                        totalCarrito >= minimoRequerido
                                          ? [1, 1.02, 1]
                                          : 1,
                                    }}
                                    exit={{ opacity: 0, x: 100 }}
                                    transition={{
                                      x: { duration: 0.4, ease: "easeInOut" },
                                      opacity: { duration: 0.3 },
                                      scale: {
                                        duration: 0.6,
                                        repeat:
                                          totalCarrito >= minimoRequerido
                                            ? Infinity
                                            : 0,
                                        repeatDelay: 0.3,
                                      },
                                    }}
                                    className="mb-4 mt-4 bg-white rounded-xl border border-zinc-200 p-4 shadow-sm"
                                  >
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="text-sm font-semibold text-zinc-700">
                                        Pedido mínimo: $1,000.00
                                      </span>
                                      <span
                                        className={`text-sm font-bold ${
                                          totalCarrito >= minimoRequerido
                                            ? "text-green-600"
                                            : "text-orange-600"
                                        }`}
                                      >
                                        $
                                        {totalCarrito.toLocaleString("en-US", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}
                                      </span>
                                    </div>

                                    <div className="w-full bg-zinc-200 rounded-full h-3 overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progreso}%` }}
                                        transition={{
                                          duration: 0.5,
                                          ease: "easeOut",
                                        }}
                                        className={`h-full rounded-full transition-colors ${
                                          progreso === 100
                                            ? "bg-gradient-to-r from-green-500 to-green-600"
                                            : "bg-gradient-to-r from-orange-500 to-orange-600"
                                        }`}
                                      />
                                    </div>

                                    {totalCarrito >= minimoRequerido ? (
                                      <div className="mt-2 flex items-center gap-2 text-green-600">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          strokeWidth={2}
                                          stroke="currentColor"
                                          className="w-5 h-5"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                          />
                                        </svg>
                                        <span className="text-sm font-semibold">
                                          ¡Ya puedes enviar tu pedido!
                                        </span>
                                      </div>
                                    ) : (
                                      <p className="mt-2 text-xs text-zinc-600">
                                        Te faltan{" "}
                                        <span className="font-bold text-orange-600">
                                          ${faltante.toFixed(2)}
                                        </span>{" "}
                                        para realizar el pedido
                                      </p>
                                    )}
                                  </motion.div>
                                );
                              })()}
                          </AnimatePresence>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* perfil */}
                {activeTab === "perfil" && (
                  <motion.div
                    key="perfil"
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="px-6 py-6"
                  >
                    {/* VISTA PRINCIPAL DEL PERFIL */}
                    {vistaPerfil === "menu" && (
                      <motion.div
                        key="perfil-menu"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col items-center"
                      >
                        {/* Avatar */}
                        <div className="w-28 h-28 rounded-full bg-orange-10 overflow-hidden flex items-center justify-center shadow">
                          <Image
                            src="/user-icon-2.jpg"
                            alt="Avatar"
                            width={100}
                            height={100}
                            className="object-contain"
                          />
                        </div>

                        {/* Nombre */}
                        <p className="text-xl font-bold text-zinc-900 mt-3">
                          {cuenta?.cliente}
                        </p>

                        {/* Número de cuenta */}
                        <p className="text-zinc-500 text-sm">
                          {cuenta?.numero_cuenta}
                        </p>

                        {/* Teléfono */}
                        <p className="text-zinc-500 text-sm mt-1">
                          {cuenta?.numero_tel ?? "Sin teléfono"}
                        </p>

                        {/* OPCIONES DEL MENÚ */}
                        <div className="w-full mt-8 space-y-3">
                          {/* Historial de pedidos */}
                          <MenuItem
                            icon={<History size={20} />}
                            label="Mis pedidos"
                            onClick={() => {
                              window.scrollTo({ top: 0, behavior: "instant" });
                              setVistaPerfil("pedidos");
                            }}
                          />

                          {esAdmin && (
                            <MenuItem
                              label="Actualizar base de datos"
                              icon={<DatabaseBackup size={20} />}
                              onClick={() => {
                                window.scrollTo({
                                  top: 0,
                                  behavior: "instant",
                                });
                                setVistaPerfil("actualizar-bd");
                              }}
                            />
                          )}

                          {esAdmin && (
                            <MenuItem
                              label="Agregar producto"
                              icon={<PackagePlus size={20} />}
                              onClick={() => {
                                window.scrollTo({
                                  top: 0,
                                  behavior: "instant",
                                });
                                setVistaPerfil("agregar-producto");
                              }}
                            />
                          )}

                          {esAdmin && (
                            <>
                              <MenuItem
                                label="Agregar o Eliminar Subcategorías"
                                icon={<Boxes size={20} />}
                                onClick={() => {
                                  window.scrollTo({
                                    top: 0,
                                    behavior: "instant",
                                  });
                                  setVistaPerfil("gestionar-categorias");
                                }}
                              />
                              <MenuItem
                                label="Asignar Subcategorías"
                                icon={<Box size={20} />}
                                onClick={() => {
                                  window.scrollTo({
                                    top: 0,
                                    behavior: "instant",
                                  });
                                  setVistaPerfil("asignar-categorias");
                                }}
                              />
                            </>
                          )}

                          {esAdmin && (
                            <MenuItem
                              label="Gestionar Categorías"
                              icon={<SquareStack size={20} />}
                              onClick={() => {
                                window.scrollTo({
                                  top: 0,
                                  behavior: "instant",
                                });
                                setVistaPerfil("gestionar-macro-categorias");
                              }}
                            />
                          )}

                          {esAdmin && (
                            <MenuItem
                              label="Edición de Categorías y Subcategorías"
                              icon={<FilePenLine size={20} />}
                              onClick={() => {
                                window.scrollTo({
                                  top: 0,
                                  behavior: "instant",
                                });
                                setVistaPerfil("edicion-categorias");
                              }}
                            />
                          )}

                          {esAdmin && (
                            <MenuItem
                              label="Agregar o Eliminar Marcas"
                              icon={<Codesandbox size={20} />}
                              onClick={() => {
                                window.scrollTo({
                                  top: 0,
                                  behavior: "instant",
                                });
                                setVistaPerfil("gestionar-marcas");
                              }}
                            />
                          )}

                          {esAdmin && (
                            <MenuItem
                              label="Gestionar Cuentas"
                              icon={<Users size={20} />}
                              onClick={() => {
                                window.scrollTo({
                                  top: 0,
                                  behavior: "instant",
                                });
                                setVistaPerfil("gestionar-cuentas");
                              }}
                            />
                          )}

                          {esAdmin && (
  <MenuItem
    label="Gestionar Banner de Anuncios"
    icon={<Megaphone size={20}/>}
    onClick={() => {
      window.scrollTo({ top: 0, behavior: "instant" });
      setVistaPerfil("gestionar-banner");
    }}
  />
)}

                          {/* personal info  */}
                          <MenuItem
                            label="Informacion Personal"
                            icon={<UserCog size={20} />}
                            onClick={() => {
                              window.scrollTo({ top: 0, behavior: "instant" });
                              setVistaPerfil("settings");
                            }}
                          />

                          {/* Ubicación */}
                          {!esAdmin && (
                            <MenuItem
                              icon={<MapPin size={20} />}
                              label="Ubicación de tienda"
                              onClick={() => {
                                window.scrollTo({
                                  top: 0,
                                  behavior: "instant",
                                });
                                setVistaPerfil("ubicacion");
                              }}
                            />
                          )}
                          {!esAdmin && (
                            <MenuItem
                              label="Apoyo"
                              icon={<FileQuestionMark size={20} />}
                              onClick={() => {
                                window.scrollTo({
                                  top: 0,
                                  behavior: "instant",
                                });
                                setVistaPerfil("apoyo");
                              }}
                            />
                          )}

                          {/* Dirección 
                          <MenuItem
                            label="Shipping Address"
                            icon={<MapPinHouse size={20} />}
                            onClick={() => {
                              window.scrollTo({ top: 0, behavior: "instant" });
                              setVistaPerfil("address");
                            }}
                          />*/}

                          {/* Logout */}
                          <MenuItem
                            label="Cerrar sesión"
                            icon={<LogOut size={20} />}
                            onClick={() => {
                              setCuentaActiva(null);
                              setCuenta(null);
                            }}
                            danger
                          />
                        </div>
                      </motion.div>
                    )}

                    {/* APOYO */}
                    {vistaPerfil === "apoyo" && (
                      <motion.div
                        key={vistaPerfil}
                        className="min-h-screen"
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragEnd={(event, info) => {
                          if (info.offset.x > 100) {
                            setVistaPerfil("menu");
                          }
                        }}
                      >
                        {/* Botón regresar */}
                        <BackBtn onBack={() => setVistaPerfil("menu")} />

                        <h2 className="text-xl font-bold text-zinc-900 mb-4">
                          Apoyo
                        </h2>

                        {selectedApoyo ? (
                          <ApoyoViewer
                            selectedApoyo={selectedApoyo}
                            setSelectedApoyo={setSelectedApoyo}
                          />
                        ) : (
                          <div className="space-y-3">
                            {apoyos.map((item, i) => (
                              <motion.button
                                key={i}
                                onClick={() => setSelectedApoyo(item)}
                                whileTap={{ scale: 0.97 }}
                                className="w-full flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3 shadow-sm hover:bg-zinc-50 transition"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="relative w-14 h-14 rounded-md overflow-hidden bg-zinc-100">
                                    <Image
                                      src={item.imagen}
                                      alt={item.titulo}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                  <span className="font-semibold text-zinc-800 text-sm">
                                    {item.titulo}
                                  </span>
                                </div>
                                <span className="text-zinc-400">{">"}</span>
                              </motion.button>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* ubicacion */}
                    {vistaPerfil === "ubicacion" && (
                      <motion.div
                        key="ubicacion-perfil"
                        className="min-h-screen"
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragEnd={(event, info) => {
                          if (info.offset.x > 100) {
                            setVistaPerfil("menu");
                          }
                        }}
                      >
                        <BackBtn onBack={() => setVistaPerfil("menu")} />

                        <h2 className="text-xl font-bold text-zinc-900 mb-4">
                          Ubicación de la Tienda
                        </h2>

                        <div className="flex flex-col items-center justify-start space-y-4">
                          <div className="w-full rounded-xl overflow-hidden shadow-md">
                            <Image
                              src="/ubicacion.jpg"
                              alt="Bodega Ferretera de Monterrey"
                              width={800}
                              height={400}
                              className="object-cover w-full h-60"
                            />
                          </div>

                          {/* WhatsApp */}
                          <div className="w-full bg-white rounded-xl shadow p-4">
                            <h3 className="text-lg font-bold text-zinc-800 mb-1">
                              WhatsApp
                            </h3>
                            <button
                              onClick={() =>
                                window.open(
                                  "https://wa.me/5218682340531?text=Hola,%20quiero%20más%20información.",
                                  "_blank"
                                )
                              }
                              className="text-green-600 font-semibold text-lg underline"
                            >
                              +5218682340531
                            </button>
                          </div>

                          {/* Horarios */}
<div className="w-full bg-white rounded-xl shadow p-4">
  <h3 className="text-lg font-bold text-zinc-800 mb-3 flex items-center gap-2">
    Horarios de Atención
  </h3>
  
  <HorariosDisplay cuentaId={38} />
</div>


                          {/* Mapa */}
                          <div className="w-full bg-white rounded-xl shadow p-4">
                            <h3 className="text-lg font-bold text-zinc-800 mb-2">
                              Ubicación
                            </h3>

                            <div
                              className="rounded-lg overflow-hidden h-64 relative group"
                              onClick={(e) => {
                                const iframe =
                                  e.currentTarget.querySelector("iframe");
                                iframe?.classList.add("pointer-events-auto");
                              }}
                              onMouseLeave={(e) => {
                                const iframe =
                                  e.currentTarget.querySelector("iframe");
                                iframe?.classList.remove("pointer-events-auto");
                              }}
                            >
                              <iframe
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3590.137662708991!2d-97.48887909999999!3d25.864946200000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x866f94db9af16fcf%3A0xcf4adf236af1625a!2sFerreter%C3%ADa%20Bodega%20Ferretera%20de%20Monterrey!5e0!3m2!1ses-419!2smx!4v1761939402856!5m2!1ses-419!2smx"
                                width="100%"
                                height="100%"
                                allowFullScreen
                                loading="lazy"
                                className="border-0 pointer-events-none"
                              ></iframe>
                            </div>

                            <p className="text-center mt-2 text-sm text-orange-600">
                              <a
                                href="https://maps.app.goo.gl/EX1wLpNtVPvtEjcx7"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline font-semibold"
                              >
                                Abrir en Google Maps
                              </a>
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {vistaPerfil === "edicion-categorias" && (
                      <VistaEdicionCategorias
                        setVistaPerfil={setVistaPerfil}
                        supabase={supabase}
                        categorias={categorias}
                        setCategorias={setCategorias}
                        macroCategorias={macroCategorias}
                        setMacroCategorias={setMacroCategorias}
                        cuenta={cuenta}
                      />
                    )}

                    {/* HISTORIAL DE PEDIDOS */}
                    {vistaPerfil === "pedidos" && (
                      <HistorialPedidos
                        cuenta={cuenta}
                        setVistaPerfil={setVistaPerfil}
                      />
                    )}

                    {vistaPerfil === "actualizar-bd" && (
                      <ActualizarBDView setVistaPerfil={setVistaPerfil} />
                    )}

                    {vistaPerfil === "agregar-producto" && (
                      <AgregarProductoView setVistaPerfil={setVistaPerfil} />
                    )}

                    {vistaPerfil === "gestionar-categorias" && (
                      <GestionarCategoriasView
                        setVistaPerfil={setVistaPerfil}
                      />
                    )}

                    {vistaPerfil === "gestionar-marcas" && (
                      <GestionarMarcasView setVistaPerfil={setVistaPerfil} />
                    )}

                    {vistaPerfil === "gestionar-macro-categorias" && (
                      <GestionarMacroCategoriasView
                        setVistaPerfil={setVistaPerfil}
                      />
                    )}

                    {vistaPerfil === "asignar-categorias" && (
                      <AsignarCategoriasView setVistaPerfil={setVistaPerfil} />
                    )}

                    {vistaPerfil === "gestionar-cuentas" && (
                      <GestionarCuentasView setVistaPerfil={setVistaPerfil} />
                    )}

                    {vistaPerfil === "gestionar-banner" && (
  <GestionarBannerView setVistaPerfil={setVistaPerfil} />
)}

                    {/* CONFIGURACIÓN */}
                    {vistaPerfil === "settings" && (
                      <motion.div
                        key="settings"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <BackBtn onBack={() => setVistaPerfil("menu")} />

                        <h2 className="text-xl font-bold text-zinc-900 mb-4">
                          Informacion Personal
                        </h2>

                        <ConfigForm cuenta={cuenta} setCuenta={setCuenta} />
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Modal de Pedido Exitoso */}
                {mostrarExito && (
                  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[999]">
                    <div className="bg-white rounded-2xl w-[85%] max-w-sm p-6 shadow-2xl text-center animate-[pop_0.3s_ease-out]">
                      {/* Icono de éxito */}
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                        <svg
                          className="w-10 h-10 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          viewBox="0 0 24 24"
                        >
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </div>

                      <h2 className="text-xl font-bold text-zinc-800">
                        ¡Pedido enviado!
                      </h2>
                      <p className="text-sm text-zinc-600 mt-1">
                        Para mas detalles ve a Mis de pedidos.
                      </p>

                      {/* Botón */}
                      <button
                        onClick={() => setMostrarExito(false)}
                        className="mt-5 bg-green-600 text-white px-5 py-2 rounded-xl w-full font-medium hover:bg-green-700 active:scale-[0.97] transition-all"
                      >
                        Aceptar
                      </button>
                    </div>

                    {/* Animación tipo pop */}
                    <style>
                      {`
        @keyframes pop {
          0% { transform: scale(0.7); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}
                    </style>
                  </div>
                )}

                {/* Modal de Saldo Pendiente */}
                {mostrarModalSaldoPendiente && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white rounded-2xl w-[90%] max-w-md p-6 shadow-2xl"
                    >
                      {/* Icono de advertencia */}
                      <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="w-8 h-8 text-red-600"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                          />
                        </svg>
                      </div>

                      <h3 className="text-xl font-bold text-zinc-900 text-center mb-2">
                        Saldo Pendiente
                      </h3>

                      <p className="text-sm text-zinc-600 text-center mb-4">
                        Favor de realizar pago para poder enviar pedido.
                      </p>

                      {/* Lista de documentos */}
                      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4 max-h-60 overflow-y-auto">
                        <div className="space-y-2">
                          {documentosPendientesModal.map((doc, index) => (
                            <div
                              key={doc.id || index}
                              className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-300"
                            >
                              <div>
                                <span className="inline-block px-2 py-1 rounded text-xs font-semibold mr-2 bg-red-100 text-red-800">
                                  {doc.tipo_documento.toUpperCase()}
                                </span>
                                <span className="text-sm font-medium text-zinc-800">
                                  #{doc.numero_documento}
                                </span>
                              </div>
                              <span className="text-sm font-bold text-red-600">
                                ${parseFloat(doc.monto).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Total */}
                        <div className="mt-3 pt-3 border-t-2 border-red-400">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-red-900">
                              Total Adeudo:
                            </span>
                            <span className="text-lg font-bold text-red-900">
                              $
                              {documentosPendientesModal
                                .reduce(
                                  (sum, doc) => sum + parseFloat(doc.monto),
                                  0
                                )
                                .toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/*
                      <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-4">
                        <p className="text-xs text-yellow-800 text-center">
                          Por favor realiza el pago de estos documentos para
                          poder enviar tu pedido
                        </p>
                      </div>*/}

                      <button
                        onClick={() => {
                          setMostrarModalSaldoPendiente(false);
                          setDocumentosPendientesModal([]);
                        }}
                        className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition"
                      >
                        Entendido
                      </button>
                    </motion.div>
                  </div>
                )}
                

                {/* Modal de pedido */}
                {mostrarModalPedido && (
                 <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-[999] backdrop-blur-sm"
            onClick={cerrarModalPedido}
          >
                   <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 300,
                duration: 0.3,
              }}
              onClick={(e) => e.stopPropagation()} 
              className="bg-white rounded-2xl w-[90%] max-w-md p-5 relative shadow-2xl overflow-hidden"
            >
                      {/* Cerrar */}
                      <button
                        onClick={cerrarModalPedido}
                        className="absolute top-3 right-3 text-zinc-500 text-xl"
                      >
                        ×
                      </button>

                      <h2 className="text-center text-lg text-black font-semibold mb-4">
                        Informacion de pedido
                      </h2>

                      {/* Información de la cuenta (solo lectura) */}
                      <div className="bg-zinc-50 rounded-lg p-3 mb-4 border border-zinc-200">
                        <p className="text-xs text-zinc-500 mb-1">Ferretería</p>
                        <p className="text-sm font-semibold text-zinc-700 mb-2">
                          {cuenta?.ferreteria || "Sin ferretería registrada"}
                        </p>
                        <p className="text-xs text-zinc-500 mb-1">Cuenta</p>
                        <p className="text-sm font-semibold text-zinc-700 mb-2">
                          {cuenta?.numero_cuenta}
                        </p>
                        <p className="text-xs text-zinc-500 mb-1">
                          Nombre del Cliente
                        </p>
                        <p className="text-sm font-semibold text-zinc-700">
                          {cuenta?.cliente}
                        </p>
                      </div>

                   {/* Tipo de entrega con toggles mutuamente excluyentes */}
        <div className="mb-4">
          <p className="text-sm font-semibold text-zinc-700 mb-3">Tipo de entrega:</p>
          
          {/* Toggle Enviar a Domicilio */}
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-zinc-200 mb-2">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                enviarDomicilio ? 'bg-orange-100' : 'bg-gray-100'
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" 
                  className={`w-5 h-5 ${enviarDomicilio ? 'text-orange-600' : 'text-gray-600'}`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
              </div>
              <span className="text-sm font-medium text-zinc-700">Enviar a domicilio</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enviarDomicilio}
                onChange={(e) => {
                  if (e.target.checked) {
                    setEnviarDomicilio(true);
                    setRecogerLocal(false);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-orange-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:w-5 after:h-5 after:rounded-full after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>

          {/* Toggle Recoger en Local */}
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-zinc-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                recogerLocal ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                  className={`w-5 h-5 ${recogerLocal ? 'text-blue-600' : 'text-gray-600'}`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-zinc-700">Recoger en local</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={recogerLocal}
                onChange={(e) => {
                  if (e.target.checked) {
                    setRecogerLocal(true);
                    setEnviarDomicilio(false);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:w-5 after:h-5 after:rounded-full after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>
        </div>

         {/* Mensajes dinámicos según selección y hora */}
        <motion.div className="mt-3">
          {enviarDomicilio ? (
            <motion.div
              key="domicilio-info"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              {cuenta?.direccion ? (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-xs text-zinc-600 mb-1">Dirección:</p>
                  <p className="text-sm text-zinc-700">{cuenta.direccion}</p>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs text-red-600">⚠️ No hay dirección guardada. Por favor informar a Bodega Ferretera de Monterrey.</p>
                </div>
              )}
              
              {/* Mensaje según si tiene entrega mismo día y la hora actual */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800 font-semibold">
                  {(() => {
                    const horaActual = new Date().getHours();
                    
                    if (cuenta?.entrega_mismo_dia) {
                      if (horaActual < 10) {
                        return "Tu pedido será entregado el día de hoy";
                      } else {
                        return "Tu pedido quedará programado para entregar el siguiente día hábil";
                      }
                    } else {
                      return "Recibirás tu pedido en un plazo de 1 a 3 días hábiles (puedes recibirlo el mismo día)";
                    }
                  })()}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="recoger-info"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border border-green-200 rounded-lg p-3"
            >
              <p className="text-sm text-green-800 font-semibold">
                {(() => {
                  const horaActual = new Date().getHours();
                  
                  if (horaActual < 15) {
                    return "Tu pedido estará listo para recoger en aproximadamente 3 horas. Puedes revisar el estado de tu pedido en la sección 'Mis pedidos'";
                  } else {
                    return "Tu pedido estará listo para recoger el siguiente día hábil a partir de las 11 AM. Puedes revisar el estado de tu pedido en la sección 'Mis pedidos'";
                  }
                })()}
              </p>
            </motion.div>
          )}
        </motion.div>

         {/* Botones */}
        <div className="flex justify-between mt-6 gap-2">
          <button
            onClick={cerrarModalPedido}
            className="flex-1 border border-zinc-300 py-2 rounded-lg font-semibold text-zinc-600"
          >
            Cancelar
          </button>
          <button
  onClick={enviarPedido}
  disabled={
    enviando ||
    !cuenta?.cliente ||
    !hayTipoEntregaSeleccionado ||
    (enviarDomicilio && !cuenta?.direccion)
  }
  className={`flex-1 py-2 rounded-lg font-semibold text-white transition ${
    !cuenta?.cliente ||
    !hayTipoEntregaSeleccionado ||
    (enviarDomicilio && !cuenta?.direccion)
      ? "bg-orange-300"
      : "bg-orange-500 hover:bg-orange-600"
  }`}
>
  {enviando ? "Enviando..." : "Enviar"}
</button>

        </div>
                     </motion.div>
                  </motion.div>
                )}

                {/* Favoritos */}
                {activeTab === "ubicacion" && (
                  <motion.div
                    key="ubicacion"
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="mt-4 px-3 pb-32">
                      {favoritos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                          <Star className="w-16 h-16 text-orange-500" />

                          <p className="text-center text-zinc-500 text-lg">
                            No tienes favoritos aún
                          </p>
                          <p className="text-center text-zinc-400 text-sm mt-2">
                            Agrega productos tocando la estrella dentro de cada
                            producto
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                          {favoritos.map((prod) => (
                            <motion.div
                              key={prod.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ duration: 0.2 }}
                              className="rounded-xl overflow-hidden bg-white shadow hover:shadow-md transition cursor-pointer relative"
                            >
                              {/* Botón eliminar de favoritos */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();

                                  toggleFavorito(prod);
                                }}
                                className="absolute top-2 right-2 z-10 bg-white/90 hover:bg-red-500 text-red-500 hover:text-white rounded-full p-2 shadow-md transition"
                              >
                                <X size={16} />
                              </button>

                              <div
                                onClick={() => {
                                  const scrollY = window.scrollY;
                                  localStorage.setItem(
                                    "scrollProducto",
                                    scrollY.toString()
                                  );
                                  setProductoSeleccionado(prod);
                                }}
                              >
                                <div className="relative w-full h-40 bg-white">
                                  <Image
                                    src={prod.IMAGEN || "/placeholder.jpg"}
                                    alt={prod.TITULO}
                                    fill
                                    className="object-contain"
                                  />
                                </div>
                                <div className="p-2">
                                  <p className="text-xs text-orange-500 font-medium">
                                    {getNombreMarca(prod.marca_id)}
                                  </p>
                                  <p className="text-sm font-semibold text-zinc-700 line-clamp-2">
                                    {prod.TITULO}
                                  </p>
                                  <p className="text-xs text-zinc-500 mt-1">
                                    {prod.CODIGO}
                                  </p>
                                 {!esMostrador && (
  <p className="text-sm font-bold text-orange-500 mt-1">
    $ {prod.P_MAYOREO?.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}
  </p>
)}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            {/* BOTÓN DE CONFIRMAR PEDIDO */}
            <AnimatePresence>
              {activeTab === "carrito" && carrito.length > 0 && (
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="fixed bottom-[90px] left-0 right-0 px-4 z-40"
                >
                  <button
                    onClick={() => setMostrarModalPedido(true)}
                    disabled={
                      carrito.reduce((sum, p) => sum + p.subtotal, 0) < 1000
                    }
                    className={`w-full py-4 mb-5 rounded-xl font-semibold text-[16px] shadow-2xl transition flex items-center justify-between px-6 ${
                      carrito.reduce((sum, p) => sum + p.subtotal, 0) >= 1000
                        ? "bg-orange-500 text-white hover:bg-orange-600"
                        : "bg-zinc-300 text-zinc-500 cursor-not-allowed"
                    }`}
                  >
                    <span>Confirmar pedido</span>
                    <span className="text-lg font-bold">
                      Total: $
                      {carrito
                        .reduce((sum, p) => sum + p.subtotal, 0)
                        .toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Barra de navegación*/}
            <nav className="fixed bottom-0 left-0 z-50 grid w-full grid-cols-5 items-center border-t border-zinc-200 bg-white p-3 pb-12 pt-5 text-zinc-700 shadow-md">
              {/* 1. BOTÓN CATEGORÍAS */}
              <button
                onClick={() => {
                  if (activeTab === "categorias") {
                    if (categoriaSeleccionada || marcaSeleccionada) {
                      setCategoriaSeleccionada(null);
                      setMarcaSeleccionada(null);
                    } else if (macroCategoriaSeleccionada) {
                      setMacroCategoriaSeleccionada(null);
                    } else {
                      window.scrollTo({ top: 0, behavior: "instant" });
                    }
                  } else {
                    setActiveTab("categorias");
                  }
                }}
                className={`flex flex-col items-center text-[10px] sm:text-xs ${
                  activeTab === "categorias"
                    ? "text-orange-500"
                    : "hover:text-orange-500"
                }`}
              >
                <Hammer size={20} />
                <span className="mt-1">CATEGORÍAS</span>
              </button>

              {/* 2. BOTÓN BUSCAR */}
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "instant" });
                  setActiveTab("buscar");
                }}
                className={`flex flex-col items-center text-[10px] sm:text-xs ${
                  activeTab === "buscar"
                    ? "text-orange-500"
                    : "hover:text-orange-500"
                }`}
              >
                <Search size={20} />
                <span className="mt-1">BUSCAR</span>
              </button>

              {/* 3. BOTÓN CARRITO */}
              {!esMostrador && (
              <div className="relative flex justify-center">
                <button
                  onClick={() => {
                    localStorage.setItem(
                      "scrollPos",
                      window.scrollY.toString()
                    );
                    setActiveTab("carrito");
                  }}
                  className={`
        absolute
        flex flex-col items-center text-[10px] sm:text-xs
        z-50
        transition-all duration-300
        ${activeTab === "carrito" ? "-top-5" : "-top-17"} 
      `}
                >
                  <div
                    className={`
          relative flex items-center justify-center
          transition-all duration-300
          ${
            activeTab === "carrito"
              ? "w-5 h-5 bg-transparent border-none shadow-none"
              : "w-16 h-16 rounded-full border-1 border-zinc-200 bg-white text-zinc-700 shadow-xl"
          }
        `}
                  >
                    <ShoppingCart
                      size={activeTab === "carrito" ? 20 : 26}
                      className={`transition-all duration-300 ${
                        activeTab === "carrito"
                          ? "text-orange-500"
                          : "text-zinc-700"
                      }`}
                    />

                    {activeTab !== "carrito" &&
                      carrito.reduce((sum, item) => sum + item.cantidad, 0) >
                        0 && (
                        <span className="absolute -top-1 -right-1 min-w-[24px] h-6 px-1.5 rounded-full flex items-center justify-center text-xs font-bold bg-orange-500 text-white shadow-md">
                          {carrito.reduce(
                            (sum, item) => sum + item.cantidad,
                            0
                          )}
                        </span>
                      )}
                  </div>
                  <span
                    className={`mt-1 transition-all duration-300 ${
                      activeTab === "carrito"
                        ? "text-orange-500 font-semibold"
                        : "text-zinc-700"
                    }`}
                  >
                    CARRITO
                  </span>
                </button>
              </div>
              )}
              {/* 4. BOTÓN UBICACIÓN */}
              <button
                onClick={() => {
                  localStorage.setItem("scrollPos", window.scrollY.toString());
                  setActiveTab("ubicacion");
                }}
                className={`flex flex-col items-center text-[10px] sm:text-xs ${
                  activeTab === "ubicacion"
                    ? "text-orange-500"
                    : "hover:text-orange-500"
                }`}
              >
                <Star size={20} />
                <span className="mt-1">FAVORITOS</span>
              </button>

              {/* 5. BOTÓN MAS */}
              <button
                onClick={() => {
                  if (activeTab === "perfil") {
                    if (vistaPerfil !== "menu") {
                      setVistaPerfil("menu");
                    } else {
                      window.scrollTo({ top: 0, behavior: "instant" });
                    }
                  } else {
                    window.scrollTo({ top: 0, behavior: "instant" });
                    setActiveTab("perfil");
                  }
                }}
                className={`flex flex-col items-center text-[10px] sm:text-xs ${
                  activeTab === "perfil"
                    ? "text-orange-500"
                    : "hover:text-orange-500"
                }`}
              >
                <Menu size={20} />
                <span className="mt-1">MAS</span>
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
