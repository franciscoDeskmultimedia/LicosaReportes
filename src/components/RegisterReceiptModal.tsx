'use client';

import React, { useState } from 'react';
import { registerPurchaseReceipt } from '@/lib/actions/storage';
import { PlusCircle, X, AlertCircle, Clock, Building2 } from 'lucide-react';

interface MaterialItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  projectId?: string | null;
}

interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

interface RegisterReceiptModalProps {
  materials: MaterialItem[];
  projects: ProjectOption[];
  defaultProjectId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function RegisterReceiptModal({
  materials,
  projects,
  defaultProjectId,
  isOpen,
  onClose,
}: RegisterReceiptModalProps) {
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState(defaultProjectId || projects[0]?.id || '');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [supplier, setSupplier] = useState('');
  
  const now = new Date();
  const localDatetime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  const [entryDateTime, setEntryDateTime] = useState(localDatetime);
  const [receivedBy, setReceivedBy] = useState('Segundo Plúa (Recibidor de Bodega)');
  const [invoiceTotal, setInvoiceTotal] = useState('');
  const [notes, setNotes] = useState('');

  // Filter materials based on selected project
  const projectMaterials = materials.filter((m) => !projectId || !m.projectId || m.projectId === projectId);
  const [selectedMaterialId, setSelectedMaterialId] = useState(projectMaterials[0]?.id || '');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseFloat(quantity);
    const cost = parseFloat(unitCost) || undefined;
    const total = parseFloat(invoiceTotal) || (qty * (cost || 0));

    if (!receiptNumber || !supplier || !selectedMaterialId || isNaN(qty) || qty <= 0) {
      setError('Por favor complete el comprobante y el ítem a ingresar');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await registerPurchaseReceipt({
        projectId: projectId || undefined,
        receiptNumber: receiptNumber.trim().toUpperCase(),
        supplier: supplier.trim(),
        entryDateTime,
        receivedBy: receivedBy.trim(),
        invoiceTotal: total,
        notes: notes.trim() || undefined,
        items: [
          {
            materialItemId: selectedMaterialId,
            quantity: qty,
            unitCost: cost,
          },
        ],
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar el comprobante');
    } finally {
      setLoading(false);
    }
  }

  const selectedMaterial = projectMaterials.find((m) => m.id === selectedMaterialId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
              Ingreso a Almacén
            </span>
            <h3 className="text-lg font-black text-slate-900">
              Registrar Comprobante de Compra
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
          {/* Obra de Destino */}
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
            <label className="block font-bold text-blue-950 mb-1 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-700" />
              Obra / Proyecto al que ingresa:
            </label>
            <select
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                const nextMats = materials.filter((m) => !e.target.value || !m.projectId || m.projectId === e.target.value);
                if (nextMats.length > 0) setSelectedMaterialId(nextMats[0].id);
              }}
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
                N° de Factura / Guía de Remisión
              </label>
              <input
                type="text"
                required
                placeholder="Ej. FAC-001-09843"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Proveedor / Empresa
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Hormigones del Guayas"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Fecha y Hora de Ingreso
              </label>
              <input
                type="datetime-local"
                required
                value={entryDateTime}
                onChange={(e) => setEntryDateTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Recibido por (Bodeguero)
              </label>
              <input
                type="text"
                required
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Item details */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
              Detalle del Material Ingresado
            </h4>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Seleccionar Material de la Bodega de esta Obra
              </label>
              <select
                value={selectedMaterialId}
                onChange={(e) => setSelectedMaterialId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              >
                {projectMaterials.map((m) => (
                  <option key={m.id} value={m.id}>
                    [{m.code}] {m.name} ({m.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cantidad Recibida ({selectedMaterial?.unit || 'Unid'})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="Ej. 100"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Costo Unitario ($)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Ej. 42.50"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Monto Total Factura ($)
              </label>
              <input
                type="number"
                step="any"
                placeholder="Ej. 4250.00"
                value={invoiceTotal}
                onChange={(e) => setInvoiceTotal(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Notas / Observaciones
              </label>
              <input
                type="text"
                placeholder="Ej. Certificado de calidad adjunto"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
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
              {loading ? 'Guardando...' : 'Registrar Ingreso en Bodega'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
