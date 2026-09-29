'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Calendar,
  Clock,
  Truck,
  Users,
  HardHat,
  FileSpreadsheet,
  PlusCircle,
  ArrowRight,
  Search,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  CloudSun,
  Briefcase,
  SlidersHorizontal,
  ExternalLink,
  X,
} from 'lucide-react';

export interface ProjectCardData {
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
  status: string;
  rubros: Array<{
    id: string;
    rubroNumber: number;
    description: string;
    currentQuantity: number;
    unitPrice: number;
    isPrincipal: boolean;
  }>;
  dailyReports: Array<{
    id: string;
    reportNumber: number;
    date: Date | string;
    totalExecutedDay: number;
    totalExecutedAccum: number;
    progressPercentAccum: number;
    elapsedDays: number;
    rainHoursDay?: number;
    lostRainHoursDay?: number;
    activitiesTodayVial?: string | null;
    activitiesTodayPavimento?: string | null;
    activitiesTodayDrenaje?: string | null;
    activitiesTodayTopografia?: string | null;
    noveltiesRisks?: string | null;
    rubroExecutions?: Array<{
      id: string;
      dayQuantity: number;
      dayAmount: number;
      projectRubro: {
        rubroNumber: number;
        description: string;
        unit: string;
      };
    }>;
    machineryLogs?: Array<{
      id: string;
      machinery: {
        code: string;
        name: string;
        category: string;
      };
    }>;
    personnelLogs?: Array<{
      id: string;
      categoryRole: string;
      count: number;
    }>;
  }>;
  workerAssignments?: Array<{
    id: string;
    worker: {
      name: string;
      roleCategory: string;
    };
  }>;
  contractors?: Array<{
    id: string;
    contractor: {
      name: string;
      specialty: string;
    };
  }>;
}

interface ProjectSliderCardsProps {
  projects: ProjectCardData[];
}

