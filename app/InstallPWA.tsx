"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Smartphone } from "lucide-react";
import Image from "next/image";

export default function InstallPWA() {
  const [showModal, setShowModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Detectar si ya está instalado
    const isInStandaloneMode = window.matchMedia(
      "(display-mode: standalone)"
    ).matches;
    setIsStandalone(isInStandaloneMode);

    // Detectar iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Verificar si es primera visita
    const hasVisited = localStorage.getItem("bfm-pwa-visited");

    if (!hasVisited && !isInStandaloneMode) {
      // Esperar 2 segundos antes de mostrar el modal
      setTimeout(() => {
        setShowModal(true);
        localStorage.setItem("bfm-pwa-visited", "true");
      }, 2000);
    }

    // Capturar el evento de instalación (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

   // Registrar Service Worker (SOLO UNA VEZ y SOLO en producción)
if (
  "serviceWorker" in navigator &&
  process.env.NODE_ENV === "production"
) {
  navigator.serviceWorker.getRegistration().then((reg) => {
    if (!reg) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) =>
          console.log("Service Worker registrado UNA sola vez", reg)
        )
        .catch((err) =>
          console.error("Error al registrar Service Worker", err)
        );
    }
  });
}

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("Usuario aceptó instalar");
      setShowModal(false);
    }

    setDeferredPrompt(null);
  };

  const tutorialSteps = [
    {
      title: "¡Bienvenido a BFM Catálogo!",
      description:
        "Instala nuestra app en tu teléfono para acceder más rápido y tener una mejor experiencia.",
      image: "/logo-bfm.jpg",
    },
    {
      title: isIOS ? "Instalación en iPhone/iPad" : "Instalación en Android",
      description: isIOS
        ? "Sigue estos pasos para agregar la app a tu pantalla de inicio:"
        : "Presiona el botón de abajo para instalar la aplicación:",
      steps: isIOS
        ? [
            "1. Toca el botón de 'Compartir' 📤 (en la barra inferior)",
            "2. Desplázate y selecciona 'Agregar a pantalla de inicio' ➕",
            "3. Confirma tocando 'Agregar' ✓",
          ]
        : [],
    },
  ];

  if (isStandalone || !showModal) return null;

  return (
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 relative">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition"
              >
                <X size={24} />
              </button>

              <div className="flex items-center gap-3 text-white">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur">
                  <Smartphone size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Instala la App</h2>
                  <p className="text-sm text-white/90">
                    Acceso rápido y mejor experiencia
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Logo/Imagen */}
                  {currentStep === 0 && (
                    <div className="relative w-32 h-32 mx-auto mb-4 rounded-2xl overflow-hidden shadow-lg">
                      <Image
                        src={
                          tutorialSteps[currentStep].image || "/placeholder.png"
                        }
                        alt="BFM Logo"
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}

                  {/* Título y descripción */}
                  <h3 className="text-xl font-bold text-zinc-900 mb-3 text-center">
                    {tutorialSteps[currentStep].title}
                  </h3>
                  <p className="text-sm text-zinc-600 mb-4 text-center">
                    {tutorialSteps[currentStep].description}
                  </p>

                  {/* Pasos para iOS */}
                  {currentStep === 1 && isIOS && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                      {tutorialSteps[1].steps?.map((step, index) => (
                        <p key={index} className="text-sm text-blue-900">
                          {step}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Botón de instalación Android */}
                  {currentStep === 1 && !isIOS && deferredPrompt && (
                    <button
                      onClick={handleInstallClick}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition"
                    >
                      <Download size={24} />
                      Instalar Aplicación
                    </button>
                  )}

                  {/* Beneficios */}
                  {currentStep === 0 && (
                    <div className="space-y-3 mt-6">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-green-600">⚡</span>
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-800 text-sm">
                            Acceso instantáneo
                          </p>
                          <p className="text-xs text-zinc-600">
                            Abre la app desde tu pantalla de inicio
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600">📱</span>
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-800 text-sm">
                            Experiencia nativa
                          </p>
                          <p className="text-xs text-zinc-600">
                            Como una app descargada de la tienda
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Indicadores de paso */}
              <div className="flex justify-center gap-2 mt-6 mb-4">
                {tutorialSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 rounded-full transition-all ${
                      index === currentStep
                        ? "w-8 bg-orange-500"
                        : "w-2 bg-zinc-300"
                    }`}
                  />
                ))}
              </div>

              {/* Botones de navegación */}
              <div className="flex gap-3">
                {currentStep > 0 && (
                  <button
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="flex-1 border border-zinc-300 text-zinc-700 py-3 rounded-xl font-semibold hover:bg-zinc-50 transition"
                  >
                    Anterior
                  </button>
                )}

                {currentStep < tutorialSteps.length - 1 ? (
                  <button
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold transition"
                  >
                    Siguiente
                  </button>
                ) : (
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 py-3 rounded-xl font-semibold transition"
                  >
                    {isIOS || !deferredPrompt ? "Entendido" : "Más tarde"}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
