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
  Zap,
  PauseCircle,
} from 'lucide-react';
import { exportMachineryToPdf, exportMachineryProjectPdf } from '@/lib/exportMachineryPdf';
import { ProjectMachineryChart, ProjectMiniSparkline } from './ProjectMachineryChart';
import { MachineryAnalyticsTabs } from './MachineryAnalyticsTabs';
import { toSafeUTCDate, toDateStringUTC, formatReportDate, formatReportDateShort } from '@/lib/dateUtils';

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
    rainHoursDay?: number;
    lostRainHoursDay?: number;
    noveltiesRisks?: string | null;
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
  const [exportingProjId, setExportingProjId] = useState<string | null>(null);

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

  // 1. Download General PDF (All Projects)
  function handleDownloadGeneralPdf() {
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
      console.error('Error al generar PDF general de maquinaria:', err);
      alert('Error al generar el PDF de la maquinaria.');
    } finally {
      setIsExportingPdf(false);
    }
  }

  // 2. Download Project-Specific PDF (Single Obra)
  function handleDownloadProjectPdf(proj: { id: string; code: string; name: string }) {
    setExportingProjId(proj.id);
    try {
      exportMachineryProjectPdf(
        {
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
        },
        proj
      );
    } catch (err) {
      console.error('Error al generar PDF de obra:', err);
      alert('Error al generar el PDF de esta obra.');
    } finally {
      setExportingProjId(null);
    }
  }

  // 3. Full Day-by-Day Timeline including 0-hour idle days
  const dailyTimeline = useMemo(() => {
    if (chronLogs.length === 0) return [];

    const mapByDate = new Map<
      string,
      {
        dayHours: number;
        value: number;
        reportNumber?: number;
        reportId?: string;
        projectName?: string;
        projectCode?: string;
        notes?: string;
        rainHoursDay?: number;
        lostRainHoursDay?: number;
        noveltiesRisks?: string | null;
      }
    >();

    chronLogs.forEach((l) => {
      const dStr = toDateStringUTC(l.dailyReport.date);
      const existing = mapByDate.get(dStr) || { dayHours: 0, value: 0 };
      const r = l.hourlyRate ?? rate;
      existing.dayHours += l.dayHours || 0;
      existing.value += (l.dayHours || 0) * r;
      existing.reportNumber = l.dailyReport.reportNumber;
      existing.reportId = l.dailyReport.id;
      existing.projectName = l.dailyReport.project?.name || existing.projectName;
      existing.projectCode = l.dailyReport.project?.code || existing.projectCode;
      existing.notes = l.notes || existing.notes;
      existing.rainHoursDay = l.dailyReport.rainHoursDay ?? existing.rainHoursDay ?? 0;
      existing.lostRainHoursDay = l.dailyReport.lostRainHoursDay ?? existing.lostRainHoursDay ?? 0;
      existing.noveltiesRisks = l.dailyReport.noveltiesRisks || existing.noveltiesRisks;
      mapByDate.set(dStr, existing);
    });

    const minTime = toSafeUTCDate(chronLogs[0].dailyReport.date).getTime();
    const maxTime = toSafeUTCDate(chronLogs[chronLogs.length - 1].dailyReport.date).getTime();
    const daysDiff = Math.max(Math.round((maxTime - minTime) / (1000 * 60 * 60 * 24)), 1);

    const timeline: Array<{
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
    }> = [];

    let runningHours = 0;
    let runningValue = 0;

    if (daysDiff <= 90) {
      const cur = toSafeUTCDate(chronLogs[0].dailyReport.date);
      const end = toSafeUTCDate(chronLogs[chronLogs.length - 1].dailyReport.date);

      while (cur.getTime() <= end.getTime()) {
        const dKey = toDateStringUTC(cur);
        const match = mapByDate.get(dKey);
        const dayH = match ? match.dayHours : 0;
        const dayV = match ? match.value : 0;
        runningHours += dayH;
        runningValue += dayV;

        const fDate = formatReportDateShort(cur).substring(0, 5);
        const fullDate = formatReportDate(cur, {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

        timeline.push({
          dateStr: dKey,
          formattedDate: fDate,
          fullDateStr: fullDate,
          dayHours: dayH,
          dayValue: dayV,
          accumHours: runningHours,
          accumValue: runningValue,
          isActive: dayH > 0,
          reportNumber: match?.reportNumber,
          reportId: match?.reportId,
          projectName: match?.projectName,
          projectCode: match?.projectCode,
          notes: match?.notes,
          rainHoursDay: match?.rainHoursDay,
          lostRainHoursDay: match?.lostRainHoursDay,
          noveltiesRisks: match?.noveltiesRisks,
        });

        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    } else {
      chronLogs.forEach((l) => {
        const dKey = toDateStringUTC(l.dailyReport.date);
        const match = mapByDate.get(dKey);
        const dayH = match ? match.dayHours : 0;
        const dayV = match ? match.value : 0;
        runningHours += dayH;
        runningValue += dayV;

        timeline.push({
          dateStr: dKey,
          formattedDate: formatReportDateShort(l.dailyReport.date).substring(0, 5),
          fullDateStr: formatReportDate(l.dailyReport.date, {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          dayHours: dayH,
          dayValue: dayV,
          accumHours: runningHours,
          accumValue: runningValue,
          isActive: dayH > 0,
          reportNumber: match?.reportNumber,
          reportId: match?.reportId,
          projectName: match?.projectName,
          projectCode: match?.projectCode,
          notes: match?.notes,
          rainHoursDay: match?.rainHoursDay,
          lostRainHoursDay: match?.lostRainHoursDay,
          noveltiesRisks: match?.noveltiesRisks,
        });
      });
    }

    return timeline;
  }, [chronLogs, rate]);

  const activeDaysCount = useMemo(() => dailyTimeline.filter((t) => t.isActive).length, [dailyTimeline]);
  const inactiveDaysCount = useMemo(() => dailyTimeline.filter((t) => !t.isActive).length, [dailyTimeline]);
  const utilizationRate = dailyTimeline.length > 0 ? (activeDaysCount / dailyTimeline.length) * 100 : 0;
  const avgHoursPerActiveDay = activeDaysCount > 0 ? totalComputedHours / activeDaysCount : 0;

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

          <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
            {/* Download General PDF */}
            <button
              type="button"
              onClick={handleDownloadGeneralPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Generando...' : 'Reporte General'}</span>
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
                Aportado / Facturado en obras
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
                {machine.dailyLogs.length} reportes registrados
              </p>
            </div>
          </div>

          {/* 2. MULTI-TAB ANALYTICS ENGINE */}
          {dailyTimeline.length > 0 && (
            <MachineryAnalyticsTabs
              machineName={machine.name}
              machineCode={machine.code}
              rate={rate}
              dailyTimeline={dailyTimeline}
              projectsSummary={projectsSummary}
              onSelectProject={(projId) => {
                setExpandedProjects((prev) => ({ ...prev, [projId]: true }));
              }}
            />
          )}

          {/* 3. RESUMEN DE HORAS POR OBRA (ACORDEÓN CON DESCARGA INDIVIDUAL DE PDF) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orange-600" />
                  <span>Resumen de Horas de la Máquina por Obra</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Haz clic en cualquier obra para desplegar sus reportes diarios o descarga su ficha PDF exclusiva
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
                      <div
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

                        {/* Metrics, Sparkline, PDF Button, and Expand Indicator */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-13 sm:pl-0 flex-wrap">
                          {/* Mini Sparkline preview */}
                          <ProjectMiniSparkline logs={proj.logs} defaultRate={rate} />

                          {/* Horas en obra */}
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Horas Obra</span>
                            <span className="text-sm sm:text-base font-black text-slate-900 font-mono">
                              {proj.totalHours.toFixed(1)} h
                            </span>
                            <span className="text-[10px] text-slate-500 block font-medium">
                              {pct.toFixed(0)}% del total
                            </span>
                          </div>

                          {/* Valor en obra */}
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Valor Generado</span>
                            <span className="text-sm sm:text-base font-black text-emerald-700 font-mono">
                              ${proj.totalValue.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-emerald-600 block font-medium">
                              ${rate}/h
                            </span>
                          </div>

                          {/* Button to download PDF of this specific project */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadProjectPdf(proj);
                            }}
                            disabled={exportingProjId === proj.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-orange-50 text-slate-700 hover:text-orange-700 border border-slate-300 hover:border-orange-300 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                            title={`Descargar reporte PDF de la obra ${proj.code}`}
                          >
                            <Download className="w-3.5 h-3.5 text-orange-600" />
                            <span>
                              {exportingProjId === proj.id ? 'Generando...' : 'Reporte Obra'}
                            </span>
                          </button>

                          {/* Chevron Icon */}
                          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar under header */}
                      <div className="w-full bg-slate-100 h-1">
                        <div
                          className="bg-orange-600 h-1 transition-all duration-300"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>

                      {/* DESGLOSE DE REPORTES DIARIOS DE ESTA OBRA (EXPANDABLE) */}
                      {isExpanded && (
                        <div className="p-4 sm:p-5 bg-slate-50/50 border-t border-slate-100 space-y-3.5 animate-in fade-in duration-150">
                          {/* Visual Chart for this Obra */}
                          <ProjectMachineryChart project={proj} defaultRate={rate} />

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 font-semibold px-1 pt-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>Detalle individual por Reporte Diario ({proj.logs.length} jornadas):</span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                Subtotal: {proj.totalHours.toFixed(1)}h • ${proj.totalValue.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
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
                                    const formattedDate = formatReportDate(log.dailyReport.date, {
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
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
