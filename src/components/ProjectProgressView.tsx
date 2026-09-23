'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Calendar,
  Clock,
  DollarSign,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Building2,
  Printer,
  ChevronRight,
  Filter,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { ProjectAccumulatedProgress } from '@/lib/actions/progress';

interface ProjectOption {
  id: string;
  code: string;
  name: string;
  contractAmount: number;
}

export function ProjectProgressView({
  progressData,
  projects,
  selectedProjectId,
}: {
  progressData: ProjectAccumulatedProgress | null;
  projects: ProjectOption[];
  selectedProjectId?: string;
}) {
  const router = useRouter();
  const [rubroFilter, setRubroFilter] = useState<'ALL' | 'PRINCIPAL' | 'ACTIVE' | 'DONE' | 'PENDING'>('ALL');
  const [searchRubro, setSearchRubro] = useState('');

  if (!progressData) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-base font-bold text-slate-800">No se encontraron datos para este proyecto</h2>
        <p className="text-xs text-slate-500 mt-1">Seleccione otra obra para visualizar el avance acumulado.</p>
      </div>
    );
  }

  const { project, summary, rubros, evolution } = progressData;

  // Filter rubros
  const filteredRubros = rubros.filter((r) => {
    const matchesSearch =
      r.description.toLowerCase().includes(searchRubro.toLowerCase()) ||
      r.rubroNumber.toString().includes(searchRubro);

    if (!matchesSearch) return false;

    if (rubroFilter === 'PRINCIPAL') return r.isPrincipal;
    if (rubroFilter === 'ACTIVE') return r.status === 'EN_EJECUCION';
    if (rubroFilter === 'DONE') return r.status === 'COMPLETADO' || r.status === 'SUPERADO';
    if (rubroFilter === 'PENDING') return r.status === 'SIN_INICIAR';
    return true;
  });

  // Calculate S-Curve SVG coordinates
  const svgWidth = 800;
  const svgHeight = 220;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  let polylinePoints = '';
  let areaPoints = '';

  if (evolution.length > 0) {
    const maxVal = Math.max(summary.contractAmount, ...evolution.map((e) => e.totalExecutedAccum), 1);
    const minVal = 0;

    const coords = evolution.map((pt, idx) => {
      const x = padding.left + (idx / Math.max(evolution.length - 1, 1)) * graphWidth;
      const y = padding.top + graphHeight - ((pt.totalExecutedAccum - minVal) / (maxVal - minVal)) * graphHeight;
      return { x, y, pt };
    });

    polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');
    if (coords.length > 0) {
      areaPoints = `${coords[0].x},${padding.top + graphHeight} ${polylinePoints} ${coords[coords.length - 1].x},${padding.top + graphHeight}`;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4 text-orange-600" />
            <span>Control Físico - Financiero Acumulado</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900">
            Avance de Obra Acumulado en el Tiempo
          </h1>
          <p className="text-xs text-slate-500">
            Seguimiento contractual consolidado por proyecto, curva S histórica y balance rubro por rubro
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="no-print inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md shadow-slate-900/10 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Resumen</span>
          </button>
        </div>
      </div>

      {/* Project Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Proyecto Seleccionado:
            </span>
            <span className="font-bold text-slate-800 text-sm">
              [{project.code}] {project.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Cambiar Obra:</span>
          <select
            value={project.id}
            onChange={(e) => router.push(`/avance?projectId=${e.target.value}`)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-orange-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.code}] {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Monto Ejecutado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Avance Financiero
            </span>
            <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="font-mono text-2xl font-black text-slate-900">
              ${summary.totalExecutedAccum.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              de ${summary.contractAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })} contractual
            </p>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-2">
            <div
              className="bg-orange-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, summary.progressPercent)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 pt-1">
            <span>Saldo por ejecutar:</span>
            <span className="font-mono text-slate-700">
              ${summary.remainingAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Card 2: % Avance Físico Acumulado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              % Cumplimiento Obra
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="font-mono text-2xl font-black text-emerald-700">
              {summary.progressPercent.toFixed(2)}%
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Consolidado al Reporte N° {summary.latestReportNumber || 'S/N'}
            </p>
          </div>
          <div className="pt-2 flex items-center gap-1.5 text-[11px]">
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              {summary.reportsCount} reportes diarios
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 font-medium">
              {summary.latestReportDate ? `Último: ${summary.latestReportDate}` : 'Sin emisiones'}
            </span>
          </div>
        </div>

        {/* Card 3: Plazo y Tiempo Transcurrido */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Plazo Contractual
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="font-mono text-2xl font-black text-slate-900">
              {summary.elapsedDays} / {summary.durationDays} <span className="text-xs font-normal text-slate-500">días</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {summary.remainingDays} días de plazo restante
            </p>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-2">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, summary.timeConsumedPercent)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 pt-1">
            <span>Tiempo transcurrido:</span>
            <span className="font-mono text-slate-700">{summary.timeConsumedPercent.toFixed(1)}%</span>
          </div>
        </div>

        {/* Card 4: Rendimiento y Lluvia */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Clima & Rendimiento
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="font-mono text-2xl font-black text-purple-700">
              SPI: {summary.schedulePerformanceIndex.toFixed(2)}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Índice de ejecución vs plazo
            </p>
          </div>
          <div className="pt-2 text-[11px] text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Lluvia perdida acum.:</span>
              <strong className="font-mono text-slate-800">{summary.totalLostRainHours.toFixed(1)} hrs</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Rubros Principales:</span>
              <strong className="font-mono text-slate-800">
                ${summary.principalExecutedAccum.toLocaleString('es-EC', { minimumFractionDigits: 0 })}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* S-Curve / Historical Evolution Over Time Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <span>Curva de Avance Acumulado en el Tiempo (Evolución Histórica)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Progresión del monto acumulado ejecutado ($) en cada jornada de trabajo registrada
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-full bg-orange-600 inline-block" />
              <span>Ejecutado Acumulado ($)</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-0.5 bg-slate-300 inline-block" />
              <span>Monto Contractual</span>
            </span>
          </div>
        </div>

        {evolution.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="min-w-[650px]">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
                {/* Horizontal gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                  const y = padding.top + graphHeight * (1 - pct);
                  const val = summary.contractAmount * pct;
                  return (
                    <g key={i}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={svgWidth - padding.right}
                        y2={y}
                        stroke="#f1f5f9"
                        strokeDasharray={pct === 1 ? '4 4' : 'none'}
                        strokeWidth={1}
                      />
                      <text
                        x={padding.left - 8}
                        y={y + 3}
                        textAnchor="end"
                        fontSize="9"
                        className="fill-slate-400 font-mono"
                      >
                        ${(val / 1000).toFixed(0)}k
                      </text>
                    </g>
                  );
                })}

                {/* Shaded Area */}
                {areaPoints && (
                  <polygon points={areaPoints} className="fill-orange-500/10" />
                )}

                {/* Progress Curve Line */}
                {polylinePoints && (
                  <polyline
                    fill="none"
                    stroke="#ea580c"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylinePoints}
                  />
                )}

                {/* Data Points */}
                {evolution.map((pt, idx) => {
                  const maxVal = Math.max(summary.contractAmount, ...evolution.map((e) => e.totalExecutedAccum), 1);
                  const x = padding.left + (idx / Math.max(evolution.length - 1, 1)) * graphWidth;
                  const y = padding.top + graphHeight - (pt.totalExecutedAccum / maxVal) * graphHeight;

                  return (
                    <g key={idx} className="group">
                      <circle
                        cx={x}
                        cy={y}
                        r="4"
                        className="fill-white stroke-orange-600 stroke-2 hover:r-6 transition-all cursor-pointer"
                      />
                      <text
                        x={x}
                        y={padding.top + graphHeight + 18}
                        textAnchor="middle"
                        fontSize="9"
                        className="fill-slate-500 font-medium"
                      >
                        {pt.formattedDate}
                      </text>
                      <text
                        x={x}
                        y={padding.top + graphHeight + 30}
                        textAnchor="middle"
                        fontSize="8"
                        className="fill-slate-400 font-mono"
                      >
                        Rep.{pt.reportNumber}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs italic">
            No se han registrado reportes diarios aún para trazar la curva acumulada de este proyecto.
          </div>
        )}
      </div>

      {/* Rubros Section Header & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-600" />
              <span>Balance Acumulado Rubro por Rubro</span>
            </h2>
            <p className="text-xs text-slate-500">
              Contraste de cantidades contractuales vigentes contra volúmenes ejecutados a la fecha
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Buscar rubro por número o texto..."
              value={searchRubro}
              onChange={(e) => setSearchRubro(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-56 focus:ring-1 focus:ring-orange-500"
            />

            <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[11px] font-semibold text-slate-600">
              <button
                onClick={() => setRubroFilter('ALL')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  rubroFilter === 'ALL' ? 'bg-white shadow-xs text-orange-600 font-bold' : 'hover:text-slate-900'
                }`}
              >
                Todos ({rubros.length})
              </button>
              <button
                onClick={() => setRubroFilter('PRINCIPAL')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  rubroFilter === 'PRINCIPAL' ? 'bg-white shadow-xs text-orange-600 font-bold' : 'hover:text-slate-900'
                }`}
              >
                Principales
              </button>
              <button
                onClick={() => setRubroFilter('ACTIVE')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  rubroFilter === 'ACTIVE' ? 'bg-white shadow-xs text-orange-600 font-bold' : 'hover:text-slate-900'
                }`}
              >
                En Ejecución
              </button>
              <button
                onClick={() => setRubroFilter('DONE')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  rubroFilter === 'DONE' ? 'bg-white shadow-xs text-orange-600 font-bold' : 'hover:text-slate-900'
                }`}
              >
                Completados
              </button>
            </div>
          </div>
        </div>

        {/* Detailed Rubros Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[10.5px] uppercase tracking-wider">
                <th className="py-3 px-3">N°</th>
                <th className="py-3 px-3">Descripción del Rubro</th>
                <th className="py-3 px-2 text-center">Unid.</th>
                <th className="py-3 px-2 text-right">P. Unit.</th>
                <th className="py-3 px-3 text-right">Cant. Contractual</th>
                <th className="py-3 px-3 text-right bg-orange-50/50 text-orange-900 font-bold">Cant. Acumulada</th>
                <th className="py-3 px-3 text-right">Monto Acum. ($)</th>
                <th className="py-3 px-3 text-right">Saldo por Ejecutar</th>
                <th className="py-3 px-4 min-w-[140px]">% Avance Físico</th>
                <th className="py-3 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRubros.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                    No se encontraron rubros que coincidan con el filtro seleccionado.
                  </td>
                </tr>
              ) : (
                filteredRubros.map((row) => {
                  const isDone = row.status === 'COMPLETADO' || row.status === 'SUPERADO';
                  const inProgress = row.status === 'EN_EJECUCION';

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-orange-600">
                        {row.rubroNumber}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 max-w-sm">
                        <div className="flex items-center gap-1.5">
                          <span>{row.description}</span>
                          {row.isPrincipal && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-orange-100 text-orange-800 font-bold uppercase flex-shrink-0">
                              Principal
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-500">
                        {row.unit}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                        ${row.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                        {row.currentQuantity.toLocaleString('es-EC', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-orange-600 bg-orange-50/30">
                        {row.accumQuantity.toLocaleString('es-EC', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        ${row.accumAmount.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        ${row.remainingAmount.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="block text-[10px] text-slate-400">
                          {row.remainingQuantity.toLocaleString('es-EC', { maximumFractionDigits: 2 })} {row.unit}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                            <span className={isDone ? 'text-emerald-700' : inProgress ? 'text-blue-700' : 'text-slate-400'}>
                              {row.progressPercent.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isDone
                                  ? 'bg-emerald-500'
                                  : inProgress
                                  ? 'bg-blue-600'
                                  : 'bg-slate-300'
                              }`}
                              style={{ width: `${Math.min(100, row.progressPercent)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isDone
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : inProgress
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}
                        >
                          {row.status === 'SUPERADO'
                            ? 'Superado'
                            : row.status === 'COMPLETADO'
                            ? 'Completado'
                            : row.status === 'EN_EJECUCION'
                            ? 'En Proceso'
                            : 'Sin Iniciar'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
