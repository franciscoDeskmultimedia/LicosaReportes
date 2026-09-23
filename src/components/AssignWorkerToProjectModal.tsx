'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, UserPlus, AlertTriangle, CheckCircle2, UserCheck, HardHat, Phone } from 'lucide-react';
import { assignWorkerToProject, createWorker } from '@/lib/actions/workers';

interface WorkerAssignmentInfo {
  id: string;
  projectId: string;
  assignedRole: string;
  status: string;
  project: {
    id: string;
    code: string;
    name: string;
  };
}

interface WorkerOption {
  id: string;
  identification: string;
  name: string;
  roleCategory: string;
  phone?: string | null;
  email?: string | null;
  active: boolean;
  assignments: WorkerAssignmentInfo[];
}

const CATEGORIES = [
  'Ingeniero Residente',
  'Ingeniero de Planillas',
  'Topógrafo',
  'Cadenero',
  'Operador Excavadora',
  'Operador Tractor',
  'Operador Rodillo',
  'Operador Motoniveladora',
  'Operador Retroexcavadora',
  'Chofer Volqueta',
  'Chofer de Tanquero',
  'Ayudante de Obra - Recibidor',
  'Fierrero / Albañil',
  'Inspector Ambiental',
  'Seguridad y Salud (EHS)',
  'Mecánico de Obra',
];

interface Props {
  projectId: string;
  projectName: string;
  projectCode: string;
  allWorkers: WorkerOption[];
  isOpen: boolean;
  onClose: () => void;
}

export function AssignWorkerToProjectModal({
  projectId,
  projectName,
  projectCode,
  allWorkers,
  isOpen,
  onClose,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<'select' | 'new'>('select');

  // Existing worker selection
  const [selectedWorkerId, setSelectedWorkerId] = useState(allWorkers[0]?.id || '');
  const [assignedRole, setAssignedRole] = useState('');
  const [notes, setNotes] = useState('');

  // New worker registration fields
  const [newIdentification, setNewIdentification] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedWorker = allWorkers.find((w) => w.id === selectedWorkerId);
  const activeAssignment = selectedWorker?.assignments?.find((a) => a.status === 'ACTIVO');
  const isCurrentlyInOtherProject = activeAssignment && activeAssignment.projectId !== projectId;
  const isAlreadyInThisProject = activeAssignment && activeAssignment.projectId === projectId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let workerIdToAssign = selectedWorkerId;

      if (tab === 'new') {
        if (!newIdentification.trim() || !newName.trim()) {
          throw new Error('Cédula y Nombre son obligatorios para registrar un nuevo trabajador');
        }
        const created = await createWorker({
          identification: newIdentification.trim(),
          name: newName.trim().toUpperCase(),
          roleCategory: newCategory,
          phone: newPhone.trim() || undefined,
          email: newEmail.trim() || undefined,
        });
        workerIdToAssign = created.id;
      }

      if (!workerIdToAssign) {
        throw new Error('Seleccione un trabajador para asignar');
      }

      await assignWorkerToProject({
        workerId: workerIdToAssign,
        projectId,
        assignedRole:
          assignedRole.trim() ||
          (tab === 'new' ? newCategory : selectedWorker?.roleCategory || 'Personal de Obra'),
        notes: notes.trim() || undefined,
      });

      router.refresh();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al asignar trabajador');
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
              Asignación a Obra
            </span>
            <h3 className="text-lg font-black text-slate-900">
              Asignar Personal a {projectCode}
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

        {/* Tab switch: Select vs Quick Register */}
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
            <UserCheck className="w-4 h-4" />
            <span>Padrón de Personal ({allWorkers.length})</span>
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
            <UserPlus className="w-4 h-4" />
            <span>Registrar Nuevo Personal</span>
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
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Seleccionar Trabajador del Padrón *
                </label>
                {allWorkers.length > 0 ? (
                  <select
                    value={selectedWorkerId}
                    onChange={(e) => {
                      setSelectedWorkerId(e.target.value);
                      const w = allWorkers.find((x) => x.id === e.target.value);
                      if (w && !assignedRole) {
                        setAssignedRole(w.roleCategory);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-orange-500"
                  >
                    {allWorkers.map((w) => {
                      const current = w.assignments.find((a) => a.status === 'ACTIVO');
                      return (
                        <option key={w.id} value={w.id}>
                          {w.name} - {w.roleCategory} (CI: {w.identification})
                          {current ? ` [⚠️ En: ${current.project.code}]` : ' [DISPONIBLE]'}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
                    No hay trabajadores en el padrón. Usa la pestaña "Registrar Nuevo Personal".
                  </div>
                )}
              </div>

              {/* Warning if already in another project */}
              {isCurrentlyInOtherProject && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Aviso de Traslado de Personal</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Este trabajador está activo actualmente en <strong>{activeAssignment?.project.code}</strong>. Al confirmar la asignación, se cerrará su asignación previa y quedará transferido oficialmente a <strong>{projectCode}</strong>.
                  </p>
                </div>
              )}

              {isAlreadyInThisProject && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs">
                  Este trabajador ya está asignado a esta obra. Puedes actualizar su cargo o notas.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cédula / DNI *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 0923456789"
                    value={newIdentification}
                    onChange={(e) => setNewIdentification(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Oficio / Especialidad *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => {
                      setNewCategory(e.target.value);
                      if (!assignedRole) setAssignedRole(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-orange-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nombres y Apellidos Completos *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. MANUEL ALEJANDRO VÉLEZ"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs uppercase font-medium focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    placeholder="Ej. 0987654321"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Correo (Opcional)</label>
                  <input
                    type="email"
                    placeholder="trabajador@email.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Project Specific Assignment Details */}
          <div className="grid grid-cols-1 gap-3 pt-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Cargo / Función Específica en esta Obra
              </label>
              <input
                type="text"
                placeholder={
                  selectedWorker?.roleCategory || newCategory || 'Ej. Operador Excavadora Frente Norte'
                }
                value={assignedRole}
                onChange={(e) => setAssignedRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Observaciones / Tramo Asignado
              </label>
              <input
                type="text"
                placeholder="Ej. Asignado a cuadrilla de colocación de alcantarillas en abscisa 12+400"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Buttons */}
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
              disabled={loading || (tab === 'select' && !selectedWorkerId)}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Asignando...' : 'Confirmar Asignación a la Obra'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
