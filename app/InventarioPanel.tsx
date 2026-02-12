'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, Package, Edit2, Save, X } from 'lucide-react';
import Image from 'next/image';

interface Producto {
  id: number;
  CODIGO: string;
  TITULO: string;
  IMAGEN: string;
  existencia: number;
  P_MAYOREO: number;
  marca_id: number;
  CATEGORIA_ID: number;
}

export default function InventarioPanel() {
  const [busqueda, setBusqueda] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [nuevaExistencia, setNuevaExistencia] = useState<number>(0);
  const [guardando, setGuardando] = useState(false);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const buscarProductos = async (termino: string) => {
    if (!termino.trim()) {
      setProductos([]);
      return;
    }

    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('id, CODIGO, TITULO, IMAGEN, existencia, P_MAYOREO, marca_id, CATEGORIA_ID')
        .or(`TITULO.ilike.%${termino}%,CODIGO.ilike.%${termino}%,C_PRODUCTO.ilike.%${termino}%`)
        .limit(50);

      if (!error && data) {
        setProductos(data);
      }
    } catch (error) {
      console.error('Error buscando productos:', error);
    } finally {
      setCargando(false);
    }
  };

  const guardarExistencia = async (productoId: number) => {
    setGuardando(true);
    try {
      const { error } = await supabase
        .from('productos')
        .update({ existencia: nuevaExistencia })
        .eq('id', productoId);

      if (!error) {
        // Actualizar localmente
        setProductos(prev => 
          prev.map(p => 
            p.id === productoId 
              ? { ...p, existencia: nuevaExistencia }
              : p
          )
        );
        setEditando(null);
        if ('vibrate' in navigator) navigator.vibrate(50);
      } else {
        alert('Error al actualizar existencia');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicion = (producto: Producto) => {
    setEditando(producto.id);
    setNuevaExistencia(producto.existencia || 0);
  };

  const cancelarEdicion = () => {
    setEditando(null);
    setNuevaExistencia(0);
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-orange-100 rounded-full">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Inventario</h1>
              <p className="text-sm text-zinc-500">Administra las existencias de productos</p>
            </div>
          </div>

          {/* Buscador */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                buscarProductos(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-3 text-zinc-700 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            
            {busqueda && (
              <button
                onClick={() => {
                  setBusqueda('');
                  setProductos([]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {cargando && (
            <div className="mt-4 text-center">
              <div className="inline-block animate-spin h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full"></div>
              <p className="text-sm text-zinc-500 mt-2">Buscando...</p>
            </div>
          )}
        </div>

        {/* Lista de Productos */}
        {productos.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 bg-zinc-50 border-b border-zinc-200">
              <p className="text-sm font-semibold text-zinc-700">
                {productos.length} producto{productos.length !== 1 ? 's' : ''} encontrado{productos.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="divide-y divide-zinc-200">
              {productos.map((producto) => (
                <div 
                  key={producto.id} 
                  className="p-4 hover:bg-zinc-50 transition"
                >
                  <div className="flex items-center gap-4">
                    {/* Imagen */}
                    <div className="relative w-16 h-16 bg-zinc-100 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={producto.IMAGEN || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23e5e7eb' width='400' height='400'/%3E%3Ctext fill='%239ca3af' font-family='system-ui' font-size='20' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3ESin imagen%3C/text%3E%3C/svg%3E"}
                        alt={producto.TITULO}
                        fill
                        className="object-contain"
                      />
                    </div>

                    {/* Info Producto */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-zinc-900 truncate">{producto.TITULO}</p>
                      <p className="text-sm text-zinc-500">Código: {producto.CODIGO}</p>
                      <p className="text-xs text-zinc-400">Precio: ${producto.P_MAYOREO?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>

                    {/* Existencia */}
                    <div className="flex items-center gap-3">
                      {editando === producto.id ? (
                        <>
                          <input
                            type="number"
                            value={nuevaExistencia}
                            onChange={(e) => setNuevaExistencia(parseInt(e.target.value) || 0)}
                            className="w-24 px-3 py-2 border border-orange-500 text-zinc-700 rounded-lg text-center font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                guardarExistencia(producto.id);
                              } else if (e.key === 'Escape') {
                                cancelarEdicion();
                              }
                            }}
                          />
                          <button
                            onClick={() => guardarExistencia(producto.id)}
                            disabled={guardando}
                            className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition disabled:opacity-50"
                          >
                            <Save size={18} />
                          </button>
                          <button
                            onClick={cancelarEdicion}
                            disabled={guardando}
                            className="p-2 bg-zinc-300 hover:bg-zinc-400 text-zinc-700 rounded-lg transition disabled:opacity-50"
                          >
                            <X size={18} />
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="text-right">
                            <p className="text-xs text-zinc-500 mb-1">Existencia</p>
                            <p className={`text-2xl font-bold ${
                              (producto.existencia || 0) === 0 
                                ? 'text-red-500' 
                                : (producto.existencia || 0) < 10 
                                  ? 'text-yellow-500' 
                                  : 'text-green-500'
                            }`}>
                              {producto.existencia || 0}
                            </p>
                          </div>
                          <button
                            onClick={() => iniciarEdicion(producto)}
                            className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition"
                          >
                            <Edit2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estado vacío */}
        {!cargando && busqueda && productos.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-zinc-100 rounded-full flex items-center justify-center">
              <Package className="w-8 h-8 text-zinc-400" />
            </div>
            <p className="text-zinc-500 font-medium">No se encontraron productos</p>
            <p className="text-sm text-zinc-400 mt-1">Intenta con otro término de búsqueda</p>
          </div>
        )}

        {!busqueda && productos.length === 0 && !cargando && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
              <Search className="w-8 h-8 text-orange-500" />
            </div>
            <p className="text-zinc-700 font-medium">Busca un producto para empezar</p>
            <p className="text-sm text-zinc-500 mt-1">Usa el buscador de arriba para encontrar productos</p>
          </div>
        )}
      </div>
    </div>
  );
}