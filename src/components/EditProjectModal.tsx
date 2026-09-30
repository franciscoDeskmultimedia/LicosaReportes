'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateProject } from '@/lib/actions/projects';
import { getContractors } from '@/lib/actions/contractors';
import { Edit, X, AlertCircle, CheckCircle2, Calendar, Clock, DollarSign } from 'lucide-react';

export interface ProjectDataForEdit {
  id: string;
  code: string;
  name: string;
  contractor: string;
  client: string;
  inspectionCompany?: string | null;
  executingCompany?: string | null;
  contractNumber: string;
  financingSource?: string | null;
  roadSection?: string | null;
  contractAmount: number;
  durationDays: number;
  startDate: Date | string;
  status?: string | null;
}

interface EditProjectModalProps {
  project: ProjectDataForEdit;
  isOpen: boolean;
  onClose: () => void;
}

export function EditProjectModal({ project, isOpen, onClose }: EditProjectModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [code, setCode] = useState(project.code || '');
  const [name, setName] = useState(project.name || '');
  const [contractor, setContractor] = useState(project.contractor || '');
  const [client, setClient] = useState(project.client || '');
  const [inspectionCompany, setInspectionCompany] = useState(project.inspectionCompany || '');
  const [executingCompany, setExecutingCompany] = useState(project.executingCompany || 'LICOSA');
  const [contractNumber, setContractNumber] = useState(project.contractNumber || '');
  const [financingSource, setFinancingSource] = useState(project.financingSource || '');
  const [roadSection, setRoadSection] = useState(project.roadSection || '');
  const [contractAmount, setContractAmount] = useState(project.contractAmount?.toString() || '');
  const [durationDays, setDurationDays] = useState(project.durationDays?.toString() || '180');
  const [status, setStatus] = useState(project.status || 'EN_EJECUCION');

  const initialDateStr = project.startDate
    ? new Date(project.startDate).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(initialDateStr);

  const [contractorsList, setContractorsList] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      setCode(project.code || '');
      setName(project.name || '');
      setContractor(project.contractor || '');
      setClient(project.client || '');
      setInspectionCompany(project.inspectionCompany || '');
      setExecutingCompany(project.executingCompany || 'LICOSA');
      setContractNumber(project.contractNumber || '');
      setFinancingSource(project.financingSource || '');
      setRoadSection(project.roadSection || '');
      setContractAmount(project.contractAmount?.toString() || '');
      setDurationDays(project.durationDays?.toString() || '180');
      setStatus(project.status || 'EN_EJECUCION');
      if (project.startDate) {
        setStartDate(new Date(project.startDate).toISOString().split('T')[0]);
      }
      setError(null);
      setSuccess(null);
      getContractors().then(setContractorsList).catch(console.error);
    }
  }, [isOpen, project]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(contractAmount);
    const days = parseInt(durationDays);

    if (!code.trim() || !name.trim() || isNaN(amount) || isNaN(days)) {
      setError('Por favor complete los campos obligatorios correctamente.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await updateProject(project.id, {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        contractor: contractor.trim(),
        client: client.trim(),
        inspectionCompany: inspectionCompany.trim(),
        executingCompany: executingCompany.trim(),
        contractNumber: contractNumber.trim(),
        financingSource: financingSource.trim(),
        roadSection: roadSection.trim(),
        contractAmount: amount,
        durationDays: days,
        startDate,
        status,
      });

      setSuccess('Proyecto actualizado exitosamente.');
      router.refresh();

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el proyecto');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider">
              Administración Contractual
            </span>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Edit className="w-5 h-5 text-orange-600" />
              <span>Editar Datos del Proyecto [{project.code}]</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Actualice el plazo contractual, fechas, montos y datos generales de la obra.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Código y Contrato */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Código del Proyecto *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                N° de Contrato *
              </label>
              <input
                type="text"
                required
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Nombre Oficial */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nombre Oficial de la Obra *
            </label>
            <textarea
              rows={2}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Contratista y Cliente */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Contratista / Consorcio *
              </label>
              {contractorsList.length > 0 ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    required
                    value={contractor}
                    onChange={(e) => setContractor(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  required
                  value={contractor}
                  onChange={(e) => setContractor(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
                />
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Entidad Contratante (Cliente) *
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

          {/* Fiscalización y Frente */}
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

          {/* Tramo y Financiamiento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tramo / Segmento
              </label>
              <input
                type="text"
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

          {/* Monto, Plazo y Fecha de Inicio */}
          <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-3">
            <span className="text-[11px] font-bold text-blue-900 block flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-700" />
              <span>Plazo Contractual y Condiciones Económicas</span>
            </span>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Monto Contractual ($) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={contractAmount}
                  onChange={(e) => setContractAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 font-mono font-bold bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Plazo Contractual (Días) *
                </label>
                <input
                  type="number"
                  required
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 font-mono font-bold bg-white"
                  title="Modifique este valor si se aprobó una ampliación de plazo contractual"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Fecha de Inicio *
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Estado del Proyecto */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Estado de la Obra
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-semibold"
            >
              <option value="EN_EJECUCION">🟢 EN EJECUCIÓN (Activo)</option>
              <option value="SUSPENDIDO">🟡 SUSPENDIDO (Pausa temporal / Trámite)</option>
              <option value="FINALIZADO">⚪ FINALIZADO (Recepción de obra)</option>
            </select>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-xs shadow-md shadow-orange-600/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
