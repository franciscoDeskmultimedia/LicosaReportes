'use client';

import React from 'react';
import Link from 'next/link';
import { Printer, ArrowLeft, Download, FileSpreadsheet, CheckCircle2, ExternalLink } from 'lucide-react';
import { formatReportDate } from '@/lib/dateUtils';

interface RubroExecution {
  id: string;
  dayQuantity: number;
  accumQuantity: number;
  dayAmount: number;
  accumAmount: number;
  projectRubro: {
    rubroNumber: number;
    description: string;
    unit: string;
    unitPrice: number;
    isPrincipal: boolean;
  };
}

interface MachineryLog {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  dayHours: number;
  accumHours?: number;
  hourlyRate?: number;
  machinery?: {
    hourlyRate?: number;
  } | null;
  notes: string | null;
}

interface PersonnelLog {
  id: string;
  categoryRole: string;
  quantity: number;
  manHoursDay: number;
  totalManHours: number;
}

interface HourlyWeather {
  id: string;
  timeSlot: string;
  conditionCode: number;
}

interface DailyReportFull {
  id: string;
  reportNumber: number;
  date: Date | string;
  roadSection: string;
  elapsedDays: number;
  totalDays: number;
  totalExecutedDay: number;
  totalExecutedAccum: number;
  principalExecutedDay: number;
  principalExecutedAccum: number;
  nonPrincipalExecutedDay: number;
  nonPrincipalExecutedAccum: number;
  progressPercentAccum: number;
  // EHS
  rainHoursDay: number;
  rainHoursNight: number;
  lostRainHoursDay: number;
  lostRainHoursAccum: number;
  safetyTalkMinutesDay: number;
  safetyTalkMinutesAccum: number;
  incidentsDay: number;
  incidentsAccum: number;
  accidentsDay: number;
  accidentsAccum: number;
  // Activities
  activitiesTodayVial: string | null;
  activitiesTodayPavimento: string | null;
  activitiesTodayDrenaje: string | null;
  activitiesTodayPuentes: string | null;
  activitiesTodayTopografia: string | null;
  activitiesTodaySenalizacion: string | null;
  activitiesTodayAmbiental: string | null;
  activitiesTomorrowVial: string | null;
  activitiesTomorrowPavimento: string | null;
  activitiesTomorrowDrenaje: string | null;
  activitiesTomorrowPuentes: string | null;
  activitiesTomorrowTopografia: string | null;
  activitiesTomorrowSenalizacion: string | null;
  activitiesTomorrowAmbiental: string | null;
  noveltiesRisks: string | null;
  contractorComments: string | null;
  supervisorComments: string | null;
  preparedByName: string;
  preparedByTitle: string;
  reviewedByName: string;
  reviewedByTitle: string;
  // Relations
  project: {
    id: string;
    code: string;
    name: string;
    contractor: string;
    client: string;
    inspectionCompany: string;
    executingCompany: string;
    contractNumber: string;
    financingSource: string;
    contractAmount: number;
  };
  rubroExecutions: RubroExecution[];
  machineryLogs: MachineryLog[];
  personnelLogs: PersonnelLog[];
  hourlyWeather: HourlyWeather[];
}

