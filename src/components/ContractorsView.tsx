'use client';

import React, { useState } from 'react';
import {
  Briefcase,
  PlusCircle,
  Building2,
  Search,
  Phone,
  Mail,
  User,
  DollarSign,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
  Trash2,
} from 'lucide-react';
import {
  createContractor,
  assignContractorToProject,
  removeContractorFromProject,
} from '@/lib/actions/contractors';

interface ProjectAssignmentInfo {
  id: string;
  projectId: string;
  roleInProject: string;
  contractAmount?: number | null;
  notes?: string | null;
  project: {
    id: string;
    code: string;
    name: string;
  };
}

interface ContractorItem {
  id: string;
  name: string;
  ruc: string;
  specialty: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  projectAssignments: ProjectAssignmentInfo[];
}

interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

const SPECIALTIES = [
  'Consorcio Constructor Principal',
  'Movimiento de Tierras & Canteras',
  'Asfaltado & Pavimentación',
  'Puentes & Estructuras Mayores',
  'Fiscalización & Control de Calidad',
  'Transporte Pesado & Desalojo',
  'Drenaje & Obras de Arte',
  'Señalización Vial & Seguridad',
];

const CONTRACTOR_ROLES = [
  'CONTRATISTA_PRINCIPAL',
  'SUBCONTRATISTA_ASFALTO',
  'SUBCONTRATISTA_MOVIMIENTO_TIERRAS',
  'SUBCONTRATISTA_PUENTES',
  'FISCALIZACION_EXTERNA',
  'PROVEEDOR_TRANSPORTE_LOGISTICA',
];

