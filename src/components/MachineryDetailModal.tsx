'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  X,
  Truck,
  Clock,
  DollarSign,
  TrendingUp,
  Building2,
  Calendar,
  FileSpreadsheet,
  Download,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Layers,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Search,
} from 'lucide-react';
import { exportMachineryToPdf } from '@/lib/exportMachineryPdf';

export interface MachineryLogItem {
  id: string;
  dayHours: number;
  hourlyRate?: number | null;
  notes: string | null;
  dailyReport: {
    id: string;
    reportNumber: number;
    date: Date | string;
    roadSection?: string;
    project?: {
      id: string;
      code: string;
      name: string;
    };
  };
}

export interface MachineryDetailProps {
  machine: {
    id: string;
    code: string;
    name: string;
    category: string;
    plateOrSerial: string | null;
    unit: string;
    status: string;
    totalHoursWorked: number;
    hourlyRate?: number;
    dailyLogs: MachineryLogItem[];
  };
  onClose: () => void;
  onStatusChange?: (status: string) => void;
  isAdmin?: boolean;
}

export function MachineryDetailModal({
  machine,
  onClose,
  onStatusChange,
  isAdmin = false,
}: MachineryDetailProps) {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [chartMode, setChartMode] = useState<'CURVE' | 'PROJECTS'>('CURVE');
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  // Default hourly rate
  const rate = machine.hourlyRate || 0;

  // Chronologically sorted logs
  const chronLogs = useMemo(() => {
    return [...machine.dailyLogs].sort((a, b) => {
      const da = new Date(a.dailyReport.date).getTime();
      const db = new Date(b.dailyReport.date).getTime();
      return da - db;
    });
  }, [machine.dailyLogs]);

  // Aggregated totals
  const totalComputedHours = useMemo(() => {
    return machine.dailyLogs.reduce((acc, l) => acc + (l.dayHours || 0), 0);
  }, [machine.dailyLogs]);

  const effectiveTotalHours = Math.max(machine.totalHoursWorked || 0, totalComputedHours);

  const totalValueGenerated = useMemo(() => {
    if (machine.dailyLogs.length === 0) {
      return effectiveTotalHours * rate;
    }
    return machine.dailyLogs.reduce((acc, l) => {
      const logRate = l.hourlyRate ?? rate;
      return acc + ((l.dayHours || 0) * logRate);
    }, 0);
  }, [machine.dailyLogs, effectiveTotalHours, rate]);

  // Group by Project
  const projectsSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        code: string;
        name: string;
        totalHours: number;
        totalValue: number;
        reportsCount: number;
        logs: MachineryLogItem[];
      }
    >();

    machine.dailyLogs.forEach((log) => {
      const proj = log.dailyReport.project;
      const key = proj?.id || 'SIN_OBRA';
      const projCode = proj?.code || 'OBRA GENERAL';
      const projName = proj?.name || 'Obra no especificada';
      const logRate = log.hourlyRate ?? rate;
      const val = (log.dayHours || 0) * logRate;

      const current = map.get(key) || {
        id: key,
        code: projCode,
        name: projName,
        totalHours: 0,
        totalValue: 0,
        reportsCount: 0,
        logs: [],
      };

      current.totalHours += log.dayHours || 0;
      current.totalValue += val;
      current.reportsCount += 1;
      current.logs.push(log);
      map.set(key, current);
    });

    // Sort projects by hours descending
    const list = Array.from(map.values()).sort((a, b) => b.totalHours - a.totalHours);

    // Sort each project's logs descending by date
    list.forEach((p) => {
      p.logs.sort((a, b) => {
        const da = new Date(a.dailyReport.date).getTime();
        const db = new Date(b.dailyReport.date).getTime();
        return db - da; // most recent first
      });
    });

    return list;
  }, [machine.dailyLogs, rate]);

  // Expand state for each project
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (projectsSummary.length > 0) {
      // First project expanded by default
      initial[projectsSummary[0].id] = true;
    }
    return initial;
  });

  function toggleProject(id: string) {
    setExpandedProjects((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function expandAll() {
    const all: Record<string, boolean> = {};
    projectsSummary.forEach((p) => {
      all[p.id] = true;
    });
    setExpandedProjects(all);
  }

  function collapseAll() {
    setExpandedProjects({});
  }

  function handleDownloadPdf() {
    setIsExportingPdf(true);
    try {
      exportMachineryToPdf({
        id: machine.id,
        code: machine.code,
        name: machine.name,
        category: machine.category,
        plateOrSerial: machine.plateOrSerial,
        unit: machine.unit || 'hora',
        status: machine.status || 'OPERATIVO',
        hourlyRate: rate,
        totalHoursWorked: effectiveTotalHours,
        dailyLogs: machine.dailyLogs,
      });
    } catch (err) {
      console.error('Error al generar PDF de maquinaria:', err);
      alert('Error al generar el PDF de la maquinaria.');
    } finally {
      setIsExportingPdf(false);
    }
  }

  // SVG S-Curve Coordinates
  const svgWidth = 720;
  const svgHeight = 200;
  const padding = { top: 25, right: 30, bottom: 40, left: 55 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  let polylinePoints = '';
  let areaPoints = '';
  const curvePoints: Array<{
    x: number;
    y: number;
    accumHours: number;
    accumValue: number;
    dayHours: number;
    reportNumber: number;
    dateStr: string;
    projectName: string;
    notes: string | null;
  }> = [];

  if (chronLogs.length > 0) {
    let runningHours = 0;
    const maxH = Math.max(effectiveTotalHours, 1);

    chronLogs.forEach((log, idx) => {
      runningHours += log.dayHours || 0;
      const x = padding.left + (idx / Math.max(chronLogs.length - 1, 1)) * graphWidth;
      const y = padding.top + graphHeight - (runningHours / maxH) * graphHeight;
      const d = new Date(log.dailyReport.date);
      const dateStr = d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' });

      curvePoints.push({
        x,
        y,
        accumHours: runningHours,
        accumValue: runningHours * (log.hourlyRate ?? rate),
        dayHours: log.dayHours || 0,
        reportNumber: log.dailyReport.reportNumber,
        dateStr,
        projectName: log.dailyReport.project?.name || 'Obra',
        notes: log.notes,
      });
    });

    polylinePoints = curvePoints.map((c) => `${c.x},${c.y}`).join(' ');
    if (curvePoints.length > 0) {
      areaPoints = `${curvePoints[0].x},${padding.top + graphHeight} ${polylinePoints} ${curvePoints[curvePoints.length - 1].x},${padding.top + graphHeight}`;
    }
  }

  const isOperative = machine.status === 'OPERATIVO';
  const isMaintenance = machine.status === 'EN_MANTENIMIENTO';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 bg-slate-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 shrink-0">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-lg bg-orange-600 text-white font-mono font-black text-xs tracking-wider">
                  {machine.code}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {machine.category}
                </span>
                {machine.plateOrSerial && (
                  <span className="text-xs text-slate-400 font-mono">
                    • Placa/Serie: {machine.plateOrSerial}
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    isOperative
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : isMaintenance
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {machine.status}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                {machine.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {/* Download PDF button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Generando PDF...' : 'Descargar Ficha PDF'}</span>
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">

          {/* 1. EXECUTIVE KPI SUMMARY TILES */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Horas Totales */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider">Horas Acumuladas</span>
                <Clock className="w-4 h-4 text-orange-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                {effectiveTotalHours.toFixed(1)} <span className="text-xs font-sans font-medium text-slate-500">{machine.unit}s</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Registradas en reportes de obra
              </p>
            </div>

            {/* Tarifa Horaria */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider">Tarifa / Costo Hora</span>
                <DollarSign className="w-4 h-4 text-slate-700" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                ${rate.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Valor hora configurado
              </p>
            </div>

            {/* Total Valor Generado */}
            <div className="p-4 bg-gradient-to-br from-white to-emerald-50/50 border border-emerald-200 rounded-2xl">
              <div className="flex items-center justify-between text-emerald-700 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider">Valor Económico</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
                ${totalValueGenerated.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-emerald-600 font-medium mt-1">
                Facturado / Aportado en obras
              </p>
            </div>

            {/* Obras y Reportes */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider">Participación</span>
                <Building2 className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                {projectsSummary.length} <span className="text-xs font-sans font-medium text-slate-500">obras</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                {machine.dailyLogs.length} reportes diarios
              </p>
            </div>
          </div>

          {/* 2. INTERACTIVE S-CURVE / PROGRESSION CHART */}
          {chronLogs.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                    <span>Curva S de Horas y Valor Acumulado en el Tiempo</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Progresión cronológica de horas reportadas por la máquina en todas las obras
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-4 text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <span className="w-3 h-3 rounded-full bg-orange-600 inline-block" />
                      <span>Horas Acumuladas</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                      <span>Valor: ${(totalValueGenerated / 1000).toFixed(1)}k</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart SVG */}
              <div className="relative overflow-x-auto">
                <div className="min-w-[600px]">
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
                    {/* Gridlines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                      const y = padding.top + graphHeight * (1 - pct);
                      const hVal = effectiveTotalHours * pct;
                      const vVal = totalValueGenerated * pct;
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
                            x={padding.left - 6}
                            y={y + 3}
                            textAnchor="end"
                            fontSize="8"
                            className="fill-slate-400 font-mono font-medium"
                          >
                            {hVal.toFixed(0)}h
                          </text>
                        </g>
                      );
                    })}

                    {/* Shaded Area */}
                    {areaPoints && (
                      <polygon points={areaPoints} className="fill-orange-500/10" />
                    )}

                    {/* S-Curve line */}
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
                    {curvePoints.map((pt, idx) => {
                      const isHovered = hoveredPoint?.reportNumber === pt.reportNumber && hoveredPoint?.dateStr === pt.dateStr;

                      return (
                        <g
                          key={idx}
                          className="cursor-pointer group"
                          onMouseEnter={() => setHoveredPoint(pt)}
                          onMouseLeave={() => setHoveredPoint(null)}
                        >
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 6 : 3.5}
                            className={`transition-all ${
                              isHovered
                                ? 'fill-orange-600 stroke-white stroke-2'
                                : 'fill-white stroke-orange-600 stroke-2 hover:r-5'
                            }`}
                          />

                          {/* Date label on bottom */}
                          {(idx === 0 || idx === curvePoints.length - 1 || idx % Math.max(Math.floor(curvePoints.length / 5), 1) === 0) && (
                            <text
                              x={pt.x}
                              y={padding.top + graphHeight + 16}
                              textAnchor="middle"
                              fontSize="8"
                              className="fill-slate-400 font-medium"
                            >
                              {pt.dateStr}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Hover Tooltip Box */}
                {hoveredPoint && (
                  <div
                    className="absolute z-20 pointer-events-none bg-slate-900 text-white rounded-xl px-3 py-2 text-xs shadow-xl border border-slate-700 animate-in fade-in zoom-in-95 duration-100"
                    style={{
                      left: Math.min(Math.max(hoveredPoint.x - 60, 10), svgWidth - 180),
                      top: Math.max(hoveredPoint.y - 65, 0),
                    }}
                  >
                    <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-orange-400">
                      <span>Rep. N° {String(hoveredPoint.reportNumber).padStart(3, '0')}</span>
                      <span>{hoveredPoint.dateStr}</span>
                    </div>
                    <div className="font-semibold text-slate-200 truncate max-w-[200px]">
                      {hoveredPoint.projectName}
                    </div>
                    <div className="flex items-center justify-between gap-3 mt-1 pt-1 border-t border-slate-800 text-[11px] font-mono">
                      <span>Jornada: <strong>+{hoveredPoint.dayHours}h</strong></span>
                      <span className="text-emerald-400 font-bold">Acum: {hoveredPoint.accumHours.toFixed(1)}h</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. RESUMEN DE HORAS POR OBRA (ACORDEÓN INTERACTIVO) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orange-600" />
                  <span>Resumen de Horas de la Máquina por Obra</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Haz clic en cualquier obra para desplegar el desglose diario detallado de reportes
                </p>
              </div>

              {projectsSummary.length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={expandAll}
                    className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                  >
                    Expandir todo
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                  >
                    Colapsar todo
                  </button>
                </div>
              )}
            </div>

            {projectsSummary.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs italic">
                Esta maquinaria no cuenta con registros de horas en ningún reporte diario aún.
              </div>
            ) : (
              <div className="space-y-3">
                {projectsSummary.map((proj) => {
                  const isExpanded = !!expandedProjects[proj.id];
                  const pct = effectiveTotalHours > 0 ? (proj.totalHours / effectiveTotalHours) * 100 : 0;

                  return (
                    <div
                      key={proj.id}
                      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs transition-all hover:border-slate-300"
                    >
                      {/* Obra Card Header (Clickable) */}
                      <button
                        type="button"
                        onClick={() => toggleProject(proj.id)}
                        className="w-full text-left p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center shrink-0 font-mono font-bold text-xs">
                            {proj.code.substring(0, 4)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-mono font-bold">
                                {proj.code}
                              </span>
                              <span className="text-xs font-semibold text-slate-500">
                                {proj.reportsCount} reportes registrados
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                              {proj.name}
                            </h4>
                          </div>
                        </div>

                        {/* Metrics and Expand Indicator */}
                        <div className="flex items-center justify-between sm:justify-end gap-5 pl-13 sm:pl-0">
                          {/* Horas en obra */}
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Horas Obra</span>
                            <span className="text-base font-black text-slate-900 font-mono">
                              {proj.totalHours.toFixed(1)} h
                            </span>
                            <span className="text-[10px] text-slate-500 block font-medium">
                              {pct.toFixed(0)}% del total
                            </span>
                          </div>

                          {/* Valor en obra */}
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Valor Generado</span>
                            <span className="text-base font-black text-emerald-700 font-mono">
                              ${proj.totalValue.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-emerald-600 block font-medium">
                              ${rate}/h
                            </span>
                          </div>

                          {/* Chevron Icon */}
                          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </button>

                      {/* Progress Bar under header */}
                      <div className="w-full bg-slate-100 h-1">
                        <div
                          className="bg-orange-600 h-1 transition-all duration-300"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>

                      {/* DESGLOSE DE REPORTES DIARIOS DE ESTA OBRA (EXPANDABLE) */}
                      {isExpanded && (
                        <div className="p-4 sm:p-5 bg-slate-50/50 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
                            <span>Desglose por Reporte Diario en esta Obra ({proj.logs.length} jornadas):</span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              Subtotal: {proj.totalHours.toFixed(1)}h • ${proj.totalValue.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                                    <th className="py-2.5 px-3">Reporte N°</th>
                                    <th className="py-2.5 px-3">Fecha</th>
                                    <th className="py-2.5 px-3 text-right">Horas Día</th>
                                    <th className="py-2.5 px-3 text-right">Valor Jornada ($)</th>
                                    <th className="py-2.5 px-4">Notas / Actividad Realizada</th>
                                    <th className="py-2.5 px-3 text-center">Acción</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {proj.logs.map((log) => {
                                    const d = new Date(log.dailyReport.date);
                                    const formattedDate = d.toLocaleDateString('es-EC', {
                                      weekday: 'short',
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    });
                                    const logRate = log.hourlyRate ?? rate;
                                    const logValue = (log.dayHours || 0) * logRate;

                                    return (
                                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                                        {/* Report Number */}
                                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                                          <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200/60">
                                            Rep. N° {String(log.dailyReport.reportNumber).padStart(3, '0')}
                                          </span>
                                        </td>

                                        {/* Date */}
                                        <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap font-medium">
                                          {formattedDate}
                                        </td>

                                        {/* Day Hours */}
                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                          {log.dayHours.toFixed(1)} h
                                        </td>

                                        {/* Day Value */}
                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                          ${logValue.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>

                                        {/* Notes */}
                                        <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate text-[11px]" title={log.notes || ''}>
                                          {log.notes || <span className="text-slate-400 italic">Operativo sin novedades</span>}
                                        </td>

                                        {/* Link to report */}
                                        <td className="py-2.5 px-3 text-center">
                                          <Link
                                            href={`/reportes/${log.dailyReport.id}`}
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline"
                                            target="_blank"
                                          >
                                            <span>Ver</span>
                                            <ExternalLink className="w-3 h-3" />
                                          </Link>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Control de equipo sincronizado con {machine.dailyLogs.length} reportes oficiales.</span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-orange-400" />
              <span>{isExportingPdf ? 'Generando PDF...' : 'Exportar Reporte PDF'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