export function OfficialReportDocument({
  report,
  embedded = false,
}: {
  report: DailyReportFull;
  embedded?: boolean;
}) {
  const formattedDate = formatReportDate(report.date, {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const principalRubros = report.rubroExecutions.filter((r) => r.projectRubro.isPrincipal);
  const sumRubrosDay = principalRubros.reduce((acc, r) => acc + (r.dayAmount || 0), 0);
  const calculatedDayTotal = sumRubrosDay > 0 ? sumRubrosDay : (report.principalExecutedDay || report.totalExecutedDay || 0);
  const calculatedAccumTotal = report.principalExecutedAccum || report.totalExecutedAccum || 0;

  const totalMachineryCostDay = report.machineryLogs.reduce((acc, m) => {
    const rate = m.hourlyRate ?? m.machinery?.hourlyRate ?? 0;
    return acc + ((m.dayHours || 0) * rate);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Top action bar (hidden on print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          {!embedded && (
            <Link
              href="/reportes"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Volver al listado"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-orange-600 font-bold uppercase tracking-wider">
                {embedded ? 'Último Reporte Diario Emitido' : 'Formato Oficial de Obra'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Versión Oficial HTML
              </span>
            </div>
            <h1 className="text-base font-bold text-slate-900">
              Reporte Diario de Obra N° {String(report.reportNumber).padStart(3, '0')} • {formattedDate}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {embedded && (
            <Link
              href={`/reportes/${report.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-200"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver Pantalla Completa</span>
            </Link>
          )}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md shadow-slate-900/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-orange-400" />
            <span>Imprimir / Guardar en PDF</span>
          </button>
        </div>
      </div>

      {/* Official 3-Page Document Container */}
      <div className="print-container max-w-[900px] mx-auto bg-white p-6 sm:p-10 border border-slate-300 shadow-xl rounded-xl space-y-12 text-slate-900 font-sans text-xs">
        
        {/* ========================================================================= */}
        {/* PÁGINA 1 DEL REPORTE OFICIAL                                             */}
        {/* ========================================================================= */}
        <div className="space-y-3 print-avoid-break">
          {/* Official Navy Header */}
          <div className="bg-[#1e3a8a] text-white flex items-center justify-between py-1.5 px-4 border border-slate-800 shadow-xs">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="LICOSA" className="h-8 w-auto object-contain" />
            </div>
            <div className="font-black text-sm tracking-wide uppercase text-center flex-1 sm:pr-16">
              REPORTE DIARIO DE OBRA
            </div>
          </div>

          {/* Project Title Banner */}
          <div className="bg-slate-100 border border-slate-300 p-2 text-center text-[10.5px] font-bold uppercase text-slate-800 leading-tight">
            {report.project.name}
          </div>

          {/* Contractual Meta Grid */}
          <div className="grid grid-cols-3 border border-slate-400 text-[10px] divide-x divide-slate-400">
            <div className="p-1.5 space-y-0.5">
              <div><strong className="text-slate-900">CONTRATISTA:</strong> {report.project.contractor}</div>
            </div>
            <div className="p-1.5 space-y-0.5">
              <div><strong className="text-slate-900">CONTRATANTE:</strong> {report.project.client}</div>
            </div>
            <div className="p-1.5 space-y-0.5">
              <div><strong className="text-slate-900">FISCALIZACIÓN:</strong> {report.project.inspectionCompany}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 border-x border-b border-slate-400 text-[10px] divide-x divide-slate-400">
            <div className="p-1.5 space-y-0.5">
              <div><strong className="text-slate-900">EMPRESA EJECUTORA / FRENTE:</strong> {report.project.executingCompany}</div>
            </div>
            <div className="p-1.5 space-y-0.5">
              <div><strong className="text-slate-900">Contrato N°:</strong> {report.project.contractNumber}</div>
            </div>
            <div className="p-1.5 space-y-0.5">
              <div><strong className="text-slate-900">Financiamiento:</strong> {report.project.financingSource}</div>
            </div>
          </div>

          {/* Date & Key Stats Banner */}
          <div className="grid grid-cols-5 border border-slate-400 text-[10px] text-center font-bold divide-x divide-slate-400 bg-slate-50">
            <div className="p-1.5">
              <span className="text-[9px] text-slate-500 block">FECHA:</span>
              <span className="capitalize">{formattedDate}</span>
            </div>
            <div className="p-1.5">
              <span className="text-[9px] text-slate-500 block">REPORTE N°:</span>
              <span className="text-xs font-mono text-blue-900 font-black">{String(report.reportNumber).padStart(3, '0')}</span>
            </div>
            <div className="p-1.5">
              <span className="text-[9px] text-slate-500 block">TRAMO / SEGMENTO:</span>
              <span>{report.roadSection}</span>
            </div>
            <div className="p-1.5">
              <span className="text-[9px] text-slate-500 block">% AVANCE:</span>
              <span className="text-xs font-mono text-emerald-800 font-black">{report.progressPercentAccum.toFixed(2)}%</span>
            </div>
            <div className="p-1.5">
              <span className="text-[9px] text-slate-500 block">DÍAS TRANSCURRIDOS / PLAZO:</span>
              <span>{report.elapsedDays}/{report.totalDays}</span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-2 flex justify-between items-center text-xs font-bold text-blue-950">
            <span>MONTO DE TRABAJOS EJECUTADOS EN LA JORNADA:</span>
            <span className="font-mono text-sm">${report.totalExecutedDay.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</span>
          </div>

          {/* Secciones de Recursos: Equipos & Personal */}
          <div className="space-y-2">
            {/* 1. Equipos */}
            <div className="border border-slate-400">
              <div className="bg-[#1e3a8a] text-white font-bold text-[10px] px-2 py-1 uppercase flex items-center justify-between">
                <span>1. REPORTE DE EQUIPO Y MAQUINARIA</span>
                <span className="text-[9px] font-mono font-normal">Tarifas y horas efectivas</span>
              </div>
              <table className="w-full text-[9px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-300 text-slate-700">
                    <th className="py-1 px-1.5 text-left">Descripción del equipo</th>
                    <th className="py-1 px-1 text-center w-12">Unidad</th>
                    <th className="py-1 px-1 text-center w-10">Cant.</th>
                    <th className="py-1 px-1.5 text-right w-16">Horas día</th>
                    <th className="py-1 px-1.5 text-right w-18 bg-slate-200/50">Horas acum.</th>
                    <th className="py-1 px-1.5 text-right w-16 text-emerald-800">$/hora</th>
                    <th className="py-1 px-1.5 text-right w-20 bg-emerald-50 text-emerald-900 font-extrabold">Costo día</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {report.machineryLogs.map((m) => {
                    const accum = m.accumHours !== undefined ? m.accumHours : m.dayHours;
                    const rate = m.hourlyRate ?? m.machinery?.hourlyRate ?? 0;
                    const dayCost = (m.dayHours || 0) * rate;

                    return (
                      <tr key={m.id}>
                        <td className="py-0.5 px-1.5 font-medium">{m.description}</td>
                        <td className="py-0.5 px-1 text-center font-mono">{m.unit}</td>
                        <td className="py-0.5 px-1 text-center font-mono">{m.quantity}</td>
                        <td className="py-0.5 px-1.5 text-right font-mono font-bold text-orange-700">
                          {m.dayHours > 0 ? m.dayHours.toFixed(1) : '-'}
                        </td>
                        <td className="py-0.5 px-1.5 text-right font-mono font-bold text-slate-900 bg-slate-50/70">
                          {accum > 0 ? accum.toFixed(1) : '-'}
                        </td>
                        <td className="py-0.5 px-1.5 text-right font-mono text-emerald-700 font-semibold">
                          ${rate.toFixed(2)}
                        </td>
                        <td className="py-0.5 px-1.5 text-right font-mono font-bold text-slate-900 bg-emerald-50/40">
                          ${dayCost.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t border-slate-300 text-slate-900">
                    <td colSpan={5} className="py-1 px-2 text-right text-[8.5px] uppercase">
                      Total Costo Maquinaria Jornada ($):
                    </td>
                    <td colSpan={2} className="py-1 px-2 text-right font-mono text-emerald-900 font-black">
                      ${totalMachineryCostDay.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 2. Personal */}
            <div className="border border-slate-400">
              <div className="bg-[#1e3a8a] text-white font-bold text-[10px] px-2 py-1 uppercase">
                2. REPORTE DE PERSONAL EN OBRA
              </div>
              <table className="w-full text-[9px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-300 text-slate-700">
                    <th className="py-1 px-2 text-left">Categoría / Cargo</th>
                    <th className="py-1 px-2 text-center w-20">N° Trabajadores</th>
                    <th className="py-1 px-2 text-right w-28">H-Hombre día</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {report.personnelLogs.map((p) => (
                    <tr key={p.id}>
                      <td className="py-0.5 px-2 font-medium">{p.categoryRole}</td>
                      <td className="py-0.5 px-2 text-center font-mono">{p.quantity}</td>
                      <td className="py-0.5 px-2 text-right font-mono">{p.manHoursDay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Rubros Principales del Día */}
          <div className="border border-slate-400">
            <div className="bg-[#1e3a8a] text-white font-bold text-[10px] px-2 py-1 uppercase">
              3. RUBROS PRINCIPALES DEL DÍA
            </div>
            <table className="w-full text-[9.5px] border-collapse">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-300 text-slate-700">
                  <th className="py-1 px-1 text-center w-12">N° Rubro</th>
                  <th className="py-1 px-2 text-left">Descripción (auto)</th>
                  <th className="py-1 px-1 text-center">Unid.</th>
                  <th className="py-1 px-2 text-right">Cant. día</th>
                  <th className="py-1 px-2 text-right">Cant. acum.</th>
                  <th className="py-1 px-2 text-right">Monto día ($)</th>
                  <th className="py-1 px-2 text-right">Monto acum. ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {principalRubros.map((r) => (
                  <tr key={r.id}>
                    <td className="py-1 px-1 text-center font-bold text-slate-800">
                      {r.projectRubro.rubroNumber}
                    </td>
                    <td className="py-1 px-2 font-sans font-medium text-slate-900">
                      {r.projectRubro.description}
                    </td>
                    <td className="py-1 px-1 text-center text-slate-600">
                      {r.projectRubro.unit}
                    </td>
                    <td className="py-1 px-2 text-right font-bold">
                      {r.dayQuantity.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-2 text-right">
                      {r.accumQuantity.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-2 text-right font-bold text-slate-900">
                      $ {r.dayAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-2 text-right">
                      $ {r.accumAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {/* Fila 1: Subtotal exacto del día */}
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900">
                  <td colSpan={5} className="py-1.5 px-3 text-right uppercase text-[9.5px]">
                    SUBTOTAL RUBROS PRINCIPALES (DÍA):
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-sm text-blue-900 font-black">
                    $ {calculatedDayTotal.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1.5 px-2 text-center text-slate-400 font-mono text-xs">
                    -
                  </td>
                </tr>
                {/* Fila 2: Monto acumulado del proyecto en su propia fila independiente */}
                <tr className="bg-blue-50 font-bold border-t border-blue-200 text-blue-950">
                  <td colSpan={5} className="py-1.5 px-3 text-right uppercase text-[9.5px]">
                    MONTO ACUMULADO DEL PROYECTO (HASTA ESTA FECHA):
                  </td>
                  <td colSpan={2} className="py-1.5 px-3 text-right font-mono text-sm text-blue-950 font-black">
                    $ {calculatedAccumTotal.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Page break marker for print */}
        <div className="print-page-break" />

        {/* ========================================================================= */}
        {/* PÁGINA 2 DEL REPORTE OFICIAL                                             */}
        {/* ========================================================================= */}
        <div className="space-y-4 print-avoid-break">
          {/* Section 5: Avance Económico Ejecutado */}
          <div className="border border-slate-400">
            <div className="bg-[#1e3a8a] text-white font-bold text-[10px] px-2 py-1 uppercase">
              5. AVANCE ECONÓMICO EJECUTADO ($)
            </div>
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-300 text-slate-700">
                  <th className="py-1 px-3 text-left">CONCEPTO</th>
                  <th className="py-1 px-3 text-right">DÍA ($)</th>
                  <th className="py-1 px-3 text-right">ACUMULADO ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                <tr>
                  <td className="py-1 px-3 font-sans">Rubros Principales</td>
                  <td className="py-1 px-3 text-right font-bold">
                    {report.principalExecutedDay.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-3 text-right font-bold">
                    {report.principalExecutedAccum.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 px-3 font-sans">Rubros NO Principales</td>
                  <td className="py-1 px-3 text-right">
                    {report.nonPrincipalExecutedDay.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-3 text-right">
                    {report.nonPrincipalExecutedAccum.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr className="bg-blue-900/10 font-bold border-t border-slate-300 text-slate-900">
                  <td className="py-1.5 px-3 font-sans">AVANCE EJECUTADO TOTAL</td>
                  <td className="py-1.5 px-3 text-right font-mono text-sm">
                    {report.totalExecutedDay.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono text-sm">
                    {report.totalExecutedAccum.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="grid grid-cols-2 border-t border-slate-400 p-1.5 px-3 bg-slate-50 font-bold text-[10px]">
              <div>
                <span>Monto contractual asignado a LICOSA ($):</span>{' '}
                <span className="font-mono text-xs">{report.project.contractAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="text-right">
                <span>% AVANCE ACUMULADO DE LA OBRA (LICOSA):</span>{' '}
                <span className="font-mono text-sm text-emerald-800">{report.progressPercentAccum.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* Section 6: Resumen de Actividades Realizadas Hoy */}
          <div className="border border-slate-400">
            <div className="bg-[#1e3a8a] text-white font-bold text-[10px] px-2 py-1 uppercase">
              6. RESUMEN DE ACTIVIDADES REALIZADAS HOY
            </div>
            <div className="divide-y divide-slate-300 text-[9.5px]">
              <div className="grid grid-cols-4 p-1.5">
                <strong className="col-span-1 text-slate-700 uppercase">VIAL</strong>
                <div className="col-span-3 font-mono whitespace-pre-line text-slate-900">
                  {report.activitiesTodayVial || '-'}
                </div>
              </div>
              <div className="grid grid-cols-4 p-1.5">
                <strong className="col-span-1 text-slate-700 uppercase">ESTRUCTURA DE PAVIMENTO</strong>
                <div className="col-span-3 font-mono whitespace-pre-line text-slate-900">
                  {report.activitiesTodayPavimento || '-'}
                </div>
              </div>
              <div className="grid grid-cols-4 p-1.5">
                <strong className="col-span-1 text-slate-700 uppercase">DRENAJE</strong>
                <div className="col-span-3 font-mono whitespace-pre-line text-slate-900">
                  {report.activitiesTodayDrenaje || '-'}
                </div>
              </div>
              <div className="grid grid-cols-4 p-1.5">
                <strong className="col-span-1 text-slate-700 uppercase">ESTRUCTURAS / PUENTES</strong>
                <div className="col-span-3 font-mono whitespace-pre-line text-slate-900">
                  {report.activitiesTodayPuentes || '-'}
                </div>
              </div>
              <div className="grid grid-cols-4 p-1.5">
                <strong className="col-span-1 text-slate-700 uppercase">TOPOGRAFÍA</strong>
                <div className="col-span-3 font-mono whitespace-pre-line text-slate-900">
                  {report.activitiesTodayTopografia || '-'}
                </div>
              </div>
              <div className="grid grid-cols-4 p-1.5">
                <strong className="col-span-1 text-slate-700 uppercase">SEÑALIZACIÓN</strong>
                <div className="col-span-3 font-mono whitespace-pre-line text-slate-900">
                  {report.activitiesTodaySenalizacion || '-'}
                </div>
              </div>
              <div className="grid grid-cols-4 p-1.5">
                <strong className="col-span-1 text-slate-700 uppercase">AMBIENTAL / SOCIAL / SEGURIDAD</strong>
                <div className="col-span-3 font-mono whitespace-pre-line text-slate-900">
                  {report.activitiesTodayAmbiental || '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Section 7: Actividades a Realizar Mañana */}
          <div className="border border-slate-400">
            <div className="bg-[#1e3a8a] text-white font-bold text-[10px] px-2 py-1 uppercase">
              7. ACTIVIDADES A REALIZAR MAÑANA
            </div>
            <div className="p-2 text-[9.5px] font-mono whitespace-pre-line text-slate-900 min-h-[45px]">
              {report.activitiesTomorrowVial || 'Continuación de actividades programadas según cronograma.'}
            </div>
          </div>

          {/* Section 8: Novedades / Paralizaciones */}
          <div className="border border-slate-400">
            <div className="bg-[#1e3a8a] text-white font-bold text-[10px] px-2 py-1 uppercase">
              8. NOVEDADES / PARALIZACIONES / RIESGOS DE SEGURIDAD (GDO)
            </div>
            <div className="p-2 text-[9.5px] font-mono whitespace-pre-line text-slate-900 min-h-[50px]">
              {report.noveltiesRisks || 'Sin novedades críticas que reportar en la jornada.'}
            </div>
          </div>

          {/* Section 9: Comentarios */}
          <div className="border border-slate-400">
            <div className="bg-[#1e3a8a] text-white font-bold text-[10px] px-2 py-1 uppercase">
              9. COMENTARIOS
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-400 text-[9.5px]">
              <div className="p-2 min-h-[60px]">
                <strong className="text-[10px] text-slate-700 block mb-1">COMENTARIOS DEL CONTRATISTA:</strong>
                <p className="text-slate-800 italic">{report.contractorComments || 'Ninguno'}</p>
              </div>
              <div className="p-2 min-h-[60px]">
                <strong className="text-[10px] text-slate-700 block mb-1">COMENTARIOS DE FISCALIZACIÓN:</strong>
                <p className="text-slate-800 italic">{report.supervisorComments || 'Ninguno'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Page break marker for print */}
        <div className="print-page-break" />

        {/* ========================================================================= */}
        {/* PÁGINA 3 DEL REPORTE OFICIAL                                             */}
        {/* ========================================================================= */}
        <div className="space-y-6 print-avoid-break">
          {/* Section 10: Condiciones Climáticas por Franja Horaria */}
          <div className="border border-slate-400">
            <div className="bg-[#1e3a8a] text-white font-bold text-[10px] px-2 py-1 uppercase">
              10. CONDICIONES CLIMÁTICAS POR FRANJA HORARIA
            </div>
            <table className="w-full text-[10px] border-collapse text-center">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-300 text-slate-700">
                  <th className="py-1 px-2 border-r border-slate-300">Horario</th>
                  <th className="py-1 px-2 border-r border-slate-300">0-6</th>
                  <th className="py-1 px-2 border-r border-slate-300">6-8</th>
                  <th className="py-1 px-2 border-r border-slate-300">8-10</th>
                  <th className="py-1 px-2 border-r border-slate-300">10-12</th>
                  <th className="py-1 px-2 border-r border-slate-300">12-14</th>
                  <th className="py-1 px-2 border-r border-slate-300">14-16</th>
                  <th className="py-1 px-2 border-r border-slate-300">16-18</th>
                  <th className="py-1 px-2">18-24</th>
                </tr>
              </thead>
              <tbody>
                <tr className="font-mono font-bold text-xs">
                  <td className="py-1.5 px-2 border-r border-slate-300 font-sans font-semibold text-slate-700">
                    Condición (1-4)
                  </td>
                  {['0-6', '6-8', '8-10', '10-12', '12-14', '14-16', '16-18', '18-24'].map((slot) => {
                    const match = report.hourlyWeather.find((w) => w.timeSlot === slot);
                    return (
                      <td key={slot} className="py-1.5 px-2 border-r border-slate-300 last:border-r-0">
                        {match?.conditionCode || 1}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
            <div className="p-1 px-2 text-[9px] text-slate-500 border-t border-slate-200 bg-slate-50">
              <em>Códigos: 1 = Despejado | 2 = Nublado | 3 = Llovizna | 4 = Lluvia</em>
            </div>
          </div>

          {/* Section 11: Firmas Oficiales */}
          <div className="border border-slate-400">
            <div className="bg-[#1e3a8a] text-white font-bold text-[10px] px-2 py-1 uppercase">
              11. FIRMAS
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-400 text-center">
              <div className="p-6 pt-16 flex flex-col justify-end items-center">
                <div className="w-56 border-t border-slate-800 pt-1.5">
                  <strong className="block text-[11px] text-slate-900">{report.preparedByName}</strong>
                  <span className="text-[10px] text-slate-600 block">{report.preparedByTitle}</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">ELABORADO POR</span>
                </div>
              </div>

              <div className="p-6 pt-16 flex flex-col justify-end items-center">
                <div className="w-56 border-t border-slate-800 pt-1.5">
                  <strong className="block text-[11px] text-slate-900">{report.reviewedByName}</strong>
                  <span className="text-[10px] text-slate-600 block">{report.reviewedByTitle}</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">REVISADO POR</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-[9px] text-slate-400 pt-6">
            Documento generado por el Sistema de Control de Obra y Bodega LICOSA • Hoja 3 de 3
          </div>
        </div>

      </div>
    </div>
  );
}
