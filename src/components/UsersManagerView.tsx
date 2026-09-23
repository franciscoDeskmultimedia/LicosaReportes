'use client';

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  HardHat,
  Package,
  CheckCircle2,
  Building2,
  KeyRound,
  Mail,
  User,
  X,
  Lock,
  Edit3,
  Briefcase,
  Layers,
} from 'lucide-react';
import { createUserAction, updateUserAction } from '@/lib/actions/auth';
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  code: string;
  name: string;
}

interface UserWithAssignments {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string | null;
  active: boolean;
  assignments: Array<{
    id: string;
    projectId: string;
    roleInProject: string;
    project: {
      id: string;
      code: string;
      name: string;
    };
  }>;
}

export function UsersManagerView({
  users,
  projects,
}: {
  users: UserWithAssignments[];
  projects: Project[];
}) {
  const router = useRouter();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('');
  const [globalRole, setGlobalRole] = useState<'ADMIN' | 'ESTANDAR'>('ESTANDAR');
  const [projectRolesMap, setProjectRolesMap] = useState<Record<string, string>>({});

  // Edit Form State
  const [editUser, setEditUser] = useState<UserWithAssignments | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editGlobalRole, setEditGlobalRole] = useState<'ADMIN' | 'ESTANDAR'>('ESTANDAR');
  const [editProjectRolesMap, setEditProjectRolesMap] = useState<Record<string, string>>({});

  // Helper to open edit modal
  function openEditModal(u: UserWithAssignments) {
    setEditUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditPassword('');
    setEditTitle(u.title || '');
    setEditGlobalRole(u.role === 'ADMIN' ? 'ADMIN' : 'ESTANDAR');

    const map: Record<string, string> = {};
    for (const a of u.assignments) {
      map[a.projectId] = a.roleInProject || 'RESIDENTE_OBRA';
    }
    setEditProjectRolesMap(map);
    setError(null);
    setEditModalOpen(true);
  }

  function toggleProjectInCreate(projectId: string) {
    setProjectRolesMap((prev) => {
      const copy = { ...prev };
      if (copy[projectId]) {
        delete copy[projectId];
      } else {
        copy[projectId] = 'RESIDENTE_OBRA';
      }
      return copy;
    });
  }

  function setRoleForProjectInCreate(projectId: string, role: string) {
    setProjectRolesMap((prev) => ({
      ...prev,
      [projectId]: role,
    }));
  }

  function toggleProjectInEdit(projectId: string) {
    setEditProjectRolesMap((prev) => {
      const copy = { ...prev };
      if (copy[projectId]) {
        delete copy[projectId];
      } else {
        copy[projectId] = 'RESIDENTE_OBRA';
      }
      return copy;
    });
  }

  function setRoleForProjectInEdit(projectId: string, role: string) {
    setEditProjectRolesMap((prev) => ({
      ...prev,
      [projectId]: role,
    }));
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Por favor complete nombre, correo y contraseña');
      return;
    }

    const assignments = Object.entries(projectRolesMap).map(([pId, r]) => ({
      projectId: pId,
      roleInProject: r,
    }));

    if (globalRole !== 'ADMIN' && assignments.length === 0) {
      setError('Debe asignar al menos una obra con su respectivo rol');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await createUserAction({
        name,
        email,
        password,
        role: globalRole === 'ADMIN' ? 'ADMIN' : 'ESTANDAR',
        title,
        assignments: globalRole === 'ADMIN' ? [] : assignments,
      });

      setCreateModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      setTitle('');
      setProjectRolesMap({});
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar usuario');
    } finally {
      setLoading(false);
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    if (!editName || !editEmail) {
      setError('Nombre y correo son requeridos');
      return;
    }

    const assignments = Object.entries(editProjectRolesMap).map(([pId, r]) => ({
      projectId: pId,
      roleInProject: r,
    }));

    if (editGlobalRole !== 'ADMIN' && assignments.length === 0) {
      setError('Debe asignar al menos una obra con su rol específico');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await updateUserAction({
        id: editUser.id,
        name: editName,
        email: editEmail,
        password: editPassword.trim().length > 0 ? editPassword.trim() : undefined,
        role: editGlobalRole === 'ADMIN' ? 'ADMIN' : 'ESTANDAR',
        title: editTitle,
        assignments: editGlobalRole === 'ADMIN' ? [] : assignments,
      });

      setEditModalOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar usuario');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4 text-orange-600" />
            <span>Seguridad & Permisos RBAC Granulares</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900">
            Usuarios, Roles & Asignación por Proyecto
          </h1>
          <p className="text-xs text-slate-500">
            Defina roles específicos por cada obra vial: un trabajador puede ser Bodeguero en una obra e Ingeniero Residente en otra.
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Registrar Nuevo Trabajador</span>
        </button>
      </div>

      {/* Explanatory Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-orange-600 font-bold text-xs uppercase">
            <Shield className="w-4 h-4" />
            <span>Administrador General</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Acceso global a todas las obras. Puede reajustar rubros por contrato complementario, editar usuarios y reasignar roles de bodega u obra.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase">
            <HardHat className="w-4 h-4" />
            <span>Residente de Obra (Por Proyecto)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Habilitado para emitir reportes diarios oficiales (formato LICOSA), verificar rendimientos y maquinaria en los proyectos donde ejerza este rol.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase">
            <Package className="w-4 h-4" />
            <span>Encargado de Bodega (Por Proyecto)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Habilitado exclusivamente para registrar ingresos de insumos por factura y despachos a los frentes en la obra donde esté asignado como bodeguero.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-700" />
            <h2 className="font-bold text-slate-800 text-sm">
              Personal Registrado en el Sistema ({users.length})
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-3 px-4">Usuario / Nombre</th>
                <th className="py-3 px-4">Tipo Global</th>
                <th className="py-3 px-4">Obras Asignadas & Rol Específico por Obra</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isAdmin = u.role === 'ADMIN';

                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{u.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                          {u.title && <p className="text-[10.5px] text-slate-500">{u.title}</p>}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-orange-50 text-orange-800 border border-orange-200">
                          <Shield className="w-3 h-3" />
                          <span>ADMINISTRADOR</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          <Briefcase className="w-3 h-3" />
                          <span>OPERATIVO</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {isAdmin ? (
                        <span className="text-slate-600 font-medium italic">
                          Acceso Global a Todas las Obras Viales
                        </span>
                      ) : u.assignments.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {u.assignments.map((a) => {
                            const isBod = a.roleInProject === 'BODEGUERO';
                            const isRes = a.roleInProject === 'RESIDENTE_OBRA';

                            return (
                              <div
                                key={a.id}
                                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px]"
                              >
                                <Building2 className="w-3 h-3 text-slate-500" />
                                <span className="font-bold text-slate-800 font-mono">[{a.project.code}]</span>
                                <span className="text-slate-600">→</span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isBod
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : isRes
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-purple-100 text-purple-800'
                                  }`}
                                >
                                  {isBod ? '📦 BODEGUERO' : isRes ? '👷 RESIDENTE' : a.roleInProject}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-amber-600 font-semibold italic text-[11px]">
                          Sin obras asignadas
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Activo</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openEditModal(u)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all border border-slate-300"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-orange-600" />
                        <span>Editar Rol & Obras</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Editar Trabajador & Roles por Obra */}
      {editModalOpen && editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Editar Trabajador: {editUser.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Modificar datos personales y asignar rol específico por proyecto
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cargo / Título Oficial
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nueva Contraseña (Opcional)
                  </label>
                  <input
                    type="password"
                    placeholder="Dejar vacío para no cambiar"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nivel de Acceso Global
                </label>
                <select
                  value={editGlobalRole}
                  onChange={(e) => setEditGlobalRole(e.target.value as typeof editGlobalRole)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white font-medium"
                >
                  <option value="ESTANDAR">Personal Operativo (Roles específicos por proyecto vial)</option>
                  <option value="ADMIN">ADMINISTRADOR GENERAL (Acceso total a todas las obras y módulos)</option>
                </select>
              </div>

              {editGlobalRole !== 'ADMIN' && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800">
                        Asignación de Roles por Proyecto Vial
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Marque las obras que administrará y seleccione el rol que desempeñará en cada una:
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    {projects.map((p) => {
                      const isAssigned = Boolean(editProjectRolesMap[p.id]);
                      const currentRole = editProjectRolesMap[p.id] || 'RESIDENTE_OBRA';

                      return (
                        <div
                          key={p.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isAssigned
                              ? 'bg-white border-orange-300 shadow-xs'
                              : 'bg-slate-100/60 border-slate-200 opacity-70'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <label className="flex items-start gap-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isAssigned}
                                onChange={() => toggleProjectInEdit(p.id)}
                                className="mt-1 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                              />
                              <div>
                                <span className="font-mono font-bold text-slate-900 block">
                                  [{p.code}]
                                </span>
                                <span className="text-[11px] text-slate-600 line-clamp-1">
                                  {p.name}
                                </span>
                              </div>
                            </label>

                            {isAssigned && (
                              <div className="flex items-center gap-2 pl-6 sm:pl-0">
                                <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                                  Rol en esta obra:
                                </span>
                                <select
                                  value={currentRole}
                                  onChange={(e) => setRoleForProjectInEdit(p.id, e.target.value)}
                                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                >
                                  <option value="BODEGUERO">📦 BODEGUERO (Solo Almacén)</option>
                                  <option value="RESIDENTE_OBRA">👷 RESIDENTE (Reportes & Frentes)</option>
                                  <option value="FISCALIZADOR">📋 FISCALIZADOR (Supervisión)</option>
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-md shadow-orange-600/20 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios de Rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Nuevo Trabajador */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Registrar Nuevo Trabajador</h3>
                  <p className="text-[11px] text-slate-400">
                    Definir cargo y rol específico por cada obra vial
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Ing. Marco Navarrete"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="usuario@licosa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Contraseña *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cargo / Título Oficial
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Coordinador de Bodega & Frente"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nivel de Acceso Global
                </label>
                <select
                  value={globalRole}
                  onChange={(e) => setGlobalRole(e.target.value as typeof globalRole)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white font-medium"
                >
                  <option value="ESTANDAR">Personal Operativo (Roles específicos por proyecto vial)</option>
                  <option value="ADMIN">ADMINISTRADOR GENERAL (Acceso total a todas las obras y módulos)</option>
                </select>
              </div>

              {globalRole !== 'ADMIN' && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800">
                        Asignación de Roles por Proyecto Vial
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Marque las obras autorizadas y el rol específico en cada una:
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    {projects.map((p) => {
                      const isAssigned = Boolean(projectRolesMap[p.id]);
                      const currentRole = projectRolesMap[p.id] || 'RESIDENTE_OBRA';

                      return (
                        <div
                          key={p.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isAssigned
                              ? 'bg-white border-orange-300 shadow-xs'
                              : 'bg-slate-100/60 border-slate-200 opacity-70'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <label className="flex items-start gap-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isAssigned}
                                onChange={() => toggleProjectInCreate(p.id)}
                                className="mt-1 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                              />
                              <div>
                                <span className="font-mono font-bold text-slate-900 block">
                                  [{p.code}]
                                </span>
                                <span className="text-[11px] text-slate-600 line-clamp-1">
                                  {p.name}
                                </span>
                              </div>
                            </label>

                            {isAssigned && (
                              <div className="flex items-center gap-2 pl-6 sm:pl-0">
                                <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                                  Rol en esta obra:
                                </span>
                                <select
                                  value={currentRole}
                                  onChange={(e) => setRoleForProjectInCreate(p.id, e.target.value)}
                                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                >
                                  <option value="BODEGUERO">📦 BODEGUERO (Solo Almacén)</option>
                                  <option value="RESIDENTE_OBRA">👷 RESIDENTE (Reportes & Frentes)</option>
                                  <option value="FISCALIZADOR">📋 FISCALIZADOR (Supervisión)</option>
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-md shadow-orange-600/20 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Crear Usuario & Asignar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
