"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Home,
  Search,
  ShoppingCart,
  HelpCircle,
  MapPin,
  Hammer,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import react from "react";
import { AnimatePresence, motion } from "framer-motion";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function HomePage() {
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
  const [cliente, setCliente] = useState("");
  const [ferreteria, setFerreteria] = useState("");
  const [direccion, setDireccion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");

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
        ← Cerrar
      </button>
    </motion.div>
  );
};
  // fin del componente zomm img

  {
    /* categorias extracion */
  }
  useEffect(() => {
    const fetchCategorias = async () => {
      const { data, error } = await supabase
        .from("categorias")
        .select("id_categoria, nombre_categoria, img, orden")
        .order("orden", { ascending: true });

      if (error) {
        console.error("Error cargando categorías:", error.message);
      } else {
        console.log("Categorías ordenadas:", data);
        setCategorias(data || []);
      }
    };

    fetchCategorias();
  }, []);

  // Cargar todos los productos al entrar a la pestaña de "buscar"
  useEffect(() => {
    const fetchProductos = async () => {
      const { data, error } = await supabase
        .from("productos")
        .select("id, TITULO, CODIGO, IMAGEN, P_MAYOREO");

      if (error) {
        console.error("Error cargando productos:", error.message);
      } else {
        setProductos(data || []);
      }
    };

    if (activeTab === "buscar") {
      fetchProductos();
    }
  }, [activeTab]);

  interface Apoyo {
    titulo: string;
    imagen: string;
  }

  const [selectedApoyo, setSelectedApoyo] = useState<Apoyo | null>(null);

  // Función para enviar el pedido por WhatsApp
  const enviarPedido = async () => {
    try {
      setEnviando(true);
      setMensajeExito("");

      const jsPDFModule = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const { jsPDF } = jsPDFModule;

      // PDF que se envía por correo (docEnvio)
      const docEnvio = new jsPDF();

      docEnvio.setFontSize(10);
      docEnvio.text("NUEVO PEDIDO DESDE LA APP", 14, 20);
      docEnvio.setFontSize(10);
      docEnvio.text(`CLIENTE: ${cliente}`, 14, 30);
      docEnvio.text(`FERRETERÍA: ${ferreteria}`, 14, 37);

      if (enviarDomicilio) {
        docEnvio.text("TIPO DE ENTREGA: A DOMICILIO", 14, 44);
        docEnvio.text(`DIRECCIÓN: ${direccion}`, 14, 51);
      } else {
        docEnvio.text("TIPO DE ENTREGA: RECOGER EN TIENDA", 14, 44);
      }

      const productosTabla = carrito.map((p) => [
        "",
        p.CODIGO,
        "",
        p.cantidad,
        "",
        p.TITULO,
        `$${p.P_MAYOREO.toFixed(2)}`,
        `$${p.subtotal.toFixed(2)}`,
        "",
      ]);

      autoTableModule.default(docEnvio, {
        head: [
          [
            " S ",
            "Código",
            " PP ",
            "Cantidad",
            " R ",
            "Producto",
            "Precio",
            "Subtotal",
            "  PA  ",
          ],
        ],
        body: productosTabla,
        startY: 60,
        styles: { fontSize: 7, lineColor: [200, 200, 200], lineWidth: 0.2 },
        headStyles: { fontStyle: "bold" },
        theme: "plain",
      });

      const finalYEnvio = (docEnvio as any).lastAutoTable?.finalY || 70;
      const total = carrito.reduce(
        (sum, p) =>
          sum + (p.subtotal ?? (p.cantidad ?? 0) * (p.P_MAYOREO ?? 0)),
        0
      );

      docEnvio.setFontSize(7);
      docEnvio.text(`Total: $${total.toFixed(2)}`, 14, finalYEnvio + 10);

      const pdfBase64 = docEnvio.output("datauristring");

      await fetch("/api/enviar-pedido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfBase64,
          correoDestino: "bfmpedidos@gmail.com", //correo de la ferreteria
        }),
      });

      // PDF que se descarga para el cliente (docCliente)
      const docCliente = new jsPDF();

      docCliente.setFontSize(7);
      docCliente.text("COMPROBANTE DE COMPRA", 14, 20);
      docCliente.setFontSize(7);
      docCliente.text(`CLIENTE: ${cliente}`, 14, 30);
      docCliente.text(`FERRETERÍA: ${ferreteria}`, 14, 37);

      if (enviarDomicilio) {
        docCliente.text("ENTREGA: A DOMICILIO", 14, 44);
        docCliente.text(`DIRECCIÓN: ${direccion}`, 14, 51);
      } else {
        docCliente.text("ENTREGA: RECOGER EN TIENDA", 14, 44);
      }

      autoTableModule.default(docCliente, {
        head: [["Producto", "Cantidad", "Precio", "Subtotal"]],
        body: carrito.map((p) => [
          p.TITULO,
          p.cantidad,
          `$${p.P_MAYOREO.toFixed(2)}`,
          `$${p.subtotal.toFixed(2)}`,
        ]),
        startY: 60,
        styles: { fontSize: 7 },
        headStyles: {
          fillColor: [255, 140, 0],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        theme: "grid",
      });

      const finalYCliente = (docCliente as any).lastAutoTable?.finalY || 70;
      docCliente.setFontSize(7);
      docCliente.text(`TOTAL: $${total.toFixed(2)}`, 14, finalYCliente + 10);
      docCliente.text(
        "COSTO DE USO DE LA APLICACIÓN: $50.00 (CUBIERTO POR BODEGA FERRETERA DE MONTERREY)",
        14,
        finalYEnvio + 18
      );

      const nombreArchivo = `Pedido_${cliente.replace(/\s+/g, "_")}.pdf`;
      docCliente.save(nombreArchivo);

      setMensajeExito("✅ Su pedido ha sido enviado con éxito.");
      setMostrarModalPedido(false);
      setCarrito([]); // Deja el carrito vacío
    } catch (error) {
      console.error("Error al enviar pedido:", error);
      setMensajeExito(
        "❌ Ocurrió un error al enviar el pedido. Intente nuevamente."
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

  // Vista de detalle de producto

 const VistaProducto = ({ producto, onBack }: any) => {
  const [cantidad, setCantidad] = useState("1");

  // --- MANEJO DE INPUT ---
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

  // --- BOTONES ---
  const handleAdd = () =>
    setCantidad((c) =>
      c === "" ? "1" : (parseInt(c) + 1).toString()
    );

  const handleSubtract = () =>
    setCantidad((c) => {
      if (c === "" || parseInt(c) <= 1) return "1";
      return (parseInt(c) - 1).toString();
    });

  // --- AGREGAR AL CARRITO ---
  const agregarAlCarrito = () => {
    const cant = parseInt(cantidad) || 1;

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

    onBack();
  };

  const cantidadNum = parseInt(cantidad) || 1;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={producto.id}
        className="!bg-white min-h-screen p-4 fixed inset-0 z-50 text-zinc-900"
        initial={{ opacity: 0, x: 80 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 80 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(event, info) => {
          if (info.offset.x > 100) onBack();
        }}
      >
        {/* Botón regresar */}
        <button
          onClick={onBack}
          className="absolute top-9 left-7 bg-white/80 hover:bg-white text-zinc-800 rounded-full p-3 shadow transition"
        >
          ←
        </button>

        {/* Imagen */}
        <div className="flex justify-center mb-3">
          <div className="relative w-60 h-60">
            <Image
              src={producto.IMAGEN || "/placeholder.jpg"}
              alt={producto.TITULO}
              fill
              className="object-contain"
            />
          </div>
        </div>

        {/* Detalles */}
        <h2 className="text-center text-[20px] font-bold text-zinc-900 leading-snug px-2">
          {producto.TITULO}
        </h2>

        <div className="mt-4 text-sm text-zinc-700 px-2">
          <div className="flex justify-between py-2">
            <span className="font-medium">Código</span>
            <span>{producto.CODIGO}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="font-medium">Precio</span>
            <span>${producto.P_MAYOREO?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="font-medium">Subtotal</span>
            <span>${(cantidadNum * producto.P_MAYOREO).toFixed(2)}</span>
          </div>
        </div>

        {/* Controles */}
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

          {/* Botón agregar */}
          <button
            onClick={agregarAlCarrito}
            className="w-full mt-5 bg-orange-500 text-white py-3 rounded-xl font-bold shadow hover:bg-orange-600 transition"
          >
            Agregar al carrito
          </button>

        </div>
      </motion.div>
    </AnimatePresence>
  );
};


  // Mostrar vista de producto si hay uno seleccionado
  if (productoSeleccionado) {
    return (
      <VistaProducto
        producto={productoSeleccionado}
        onBack={() => setProductoSeleccionado(null)}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans">
      {/* Encabezado, solo se muestra si NO hay categoría seleccionada */}
      {!(activeTab === "categorias" && categoriaSeleccionada) && (
        <header className="p-6 pt-10 text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="relative w-30 h-30">
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
          </div>

          {activeTab === "categorias" && (
            <p className="mt-6 text-lg font-semibold text-zinc-700">
              ELIGE UNA CATEGORÍA
            </p>
          )}

          {activeTab === "buscar" && (
            <p className="mt-6 text-lg font-semibold text-zinc-700">
              BÚSQUEDA POR CÓDIGO
            </p>
          )}
        </header>
      )}

      {/* Contenido dinámico */}
      <main className="flex-1 px-4 pb-32 overflow-hidden">
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
              {/* Si no hay categoría seleccionada, se muestran todas las categorías */}
              {!categoriaSeleccionada ? (
                <motion.div
                  key="lista-categorias"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 px-3 mt-4"
                >
                  {categorias.map((cat) => (
                    <div
                      key={cat.id_categoria}
                      onClick={async () => {
                        //Guarda la posición actual antes de abrir la categoría
                        const scrollY = window.scrollY;
                        localStorage.setItem("scrollPos", scrollY.toString());

                        setCategoriaSeleccionada(cat);
                        //optencion de datos
                        const { data, error } = await supabase
                          .from("productos")
                          .select("id, TITULO, CODIGO, IMAGEN, P_MAYOREO")
                          .eq("CATEGORIA_ID", cat.id_categoria);

                        if (error) {
                          console.error(
                            "Error al cargar productos:",
                            error.message
                          );
                          setArticulos([]);
                        } else {
                          setArticulos(data || []);
                        }

                        //Lleva al inicio de la vista de productos
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="rounded-xl overflow-hidden bg-white shadow hover:shadow-md transition cursor-pointer"
                    >
                      <div className="relative w-full h-40">
                        <Image
                          src={cat.img || "/placeholder.jpg"}
                          alt={cat.nombre_categoria}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="p-2 text-center font-semibold text-zinc-800 text-sm">
                        {cat.nombre_categoria}
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={categoriaSeleccionada.id_categoria}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -40 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="px-4 pb-20"
                  >
                    <motion.div
                      key="vista-productos"
                      className="px-4 pb-20"
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -40 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      onDragEnd={(event, info) => {
                        if (info.offset.x > 100) {
                          // Si se arrastra más de 100px a la derecha → volver
                          setCategoriaSeleccionada(null);

                          // Recupera la posición previa del scroll
                          const savedScroll = localStorage.getItem("scrollPos");
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
                      {/* Imagen y título de categoría */}
                      <div className="relative w-full h-70 rounded-xl overflow-hidden mb-3">
                        <Image
                          src={categoriaSeleccionada.img || "/placeholder.jpg"}
                          alt={categoriaSeleccionada.nombre_categoria}
                          fill
                          className="object-contain bg-white"
                        />
                        {/* Botón volver */}
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            setCategoriaSeleccionada(null);
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
                          }}
                          className="absolute top-3 left-3 bg-white/80 hover:bg-white text-zinc-800 rounded-full p-2 shadow transition"
                        >
                          ←
                        </motion.button>
                      </div>

                      {/* Título*/}
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xl font-bold text-zinc-800">
                          {categoriaSeleccionada.nombre_categoria}
                        </h2>
                      </div>

                      {/* Buscador */}
                      <div className="relative mb-4">
                        <input
                          type="text"
                          placeholder="Buscar"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full rounded-full border border-zinc-300 px-10 py-2 pr-10 text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 text-[16px] md:text-sm"
                        />
                        <Search className="absolute left-3 top-2.5 text-zinc-500 w-5 h-5 " />
                      </div>

                      {/* Lista de productos */}
                      <div className="space-y-2">
                        {articulos
                          .filter(
                            (a) =>
                              (a.TITULO &&
                                a.TITULO.toLowerCase().includes(
                                  searchTerm.toLowerCase()
                                )) ||
                              (a.CODIGO &&
                                a.CODIGO.toLowerCase().includes(
                                  searchTerm.toLowerCase()
                                ))
                          )

                          .map((art) => (
                            <motion.div
                              key={art.id}
                              variants={{
                                hidden: { opacity: 0, y: 10 },
                                show: { opacity: 1, y: 0 },
                              }}
                              transition={{ duration: 0.3 }}
                              onClick={() => setProductoSeleccionado(art)}
                              className="flex items-center justify-between bg-white rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition p-2 cursor-pointer"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="relative w-14 h-14 rounded-md overflow-hidden bg-white">
                                  <Image
                                    src={art.IMAGEN || "/placeholder.jpg"}
                                    alt={art.TITULO}
                                    fill
                                    className="object-contain"
                                  />
                                </div>
                                <div className="text-sm font-medium text-zinc-700 leading-tight max-w-[200px]">
                                  {art.TITULO}
                                </div>
                              </div>
                            </motion.div>
                          ))}

                        {articulos.length === 0 && (
                          <p className="text-center text-zinc-500 py-10">
                            No hay productos en esta categoría.
                          </p>
                        )}
                      </div>
                    </motion.div>
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
                {/* Campo de búsqueda */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por nombre o código"
                    value={searchTerm}
                    onChange={async (e) => {
                      const value = e.target.value;
                      setSearchTerm(value);

                      if (value.trim() === "") {
                        setProductos([]); // limpia resultados si no hay texto
                        return;
                      }

                      const { data, error } = await supabase
                        .from("productos")
                        .select("id, TITULO, CODIGO, IMAGEN, P_MAYOREO")
                        .or(`TITULO.ilike.%${value}%,CODIGO.ilike.%${value}%`)
                        .limit(500);

                      if (error) {
                        console.error(
                          "Error buscando productos:",
                          error.message
                        );
                      } else {
                        setProductos(data || []);
                      }
                    }}
                    className="w-full rounded-full border border-zinc-300 px-4 py-2 pr-14 text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />

                  {/* Limpiar texto */}
                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setProductos([]);
                      }}
                      className="absolute right-10 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700"
                    >
                      <X size={18} />
                    </button>
                  )}

                  {/* Botón de escáner */}
                  <button
                    onClick={() => setScannerOpen(!scannerOpen)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-500 hover:text-orange-600"
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
                        d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M3 17v2a2 2 0 002 2h2M17 21h2a2 2 0 002-2v-2M4 12h16"
                      />
                    </svg>
                  </button>
                </div>

                {/* Escáner de código de barras */}
                {scannerOpen && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-zinc-300">
                    <BarcodeScannerComponent
                      width="100%"
                      height={250}
                      onUpdate={async (err, result) => {
                        if (result) {
                          const codigo = result.getText();

                          if (codigo) {
                            setSearchTerm(codigo);
                            setScannerOpen(false);
                            if ("vibrate" in navigator) navigator.vibrate(100);

                            // 🔎 Buscar producto por código al escanear
                            const { data, error } = await supabase
                              .from("productos")
                              .select("id, TITULO, CODIGO, IMAGEN, P_MAYOREO")
                              .or(
                                `TITULO.ilike.%${codigo}%,CODIGO.ilike.%${codigo}%`
                              )
                              .limit(50);

                            if (error)
                              console.error(
                                "Error buscando por código:",
                                error.message
                              );
                            else setProductos(data || []);
                          }
                        } else if (err) {
                          console.error("Error leyendo código:", err);
                        }
                      }}
                    />
                    <button
                      onClick={() => setScannerOpen(false)}
                      className="w-full bg-red-500 text-white py-2 text-sm font-medium"
                    >
                      Cerrar cámara
                    </button>
                  </div>
                )}

                {/* Resultados */}
                <div className="mt-4 space-y-3">
                  {productos.map((prod) => (
                    <div
                      key={prod.id}
                      onClick={() => setProductoSeleccionado(prod)}
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
                        </div>
                      </div>
                      <span className="text-zinc-400">{">"}</span>
                    </div>
                  ))}

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
              <div className="mt-4 px-3 pb-24">
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
                          className="flex items-center justify-between border border-zinc-200 rounded-xl p-3 bg-white shadow-sm"
                        >
                          <div
                            className="flex items-center gap-3 w-[70%] cursor-pointer"
                            onClick={() => setProductoSeleccionado(item)} // abre vista producto
                          >
                            <div className="relative w-14 h-14 bg-zinc-100 rounded-md overflow-hidden">
                              <Image
                                src={item.IMAGEN || "/placeholder.jpg"}
                                alt={item.TITULO}
                                fill
                                className="object-contain"
                              />
                            </div>

                            <div className="flex flex-col truncate">
                              <span className="text-[16px] font-semibold text-zinc-800 leading-snug truncate">
                                {item.TITULO}
                              </span>
                              <span className="text-[14px] text-zinc-500 mt-1">
                                {item.CODIGO}
                              </span>
                              <span className="text-[14px] text-zinc-500 mt-1">
                                {item.cantidad} × ${item.P_MAYOREO.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Botones cantidad */}
                          <div className="flex items-center gap-2">
                            {/*
                            <button
                              onClick={() =>
                                setCarrito((prev) =>
                                  prev
                                    .map((p) =>
                                      p.id === item.id
                                        ? {
                                            ...p,
                                            cantidad: p.cantidad - 1,
                                            subtotal:
                                              (p.cantidad - 1) * p.P_MAYOREO,
                                          }
                                        : p
                                    )
                                    .filter((p) => p.cantidad > 0)
                                )
                              }
                              className="w-8 h-8 border text-black border-zinc-400 rounded-md text-lg flex items-center justify-center"
                            >
                              −
                            </button>
                            <span className="text-[14px] text-black font-semibold w-6 text-center">
                              {item.cantidad}
                            </span>
                            <button
                              onClick={() =>
                                setCarrito((prev) =>
                                  prev.map((p) =>
                                    p.id === item.id
                                      ? {
                                          ...p,
                                          cantidad: p.cantidad + 1,
                                          subtotal:
                                            (p.cantidad + 1) * p.P_MAYOREO,
                                        }
                                      : p
                                  )
                                )
                              }
                              className="w-8 h-8 bg-orange-500 text-white rounded-md text-lg flex items-center justify-center"
                            >
                              +
                            </button>
 */}
                            
                            <button
                              onClick={() =>
                                setCarrito((prev) =>
                                  prev
                                    .map((p) =>
                                      p.id === item.id
                                        ? {
                                            ...p,
                                            cantidad: 0,
                                            subtotal: 0,
                                          }
                                        : p
                                    )
                                    .filter((p) => p.cantidad > 0)
                                )
                              }
                              className="w-8 h-8 bg-orange-500 text-white rounded-md text-lg flex items-center justify-center"
                            >
                              x
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="mt-6 border-t border-zinc-300 pt-4 text-center">
                      <p className="text-[16px] font-bold text-zinc-900">
                        Total: $
                        {carrito
                          .reduce((sum, p) => sum + p.subtotal, 0)
                          .toFixed(2)}
                      </p>

                      <button
                        onClick={() => setMostrarModalPedido(true)}
                        className="w-full mt-3 bg-orange-500 text-white py-3 rounded-xl font-semibold text-[16px] shadow hover:bg-orange-600 transition"
                      >
                        Confirmar pedido
                      </button>
                    </div>
                    <p className="text-orange-600 font-semibold text-sm mt-3">
                      {" "}
                      COSTO DE USO DE APLICACIÓN = $50.00 POR ENVÍO{" "}
                    </p>
                    <p className="text-zinc-500 text-sm">
                      {" "}
                      Costo cubierto por Bodega Ferretera de Monterrey{" "}
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Apoyo */}
          {activeTab === "apoyo" && (
            <motion.div
              key="apoyo"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="mt-4">
                {/* Estado para ver detalle */}
{selectedApoyo ? (
  <ApoyoViewer selectedApoyo={selectedApoyo} setSelectedApoyo={setSelectedApoyo} />
) : (

                  <motion.div
                    key="lista-apoyo"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
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
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* Modal de pedido */}
          {mostrarModalPedido && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[999]">
              <div className="bg-white rounded-2xl w-[90%] max-w-md p-5 relative shadow-xl">
                {/* Cerrar */}
                <button
                  onClick={() => setMostrarModalPedido(false)}
                  className="absolute top-3 right-3 text-zinc-500 text-xl"
                >
                  ×
                </button>

                <h2 className="text-center text-lg text-black font-semibold mb-4">
                  Informacion de pedido
                </h2>

                {/* Nombre del cliente */}
                <label className="block text-sm font-medium text-zinc-700">
                  Nombre del Cliente{" "}
                  <span className="text-zinc-400">Requerido</span>
                </label>
                <input
                  type="text"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="w-full border border-zinc-300 rounded-lg p-2 mt-1 mb-3 text-sm text-zinc-700"
                />

                {/* Nombre de la ferretería */}
                <label className="block text-sm font-medium text-zinc-700">
                  Nombre de la Ferretería{" "}
                  <span className="text-zinc-400">Requerido</span>
                </label>
                <input
                  type="text"
                  value={ferreteria}
                  onChange={(e) => setFerreteria(e.target.value)}
                  className="w-full border border-zinc-300 rounded-lg p-2 mt-1 mb-3 text-sm text-zinc-700"
                />

                {/* Enviar a domicilio */}
                <div className="flex items-center justify-between mt-2 mb-3">
                  <label className="text-sm font-medium text-zinc-700">
                    ¿Enviar a domicilio?
                  </label>
                  <input
                    type="checkbox"
                    checked={enviarDomicilio}
                    onChange={(e) => setEnviarDomicilio(e.target.checked)}
                    className="w-5 h-5 accent-orange-500"
                  />
                </div>

                {/* Si se activa el toggle */}
                {enviarDomicilio ? (
                  <>
                    <label className="block text-sm font-medium text-zinc-700">
                      Ingresar el domicilio de entrega{" "}
                      <span className="text-zinc-400">Requerido</span>
                    </label>
                    <input
                      type="text"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      className="w-full border border-zinc-300 rounded-lg p-2 mt-1 mb-3 text-sm text-zinc-700"
                    />

                    <p className="text-orange-600 text-[13px] font-semibold mt-1">
                      TIEMPO DE ENTREGA 1 A 3 DÍAS HÁBILES (EL PEDIDO PUEDE
                      ENVIARSE EL MISMO DÍA)
                    </p>
                  </>
                ) : (
                  <p className="text-zinc-700 text-[13px] mt-2">
                    Nos pondremos en contacto cuando su pedido esté listo para
                    recoger en tienda (el pedido puede estar listo ese mismo
                    día)
                  </p>
                )}

                {/* Botones */}
                <div className="flex justify-between mt-6">
                  <button
                    onClick={() => setMostrarModalPedido(false)}
                    className="flex-1 border border-zinc-300 py-2 rounded-lg mr-2 font-semibold text-zinc-600"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={enviarPedido}
                    disabled={
                      enviando ||
                      !cliente ||
                      !ferreteria ||
                      (enviarDomicilio && !direccion)
                    }
                    className={`flex-1 py-2 rounded-lg font-semibold text-white transition ${
                      !cliente || !ferreteria || (enviarDomicilio && !direccion)
                        ? "bg-orange-300"
                        : "bg-orange-500 hover:bg-orange-600"
                    }`}
                  >
                    {enviando ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                        Enviando...
                      </div>
                    ) : (
                      "Enviar"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* UBICACIÓN */}
          {activeTab === "ubicacion" && (
            <motion.div
              key="ubicacion"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="flex flex-col items-center justify-start p-4 space-y-4">
                <div className="w-full max-w-md rounded-xl overflow-hidden shadow-md">
                  <Image
                    src="/ubicacion.jpg"
                    alt="Bodega Ferretera de Monterrey"
                    width={800}
                    height={400}
                    className="object-cover w-full h-60"
                  />
                </div>

                {/* WhatsApp */}
                <div className="w-full max-w-md bg-white rounded-xl shadow p-4">
                  <h3 className="text-lg font-bold text-zinc-800 mb-1">
                    WhatsApp
                  </h3>
                  <button
                    onClick={() =>
                      window.open(
                        "https://wa.me/526682340531?text=Hola,%20quiero%20más%20información.",
                        "_blank"
                      )
                    }
                    className="text-green-600 font-semibold text-lg underline"
                  >
                    868 234 0531
                  </button>
                </div>

                {/* Mapa */}
                <div className="w-full max-w-md bg-white rounded-xl shadow p-4">
                  <h3 className="text-lg font-bold text-zinc-800 mb-2">
                    Ubicación
                  </h3>

                  {/* Contenedor que desactiva clicks por defecto */}
                  <div
                    className="rounded-lg overflow-hidden h-64 relative group"
                    onClick={(e) => {
                      const iframe = e.currentTarget.querySelector("iframe");
                      iframe?.classList.add("pointer-events-auto");
                    }}
                    onMouseLeave={(e) => {
                      const iframe = e.currentTarget.querySelector("iframe");
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
                      className="underline"
                    >
                      Abrir en Google Maps
                    </a>
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Barra de navegación */}
      <nav
        className="
          fixed bottom-0 left-0 z-50
    flex w-full items-center justify-around
    border-t border-zinc-200 bg-white 
    p-3 pb-12 pt-5  
    text-zinc-700 shadow-md
        "
      >
        <button
          onClick={() => setActiveTab("categorias")}
          className={`flex flex-col items-center text-xs ${
            activeTab === "categorias"
              ? "text-orange-500"
              : "hover:text-orange-500"
          }`}
        >
          <Hammer size={20} />
          CATEGORÍAS
        </button>

        <button
          onClick={() => setActiveTab("buscar")}
          className={`flex flex-col items-center text-xs ${
            activeTab === "buscar" ? "text-orange-500" : "hover:text-orange-500"
          }`}
        >
          <Search size={20} />
          BUSCAR
        </button>

        <button
          onClick={() => setActiveTab("carrito")}
          className={`flex flex-col items-center text-xs ${
            activeTab === "carrito"
              ? "text-orange-500"
              : "hover:text-orange-500"
          }`}
        >
          <ShoppingCart size={20} />
          CARRITO
        </button>

        <button
          onClick={() => setActiveTab("apoyo")}
          className={`flex flex-col items-center text-xs ${
            activeTab === "apoyo" ? "text-orange-500" : "hover:text-orange-500"
          }`}
        >
          <HelpCircle size={20} />
          APOYO
        </button>

        <button
          onClick={() => setActiveTab("ubicacion")}
          className={`flex flex-col items-center text-xs ${
            activeTab === "ubicacion"
              ? "text-orange-500"
              : "hover:text-orange-500"
          }`}
        >
          <MapPin size={20} />
          UBICACIÓN
        </button>
      </nav>
    </div>
  );
}