export function ContractorsView({
  contractors,
  projects,
}: {
  contractors: ContractorItem[];
  projects: ProjectOption[];
}) {
  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [ruc, setRuc] = useState('');
  const [specialty, setSpecialty] = useState(SPECIALTIES[0]);
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Assign modal
  const [assignTarget, setAssignTarget] = useState<ContractorItem | null>(null);
  const [assignProjectId, setAssignProjectId] = useState(projects[0]?.id || '');
  const [roleInProject, setRoleInProject] = useState(CONTRACTOR_ROLES[0]);
  const [contractAmount, setContractAmount] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const filtered = contractors.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.ruc.toLowerCase().includes(q) ||
      c.specialty.toLowerCase().includes(q) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
      c.projectAssignments.some((a) => a.project.code.toLowerCase().includes(q) || a.project.name.toLowerCase().includes(q))
    );
  });

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !ruc.trim()) return;
    try {
      setCreateLoading(true);
      setCreateError(null);
      await createContractor({
        name: name.trim().toUpperCase(),
        ruc: ruc.trim(),
        specialty,
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      setCreateModalOpen(false);
      setName('');
      setRuc('');
      setContactPerson('');
      setPhone('');
      setEmail('');
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Error al registrar contratista');
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
      const amtNum = parseFloat(contractAmount);
      await assignContractorToProject({
        contractorId: assignTarget.id,
        projectId: assignProjectId,
        roleInProject,
        contractAmount: isNaN(amtNum) ? undefined : amtNum,
        notes: assignNotes.trim() || undefined,
      });
      setAssignTarget(null);
      setContractAmount('');
      setAssignNotes('');
    } catch (err: unknown) {
      setAssignError(err instanceof Error ? err.message : 'Error al asignar a la obra');
    } finally {
      setAssignLoading(false);
    }
  }

  async function handleRemoveContractor(contractorId: string, projectId: string) {
    if (!confirm('¿Desea desvincular este contratista de la obra?')) return;
    try {
      await removeContractorFromProject(contractorId, projectId);
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
            <Briefcase className="w-4 h-4 text-orange-600" />
            <span>Registro de Empresas & Alianzas</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900">
            Contratistas & Subcontratistas de Obra
          </h1>
          <p className="text-xs text-slate-500">
            Gestión de empresas ejecutoras, consorcios y frentes subcontratados por proyecto
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Registrar Contratista</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Empresas Registradas
          </span>
          <span className="font-mono text-2xl font-black text-slate-900">{contractors.length}</span>
          <p className="text-[10px] text-slate-500">Contratistas en base de datos</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-orange-200 bg-orange-50/20 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider block">
            Asignaciones en Obras
          </span>
          <span className="font-mono text-2xl font-black text-orange-700">
            {contractors.reduce((acc, c) => acc + c.projectAssignments.length, 0)}
          </span>
          <p className="text-[10px] text-orange-600">Vínculos contractuales activos</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
            Proyectos con Contratistas
          </span>
          <span className="font-mono text-2xl font-black text-blue-700">{projects.length}</span>
          <p className="text-[10px] text-blue-600">Obras viales registradas</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por contratista, RUC, especialidad u obra asignada..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-orange-500"
          />
        </div>
        <span className="text-slate-400 text-[11px]">
          Mostrando {filtered.length} contratista(s)
        </span>
      </div>

      {/* Contractors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 bg-slate-900 text-white rounded-md">
                  RUC: {c.ruc}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                  {c.specialty}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900">{c.name}</h3>

              {/* Contact info */}
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                {c.contactPerson && (
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Contacto: {c.contactPerson}</span>
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{c.phone}</span>
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{c.email}</span>
                  </div>
                )}
              </div>

              {/* Assigned Projects */}
              <div className="mt-3 space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Obras Asignadas ({c.projectAssignments.length}):
                </span>
                {c.projectAssignments.length > 0 ? (
                  c.projectAssignments.map((a) => (
                    <div
                      key={a.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2"
                    >
                      <div>
                        <p className="font-bold text-slate-800 text-[11px]">
                          [{a.project.code}] {a.project.name}
                        </p>
                        <p className="text-[10px] text-orange-700 font-semibold">
                          Rol: {a.roleInProject.replace(/_/g, ' ')}
                          {a.contractAmount && ` • Monto: $${a.contractAmount.toLocaleString('es-EC')}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveContractor(c.id, a.projectId)}
                        title="Desvincular de esta obra"
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="text-slate-400 italic text-[11px] block">
                    Sin obras asignadas actualmente
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setAssignTarget(c);
                  setContractAmount('');
                  setAssignNotes('');
                  if (projects.length > 0) setAssignProjectId(projects[0].id);
                }}
                className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-orange-400" />
                <span>+ Asignar a Obra</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Create Contractor */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-black text-slate-900">Registrar Contratista</h3>
                <p className="text-xs text-slate-500">Empresa contratista o consorcio ejecutor</p>
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
                <label className="block font-semibold text-slate-700 mb-1">Razón Social / Nombre Consorcio *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Consorcio Valle de la Virgen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">RUC *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 0991234567001"
                    value={ruc}
                    onChange={(e) => setRuc(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Especialidad *</label>
                  <select
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    {SPECIALTIES.map((sp) => (
                      <option key={sp} value={sp}>
                        {sp}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contacto / Representante Técnico</label>
                <input
                  type="text"
                  placeholder="Ej. Ing. Carlos Mendoza"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="04-2123456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="contacto@consorcio.com"
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
                  {createLoading ? 'Guardando...' : 'Registrar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Assign Contractor to Project */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-black text-slate-900">Asignar Contratista a Obra</h3>
                <p className="text-xs text-slate-500">{assignTarget.name} (RUC: {assignTarget.ruc})</p>
              </div>
              <button onClick={() => setAssignTarget(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {assignError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {assignError}
              </div>
            )}

            <form onSubmit={handleAssignSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Obra Vial *</label>
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
                <label className="block font-semibold text-slate-700 mb-1">Rol en el Proyecto *</label>
                <select
                  value={roleInProject}
                  onChange={(e) => setRoleInProject(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white font-medium"
                >
                  {CONTRACTOR_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Monto de Contrato / Subcontrato ($)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Ej. 150000.00"
                  value={contractAmount}
                  onChange={(e) => setContractAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observaciones / Alcance de Trabajos</label>
                <textarea
                  rows={2}
                  placeholder="Alcance, frentes asignados o condiciones..."
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
