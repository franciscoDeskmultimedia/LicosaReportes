'use client';

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Receipt,
  Calendar,
  Layers,
  ChevronDown,
  Info,
  SlidersHorizontal,
  DollarSign,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

export interface DynamicReportPoint {
  reportNumber: number;
  date: string | Date;
  totalExecutedDay: number;
  totalExecutedAccum: number;
  elapsedDays?: number;
}

export interface DynamicExpensePoint {
  date: string | Date;
  total: number;
  description?: string;
  supplier?: string;
}

interface ProjectDynamicCurvesProps {
  reports: DynamicReportPoint[];
  expenses?: DynamicExpensePoint[];
  contractAmount: number;
  initialWindow?: '7' | '15' | '30' | 'all';
}

export function ProjectDynamicCurves({
  reports,
  expenses = [],
  contractAmount,
  initialWindow = '7',
}: ProjectDynamicCurvesProps) {
  // Controles dinámicos
  const [windowRange, setWindowRange] = useState<'7' | '15' | '30' | 'all'>(initialWindow);
  const [showCosts, setShowCosts] = useState<boolean>(expenses.length > 0);
  const [viewMetric, setViewMetric] = useState<'accumulated' | 'daily'>('accumulated');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Orden cronológico ascendente de los reportes
  const sortedReports = useMemo(() => {
    return [...reports].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [reports]);

  // Recorte según la ventana seleccionada (por defecto los últimos 7 reportes para máxima legibilidad)
  const visibleReports = useMemo(() => {
    if (windowRange === '7') return sortedReports.slice(-7);
    if (windowRange === '15') return sortedReports.slice(-15);
    if (windowRange === '30') return sortedReports.slice(-30);
    return sortedReports;
  }, [sortedReports, windowRange]);

  // Normalizar fechas de gastos para búsqueda rápida
  const expensesWithIso = useMemo(() => {
    return expenses.map((e) => {
      const d = new Date(e.date);
      const iso = isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
      return {
        ...e,
        isoDate: iso,
        amount: Number(e.total) || 0,
      };
    });
  }, [expenses]);

  // Procesamiento de datos combinados por cada reporte visible
  const plotData = useMemo(() => {
    return visibleReports.map((rep) => {
      const repDateObj = new Date(rep.date);
      const repIso = isNaN(repDateObj.getTime())
        ? ''
        : repDateObj.toISOString().split('T')[0];

      // Costos acumulados hasta la fecha de este reporte
      const expensesAccum = expensesWithIso
        .filter((e) => e.isoDate && e.isoDate <= repIso)
        .reduce((sum, e) => sum + e.amount, 0);

      // Costos del mismo día del reporte
      const expensesDay = expensesWithIso
        .filter((e) => e.isoDate === repIso)
        .reduce((sum, e) => sum + e.amount, 0);

      const executedAccum = Number(rep.totalExecutedAccum) || 0;
      const executedDay = Number(rep.totalExecutedDay) || 0;

      const marginAccum = executedAccum - expensesAccum;
      const marginPercent =
        executedAccum > 0 ? (marginAccum / executedAccum) * 100 : 0;

      const formattedDate = !isNaN(repDateObj.getTime())
        ? repDateObj.toLocaleDateString('es-EC', {
            day: '2-digit',
            month: 'short',
          })
        : String(rep.date);

      const fullFormattedDate = !isNaN(repDateObj.getTime())
        ? repDateObj.toLocaleDateString('es-EC', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : String(rep.date);

      return {
        reportNumber: rep.reportNumber,
        date: rep.date,
        isoDate: repIso,
        formattedDate,
        fullFormattedDate,
        elapsedDays: rep.elapsedDays,
        executedAccum,
        executedDay,
        expensesAccum,
        expensesDay,
        marginAccum,
        marginPercent,
      };
    });
  }, [visibleReports, expensesWithIso]);

  // Resumen del período visible
  const periodSummary = useMemo(() => {
    if (plotData.length === 0) {
      return {
        periodBilled: 0,
        periodCosts: 0,
        periodMargin: 0,
        avgDailyBilled: 0,
      };
    }

    const last = plotData[plotData.length - 1];
    const periodBilled = plotData.reduce((sum, d) => sum + d.executedDay, 0);
    const periodCosts = plotData.reduce((sum, d) => sum + d.expensesDay, 0);
    const periodMargin = periodBilled - periodCosts;
    const avgDailyBilled = periodBilled / Math.max(plotData.length, 1);

    return {
      periodBilled,
      periodCosts,
      periodMargin,
      avgDailyBilled,
      latestAccumBilled: last.executedAccum,
      latestAccumCosts: last.expensesAccum,
    };
  }, [plotData]);

  // Dimensiones del gráfico SVG
  const svgWidth = 840;
  const svgHeight = 250;
  const padding = { top: 30, right: 35, bottom: 45, left: 65 };
  const graphW = svgWidth - padding.left - padding.right;
  const graphH = svgHeight - padding.top - padding.bottom;

  // Escala máxima en Y
  const maxValY = useMemo(() => {
    if (plotData.length === 0) return 1000;

    if (viewMetric === 'accumulated') {
      const maxExec = Math.max(...plotData.map((d) => d.executedAccum), 1);
      const maxCost = showCosts
        ? Math.max(...plotData.map((d) => d.expensesAccum), 0)
        : 0;
      const ceiling = Math.max(maxExec, maxCost, 1000);
      return ceiling * 1.15;
    } else {
      const maxExecDay = Math.max(...plotData.map((d) => d.executedDay), 1);
      const maxCostDay = showCosts
        ? Math.max(...plotData.map((d) => d.expensesDay), 0)
        : 0;
      return Math.max(maxExecDay, maxCostDay, 100) * 1.2;
    }
  }, [plotData, viewMetric, showCosts]);

  // Coordenadas calculadas
  const coords = useMemo(() => {
    if (plotData.length === 0) return { executed: [], costs: [] };

    const n = plotData.length;
    const xStep = n > 1 ? graphW / (n - 1) : graphW / 2;

    const executed = plotData.map((d, i) => {
      const x = padding.left + (n > 1 ? i * xStep : graphW / 2);
      const val = viewMetric === 'accumulated' ? d.executedAccum : d.executedDay;
      const y = padding.top + graphH - (val / maxValY) * graphH;
      return { x, y, data: d };
    });

    const costs = plotData.map((d, i) => {
      const x = padding.left + (n > 1 ? i * xStep : graphW / 2);
      const val = viewMetric === 'accumulated' ? d.expensesAccum : d.expensesDay;
      const y = padding.top + graphH - (val / maxValY) * graphH;
      return { x, y, data: d };
    });

    return { executed, costs };
  }, [plotData, maxValY, viewMetric, graphW, graphH, padding]);

  const polylineExecuted = coords.executed.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaExecuted =
    coords.executed.length > 0
      ? `${polylineExecuted} L ${coords.executed[coords.executed.length - 1].x},${padding.top + graphH} L ${coords.executed[0].x},${padding.top + graphH} Z`
      : '';

  const polylineCosts = coords.costs.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaCosts =
    coords.costs.length > 0 && showCosts
      ? `${polylineCosts} L ${coords.costs[coords.costs.length - 1].x},${padding.top + graphH} L ${coords.costs[0].x},${padding.top + graphH} Z`
      : '';

  function formatYAxis(val: number) {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
    return `$${val.toFixed(0)}`;
  }

  if (reports.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <TrendingUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <h4 className="font-bold text-slate-700 text-xs">Sin reportes registrados</h4>
        <p className="text-[11px] text-slate-500">
          La curva de evolución se habilitará cuando se registren los reportes diarios de la obra.
        </p>
      </div>
    );
  }

  const activePoint = hoveredIndex !== null ? coords.executed[hoveredIndex] : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
      {/* Barra de título y controles dinámicos */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              Curvas de Evolución & Desempeño
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              {plotData.length} reportes visualizados
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Planillaje ejecutado acumulado vs. Costos reales de obra
          </p>
        </div>

        {/* Controles dinámicos */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Rango (Por defecto: Últimos 7 reportes) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200/80">
            <button
              type="button"
              onClick={() => setWindowRange('7')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                windowRange === '7'
                  ? 'bg-white text-emerald-800 font-extrabold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Últimos 7
            </button>
            <button
              type="button"
              onClick={() => setWindowRange('15')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                windowRange === '15'
                  ? 'bg-white text-emerald-800 font-extrabold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              15
            </button>
            <button
              type="button"
              onClick={() => setWindowRange('30')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                windowRange === '30'
                  ? 'bg-white text-emerald-800 font-extrabold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              30
            </button>
            <button
              type="button"
              onClick={() => setWindowRange('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                windowRange === 'all'
                  ? 'bg-white text-emerald-800 font-extrabold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Todos ({sortedReports.length})
            </button>
          </div>

          {/* Toggle de Curva de Costos */}
          <button
            type="button"
            onClick={() => setShowCosts(!showCosts)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              showCosts
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
            title="Activar o desactivar la curva comparativa de costos de obra"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Curva de Costos</span>
            <span
              className={`w-2 h-2 rounded-full ${
                showCosts ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            />
          </button>

          {/* Modo: Acumulado vs Por Jornada */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMetric('accumulated')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                viewMetric === 'accumulated'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Acumulado
            </button>
            <button
              type="button"
              onClick={() => setViewMetric('daily')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                viewMetric === 'daily'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Por Día
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards de la ventana visualizada */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-xl p-3">
          <span className="text-[10px] uppercase font-bold text-emerald-800 block">
            Planillaje en Ventana
          </span>
          <span className="text-base font-extrabold text-emerald-950 font-mono block mt-0.5">
            ${periodSummary.periodBilled.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-emerald-700 block">
            Promedio: ${periodSummary.avgDailyBilled.toLocaleString('es-EC', { maximumFractionDigits: 0 })}/día
          </span>
        </div>

        {showCosts ? (
          <div className="bg-indigo-50/50 border border-indigo-200/60 rounded-xl p-3">
            <span className="text-[10px] uppercase font-bold text-indigo-800 block">
              Costos en Ventana
            </span>
            <span className="text-base font-extrabold text-indigo-950 font-mono block mt-0.5">
              ${periodSummary.periodCosts.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-indigo-700 block">
              {expenses.length} comprobantes registrados
            </span>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Presupuesto Obra
            </span>
            <span className="text-base font-extrabold text-slate-900 font-mono block mt-0.5">
              ${contractAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-500 block">
              Monto Contractual Vigente
            </span>
          </div>
        )}

        {showCosts ? (
          <div
            className={`border rounded-xl p-3 ${
              periodSummary.periodMargin >= 0
                ? 'bg-teal-50/50 border-teal-200/60'
                : 'bg-rose-50/50 border-rose-200/60'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-slate-600 block">
              Margen Bruto Ventana
            </span>
            <span
              className={`text-base font-extrabold font-mono block mt-0.5 ${
                periodSummary.periodMargin >= 0 ? 'text-teal-900' : 'text-rose-700'
              }`}
            >
              {periodSummary.periodMargin >= 0 ? '+' : ''}$
              {periodSummary.periodMargin.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {periodSummary.periodBilled > 0
                ? `${((periodSummary.periodMargin / periodSummary.periodBilled) * 100).toFixed(1)}% de rentabilidad`
                : 'Sin facturación'}
            </span>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Último Acumulado
            </span>
            <span className="text-base font-extrabold text-slate-900 font-mono block mt-0.5">
              ${periodSummary.latestAccumBilled?.toLocaleString('es-EC', { minimumFractionDigits: 2 }) || '0.00'}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold block">
              {contractAmount > 0
                ? `${(((periodSummary.latestAccumBilled || 0) / contractAmount) * 100).toFixed(1)}% ejecutado`
                : ''}
            </span>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Leyenda Curvas
            </span>
            <div className="space-y-1 mt-1 text-[11px] font-semibold">
              <div className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span>{viewMetric === 'accumulated' ? 'Planillaje Acumulado' : 'Facturado Día'}</span>
              </div>
              {showCosts && (
                <div className="flex items-center gap-1.5 text-indigo-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <span>{viewMetric === 'accumulated' ? 'Costos Acumulados' : 'Costo del Día'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SVG del Gráfico Dinámico */}
      <div className="relative overflow-x-auto pt-2">
        <div className="min-w-[620px]">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible select-none"
          >
            <defs>
              <linearGradient id="gradientExecuted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="gradientCosts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Líneas horizontales de cuadrícula */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
              const y = padding.top + graphH * (1 - pct);
              const val = maxValY * pct;
              return (
                <g key={idx}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={svgWidth - padding.right}
                    y2={y}
                    stroke="#f1f5f9"
                    strokeWidth={1}
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="9.5"
                    className="fill-slate-400 font-mono"
                  >
                    {formatYAxis(val)}
                  </text>
                </g>
              );
            })}

            {/* Área sombreada bajo la curva de costos */}
            {showCosts && areaCosts && (
              <polygon points={areaCosts} fill="url(#gradientCosts)" />
            )}

            {/* Área sombreada bajo la curva de planillaje */}
            {areaExecuted && (
              <polygon points={areaExecuted} fill="url(#gradientExecuted)" />
            )}

            {/* Línea de Costos (si está activa) */}
            {showCosts && polylineCosts && (
              <polyline
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeDasharray="4 2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylineCosts}
              />
            )}

            {/* Línea de Planillaje Ejecutado */}
            {polylineExecuted && (
              <polyline
                fill="none"
                stroke="#059669"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylineExecuted}
              />
            )}

            {/* Puntos y etiquetas en el eje X */}
            {coords.executed.map((pt, idx) => {
              const isHovered = hoveredIndex === idx;
              const costPt = coords.costs[idx];

              return (
                <g
                  key={idx}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="cursor-pointer"
                >
                  {/* Línea vertical de guía al pasar el mouse */}
                  {isHovered && (
                    <line
                      x1={pt.x}
                      y1={padding.top}
                      x2={pt.x}
                      y2={padding.top + graphH}
                      stroke="#059669"
                      strokeWidth={1}
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Punto de Costos */}
                  {showCosts && costPt && (
                    <circle
                      cx={costPt.x}
                      cy={costPt.y}
                      r={isHovered ? 6 : 3.5}
                      className="fill-white stroke-indigo-600 stroke-2 transition-all duration-150"
                    />
                  )}

                  {/* Punto de Planillaje */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 6.5 : 4.5}
                    className="fill-white stroke-emerald-600 stroke-2.5 transition-all duration-150"
                  />

                  {/* Etiqueta Fecha */}
                  <text
                    x={pt.x}
                    y={padding.top + graphH + 18}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight={isHovered ? 'bold' : 'normal'}
                    className={isHovered ? 'fill-slate-900 font-bold' : 'fill-slate-600'}
                  >
                    {pt.data.formattedDate}
                  </text>

                  {/* Etiqueta N° Reporte */}
                  <text
                    x={pt.x}
                    y={padding.top + graphH + 32}
                    textAnchor="middle"
                    fontSize="9"
                    className="fill-slate-400 font-mono"
                  >
                    R.{pt.data.reportNumber}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Tooltip flotante interactivo */}
        {activePoint && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900 text-white rounded-xl shadow-xl p-3 text-xs space-y-1.5 transition-all duration-75 border border-slate-700 min-w-[210px]"
            style={{
              left: `${Math.min(
                Math.max(10, (activePoint.x / svgWidth) * 100),
                75
              )}%`,
              top: '15px',
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-white">
                Reporte N° {activePoint.data.reportNumber}
              </span>
              <span className="text-[10px] text-slate-400">
                {activePoint.data.fullFormattedDate}
              </span>
            </div>

            <div className="space-y-1 pt-0.5">
              <div className="flex justify-between items-center text-emerald-400">
                <span>
                  {viewMetric === 'accumulated' ? 'Planillaje Acum:' : 'Facturación Día:'}
                </span>
                <span className="font-mono font-bold">
                  $
                  {(viewMetric === 'accumulated'
                    ? activePoint.data.executedAccum
                    : activePoint.data.executedDay
                  ).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {showCosts && (
                <div className="flex justify-between items-center text-indigo-300">
                  <span>
                    {viewMetric === 'accumulated' ? 'Costos Acum:' : 'Costo del Día:'}
                  </span>
                  <span className="font-mono font-bold">
                    $
                    {(viewMetric === 'accumulated'
                      ? activePoint.data.expensesAccum
                      : activePoint.data.expensesDay
                    ).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {showCosts && viewMetric === 'accumulated' && (
                <div className="flex justify-between items-center text-slate-300 border-t border-slate-800 pt-1 text-[11px]">
                  <span>Margen acumulado:</span>
                  <span
                    className={`font-mono font-bold ${
                      activePoint.data.marginAccum >= 0 ? 'text-teal-400' : 'text-rose-400'
                    }`}
                  >
                    {activePoint.data.marginAccum >= 0 ? '+' : ''}$
                    {activePoint.data.marginAccum.toLocaleString('es-EC', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    ({activePoint.data.marginPercent.toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
