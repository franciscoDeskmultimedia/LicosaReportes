'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FolderGit2,
  PlusCircle,
  Layers,
  Calendar,
  Building2,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
  MoreVertical,
  Activity,
  HardHat,
  Pencil,
} from 'lucide-react';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { EditProjectModal } from '@/components/EditProjectModal';
import { updateProjectStatus } from '@/lib/actions/projects';

export interface ProjectItem {
  id: string;
  code: string;
  name: string;
  contractor: string;
  client: string;
  contractNumber: string;
  contractAmount: number;
  durationDays: number;
  startDate: Date | string;
  status: string;
  roadSection?: string;
  financingSource?: string;
  inspectionCompany?: string;
  rubros: Array<{ id: string; rubroNumber: number; description: string; currentQuantity: number; unitPrice: number; isPrincipal: boolean }>;
  dailyReports: Array<{ id: string; reportNumber: number; progressPercentAccum: number; totalExecutedAccum: number; elapsedDays: number; date: Date | string }>;
}

export function ProjectsListView({ projects }: { projects: ProjectItem[] }) {
  const router = useRouter();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const activeCount = projects.filter((p) => p.status === 'EN_EJECUCION').length;
  const inactiveCount = projects.length - activeCount;

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const isActive = p.status === 'EN_EJECUCION';
      if (filterStatus === 'ACTIVE' && !isActive) return false;
      if (filterStatus === 'INACTIVE' && isActive) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.client.toLowerCase().includes(q) ||
          p.contractor.toLowerCase().includes(q) ||
          (p.roadSection || '').toLowerCase().includes(q) ||
          p.contractNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [projects, filterStatus, searchQuery]);

  async function handleStatusToggle(projectId: string, currentStatus: string) {
    const nextStatus = currentStatus === 'EN_EJECUCION' ? 'SUSPENDIDO' : 'EN_EJECUCION';
    const confirmMsg =
      currentStatus === 'EN_EJECUCION'
        ? '¿Deseas marcar este proyecto como SUSPENDIDO / INACTIVO?'
        : '¿Deseas reactivar este proyecto a EN EJECUCIÓN?';

    if (!confirm(confirmMsg)) return;

    try {
      setUpdatingId(projectId);
      await updateProjectStatus(projectId, nextStatus);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar estado');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <FolderGit2 className="w-4 h-4 text-orange-600" />
            <span>Administración Contractual & Obras</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900">
            Proyectos de Infraestructura Vial
          </h1>
          <p className="text-xs text-slate-500">
            Gestión centralizada de contratos, planillaje de avance y seguimiento de obras
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/api/plantilla-excel"
            download="Plantilla_Carga_Licosa.xlsx"
            className="inline-flex items-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer border border-slate-700 hover:border-slate-600"
            title="Descargar formato Excel para carga masiva de proyectos, rubros y reportes diarios"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Plantilla Excel de Carga</span>
          </a>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Registrar Nuevo Proyecto</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterStatus === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Todos los Proyectos</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-200 text-slate-700">
                {projects.length}
              </span>
            </button>
            <button
              onClick={() => setFilterStatus('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterStatus === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Activos</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                  filterStatus === 'ACTIVE'
                    ? 'bg-emerald-700 text-emerald-100'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {activeCount}
              </span>
            </button>
            <button
              onClick={() => setFilterStatus('INACTIVE')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterStatus === 'INACTIVE'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              <span>Inactivos / Suspendidos</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                  filterStatus === 'INACTIVE'
                    ? 'bg-amber-700 text-amber-100'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {inactiveCount}
              </span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por código, nombre o contratante..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <FolderGit2 className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">No se encontraron proyectos con ese filtro</h3>
          <p className="text-xs text-slate-500">
            Intente cambiando los términos de búsqueda o el filtro de estado.
          </p>
          <button
            onClick={() => {
              setFilterStatus('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            Limpiar Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProjects.map((proj) => {
            const lastReport = proj.dailyReports[0];
            const progress = lastReport?.progressPercentAccum || 0;
            const totalExecuted = lastReport?.totalExecutedAccum || 0;
            const elapsedDays =
              lastReport?.elapsedDays ??
              Math.max(0, Math.floor((new Date().getTime() - new Date(proj.startDate).getTime()) / 86400000));
            const timePct = proj.durationDays > 0 ? (elapsedDays / proj.durationDays) * 100 : 0;
            const isActive = proj.status === 'EN_EJECUCION';

            return (
              <div
                key={proj.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  {/* Top line: Code, Status & Quick Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg border border-slate-300">
                        {proj.code}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {isActive ? '● En Ejecución' : '⏸ Suspendido'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleStatusToggle(proj.id, proj.status)}
                      disabled={updatingId === proj.id}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline decoration-slate-300 transition-colors"
                      title="Cambiar estado del proyecto"
                    >
                      {updatingId === proj.id
                        ? 'Actualizando...'
                        : isActive
                        ? 'Pausar Obra'
                        : 'Reactivar Obra'}
                    </button>
                  </div>

                  {/* Project Title & Section */}
                  <div>
                    <h2 className="text-base font-bold text-slate-900 line-clamp-2 leading-snug">
                      {proj.name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Contrato N° <strong>{proj.contractNumber}</strong> • {proj.roadSection || 'Tramo Principal'}
                    </p>
                  </div>

                  {/* Contract Details Table Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs py-3 border-y border-slate-100 text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Contratante:</span>
                      <span className="font-semibold text-slate-800 line-clamp-1">{proj.client}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Contratista:</span>
                      <span className="font-semibold text-slate-800 line-clamp-1">{proj.contractor}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Presupuesto Total:</span>
                      <span className="font-mono font-bold text-slate-900">
                        ${proj.contractAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Plazo de Obra:</span>
                      <span className="font-semibold text-slate-800">
                        {proj.durationDays} días ({elapsedDays} d transcurridos)
                      </span>
                    </div>
                  </div>

                  {/* Progress Indicators: Avance Físico & Consumo de Plazo */}
                  <div className="space-y-3 pt-1">
                    {/* Avance Físico-Financiero */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Avance Físico-Financiero:</span>
                        </span>
                        <span className="font-mono font-bold text-emerald-600 text-xs sm:text-sm">
                          {progress.toFixed(2)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10.5px] text-slate-400">
                        <span>${totalExecuted.toLocaleString('es-EC', { minimumFractionDigits: 2 })} ejecutados</span>
                        <span>{proj.rubros.length} rubros contractuales</span>
                      </div>
                    </div>

                    {/* Consumo de Plazo Contractual */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                          <Clock className={`w-3.5 h-3.5 ${timePct >= 90 ? 'text-amber-600' : 'text-blue-600'}`} />
                          <span>Consumo de Plazo Contractual:</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          {timePct >= 90 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                              {timePct > 100 ? 'Excedido' : 'Por vencer'}
                            </span>
                          )}
                          <span
                            className={`font-mono font-bold text-xs sm:text-sm ${
                              timePct > 100
                                ? 'text-rose-600'
                                : timePct >= 90
                                ? 'text-amber-600'
                                : 'text-blue-600'
                            }`}
                          >
                            {timePct.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            timePct > 100
                              ? 'bg-rose-500'
                              : timePct >= 90
                              ? 'bg-amber-500'
                              : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, timePct))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10.5px] text-slate-400">
                        <span>{elapsedDays} de {proj.durationDays} días consumidos</span>
                        <span>
                          {proj.durationDays - elapsedDays > 0 ? (
                            `${proj.durationDays - elapsedDays} días restantes`
                          ) : proj.durationDays - elapsedDays === 0 ? (
                            <span className="text-amber-600 font-bold">Plazo cumplido</span>
                          ) : (
                            <span className="text-rose-600 font-bold">Excedido por {Math.abs(proj.durationDays - elapsedDays)} d</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/reportes/nuevo?projectId=${proj.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-50 hover:bg-orange-100 text-orange-700 transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+ Reporte Diario</span>
                    </Link>

                    <Link
                      href={`/proyectos/${proj.id}?tab=reportes`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                      <span>Reportes</span>
                    </Link>

                    <button
                      onClick={() => setEditingProject(proj)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="Editar datos del proyecto, plazos contractuales y montos"
                    >
                      <Pencil className="w-3.5 h-3.5 text-orange-600" />
                      <span>Editar</span>
                    </button>
                  </div>

                  <Link
                    href={`/proyectos/${proj.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xs"
                  >
                    <span>Entrar a la Obra</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Creating New Project */}
      <CreateProjectModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      {/* Modal for Editing Project */}
      {editingProject && (
        <EditProjectModal
          project={editingProject}
          isOpen={!!editingProject}
          onClose={() => setEditingProject(null)}
        />
      )}
    </div>
  );
}
