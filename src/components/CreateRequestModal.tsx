'use client';

import React, { useState } from 'react';
import {
  X,
  Package,
  Truck,
  Calendar,
  Clock,
  Layers,
  AlertTriangle,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { createWorkRequest } from '@/lib/actions/requests';

interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

interface MaterialOption {
  id: string;
  projectId: string | null;
  code: string;
  name: string;
  unit: string;
  currentStock: number;
}

interface MachineryOption {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  status: string;
}

export function CreateRequestModal({
  isOpen,
  onClose,
  projects,
  materials,
  machinery,
  defaultProjectId,
}: {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectOption[];
  materials: MaterialOption[];
  machinery: MachineryOption[];
  defaultProjectId?: string;
}) {
  const [type, setType] = useState<'MATERIAL' | 'MAQUINARIA'>('MATERIAL');
  const [projectId, setProjectId] = useState(defaultProjectId || projects[0]?.id || '');
  const [priority, setPriority] = useState<'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE'>('NORMAL');
  const [targetLocation, setTargetLocation] = useState('');
  const [justification, setJustification] = useState('');
  const [neededDate, setNeededDate] = useState(new Date().toISOString().split('T')[0]);

  // Material fields
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [customMaterialName, setCustomMaterialName] = useState('');
  const [requestedQty, setRequestedQty] = useState('');
  const [unit, setUnit] = useState('m3');

  // Machinery fields
  const [selectedMachineryId, setSelectedMachineryId] = useState(machinery[0]?.id || '');
  const [estimatedHours, setEstimatedHours] = useState('8');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [withOperator, setWithOperator] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter materials for selected project (or general)
  const projectMaterials = materials.filter(
    (m) => !m.projectId || m.projectId === projectId
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) {
      setError('Seleccione un proyecto');
      return;
    }
    if (!justification.trim()) {
      setError('Por favor ingrese la justificación o destino técnico del requerimiento');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (type === 'MATERIAL') {
        const qtyNum = parseFloat(requestedQty);
        if (isNaN(qtyNum) || qtyNum <= 0) {
          setError('Ingrese una cantidad válida mayor a 0');
          setLoading(false);
          return;
        }

        let matName = customMaterialName.trim();
        let matUnit = unit;
        if (selectedMaterialId) {
          const found = materials.find((m) => m.id === selectedMaterialId);
          if (found) {
            matName = found.name;
            matUnit = found.unit;
          }
        }

        if (!matName) {
          setError('Seleccione o ingrese el nombre del material requerido');
          setLoading(false);
          return;
        }

        await createWorkRequest({
          projectId,
          type: 'MATERIAL',
          materialItemId: selectedMaterialId || undefined,
          materialName: matName,
          requestedQty: qtyNum,
          unit: matUnit,
          targetLocation: targetLocation.trim() || undefined,
          priority,
          justification: justification.trim(),
          neededDate: neededDate || undefined,
        });
      } else {
        const hoursNum = parseFloat(estimatedHours);
        const mach = machinery.find((m) => m.id === selectedMachineryId);

        await createWorkRequest({
          projectId,
          type: 'MAQUINARIA',
          machineryId: selectedMachineryId || undefined,
          machineryName: mach ? `[${mach.code}] ${mach.name}` : undefined,
          estimatedHours: isNaN(hoursNum) ? undefined : hoursNum,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          withOperator,
          targetLocation: targetLocation.trim() || undefined,
          priority,
          justification: justification.trim(),
          neededDate: startDate || undefined,
        });
      }

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear la solicitud');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-base font-black text-slate-900">
              Crear Nueva Solicitud de Obra
            </h3>
            <p className="text-xs text-slate-500">
              Requerimiento oficial de insumos o asignación de maquinaria pesada
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Toggle Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setType('MATERIAL')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              type === 'MATERIAL'
                ? 'bg-white shadow-xs text-orange-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Solicitud de Materiales</span>
          </button>

          <button
            type="button"
            onClick={() => setType('MAQUINARIA')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              type === 'MAQUINARIA'
                ? 'bg-white shadow-xs text-orange-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Uso de Maquinaria</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Obra de Destino */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Obra / Proyecto Solicitante *
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-orange-500"
              required
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.code}] {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Conditional form fields */}
          {type === 'MATERIAL' ? (
            <div className="space-y-3.5 p-3.5 bg-orange-50/50 rounded-xl border border-orange-200/60">
              <span className="font-bold text-[11px] text-orange-950 uppercase tracking-wider block">
                Detalle del Material / Insumo
              </span>

              {/* Material catalog selector or custom */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ítem de Bodega (si existe en inventario)
                </label>
                <select
                  value={selectedMaterialId}
                  onChange={(e) => {
                    setSelectedMaterialId(e.target.value);
                    const found = materials.find((m) => m.id === e.target.value);
                    if (found) {
                      setUnit(found.unit);
                      setCustomMaterialName(found.name);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                >
                  <option value="">-- Insumo no catalogado / Personalizado --</option>
                  {projectMaterials.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.code}] {m.name} (Stock: {m.currentStock} {m.unit})
                    </option>
                  ))}
                </select>
              </div>

              {!selectedMaterialId && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Descripción del Insumo / Material *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Tubería H.A. 48 pulgadas, Cemento Selva Alegre, Diesel..."
                    value={customMaterialName}
                    onChange={(e) => setCustomMaterialName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    required={!selectedMaterialId}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cantidad Requerida *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Ej. 50"
                    value={requestedQty}
                    onChange={(e) => setRequestedQty(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold text-orange-700"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Unidad de Medida
                  </label>
                  <input
                    type="text"
                    placeholder="m3, gal, fundas, m..."
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Fecha Requerida en Obra
                </label>
                <input
                  type="date"
                  value={neededDate}
                  onChange={(e) => setNeededDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3.5 p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/60">
              <span className="font-bold text-[11px] text-blue-950 uppercase tracking-wider block">
                Detalle de Maquinaria Solicitada
              </span>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Equipo / Maquinaria Pesada *
                </label>
                <select
                  value={selectedMachineryId}
                  onChange={(e) => setSelectedMachineryId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  required
                >
                  {machinery.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.code}] {m.name} ({m.category}) - Estado: {m.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Fecha Inicio Requerida
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Fecha Fin Estimada
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Horas de Trabajo Estimadas
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={withOperator}
                      onChange={(e) => setWithOperator(e.target.checked)}
                      className="w-4 h-4 text-orange-600 rounded"
                    />
                    <span>Requiere Operador</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Common fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Frente / Tramo de Trabajo
              </label>
              <input
                type="text"
                placeholder="Ej. Tramo 2 Cantera La Cabuya, Km 14"
                value={targetLocation}
                onChange={(e) => setTargetLocation(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nivel de Prioridad
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
              >
                <option value="BAJA">Baja</option>
                <option value="NORMAL">Normal</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Justificación / Motivo del Requerimiento *
            </label>
            <textarea
              rows={3}
              placeholder="Explique la necesidad técnica en obra o actividad donde se empleará..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              required
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white rounded-xl shadow-md shadow-orange-600/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Registrando...' : 'Emitir Solicitud'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
