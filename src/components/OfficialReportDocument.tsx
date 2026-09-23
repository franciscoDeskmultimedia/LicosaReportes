'use client';

import React from 'react';
import Link from 'next/link';
import { Printer, ArrowLeft, Download, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

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

export function OfficialReportDocument({ report }: { report: DailyReportFull }) {
  const reportDate = new Date(report.date);
  const formattedDate = reportDate.toLocaleDateString('es-EC', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const principalRubros = report.rubroExecutions.filter((r) => r.projectRubro.isPrincipal);

  return (
    <div className="space-y-6">
      {/* Top action bar (hidden on print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/reportes"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Volver al listado"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Formato Oficial de Obra</span>
            <h1 className="text-base font-bold text-slate-900">
              Reporte Diario de Obra N° {String(report.reportNumber).padStart(3, '0')}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md shadow-slate-900/20 transition-all"
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
          <div className="bg-[#1e3a8a] text-white text-center py-2 px-4 font-black text-sm tracking-wide uppercase border border-slate-800 shadow-xs">
            REPORTE DIARIO DE OBRA
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

          {/* Section 1: Clima & EHS */}
          <div className="border border-slate-400">
            <div className="bg-[#1e3a8a] text-white font-bold text-[10px] px-2 py-1 uppercase">
              1. REPORTE DE CLIMA Y EHS (SEGURIDAD, SALUD Y AMBIENTE)
            </div>
            <div className="grid grid-cols-2 text-[10px] divide-x divide-slate-300">
              <div className="divide-y divide-slate-200">
                <div className="flex justify-between p-1 px-2">
                  <span>Horas de lluvia (día)</span>
                  <strong className="font-mono">{report.rainHoursDay}</strong>
                </div>
                <div className="flex justify-between p-1 px-2">
                  <span>Horas de lluvia (noche)</span>
                  <strong className="font-mono">{report.rainHoursNight}</strong>
                </div>
                <div className="flex justify-between p-1 px-2">
                  <span>Horas perdidas por lluvia</span>
                  <strong className="font-mono">{report.lostRainHoursDay}</strong>
                </div>
                <div className="flex justify-between p-1 px-2">
                  <span>Horas perdidas acum. por lluvia</span>
                  <strong className="font-mono">{report.lostRainHoursAccum}</strong>
                </div>
              </div>

              <div className="divide-y divide-slate-200">
                <div className="flex justify-between p-1 px-2">
                  <span>Tiempo charla diaria (min)</span>
                  <strong className="font-mono">{report.safetyTalkMinutesDay}</strong>
                </div>
                <div className="flex justify-between p-1 px-2">
                  <span>Tiempo charla acum. (min)</span>
                  <strong className="font-mono">{report.safetyTalkMinutesAccum}</strong>
                </div>
                <div className="flex justify-between p-1 px-2">
                  <span>Incidentes (día / acum.)</span>
                  <strong className="font-mono">{report.incidentsDay} / {report.incidentsAccum}</strong>
                </div>
                <div className="flex justify-between p-1 px-2">
                  <span>Accidentes (día / acum.)</span>
                  <strong className="font-mono">{report.accidentsDay} / {report.accidentsAccum}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2 & 3 Side by Side: Equipos & Personal */}
          <div className="grid grid-cols-2 gap-2">
            {/* 2. Equipos */}
            <div className="border border-slate-400">
              <div className="bg-[#1e3a8a] text-white font-bold text-[10px] px-2 py-1 uppercase">
                2. REPORTE DE EQUIPO
              </div>
              <table className="w-full text-[9.5px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-300 text-slate-700">
                    <th className="py-1 px-1.5 text-left">Descripción del equipo</th>
                    <th className="py-1 px-1 text-center">Unidad</th>
                    <th className="py-1 px-1 text-center">Cantidad</th>
                    <th className="py-1 px-1 text-right">Horas día</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {report.machineryLogs.map((m) => (
                    <tr key={m.id}>
                      <td className="py-0.5 px-1.5 font-medium">{m.description}</td>
                      <td className="py-0.5 px-1 text-center font-mono">{m.unit}</td>
                      <td className="py-0.5 px-1 text-center font-mono">{m.quantity}</td>
                      <td className="py-0.5 px-1 text-right font-mono font-bold">{m.dayHours > 0 ? m.dayHours.toFixed(1) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 3. Personal */}
            <div className="border border-slate-400">
              <div className="bg-[#1e3a8a] text-white font-bold text-[10px] px-2 py-1 uppercase">
                3. REPORTE DE PERSONAL
              </div>
              <table className="w-full text-[9.5px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-300 text-slate-700">
                    <th className="py-1 px-1.5 text-left">Categoría / Cargo</th>
                    <th className="py-1 px-1 text-center">N°</th>
                    <th className="py-1 px-1 text-right">H-Hombre día</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {report.personnelLogs.map((p) => (
                    <tr key={p.id}>
                      <td className="py-0.5 px-1.5 font-medium">{p.categoryRole}</td>
                      <td className="py-0.5 px-1 text-center font-mono">{p.quantity}</td>
                      <td className="py-0.5 px-1 text-right font-mono">{p.manHoursDay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Rubros Principales del Día */}
          <div className="border border-slate-400">
            <div className="bg-[#1e3a8a] text-white font-bold text-[10px] px-2 py-1 uppercase">
              4. RUBROS PRINCIPALES DEL DÍA
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
                    <td className="py-1 px-2 text-right font-bold">
                      $ {r.dayAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-2 text-right">
                      $ {r.accumAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900">
                  <td colSpan={5} className="py-1.5 px-3 text-right uppercase text-[10px]">
                    SUBTOTAL RUBROS PRINCIPALES ($)
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-sm">
                    $ {report.principalExecutedDay.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-sm">
                    $ {report.principalExecutedAccum.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
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
