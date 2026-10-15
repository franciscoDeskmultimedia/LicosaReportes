'use client';

import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  Calendar,
  Zap,
  DollarSign,
  Award,
  Target,
  CloudRain,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import type { MachineryLogItem } from './MachineryDetailModal';

interface ProjectData {
  id: string;
  code: string;
  name: string;
  totalHours: number;
  totalValue: number;
  reportsCount: number;
  logs: MachineryLogItem[];
}

interface ProjectMachineryChartProps {
  project: ProjectData;
  defaultRate: number;
}

export function ProjectMiniSparkline({
  logs,
  defaultRate,
}: {
  logs: MachineryLogItem[];
  defaultRate: number;
}) {
  const points = useMemo(() => {
    if (!logs || logs.length === 0) return [];
    // Chronological order
    const sorted = [...logs].sort(
      (a, b) => new Date(a.dailyReport.date).getTime() - new Date(b.dailyReport.date).getTime()
    );
    let accum = 0;
    return sorted.map((l) => {
      accum += l.dayHours || 0;
      return accum;
    });
  }, [logs]);

  if (points.length < 2) {
    return null;
  }

  const maxVal = Math.max(...points, 1);
  const minVal = 0;
  const w = 70;
  const h = 22;
  const padding = 2;

  const polyline = points
    .map((val, idx) => {
      const x = padding + (idx / (points.length - 1)) * (w - padding * 2);
      const y = h - padding - ((val - minVal) / (maxVal - minVal)) * (h - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-orange-50/70 border border-orange-200/60 rounded-lg">
      <svg width={w} height={h} className="overflow-visible">
        <polyline
          fill="none"
          stroke="#ea580c"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polyline}
        />
        {points.length > 0 && (
          <circle
            cx={w - padding}
            cy={h - padding - ((points[points.length - 1] - minVal) / (maxVal - minVal)) * (h - padding * 2)}
            r="2.5"
            className="fill-orange-600 stroke-white stroke-1"
          />
        )}
      </svg>
    </div>
  );
}

export function ProjectMachineryChart({ project, defaultRate }: ProjectMachineryChartProps) {
  const [activeTab, setActiveTab] = useState<'utilization' | 'weather' | 'cumulative'>('utilization');

  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    dateStr: string;
    fullDateStr: string;
    formattedDate: string;
    dayHours: number;
    dayValue: number;
    accumHours: number;
    accumValue: number;
    isActive: boolean;
    reportNumber?: number;
    notes?: string;
    rainHoursDay?: number;
    lostRainHoursDay?: number;
    noveltiesRisks?: string | null;
  } | null>(null);

  // Process Timeline for this specific project
  const {
    timeline,
    maxDailyHours,
    activeDaysCount,
    maxSingleDayHours,
    totalRainHours,
    totalLostRainHours,
    optimalDays,
    partialDays,
  } = useMemo(() => {
    if (!project.logs || project.logs.length === 0) {
      return {
        timeline: [],
        maxDailyHours: 0,
        activeDaysCount: 0,
        maxSingleDayHours: 0,
        totalRainHours: 0,
        totalLostRainHours: 0,
        optimalDays: 0,
        partialDays: 0,
      };
    }

    // Sort logs oldest to newest
    const sorted = [...project.logs].sort(
      (a, b) => new Date(a.dailyReport.date).getTime() - new Date(b.dailyReport.date).getTime()
    );

    // Group logs by date
    const mapByDate = new Map<
      string,
      {
        dayHours: number;
        value: number;
        reportNumber?: number;
        notes?: string;
        rainHoursDay?: number;
        lostRainHoursDay?: number;
        noveltiesRisks?: string | null;
      }
    >();

    let maxSingleH = 0;
    let rainSum = 0;
    let lostSum = 0;

    sorted.forEach((l) => {
      const dStr = new Date(l.dailyReport.date).toISOString().split('T')[0];
      const existing = mapByDate.get(dStr) || { dayHours: 0, value: 0 };
      const r = l.hourlyRate ?? defaultRate;
      const h = l.dayHours || 0;
      existing.dayHours += h;
      existing.value += h * r;
      existing.reportNumber = l.dailyReport.reportNumber;
      existing.notes = l.notes || existing.notes;
      existing.rainHoursDay = l.dailyReport.rainHoursDay ?? existing.rainHoursDay ?? 0;
      existing.lostRainHoursDay = l.dailyReport.lostRainHoursDay ?? existing.lostRainHoursDay ?? 0;
      existing.noveltiesRisks = l.dailyReport.noveltiesRisks || existing.noveltiesRisks;

      rainSum += l.dailyReport.rainHoursDay || 0;
      lostSum += l.dailyReport.lostRainHoursDay || 0;

      mapByDate.set(dStr, existing);

      if (existing.dayHours > maxSingleH) {
        maxSingleH = existing.dayHours;
      }
    });

    const minTime = new Date(sorted[0].dailyReport.date).getTime();
    const maxTime = new Date(sorted[sorted.length - 1].dailyReport.date).getTime();
    const daysDiff = Math.max(Math.round((maxTime - minTime) / (1000 * 60 * 60 * 24)), 1);

    const result: Array<{
      dateStr: string;
      formattedDate: string;
      fullDateStr: string;
      dayHours: number;
      dayValue: number;
      accumHours: number;
      accumValue: number;
      isActive: boolean;
      reportNumber?: number;
      notes?: string;
      rainHoursDay?: number;
      lostRainHoursDay?: number;
      noveltiesRisks?: string | null;
    }> = [];

    let runningHours = 0;
    let runningValue = 0;
    let activeDays = 0;
    let optDays = 0;
    let partDays = 0;

    if (daysDiff <= 60) {
      const cur = new Date(minTime);
      cur.setHours(0, 0, 0, 0);
      const end = new Date(maxTime);
      end.setHours(0, 0, 0, 0);

      while (cur.getTime() <= end.getTime()) {
        const dKey = cur.toISOString().split('T')[0];
        const match = mapByDate.get(dKey);
        const dayH = match ? match.dayHours : 0;
        const dayV = match ? match.value : 0;
        runningHours += dayH;
        runningValue += dayV;
        if (dayH > 0) {
          activeDays += 1;
          if (dayH >= 7.5) optDays += 1;
          else partDays += 1;
        }

        const fDate = `${cur.getDate()}/${cur.getMonth() + 1}`;
        const fullDate = cur.toLocaleDateString('es-EC', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

        result.push({
          dateStr: dKey,
          formattedDate: fDate,
          fullDateStr: fullDate,
          dayHours: dayH,
          dayValue: dayV,
          accumHours: runningHours,
          accumValue: runningValue,
          isActive: dayH > 0,
          reportNumber: match?.reportNumber,
          notes: match?.notes,
          rainHoursDay: match?.rainHoursDay,
          lostRainHoursDay: match?.lostRainHoursDay,
          noveltiesRisks: match?.noveltiesRisks,
        });

        cur.setDate(cur.getDate() + 1);
      }
    } else {
      Array.from(mapByDate.entries())
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .forEach(([dKey, data]) => {
          runningHours += data.dayHours;
          runningValue += data.value;
          if (data.dayHours > 0) {
            activeDays += 1;
            if (data.dayHours >= 7.5) optDays += 1;
            else partDays += 1;
          }
          const dObj = new Date(dKey + 'T12:00:00');
          const fDate = `${dObj.getDate()}/${dObj.getMonth() + 1}`;
          const fullDate = dObj.toLocaleDateString('es-EC', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });

          result.push({
            dateStr: dKey,
            formattedDate: fDate,
            fullDateStr: fullDate,
            dayHours: data.dayHours,
            dayValue: data.value,
            accumHours: runningHours,
            accumValue: runningValue,
            isActive: data.dayHours > 0,
            reportNumber: data.reportNumber,
            notes: data.notes,
            rainHoursDay: data.rainHoursDay,
            lostRainHoursDay: data.lostRainHoursDay,
            noveltiesRisks: data.noveltiesRisks,
          });
        });
    }

    return {
      timeline: result,
      maxDailyHours: maxSingleH,
      activeDaysCount: activeDays,
      maxSingleDayHours: maxSingleH,
      totalRainHours: rainSum,
      totalLostRainHours: lostSum,
      optimalDays: optDays,
      partialDays: partDays,
    };
  }, [project.logs, defaultRate]);

  // SVG Geometry
  const svgWidth = 560;
  const svgHeight = 145;
  const padding = { top: 20, right: 30, bottom: 25, left: 45 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  const totalProjectHours = Math.max(project.totalHours, 1);
  const maxBarScale = Math.max(maxDailyHours, 10);

  // Curve points for cumulative mode
  const curvePoints = useMemo(() => {
    if (timeline.length === 0) return [];
    const divisor = Math.max(timeline.length - 1, 1);

    return timeline.map((pt, idx) => {
      const x = padding.left + (idx / divisor) * graphWidth;
      const pctValue = totalProjectHours > 0 ? pt.accumHours / totalProjectHours : 0;
      const y = padding.top + graphHeight * (1 - pctValue);
      const barH = pt.isActive ? (pt.dayHours / maxBarScale) * (graphHeight * 0.7) : 0;

      return {
        ...pt,
        x,
        y,
        barHeight: Math.max(barH, 3),
      };
    });
  }, [timeline, graphWidth, graphHeight, totalProjectHours, maxBarScale]);

  const polylinePoints = useMemo(() => {
    if (curvePoints.length < 2) return '';
    return curvePoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }, [curvePoints]);

  const areaPoints = useMemo(() => {
    if (curvePoints.length < 2) return '';
    const firstX = curvePoints[0].x.toFixed(1);
    const lastX = curvePoints[curvePoints.length - 1].x.toFixed(1);
    const baselineY = (padding.top + graphHeight).toFixed(1);
    const curveStr = curvePoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    return `${firstX},${baselineY} ${curveStr} ${lastX},${baselineY}`;
  }, [curvePoints, graphHeight]);

  if (timeline.length === 0) {
    return null;
  }

  const avgHoursPerDay = activeDaysCount > 0 ? project.totalHours / activeDaysCount : 0;
  const utilizationPct = activeDaysCount > 0 ? Math.min((project.totalHours / (activeDaysCount * 8)) * 100, 150) : 0;

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 sm:p-4 shadow-2xs space-y-3">
      {/* Header with Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-900">
              Desempeño y Jornadas en {project.code}
            </h5>
            <p className="text-[10px] text-slate-500">
              Evaluación de utilización diaria, impacto de clima y acumulación en esta obra
            </p>
          </div>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('utilization')}
            className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
              activeTab === 'utilization'
                ? 'bg-white text-orange-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Utilización (8h)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('weather')}
            className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
              activeTab === 'weather'
                ? 'bg-white text-sky-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Lluvia / Clima
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cumulative')}
            className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
              activeTab === 'cumulative'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Acumulado ($)
          </button>
        </div>
      </div>

      {/* Mini metric badges strip based on active sub-tab */}
      {activeTab === 'utilization' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/80 p-2 rounded-lg border border-slate-100 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-700">
            <Target className="w-3 h-3 text-orange-600" />
            <span>Utilización: <strong className="font-bold text-slate-900">{utilizationPct.toFixed(0)}%</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>≥ 7.5h (Óptimo): <strong className="font-bold">{optimalDays} días</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-700">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>&lt; 7.5h (Parcial): <strong className="font-bold">{partialDays} días</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <Zap className="w-3 h-3 text-emerald-600" />
            <span>Promedio: <strong className="font-bold">{avgHoursPerDay.toFixed(1)} h/día</strong></span>
          </div>
        </div>
      )}

      {activeTab === 'weather' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-sky-50/50 p-2 rounded-lg border border-sky-100 text-[11px]">
          <div className="flex items-center gap-1.5 text-sky-800">
            <Clock className="w-3 h-3 text-sky-600" />
            <span>Trabajadas: <strong className="font-bold">{project.totalHours.toFixed(1)} h</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-indigo-700">
            <CloudRain className="w-3 h-3 text-indigo-500" />
            <span>Lluvia Obra: <strong className="font-bold">{totalRainHours.toFixed(1)} h</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-700">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>Perdidas Clima: <strong className="font-bold">{totalLostRainHours.toFixed(1)} h</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <Calendar className="w-3 h-3 text-slate-500" />
            <span>Total Jornadas: <strong className="font-bold">{activeDaysCount}</strong></span>
          </div>
        </div>
      )}

      {activeTab === 'cumulative' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-emerald-50/40 p-2 rounded-lg border border-emerald-100 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-700">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>Jornadas: <strong className="font-bold text-slate-900">{activeDaysCount}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700">
            <Zap className="w-3 h-3 text-emerald-600" />
            <span>Promedio: <strong className="font-bold">{avgHoursPerDay.toFixed(1)} h/día</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-700">
            <Award className="w-3 h-3 text-amber-600" />
            <span>Pico Máximo: <strong className="font-bold">{maxSingleDayHours.toFixed(1)} h</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <DollarSign className="w-3 h-3 text-emerald-600" />
            <span>Valor Obra: <strong className="font-mono text-emerald-700 font-bold">${project.totalValue.toLocaleString('es-EC', { maximumFractionDigits: 0 })}</strong></span>
          </div>
        </div>
      )}

      {/* SVG Chart Rendering based on Tab */}
      <div className="relative overflow-x-auto">
        <div className="min-w-[480px]">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
            {/* Horizontal Gridlines */}
            {[0, 0.5, 1].map((pct, i) => {
              const y = padding.top + graphHeight * (1 - pct);
              const maxVal = activeTab === 'cumulative' ? totalProjectHours : maxBarScale;
              const hVal = maxVal * pct;
              return (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={svgWidth - padding.right}
                    y2={y}
                    stroke="#f1f5f9"
                    strokeWidth={1}
                  />
                  <text
                    x={padding.left - 5}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="7.5"
                    className="fill-slate-400 font-mono font-medium"
                  >
                    {hVal.toFixed(0)}h
                  </text>
                </g>
              );
            })}

            {/* Target 8h Line (for utilization tab) */}
            {activeTab === 'utilization' && (
              <g>
                <line
                  x1={padding.left}
                  y1={padding.top + graphHeight * (1 - 8 / maxBarScale)}
                  x2={svgWidth - padding.right}
                  y2={padding.top + graphHeight * (1 - 8 / maxBarScale)}
                  stroke="#f43f5e"
                  strokeWidth={1.2}
                  strokeDasharray="4 3"
                />
                <text
                  x={svgWidth - padding.right + 3}
                  y={padding.top + graphHeight * (1 - 8 / maxBarScale) + 3}
                  fontSize="7"
                  className="fill-rose-500 font-bold"
                >
                  8h
                </text>
              </g>
            )}

            {/* CUMULATIVE MODE: AREA + LINE */}
            {activeTab === 'cumulative' && (
              <>
                {areaPoints && <polygon points={areaPoints} className="fill-orange-500/10" />}
                {curvePoints.map((pt, idx) => {
                  const barW = Math.min(Math.max(graphWidth / (curvePoints.length * 1.8), 2.5), 8);
                  if (pt.isActive) {
                    return (
                      <rect
                        key={`bar-${idx}`}
                        x={pt.x - barW / 2}
                        y={padding.top + graphHeight - pt.barHeight}
                        width={barW}
                        height={pt.barHeight}
                        rx={1}
                        className="fill-emerald-500/70 hover:fill-emerald-400 transition-colors"
                      />
                    );
                  }
                  return null;
                })}
                {polylinePoints && (
                  <polyline
                    fill="none"
                    stroke="#ea580c"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylinePoints}
                  />
                )}
              </>
            )}

            {/* UTILIZATION MODE: TRAFFIC-LIGHT BARS */}
            {activeTab === 'utilization' &&
              timeline.map((pt, idx) => {
                const divisor = Math.max(timeline.length - 1, 1);
                const x = padding.left + (idx / divisor) * graphWidth;
                const barW = Math.min(Math.max(graphWidth / (timeline.length * 1.6), 3), 10);
                const barH = (pt.dayHours / maxBarScale) * graphHeight;
                const y = padding.top + graphHeight - barH;
                const isOptimal = pt.dayHours >= 7.5;
                const isHovered = hoveredPoint?.dateStr === pt.dateStr;

                return (
                  <g
                    key={`util-${idx}`}
                    className="cursor-pointer group"
                    onMouseEnter={() => setHoveredPoint({ ...pt, x, y })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <rect x={x - 6} y={padding.top} width={12} height={graphHeight} fill="transparent" />
                    {pt.dayHours > 0 ? (
                      <rect
                        x={x - barW / 2}
                        y={y}
                        width={barW}
                        height={Math.max(barH, 3)}
                        rx={1.5}
                        className={isOptimal ? (isHovered ? 'fill-emerald-400' : 'fill-emerald-500') : (isHovered ? 'fill-amber-400' : 'fill-amber-500')}
                      />
                    ) : (
                      <line x1={x} y1={padding.top + graphHeight} x2={x} y2={padding.top + graphHeight - 2} stroke="#cbd5e1" strokeWidth={1} />
                    )}

                    {(idx === 0 || idx === timeline.length - 1 || idx % Math.max(Math.floor(timeline.length / 5), 1) === 0) && (
                      <text x={x} y={padding.top + graphHeight + 14} textAnchor="middle" fontSize="7.5" className="fill-slate-400 font-medium">
                        {pt.formattedDate}
                      </text>
                    )}
                  </g>
                );
              })}

            {/* WEATHER MODE: WORKED VS RAIN BARS */}
            {activeTab === 'weather' &&
              timeline.map((pt, idx) => {
                const divisor = Math.max(timeline.length - 1, 1);
                const x = padding.left + (idx / divisor) * graphWidth;
                const barW = Math.min(Math.max(graphWidth / (timeline.length * 2.2), 2.5), 7);
                const workH = (pt.dayHours / maxBarScale) * graphHeight;
                const rainH = ((pt.rainHoursDay || 0) / maxBarScale) * graphHeight;
                const yWork = padding.top + graphHeight - workH;

                return (
                  <g
                    key={`wtr-${idx}`}
                    className="cursor-pointer group"
                    onMouseEnter={() => setHoveredPoint({ ...pt, x, y: yWork })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <rect x={x - 6} y={padding.top} width={12} height={graphHeight} fill="transparent" />
                    {pt.dayHours > 0 && (
                      <rect x={x - barW - 0.5} y={yWork} width={barW} height={Math.max(workH, 2)} rx={1} className="fill-sky-600" />
                    )}
                    {(pt.rainHoursDay || 0) > 0 && (
                      <rect x={x + 0.5} y={padding.top + graphHeight - rainH} width={barW} height={Math.max(rainH, 2)} rx={1} className="fill-indigo-400/80" />
                    )}

                    {(idx === 0 || idx === timeline.length - 1 || idx % Math.max(Math.floor(timeline.length / 5), 1) === 0) && (
                      <text x={x} y={padding.top + graphHeight + 14} textAnchor="middle" fontSize="7.5" className="fill-slate-400 font-medium">
                        {pt.formattedDate}
                      </text>
                    )}
                  </g>
                );
              })}
          </svg>
        </div>

        {/* Floating Tooltip Box */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-950 text-white rounded-xl p-2.5 text-[11px] shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 duration-100 min-w-[190px]"
            style={{
              left: Math.min(Math.max(hoveredPoint.x - 60, 5), svgWidth - 200),
              top: Math.max(hoveredPoint.y - 65, 0),
            }}
          >
            <div className="flex items-center justify-between gap-2 font-bold text-orange-400 border-b border-slate-800 pb-1 mb-1">
              <span>{hoveredPoint.fullDateStr}</span>
              {hoveredPoint.reportNumber && <span>Rep. N° {String(hoveredPoint.reportNumber).padStart(3, '0')}</span>}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Horas Día:</span>
                <strong className={`font-mono ${hoveredPoint.dayHours >= 7.5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {hoveredPoint.dayHours.toFixed(1)}h
                </strong>
              </div>

              {(hoveredPoint.rainHoursDay || 0) > 0 && (
                <div className="flex items-center justify-between text-indigo-300">
                  <span>Lluvia Obra:</span>
                  <strong className="font-mono">{(hoveredPoint.rainHoursDay || 0).toFixed(1)}h</strong>
                </div>
              )}

              {activeTab === 'cumulative' && (
                <div className="flex items-center justify-between pt-0.5 border-t border-slate-800/80">
                  <span className="text-slate-400">Total Obra:</span>
                  <strong className="text-white font-mono">
                    {hoveredPoint.accumHours.toFixed(1)}h (${hoveredPoint.accumValue.toLocaleString('es-EC', { minimumFractionDigits: 2 })})
                  </strong>
                </div>
              )}

              {hoveredPoint.notes && (
                <p className="text-[10px] text-slate-300 italic pt-1 truncate max-w-[180px]">
                  "{hoveredPoint.notes}"
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
