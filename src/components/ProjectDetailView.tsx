'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FolderGit2,
  PlusCircle,
  FilePlus,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Layers,
  History,
  FileCheck2,
  Calendar,
  Building2,
  ArrowLeft,
  Users,
  UserPlus,
  UserCheck,
  Briefcase,
  Trash2,
  Phone,
  Mail,
  HardHat,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Printer,
  ChevronRight,
  CloudSun,
  Truck,
  Clock,
  Sparkles,
  ExternalLink,
  Pencil,
  X,
} from 'lucide-react';
import { AdjustRubroModal } from '@/components/AdjustRubroModal';
import { AddRubroModal } from '@/components/AddRubroModal';
import { BulkRubroImportModal } from '@/components/BulkRubroImportModal';
import { AssignWorkerToProjectModal } from '@/components/AssignWorkerToProjectModal';
import { AssignContractorToProjectModal } from '@/components/AssignContractorToProjectModal';
import { EditWorkerModal } from '@/components/EditWorkerModal';
import { EditContractorModal } from '@/components/EditContractorModal';
import { EditProjectModal } from '@/components/EditProjectModal';
import { OfficialReportDocument } from '@/components/OfficialReportDocument';
import { DailyReportHtmlDashboard } from '@/components/DailyReportHtmlDashboard';
import { removeWorkerFromProject } from '@/lib/actions/workers';
import { removeContractorFromProject } from '@/lib/actions/contractors';

interface RubroAdjustment {
  id: string;
  type: string;
  quantityChange: number;
  newUnitPrice: number | null;
  reason: string;
  documentRef: string | null;
  date: Date | string;
  approvedBy: string;
}

interface ProjectRubro {
  id: string;
  rubroNumber: number;
  description: string;
  unit: string;
  unitPrice: number;
  initialQuantity: number;
  currentQuantity: number;
  isPrincipal: boolean;
  adjustments: RubroAdjustment[];
}

interface WorkerAssignment {
  id: string;
  assignedRole: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  status: string;
  notes?: string | null;
  worker: {
    id: string;
    identification: string;
    name: string;
    roleCategory: string;
    phone?: string | null;
    email?: string | null;
    active: boolean;
  };
}

interface ProjectContractor {
  id: string;
  assignedAt: Date | string;
  contractAmount?: number | null;
  notes?: string | null;
  roleInProject: string;
  contractor: {
    id: string;
    name: string;
    ruc: string;
    specialty: string;
    contactPerson?: string | null;
    phone?: string | null;
    email?: string | null;
  };
}

interface DailyReportData {
  id: string;
  reportNumber: number;
  date: Date | string;
  roadSection: string;
  elapsedDays: number;
  totalDays: number;
  totalExecutedDay: number;
  totalExecutedAccum: number;
  progressPercentAccum: number;
  rainHoursDay?: number;
  lostRainHoursDay?: number;
  activitiesTodayVial?: string | null;
  activitiesTodayPavimento?: string | null;
  activitiesTodayDrenaje?: string | null;
  activitiesTodayTopografia?: string | null;
  noveltiesRisks?: string | null;
  preparedByName?: string;
  reviewedByName?: string;
  rubroExecutions?: Array<{
    id: string;
    dayQuantity: number;
    dayAmount: number;
    accumAmount?: number;
    projectRubro: {
      rubroNumber: number;
      description: string;
      unit: string;
    };
  }>;
  personnelLogs?: Array<{
    id: string;
    categoryRole: string;
    count: number;
  }>;
  machineryLogs?: Array<{
    id: string;
    machinery: {
      code: string;
      name: string;
      category: string;
    };
  }>;
}

interface ProjectData {
  id: string;
  code: string;
  name: string;
  contractor: string;
  client: string;
  inspectionCompany: string;
  executingCompany: string;
  contractNumber: string;
  financingSource: string;
  roadSection: string;
  contractAmount: number;
  durationDays: number;
  startDate: Date | string;
  status?: string;
  rubros: ProjectRubro[];
  dailyReports?: DailyReportData[];
  workerAssignments?: WorkerAssignment[];
  contractors?: ProjectContractor[];
}

