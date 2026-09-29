'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  CloudRain,
  Sun,
  CloudSun,
  Cloud,
  Truck,
  HardHat,
  Users,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Layers,
  MapPin,
  Compass,
  FileSpreadsheet,
  Printer,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Building2,
  Activity,
  Award,
} from 'lucide-react';

interface DailyReportHtmlDashboardProps {
  report: any;
  project?: any;
  onToggleOfficialView?: () => void;
  showingOfficialView?: boolean;
}

export function DailyReportHtmlDashboard({
  report,
  project,
  onToggleOfficialView,
  showingOfficialView = false,
}: DailyReportHtmlDashboardProps) {
  const [rubroFilter, setRubroFilter] = useState<'all' | 'dayOnly'>('dayOnly');

  if (!report) return null;

  // Formatting helpers
  const reportDate = new Date(report.date);
  const formattedDate = reportDate.toLocaleDateString('es-EC', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedShortDate = reportDate.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Financial & Progress metrics
  const contractBudget = report.contractAmount || report.project?.contractAmount || 1;
  const dayBilled = report.totalExecutedDay || 0;
  const accumBilled = report.totalExecutedAccum || 0;
  const progressPercent = report.progressPercentAccum || (accumBilled / contractBudget) * 100 || 0;

  // Time metrics
  const elapsedDays = report.elapsedDays || 0;
  const totalDays = report.totalDays || report.project?.durationDays || 1;
  const timePercent = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const spi = timePercent > 0 ? progressPercent / timePercent : 1;
  const isHealthyProgress = spi >= 0.9;

  // Personnel count
  const personnelLogs = report.personnelLogs || [];
  const totalWorkers = personnelLogs.reduce((acc: number, p: any) => acc + (p.count || 0), 0);

  // Machinery logs
  const machineryLogs = report.machineryLogs || [];
  const totalMachineryHoursDay = machineryLogs.reduce((acc: number, m: any) => acc + (m.dayHours || 0), 0);
  const totalMachineryHoursAccum = machineryLogs.reduce((acc: number, m: any) => acc + (m.accumHours || m.dayHours || 0), 0);

  // Rubros executed
  const rubroExecutions = report.rubroExecutions || [];
  const rubrosWithDayWork = rubroExecutions.filter((r: any) => (r.dayQuantity || 0) > 0);
  const rubrosToDisplay = rubroFilter === 'dayOnly' && rubrosWithDayWork.length > 0 ? rubrosWithDayWork : rubroExecutions;

  // Weather calculations
  const rainHours = report.rainHoursDay || 0;
  const lostHours = report.lostRainHoursDay || 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* ========================================================================= */}
      {/* 1. HERO HEADER: Estado general y navegación                               */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-7 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-orange-600 text-white shadow-xs">
                REPORTE N° {String(report.reportNumber).padStart(3, '0')}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300">
                Obra: {report.project?.code || project?.code || 'LICOSA'}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Vigente & Aprobado
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white capitalize tracking-tight">
              {formattedDate}
            </h2>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                <span>Tramo / Abscisas: <strong className="text-white">{report.roadSection || 'Tramo Principal de Obra'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span>Fiscalización: <strong className="text-white">{report.project?.inspectionCompany || 'Fiscalización Oficial'}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {onToggleOfficialView && (
              <button
                onClick={onToggleOfficialView}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-orange-400" />
                <span>{showingOfficialView ? 'Vista Dashboard HTML' : 'Ver Formato A4 Impreso'}</span>
              </button>
            )}

            <Link
              href={`/reportes/${report.id}`}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Página Completa</span>
            </Link>

            <Link
              href={`/reportes/${report.id}/imprimir`}
              target="_blank"
              className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-orange-600/30"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CARDS RESUMEN EJECUTIVO (KPIs con Gráficos e Indicadores)              */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 bg-slate-50/70 border-b border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Avance Físico con Radial Gauge SVG */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Avance Físico Acumulado
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {progressPercent.toFixed(1)}%
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  de 100%
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isHealthyProgress
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  <TrendingUp className="w-3 h-3" />
                  SPI {spi.toFixed(2)} ({isHealthyProgress ? 'En Ritmo' : 'Retraso'})
                </span>
              </div>
            </div>

            {/* Circular Gauge SVG */}
            <div className="relative w-16 h-16 flex-shrink-0 flex items-center justify-center">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={isHealthyProgress ? 'text-emerald-500' : 'text-amber-500'}
                  strokeDasharray={`${Math.min(100, progressPercent)}, 100`}
                  strokeLinecap="round"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[11px] font-bold text-slate-700 font-mono">
                {Math.round(progressPercent)}%
              </span>
            </div>
          </div>

          {/* Card 2: Planillaje Monetario del Día vs Acumulado */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600">
                Planillado Hoy en Reporte
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  ${dayBilled.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Total Acumulado:</span>
              <span className="font-mono font-bold text-slate-800">
                ${accumBilled.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Card 3: Plazo y Cronograma Contractual */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">
                Plazo y Tiempo Transcurrido
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {elapsedDays}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  / {totalDays} días
                </span>
              </div>
            </div>
            
            {/* Horizontal Timeline Bar */}
            <div className="space-y-1 pt-2">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, timePercent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>{timePercent.toFixed(1)}% consumido</span>
                <span>{remainingDays} días rest.</span>
              </div>
            </div>
          </div>

          {/* Card 4: Clima & Horas Afectadas */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Condición Climática de Jornada
              </span>
              <div className="flex items-center gap-2 mt-1">
                {rainHours > 0 ? (
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <CloudRain className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Sun className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {rainHours > 0 ? 'Lluvias Registradas' : 'Tiempo Despejado'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {rainHours}h lluvia / {lostHours}h perdidas
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Impacto en Turno:</span>
              <span className={`font-bold text-[11px] ${lostHours > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {lostHours > 0 ? `-${lostHours} horas efectivas` : 'Jornada Continua'}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. RECURSOS EN CAMPO: PERSONAL Y MAQUINARIA (TARJETAS VISUALES)             */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 border-b border-slate-200">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* PERSONAL Y CUADRILLAS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-orange-100 text-orange-600 rounded-lg">
                  <HardHat className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Personal en Obra ({totalWorkers} personas)
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {personnelLogs.length} cuadrillas activas
              </span>
            </div>

            {personnelLogs.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-xl text-center text-xs text-slate-400 border border-dashed border-slate-200">
                Sin personal específico detallado en este informe.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {personnelLogs.map((p: any, idx: number) => (
                  <div
                    key={p.id || idx}
                    className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                        {p.count}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {p.categoryRole}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {p.company || 'Personal Directo'}
                        </p>
                      </div>
                    </div>
                    {p.observations && (
                      <span className="text-[10px] text-slate-400 max-w-[80px] truncate" title={p.observations}>
                        {p.observations}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MAQUINARIA Y EQUIPO CON HORAS ACUMULADAS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                  <Truck className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Maquinaria y Horómetro ({machineryLogs.length} equipos)
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-blue-600 font-bold">{totalMachineryHoursDay.toFixed(1)}h hoy</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600 font-bold">{totalMachineryHoursAccum.toFixed(1)}h acum.</span>
              </div>
            </div>

            {machineryLogs.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-xl text-center text-xs text-slate-400 border border-dashed border-slate-200">
                Sin maquinaria reportada en este informe.
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {machineryLogs.map((m: any, idx: number) => {
                  const hoursDay = m.dayHours || 0;
                  const hoursAccum = m.accumHours ?? hoursDay;
                  const isStandby = m.status === 'PARADO' || hoursDay === 0;

                  return (
                    <div
                      key={m.id || idx}
                      className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between gap-3 hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                            isStandby ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600'
                          }`}
                        >
                          <Truck className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {m.description || m.machinery?.name || 'Equipo de Obra'}
                            </span>
                            {m.quantity && m.quantity > 1 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 rounded-sm text-slate-600">
                                x{m.quantity}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Estado: <strong className={isStandby ? 'text-slate-500' : 'text-emerald-600'}>{m.status || (hoursDay > 0 ? 'OPERATIVO' : 'EN ESPERA')}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Horas del día y Horas acumuladas */}
                      <div className="flex items-center gap-3 text-right flex-shrink-0">
                        <div className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                          <p className="text-[9px] uppercase font-bold text-slate-400">Horas Día</p>
                          <p className="text-xs font-extrabold text-blue-600 font-mono">
                            {hoursDay.toFixed(1)}h
                          </p>
                        </div>
                        <div className="bg-orange-50/60 px-2 py-1 rounded-lg border border-orange-100/60">
                          <p className="text-[9px] uppercase font-bold text-orange-600">Horas Acum.</p>
                          <p className="text-xs font-extrabold text-slate-900 font-mono">
                            {hoursAccum.toFixed(1)}h
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. PLANILLAJE DE RUBROS DEL DÍA (TABLA VISUAL CONSUMIBLE)                 */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <Layers className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Planillaje de Rubros en este Reporte
              </h3>
              <p className="text-xs text-slate-500">
                {rubrosWithDayWork.length} rubros con trabajo registrado en la fecha
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
              <button
                onClick={() => setRubroFilter('dayOnly')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  rubroFilter === 'dayOnly'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Solo Ejecutados Hoy ({rubrosWithDayWork.length})
              </button>
              <button
                onClick={() => setRubroFilter('all')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  rubroFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Todos los Rubros ({rubroExecutions.length})
              </button>
            </div>
          </div>
        </div>

        {rubrosToDisplay.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-500 font-semibold">
              No se registraron volúmenes de obra ejecutados en la fecha de este reporte.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] w-12 text-center">
                    N°
                  </th>
                  <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px]">
                    Descripción del Rubro
                  </th>
                  <th className="py-2.5 px-2 font-bold text-slate-600 uppercase text-[10px] text-center w-14">
                    Unidad
                  </th>
                  <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] text-right">
                    P. Unit.
                  </th>
                  <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] text-right bg-orange-50/60">
                    Cant. Hoy
                  </th>
                  <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] text-right bg-orange-50/60">
                    Monto Hoy ($)
                  </th>
                  <th className="py-2.5 px-3 font-bold text-slate-600 uppercase text-[10px] text-right">
                    Cant. Acum.
                  </th>
                  <th className="py-2.5 px-4 font-bold text-slate-600 uppercase text-[10px] min-w-[160px]">
                    Avance vs Contrato
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rubrosToDisplay.map((r: any) => {
                  const rubroData = r.projectRubro || {};
                  const dayQty = r.dayQuantity || 0;
                  const dayAmt = r.dayAmount || (dayQty * (rubroData.unitPrice || 0));
                  const accumQty = r.accumQuantity ?? dayQty;
                  const currentQty = rubroData.currentQuantity || rubroData.initialQuantity || 1;
                  const pct = Math.min(100, Math.max(0, (accumQty / currentQty) * 100));

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {rubroData.rubroNumber || '-'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800">
                            {rubroData.description || 'Rubro sin descripción'}
                          </span>
                          {rubroData.isPrincipal && (
                            <span className="px-1.5 py-0.2 rounded-xs text-[9px] font-extrabold uppercase bg-orange-100 text-orange-700 flex-shrink-0">
                              Principal
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600 font-mono text-[11px]">
                          {rubroData.unit || 'u'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        ${(rubroData.unitPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-orange-600 bg-orange-50/30">
                        {dayQty.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900 bg-orange-50/30">
                        ${dayAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {accumQty.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="w-full">
                          <div className="flex items-center justify-between text-[10px] mb-1 font-mono">
                            <span className="font-bold text-slate-700">{pct.toFixed(1)}%</span>
                            <span className="text-slate-400">{accumQty.toFixed(1)} / {currentQty.toFixed(1)}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. ACTIVIDADES EJECUTADAS POR FRENTES DE TRABAJO (CARDS ORGANIZADAS)       */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/40">
        <div className="flex items-center gap-2 mb-4">
          <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
            <Activity className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Actividades Ejecutadas por Frente de Trabajo
            </h3>
            <p className="text-xs text-slate-500">
              Detalle descriptivo de las labores operativas realizadas en la fecha
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Frente 1: Vial & Movimiento de Tierras */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-orange-600" />
              <span>Frente Vial / Movimiento de Tierras</span>
            </div>
            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
              {report.activitiesTodayVial || 'Sin actividades registradas en este frente durante la jornada.'}
            </p>
          </div>

          {/* Frente 2: Pavimento / Asfalto / Hormigón */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>Frente de Pavimento / Carpeta Asfáltica</span>
            </div>
            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
              {report.activitiesTodayPavimento || 'Sin actividades registradas en este frente durante la jornada.'}
            </p>
          </div>

          {/* Frente 3: Drenaje, Alcantarillas y Estructuras */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-600 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-cyan-600" />
              <span>Frente de Drenaje & Obras de Arte</span>
            </div>
            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
              {report.activitiesTodayDrenaje || 'Sin actividades registradas en este frente durante la jornada.'}
            </p>
          </div>

          {/* Frente 4: Topografía y Control Geométrico */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>Frente de Topografía & Replanteo</span>
            </div>
            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
              {report.activitiesTodayTopografia || 'Sin actividades registradas en este frente durante la jornada.'}
            </p>
          </div>

        </div>

        {/* Novedades y Riesgos */}
        <div className="mt-4 p-4 rounded-xl border bg-white border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Novedades, Riesgos y Observaciones de Obra</span>
          </div>
          <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
            {report.noveltiesRisks || 'Sin novedades imprevistas, accidentes ni riesgos críticos reportados en la jornada.'}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. FIRMAS Y RESPONSABLES TÉCNICOS                                         */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 bg-slate-100/60 border-t border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs text-center space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Elaborado por (Residencia)
            </p>
            <p className="text-xs font-bold text-slate-900">
              {report.preparedByName || 'Ing. Residente de Obra'}
            </p>
            <p className="text-[10px] text-slate-500">
              {report.preparedByRole || 'Residente de Obra LICOSA'}
            </p>
            <div className="pt-2 flex items-center justify-center gap-1 text-[10px] text-emerald-600 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Validado en Sistema</span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs text-center space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Revisado por (Fiscalización)
            </p>
            <p className="text-xs font-bold text-slate-900">
              {report.reviewedByName || 'Ing. Fiscalizador'}
            </p>
            <p className="text-[10px] text-slate-500">
              {report.reviewedByRole || 'Fiscalización del Proyecto'}
            </p>
            <div className="pt-2 flex items-center justify-center gap-1 text-[10px] text-blue-600 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Conforme Técnico</span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs text-center space-y-1 sm:col-span-2 md:col-span-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Aprobado por (Superintendencia)
            </p>
            <p className="text-xs font-bold text-slate-900">
              {report.approvedByName || 'Superintendente General'}
            </p>
            <p className="text-[10px] text-slate-500">
              {report.approvedByRole || 'Dirección de Obra'}
            </p>
            <div className="pt-2 flex items-center justify-center gap-1 text-[10px] text-purple-600 font-semibold">
              <Award className="w-3.5 h-3.5" />
              <span>Aprobado</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
