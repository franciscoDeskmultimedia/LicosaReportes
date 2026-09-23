'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  DollarSign,
  CloudSun,
  Truck,
  ArrowUpRight,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

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
    projectRubro: {
      rubroNumber: number;
      description: string;
      unit: string;
    };
  }>;
}

export function DailyReportCharts({ reports }: { reports: DailyReportItem[] }) {
  const [activeMetric, setActiveMetric] = useState<'curve' | 'daily' | 'rubros'>('curve');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  if (!reports || reports.length === 0) return null;

  // Sort chronological for charts
  const sortedReports = [...reports].sort((a, b) => a.reportNumber - b.reportNumber);
  const latestReport = sortedReports[sortedReports.length - 1];
  const contractAmount = latestReport?.project?.contractAmount || 5939620.30;

  // Calculate cumulative stats
  const maxDayAmount = Math.max(...sortedReports.map((r) => r.totalExecutedDay), 1000);
  const maxAccumAmount = Math.max(...sortedReports.map((r) => r.totalExecutedAccum), contractAmount * 0.15);

  // Group rubro executions across reports
  const rubroMap: Record<number, { number: number; description: string; unit: string; totalAmount: number; totalQty: number }> = {};
  let totalRubrosExecutedAmount = 0;

  for (const rep of sortedReports) {
    for (const r of rep.rubroExecutions || []) {
      const num = r.projectRubro.rubroNumber;
      if (!rubroMap[num]) {
        rubroMap[num] = {
          number: num,
          description: r.projectRubro.description,
          unit: r.projectRubro.unit,
          totalAmount: 0,
          totalQty: 0,
        };
      }
      rubroMap[num].totalAmount += r.dayAmount;
      rubroMap[num].totalQty += r.dayQuantity;
      totalRubrosExecutedAmount += r.dayAmount;
    }
  }

  const topRubros = Object.values(rubroMap)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 6);

  const colors = [
    '#f97316', // orange-500
    '#0ea5e9', // sky-500
    '#10b981', // emerald-500
    '#8b5cf6', // purple-500
    '#f59e0b', // amber-500
    '#ec4899', // pink-500
  ];

  // SVG Chart dimensions
  const svgWidth = 600;
  const svgHeight = 220;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  // Calculate points for Accumulation Curve
  const points = sortedReports.map((r, i) => {
    const x =
      sortedReports.length > 1
        ? padding.left + (i / (sortedReports.length - 1)) * graphWidth
        : padding.left + graphWidth / 2;
    const y =
      padding.top + graphHeight - (r.totalExecutedAccum / maxAccumAmount) * graphHeight;
    return { x, y, report: r, index: i };
  });

  const pathData =
    points.length > 0
      ? `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}`
      : '';

  const areaData =
    points.length > 0
      ? `${pathData} L ${points[points.length - 1].x},${padding.top + graphHeight} L ${points[0].x},${padding.top + graphHeight} Z`
      : '';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 space-y-6">
      {/* Chart Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm md:text-base">
                Análisis Gráfico de Ejecución & Producción Diaria
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                En Tiempo Real
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Tendencia económica, curvas acumuladas y distribución por rubros de la obra
            </p>
          </div>
        </div>

        {/* View Switcher Buttons */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setActiveMetric('curve')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeMetric === 'curve'
                ? 'bg-white text-orange-600 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Curva Acumulada</span>
          </button>
          <button
            onClick={() => setActiveMetric('daily')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeMetric === 'daily'
                ? 'bg-white text-orange-600 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Producción Diaria ($)</span>
          </button>
          <button
            onClick={() => setActiveMetric('rubros')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeMetric === 'rubros'
                ? 'bg-white text-orange-600 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>Top Rubros</span>
          </button>
        </div>
      </div>

      {/* Metric 1: Curva de Avance Acumulado (Curva S) */}
      {activeMetric === 'curve' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Monto Acumulado Hoy</span>
              <span className="text-base font-black text-slate-900">
                ${latestReport.totalExecutedAccum.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Monto Contractual</span>
              <span className="text-base font-black text-slate-900">
                ${contractAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Avance Físico-Financiero</span>
              <span className="text-base font-black text-emerald-600">
                {latestReport.progressPercentAccum.toFixed(2)}%
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Plazo de Ejecución</span>
              <span className="text-base font-black text-blue-600">
                Día {latestReport.elapsedDays} de {latestReport.totalDays}
              </span>
            </div>
          </div>

          {/* SVG Line / Area Graph */}
          <div className="relative w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-56 select-none"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const y = padding.top + graphHeight * (1 - pct);
                const val = (maxAccumAmount * pct) / 1000;
                return (
                  <g key={idx}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={svgWidth - padding.right}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="9"
                      fill="#94a3b8"
                      className="font-mono"
                    >
                      ${val.toFixed(0)}k
                    </text>
                  </g>
                );
              })}

              {/* Area Under Curve */}
              {areaData && <path d={areaData} fill="url(#curveGradient)" />}

              {/* Curve Line */}
              {pathData && (
                <path
                  d={pathData}
                  fill="none"
                  stroke="#ea580c"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Points */}
              {points.map((pt, idx) => {
                const isHovered = hoveredPoint === idx;
                return (
                  <g
                    key={idx}
                    onMouseEnter={() => setHoveredPoint(idx)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="cursor-pointer transition-all"
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 7 : 4.5}
                      fill={isHovered ? '#ea580c' : '#ffffff'}
                      stroke="#ea580c"
                      strokeWidth={isHovered ? 3 : 2.5}
                      className="transition-all"
                    />
                    {/* Bottom labels */}
                    <text
                      x={pt.x}
                      y={svgHeight - 12}
                      textAnchor="middle"
                      fontSize="9.5"
                      fill="#64748b"
                      fontWeight="bold"
                    >
                      Rep {pt.report.reportNumber}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Floating Card */}
            {hoveredPoint !== null && points[hoveredPoint] && (
              <div
                className="absolute z-10 p-2.5 bg-slate-900 text-white rounded-xl shadow-xl text-[11px] pointer-events-none transform -translate-x-1/2"
                style={{
                  left: `${(points[hoveredPoint].x / svgWidth) * 100}%`,
                  top: `${Math.max(10, (points[hoveredPoint].y / svgHeight) * 100 - 35)}%`,
                }}
              >
                <p className="font-bold text-orange-400">
                  Reporte N° {points[hoveredPoint].report.reportNumber}
                </p>
                <p className="text-slate-300">
                  {new Date(points[hoveredPoint].report.date).toLocaleDateString('es-EC')}
                </p>
                <div className="mt-1 pt-1 border-t border-slate-700 space-y-0.5 font-mono text-[10px]">
                  <div>
                    Acumulado: $
                    {points[hoveredPoint].report.totalExecutedAccum.toLocaleString('es-EC', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-emerald-400">
                    Día: $
                    {points[hoveredPoint].report.totalExecutedDay.toLocaleString('es-EC', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metric 2: Producción Diaria en Dólares ($ por Día) */}
      {activeMetric === 'daily' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Rendimiento Financiero Diario por Reporte de Jornada</span>
            <span className="font-mono text-slate-700 font-bold">
              Máx. Jornada: ${maxDayAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {sortedReports.map((rep) => {
              const heightPct = Math.min(100, Math.max(15, (rep.totalExecutedDay / maxDayAmount) * 100));
              return (
                <div
                  key={rep.id}
                  className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between hover:border-orange-400 transition-all group"
                >
                  <div className="flex items-center justify-between text-[11px] mb-2">
                    <span className="font-bold text-slate-800">Rep {rep.reportNumber}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(rep.date).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  {/* Bar */}
                  <div className="w-full bg-slate-200 h-28 rounded-lg overflow-hidden flex flex-col justify-end p-1">
                    <div
                      className="w-full bg-gradient-to-t from-orange-600 to-amber-400 rounded-md transition-all duration-700 group-hover:from-orange-500 group-hover:to-amber-300"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>

                  <div className="mt-2 text-center">
                    <span className="font-bold text-xs text-slate-900 block font-mono">
                      ${rep.totalExecutedDay.toLocaleString('es-EC', { minimumFractionDigits: 0 })}
                    </span>
                    <span className="text-[10px] text-slate-500">Producción hoy</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Metric 3: Desglose de Inversión por Rubros Viales */}
      {activeMetric === 'rubros' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Rubros Viales con Mayor Ejecución Presupuestaria</span>
            <span className="font-mono text-slate-700 font-bold">
              Total Muestreado: ${totalRubrosExecutedAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Stacked Progress Bar */}
          <div className="w-full h-5 rounded-full overflow-hidden flex shadow-inner bg-slate-100 p-0.5 border border-slate-200">
            {topRubros.map((item, idx) => {
              const pct = totalRubrosExecutedAmount > 0 ? (item.totalAmount / totalRubrosExecutedAmount) * 100 : 0;
              return (
                <div
                  key={item.number}
                  title={`Rubro ${item.number}: ${pct.toFixed(1)}%`}
                  style={{ width: `${pct}%`, backgroundColor: colors[idx % colors.length] }}
                  className="h-full first:rounded-l-full last:rounded-r-full transition-all hover:opacity-90"
                />
              );
            })}
          </div>

          {/* Rubro Breakdown List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {topRubros.map((item, idx) => {
              const pct = totalRubrosExecutedAmount > 0 ? (item.totalAmount / totalRubrosExecutedAmount) * 100 : 0;
              return (
                <div
                  key={item.number}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-3"
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full mt-0.5 flex-shrink-0"
                    style={{ backgroundColor: colors[idx % colors.length] }}
                  />
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800 font-mono">
                        Rubro {item.number}
                      </span>
                      <span className="text-xs font-black text-slate-900 font-mono">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-snug">
                      {item.description}
                    </p>
                    <div className="pt-1 flex items-center justify-between text-[10.5px] text-slate-500">
                      <span>{item.totalQty.toLocaleString('es-EC')} {item.unit}</span>
                      <strong className="text-slate-800 font-mono">
                        ${item.totalAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
