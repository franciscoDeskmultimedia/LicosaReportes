'use client';

import React, { useState } from 'react';
import { adjustRubroQuantity } from '@/lib/actions/projects';
import { FilePlus, X, AlertCircle } from 'lucide-react';

interface AdjustRubroModalProps {
  rubroId: string;
  rubroNumber: number;
  description: string;
  currentQuantity: number;
  unit: string;
  unitPrice: number;
  isOpen: boolean;
  onClose: () => void;
}

export function AdjustRubroModal({
  rubroId,
  rubroNumber,
  description,
  currentQuantity,
  unit,
  unitPrice,
  isOpen,
  onClose,
}: AdjustRubroModalProps) {
  const [loading, setLoading] = useState(false);
  const [quantityChange, setQuantityChange] = useState('');
  const [type, setType] = useState('COMPLEMENTARY_CONTRACT');
  const [reason, setReason] = useState('');
  const [documentRef, setDocumentRef] = useState('');
  const [approvedBy, setApprovedBy] = useState('Ing. Jerson López (Residente de Obra)');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const qty = parseFloat(quantityChange) || 0;
  const newTotal = currentQuantity + qty;
  const financialImpact = qty * unitPrice;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!qty || qty === 0) {
      setError('Ingrese una cantidad válida mayor o menor a cero');
      return;
    }
    if (!reason.trim()) {
      setError('La justificación técnica es obligatoria');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await adjustRubroQuantity({
        projectRubroId: rubroId,
        quantityChange: qty,
        type,
        reason,
        documentRef: documentRef || undefined,
        approvedBy,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar la modificación');
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
              Modificación Contractual
            </span>
            <h3 className="text-lg font-black text-slate-900">
              Ampliación de Rubro N° {rubroNumber}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <p className="font-semibold text-slate-800 line-clamp-1">{description}</p>
          <div className="mt-2 flex items-center justify-between text-slate-500 pt-1.5 border-t border-slate-200/60">
            <span>Cantidad Actual: <strong className="text-slate-800">{currentQuantity.toLocaleString('es-EC')} {unit}</strong></span>
            <span>P.U.: <strong className="text-slate-800">${unitPrice.toFixed(2)}</strong></span>
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Tipo de Modificación
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              <option value="COMPLEMENTARY_CONTRACT">Contrato Complementario (Ampliación de obra)</option>
              <option value="WORK_ORDER">Orden de Trabajo / Cambio de Proyecto</option>
              <option value="ADJUSTMENT">Reajuste de Cantidades en Obra</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Variación de Cantidad (+ o -)
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="Ej. 5000 o -200"
                value={quantityChange}
                onChange={(e) => setQuantityChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nueva Meta Acumulada
              </label>
              <div className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-800">
                {newTotal.toLocaleString('es-EC')} {unit}
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-[11px] flex justify-between items-center">
            <span>Impacto Presupuestario Estimado:</span>
            <strong className="text-xs font-bold font-mono">
              ${financialImpact.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
            </strong>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              N° de Oficio / Referencia de Aprobación
            </label>
            <input
              type="text"
              placeholder="Ej. Oficio GADG-OBRAS-2026-042 / Adenda 1"
              value={documentRef}
              onChange={(e) => setDocumentRef(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Justificación Técnica
            </label>
            <textarea
              rows={3}
              required
              placeholder="Describa el sustento de la necesidad de incremento o ajuste de este rubro..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Aprobado por
            </label>
            <input
              type="text"
              required
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
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
              {loading ? 'Guardando...' : 'Aplicar Modificación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
