'use client';

import React, { useState, useEffect } from 'react';
import { createProject } from '@/lib/actions/projects';
import { getContractors } from '@/lib/actions/contractors';
import { getWorkers, assignWorkerToProject } from '@/lib/actions/workers';
import { PlusCircle, X, AlertCircle, Users, Briefcase, AlertTriangle } from 'lucide-react';

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

  // Available contractors and staff
  const [contractorsList, setContractorsList] = useState<any[]>([]);
  const [workersList, setWorkersList] = useState<any[]>([]);
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      getContractors().then(setContractorsList).catch(console.error);
      getWorkers().then(setWorkersList).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function toggleWorker(workerId: string) {
    setSelectedWorkers((prev) =>
      prev.includes(workerId) ? prev.filter((id) => id !== workerId) : [...prev, workerId]
    );
  }

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
      const newProj = await createProject({
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

      // Assign selected workers to this new project
      if (selectedWorkers.length > 0 && newProj?.id) {
        for (const wId of selectedWorkers) {
          const w = workersList.find((item) => item.id === wId);
          if (w) {
            await assignWorkerToProject({
              workerId: w.id,
              projectId: newProj.id,
              assignedRole: w.roleCategory,
              notes: 'Asignado durante la creación del proyecto',
            });
          }
        }
      }

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear el proyecto');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
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
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Código del Proyecto *
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
                N° de Contrato *
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
              Nombre Oficial de la Obra *
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
              <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Contratista / Consorcio *</span>
                {contractorsList.length > 0 && (
                  <span className="text-[10px] text-orange-600 font-normal">
                    ({contractorsList.length} registrados)
                  </span>
                )}
              </label>
              {contractorsList.length > 0 ? (
                <div className="space-y-1">
                  <select
                    value={contractor}
                    onChange={(e) => setContractor(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                  >
                    {contractorsList.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.specialty})
                      </option>
                    ))}
                    <option value="OTRO">-- Otro / Ingresar manualmente --</option>
                  </select>
                  {contractor === 'OTRO' && (
                    <input
                      type="text"
                      placeholder="Ingrese nombre del contratista"
                      onChange={(e) => setContractor(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-lg text-xs mt-1"
                    />
                  )}
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
                Entidad Contratante *
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
                Monto Contractual ($) *
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
                Plazo (Días) *
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
                Fecha de Inicio *
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

          {/* Section: Pre-assign staff with overlap detection */}
          {workersList.length > 0 && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-orange-600" />
                  <span>Asignar Personal Inicial a esta Obra (Opcional)</span>
                </span>
                <span className="text-[10px] text-slate-500">
                  {selectedWorkers.length} seleccionado(s)
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Seleccione trabajadores para incorporarlos al nuevo proyecto. El sistema le advierte si ya están activos en otra obra:
              </p>

              <div className="max-h-36 overflow-y-auto space-y-1 border border-slate-200 rounded-lg p-2 bg-white divide-y divide-slate-100">
                {workersList.map((w) => {
                  const currentProj = w.assignments?.[0]?.project;
                  const isSelected = selectedWorkers.includes(w.id);

                  return (
                    <label
                      key={w.id}
                      className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded cursor-pointer text-[11px]"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleWorker(w.id)}
                          className="w-3.5 h-3.5 text-orange-600 rounded"
                        />
                        <div>
                          <strong className="text-slate-800">{w.name}</strong>
                          <span className="text-slate-400 ml-1.5">({w.roleCategory})</span>
                        </div>
                      </div>

                      {currentProj ? (
                        <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>En: [{currentProj.code}]</span>
                        </span>
                      ) : (
                        <span className="text-[9.5px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Disponible
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-xs shadow-md shadow-orange-600/20 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
