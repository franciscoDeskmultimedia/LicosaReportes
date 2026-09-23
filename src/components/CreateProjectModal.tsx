'use client';

import React, { useState } from 'react';
import { createProject } from '@/lib/actions/projects';
import { PlusCircle, X, AlertCircle } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [contractor, setContractor] = useState('CONSORCIO VALLE DE LA VIRGEN');
  const [client, setClient] = useState('GAD PROVINCIAL DEL GUAYAS');
  const [inspectionCompany, setInspectionCompany] = useState('ASOCIACION C-D');
  const [executingCompany, setExecutingCompany] = useState('LICOSA');
  const [contractNumber, setContractNumber] = useState('');
  const [financingSource, setFinancingSource] = useState('BIRF / BANCO MUNDIAL');
  const [roadSection, setRoadSection] = useState('');
  const [contractAmount, setContractAmount] = useState('');
  const [durationDays, setDurationDays] = useState('240');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(contractAmount);
    const days = parseInt(durationDays);

    if (!code || !name || isNaN(amount) || isNaN(days)) {
      setError('Por favor complete los campos obligatorios correctamente');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await createProject({
        code: code.toUpperCase(),
        name,
        contractor,
        client,
        inspectionCompany,
        executingCompany,
        contractNumber,
        financingSource,
        roadSection,
        contractAmount: amount,
        durationDays: days,
        startDate,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear el proyecto');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider">
              Contratos Viales
            </span>
            <h3 className="text-lg font-black text-slate-900">
              Registrar Nuevo Proyecto de Obra
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Código del Proyecto
              </label>
              <input
                type="text"
                required
                placeholder="Ej. OBRA-VIAL-02"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                N° de Contrato
              </label>
              <input
                type="text"
                required
                placeholder="Ej. EC-PREFGUAYAS-..."
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nombre Oficial de la Obra
            </label>
            <textarea
              rows={2}
              required
              placeholder="Ej. Rehabilitación de la vía..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Contratista (Consorcio)
              </label>
              <input
                type="text"
                required
                value={contractor}
                onChange={(e) => setContractor(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Entidad Contratante
              </label>
              <input
                type="text"
                required
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Fiscalización
              </label>
              <input
                type="text"
                required
                value={inspectionCompany}
                onChange={(e) => setInspectionCompany(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Empresa Ejecutora / Frente
              </label>
              <input
                type="text"
                required
                value={executingCompany}
                onChange={(e) => setExecutingCompany(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tramo / Segmento
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Valle de la Virgen - Las Muras"
                value={roadSection}
                onChange={(e) => setRoadSection(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Fuente de Financiamiento
              </label>
              <input
                type="text"
                required
                value={financingSource}
                onChange={(e) => setFinancingSource(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Monto Contractual ($)
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="Ej. 5939620.30"
                value={contractAmount}
                onChange={(e) => setContractAmount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Plazo (Días)
              </label>
              <input
                type="number"
                required
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Fecha de Inicio
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
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
              className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold text-xs shadow-md shadow-orange-600/20 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
