'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  PlusCircle,
  Calendar,
  Clock,
  TrendingUp,
  DollarSign,
  ChevronRight,
  Printer,
  Building2,
} from 'lucide-react';
import { AdvancedRoadCharts } from '@/components/AdvancedRoadCharts';


interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

interface DailyReportItem {
  id: string;
  reportNumber: number;
  date: Date | string;
  roadSection: string;
  elapsedDays: number;
  totalDays: number;
  totalExecutedDay: number;
  totalExecutedAccum: number;
  progressPercentAccum: number;
  preparedByName: string;
  preparedByTitle: string;
  reviewedByName: string;
  reviewedByTitle: string;
  project: {
    id: string;
    code: string;
    name: string;
    contractAmount: number;
  };
  rubroExecutions: Array<{
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
}

export function DailyReportsListView({
  reports,
  projects,
  selectedProjectId,
}: {
  reports: DailyReportItem[];
  projects: ProjectOption[];
  selectedProjectId?: string;
}) {
  const router = useRouter();
  const isAll = !selectedProjectId || selectedProjectId === 'ALL';
  const currentProject = isAll ? null : projects.find((p) => p.id === selectedProjectId);

  function handleProjectChange(newId: string) {
    if (newId === 'ALL') {
      router.push('/reportes?projectId=ALL');
    } else {
      router.push(`/reportes?projectId=${newId}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <FileSpreadsheet className="w-4 h-4 text-orange-600" />
            <span>Control Diario de Ejecución</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900">
            {isAll ? 'Reportes Diarios de Obra (Todas las Obras)' : `Reportes Diarios: ${currentProject?.name}`}
          </h1>
          <p className="text-xs text-slate-500">
            Bitácora oficial de avance físico-financiero, clima, maquinaria, personal y actividades
          </p>
        </div>

        <Link
          href={currentProject ? `/reportes/nuevo?projectId=${currentProject.id}` : '/reportes/nuevo'}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Emitir Nuevo Reporte</span>
        </Link>
      </div>

      {/* Obra Selector Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-700 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider block">
              Obra Seleccionada:
            </span>
            <h2 className="text-sm sm:text-base font-bold text-white line-clamp-1">
              {currentProject ? `[${currentProject.code}] ${currentProject.name}` : 'Todas las Obras Viales (Consolidado)'}
            </h2>
          </div>
        </div>

        {/* Obra Dropdown Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-300 font-medium whitespace-nowrap hidden sm:inline">
            Filtrar Obra:
          </span>
          <select
            value={selectedProjectId || 'ALL'}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-600 text-white text-xs font-semibold rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
          >
            <option value="ALL">Todas las Obras (Consolidado)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.code}] {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Analytics & Advanced Road Engineering Graphs */}
      {reports.length > 0 && <AdvancedRoadCharts reports={reports} />}

      {/* Reports Table / Card List */}
      <div className="space-y-4">

        {reports.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="font-bold text-slate-700 text-sm">
              {isAll
                ? 'No hay reportes emitidos en ninguna obra'
                : `No hay reportes emitidos para ${currentProject?.name || 'esta obra'}`}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Haga clic en el botón para emitir el primer reporte diario.</p>
            <Link
              href={currentProject ? `/reportes/nuevo?projectId=${currentProject.id}` : '/reportes/nuevo'}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-xs font-semibold rounded-lg"
            >
              + Emitir Primer Reporte
            </Link>
          </div>
        ) : (
          reports.map((rep) => {
            const reportDate = new Date(rep.date);
            const formattedDate = reportDate.toLocaleDateString('es-EC', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });

            return (
              <div
                key={rep.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 md:p-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center font-bold flex-shrink-0 shadow-sm">
                      <span className="text-[10px] text-orange-400 leading-none">REP</span>
                      <span className="text-base font-black leading-tight">
                        {String(rep.reportNumber).padStart(3, '0')}
                      </span>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-[10.5px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200">
                          {rep.project.code}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          {rep.roadSection}
                        </span>
                        <span className="text-xs text-slate-500 capitalize">
                          {formattedDate}
                        </span>
                        <span className="text-xs font-medium text-slate-400">
                          • Día {rep.elapsedDays} de {rep.totalDays}
                        </span>
                      </div>
                      <h2 className="text-sm md:text-base font-bold text-slate-900">
                        {rep.project.name}
                      </h2>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">Monto Día</span>
                      <span className="font-mono font-bold text-slate-900 text-base">
                        ${rep.totalExecutedDay.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">Acumulado</span>
                      <span className="font-mono font-bold text-emerald-700 text-base">
                        ${rep.totalExecutedAccum.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">% Avance</span>
                      <span className="font-mono font-black text-orange-600 text-base">
                        {rep.progressPercentAccum.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rubros preview and actions */}
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="text-slate-400 font-medium self-center text-[11px]">
                      Rubros Principales:
                    </span>
                    {rep.rubroExecutions.map((rx) => (
                      <span
                        key={rx.id}
                        className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono text-[11px]"
                      >
                        Rubro {rx.projectRubro.rubroNumber}: {rx.dayQuantity.toLocaleString('es-EC')} {rx.projectRubro.unit} (${rx.dayAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })})
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/reportes/${rep.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      <span>Ver Detalle</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href={`/reportes/${rep.id}/imprimir`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5 text-orange-400" />
                      <span>Imprimir Formato PDF</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
