'use client';

import React, { useState } from 'react';
import { registerMaterialDispatch } from '@/lib/actions/storage';
import { ArrowRightLeft, X, AlertCircle, Clock, Truck, Building2 } from 'lucide-react';

interface MaterialItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  currentStock: number;
  projectId?: string | null;
}

interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

interface RegisterDispatchModalProps {
  materials: MaterialItem[];
  projects: ProjectOption[];
  defaultProjectId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function RegisterDispatchModal({
  materials,
  projects,
  defaultProjectId,
  isOpen,
  onClose,
}: RegisterDispatchModalProps) {
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState(defaultProjectId || projects[0]?.id || '');
  
  // Filter materials for this obra
  const projectMaterials = materials.filter((m) => !projectId || !m.projectId || m.projectId === projectId);
  const [selectedMaterialId, setSelectedMaterialId] = useState(projectMaterials[0]?.id || '');
  const [quantity, setQuantity] = useState('');
  const [targetWorkFront, setTargetWorkFront] = useState('Tramo 2 - Frente Drenaje (Alcantarillas)');
  const [dispatchedTo, setDispatchedTo] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState('Ing. Jerson López (Residente de Obra)');
  const [notes, setNotes] = useState('');

  // Default to current local datetime
  const now = new Date();
  const localDatetime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  const [departureDateTime, setDepartureDateTime] = useState(localDatetime);

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentMat = projectMaterials.find((m) => m.id === selectedMaterialId);
  const qtyNum = parseFloat(quantity) || 0;
  const remainingStock = (currentMat?.currentStock || 0) - qtyNum;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMaterialId || qtyNum <= 0) {
      setError('Ingrese una cantidad válida mayor a cero');
      return;
    }

    if (currentMat && qtyNum > currentMat.currentStock) {
      setError(`Stock insuficiente en bodega. Solo hay ${currentMat.currentStock} ${currentMat.unit} disponibles.`);
      return;
    }

    if (!dispatchedTo.trim()) {
      setError('Indique quién retira el material en obra');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await registerMaterialDispatch({
        materialItemId: selectedMaterialId,
        quantity: qtyNum,
        projectId: projectId || undefined,
        targetWorkFront,
        departureDateTime,
        dispatchedTo,
        authorizedBy,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar el despacho');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider">
              Salida de Almacén a Obra
            </span>
            <h3 className="text-lg font-black text-slate-900">
              Registrar Despacho de Material
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
          {/* Obra Origen */}
          <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-100">
            <label className="block font-bold text-orange-950 mb-1 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-orange-700" />
              Bodega de la Obra:
            </label>
            <select
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                const nextMats = materials.filter((m) => !e.target.value || !m.projectId || m.projectId === e.target.value);
                if (nextMats.length > 0) setSelectedMaterialId(nextMats[0].id);
              }}
              className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.code}] {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Material a Despachar
            </label>
            <select
              value={selectedMaterialId}
              onChange={(e) => setSelectedMaterialId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 font-medium"
            >
              {projectMaterials.map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.code}] {m.name} — Stock en Bodega: {m.currentStock} {m.unit}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Cantidad a Entregar ({currentMat?.unit || 'Unid'})
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="Ej. 15"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Saldo Resultante en Bodega
              </label>
              <div
                className={`px-3 py-2 border rounded-lg font-mono text-xs font-bold ${
                  remainingStock < 0
                    ? 'bg-rose-50 border-rose-300 text-rose-700'
                    : 'bg-slate-100 border-slate-300 text-slate-800'
                }`}
              >
                {remainingStock.toLocaleString('es-EC')} {currentMat?.unit}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-orange-600" />
                Fecha y Hora de Salida
              </label>
              <input
                type="datetime-local"
                required
                value={departureDateTime}
                onChange={(e) => setDepartureDateTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Frente / Destino en Obra
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Tramo 2 - Km 14+200"
                value={targetWorkFront}
                onChange={(e) => setTargetWorkFront(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Retirado por (Responsable en Obra)
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Manuel Castro (Operador EX15)"
                value={dispatchedTo}
                onChange={(e) => setDispatchedTo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Autorizado por
              </label>
              <input
                type="text"
                required
                value={authorizedBy}
                onChange={(e) => setAuthorizedBy(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Observaciones / Destino de Uso
            </label>
            <input
              type="text"
              placeholder="Ej. Instalación de tubería alcantarilla según reporte diario 024"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              disabled={loading || remainingStock < 0}
              className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold text-xs shadow-md shadow-orange-600/20 disabled:opacity-50"
            >
              {loading ? 'Procesando...' : 'Despachar de Bodega'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
