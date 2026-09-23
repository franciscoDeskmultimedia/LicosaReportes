import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  TrendingUp,
  Clock,
  DollarSign,
  Truck,
  Package,
  FileSpreadsheet,
  ArrowRight,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Calendar,
  CloudSun,
  ShieldCheck,
  ChevronRight,
  HardHat,
  Building2,
  Layers,
  Sparkles,
  Briefcase,
} from 'lucide-react';
import { DashboardProjectFilter } from '@/components/DashboardProjectFilter';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const currentUser = await requireAuth();

  // If user only has BODEGUERO role in all their projects, redirect to /bodega
  const isAdmin = currentUser.role === 'ADMIN';
  const assignedRoles = currentUser?.assignments?.map((a) => a.roleInProject) || [];
  if (currentUser?.role && currentUser.role !== 'ADMIN' && currentUser.role !== 'ESTANDAR') {
    assignedRoles.push(currentUser.role);
  }
  const hasResidentRole = isAdmin || assignedRoles.includes('RESIDENTE_OBRA');
  const hasBodegaRole = isAdmin || assignedRoles.includes('BODEGUERO');

  if (!isAdmin && hasBodegaRole && !hasResidentRole) {
    redirect('/bodega');
  }

  const { projectId } = await searchParams;

  // Filter accessible projects for user
  const userProjectFilter =
    currentUser && currentUser.role !== 'ADMIN' && currentUser.assignedProjectIds.length > 0
      ? { id: { in: currentUser.assignedProjectIds } }
      : {};

  // Fetch all accessible projects with their latest daily report and rubros
  const allProjects = await prisma.project.findMany({
    where: userProjectFilter,
    include: {
      rubros: {
        orderBy: { rubroNumber: 'asc' },
      },
      dailyReports: {
        orderBy: { reportNumber: 'desc' },
        take: 1,
        include: {
          rubroExecutions: {
            include: {
              projectRubro: true,
            },
          },
        },
      },
    },
    orderBy: { code: 'asc' },
  });

  const isConsolidated = !projectId || projectId === 'ALL';

  // Global Consolidated Metrics
  const totalContractAmount = allProjects.reduce((acc, p) => acc + p.contractAmount, 0);
  const totalExecutedAccum = allProjects.reduce(
    (acc, p) => acc + (p.dailyReports[0]?.totalExecutedAccum || 0),
    0
  );
  const totalDayExecuted = allProjects.reduce(
    (acc, p) => acc + (p.dailyReports[0]?.totalExecutedDay || 0),
    0
  );
  const globalProgressPercent =
    totalContractAmount > 0 ? (totalExecutedAccum / totalContractAmount) * 100 : 0;

  // Recent daily reports across all worksites
  const recentReports = await prisma.dailyReport.findMany({
    where: userProjectFilter.id ? { projectId: userProjectFilter.id } : undefined,
    orderBy: { date: 'desc' },
    take: 5,
    include: {
      project: true,
      rubroExecutions: {
        include: {
          projectRubro: true,
        },
      },
    },
  });

  // Recent warehouse items and machinery
  const recentMaterials = await prisma.materialItem.findMany({
    where: !isConsolidated ? { projectId: projectId } : undefined,
    orderBy: { currentStock: 'asc' },
    take: 5,
    include: {
      project: true,
    },
  });

  const machineryList = await prisma.machinery.findMany({
    orderBy: { totalHoursWorked: 'desc' },
    take: 6,
  });

  // If a single project is selected, fetch full details for deep-dive
  const singleProject = !isConsolidated
    ? await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          rubros: {
            orderBy: { rubroNumber: 'asc' },
          },
          dailyReports: {
            orderBy: { reportNumber: 'desc' },
            take: 5,
            include: {
              rubroExecutions: {
                include: {
                  projectRubro: true,
                },
              },
              machineryLogs: true,
            },
          },
        },
      })
    : null;

  const singleLastReport = singleProject?.dailyReports[0];
  const singleProgressPercent =
    singleProject && singleProject.contractAmount > 0
      ? ((singleLastReport?.totalExecutedAccum || 0) / singleProject.contractAmount) * 100
      : 0;
  const singleTimePercent =
    singleProject && singleProject.durationDays > 0
      ? ((singleLastReport?.elapsedDays || 0) / singleProject.durationDays) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* 1. Multi-Project Selector Header */}
      <DashboardProjectFilter
        projects={allProjects}
        selectedProjectId={projectId}
      />

      {/* 2. CONSOLIDATED PORTFOLIO VIEW (When "Todas las Obras" is selected) */}
      {isConsolidated ? (
        <div className="space-y-8">
          {/* Corporate Consolidated Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-xl border border-slate-700/60 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-orange-600 text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Consolidado Corporativo LICOSA</span>
                  </span>
                  <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-medium rounded-full border border-slate-700">
                    {allProjects.length} Proyectos Viales en Ejecución
                  </span>
                  <span className="px-3 py-1 bg-blue-950 text-blue-300 text-xs font-medium rounded-full border border-blue-800/60">
                    Contratante: GAD Provincial del Guayas
                  </span>
                </div>

                <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-white leading-tight">
                  Portafolio de Infraestructura Vial & Control Financiero
                </h1>

                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                  Supervisión gerencial consolidada de avance de obra, facturación por planillaje acumulado, inventarios de bodegas y parque de maquinaria pesada.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[200px]">
                <Link
                  href="/reportes/nuevo"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold shadow-lg shadow-orange-600/30 transition-all text-center"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Emitir Reporte Diario</span>
                </Link>
                <Link
                  href="/proyectos"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all text-center"
                >
                  <span>Ver Todos los Contratos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Global Consolidated Progress Bar */}
            <div className="mt-8 pt-6 border-t border-slate-700/80">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-2 gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Avance Financiero Acumulado Portafolio LICOSA
                  </p>
                  <p className="text-2xl font-black text-white">
                    {globalProgressPercent.toFixed(2)}%{' '}
                    <span className="text-xs font-normal text-emerald-400 ml-2">
                      (${totalExecutedAccum.toLocaleString('es-EC', { minimumFractionDigits: 2 })} de ${totalContractAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })})
                    </span>
                  </p>
                </div>

                <div className="text-right text-xs">
                  <span className="text-slate-400">Total Proyectos:</span>{' '}
                  <span className="font-bold text-slate-200">{allProjects.length} contratos activos</span>
                </div>
              </div>

              <div className="w-full h-3 bg-slate-700/80 rounded-full overflow-hidden p-0.5 border border-slate-600">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, Math.max(0, globalProgressPercent))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Consolidated 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider">Monto Contractual Total</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">
                ${totalContractAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Suma de {allProjects.length} obras viales activas
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider">Planillaje Acumulado</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-600">
                ${totalExecutedAccum.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {globalProgressPercent.toFixed(2)}% del valor contractual global
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider">Producción Jornada</span>
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-orange-600">
                ${totalDayExecuted.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Últimos reportes diarios emitidos
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider">Parque de Maquinaria</span>
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">
                {machineryList.length} Equipos
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Asignados a los frentes de trabajo
              </p>
            </div>
          </div>

          {/* PROJECTS PORTFOLIO GRID: All Projects Displayed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-orange-600" />
                  <span>Proyectos Viales en Ejecución ({allProjects.length})</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Desglose por obra: seleccione cualquier proyecto para ver su ficha y reportes
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {allProjects.map((p) => {
                const lastRep = p.dailyReports[0];
                const pct =
                  p.contractAmount > 0
                    ? ((lastRep?.totalExecutedAccum || 0) / p.contractAmount) * 100
                    : 0;
                const timePct =
                  p.durationDays > 0 ? ((lastRep?.elapsedDays || 0) / p.durationDays) * 100 : 0;

                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-6 space-y-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-orange-100 text-orange-800 font-mono font-bold text-xs">
                            {p.code}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {p.financingSource || 'GAD Guayas'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
                          {p.name}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Tramo: {p.roadSection || 'Vial'} • Contratista: {p.contractor}
                        </p>
                      </div>

                      <Link
                        href={`/?projectId=${p.id}`}
                        className="p-2 bg-slate-100 hover:bg-orange-600 hover:text-white rounded-xl text-slate-600 transition-all flex-shrink-0"
                        title="Ver detalle de este proyecto"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>

                    {/* Progress Bar & Financials */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="text-slate-500 font-medium">Avance Físico-Financiero</span>
                        <span className="font-black text-slate-900 text-sm">
                          {pct.toFixed(2)}%{' '}
                          <span className="text-slate-500 text-xs font-normal">
                            (${lastRep?.totalExecutedAccum.toLocaleString('es-EC', { minimumFractionDigits: 2 }) || '0.00'})
                          </span>
                        </span>
                      </div>

                      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11.5px] text-slate-600">
                        <div>
                          Monto Contrato: <strong className="text-slate-900">${p.contractAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <div className="text-right">
                          Plazo: <strong className="text-slate-900">{lastRep?.elapsedDays || 0} / {p.durationDays} días ({timePct.toFixed(0)}%)</strong>
                        </div>
                      </div>
                    </div>

                    {/* Action Links */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="text-[11px] text-slate-500">
                        {lastRep ? (
                          <span>Último Reporte: <strong>N° {lastRep.reportNumber}</strong> ({new Date(lastRep.date).toLocaleDateString('es-EC')})</span>
                        ) : (
                          <span>Sin reportes emitidos</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/bodega?projectId=${p.id}`}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                        >
                          Bodega
                        </Link>
                        <Link
                          href={`/reportes?projectId=${p.id}`}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                        >
                          Reportes
                        </Link>
                        <Link
                          href={`/proyectos/${p.id}`}
                          className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold rounded-lg text-xs transition-colors"
                        >
                          Ficha Rubros →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Grid: Recent Reports across all obras & Machinery */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-orange-600" />
                  <h3 className="font-bold text-slate-900 text-sm">
                    Últimos Reportes Diarios Emitidos en el Portafolio
                  </h3>
                </div>
                <Link
                  href="/reportes"
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                >
                  Ver Todos
                </Link>
              </div>

              <div className="divide-y divide-slate-100">
                {recentReports.map((r) => (
                  <div
                    key={r.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200 text-[11px]">
                          [{r.project.code}] Rep N° {r.reportNumber}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="font-medium text-slate-700">
                          {new Date(r.date).toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{r.project.name}</p>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-right">
                        <span className="font-bold text-slate-900 block font-mono">
                          ${r.totalExecutedDay.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Acum: ${r.totalExecutedAccum.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <Link
                        href={`/reportes/${r.id}`}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Machinery & Critical Stock */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-orange-600" />
                    <h3 className="font-bold text-slate-900 text-sm">Flota de Maquinaria Operativa</h3>
                  </div>
                  <Link
                    href="/maquinaria"
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                  >
                    Ver Flota
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {machineryList.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between"
                    >
                      <div>
                        <span className="font-mono font-bold text-slate-900 block">{m.code}</span>
                        <span className="text-[11px] text-slate-500 line-clamp-1">{m.name}</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Total:</span>
                        <span className="font-bold text-slate-700">{m.totalHoursWorked} {m.unit}s</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : singleProject ? (
        /* 3. DEEP-DIVE SINGLE PROJECT VIEW (When a specific project is selected) */
        <div className="space-y-8">
          {/* Top Banner / Project Profile */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-xl border border-slate-700/60 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-orange-600/90 text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-sm">
                    [{singleProject.code}]
                  </span>
                  <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-medium rounded-full border border-slate-700">
                    Frente: {singleProject.executingCompany || 'LICOSA'}
                  </span>
                  <span className="px-3 py-1 bg-blue-950 text-blue-300 text-xs font-medium rounded-full border border-blue-800/60">
                    {singleProject.financingSource || 'Financiamiento Provincial'}
                  </span>
                </div>

                <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-white leading-tight">
                  {singleProject.name}
                </h1>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-2 gap-x-6 text-xs text-slate-300 pt-2 border-t border-slate-700/60">
                  <div>
                    <span className="text-slate-400">Contratista:</span>{' '}
                    <span className="font-semibold text-slate-200">{singleProject.contractor}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Contratante:</span>{' '}
                    <span className="font-semibold text-slate-200">{singleProject.client}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Fiscalización:</span>{' '}
                    <span className="font-semibold text-slate-200">{singleProject.inspectionCompany}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[200px]">
                <Link
                  href={`/reportes/nuevo?projectId=${singleProject.id}`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold shadow-lg shadow-orange-600/30 transition-all text-center"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Emitir Reporte Diario</span>
                </Link>
                <Link
                  href={`/proyectos/${singleProject.id}`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all text-center"
                >
                  <span>Ver Ficha de Rubros</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Global Progress Bar */}
            <div className="mt-8 pt-6 border-t border-slate-700/80">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-2 gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Avance Contractual Físico-Financiero de la Obra
                  </p>
                  <p className="text-2xl font-black text-white">
                    {singleProgressPercent.toFixed(2)}%{' '}
                    <span className="text-xs font-normal text-emerald-400 ml-2">
                      (${singleLastReport?.totalExecutedAccum.toLocaleString('es-EC', { minimumFractionDigits: 2 }) || '0.00'} de ${singleProject.contractAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })})
                    </span>
                  </p>
                </div>

                <div className="text-right text-xs">
                  <span className="text-slate-400">Plazo Transcurrido:</span>{' '}
                  <span className="font-bold text-slate-200">
                    {singleLastReport?.elapsedDays || 0} / {singleProject.durationDays} días ({singleTimePercent.toFixed(1)}%)
                  </span>
                </div>
              </div>

              <div className="w-full h-3 bg-slate-700/80 rounded-full overflow-hidden p-0.5 border border-slate-600">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, Math.max(0, singleProgressPercent))}%` }}
                />
              </div>
            </div>
          </div>

          {/* 4 Core Financial & Execution KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider">Monto Contractual</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">
                ${singleProject.contractAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Asignado a LICOSA • {singleProject.durationDays} días calendario
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider">Avance Ejecutado Acum.</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-600">
                ${singleLastReport?.totalExecutedAccum.toLocaleString('es-EC', { minimumFractionDigits: 2 }) || '0.00'}
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Reporte N° {String(singleLastReport?.reportNumber || 0).padStart(3, '0')}</span>
                <span>• {singleProgressPercent.toFixed(2)}% completado</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider">Producción del Día</span>
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-orange-600">
                ${singleLastReport?.totalExecutedDay.toLocaleString('es-EC', { minimumFractionDigits: 2 }) || '0.00'}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {singleLastReport ? new Date(singleLastReport.date).toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Sin reporte'}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider">Cronograma de Obra</span>
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-800">
                {singleLastReport?.elapsedDays || 0} / {singleProject.durationDays}
              </p>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                <div className="bg-slate-700 h-full rounded-full" style={{ width: `${singleTimePercent}%` }} />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">{singleProject.durationDays - (singleLastReport?.elapsedDays || 0)} días restantes</p>
            </div>
          </div>

          {/* Grid: Last Daily Report Detail & Project Inventory */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                      {String(singleLastReport?.reportNumber || 1).padStart(3, '0')}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Último Reporte Diario de esta Obra
                      </h2>
                      <p className="text-xs text-slate-500">
                        {singleLastReport ? new Date(singleLastReport.date).toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Sin fecha'} • {singleLastReport?.roadSection}
                      </p>
                    </div>
                  </div>

                  {singleLastReport && (
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/reportes/${singleLastReport.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm"
                      >
                        <span>Ver Detalle</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        href={`/reportes/${singleLastReport.id}/imprimir`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-orange-400" />
                        <span>Formato Oficial</span>
                      </Link>
                    </div>
                  )}
                </div>

                {singleLastReport ? (
                  <div className="p-6 space-y-6">
                    {/* Rubros Executed */}
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
                        <span>Rubros Principales Ejecutados en la Jornada</span>
                        <span className="text-slate-400 font-normal">Cant. Día vs Monto Día</span>
                      </h3>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                        {singleLastReport.rubroExecutions.map((item) => (
                          <div
                            key={item.id}
                            className="p-3.5 bg-white hover:bg-slate-50/70 transition-colors flex items-center justify-between text-xs"
                          >
                            <div className="space-y-0.5 max-w-[65%]">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                                  Rubro {item.projectRubro.rubroNumber}
                                </span>
                                <span className="font-medium text-slate-800 line-clamp-1">
                                  {item.projectRubro.description}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400">
                                Avance hoy: {item.dayQuantity.toLocaleString('es-EC')} {item.projectRubro.unit} • Acumulado: {item.accumQuantity.toLocaleString('es-EC')} {item.projectRubro.unit}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-slate-900 block font-mono">
                                ${item.dayAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Acum: ${item.accumAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-400">
                    <p>No hay reportes para este proyecto.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Inventory for this project */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Bodega: {singleProject.code}</h3>
                      <p className="text-[11px] text-slate-500">Insumos y materiales en stock de la obra</p>
                    </div>
                  </div>
                  <Link
                    href={`/bodega?projectId=${singleProject.id}`}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                  >
                    <span>Gestionar</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="space-y-3">
                  {recentMaterials.map((mat) => (
                    <div
                      key={mat.id}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-800 line-clamp-1">{mat.name}</p>
                        <p className="text-[10px] text-slate-400">
                          Cód: {mat.code} • {mat.category}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900">
                          {mat.currentStock.toLocaleString('es-EC')} {mat.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
