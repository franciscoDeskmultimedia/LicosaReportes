'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Package,
  FileText,
  Scale,
  Users,
  Building2,
  ArrowDownRight,
  ArrowUpRight,
  LogIn,
  LogOut,
  Info,
  Clock,
  User,
  Calendar,
  Layers,
  ChevronDown,
  X,
  Code2,
} from 'lucide-react';

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  userId: string | null;
  userName: string;
  userEmail: string;
  userRole: string;
  projectId: string | null;
  metadata: string | null;
  createdAt: string | Date;
  project?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

export function AuditLogView({
  logs,
  projects,
}: {
  logs: AuditLogItem[];
  projects: ProjectOption[];
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('ALL');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [activeMetadataModal, setActiveMetadataModal] = useState<AuditLogItem | null>(null);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Filter by project
      if (selectedProject !== 'ALL') {
        if (log.projectId !== selectedProject) return false;
      }

      // Filter by action category
      if (selectedAction !== 'ALL') {
        if (selectedAction === 'BODEGA') {
          if (!['INGRESO_BODEGA', 'DESPACHO_BODEGA', 'CREAR_ITEM_BODEGA'].includes(log.action))
            return false;
        } else if (selectedAction === 'REPORTES') {
          if (!['REPORTE_DIARIO_CREADO', 'REPORTE_DIARIO_ELIMINADO'].includes(log.action))
            return false;
        } else if (selectedAction === 'CONTRATO') {
          if (!['REAJUSTE_RUBRO', 'PROYECTO_CREADO', 'RUBRO_CREADO'].includes(log.action))
            return false;
        } else if (selectedAction === 'USUARIOS') {
          if (!['USUARIO_CREADO', 'USUARIO_MODIFICADO'].includes(log.action)) return false;
        } else if (selectedAction === 'SESIONES') {
          if (!['INICIO_SESION', 'CIERRE_SESION'].includes(log.action)) return false;
        } else if (log.action !== selectedAction) {
          return false;
        }
      }

      // Text search
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchesDesc = log.description.toLowerCase().includes(query);
        const matchesUser =
          log.userName.toLowerCase().includes(query) ||
          log.userEmail.toLowerCase().includes(query);
        const matchesProject =
          log.project?.name.toLowerCase().includes(query) ||
          log.project?.code.toLowerCase().includes(query);
        const matchesAction = log.action.toLowerCase().includes(query);
        return matchesDesc || matchesUser || matchesProject || matchesAction;
      }

      return true;
    });
  }, [logs, selectedProject, selectedAction, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const bodega = logs.filter((l) =>
      ['INGRESO_BODEGA', 'DESPACHO_BODEGA', 'CREAR_ITEM_BODEGA'].includes(l.action)
    ).length;
    const reportes = logs.filter((l) =>
      ['REPORTE_DIARIO_CREADO', 'REPORTE_DIARIO_ELIMINADO'].includes(l.action)
    ).length;
    const contratos = logs.filter((l) =>
      ['REAJUSTE_RUBRO', 'PROYECTO_CREADO', 'RUBRO_CREADO'].includes(l.action)
    ).length;
    const usuarios = logs.filter((l) =>
      ['USUARIO_CREADO', 'USUARIO_MODIFICADO'].includes(l.action)
    ).length;
    return { total, bodega, reportes, contratos, usuarios };
  }, [logs]);

  // Helpers for action formatting
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'INGRESO_BODEGA':
        return {
          label: 'Ingreso Bodega',
          icon: ArrowDownRight,
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'DESPACHO_BODEGA':
        return {
          label: 'Despacho Bodega',
          icon: ArrowUpRight,
          className: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'CREAR_ITEM_BODEGA':
        return {
          label: 'Alta Ítem Bodega',
          icon: Package,
          className: 'bg-teal-50 text-teal-700 border-teal-200',
        };
      case 'REPORTE_DIARIO_CREADO':
        return {
          label: 'Reporte Diario Creado',
          icon: FileText,
          className: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'REPORTE_DIARIO_ELIMINADO':
        return {
          label: 'Reporte Eliminado',
          icon: FileText,
          className: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'REAJUSTE_RUBRO':
        return {
          label: 'Reajuste Contractual',
          icon: Scale,
          className: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'PROYECTO_CREADO':
        return {
          label: 'Nueva Obra Creada',
          icon: Building2,
          className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        };
      case 'RUBRO_CREADO':
        return {
          label: 'Nuevo Rubro Creado',
          icon: Scale,
          className: 'bg-sky-50 text-sky-700 border-sky-200',
        };
      case 'USUARIO_CREADO':
        return {
          label: 'Usuario Registrado',
          icon: Users,
          className: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        };
      case 'USUARIO_MODIFICADO':
        return {
          label: 'Permisos / Rol Editado',
          icon: Users,
          className: 'bg-orange-50 text-orange-700 border-orange-200',
        };
      case 'INICIO_SESION':
        return {
          label: 'Inicio de Sesión',
          icon: LogIn,
          className: 'bg-slate-100 text-slate-700 border-slate-300',
        };
      case 'CIERRE_SESION':
        return {
          label: 'Cierre de Sesión',
          icon: LogOut,
          className: 'bg-slate-100 text-slate-500 border-slate-200',
        };
      default:
        return {
          label: action,
          icon: Info,
          className: 'bg-slate-50 text-slate-700 border-slate-200',
        };
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'RESIDENTE_OBRA':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'BODEGUERO':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'FISCALIZADOR':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-orange-100 text-orange-700 rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Pista de Auditoría & Trazabilidad
              </h1>
              <p className="text-sm text-slate-500">
                Registro inmutable de acciones: quién, qué, cuándo y en qué obra vial ocurrió cada operación.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Auditoría Activa (Tiempo Real)</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Total Eventos</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
          <span className="text-[10px] text-slate-400">Registrados en bitácora</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-emerald-600">Bodega & Materiales</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{stats.bodega}</p>
          <span className="text-[10px] text-slate-400">Ingresos, compras y egresos</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-blue-600">Reportes Diarios</p>
          <p className="text-2xl font-black text-blue-700 mt-1">{stats.reportes}</p>
          <span className="text-[10px] text-slate-400">Planillas de avance diario</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-purple-600">Reajustes Contractuales</p>
          <p className="text-2xl font-black text-purple-700 mt-1">{stats.contratos}</p>
          <span className="text-[10px] text-slate-400">Contratos compl. y rubros</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs col-span-2 md:col-span-1">
          <p className="text-xs font-semibold text-orange-600">Usuarios & Roles</p>
          <p className="text-2xl font-black text-orange-700 mt-1">{stats.usuarios}</p>
          <span className="text-[10px] text-slate-400">Permisos granulares</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por usuario, correo, descripción de acción, factura o frente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800"
          />
        </div>

        {/* Project Selector */}
        <div className="w-full md:w-64">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          >
            <option value="ALL">🏢 Todas las Obras (Filtro Global)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                📍 [{p.code}] {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Action Category Selector */}
        <div className="w-full md:w-56">
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          >
            <option value="ALL">⚡ Todas las Acciones</option>
            <option value="BODEGA">📦 Bodega (Ingresos y Despachos)</option>
            <option value="REPORTES">📋 Reportes Diarios de Obra</option>
            <option value="CONTRATO">⚖️ Reajustes y Obras</option>
            <option value="USUARIOS">👥 Gestión de Usuarios y Roles</option>
            <option value="SESIONES">🔑 Sesiones (Logins)</option>
          </select>
        </div>

        {(searchTerm || selectedProject !== 'ALL' || selectedAction !== 'ALL') && (
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedProject('ALL');
              setSelectedAction('ALL');
            }}
            className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1.5 whitespace-nowrap"
          >
            Limpiar Filtros
          </button>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 text-sm">Cronología de Actividades Auditadas</h3>
            <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full border border-slate-200">
              {filteredLogs.length} registro(s)
            </span>
          </div>
          <span className="text-xs text-slate-400">Ordenado del más reciente al más antiguo</span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <Info className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-700">No se encontraron registros de auditoría</h4>
            <p className="text-xs text-slate-400 mt-1">
              Prueba modificando los criterios de búsqueda o seleccionando otra obra vial.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10.5px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Operación</th>
                  <th className="py-3 px-4">Obra / Ámbito</th>
                  <th className="py-3 px-4">Detalle de la Acción</th>
                  <th className="py-3 px-4">Usuario Responsable</th>
                  <th className="py-3 px-4 text-center">Técnico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filteredLogs.map((log) => {
                  const badge = getActionBadge(log.action);
                  const Icon = badge.icon;
                  const dateObj = new Date(log.createdAt);

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Date & Time */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-800">
                          {dateObj.toLocaleDateString('es-EC', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {dateObj.toLocaleTimeString('es-EC', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badge.className}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {badge.label}
                        </span>
                      </td>

                      {/* Obra */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.project ? (
                          <div>
                            <span className="font-mono font-bold text-[11px] text-orange-950 bg-orange-100/70 px-2 py-0.5 rounded border border-orange-200">
                              {log.project.code}
                            </span>
                            <p className="text-[10.5px] text-slate-500 mt-0.5 max-w-[150px] truncate" title={log.project.name}>
                              {log.project.name}
                            </p>
                          </div>
                        ) : (
                          <span className="font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded text-[10.5px] border border-slate-200">
                            🏢 Global Empresa
                          </span>
                        )}
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 min-w-[280px]">
                        <p className="text-slate-800 text-xs leading-relaxed font-medium">
                          {log.description}
                        </p>
                      </td>

                      {/* User Responsable */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs uppercase">
                            {log.userName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800">{log.userName}</span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getRoleBadge(
                                  log.userRole
                                )}`}
                              >
                                {log.userRole}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400">{log.userEmail}</p>
                          </div>
                        </div>
                      </td>

                      {/* Technical payload button */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {log.metadata ? (
                          <button
                            onClick={() => setActiveMetadataModal(log)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors border border-slate-200"
                            title="Ver detalles JSON técnicos"
                          >
                            <Code2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>Payload</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Metadata Inspector Modal */}
      {activeMetadataModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-orange-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Detalles Técnicos del Evento ({activeMetadataModal.action})
                </h3>
              </div>
              <button
                onClick={() => setActiveMetadataModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <p>
                  <strong className="text-slate-700">ID del Registro:</strong>{' '}
                  <span className="font-mono text-slate-600">{activeMetadataModal.id}</span>
                </p>
                <p>
                  <strong className="text-slate-700">Usuario:</strong>{' '}
                  <span className="text-slate-900 font-semibold">{activeMetadataModal.userName}</span>{' '}
                  ({activeMetadataModal.userEmail}) - Rol: {activeMetadataModal.userRole}
                </p>
                <p>
                  <strong className="text-slate-700">Fecha y Hora:</strong>{' '}
                  <span className="text-slate-600">
                    {new Date(activeMetadataModal.createdAt).toLocaleString('es-EC')}
                  </span>
                </p>
                <p>
                  <strong className="text-slate-700">Descripción:</strong>{' '}
                  <span className="text-slate-800">{activeMetadataModal.description}</span>
                </p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Metadatos Estructurados (JSON)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Solo lectura</span>
                </p>
                <pre className="bg-slate-900 text-emerald-400 p-3.5 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
                  {JSON.stringify(JSON.parse(activeMetadataModal.metadata || '{}'), null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setActiveMetadataModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Cerrar Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
