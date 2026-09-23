'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  PlusCircle,
  HardHat,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  ArrowRightLeft,
  X,
  UserCheck,
  UserX,
  Briefcase,
} from 'lucide-react';
import { createWorker, assignWorkerToProject, removeWorkerFromProject } from '@/lib/actions/workers';

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

interface WorkerItem {
  id: string;
  identification: string;
  name: string;
  roleCategory: string;
  phone?: string | null;
  email?: string | null;
  active: boolean;
  assignments: WorkerAssignmentInfo[];
}

interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

const CATEGORIES = [
  'Ingeniero Residente',
  'Ingeniero de Planillas',
  'Topógrafo',
  'Cadenero',
  'Operador Excavadora',
  'Operador Tractor',
  'Operador Rodillo',
  'Chofer Volqueta',
  'Chofer de Tanquero',
  'Ayudante de Obra - Recibidor',
  'Inspector Ambiental',
  'Seguridad y Salud (EHS)',
  'Mecánico de Obra',
];

export function WorkersView({
  workers,
  projects,
  selectedProjectId,
}: {
  workers: WorkerItem[];
  projects: ProjectOption[];
  selectedProjectId?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [assignmentFilter, setAssignmentFilter] = useState<'ALL' | 'ASSIGNED' | 'FREE'>('ALL');

  // Create worker modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [identification, setIdentification] = useState('');
  const [name, setName] = useState('');
  const [roleCategory, setRoleCategory] = useState(CATEGORIES[0]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Assign worker modal
  const [assignTarget, setAssignTarget] = useState<WorkerItem | null>(null);
  const [assignProjectId, setAssignProjectId] = useState(projects[0]?.id || '');
  const [assignedRole, setAssignedRole] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Filter workers
  const filtered = workers.filter((w) => {
    const isAssigned = w.assignments.length > 0;
    if (assignmentFilter === 'ASSIGNED' && !isAssigned) return false;
    if (assignmentFilter === 'FREE' && isAssigned) return false;

    if (categoryFilter !== 'ALL' && w.roleCategory !== categoryFilter) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = w.name.toLowerCase().includes(q);
      const matchId = w.identification.toLowerCase().includes(q);
      const matchRole = w.roleCategory.toLowerCase().includes(q);
      const matchProject = w.assignments.some(
        (a) => a.project.code.toLowerCase().includes(q) || a.project.name.toLowerCase().includes(q)
      );
      if (!matchName && !matchId && !matchRole && !matchProject) return false;
    }

    return true;
  });

  const totalWorkers = workers.length;
  const assignedCount = workers.filter((w) => w.assignments.length > 0).length;
  const freeCount = totalWorkers - assignedCount;

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identification.trim() || !name.trim()) return;
    try {
      setCreateLoading(true);
      setCreateError(null);
      await createWorker({
        identification: identification.trim(),
        name: name.trim().toUpperCase(),
        roleCategory,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      setCreateModalOpen(false);
      setIdentification('');
      setName('');
      setPhone('');
      setEmail('');
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Error al registrar personal');
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleAssignSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assignTarget || !assignProjectId) return;
    try {
      setAssignLoading(true);
      setAssignError(null);
      await assignWorkerToProject({
        workerId: assignTarget.id,
        projectId: assignProjectId,
        assignedRole: assignedRole.trim() || assignTarget.roleCategory,
        notes: assignNotes.trim() || undefined,
      });
      setAssignTarget(null);
      setAssignNotes('');
    } catch (err: unknown) {
      setAssignError(err instanceof Error ? err.message : 'Error al asignar personal');
    } finally {
      setAssignLoading(false);
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    if (!confirm('¿Desea desvincular este trabajador del proyecto?')) return;
    try {
      await removeWorkerFromProject(assignmentId);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4 text-orange-600" />
            <span>Recursos Humanos & Cuadrillas</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900">
            Personal de Obra & Asignación de Proyectos
          </h1>
          <p className="text-xs text-slate-500">
            Padrón de técnicos, operadores y cuadrillas con control de disponibilidad entre obras
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Registrar Nuevo Personal</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Padrón Total
          </span>
          <span className="font-mono text-2xl font-black text-slate-900">{totalWorkers}</span>
          <p className="text-[10px] text-slate-500">Trabajadores registrados en LICOSA</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
            En Obra (Asignados)
          </span>
          <span className="font-mono text-2xl font-black text-emerald-700">{assignedCount}</span>
          <p className="text-[10px] text-emerald-600">Actualmente laborando en frentes viales</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
            Disponibles / Sin Asignar
          </span>
          <span className="font-mono text-2xl font-black text-blue-700">{freeCount}</span>
          <p className="text-[10px] text-blue-600">Disponibles para nuevas obras o relevos</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Filtrar por Obra:</span>
            <select
              value={selectedProjectId || 'ALL'}
              onChange={(e) => {
                const val = e.target.value;
                router.push(val === 'ALL' ? '/personal' : `/personal?projectId=${val}`);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 text-xs focus:ring-1 focus:ring-orange-500"
            >
              <option value="ALL">Todas las obras</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.code}] {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por nombre, cédula o cargo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-full sm:w-72 focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[11px] font-semibold text-slate-600">
            <button
              onClick={() => setAssignmentFilter('ALL')}
              className={`px-3 py-1 rounded-md transition-all ${
                assignmentFilter === 'ALL' ? 'bg-white shadow-xs text-orange-600 font-bold' : 'hover:text-slate-900'
              }`}
            >
              Todos ({totalWorkers})
            </button>
            <button
              onClick={() => setAssignmentFilter('ASSIGNED')}
              className={`px-3 py-1 rounded-md transition-all ${
                assignmentFilter === 'ASSIGNED' ? 'bg-white shadow-xs text-orange-600 font-bold' : 'hover:text-slate-900'
              }`}
            >
              En Obra ({assignedCount})
            </button>
            <button
              onClick={() => setAssignmentFilter('FREE')}
              className={`px-3 py-1 rounded-md transition-all ${
                assignmentFilter === 'FREE' ? 'bg-white shadow-xs text-orange-600 font-bold' : 'hover:text-slate-900'
              }`}
            >
              Disponibles ({freeCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px]">Categoría:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value="ALL">Todas las especialidades</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Workers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((w) => {
          const currentAssignment = w.assignments[0];
          const isAssigned = !!currentAssignment;

          return (
            <div
              key={w.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                    C.I.: {w.identification}
                  </span>

                  {isAssigned ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      <span>En Obra</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                      <UserX className="w-3 h-3" />
                      <span>Disponible</span>
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900">{w.name}</h3>
                <p className="text-xs font-semibold text-orange-600 mt-0.5">{w.roleCategory}</p>

                {/* Assignment Status Card */}
                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  {isAssigned ? (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Asignado Actualmente a:
                      </span>
                      <p className="font-bold text-slate-800 line-clamp-1">
                        [{currentAssignment.project.code}] {currentAssignment.project.name}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Función: <strong>{currentAssignment.assignedRole}</strong>
                      </p>
                    </div>
                  ) : (
                    <div className="text-slate-400 italic text-[11px] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-slate-300" />
                      <span>Sin asignación activa (disponible para nuevas obras)</span>
                    </div>
                  )}
                </div>

                {/* Contact info */}
                {(w.phone || w.email) && (
                  <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                    {w.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{w.phone}</span>
                      </div>
                    )}
                    {w.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{w.email}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAssignTarget(w);
                    setAssignedRole(w.roleCategory);
                    setAssignNotes('');
                    if (projects.length > 0) setAssignProjectId(projects[0].id);
                  }}
                  className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-orange-400" />
                  <span>{isAssigned ? 'Reasignar / Transferir' : 'Asignar a Obra'}</span>
                </button>

                {isAssigned && (
                  <button
                    type="button"
                    onClick={() => handleRemoveAssignment(currentAssignment.id)}
                    title="Desvincular de la obra"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Create Worker */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-black text-slate-900">Registrar Nuevo Personal</h3>
                <p className="text-xs text-slate-500">Padrón de trabajadores y cuadrillas de obra</p>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cédula de Identidad / DNI *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 0912345678"
                  value={identification}
                  onChange={(e) => setIdentification(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombres y Apellidos Completos *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Carlos Pérez Morales"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Especialidad / Categoría *</label>
                <select
                  value={roleCategory}
                  onChange={(e) => setRoleCategory(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teléfono Móvil</label>
                  <input
                    type="text"
                    placeholder="0991234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="juan@licosa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-sm"
                >
                  {createLoading ? 'Guardando...' : 'Guardar Personal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Assign to Project */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-black text-slate-900">Asignar Personal a Obra</h3>
                <p className="text-xs text-slate-500">{assignTarget.name} ({assignTarget.roleCategory})</p>
              </div>
              <button onClick={() => setAssignTarget(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning if already assigned */}
            {assignTarget.assignments.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Actualmente Asignado a Otra Obra</span>
                </div>
                <p className="text-amber-700 text-[11px]">
                  Este trabajador se encuentra laborando en{' '}
                  <strong>[{assignTarget.assignments[0].project.code}] {assignTarget.assignments[0].project.name}</strong>.
                  Al asignarlo a una nueva obra, se registrará automáticamente su transferencia.
                </p>
              </div>
            )}

            {assignError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {assignError}
              </div>
            )}

            <form onSubmit={handleAssignSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Obra de Destino *</label>
                <select
                  value={assignProjectId}
                  onChange={(e) => setAssignProjectId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white font-bold"
                  required
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rol / Función en este Frente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Operador Excavadora Frente 2"
                  value={assignedRole}
                  onChange={(e) => setAssignedRole(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observaciones / Motivo de Asignación</label>
                <textarea
                  rows={2}
                  placeholder="Detalles del relevo o actividad asignada..."
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAssignTarget(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={assignLoading}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-sm"
                >
                  {assignLoading ? 'Asignando...' : 'Confirmar Asignación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
