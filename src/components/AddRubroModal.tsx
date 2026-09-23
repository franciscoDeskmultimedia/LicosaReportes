'use client';

import React, { useState } from 'react';
import { addProjectRubro } from '@/lib/actions/projects';
import { PlusCircle, X, AlertCircle } from 'lucide-react';

interface AddRubroModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AddRubroModal({ projectId, isOpen, onClose }: AddRubroModalProps) {
  const [loading, setLoading] = useState(false);
  const [rubroNumber, setRubroNumber] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('m3');
  const [unitPrice, setUnitPrice] = useState('');
  const [initialQuantity, setInitialQuantity] = useState('');
  const [isPrincipal, setIsPrincipal] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rNum = parseInt(rubroNumber);
    const uPrice = parseFloat(unitPrice);
    const iQty = parseFloat(initialQuantity);

    if (!rNum || isNaN(uPrice) || isNaN(iQty)) {
      setError('Por favor complete todos los campos numéricos correctamente');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await addProjectRubro({
        projectId,
        rubroNumber: rNum,
        description,
        unit,
        unitPrice: uPrice,
        initialQuantity: iQty,
        isPrincipal,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al agregar el rubro');
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
              Presupuesto de Obra
            </span>
            <h3 className="text-lg font-black text-slate-900">
              Crear Nuevo Rubro Contractual
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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                N° de Rubro
              </label>
              <input
                type="number"
                required
                placeholder="Ej. 35"
                value={rubroNumber}
                onChange={(e) => setRubroNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Unidad
              </label>
              <input
                type="text"
                required
                placeholder="Ej. m3, m, kg"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tipo de Rubro
              </label>
              <select
                value={isPrincipal ? 'true' : 'false'}
                onChange={(e) => setIsPrincipal(e.target.value === 'true')}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                <option value="true">Principal</option>
                <option value="false">No Principal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Descripción del Rubro
            </label>
            <textarea
              rows={2}
              required
              placeholder="Ej. Hormigón simple f'c=210 kg/cm2 en cabezales de alcantarilla"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Cantidad Contractual
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="Ej. 1200"
                value={initialQuantity}
                onChange={(e) => setInitialQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Precio Unitario ($)
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="Ej. 145.50"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none font-mono"
              />
            </div>
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Crear Rubro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
