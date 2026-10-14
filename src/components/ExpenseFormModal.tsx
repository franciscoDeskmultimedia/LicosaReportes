'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  DollarSign,
  Calendar,
  Building2,
  FileText,
  Tag,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  createSingleExpense,
  updateSingleExpense,
  ExpenseItemData,
} from '@/lib/actions/expenses';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectCode: string;
  initialData?: ExpenseItemData | null;
  onSuccess?: () => void;
}

const CATEGORIES = [
  'Materiales Pétreos',
  'Servicios Profesionales',
  'Subcontratos de Obra',
  'Ensayos y Laboratorio',
  'Alimentación de Personal',
  'Peajes y Movilización',
  'Mantenimiento y Repuestos',
  'Mano de Obra Menor',
  'Campamento y Servicios Básicos',
  'Materiales e Insumos',
  'Topografía y Mediciones',
  'Otros Gastos de Obra',
];

const DOCUMENT_TYPES = [
  'Factura',
  'Nota de Venta',
  'Liquidación de Compra',
  'Documento no autorizado',
  'Recibo de Caja Chica',
  'Comprobante de Retención',
  'Otro',
];

export function ExpenseFormModal({
  isOpen,
  onClose,
  projectId,
  projectCode,
  initialData,
  onSuccess,
}: ExpenseFormModalProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [registerType, setRegisterType] = useState<string>('Proveedor');
  const [documentType, setDocumentType] = useState<string>('Factura');
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [supplier, setSupplier] = useState<string>('');
  const [subtotalIva, setSubtotalIva] = useState<number>(0);
  const [subtotalZero, setSubtotalZero] = useState<number>(0);
  const [iva, setIva] = useState<number>(0);
  const [ice, setIce] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [retentions, setRetentions] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);
  const [category, setCategory] = useState<string>('Materiales Pétreos');
  const [description, setDescription] = useState<string>('');

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date || new Date().toISOString().split('T')[0]);
      setRegisterType(initialData.registerType || 'Proveedor');
      setDocumentType(initialData.documentType || 'Factura');
      setDocumentNumber(initialData.documentNumber || '');
      setSupplier(initialData.supplier || '');
      setSubtotalIva(initialData.subtotalIva || 0);
      setSubtotalZero(initialData.subtotalZero || 0);
      setIva(initialData.iva || 0);
      setIce(initialData.ice || 0);
      setTotal(initialData.total || 0);
      setRetentions(initialData.retentions || 0);
      setBalance(initialData.balance || 0);
      setCategory(initialData.category || 'Otros Gastos de Obra');
      setDescription(initialData.description || '');
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setRegisterType('Proveedor');
      setDocumentType('Factura');
      setDocumentNumber('');
      setSupplier('');
      setSubtotalIva(0);
      setSubtotalZero(0);
      setIva(0);
      setIce(0);
      setTotal(0);
      setRetentions(0);
      setBalance(0);
      setCategory('Materiales Pétreos');
      setDescription('');
    }
    setError(null);
  }, [initialData, isOpen]);

  // Recalculate IVA and Total dynamically
  function handleSubtotalIvaChange(val: number) {
    setSubtotalIva(val);
    const newIva = Number((val * 0.15).toFixed(2));
    setIva(newIva);
    const newTotal = Number((val + subtotalZero + newIva + ice).toFixed(2));
    setTotal(newTotal);
    setBalance(Number((newTotal - retentions).toFixed(2)));
  }

  function handleSubtotalZeroChange(val: number) {
    setSubtotalZero(val);
    const newTotal = Number((subtotalIva + val + iva + ice).toFixed(2));
    setTotal(newTotal);
    setBalance(Number((newTotal - retentions).toFixed(2)));
  }

  function handleIvaChange(val: number) {
    setIva(val);
    const newTotal = Number((subtotalIva + subtotalZero + val + ice).toFixed(2));
    setTotal(newTotal);
    setBalance(Number((newTotal - retentions).toFixed(2)));
  }

  function handleRetentionsChange(val: number) {
    setRetentions(val);
    setBalance(Number((total - val).toFixed(2)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplier.trim()) {
      setError('El nombre del proveedor o beneficiario es obligatorio.');
      return;
    }
    if (total <= 0) {
      setError('El monto total debe ser mayor a 0.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (initialData?.id) {
        await updateSingleExpense({
          id: initialData.id,
          projectId,
          date,
          registerType,
          documentType,
          documentNumber,
          supplier: supplier.trim(),
          subtotalIva,
          subtotalZero,
          iva,
          ice,
          total,
          retentions,
          balance,
          description: description.trim(),
          category,
        });
      } else {
        await createSingleExpense({
          projectId,
          date,
          registerType,
          documentType,
          documentNumber,
          supplier: supplier.trim(),
          subtotalIva,
          subtotalZero,
          iva,
          ice,
          total,
          retentions,
          balance,
          description: description.trim(),
          category,
        });
      }

      onClose();
      if (onSuccess) onSuccess();
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Error al guardar el comprobante de costo.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {initialData ? 'Editar Comprobante' : 'Nuevo Costo de Obra'}
              </span>
              <span className="text-xs text-slate-400 font-mono">[{projectCode}]</span>
            </div>
            <h2 className="text-base font-bold text-white mt-1">
              {initialData ? 'Actualizar Registro de Gasto' : 'Registrar Comprobante / Gasto Individual'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Fecha del Comprobante *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Tipo de Documento *
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 outline-none bg-white"
              >
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt} value={dt}>
                    {dt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                # Documento / Factura *
              </label>
              <input
                type="text"
                required
                placeholder="001-100-000000123"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Proveedor / Persona Beneficiaria *
              </label>
              <input
                type="text"
                required
                placeholder="Nombre o Razón Social del Proveedor"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500 outline-none uppercase"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Categoría del Gasto *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 outline-none bg-white font-medium"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Desglose Económico */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              Desglose de Valores y Liquidación
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Subtotal (IVA 15%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={subtotalIva || ''}
                  onChange={(e) => handleSubtotalIvaChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-500 outline-none text-right bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Subtotal (IVA 0%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={subtotalZero || ''}
                  onChange={(e) => handleSubtotalZeroChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-500 outline-none text-right bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  IVA ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={iva || ''}
                  onChange={(e) => handleIvaChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-500 outline-none text-right bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-800 mb-1">
                  Total Factura ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={total || ''}
                  onChange={(e) => {
                    const t = parseFloat(e.target.value) || 0;
                    setTotal(t);
                    setBalance(Number((t - retentions).toFixed(2)));
                  }}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg text-xs font-mono font-extrabold focus:ring-1 focus:ring-emerald-500 outline-none text-right bg-emerald-50/60 text-emerald-950"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Retenciones de Ley ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={retentions || ''}
                  onChange={(e) => handleRetentionsChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-500 outline-none text-right bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Saldo Líquido a Pagar ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={balance || ''}
                  onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-500 outline-none text-right bg-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Descripción y Detalle del Gasto
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Compra de material pétreo para sub-base tramo 1, planilla N° 9..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{initialData ? 'Actualizar Gasto' : 'Guardar Comprobante'}</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
