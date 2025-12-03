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
  User,
  History,
  MapPinHouse,
  FileQuestionMark,
  LogOut,
  Settings,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import react from "react";
import { AnimatePresence, motion } from "framer-motion";
import jsPDF from "jspdf";
import "jspdf-autotable";

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
        onLoadingComplete={() => setLoaded(true)}
      />
    </div>
  );
};

interface Cuenta {
  numero_cuenta: string;
  cliente?: string;
  numero_tel?: string;
  [key: string]: any;
}

export default function HomePage() {
  const [cuentaActiva, setCuentaActiva] = useState<string | null>(null);
  const [numCuentaInput, setNumCuentaInput] = useState("");
  const [errorLogin, setErrorLogin] = useState("");
  const [vistaPerfil, setVistaPerfil] = useState("menu"); // menu | apoyo | settings | address | pedidos
  const [cuenta, setCuenta] = useState<Cuenta | null>(null); // datos completos de supabase

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

  const [numeroCuenta, setNumeroCuenta] = useState("");
  const [errorCuenta, setErrorCuenta] = useState(""); //error si no existe

  const [pedidos, setPedidos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [itemsPedido, setItemsPedido] = useState([]);
  const [cargandoItems, setCargandoItems] = useState(false);

  const BackBtn = ({ onBack }: any) => (
    <button
      onClick={onBack}
      className="absolute top-9 left-7 bg-white/80 hover:bg-white text-zinc-800 rounded-full p-3 shadow transition"
    >
      ←
    </button>
  );

  useEffect(() => {
    const saved = localStorage.getItem("cuenta_user");
    if (saved) {
      setCuenta(JSON.parse(saved));
    }
  }, []);

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
      setErrorCuenta("");

      // Verificar si el número de cuenta existe
      const { data: cuentaData, error: cuentaError } = await supabase
        .from("cuentas")
        .select("id")
        .eq("numero_cuenta", numeroCuenta)
        .single();

      if (cuentaError || !cuentaData) {
        setErrorCuenta("error en el numero de cuenta.");
        setEnviando(false);
        return; // No envía el pedido
      }

      // Crear pedido en Supabase
      if (!cuenta) {
        setMensajeExito("Error: cuenta no cargada. Intente nuevamente.");
        setEnviando(false);
        return;
      }

      // Calcular el total antes de usar
      const total = carrito.reduce(
        (sum, p) =>
          sum + (p.subtotal ?? (p.cantidad ?? 0) * (p.P_MAYOREO ?? 0)),
        0
      );

      const { data: pedidoInsertado, error: errorPedido } = await supabase
        .from("pedidos")
        .insert([
          {
            cuenta_id: cuenta.id, // ID real desde Supabase
            total: total,
          },
        ])
        .select()
        .single();

      if (errorPedido) {
        console.error("Error registrando pedido:", errorPedido);
      } else {
        const pedidoId = pedidoInsertado.id;

        // Guardar productos del pedido
        const items = carrito.map((p) => ({
          pedido_id: pedidoId,
          producto_id: p.id,
          titulo: p.TITULO,
          cantidad: p.cantidad,
          precio: p.P_MAYOREO,
        }));

        const { error: errorItems } = await supabase
          .from("pedido_items")
          .insert(items);

        if (errorItems) {
          console.error("Error guardando items:", errorItems);
        }
      }

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

      setMensajeExito("Su pedido ha sido enviado con éxito.");
      setMostrarModalPedido(false);
      setCarrito([]); // Deja el carrito vacío
    } catch (error) {
      console.error("Error al enviar pedido:", error);
      setMensajeExito(
        " Ocurrió un error al enviar el pedido. Intente nuevamente."
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

  const HistorialPedidos = ({ cuenta, setVistaPerfil }: any) => {
    const [pedidos, setPedidos] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState<any>(null);
    const [itemsPedido, setItemsPedido] = useState<any[]>([]);
    const [cargandoItems, setCargandoItems] = useState(false);
    const [cuentaPedido, setCuentaPedido] = useState<any>(null);

    const esAdmin = cuenta?.numero_cuenta === "Admin01";

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
            cuentas (
              numero_cuenta,
              cliente,
              ferreteria,
              numero_tel
            )
          `
          )
          .order("created_at", { ascending: false });

        // Si NO es admin, filtrar solo sus pedidos
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
    }, [cuenta, esAdmin]);

    const verDetallePedido = async (pedido: any) => {
      setPedidoSeleccionado(pedido);
      setCuentaPedido(pedido.cuentas || cuenta);
      setCargandoItems(true);

      const { data, error } = await supabase
        .from("pedido_items")
        .select("*")
        .eq("pedido_id", pedido.id);

      if (!error && data) {
        setItemsPedido(data);
      }
      setCargandoItems(false);
    };

    // Si hay un pedido seleccionado, mostrar detalle
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
          <BackBtn onBack={() => setPedidoSeleccionado(null)} />

          <h2 className="text-xl font-bold text-zinc-900 mb-2">
            Detalle del Pedido
          </h2>

          {/* Info del pedido */}
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

          {/* Productos del pedido */}
          <h3 className="text-lg font-semibold text-zinc-900 mb-3">
            Productos
          </h3>

          {cargandoItems ? (
            <p className="text-center text-zinc-500">Cargando productos...</p>
          ) : (
            <div className="space-y-2">
              {itemsPedido.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-zinc-200 p-3 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-zinc-900 text-sm leading-tight">
                        {item.titulo}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Cantidad: {item.cantidad} × ${item.precio.toFixed(2)}
                      </p>
                    </div>
                    <p className="font-bold text-orange-500 ml-3">
                      ${(item.cantidad * item.precio).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      );
    }

    // Vista principal del historial
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
          {esAdmin ? "Todos los Pedidos" : "Historial de Pedidos"}
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
                <div className="flex justify-between items-center">
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
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-orange-500">
                      ${pedido.total.toFixed(2)}
                    </p>
                    <span className="text-zinc-400">{">"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  // formulario de direccion de envio

  const AddressForm = ({ cuenta, setCuenta }: any) => {
    const [direccion, setDireccion] = useState(cuenta?.direccion || "");
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState("");

    const guardarDireccion = async () => {
      setGuardando(true);
      setMensaje("");

      const { data, error } = await supabase
        .from("cuentas")
        .update({
          direccion,
        })
        .eq("numero_cuenta", cuenta.numero_cuenta)
        .select()
        .single();

      if (error) {
        setMensaje("Error al guardar dirección");
      } else {
        setMensaje("Dirección actualizada");
        setCuenta(data);
      }

      setGuardando(false);
    };

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
        <div className="space-y-4 mt-3">
          <label className="font-medium text-zinc-700">Dirección</label>
          <textarea
            className="w-full border text-zinc-500 border-zinc-300 rounded-xl px-4 py-2 mt-1"
            rows={3}
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
          />

          <button
            onClick={guardarDireccion}
            disabled={guardando}
            className="w-full mt-3 bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition"
          >
            {guardando ? "Guardando..." : "Guardar dirección"}
          </button>

          {mensaje && (
            <p className="text-center text-sm mt-2 text-zinc-700">{mensaje}</p>
          )}
        </div>
      </motion.div>
    );
  };

  // formulario de configuracion de cuenta

  const ConfigForm = ({ cuenta, setCuenta }: any) => {
    const [cliente, setCliente] = useState(cuenta?.cliente || "");
    const [ferreteria, setFerreteria] = useState(cuenta?.ferreteria || "");
    const [numero_tel, setTelefono] = useState(cuenta?.numero_tel || "");
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState("");

    const guardarCambios = async () => {
      setGuardando(true);
      setMensaje("");

      if (!cuenta?.numero_cuenta) {
        setMensaje("Error: número de cuenta no cargado.");
        setGuardando(false);
        return;
      }

      console.log("Actualizando cuenta:", cuenta.numero_cuenta);

      const { data, error } = await supabase
        .from("cuentas")
        .update({
          cliente,
          ferreteria,
          numero_tel,
        })
        .eq("numero_cuenta", cuenta.numero_cuenta)
        .select()
        .single();

      if (error) {
        console.error("Supabase error:", error.message);
        setMensaje("Error al guardar");
        setGuardando(false);
      } else {
        setMensaje("Cambios guardados");
        setCuenta(data); // Actualiza el estado global
        localStorage.setItem("cuenta_user", JSON.stringify(data));
      }

      setGuardando(false);
    };

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
        <div className="space-y-4 mt-3">
          <div>
            <label className="font-medium text-zinc-700">
              Nombre del cliente
            </label>
            <input
              className="w-full border text-zinc-500 border-zinc-300 rounded-xl px-4 py-2 mt-1"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
            />
          </div>

          <div>
            <label className="font-medium text-zinc-700">
              Nombre de ferretería
            </label>
            <input
              className="w-full border text-zinc-500 border-zinc-300 rounded-xl px-4 py-2 mt-1"
              value={ferreteria}
              onChange={(e) => setFerreteria(e.target.value)}
            />
          </div>

          <div>
            <label className="font-medium text-zinc-700">Teléfono</label>
            <input
              className="w-full border text-zinc-500 border-zinc-300 rounded-xl px-4 py-2 mt-1"
              value={numero_tel}
              onChange={(e) => setTelefono(e.target.value)}
            />
          </div>

          <button
            onClick={guardarCambios}
            disabled={guardando}
            className="w-full mt-3 bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition"
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>

          {mensaje && (
            <p className="text-center text-sm mt-2 text-zinc-700">{mensaje}</p>
          )}
        </div>
      </motion.div>
    );
  };

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
      setCantidad((c) => (c === "" ? "1" : (parseInt(c) + 1).toString()));

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
              if (info.offset.x > 100) onBack();
            }}
            className="relative w-full h-full overflow-hidden"
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
                <SkeletonImage
                  src={producto.IMAGEN || "/placeholder.jpg"}
                  alt={producto.TITULO}
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
        </motion.div>
      </AnimatePresence>
    );
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
      {/* LOGIN ANTES DE ENTRAR A LA APP */}
      {!cuentaActiva ? (
        <div className="min-h-screen bg-white flex flex-col justify-center items-center p-6 text-center">
          <h1 className="text-2xl font-bold text-zinc-800 mb-4">
            Ingresar a catálogo
          </h1>

          <p className="text-zinc-600 mb-6">
            Introduce tu número de cuenta para continuar
          </p>

          <input
            type="text"
            placeholder="Número de cuenta"
            value={numCuentaInput}
            onChange={(e) => setNumCuentaInput(e.target.value)}
            className="border border-zinc-300 text-zinc-600 rounded-lg px-4 py-3 w-full max-w-xs text-center text-lg"
          />

          {errorLogin && (
            <p className="text-red-500 text-sm mt-2">{errorLogin}</p>
          )}

          <button
            onClick={validarCuenta}
            className="mt-5 bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition"
          >
            Entrar
          </button>
        </div>
      ) : (
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
                            // Guarda posición antes de cambiar
                            localStorage.setItem(
                              "scrollPos",
                              window.scrollY.toString()
                            );

                            if (window.scrollY > 100) {
                              window.scrollTo({ top: 0, behavior: "instant" });
                            }

                            setCategoriaSeleccionada(cat);

                            const { data, error } = await supabase
                              .from("productos")
                              .select("id, TITULO, CODIGO, IMAGEN, P_MAYOREO")
                              .eq("CATEGORIA_ID", cat.id_categoria);

                            setArticulos(error ? [] : data);
                            requestAnimationFrame(() => {
                              window.scrollTo({ top: 0, behavior: "instant" });
                            });
                          }}
                          className="rounded-xl overflow-hidden bg-white shadow hover:shadow-md transition cursor-pointer"
                        >
                          <div className="relative w-full h-40">
                            <SkeletonImage
                              src={cat.img || "/placeholder.jpg"}
                              alt={cat.nombre_categoria}
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
                          {/* Imagen y título de categoría */}
                          <div className="relative w-full h-70 rounded-xl overflow-hidden mb-3">
                            <SkeletonImage
                              src={
                                categoriaSeleccionada.img || "/placeholder.jpg"
                              }
                              alt={categoriaSeleccionada.nombre_categoria}
                              className="object-contain"
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
                                  onClick={() => {
                                    // Guarda posición del scroll
                                    const scrollY = window.scrollY;
                                    localStorage.setItem(
                                      "scrollProducto",
                                      scrollY.toString()
                                    );

                                    setProductoSeleccionado(art);
                                  }}
                                  className="flex items-center justify-between bg-white rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition p-2 cursor-pointer"
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className="relative w-14 h-14 rounded-md overflow-hidden bg-white">
                                      <SkeletonImage
                                        src={art.IMAGEN || "/placeholder.jpg"}
                                        alt={art.TITULO}
                                        className="object-contain"
                                      />
                                    </div>
                                    <div className="text-sm font-medium text-zinc-700 leading-tight max-w-[200px]">
                                      {art.TITULO}
                                      <p className="text-xs text-zinc-500">
                                        Código: {art.CODIGO}
                                      </p>
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
                            .or(
                              `TITULO.ilike.%${value}%,CODIGO.ilike.%${value}%`
                            )
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
                                if ("vibrate" in navigator)
                                  navigator.vibrate(100);

                                // 🔎 Buscar producto por código al escanear
                                const { data, error } = await supabase
                                  .from("productos")
                                  .select(
                                    "id, TITULO, CODIGO, IMAGEN, P_MAYOREO"
                                  )
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
                                    {item.cantidad} × $
                                    {item.P_MAYOREO.toFixed(2)}
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
                        {/* 

                       seccion de costos desactivada por peticion del cliente

                        <p className="text-orange-600 font-semibold text-sm mt-3">
                          {" "}
                          COSTO DE USO DE APLICACIÓN = $50.00 POR ENVÍO{" "}
                        </p>
                        <p className="text-zinc-500 text-sm">
                          {" "}
                          Costo cubierto por Bodega Ferretera de Monterrey{" "}
                        </p>
                        */}
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
                          src="/user_icon_2.jpg"
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
                          label="Historial de pedidos"
                          onClick={() => setVistaPerfil("pedidos")}
                        />

                        {/* Dirección */}
                        <MenuItem
                          label="Shipping Address"
                          icon={<MapPinHouse size={20} />}
                          onClick={() => setVistaPerfil("address")}
                        />

                        {/* Crear solicitud 
          <MenuItem
            label="Create Request"
            icon={<sometingicon size={20} />}
            onClick={() => alert("Pendiente")}
          />*/}

                        {/* Apoyo */}
                        <MenuItem
                          label="Apoyo"
                          icon={<FileQuestionMark size={20} />}
                          onClick={() => setVistaPerfil("apoyo")}
                        />

                        {/* Configuración */}
                        <MenuItem
                          label="Configuración"
                          icon={<Settings size={20} />}
                          onClick={() => setVistaPerfil("settings")}
                        />

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

                  {/* HISTORIAL DE PEDIDOS */}
                  {vistaPerfil === "pedidos" && (
                    <HistorialPedidos
                      cuenta={cuenta}
                      setVistaPerfil={setVistaPerfil}
                    />
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
                        Configuración
                      </h2>

                      <ConfigForm cuenta={cuenta} setCuenta={setCuenta} />
                    </motion.div>
                  )}

                  {/* DIRECCIÓN */}
                  {vistaPerfil === "address" && (
                    <motion.div
                      key="address"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <BackBtn onBack={() => setVistaPerfil("menu")} />

                      <h2 className="text-xl font-bold text-zinc-900 mb-4">
                        Dirección
                      </h2>

                      <AddressForm cuenta={cuenta} setCuenta={setCuenta} />
                    </motion.div>
                  )}
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

                    <label className="block text-sm font-medium text-zinc-700">
                      Número de cuenta{" "}
                      <span className="text-zinc-400">Requerido</span>
                    </label>
                    <input
                      type="text"
                      value={numeroCuenta}
                      onChange={(e) => {
                        setNumeroCuenta(e.target.value);
                        setErrorCuenta(""); // Limpia error al escribir
                      }}
                      className={`w-full border rounded-lg p-2 mt-1 mb-3 text-sm text-zinc-700 
                      ${errorCuenta ? "border-red-500" : "border-zinc-300"}`}
                    />

                    {errorCuenta && (
                      <p className="text-red-500 text-xs mb-2">{errorCuenta}</p>
                    )}

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
                        Nos pondremos en contacto cuando su pedido esté listo
                        para recoger en tienda (el pedido puede estar listo ese
                        mismo día)
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
                          !numeroCuenta ||
                          (enviarDomicilio && !direccion)
                        }
                        className={`flex-1 py-2 rounded-lg font-semibold text-white transition ${
                          !cliente ||
                          !ferreteria ||
                          !numeroCuenta ||
                          (enviarDomicilio && !direccion)
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
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "instant" });
                setActiveTab("buscar");
              }}
              className={`flex flex-col items-center text-xs ${
                activeTab === "buscar"
                  ? "text-orange-500"
                  : "hover:text-orange-500"
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
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "instant" });
                setActiveTab("perfil");
              }}
              className={`flex flex-col items-center text-xs ${
                activeTab === "perfil"
                  ? "text-orange-500"
                  : "hover:text-orange-500"
              }`}
            >
              <User size={20} />
              PERFIL
            </button>

            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "instant" }); // 👈 Resetea el scroll al inicio
                setActiveTab("ubicacion");
              }}
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
      )}
    </>
  );
}
