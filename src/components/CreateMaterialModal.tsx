'use client';

import React, { useState } from 'react';
import { createMaterialItem } from '@/lib/actions/storage';
import { Package, X, AlertCircle, Building2 } from 'lucide-react';

interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

interface CreateMaterialModalProps {
  projects: ProjectOption[];
  defaultProjectId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CreateMaterialModal({
  projects,
  defaultProjectId,
  isOpen,
  onClose,
}: CreateMaterialModalProps) {
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState(defaultProjectId || projects[0]?.id || '');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Áridos y Granulares');
  const [unit, setUnit] = useState('m3');
  const [minStock, setMinStock] = useState('10');
  const [initialStock, setInitialStock] = useState('0');
  const [location, setLocation] = useState('Campamento de Obra');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code || !name) {
      setError('Por favor complete los campos obligatorios');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await createMaterialItem({
        projectId: projectId || undefined,
        code: code.trim(),
        name: name.trim(),
        category,
        unit: unit.trim(),
        minStock: parseFloat(minStock) || 0,
        initialStock: parseFloat(initialStock) || 0,
        location: location.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar el material');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider">
              Catálogo de Materiales
            </span>
            <h3 className="text-lg font-black text-slate-900">
              Registrar Nuevo Ítem en Bodega de Obra
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Obra de la bodega */}
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
            <label className="block font-bold text-blue-950 mb-1 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-700" />
              Bodega de la Obra:
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.code}] {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Código del Ítem
              </label>
              <input
                type="text"
                required
                placeholder="Ej. MAT-ASFALTO"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
              >
                <option value="Áridos y Granulares">Áridos y Granulares</option>
                <option value="Tuberías y Alcantarillas">Tuberías y Alcantarillas</option>
                <option value="Asfaltos y Emulsiones">Asfaltos y Emulsiones</option>
                <option value="Combustibles y Lubricantes">Combustibles y Lubricantes</option>
                <option value="Conglomerantes y Cementos">Conglomerantes y Cementos</option>
                <option value="Aceros y Estructuras">Aceros y Estructuras</option>
                <option value="Insumos Ambientales">Insumos Ambientales</option>
                <option value="Varios y Repuestos">Varios y Repuestos</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nombre o Descripción del Material
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Cemento Asfáltico AC-20"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Unidad
              </label>
              <input
                type="text"
                required
                placeholder="Ej. m3, m, gal, kg"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Stock Mínimo
              </label>
              <input
                type="number"
                step="any"
                required
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Stock Inicial
              </label>
              <input
                type="number"
                step="any"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Ubicación de Almacén / Patio
            </label>
            <input
              type="text"
              placeholder="Ej. Campamento Central Pedro Carbo - Patio A"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold text-xs shadow-md shadow-orange-600/20 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Crear Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
