'use client';

import React, { useState, useMemo } from 'react';
import {
  Target,
  CloudRain,
  Building2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Calendar,
  Zap,
  Info,
  Award,
} from 'lucide-react';
import type { MachineryLogItem } from './MachineryDetailModal';

export interface DailyPoint {
  dateStr: string;
  formattedDate: string;
  fullDateStr: string;
  dayHours: number;
  dayValue: number;
  accumHours: number;
  accumValue: number;
  isActive: boolean;
  reportNumber?: number;
  reportId?: string;
  projectName?: string;
  projectCode?: string;
  notes?: string;
  rainHoursDay?: number;
  lostRainHoursDay?: number;
  noveltiesRisks?: string | null;
}

export interface ProjectSummaryItem {
  id: string;
  code: string;
  name: string;
  totalHours: number;
  totalValue: number;
  reportsCount: number;
  logs: MachineryLogItem[];
}

interface MachineryAnalyticsTabsProps {
  machineName: string;
  machineCode: string;
  rate: number;
  dailyTimeline: DailyPoint[];
  projectsSummary: ProjectSummaryItem[];
  onSelectProject?: (projectId: string) => void;
}

export function MachineryAnalyticsTabs({
  machineName,
  machineCode,
  rate,
  dailyTimeline,
  projectsSummary,
  onSelectProject,
}: MachineryAnalyticsTabsProps) {
  const [activeTab, setActiveTab] = useState<'utilization' | 'weather' | 'benchmark'>('utilization');

  // Tooltip state
  const [hoveredDay, setHoveredDay] = useState<DailyPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // -------------------------------------------------------------
  // 1. DATA CALCULATIONS: TAB 1 (UTILIZATION VS 8H)
  // -------------------------------------------------------------
  const utilizationStats = useMemo(() => {
    if (dailyTimeline.length === 0) {
      return {
        totalDays: 0,
        activeDays: 0,
        idleDays: 0,
        optimalDays: 0, // >= 7.5h
        partialDays: 0, // 0.1h to 7.4h
        overtimeHours: 0,
        avgDailyHours: 0,
        utilizationRate: 0,
      };
    }

    let activeDays = 0;
    let idleDays = 0;
    let optimalDays = 0;
    let partialDays = 0;
    let totalWorkedHours = 0;
    let overtimeHours = 0;

    dailyTimeline.forEach((d) => {
      if (d.dayHours > 0) {
        activeDays += 1;
        totalWorkedHours += d.dayHours;
        if (d.dayHours >= 7.5) {
          optimalDays += 1;
        } else {
          partialDays += 1;
        }
        if (d.dayHours > 8) {
          overtimeHours += d.dayHours - 8;
        }
      } else {
        idleDays += 1;
      }
    });

    const avgDailyHours = activeDays > 0 ? totalWorkedHours / activeDays : 0;
    // OEE Factor relative to an 8-hour shift per active day
    const possibleHours = activeDays * 8;
    const utilizationRate = possibleHours > 0 ? Math.min((totalWorkedHours / possibleHours) * 100, 150) : 0;

    return {
      totalDays: dailyTimeline.length,
      activeDays,
      idleDays,
      optimalDays,
      partialDays,
      overtimeHours,
      avgDailyHours,
      utilizationRate,
    };
  }, [dailyTimeline]);

  // -------------------------------------------------------------
  // 2. DATA CALCULATIONS: TAB 2 (WEATHER & RAIN IMPACT)
  // -------------------------------------------------------------
  const weatherStats = useMemo(() => {
    let totalRainHours = 0;
    let totalLostRainHours = 0;
    let rainDaysCount = 0;
    let totalWorkedHours = 0;

    dailyTimeline.forEach((d) => {
      totalWorkedHours += d.dayHours;
      const rain = d.rainHoursDay || 0;
      const lost = d.lostRainHoursDay || 0;
      totalRainHours += rain;
      totalLostRainHours += lost;
      if (rain > 0 || lost > 0) {
        rainDaysCount += 1;
      }
    });

    return {
      totalWorkedHours,
      totalRainHours,
      totalLostRainHours,
      rainDaysCount,
      weatherImpactPct: dailyTimeline.length > 0 ? (rainDaysCount / dailyTimeline.length) * 100 : 0,
    };
  }, [dailyTimeline]);

  // -------------------------------------------------------------
  // 3. DATA CALCULATIONS: TAB 3 (BENCHMARKING BETWEEN OBRAS)
  // -------------------------------------------------------------
  const benchmarkStats = useMemo(() => {
    if (projectsSummary.length === 0) return [];

    return projectsSummary.map((p) => {
      // Find logs for this project
      const datesSet = new Set<string>();
      let totalH = 0;
      let maxH = 0;

      p.logs.forEach((l) => {
        const dStr = new Date(l.dailyReport.date).toISOString().split('T')[0];
        datesSet.add(dStr);
        const h = l.dayHours || 0;
        totalH += h;
        if (h > maxH) maxH = h;
      });

      const uniqueDays = datesSet.size;
      const avgHoursPerDay = uniqueDays > 0 ? totalH / uniqueDays : 0;
      // Efficiency score: % of 8h standard reached per day
      const efficiencyScore = Math.min((avgHoursPerDay / 8) * 100, 100);

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        totalHours: p.totalHours,
        totalValue: p.totalValue,
        reportsCount: p.reportsCount,
        uniqueDays,
        avgHoursPerDay,
        maxSingleDayHours: maxH,
        efficiencyScore,
      };
    }).sort((a, b) => b.avgHoursPerDay - a.avgHoursPerDay);
  }, [projectsSummary]);

  // SVG Geometry for Timeline Charts (Tabs 1 & 2)
  const svgWidth = 620;
  const svgHeight = 170;
  const pad = { top: 24, right: 30, bottom: 28, left: 45 };
  const graphW = svgWidth - pad.left - pad.right;
  const graphH = svgHeight - pad.top - pad.bottom;

  // Max hour for Y scale (at least 10h to comfortably show 8h standard target)
  const maxHourScale = useMemo(() => {
    let maxH = 10;
    dailyTimeline.forEach((d) => {
      if (d.dayHours > maxH) maxH = d.dayHours;
      if ((d.rainHoursDay || 0) > maxH) maxH = d.rainHoursDay || 0;
    });
    return Math.ceil(maxH / 2) * 2; // round to even number
  }, [dailyTimeline]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* 1. TOP HEADER & TABS NAVIGATION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Análisis Operativo y Comparativas de {machineCode}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                  {dailyTimeline.length} días monitoreados
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Selecciona la perspectiva analítica para evaluar rendimiento, pérdidas y eficiencia
              </p>
            </div>
          </div>
        </div>

        {/* TAB BUTTONS */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200 self-start lg:self-auto overflow-x-auto max-w-full">
          {/* Tab 1: Utilización */}
          <button
            type="button"
            onClick={() => setActiveTab('utilization')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'utilization'
                ? 'bg-white text-orange-700 shadow-xs border border-orange-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-orange-600" />
            <span>Utilización vs. Meta 8h</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-orange-100 text-orange-800 font-mono">
              {utilizationStats.utilizationRate.toFixed(0)}%
            </span>
          </button>

          {/* Tab 2: Clima y Lluvia */}
          <button
            type="button"
            onClick={() => setActiveTab('weather')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'weather'
                ? 'bg-white text-sky-700 shadow-xs border border-sky-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5 text-sky-600" />
            <span>Horas vs. Lluvia / Clima</span>
            {weatherStats.totalLostRainHours > 0 && (
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 font-mono">
                -{weatherStats.totalLostRainHours.toFixed(0)}h
              </span>
            )}
          </button>

          {/* Tab 3: Comparativa Obras */}
          <button
            type="button"
            onClick={() => setActiveTab('benchmark')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'benchmark'
                ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Comparativa entre Obras</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 font-mono">
              {projectsSummary.length}
            </span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* TAB 1: FACTOR DE UTILIZACIÓN VS. META DE 8H                        */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'utilization' && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Factor de aprovechamiento */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                Factor Utilización (Turno)
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                  {utilizationStats.utilizationRate.toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-500 font-medium">de 8h estándar</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Promedio activo: <strong className="text-slate-800">{utilizationStats.avgDailyHours.toFixed(1)} h/día</strong>
              </p>
            </div>

            {/* Jornadas Óptimas */}
            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
              <div className="flex items-center justify-between text-emerald-800">
                <span className="text-[10px] font-bold uppercase tracking-wider">Jornada Completa</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono mt-0.5">
                {utilizationStats.optimalDays}{' '}
                <span className="text-xs font-sans font-medium text-emerald-600">días</span>
              </div>
              <p className="text-[10px] text-emerald-700 font-medium mt-0.5">
                Cumplieron meta (≥ 7.5h)
              </p>
            </div>

            {/* Jornadas Incompletas */}
            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
              <div className="flex items-center justify-between text-amber-800">
                <span className="text-[10px] font-bold uppercase tracking-wider">Jornada Parcial</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-700 font-mono mt-0.5">
                {utilizationStats.partialDays}{' '}
                <span className="text-xs font-sans font-medium text-amber-600">días</span>
              </div>
              <p className="text-[10px] text-amber-700 font-medium mt-0.5">
                Subutilizada (&lt; 7.5h de turno)
              </p>
            </div>

            {/* Días Parada Total */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Parada Total (0h)</span>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-700 font-mono mt-0.5">
                {utilizationStats.idleDays}{' '}
                <span className="text-xs font-sans font-medium text-slate-400">días</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                Sin horas registradas ($0)
              </p>
            </div>
          </div>

          {/* Legend Strip */}
          <div className="flex items-center justify-between gap-3 text-xs bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                <span>≥ 7.5h (Óptima / Rentable)</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium text-amber-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                <span>&lt; 7.5h (Subutilizada)</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-400">
                <span className="w-2.5 h-0.5 bg-slate-300 inline-block" />
                <span>0h (Inactiva)</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-semibold text-rose-600">
              <span className="w-4 h-0.5 border-b-2 border-dashed border-rose-500 inline-block" />
              <span>Meta Turno: 8.0h contractuales</span>
            </div>
          </div>

          {/* SVG CHART: UTILIZATION */}
          <div className="relative overflow-x-auto">
            <div className="min-w-[600px]">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
                {/* Horizontal Gridlines */}
                {[0, 4, 8, maxHourScale].map((hVal, idx) => {
                  const y = pad.top + graphH * (1 - hVal / maxHourScale);
                  const isTarget8 = hVal === 8;
                  return (
                    <g key={idx}>
                      <line
                        x1={pad.left}
                        y1={y}
                        x2={svgWidth - pad.right}
                        y2={y}
                        stroke={isTarget8 ? '#f43f5e' : '#f1f5f9'}
                        strokeWidth={isTarget8 ? 1.5 : 1}
                        strokeDasharray={isTarget8 ? '4 3' : undefined}
                      />
                      <text
                        x={pad.left - 6}
                        y={y + 3}
                        textAnchor="end"
                        fontSize="8"
                        className={isTarget8 ? 'fill-rose-600 font-bold font-mono' : 'fill-slate-400 font-mono'}
                      >
                        {hVal}h
                      </text>
                      {isTarget8 && (
                        <text
                          x={svgWidth - pad.right + 4}
                          y={y + 3}
                          fontSize="7.5"
                          className="fill-rose-500 font-bold"
                        >
                          Meta 8h
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Vertical Bars for each day */}
                {dailyTimeline.map((pt, idx) => {
                  const divisor = Math.max(dailyTimeline.length - 1, 1);
                  const x = pad.left + (idx / divisor) * graphW;
                  const barW = Math.min(Math.max(graphW / (dailyTimeline.length * 1.5), 3), 10);
                  const barH = (pt.dayHours / maxHourScale) * graphH;
                  const y = pad.top + graphH - barH;

                  const isOptimal = pt.dayHours >= 7.5;
                  const isHovered = hoveredDay?.dateStr === pt.dateStr;

                  return (
                    <g
                      key={`bar-${idx}`}
                      className="cursor-pointer group"
                      onMouseEnter={(e) => {
                        setHoveredDay(pt);
                        setTooltipPos({ x, y: Math.min(y, pad.top + graphH - 40) });
                      }}
                      onMouseLeave={() => setHoveredDay(null)}
                    >
                      {/* Invisible hover capture area */}
                      <rect
                        x={x - 6}
                        y={pad.top}
                        width={12}
                        height={graphH}
                        fill="transparent"
                      />

                      {pt.dayHours > 0 ? (
                        <rect
                          x={x - barW / 2}
                          y={y}
                          width={barW}
                          height={Math.max(barH, 3)}
                          rx={1.5}
                          className={`transition-all ${
                            isOptimal
                              ? isHovered
                                ? 'fill-emerald-400'
                                : 'fill-emerald-500'
                              : isHovered
                              ? 'fill-amber-400'
                              : 'fill-amber-500'
                          }`}
                        />
                      ) : (
                        <line
                          x1={x}
                          y1={pad.top + graphH}
                          x2={x}
                          y2={pad.top + graphH - 2}
                          stroke="#cbd5e1"
                          strokeWidth={1}
                        />
                      )}

                      {/* Overtime mark if > 8h */}
                      {pt.dayHours > 8 && (
                        <circle
                          cx={x}
                          y={y - 3}
                          r={1.5}
                          className="fill-orange-500"
                        />
                      )}

                      {/* X-axis date labels */}
                      {(idx === 0 ||
                        idx === dailyTimeline.length - 1 ||
                        idx % Math.max(Math.floor(dailyTimeline.length / 7), 1) === 0) && (
                        <text
                          x={x}
                          y={pad.top + graphH + 16}
                          textAnchor="middle"
                          fontSize="8"
                          className="fill-slate-400 font-medium"
                        >
                          {pt.formattedDate}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Hover Tooltip Box */}
            {hoveredDay && (
              <div
                className="absolute z-20 pointer-events-none bg-slate-950 text-white rounded-xl p-3 text-xs shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 duration-100 min-w-[210px]"
                style={{
                  left: Math.min(Math.max(tooltipPos.x - 70, 10), svgWidth - 230),
                  top: Math.max(tooltipPos.y - 75, 0),
                }}
              >
                <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-orange-400 border-b border-slate-800 pb-1 mb-1">
                  <span>{hoveredDay.fullDateStr}</span>
                  {hoveredDay.reportNumber && (
                    <span>Rep. N° {String(hoveredDay.reportNumber).padStart(3, '0')}</span>
                  )}
                </div>

                {hoveredDay.dayHours > 0 ? (
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-slate-200 truncate">
                      {hoveredDay.projectName || 'Obra en ejecución'}
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Horas Turno:</span>
                      <strong className={`font-mono ${hoveredDay.dayHours >= 7.5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {hoveredDay.dayHours.toFixed(1)}h ({((hoveredDay.dayHours / 8) * 100).toFixed(0)}% de meta)
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Generación ($):</span>
                      <strong className="text-emerald-400 font-mono">
                        ${hoveredDay.dayValue.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                    {hoveredDay.notes && (
                      <p className="text-[10px] text-slate-300 italic pt-1 border-t border-slate-800/70 truncate max-w-[200px]">
                        "{hoveredDay.notes}"
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-400 text-[11px]">
                    <span className="text-rose-400 font-semibold block">Jornada Inactiva (0 horas)</span>
                    <span>Máquina varada o sin frente asignado en esta fecha ($0 generado).</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 2: HORAS TRABAJADAS VS. IMPACTO CLIMÁTICO (LLUVIA)             */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'weather' && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Horas Trabajadas */}
            <div className="p-3 bg-sky-50/60 border border-sky-200 rounded-xl">
              <span className="text-[10px] font-bold text-sky-800 uppercase block tracking-wider">
                Horas Trabajadas
              </span>
              <div className="text-xl sm:text-2xl font-black text-sky-900 font-mono mt-0.5">
                {weatherStats.totalWorkedHours.toFixed(1)}{' '}
                <span className="text-xs font-sans font-medium text-sky-700">h</span>
              </div>
              <p className="text-[10px] text-sky-700 mt-0.5 font-medium">
                Operación efectiva acumulada
              </p>
            </div>

            {/* Horas de Lluvia Reportadas */}
            <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl">
              <div className="flex items-center justify-between text-indigo-800">
                <span className="text-[10px] font-bold uppercase tracking-wider">Lluvia en Obra</span>
                <CloudRain className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-indigo-900 font-mono mt-0.5">
                {weatherStats.totalRainHours.toFixed(1)}{' '}
                <span className="text-xs font-sans font-medium text-indigo-700">h</span>
              </div>
              <p className="text-[10px] text-indigo-700 mt-0.5 font-medium">
                Precipitación en frentes
              </p>
            </div>

            {/* Horas Formalmente Perdidas */}
            <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl">
              <div className="flex items-center justify-between text-rose-800">
                <span className="text-[10px] font-bold uppercase tracking-wider">Perdidas por Lluvia</span>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-rose-700 font-mono mt-0.5">
                {weatherStats.totalLostRainHours.toFixed(1)}{' '}
                <span className="text-xs font-sans font-medium text-rose-600">h</span>
              </div>
              <p className="text-[10px] text-rose-700 mt-0.5 font-medium">
                Justificativo oficial para ampliación
              </p>
            </div>

            {/* Días Afectados */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                Días con Afectación
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-800 font-mono mt-0.5">
                {weatherStats.rainDaysCount}{' '}
                <span className="text-xs font-sans font-medium text-slate-500">días</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                {weatherStats.weatherImpactPct.toFixed(0)}% del tiempo con lluvia
              </p>
            </div>
          </div>

          {/* Legend Strip */}
          <div className="flex items-center justify-between gap-3 text-xs bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 font-medium text-sky-800">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-600 inline-block" />
                <span>Horas Trabajadas Máquina</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium text-indigo-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-400 inline-block" />
                <span>Horas de Lluvia en Obra</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium text-rose-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                <span>Horas Perdidas por Clima</span>
              </span>
            </div>

            <span className="text-[11px] text-slate-500 italic">
              Permite validar si la falta de producción se debió a fuerza mayor (clima)
            </span>
          </div>

          {/* SVG CHART: WEATHER VS PRODUCTION */}
          <div className="relative overflow-x-auto">
            <div className="min-w-[600px]">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
                {/* Horizontal Gridlines */}
                {[0, 0.33, 0.66, 1].map((pct, idx) => {
                  const y = pad.top + graphH * (1 - pct);
                  const hVal = maxHourScale * pct;
                  return (
                    <g key={idx}>
                      <line
                        x1={pad.left}
                        y1={y}
                        x2={svgWidth - pad.right}
                        y2={y}
                        stroke="#f1f5f9"
                        strokeWidth={1}
                      />
                      <text
                        x={pad.left - 6}
                        y={y + 3}
                        textAnchor="end"
                        fontSize="8"
                        className="fill-slate-400 font-mono"
                      >
                        {hVal.toFixed(0)}h
                      </text>
                    </g>
                  );
                })}

                {/* Bars for Weather and Production */}
                {dailyTimeline.map((pt, idx) => {
                  const divisor = Math.max(dailyTimeline.length - 1, 1);
                  const x = pad.left + (idx / divisor) * graphW;
                  const barW = Math.min(Math.max(graphW / (dailyTimeline.length * 2.2), 2.5), 7);

                  const workH = (pt.dayHours / maxHourScale) * graphH;
                  const rainH = ((pt.rainHoursDay || 0) / maxHourScale) * graphH;
                  const lostH = ((pt.lostRainHoursDay || 0) / maxHourScale) * graphH;

                  const yWork = pad.top + graphH - workH;
                  const isHovered = hoveredDay?.dateStr === pt.dateStr;

                  return (
                    <g
                      key={`weather-bar-${idx}`}
                      className="cursor-pointer group"
                      onMouseEnter={() => {
                        setHoveredDay(pt);
                        setTooltipPos({ x, y: Math.min(yWork, pad.top + graphH - 40) });
                      }}
                      onMouseLeave={() => setHoveredDay(null)}
                    >
                      {/* Invisible hover capture */}
                      <rect
                        x={x - 6}
                        y={pad.top}
                        width={12}
                        height={graphH}
                        fill="transparent"
                      />

                      {/* Worked Hours Bar */}
                      {pt.dayHours > 0 && (
                        <rect
                          x={x - barW - 0.5}
                          y={yWork}
                          width={barW}
                          height={Math.max(workH, 2)}
                          rx={1}
                          className={`transition-colors ${isHovered ? 'fill-sky-400' : 'fill-sky-600'}`}
                        />
                      )}

                      {/* Rain Hours Bar */}
                      {(pt.rainHoursDay || 0) > 0 && (
                        <rect
                          x={x + 0.5}
                          y={pad.top + graphH - rainH}
                          width={barW}
                          height={Math.max(rainH, 2)}
                          rx={1}
                          className={`transition-colors ${isHovered ? 'fill-indigo-300' : 'fill-indigo-400/80'}`}
                        />
                      )}

                      {/* Lost Rain Hours Marker on top of rain bar */}
                      {(pt.lostRainHoursDay || 0) > 0 && (
                        <rect
                          x={x + 0.5}
                          y={pad.top + graphH - lostH}
                          width={barW}
                          height={Math.max(lostH, 2)}
                          rx={1}
                          className="fill-rose-500/90"
                        />
                      )}

                      {/* Idle tick mark if neither worked nor rained */}
                      {pt.dayHours === 0 && (pt.rainHoursDay || 0) === 0 && (
                        <line
                          x1={x}
                          y1={pad.top + graphH}
                          x2={x}
                          y2={pad.top + graphH - 2}
                          stroke="#cbd5e1"
                          strokeWidth={1}
                        />
                      )}

                      {/* X-axis date labels */}
                      {(idx === 0 ||
                        idx === dailyTimeline.length - 1 ||
                        idx % Math.max(Math.floor(dailyTimeline.length / 7), 1) === 0) && (
                        <text
                          x={x}
                          y={pad.top + graphH + 16}
                          textAnchor="middle"
                          fontSize="8"
                          className="fill-slate-400 font-medium"
                        >
                          {pt.formattedDate}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Hover Tooltip Box */}
            {hoveredDay && (
              <div
                className="absolute z-20 pointer-events-none bg-slate-950 text-white rounded-xl p-3 text-xs shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 duration-100 min-w-[220px]"
                style={{
                  left: Math.min(Math.max(tooltipPos.x - 70, 10), svgWidth - 230),
                  top: Math.max(tooltipPos.y - 75, 0),
                }}
              >
                <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-sky-400 border-b border-slate-800 pb-1 mb-1">
                  <span>{hoveredDay.fullDateStr}</span>
                  {hoveredDay.reportNumber && (
                    <span>Rep. N° {String(hoveredDay.reportNumber).padStart(3, '0')}</span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-slate-200 truncate">
                    {hoveredDay.projectName || 'Obra en ejecución'}
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-sky-300">Horas Trabajadas:</span>
                    <strong className="text-sky-400 font-mono">{hoveredDay.dayHours.toFixed(1)}h</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-indigo-300">Lluvia en Obra:</span>
                    <strong className="text-indigo-300 font-mono">{(hoveredDay.rainHoursDay || 0).toFixed(1)}h</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-rose-300">Horas Perdidas Clima:</span>
                    <strong className="text-rose-400 font-mono">{(hoveredDay.lostRainHoursDay || 0).toFixed(1)}h</strong>
                  </div>

                  {hoveredDay.noveltiesRisks && (
                    <div className="pt-1 border-t border-slate-800 text-[10px] text-amber-300 italic">
                      ⚠️ {hoveredDay.noveltiesRisks}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 3: COMPARATIVA ENTRE OBRAS (BENCHMARKING)                      */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'benchmark' && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 text-xs">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="text-indigo-900">
                <strong>Benchmarking de Proyectos:</strong> Compara el aprovechamiento diario de esta máquina en cada frente de obra.
              </span>
            </div>
            <span className="text-slate-500 font-medium text-[11px]">
              Meta óptima: <strong>≥ 7.5 h/día</strong>
            </span>
          </div>

          {/* Ranking Cards */}
          <div className="space-y-2.5">
            {benchmarkStats.map((proj, rankIdx) => {
              const isTop = rankIdx === 0 && proj.avgHoursPerDay > 0;
              const isEfficient = proj.avgHoursPerDay >= 7.0;

              return (
                <div
                  key={proj.id}
                  onClick={() => onSelectProject?.(proj.id)}
                  className="p-3.5 sm:p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isTop
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 font-mono'
                            : 'bg-slate-100 text-slate-700 font-mono'
                        }`}
                      >
                        #{rankIdx + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-mono font-bold">
                            {proj.code}
                          </span>
                          {isTop && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                              🏆 Mayor Rendimiento
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                          {proj.name}
                        </h4>
                      </div>
                    </div>

                    {/* Quick Metric Badges */}
                    <div className="flex items-center gap-3 self-end sm:self-auto text-xs flex-wrap">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Promedio Diario</span>
                        <span className={`text-sm sm:text-base font-black font-mono ${isEfficient ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {proj.avgHoursPerDay.toFixed(1)} h/día
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Horas</span>
                        <span className="text-sm sm:text-base font-black text-slate-900 font-mono">
                          {proj.totalHours.toFixed(1)} h
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Valor Generado</span>
                        <span className="text-sm sm:text-base font-black text-emerald-700 font-mono">
                          ${proj.totalValue.toLocaleString('es-EC', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Progress Bar (Hours vs 8h Target) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Eficiencia del turno diario ({proj.uniqueDays} jornadas registradas):</span>
                      <strong className="font-mono text-slate-700">{proj.efficiencyScore.toFixed(0)}% de meta 8h</strong>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-2 transition-all duration-300 rounded-full ${
                          isEfficient ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(proj.efficiencyScore, 100)}%` }}
                      />
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
