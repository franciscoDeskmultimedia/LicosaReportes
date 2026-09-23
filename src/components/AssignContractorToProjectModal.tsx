'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Briefcase, PlusCircle, CheckCircle2, AlertTriangle, Building } from 'lucide-react';
import { assignContractorToProject, createContractor } from '@/lib/actions/contractors';

interface ContractorOption {
  id: string;
  name: string;
  ruc: string;
  specialty: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface Props {
  projectId: string;
  projectName: string;
  projectCode: string;
  allContractors: ContractorOption[];
  isOpen: boolean;
  onClose: () => void;
}

export function AssignContractorToProjectModal({
  projectId,
  projectName,
  projectCode,
  allContractors,
  isOpen,
  onClose,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<'select' | 'new'>('select');

  const [selectedContractorId, setSelectedContractorId] = useState(allContractors[0]?.id || '');
  const [subcontractAmount, setSubcontractAmount] = useState('');
  const [scope, setScope] = useState('');

  // New contractor fields
  const [newName, setNewName] = useState('');
  const [newRuc, setNewRuc] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('Movimiento de Tierras');
  const [newContactPerson, setNewContactPerson] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let contractorIdToAssign = selectedContractorId;

      if (tab === 'new') {
        if (!newName.trim() || !newRuc.trim()) {
          throw new Error('Nombre / Razón Social y RUC son requeridos');
        }
        const created = await createContractor({
          name: newName.trim(),
          ruc: newRuc.trim(),
          specialty: newSpecialty.trim(),
          contactPerson: newContactPerson.trim() || undefined,
          phone: newPhone.trim() || undefined,
          email: newEmail.trim() || undefined,
        });
        contractorIdToAssign = created.id;
      }

      if (!contractorIdToAssign) {
        throw new Error('Seleccione un contratista');
      }

      const amount = subcontractAmount ? parseFloat(subcontractAmount) : undefined;

      await assignContractorToProject({
        projectId,
        contractorId: contractorIdToAssign,
        subcontractAmount: isNaN(amount as number) ? undefined : amount,
        scope: scope.trim() || undefined,
      });

      router.refresh();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al asignar contratista');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">
              Contratación & Subcontratos
            </span>
            <h3 className="text-lg font-black text-slate-900">
              Vincular Contratista a {projectCode}
            </h3>
            <p className="text-xs text-slate-500 line-clamp-1">{projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setTab('select')}
            className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              tab === 'select'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Directorio Existente ({allContractors.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('new')}
            className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              tab === 'new'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Crear Nuevo Contratista</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {tab === 'select' ? (
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Seleccionar Contratista *
              </label>
              {allContractors.length > 0 ? (
                <select
                  value={selectedContractorId}
                  onChange={(e) => setSelectedContractorId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-orange-500"
                >
                  {allContractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {c.specialty} (RUC: {c.ruc})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
                  No hay contratistas registrados. Utilice la pestaña "Crear Nuevo Contratista".
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Razón Social / Consorcio *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. CONSTRUCTORA DEL VALLE S.A."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    RUC (13 dígitos) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0992345678001"
                    value={newRuc}
                    onChange={(e) => setNewRuc(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Especialidad *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Asfaltado, Estructuras, Señalización"
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contacto Principal</label>
                  <input
                    type="text"
                    placeholder="Ing. Juan Pérez"
                    value={newContactPerson}
                    onChange={(e) => setNewContactPerson(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    placeholder="0987654321"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="contacto@empresa.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Subcontract details */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Monto Subcontratado ($ USD)
              </label>
              <input
                type="number"
                step="any"
                placeholder="Ej. 125000.00"
                value={subcontractAmount}
                onChange={(e) => setSubcontractAmount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Alcance / Tramo del Subcontrato
              </label>
              <input
                type="text"
                placeholder="Ej. Construcción de bordillos y cunetas Km 0+000 al Km 5+000"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

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
              disabled={loading || (tab === 'select' && !selectedContractorId)}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Asignando...' : 'Vincular a la Obra'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