export function ProjectSliderCards({ projects }: ProjectSliderCardsProps) {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'slider' | 'grid'>('grid');
  const [currentSlide, setCurrentSlide] = useState(0);

  // Store internal slide index for each card (0: Avance, 1: Último Reporte, 2: Recursos, 3: Contrato)
  const [cardInternalTabs, setCardInternalTabs] = useState<Record<string, number>>({});

  // Filter projects based on status and search query
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const isActive = p.status === 'EN_EJECUCION';
      if (filterStatus === 'ACTIVE' && !isActive) return false;
      if (filterStatus === 'INACTIVE' && isActive) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = p.code.toLowerCase().includes(q);
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesClient = p.client.toLowerCase().includes(q);
        const matchesSection = (p.roadSection || '').toLowerCase().includes(q);
        return matchesCode || matchesName || matchesClient || matchesSection;
      }
      return true;
    });
  }, [projects, filterStatus, searchQuery]);

  const activeCount = projects.filter((p) => p.status === 'EN_EJECUCION').length;
  const inactiveCount = projects.length - activeCount;

  // Outer slider navigation
  const maxSlide = Math.max(0, filteredProjects.length - 1);
  const safeCurrentSlide = Math.min(currentSlide, maxSlide);

  function nextSlide() {
    setCurrentSlide((prev) => (prev >= maxSlide ? 0 : prev + 1));
  }

  function prevSlide() {
    setCurrentSlide((prev) => (prev <= 0 ? maxSlide : prev - 1));
  }

  function setInternalTab(projectId: string, tabIndex: number) {
    setCardInternalTabs((prev) => ({
      ...prev,
      [projectId]: tabIndex,
    }));
  }

  return (
    <div className="space-y-5">
      {/* Control Bar: Filters, Search & View Switcher */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
            <button
              onClick={() => {
                setFilterStatus('ALL');
                setCurrentSlide(0);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterStatus === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Todos</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-200 text-slate-700">
                {projects.length}
              </span>
            </button>
            <button
              onClick={() => {
                setFilterStatus('ACTIVE');
                setCurrentSlide(0);
              }}
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
              onClick={() => {
                setFilterStatus('INACTIVE');
                setCurrentSlide(0);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterStatus === 'INACTIVE'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              <span>Inactivos / Pausados</span>
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

        {/* Search & Layout Mode */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:w-80 md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por código, nombre, tramo o contratista..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentSlide(0);
              }}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <span className="text-[11px] text-slate-400 whitespace-nowrap hidden md:inline">
              {filteredProjects.length} de {projects.length} obras
            </span>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Modo Cuadrícula (Recomendado)"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Cuadrícula</span>
              </button>
              <button
                onClick={() => setViewMode('slider')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'slider'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Modo Slider Individual"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Foco</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">No se encontraron proyectos con ese criterio</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Prueba ajustando el filtro de activos/inactivos o limpiando la búsqueda.
          </p>
          <button
            onClick={() => {
              setFilterStatus('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            Restablecer Filtros
          </button>
        </div>
      )}

      {/* SLIDER VIEW MODE */}
      {viewMode === 'slider' && filteredProjects.length > 0 && (
        <div className="space-y-4">
          {/* Slider Header Bar with Controls */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Mostrando Obra:
              </span>
              <span className="font-mono text-xs font-black text-slate-900 bg-slate-200/80 px-2 py-0.5 rounded-md">
                {safeCurrentSlide + 1} de {filteredProjects.length}
              </span>
            </div>

            {filteredProjects.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={prevSlide}
                  className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 shadow-xs transition-all"
                  title="Proyecto Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1 px-1">
                  {filteredProjects.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`h-2 rounded-full transition-all ${
                        idx === safeCurrentSlide
                          ? 'w-6 bg-orange-600'
                          : 'w-2 bg-slate-300 hover:bg-slate-400'
                      }`}
                      title={`Ir al proyecto ${idx + 1}`}
                    />
                  ))}
                </div>
                <button
                  onClick={nextSlide}
                  className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 shadow-xs transition-all"
                  title="Siguiente Proyecto"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Active Slider Card */}
          <ProjectSlideCard
            project={filteredProjects[safeCurrentSlide]}
            internalTab={cardInternalTabs[filteredProjects[safeCurrentSlide].id] || 0}
            onTabChange={(tab) => setInternalTab(filteredProjects[safeCurrentSlide].id, tab)}
          />
        </div>
      )}

      {/* GRID VIEW MODE */}
      {viewMode === 'grid' && filteredProjects.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
          {filteredProjects.map((proj) => (
            <ProjectSlideCard
              key={proj.id}
              project={proj}
              internalTab={cardInternalTabs[proj.id] || 0}
              onTabChange={(tab) => setInternalTab(proj.id, tab)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Subcomponent: Individual Project Card with internal multi-slide tabs ("Cartas tipo slider")
function ProjectSlideCard({
  project,
  internalTab,
  onTabChange,
}: {
  project: ProjectCardData;
  internalTab: number;
  onTabChange: (tab: number) => void;
}) {
  const lastReport = project.dailyReports[0];
  const progressPercent = lastReport?.progressPercentAccum || 0;
  const totalExecuted = lastReport?.totalExecutedAccum || 0;
  const elapsedDays = lastReport?.elapsedDays || 0;
  const timePercent = project.durationDays > 0 ? (elapsedDays / project.durationDays) * 100 : 0;
  const remainingBudget = Math.max(0, project.contractAmount - totalExecuted);

  // Performance SPI
  const spi = timePercent > 0 ? progressPercent / timePercent : 1;
  const isHealthy = spi >= 0.9;

  const isActive = project.status === 'EN_EJECUCION';
  const activeWorkersCount = project.workerAssignments?.length || 0;
  const activeContractorsCount = project.contractors?.length || 0;
  const activeMachineryCount = lastReport?.machineryLogs?.length || 0;

  const internalSlides = [
    { id: 0, label: 'Avance Físico & Económico', icon: TrendingUp },
    { id: 1, label: 'Último Reporte Diario', icon: FileSpreadsheet },
    { id: 2, label: 'Recursos en Obra', icon: HardHat },
    { id: 3, label: 'Contrato & Tramo', icon: Building2 },
  ];

  function prevInternalSlide() {
    onTabChange(internalTab <= 0 ? internalSlides.length - 1 : internalTab - 1);
  }

  function nextInternalSlide() {
    onTabChange(internalTab >= internalSlides.length - 1 ? 0 : internalTab + 1);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
      {/* Card Header */}
      <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 bg-orange-600 text-white rounded-md tracking-wider">
                {project.code}
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
              >
                {isActive ? '● En Ejecución' : '⏸ En Pausa / Suspendido'}
              </span>
              <span className="text-[11px] text-slate-300 font-medium">
                Contrato: {project.contractNumber}
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-black text-white leading-snug line-clamp-2">
              {project.name}
            </h2>

            <p className="text-xs text-slate-300 flex items-center gap-1.5">
              <span className="text-orange-400 font-semibold">{project.roadSection || 'Tramo Principal'}</span>
              <span>•</span>
              <span className="text-slate-400">Contratista: {project.contractor}</span>
            </p>
          </div>

          <Link
            href={`/proyectos/${project.id}`}
            className="p-2.5 rounded-xl bg-slate-800/90 hover:bg-orange-600 text-slate-300 hover:text-white transition-all flex items-center gap-1 text-xs font-bold border border-slate-700/80 flex-shrink-0"
            title="Abrir Proyecto Completo"
          >
            <span>Ver Obra</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Quick Highlights Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-800 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Presupuesto</span>
            <span className="font-mono font-bold text-white text-xs sm:text-sm">
              ${project.contractAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Ejecutado Acum.</span>
            <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm">
              ${totalExecuted.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">% Avance</span>
            <span className="font-black text-white text-xs sm:text-sm">
              {progressPercent.toFixed(2)}%
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Plazo Transcurrido</span>
            <span className="font-semibold text-slate-200 text-xs sm:text-sm">
              {elapsedDays} / {project.durationDays} d ({timePercent.toFixed(0)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Internal Slide Navigator & Slider Controls (Slider interno para el resumen de cada carta) */}
      <div className="px-3 sm:px-4 py-2 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={prevInternalSlide}
          className="p-1.5 rounded-lg bg-white hover:bg-orange-50 border border-slate-200 hover:border-orange-300 text-slate-700 hover:text-orange-600 shadow-2xs transition-all cursor-pointer flex-shrink-0"
          title="Ver resumen anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {internalSlides.map((slide) => {
            const Icon = slide.icon;
            const isSelected = internalTab === slide.id;
            return (
              <button
                key={slide.id}
                onClick={() => onTabChange(slide.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
                }`}
              >
                <Icon className={`w-3 h-3 ${isSelected ? 'text-orange-400' : 'text-slate-400'}`} />
                <span className="text-[10.5px] sm:text-[11px]">{slide.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={nextInternalSlide}
          className="p-1.5 rounded-lg bg-white hover:bg-orange-50 border border-slate-200 hover:border-orange-300 text-slate-700 hover:text-orange-600 shadow-2xs transition-all cursor-pointer flex-shrink-0"
          title="Ver siguiente resumen"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Internal Slide Content Body */}
      <div className="p-5 sm:p-6 flex-1 min-h-[220px]">
        {/* SLIDE 0: AVANCE FÍSICO Y ECONÓMICO */}
        {internalTab === 0 && (
          <div className="space-y-4">
            {/* Progress visual comparison */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline text-xs">
                <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Avance Físico-Financiero Planillado
                </span>
                <span className="font-mono font-black text-slate-900 text-base">
                  {progressPercent.toFixed(2)}%
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Ejecutado: ${totalExecuted.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</span>
                <span>Saldo por Ejecutar: ${remainingBudget.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Time progress */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex justify-between items-baseline text-xs">
                <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Consumo del Plazo Contractual
                </span>
                <span className="font-mono font-bold text-slate-700">
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

            {/* Performance status & Rubros */}
            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                  Ritmo de Obra (SPI)
                </span>
                <div className="flex items-center gap-1.5">
                  {isHealthy ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  <span className={`font-bold ${isHealthy ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {isHealthy ? 'En Cronograma' : 'Requiere Aceleración'} (SPI: {spi.toFixed(2)})
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                  Rubros del Contrato
                </span>
                <span className="font-bold text-slate-800 block">
                  {project.rubros.length} rubros contractuales
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {project.rubros.filter((r) => r.isPrincipal).length} principales
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 1: ÚLTIMO REPORTE DIARIO */}
        {internalTab === 1 && (
          <div className="space-y-4">
            {lastReport ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50/70 border border-orange-200/80 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider block">
                      Último Informe Emitido
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      Reporte Diario N° {lastReport.reportNumber}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Fecha de Emisión</span>
                    <span className="font-bold text-slate-800">
                      {new Date(lastReport.date).toLocaleDateString('es-EC', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">Producción del Día</span>
                    <span className="font-mono font-bold text-orange-600 text-sm">
                      ${lastReport.totalExecutedDay.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">Condición Clima</span>
                    <div className="flex items-center gap-1 font-semibold text-slate-700 text-xs">
                      <CloudSun className="w-3.5 h-3.5 text-amber-500" />
                      <span>{lastReport.lostRainHoursDay ? `${lastReport.lostRainHoursDay}h lluvia` : 'Laborable'}</span>
                    </div>
                  </div>
                </div>

                {/* Top Rubros Executed in Last Report */}
                {lastReport.rubroExecutions && lastReport.rubroExecutions.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                      Rubros Ejecutados en la Jornada:
                    </span>
                    <div className="space-y-1 max-h-24 overflow-y-auto text-xs">
                      {lastReport.rubroExecutions.slice(0, 3).map((exec) => (
                        <div
                          key={exec.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-[11.5px]"
                        >
                          <span className="text-slate-800 font-medium line-clamp-1 flex-1">
                            <strong>N° {exec.projectRubro.rubroNumber}:</strong> {exec.projectRubro.description}
                          </span>
                          <span className="font-mono font-bold text-emerald-600 ml-2 whitespace-nowrap">
                            +{exec.dayQuantity} {exec.projectRubro.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Novelties / Summary */}
                {lastReport.noveltiesRisks && (
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 line-clamp-2">
                    <strong className="text-slate-800">Novedad:</strong> {lastReport.noveltiesRisks}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-300 space-y-2">
                <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="font-bold text-slate-700 text-xs">Aún no se han emitido reportes diarios en esta obra</p>
                <p className="text-[11px] text-slate-500">
                  Comienza el registro de avance diario para monitorear el kardex y planillaje.
                </p>
                <Link
                  href={`/reportes/nuevo?projectId=${project.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-500 transition-all mt-2"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Emitir Primer Reporte</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* SLIDE 2: RECURSOS EN OBRA */}
        {internalTab === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <Users className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                <span className="text-lg font-black text-slate-900 block">{activeWorkersCount}</span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Personal Asignado</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <Truck className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                <span className="text-lg font-black text-slate-900 block">{activeMachineryCount}</span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Equipos en Frente</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <Briefcase className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                <span className="text-lg font-black text-slate-900 block">{activeContractorsCount}</span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Subcontratistas</span>
              </div>
            </div>

            {/* Detail breakdown */}
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-center justify-between text-slate-600 border-b border-slate-100 pb-1.5">
                <span>Personal en Nómina de Obra:</span>
                <span className="font-semibold text-slate-800">
                  {activeWorkersCount > 0 ? `${activeWorkersCount} trabajadores registrados` : 'Sin asignación formal'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 border-b border-slate-100 pb-1.5">
                <span>Fiscalización / Supervisión:</span>
                <span className="font-semibold text-slate-800">{project.inspectionCompany}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 border-b border-slate-100 pb-1.5">
                <span>Frente Ejecutor:</span>
                <span className="font-semibold text-slate-800">{project.executingCompany || 'LICOSA'}</span>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 3: CONTRATO & TRAMO */}
        {internalTab === 3 && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Entidad Contratante</span>
                <span className="font-bold text-slate-800 block mt-0.5 line-clamp-2">{project.client}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Fuente Financiamiento</span>
                <span className="font-bold text-blue-700 block mt-0.5 line-clamp-2">{project.financingSource || 'Fondos Fiscales'}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Tramo Asignado:</span>
                <span className="font-bold text-slate-800">{project.roadSection || 'Vial'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Fecha de Inicio:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(project.startDate).toLocaleDateString('es-EC')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Plazo de Ejecución:</span>
                <span className="font-bold text-slate-900">{project.durationDays} días calendario</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/proyectos/${project.id}?tab=reportes`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            <span>Reportes Diarios</span>
          </Link>

          <Link
            href={`/reportes/nuevo?projectId=${project.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-xs transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Crear Reporte</span>
          </Link>
        </div>

        <Link
          href={`/proyectos/${project.id}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-xs"
        >
          <span>Abrir Proyecto</span>
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </Link>
      </div>
    </div>
  );
}
