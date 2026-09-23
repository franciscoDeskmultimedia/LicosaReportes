'use client';

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  DollarSign,
  CloudRain,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

export interface DailyReportItem {
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
  project: {
    id: string;
    code: string;
    name: string;
    contractAmount: number;
  };
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
}

export function AdvancedRoadCharts({ reports }: { reports: DailyReportItem[] }) {
  const [activeTab, setActiveTab] = useState<'curvaS' | 'produccion' | 'especialidades'>('curvaS');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  if (!reports || reports.length === 0) return null;

  // Chronological sort
  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [reports]);

  const latestReport = sortedReports[sortedReports.length - 1];
  const contractAmount = latestReport?.project?.contractAmount || 5939620.30;
  const totalDays = latestReport?.totalDays || 240;

  // 1. Calculations for Curva S (Programmed vs Real)
  // Standard road civil works S-curve baseline formulation:
  // Cumulative planned % = 100 * (1 / (1 + exp(-k * (t - t0)))) or polynomial S-curve
  const curvaSData = useMemo(() => {
    const data = sortedReports.map((r) => {
      const t = r.elapsedDays;
      const progressRatio = t / totalDays;
      // Classic smooth S-curve sigmoid formula for civil engineering planned baseline:
      // Planned percent starts gently, accelerates mid-contract, tapers at completion
      const plannedPercent = Math.min(
        100,
        Math.max(
          0.5,
          100 / (1 + Math.exp(-8 * (progressRatio - 0.45)))
        )
      );
      const plannedAccumAmount = (contractAmount * plannedPercent) / 100;
      const realAccumAmount = r.totalExecutedAccum;
      const realPercent = (realAccumAmount / contractAmount) * 100;
      const varianceAmount = realAccumAmount - plannedAccumAmount;
      const variancePercent = realPercent - plannedPercent;

      return {
        reportNumber: r.reportNumber,
        date: r.date,
        elapsedDays: r.elapsedDays,
        roadSection: r.roadSection,
        plannedPercent: Number(plannedPercent.toFixed(2)),
        plannedAccumAmount,
        realPercent: Number(realPercent.toFixed(2)),
        realAccumAmount,
        varianceAmount,
        variancePercent: Number(variancePercent.toFixed(2)),
        dayAmount: r.totalExecutedDay,
        lostRainHours: r.lostRainHoursDay || 0,
      };
    });

    return data;
  }, [sortedReports, contractAmount, totalDays]);

  // 2. Calculations for Daily Production & 3-Period Moving Average
  const productionData = useMemo(() => {
    return sortedReports.map((r, i, arr) => {
      // 3-point moving average (previous, current, next or prior window)
      const windowStart = Math.max(0, i - 2);
      const window = arr.slice(windowStart, i + 1);
      const movingAvg = window.reduce((sum, item) => sum + item.totalExecutedDay, 0) / window.length;

      return {
        reportNumber: r.reportNumber,
        date: r.date,
        dayAmount: r.totalExecutedDay,
        movingAvg: Math.round(movingAvg),
        lostRainHours: r.lostRainHoursDay || 0,
      };
    });
  }, [sortedReports]);

  // 3. Specialty Categorization (Civil Road Works Breakdown)
  const specialtyData = useMemo(() => {
    let tierras = 0;
    let pavimentos = 0;
    let drenaje = 0;
    let senalizacion = 0;
    let otros = 0;

    for (const rep of sortedReports) {
      for (const exec of rep.rubroExecutions || []) {
        const desc = exec.projectRubro?.description?.toLowerCase() || '';
        const num = exec.projectRubro?.rubroNumber || 0;
        const amt = exec.dayAmount;

        if (desc.includes('excavaci') || desc.includes('desbroce') || desc.includes('relleno') || desc.includes('transporte') || num <= 10) {
          tierras += amt;
        } else if (desc.includes('asf') || desc.includes('carpeta') || desc.includes('imprimaci') || desc.includes('sub-base') || desc.includes('base') || desc.includes('mezcla')) {
          pavimentos += amt;
        } else if (desc.includes('alcantarilla') || desc.includes('cuneta') || desc.includes('hormig') || desc.includes('dren') || desc.includes('cabezal')) {
          drenaje += amt;
        } else if (desc.includes('seña') || desc.includes('pintura') || desc.includes('tachas') || desc.includes('ambiental') || desc.includes('guardav')) {
          senalizacion += amt;
        } else {
          otros += amt;
        }
      }
    }

    const total = tierras + pavimentos + drenaje + senalizacion + otros;
    return [
      { name: 'Movimiento de Tierras & Explanaciones', amount: tierras, color: '#f97316', bgClass: 'bg-orange-500' },
      { name: 'Estructura de Pavimento & Asfalto', amount: pavimentos, color: '#0ea5e9', bgClass: 'bg-sky-500' },
      { name: 'Obras de Arte, Drenaje & Hormigones', amount: drenaje, color: '#10b981', bgClass: 'bg-emerald-500' },
      { name: 'Señalización, Seguridad & Ambiental', amount: senalizacion, color: '#8b5cf6', bgClass: 'bg-purple-500' },
    ].map((item) => ({
      ...item,
      percentage: total > 0 ? (item.amount / total) * 100 : 0,
    }));
  }, [sortedReports]);

  // Dimensions for SVG Graphs
  const svgWidth = 650;
  const svgHeight = 240;
  const pad = { top: 25, right: 35, bottom: 45, left: 65 };
  const chartW = svgWidth - pad.left - pad.right;
  const chartH = svgHeight - pad.top - pad.bottom;

  // Max values for Curva S
  const maxCurvaAmount = Math.max(
    ...curvaSData.map((d) => Math.max(d.realAccumAmount, d.plannedAccumAmount)),
    1000
  ) * 1.15;

  // Helper for Curva S points
  const pointsCurvaReal = curvaSData.map((d, i) => {
    const x =
      curvaSData.length > 1
        ? pad.left + (i / (curvaSData.length - 1)) * chartW
        : pad.left + chartW / 2;
    const y = pad.top + chartH - (d.realAccumAmount / maxCurvaAmount) * chartH;
    return { x, y, data: d, index: i };
  });

  const pointsCurvaPlanned = curvaSData.map((d, i) => {
    const x =
      curvaSData.length > 1
        ? pad.left + (i / (curvaSData.length - 1)) * chartW
        : pad.left + chartW / 2;
    const y = pad.top + chartH - (d.plannedAccumAmount / maxCurvaAmount) * chartH;
    return { x, y };
  });

  // Smooth bezier curve path generator
  const createSmoothPath = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
    let path = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return path;
  };

  const realPathString = createSmoothPath(pointsCurvaReal);
  const plannedPathString = createSmoothPath(pointsCurvaPlanned);

  const realAreaString =
    pointsCurvaReal.length > 0
      ? `${realPathString} L ${pointsCurvaReal[pointsCurvaReal.length - 1].x},${pad.top + chartH} L ${pointsCurvaReal[0].x},${pad.top + chartH} Z`
      : '';

  // Max value for Daily Production
  const maxDayProd = Math.max(
    ...productionData.map((p) => Math.max(p.dayAmount, p.movingAvg)),
    1000
  ) * 1.15;

  const lastVariance = curvaSData[curvaSData.length - 1]?.varianceAmount || 0;
  const isAheadOfSchedule = lastVariance >= 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 space-y-6">
      {/* Header and Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-orange-100 text-orange-700 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-black text-slate-900 text-base md:text-lg tracking-tight">
                Tablero de Control Gráfico Vial & Curva S
              </h3>
              <p className="text-xs text-slate-500">
                Línea base contractual, holguras de cronograma y tendencia de producción de la obra
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto border border-slate-200">
          <button
            onClick={() => setActiveTab('curvaS')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'curvaS'
                ? 'bg-white text-orange-600 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Curva S (Programado vs Real)</span>
          </button>
          <button
            onClick={() => setActiveTab('produccion')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'produccion'
                ? 'bg-white text-orange-600 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Producción & Media Móvil</span>
          </button>
          <button
            onClick={() => setActiveTab('especialidades')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'especialidades'
                ? 'bg-white text-orange-600 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>Especialidades Viales</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: CURVA S PROGRAMADO VS REAL */}
      {activeTab === 'curvaS' && (
        <div className="space-y-4">
          {/* Executive KPI indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-semibold block text-[11px]">Avance Real Acumulado</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-black text-slate-900 font-mono">
                  ${latestReport.totalExecutedAccum.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <span className="text-[10px] text-emerald-600 font-bold">
                {latestReport.progressPercentAccum.toFixed(2)}% del contrato
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-semibold block text-[11px]">Línea Base Programada</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-black text-blue-900 font-mono">
                  ${(curvaSData[curvaSData.length - 1]?.plannedAccumAmount || 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <span className="text-[10px] text-blue-600 font-bold">
                {curvaSData[curvaSData.length - 1]?.plannedPercent}% programado a la fecha
              </span>
            </div>

            <div className={`p-3.5 rounded-xl border ${isAheadOfSchedule ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'}`}>
              <span className={`font-semibold block text-[11px] ${isAheadOfSchedule ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isAheadOfSchedule ? 'Desviación Favorable (Holgura)' : 'Desviación Crítica (Atraso)'}
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                {isAheadOfSchedule ? (
                  <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-rose-600" />
                )}
                <span className={`text-lg font-black font-mono ${isAheadOfSchedule ? 'text-emerald-800' : 'text-rose-800'}`}>
                  {isAheadOfSchedule ? '+' : ''}${lastVariance.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <span className={`text-[10px] font-bold ${isAheadOfSchedule ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isAheadOfSchedule ? 'Ritmo superior al cronograma' : 'Requiere aceleración de frentes'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-semibold block text-[11px]">Horizonte Temporal</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg font-black text-slate-900 font-mono">Día {latestReport.elapsedDays}</span>
                <span className="text-xs text-slate-500">/ {totalDays} días</span>
              </div>
              <span className="text-[10px] text-slate-500">
                Plazo contractual vigente
              </span>
            </div>
          </div>

          {/* SVG Curva S Graph */}
          <div className="relative w-full overflow-x-auto bg-slate-50/50 p-4 rounded-xl border border-slate-200">
            {/* Legend */}
            <div className="flex items-center justify-end gap-5 text-xs mb-2">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-1 bg-orange-600 rounded-full inline-block" />
                <span className="font-bold text-slate-800">Curva S Ejecutada Real</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-1 border-t-2 border-dashed border-blue-500 inline-block" />
                <span className="font-semibold text-slate-600">Curva S Programada (Baseline)</span>
              </div>
            </div>

            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-64 select-none"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="realGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.30" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const y = pad.top + chartH * (1 - pct);
                const val = (maxCurvaAmount * pct) / 1000;
                return (
                  <g key={idx}>
                    <line
                      x1={pad.left}
                      y1={y}
                      x2={svgWidth - pad.right}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={pad.left - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="9.5"
                      fill="#64748b"
                      className="font-mono"
                    >
                      ${val.toFixed(0)}k
                    </text>
                  </g>
                );
              })}

              {/* Area Under Real Curve */}
              {realAreaString && <path d={realAreaString} fill="url(#realGradient)" />}

              {/* Planned Baseline Curve (Dashed Blue) */}
              {plannedPathString && (
                <path
                  d={plannedPathString}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                />
              )}

              {/* Real Executed Curve (Solid Orange) */}
              {realPathString && (
                <path
                  d={realPathString}
                  fill="none"
                  stroke="#ea580c"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Points */}
              {pointsCurvaReal.map((pt, idx) => {
                const isHovered = hoveredPointIndex === idx;
                return (
                  <g
                    key={idx}
                    onMouseEnter={() => setHoveredPointIndex(idx)}
                    onMouseLeave={() => setHoveredPointIndex(null)}
                    className="cursor-pointer"
                  >
                    {/* Vertical guideline on hover */}
                    {isHovered && (
                      <line
                        x1={pt.x}
                        y1={pad.top}
                        x2={pt.x}
                        y2={pad.top + chartH}
                        stroke="#f97316"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                    )}

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
                      Rep {pt.data.reportNumber}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Floating Details Card */}
            {hoveredPointIndex !== null && pointsCurvaReal[hoveredPointIndex] && (
              <div
                className="absolute z-20 p-3 bg-slate-900 text-white rounded-xl shadow-2xl text-xs pointer-events-none transform -translate-x-1/2 border border-slate-700 min-w-[210px]"
                style={{
                  left: `${(pointsCurvaReal[hoveredPointIndex].x / svgWidth) * 100}%`,
                  top: `${Math.max(10, (pointsCurvaReal[hoveredPointIndex].y / svgHeight) * 100 - 30)}%`,
                }}
              >
                <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-1.5">
                  <span className="font-bold text-orange-400">
                    Reporte N° {pointsCurvaReal[hoveredPointIndex].data.reportNumber}
                  </span>
                  <span className="text-[10px] text-slate-300 font-mono">
                    Día {pointsCurvaReal[hoveredPointIndex].data.elapsedDays}
                  </span>
                </div>

                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Real Acum.:</span>
                    <strong className="text-orange-400">
                      ${pointsCurvaReal[hoveredPointIndex].data.realAccumAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Prog. Acum.:</span>
                    <span className="text-blue-300">
                      ${pointsCurvaReal[hoveredPointIndex].data.plannedAccumAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-1">
                    <span className="text-slate-400">Desviación:</span>
                    <span
                      className={`font-bold ${
                        pointsCurvaReal[hoveredPointIndex].data.varianceAmount >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {pointsCurvaReal[hoveredPointIndex].data.varianceAmount >= 0 ? '+' : ''}$
                      {pointsCurvaReal[hoveredPointIndex].data.varianceAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Producción Jornada:</span>
                    <span className="text-slate-200">
                      ${pointsCurvaReal[hoveredPointIndex].data.dayAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: PRODUCCIÓN DIARIA & MEDIA MÓVIL DE RENDIMIENTO */}
      {activeTab === 'produccion' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
            <span>
              Monto ejecutado por jornada con línea de tendencia (Media Móvil de 3 períodos para suavizar picos)
            </span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-orange-500 rounded-sm" />
                <span className="text-slate-700 font-semibold">Producción Día ($)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-blue-600 rounded-full" />
                <span className="text-slate-700 font-semibold">Media Móvil (3 días)</span>
              </div>
            </div>
          </div>

          {/* SVG Daily Production + Trendline Graph */}
          <div className="relative w-full overflow-x-auto bg-slate-50/50 p-4 rounded-xl border border-slate-200">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-64 select-none"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const y = pad.top + chartH * (1 - pct);
                const val = (maxDayProd * pct) / 1000;
                return (
                  <g key={idx}>
                    <line
                      x1={pad.left}
                      y1={y}
                      x2={svgWidth - pad.right}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={pad.left - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="9.5"
                      fill="#64748b"
                      className="font-mono"
                    >
                      ${val.toFixed(1)}k
                    </text>
                  </g>
                );
              })}

              {/* Bars for Daily Production */}
              {productionData.map((d, i) => {
                const colWidth = Math.min(36, (chartW / productionData.length) * 0.55);
                const xCenter =
                  productionData.length > 1
                    ? pad.left + (i / (productionData.length - 1)) * chartW
                    : pad.left + chartW / 2;
                const barHeight = (d.dayAmount / maxDayProd) * chartH;
                const y = pad.top + chartH - barHeight;

                return (
                  <g key={i}>
                    {/* Bar */}
                    <rect
                      x={xCenter - colWidth / 2}
                      y={y}
                      width={colWidth}
                      height={barHeight}
                      rx="4"
                      fill="#f97316"
                      opacity="0.85"
                      className="hover:opacity-100 transition-opacity cursor-pointer"
                    />

                    {/* Value over bar */}
                    <text
                      x={xCenter}
                      y={Math.max(pad.top + 10, y - 4)}
                      textAnchor="middle"
                      fontSize="8.5"
                      fill="#0f172a"
                      fontWeight="bold"
                      className="font-mono"
                    >
                      ${(d.dayAmount / 1000).toFixed(1)}k
                    </text>

                    {/* Report Label */}
                    <text
                      x={xCenter}
                      y={svgHeight - 12}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#64748b"
                      fontWeight="bold"
                    >
                      R{d.reportNumber}
                    </text>
                  </g>
                );
              })}

              {/* Moving Average Line */}
              {(() => {
                const pts = productionData.map((d, i) => {
                  const x =
                    productionData.length > 1
                      ? pad.left + (i / (productionData.length - 1)) * chartW
                      : pad.left + chartW / 2;
                  const y = pad.top + chartH - (d.movingAvg / maxDayProd) * chartH;
                  return { x, y };
                });
                const pathStr = createSmoothPath(pts);

                return (
                  <g>
                    <path
                      d={pathStr}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    {pts.map((p, idx) => (
                      <circle
                        key={idx}
                        cx={p.x}
                        cy={p.y}
                        r="3.5"
                        fill="#2563eb"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    ))}
                  </g>
                );
              })()}
            </svg>
          </div>
        </div>
      )}

      {/* VIEW 3: DESGLOSE POR ESPECIALIDADES VIALES */}
      {activeTab === 'especialidades' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Distribución de la Inversión Vial por Paquete Técnico de Construcción</span>
            <span className="font-mono font-bold text-slate-800">
              Total Muestreado: $
              {specialtyData.reduce((s, item) => s + item.amount, 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Unified Specialty Bar */}
          <div className="w-full h-6 rounded-full overflow-hidden flex shadow-inner bg-slate-100 p-0.5 border border-slate-200">
            {specialtyData.map((item, idx) => {
              if (item.percentage === 0) return null;
              return (
                <div
                  key={idx}
                  title={`${item.name}: ${item.percentage.toFixed(1)}%`}
                  style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                  className="h-full first:rounded-l-full last:rounded-r-full transition-all hover:opacity-90"
                />
              );
            })}
          </div>

          {/* Specialty Detail Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {specialtyData.map((item, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full inline-block"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-mono text-sm font-black text-slate-900">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-800 leading-snug">
                    {item.name}
                  </h4>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Monto Devengado</span>
                  <span className="text-sm font-black text-slate-900 font-mono">
                    ${item.amount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