export function ProjectDetailView({
  project,
  progressData,
  latestReportFull,
  initialTab,
  allWorkers = [],
  allContractors = [],
  currentUser,
}: {
  project: ProjectData;
  progressData?: any;
  latestReportFull?: any;
  initialTab?: string;
  allWorkers?: any[];
  allContractors?: any[];
  currentUser?: any;
}) {
  const router = useRouter();

  // Validate initialTab
  const validTabs = ['resumen', 'reportes', 'rubros', 'personal', 'contratistas', 'modificaciones'];
  const startingTab = initialTab && validTabs.includes(initialTab) ? (initialTab as any) : 'resumen';

  const [activeTab, setActiveTab] = useState<
    'resumen' | 'reportes' | 'rubros' | 'personal' | 'contratistas' | 'modificaciones'
  >(startingTab);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'principal' | 'non-principal'>('all');
  const [reportSearch, setReportSearch] = useState('');

  // Resumen de Avance por Rubros state
  const [rubroSummarySearch, setRubroSummarySearch] = useState('');
  const [rubroSummaryFilter, setRubroSummaryFilter] = useState<'all' | 'principal' | 'in_progress' | 'completed'>('all');
  const [viewOfficialA4Format, setViewOfficialA4Format] = useState(false);

  // Tab Reportes: State for viewing any daily report in HTML or PDF
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportViewMode, setReportViewMode] = useState<'html' | 'pdf'>('html');

  // Modals
  const [addRubroOpen, setAddRubroOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [selectedRubroForAdjust, setSelectedRubroForAdjust] = useState<ProjectRubro | null>(null);
  const [assignWorkerOpen, setAssignWorkerOpen] = useState(false);
  const [assignContractorOpen, setAssignContractorOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<any>(null);
  const [editingContractor, setEditingContractor] = useState<any>(null);
  const [editProjectOpen, setEditProjectOpen] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Latest Daily Report
  const allDailyReports = project.dailyReports || [];
  const latestReport = allDailyReports[0];

  // Active Report for the inline viewer in Tab "Reportes"
  const activeViewerReport = useMemo(() => {
    if (!selectedReportId) return null;
    const rep = allDailyReports.find((r) => r.id === selectedReportId) as any;
    if (!rep) return null;
    return rep.project ? rep : { ...rep, project };
  }, [selectedReportId, allDailyReports, project]);

  // Calculated Progress metrics
  const totalContractBudget = project.rubros.reduce(
    (acc, r) => acc + r.currentQuantity * r.unitPrice,
    project.contractAmount || 0
  );
  const totalExecutedAccum = latestReport?.totalExecutedAccum || progressData?.summary?.totalExecutedAccum || 0;
  const progressPercent =
    totalContractBudget > 0 ? (totalExecutedAccum / totalContractBudget) * 100 : 0;
  const remainingBudget = Math.max(0, totalContractBudget - totalExecutedAccum);

  const elapsedDays = latestReport?.elapsedDays || progressData?.summary?.elapsedDays || 0;
  const timePercent = project.durationDays > 0 ? (elapsedDays / project.durationDays) * 100 : 0;
  const spi = timePercent > 0 ? progressPercent / timePercent : 1;
  const isHealthy = spi >= 0.9;

  // Rubros progress list with safe fallback
  const rubrosProgressList = useMemo(() => {
    if (progressData?.rubros && progressData.rubros.length > 0) {
      return progressData.rubros;
    }
    return project.rubros.map((r) => {
      const accumQty = (allDailyReports || []).reduce((acc: number, rep: any) => {
        const match = rep.rubroExecutions?.find(
          (re: any) => re.projectRubro?.rubroNumber === r.rubroNumber || re.projectRubroId === r.id
        );
        return acc + (match?.dayQuantity || 0);
      }, 0);
      const currentQty = r.currentQuantity || r.initialQuantity || 0;
      const unitPrice = r.unitPrice || 0;
      const contractTotalAmount = currentQty * unitPrice;
      const accumAmount = accumQty * unitPrice;
      const remainingQuantity = Math.max(0, currentQty - accumQty);
      const remainingAmount = remainingQuantity * unitPrice;
      const pct = currentQty > 0 ? (accumQty / currentQty) * 100 : 0;
      let status = 'SIN_INICIAR';
      if (pct >= 100) status = 'COMPLETADO';
      else if (accumQty > 0) status = 'EN_EJECUCION';

      return {
        id: r.id,
        rubroNumber: r.rubroNumber,
        description: r.description,
        unit: r.unit,
        unitPrice,
        initialQuantity: r.initialQuantity,
        currentQuantity: currentQty,
        contractTotalAmount,
        accumQuantity: accumQty,
        accumAmount,
        remainingQuantity,
        remainingAmount,
        progressPercent: pct,
        status,
        isPrincipal: r.isPrincipal,
        adjustmentsCount: r.adjustments?.length || 0,
      };
    });
  }, [progressData, project.rubros, allDailyReports]);

  // Filtered rubros summary
  const filteredRubrosSummary = useMemo(() => {
    return rubrosProgressList.filter((r: any) => {
      const q = rubroSummarySearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        r.description.toLowerCase().includes(q) ||
        r.rubroNumber.toString().includes(q) ||
        r.unit.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (rubroSummaryFilter === 'principal') return r.isPrincipal;
      if (rubroSummaryFilter === 'in_progress') return r.accumQuantity > 0 && r.accumQuantity < r.currentQuantity;
      if (rubroSummaryFilter === 'completed') return r.accumQuantity >= r.currentQuantity && r.currentQuantity > 0;
      return true;
    });
  }, [rubrosProgressList, rubroSummarySearch, rubroSummaryFilter]);

  const filteredRubros = project.rubros.filter((r) => {
    const matchesSearch =
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      r.rubroNumber.toString().includes(search);
    if (filterType === 'principal') return matchesSearch && r.isPrincipal;
    if (filterType === 'non-principal') return matchesSearch && !r.isPrincipal;
    return matchesSearch;
  });

  const filteredReports = allDailyReports.filter((rep) => {
    if (!reportSearch.trim()) return true;
    const q = reportSearch.toLowerCase();
    const matchesNum = rep.reportNumber.toString().includes(q);
    const matchesDate = new Date(rep.date).toLocaleDateString('es-EC').includes(q);
    const matchesSection = (rep.roadSection || '').toLowerCase().includes(q);
    return matchesNum || matchesDate || matchesSection;
  });

  const allAdjustments = project.rubros
    .flatMap((r) =>
      r.adjustments.map((a) => ({
        ...a,
        rubroNumber: r.rubroNumber,
        rubroDescription: r.description,
        unit: r.unit,
      }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const activeWorkers = project.workerAssignments || [];
  const activeContractors = project.contractors || [];

  async function handleRemoveWorker(assignmentId: string, workerName: string) {
    if (!confirm(`¿Confirmas que deseas desvincular a ${workerName} de esta obra?`)) return;
    try {
      setDeletingId(assignmentId);
      await removeWorkerFromProject(assignmentId);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al desvincular personal');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRemoveContractor(assignmentId: string, contractorName: string) {
    if (!confirm(`¿Confirmas que deseas desvincular al contratista "${contractorName}" de esta obra?`)) return;
    try {
      setDeletingId(assignmentId);
      await removeContractorFromProject(assignmentId, project.id);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al desvincular contratista');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Top Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <Link
          href="/proyectos"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Catálogo de Proyectos</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {/* Prominent Direct Action: Create Daily Report */}
          <Link
            href={`/reportes/nuevo?projectId=${project.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Crear Reporte Diario</span>
          </Link>

          <Link
            href={`/bodega?projectId=${project.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-300"
          >
            <span>Bodega de Obra</span>
          </Link>

          {/* Quick Action: Assign Staff */}
          <button
            onClick={() => setAssignWorkerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-300 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-emerald-600" />
            <span>+ Personal</span>
          </button>

          {/* Quick Action: Assign Contractor */}
          <button
            onClick={() => setAssignContractorOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-300 cursor-pointer"
          >
            <Briefcase className="w-4 h-4 text-indigo-600" />
            <span>+ Contratista</span>
          </button>

          {/* Quick Action: Editar Proyecto */}
          <button
            onClick={() => setEditProjectOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
            title="Editar plazos, fechas, montos y datos generales de la obra"
          >
            <Pencil className="w-3.5 h-3.5 text-orange-400" />
            <span>Editar Proyecto</span>
          </button>
        </div>
      </div>

      {/* Contract Executive Profile Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-black px-2.5 py-0.5 bg-orange-50 text-orange-700 rounded border border-orange-200">
                {project.code}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {project.status === 'EN_EJECUCION' ? '● En Ejecución' : '⏸ Suspendido'}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Contrato: <strong>{project.contractNumber}</strong>
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
              {project.name}
            </h1>
            <p className="text-xs text-slate-500">
              Tramo: <strong className="text-slate-700">{project.roadSection || 'Vial'}</strong> • Frente Ejecutor: <strong className="text-slate-700">{project.executingCompany || 'LICOSA'}</strong>
            </p>
          </div>

          <div className="text-right flex-shrink-0">
            <span className="text-xs text-slate-400 block font-medium">Monto Contractual Vigente</span>
            <span className="text-2xl md:text-3xl font-black text-slate-900">
              ${totalContractBudget.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-emerald-600 font-bold block mt-0.5">
              ${totalExecutedAccum.toLocaleString('es-EC', { minimumFractionDigits: 2 })} ejecutados ({progressPercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-600">
          <div>
            <span className="text-slate-400 block font-medium">Contratista Principal</span>
            <span className="font-semibold text-slate-800">{project.contractor}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Contratante</span>
            <span className="font-semibold text-slate-800">{project.client}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Fiscalización</span>
            <span className="font-semibold text-slate-800">{project.inspectionCompany}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Financiamiento</span>
            <span className="font-semibold text-blue-700">{project.financingSource}</span>
          </div>
        </div>
      </div>

      {/* Internal Navigation Menu / Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('resumen')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'resumen'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-orange-400" />
          <span>Resumen de Avance</span>
        </button>

        <button
          onClick={() => setActiveTab('reportes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'reportes'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Reportes Diarios ({allDailyReports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rubros')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'rubros'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Rubros Contractuales ({project.rubros.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('personal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'personal'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Personal & Cuadrillas ({activeWorkers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('contratistas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'contratistas'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Contratistas ({activeContractors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('modificaciones')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'modificaciones'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Modificaciones ({allAdjustments.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: RESUMEN DE AVANCE & ÚLTIMO REPORTE DIARIO                          */}
      {/* ========================================================================= */}
      {activeTab === 'resumen' && (
        <div className="space-y-6">
          {/* Executive Row: 1. Resumen de Avance del Proyecto | 2. Último Reporte Diario */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Panel Izquierdo: Resumen de Avance del Proyecto (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-base font-black text-slate-900">
                    Resumen de Avance del Proyecto
                  </h2>
                </div>
                <Link
                  href={`/avance?projectId=${project.id}`}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  <span>Ver Curvas & Métricas</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* 4 KPIs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Monto Contrato</span>
                  <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                    ${totalContractBudget.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80">
                  <span className="text-[10px] text-emerald-800 font-semibold uppercase block">Planillaje Acum.</span>
                  <span className="font-mono font-bold text-emerald-700 text-xs sm:text-sm">
                    ${totalExecutedAccum.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Saldo por Ejecutar</span>
                  <span className="font-mono font-bold text-slate-700 text-xs sm:text-sm">
                    ${remainingBudget.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80">
                  <span className="text-[10px] text-blue-800 font-semibold uppercase block">Plazo Transcurrido</span>
                  <span className="font-semibold text-blue-900 text-xs sm:text-sm">
                    {elapsedDays} / {project.durationDays} d ({timePercent.toFixed(0)}%)
                  </span>
                </div>
              </div>

              {/* Progress Bars */}
              <div className="space-y-4 pt-1">
                {/* Physical-Financial progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-slate-600 font-semibold">
                      Avance Físico-Financiero Acumulado
                    </span>
                    <span className="font-mono font-black text-emerald-600 text-base">
                      {progressPercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                    />
                  </div>
                </div>

                {/* Time consumption */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-slate-600 font-semibold">
                      Consumo de Plazo Contractual
                    </span>
                    <span className="font-mono font-bold text-blue-700">
                      {timePercent.toFixed(1)}% ({elapsedDays} de {project.durationDays} días)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, Math.max(0, timePercent))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Performance Indicator Banner */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {isHealthy ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-slate-800">
                      {isHealthy ? 'Obra en Plazo y Cronograma Normal' : 'Ritmo de Obra con Desfase Temporal'}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Índice de Desempeño SPI: <strong>{spi.toFixed(2)}</strong> (Avance planillado vs Tiempo consumido)
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('rubros')}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-bold text-[11px] transition-all cursor-pointer whitespace-nowrap"
                >
                  Ver Rubros →
                </button>
              </div>
            </div>

            {/* Panel Derecho: Último Reporte Diario (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-orange-600" />
                    <h2 className="text-base font-black text-slate-900">
                      Último Reporte Diario
                    </h2>
                  </div>
                  {latestReport && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">
                      N° {latestReport.reportNumber}
                    </span>
                  )}
                </div>

                {latestReport ? (
                  <div className="space-y-3.5 text-xs">
                    {/* Date and Section Banner */}
                    <div className="p-3 bg-orange-50/70 border border-orange-200/80 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-orange-800 font-bold uppercase tracking-wider block">
                          Fecha de Emisión
                        </span>
                        <span className="font-black text-slate-900 text-sm">
                          {new Date(latestReport.date).toLocaleDateString('es-EC', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Día de Obra</span>
                        <span className="font-bold text-slate-800">Día {latestReport.elapsedDays}</span>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-semibold block">Facturación Jornada</span>
                        <span className="font-mono font-bold text-orange-600 text-sm">
                          ${latestReport.totalExecutedDay.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-semibold block">Condición Climatológica</span>
                        <div className="flex items-center gap-1 font-semibold text-slate-700 text-xs mt-0.5">
                          <CloudSun className="w-3.5 h-3.5 text-amber-500" />
                          <span>
                            {latestReport.lostRainHoursDay
                              ? `${latestReport.lostRainHoursDay}h perdidas lluvia`
                              : 'Jornada Laborable'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Activities summary */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                        Frentes & Actividades Reportadas
                      </span>
                      <p className="text-slate-700 line-clamp-3 leading-relaxed">
                        {latestReport.activitiesTodayVial ||
                          latestReport.activitiesTodayPavimento ||
                          latestReport.activitiesTodayDrenaje ||
                          'Trabajos de replanteo, movimiento de tierras y conformación de calzada.'}
                      </p>
                    </div>

                    {/* Novelties */}
                    {latestReport.noveltiesRisks && (
                      <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200/80 text-amber-900 text-[11.5px] line-clamp-2">
                        <strong>Novedad:</strong> {latestReport.noveltiesRisks}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-300 space-y-3">
                    <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto" />
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">Sin reportes diarios registrados</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Esta obra aún no tiene reportes diarios emitidos.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                {latestReport ? (
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/reportes/${latestReport.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Ver Informe Oficial</span>
                    </Link>
                    <Link
                      href={`/reportes/${latestReport.id}/imprimir`}
                      target="_blank"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir</span>
                    </Link>
                  </div>
                ) : null}

                <Link
                  href={`/reportes/nuevo?projectId=${project.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Nuevo Reporte</span>
                </Link>
              </div>
            </div>
          </div>

          {/* RESUMEN DE AVANCE POR RUBROS (CON BUSCADOR Y FILTROS) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                      <Layers className="w-5 h-5" />
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      Resumen de Avance Físico por Rubros
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200/80 text-slate-700">
                      {filteredRubrosSummary.length} de {rubrosProgressList.length} rubros
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Control cuantitativo acumulado, saldos restantes y porcentaje de avance por cada rubro contractual.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('rubros')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
                  >
                    <span>Administrar Rubros</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Rubros</p>
                  <p className="text-lg font-extrabold text-slate-800 font-mono mt-0.5">
                    {rubrosProgressList.length}
                  </p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">En Ejecución</p>
                  <p className="text-lg font-extrabold text-blue-600 font-mono mt-0.5">
                    {rubrosProgressList.filter((r: any) => r.accumQuantity > 0 && r.accumQuantity < r.currentQuantity).length}
                  </p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Completados</p>
                  <p className="text-lg font-extrabold text-emerald-600 font-mono mt-0.5">
                    {rubrosProgressList.filter((r: any) => r.accumQuantity >= r.currentQuantity && r.currentQuantity > 0).length}
                  </p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-[11px] font-bold text-orange-600 uppercase tracking-wider">Planillado Total</p>
                  <p className="text-lg font-extrabold text-slate-900 font-mono mt-0.5">
                    ${rubrosProgressList.reduce((acc: number, r: any) => acc + (r.accumAmount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="mt-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={rubroSummarySearch}
                    onChange={(e) => setRubroSummarySearch(e.target.value)}
                    placeholder="Buscar rubro por código, descripción o unidad..."
                    className="w-full pl-10 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                  {rubroSummarySearch && (
                    <button
                      onClick={() => setRubroSummarySearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Limpiar búsqueda"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setRubroSummaryFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
                      rubroSummaryFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Todos ({rubrosProgressList.length})
                  </button>
                  <button
                    onClick={() => setRubroSummaryFilter('principal')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
                      rubroSummaryFilter === 'principal'
                        ? 'bg-orange-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Principales ({rubrosProgressList.filter((r: any) => r.isPrincipal).length})
                  </button>
                  <button
                    onClick={() => setRubroSummaryFilter('in_progress')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
                      rubroSummaryFilter === 'in_progress'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    En Ejecución ({rubrosProgressList.filter((r: any) => r.accumQuantity > 0 && r.accumQuantity < r.currentQuantity).length})
                  </button>
                  <button
                    onClick={() => setRubroSummaryFilter('completed')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
                      rubroSummaryFilter === 'completed'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Completados ({rubrosProgressList.filter((r: any) => r.accumQuantity >= r.currentQuantity && r.currentQuantity > 0).length})
                  </button>
                </div>
              </div>
            </div>

            {/* Rubros Progress Table */}
            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              {filteredRubrosSummary.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                    <Search className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">No se encontraron rubros</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {rubroSummarySearch
                      ? `No hay rubros que coincidan con "${rubroSummarySearch}". Intenta con otro término o limpia los filtros.`
                      : 'No hay rubros que coincidan con el filtro seleccionado.'}
                  </p>
                  {(rubroSummarySearch || rubroSummaryFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setRubroSummarySearch('');
                        setRubroSummaryFilter('all');
                      }}
                      className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Restablecer filtros
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-xs z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] w-14 text-center">
                        N°
                      </th>
                      <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] min-w-[220px]">
                        Descripción del Rubro
                      </th>
                      <th className="py-2.5 px-2 font-bold text-slate-600 uppercase text-[10px] text-center w-14">
                        Unidad
                      </th>
                      <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] text-right">
                        P. Unitario
                      </th>
                      <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] text-right">
                        Cant. Contrato
                      </th>
                      <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] text-right bg-orange-50/50">
                        Cant. Acumulada
                      </th>
                      <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] text-right">
                        Saldo Cantidad
                      </th>
                      <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] text-right">
                        Monto Planillado
                      </th>
                      <th className="py-2.5 px-4 font-bold text-slate-600 uppercase text-[10px] min-w-[170px]">
                        % Avance Físico
                      </th>
                      <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] text-center w-24">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRubrosSummary.map((rubro: any) => {
                      const pct = Math.min(100, Math.max(0, rubro.progressPercent || 0));
                      const isComplete = pct >= 100;
                      const isOver = (rubro.accumQuantity || 0) > (rubro.currentQuantity || 0);
                      const inProgress = (rubro.accumQuantity || 0) > 0 && !isComplete;

                      let statusBadge = (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                          Sin Iniciar
                        </span>
                      );
                      if (isOver) {
                        statusBadge = (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                            Superado
                          </span>
                        );
                      } else if (isComplete) {
                        statusBadge = (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                            Completado
                          </span>
                        );
                      } else if (inProgress) {
                        statusBadge = (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                            En Ejecución
                          </span>
                        );
                      }

                      return (
                        <tr
                          key={rubro.id}
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              {rubro.rubroNumber}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">
                                {rubro.description}
                              </span>
                              {rubro.isPrincipal && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded-sm text-[9px] font-extrabold uppercase bg-orange-100 text-orange-700 flex-shrink-0">
                                  Principal
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="inline-block px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600 font-mono text-[11px]">
                              {rubro.unit}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            ${rubro.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                            {rubro.currentQuantity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-orange-600 bg-orange-50/30">
                            {(rubro.accumQuantity || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            {Math.max(0, (rubro.remainingQuantity ?? (rubro.currentQuantity - (rubro.accumQuantity || 0)))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            ${(rubro.accumAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="w-full">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[11px] font-mono font-bold text-slate-700">
                                  {(rubro.progressPercent || 0).toFixed(1)}%
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {(rubro.accumQuantity || 0).toFixed(1)} / {rubro.currentQuantity.toFixed(1)}
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isComplete
                                      ? 'bg-emerald-500'
                                      : isOver
                                      ? 'bg-purple-600'
                                      : inProgress
                                      ? 'bg-blue-600'
                                      : 'bg-slate-300'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {statusBadge}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            
            {/* Table Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
              <span>
                Mostrando <strong>{filteredRubrosSummary.length}</strong> de <strong>{rubrosProgressList.length}</strong> rubros contractuales
              </span>
              <span className="font-mono text-slate-600">
                Total acumulado en rubros: <strong>${rubrosProgressList.reduce((acc: number, r: any) => acc + (r.accumAmount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </span>
            </div>
          </div>

          {/* Quick Access to Daily Reports List */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  Bitácora de Reportes Diarios de esta Obra ({allDailyReports.length} informes)
                </h3>
                <p className="text-xs text-slate-400">
                  Accede al historial completo de planillaje diario, clima, cuadrillas de trabajo y maquinaria.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setActiveTab('reportes')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Ver Historial de Reportes
              </button>
              <Link
                href={`/reportes/nuevo?projectId=${project.id}`}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/30 transition-all"
              >
                + Emitir Reporte Diario
              </Link>
            </div>
          </div>

          {/* HTML Version of Latest Daily Report (Visual, Consumible y Fácil de Leer) */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-xs">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">
                      Último Reporte Diario Emitido (Versión HTML Visual)
                    </h3>
                    {latestReportFull && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                        N° {String(latestReportFull.reportNumber).padStart(3, '0')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Visualización interactiva, amigable y consumible con gráficos, indicadores visuales de avance, personal, maquinaria y clima
                  </p>
                </div>
              </div>

              {latestReportFull && (
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
                  <button
                    onClick={() => setViewOfficialA4Format(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      !viewOfficialA4Format
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Dashboard Visual
                  </button>
                  <button
                    onClick={() => setViewOfficialA4Format(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewOfficialA4Format
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Formato A4 Impreso
                  </button>
                </div>
              )}
            </div>

            {latestReportFull ? (
              viewOfficialA4Format ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-xs text-amber-800">
                    <span>Estás visualizando la réplica formal en papel A4 para firmas físicas.</span>
                    <button
                      onClick={() => setViewOfficialA4Format(false)}
                      className="font-bold underline text-amber-900 hover:text-amber-950 cursor-pointer"
                    >
                      Cambiar a Dashboard Visual
                    </button>
                  </div>
                  <div className="bg-slate-50/70 p-2 sm:p-6 rounded-2xl border border-slate-200 shadow-inner">
                    <OfficialReportDocument report={latestReportFull} embedded={true} />
                  </div>
                </div>
              ) : (
                <DailyReportHtmlDashboard
                  report={latestReportFull}
                  project={project}
                  onToggleOfficialView={() => setViewOfficialA4Format(true)}
                  showingOfficialView={false}
                />
              )
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
                <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">Sin reportes diarios registrados en esta obra</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Aún no se ha generado ningún reporte diario para esta obra. Cuando emitas el primer reporte, aquí se visualizará de forma automática la versión interactiva HTML y consumible.
                </p>
                <Link
                  href={`/reportes/nuevo?projectId=${project.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Emitir Primer Reporte Diario</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HISTORIAL DE REPORTES DIARIOS (MENU PROPIO DEL PROYECTO)           */}
      {/* ========================================================================= */}
      {activeTab === 'reportes' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
          {/* Header Bar */}
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-orange-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Reportes Diarios de Obra: [{project.code}]
                </h2>
                <p className="text-xs text-slate-500">
                  Bitácora oficial de avance diario, clima, personal y maquinaria de esta obra
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por N° reporte o fecha..."
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Direct Creation Button */}
              <Link
                href={`/reportes/nuevo?projectId=${project.id}`}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-600/20 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Crear Reporte Diario</span>
              </Link>
            </div>
          </div>

          {/* Selected Report Viewer (HTML Dashboard / Official A4) */}
          {activeViewerReport && (
            <div id="visor-reporte-seleccionado" className="border-b-2 border-orange-200 bg-slate-50/70 p-4 sm:p-6 space-y-4">
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex flex-col items-center justify-center font-bold flex-shrink-0 shadow-sm">
                    <span className="text-[9px] uppercase tracking-wider text-orange-200">REP</span>
                    <span className="text-sm font-black leading-none">#{activeViewerReport.reportNumber}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        Visualizando Reporte N° {String(activeViewerReport.reportNumber).padStart(3, '0')}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-orange-100 text-orange-800">
                        Día {activeViewerReport.elapsedDays} de {activeViewerReport.totalDays}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 capitalize">
                      {new Date(activeViewerReport.date).toLocaleDateString('es-EC', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Segmented view switcher */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                    <button
                      onClick={() => setReportViewMode('html')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        reportViewMode === 'html'
                          ? 'bg-white text-orange-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-orange-600" />
                      <span>Versión HTML Visual</span>
                    </button>
                    <button
                      onClick={() => setReportViewMode('pdf')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        reportViewMode === 'pdf'
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Versión PDF / A4 Oficial</span>
                    </button>
                  </div>

                  {/* Independent page */}
                  <Link
                    href={`/reportes/${activeViewerReport.id}?view=${reportViewMode}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors border border-slate-200"
                    title="Abrir reporte en nueva pestaña"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Página Completa</span>
                  </Link>

                  {/* Print */}
                  <Link
                    href={`/reportes/${activeViewerReport.id}/imprimir`}
                    target="_blank"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs transition-colors"
                    title="Imprimir formato reglamentario"
                  >
                    <Printer className="w-3.5 h-3.5 text-orange-400" />
                    <span className="hidden md:inline">Imprimir</span>
                  </Link>

                  {/* Close Viewer */}
                  <button
                    onClick={() => setSelectedReportId(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Cerrar visor"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Viewer Body */}
              {reportViewMode === 'html' ? (
                <div className="bg-slate-50/50 rounded-2xl border border-slate-200/80 p-1 sm:p-3">
                  <DailyReportHtmlDashboard
                    report={activeViewerReport}
                    project={project}
                    onToggleOfficialView={() => setReportViewMode('pdf')}
                    showingOfficialView={false}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-xl text-xs text-amber-900">
                    <span>Estás visualizando la réplica formal en papel A4 para firmas físicas.</span>
                    <button
                      onClick={() => setReportViewMode('html')}
                      className="font-bold underline text-amber-900 hover:text-amber-950 cursor-pointer"
                    >
                      Cambiar a Dashboard Visual
                    </button>
                  </div>
                  <div className="bg-white p-2 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <OfficialReportDocument report={activeViewerReport as any} embedded={true} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reports Table */}
          {filteredReports.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="font-bold text-slate-800 text-sm">
                No hay reportes diarios para mostrar
              </h3>
              <p className="text-xs text-slate-500">
                Emite el primer reporte diario para esta obra haciendo clic en el botón superior.
              </p>
              <Link
                href={`/reportes/nuevo?projectId=${project.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-500 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Emitir Primer Reporte</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4 w-20">N° Rep.</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Tramo Vial</th>
                    <th className="py-3 px-3 text-right">Avance Día ($)</th>
                    <th className="py-3 px-3 text-right">Planillaje Acum. ($)</th>
                    <th className="py-3 px-3 text-center">% Acumulado</th>
                    <th className="py-3 px-3 text-center">Clima</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReports.map((rep) => (
                    <tr
                      key={rep.id}
                      className={`transition-colors ${
                        selectedReportId === rep.id
                          ? 'bg-orange-50/70 border-l-4 border-l-orange-500 font-medium'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <button
                          onClick={() => {
                            setSelectedReportId(rep.id);
                            setReportViewMode('html');
                          }}
                          className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 font-black hover:bg-orange-100 transition-colors cursor-pointer"
                          title="Clic para ver versión HTML"
                        >
                          #{rep.reportNumber}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => {
                            setSelectedReportId(rep.id);
                            setReportViewMode('html');
                          }}
                          className="text-left cursor-pointer group"
                          title="Clic para ver versión HTML"
                        >
                          <span className="font-bold text-slate-900 block group-hover:text-orange-600 transition-colors">
                            {new Date(rep.date).toLocaleDateString('es-EC', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <span className="text-[10px] text-slate-400">Día {rep.elapsedDays}</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-[200px] truncate">
                        {rep.roadSection || project.roadSection}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-orange-600">
                        ${rep.totalExecutedDay.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                        ${rep.totalExecutedAccum.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-mono font-bold px-2 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {rep.progressPercentAccum.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="text-[11px] text-slate-600">
                          {rep.lostRainHoursDay ? `🌧️ ${rep.lostRainHoursDay}h lluvia` : '☀️ Normal'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* HTML Button */}
                          <button
                            onClick={() => {
                              setSelectedReportId(rep.id);
                              setReportViewMode('html');
                            }}
                            className={`px-2 py-1 rounded-lg font-bold transition-all text-[11px] cursor-pointer inline-flex items-center gap-1 ${
                              selectedReportId === rep.id && reportViewMode === 'html'
                                ? 'bg-orange-600 text-white shadow-2xs ring-2 ring-orange-300'
                                : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                            }`}
                            title="Ver versión HTML interactiva"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>HTML</span>
                          </button>

                          {/* PDF Button */}
                          <button
                            onClick={() => {
                              setSelectedReportId(rep.id);
                              setReportViewMode('pdf');
                            }}
                            className={`px-2 py-1 rounded-lg font-bold transition-all text-[11px] cursor-pointer inline-flex items-center gap-1 ${
                              selectedReportId === rep.id && reportViewMode === 'pdf'
                                ? 'bg-blue-600 text-white shadow-2xs ring-2 ring-blue-300'
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                            }`}
                            title="Ver versión documento PDF / A4 oficial"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>

                          {/* Standalone page */}
                          <Link
                            href={`/reportes/${rep.id}`}
                            target="_blank"
                            className="p-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-200"
                            title="Abrir en pestaña nueva"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          {/* Print */}
                          <Link
                            href={`/reportes/${rep.id}/imprimir`}
                            target="_blank"
                            className="p-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-200"
                            title="Imprimir informe oficial"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RUBROS CONTRACTUALES                                               */}
      {/* ========================================================================= */}
      {activeTab === 'rubros' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-orange-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Catálogo de Rubros Contractuales
                </h2>
                <p className="text-xs text-slate-500">
                  Cantidades vigentes, precios unitarios y control de ampliaciones
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar rubro por número o nombre..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    filterType === 'all'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({project.rubros.length})
                </button>
                <button
                  onClick={() => setFilterType('principal')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    filterType === 'principal'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Principales
                </button>
                <button
                  onClick={() => setFilterType('non-principal')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    filterType === 'non-principal'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  No Principales
                </button>
              </div>

              <button
                onClick={() => setAddRubroOpen(true)}
                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Agregar Rubro</span>
              </button>

              <button
                onClick={() => setBulkImportOpen(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 transition-all cursor-pointer flex items-center gap-1"
              >
                <FilePlus className="w-3.5 h-3.5 text-slate-500" />
                <span>Importar Masivo</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4 w-16">N°</th>
                  <th className="py-3 px-4">Descripción del Rubro</th>
                  <th className="py-3 px-3 text-center">Unid.</th>
                  <th className="py-3 px-3 text-right">P. Unitario ($)</th>
                  <th className="py-3 px-3 text-right">Cant. Inicial</th>
                  <th className="py-3 px-3 text-right">Cant. Vigente</th>
                  <th className="py-3 px-3 text-right">Monto Vigente ($)</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRubros.map((rubro) => {
                  const isIncreased = rubro.currentQuantity > rubro.initialQuantity;
                  const totalItemBudget = rubro.currentQuantity * rubro.unitPrice;

                  return (
                    <tr
                      key={rubro.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        rubro.isPrincipal ? 'bg-white' : 'bg-slate-50/40 text-slate-600'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {rubro.rubroNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {rubro.isPrincipal ? (
                            <span className="w-2 h-2 rounded-full bg-orange-600 flex-shrink-0" title="Rubro Principal" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" title="Rubro No Principal" />
                          )}
                          <span className="font-medium text-slate-900">{rubro.description}</span>
                          {isIncreased && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              Adenda (+{(rubro.currentQuantity - rubro.initialQuantity).toFixed(2)})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-600">
                        {rubro.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        ${rubro.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        {rubro.initialQuantity.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {rubro.currentQuantity.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                        ${totalItemBudget.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedRubroForAdjust(rubro)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-orange-50 text-slate-700 hover:text-orange-700 rounded border border-slate-200 text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Ajustar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PERSONAL & CUADRILLAS                                              */}
      {/* ========================================================================= */}
      {activeTab === 'personal' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Personal Asignado a la Obra ({activeWorkers.length})
              </h2>
              <p className="text-xs text-slate-500">
                Nómina técnica, fiscalización y cuadrillas asignadas activamente a este proyecto
              </p>
            </div>
            <button
              onClick={() => setAssignWorkerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Asignar Personal</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeWorkers.map((wa) => (
              <div
                key={wa.id}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-[10px] text-slate-400">CI: {wa.worker.identification}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {wa.assignedRole || wa.worker.roleCategory}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-1">{wa.worker.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Desde: {new Date(wa.startDate).toLocaleDateString('es-EC')}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {wa.worker.phone || wa.worker.email || 'Sin contacto'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingWorker(wa.worker)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-orange-50 text-slate-700 hover:text-orange-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                      title="Editar datos del trabajador"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleRemoveWorker(wa.id, wa.worker.name)}
                      disabled={deletingId === wa.id}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Desvincular
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: CONTRATISTAS & SUBCONTRATOS                                        */}
      {/* ========================================================================= */}
      {activeTab === 'contratistas' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Contratistas & Subcontratos de la Obra ({activeContractors.length})
              </h2>
              <p className="text-xs text-slate-500">
                Empresas prestadoras de servicios, provisión de asfalto y transporte
              </p>
            </div>
            <button
              onClick={() => setAssignContractorOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>+ Contratista</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeContractors.map((ac) => (
              <div
                key={ac.id}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-[10px] text-slate-400">RUC: {ac.contractor.ruc}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      {ac.contractor.specialty}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-1">{ac.contractor.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">Rol: {ac.roleInProject}</p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Contacto: {ac.contractor.contactPerson || 'S/N'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingContractor(ac.contractor)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-orange-50 text-slate-700 hover:text-orange-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                      title="Editar datos del contratista"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleRemoveContractor(ac.id, ac.contractor.name)}
                      disabled={deletingId === ac.id}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Desvincular
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: MODIFICACIONES CONTRACTUALES                                       */}
      {/* ========================================================================= */}
      {activeTab === 'modificaciones' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Historial de Modificaciones Contractuales ({allAdjustments.length})
              </h2>
              <p className="text-xs text-slate-500">
                Contratos complementarios, órdenes de trabajo y reajustes aprobados por fiscalización
              </p>
            </div>
          </div>

          {allAdjustments.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              No se han registrado modificaciones contractuales o adendas en esta obra.
            </p>
          ) : (
            <div className="space-y-3">
              {allAdjustments.map((adj) => (
                <div
                  key={adj.id}
                  className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">
                      Rubro N° {adj.rubroNumber}: {adj.rubroDescription}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      {adj.type}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>
                      Variación: <strong>{adj.quantityChange > 0 ? `+${adj.quantityChange}` : adj.quantityChange} {adj.unit}</strong>
                    </span>
                    <span>Ref Doc: {adj.documentRef || 'S/N'}</span>
                  </div>
                  <p className="text-slate-500 pt-1">
                    <strong>Motivo:</strong> {adj.reason} • <strong>Aprobado por:</strong> {adj.approvedBy} (
                    {new Date(adj.date).toLocaleDateString('es-EC')})
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals for Rubros and Assignments */}
      {selectedRubroForAdjust && (
        <AdjustRubroModal
          isOpen={!!selectedRubroForAdjust}
          onClose={() => setSelectedRubroForAdjust(null)}
          rubroId={selectedRubroForAdjust.id}
          rubroNumber={selectedRubroForAdjust.rubroNumber}
          description={selectedRubroForAdjust.description}
          currentQuantity={selectedRubroForAdjust.currentQuantity}
          unit={selectedRubroForAdjust.unit}
          unitPrice={selectedRubroForAdjust.unitPrice}
        />
      )}

      <AddRubroModal
        isOpen={addRubroOpen}
        onClose={() => setAddRubroOpen(false)}
        projectId={project.id}
      />

      <BulkRubroImportModal
        isOpen={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        projectId={project.id}
        projectCode={project.code}
      />

      <AssignWorkerToProjectModal
        isOpen={assignWorkerOpen}
        onClose={() => setAssignWorkerOpen(false)}
        projectId={project.id}
        projectName={project.name}
        projectCode={project.code}
        allWorkers={allWorkers}
      />

      <AssignContractorToProjectModal
        isOpen={assignContractorOpen}
        onClose={() => setAssignContractorOpen(false)}
        projectId={project.id}
        projectName={project.name}
        projectCode={project.code}
        allContractors={allContractors}
      />

      {/* Edit Worker & Contractor Modals */}
      <EditWorkerModal
        isOpen={!!editingWorker}
        onClose={() => setEditingWorker(null)}
        worker={editingWorker}
      />

      <EditContractorModal
        isOpen={!!editingContractor}
        onClose={() => setEditingContractor(null)}
        contractor={editingContractor}
      />

      {/* Edit Project Modal */}
      {editProjectOpen && (
        <EditProjectModal
          project={project}
          isOpen={editProjectOpen}
          onClose={() => setEditProjectOpen(false)}
        />
      )}
    </div>
  );
}
