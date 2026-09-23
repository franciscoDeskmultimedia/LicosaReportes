'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Calendar,
  CloudSun,
  ShieldCheck,
  Truck,
  Users,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  Save,
  DollarSign,
} from 'lucide-react';
import { createDailyReport } from '@/lib/actions/dailyReports';

interface ProjectRubro {
  id: string;
  rubroNumber: number;
  description: string;
  unit: string;
  unitPrice: number;
  currentQuantity: number;
  isPrincipal: boolean;
}

interface MachineryItem {
  id: string;
  code: string;
  name: string;
  unit: string;
}

interface ProjectData {
  id: string;
  code: string;
  name: string;
  contractAmount: number;
  durationDays: number;
  roadSection: string;
  rubros: ProjectRubro[];
}

interface PreviousReportData {
  reportNumber: number;
  elapsedDays: number;
  totalExecutedAccum: number;
  safetyTalkMinutesAccum: number;
  lostRainHoursAccum: number;
  incidentsAccum: number;
  accidentsAccum: number;
  rubroExecutions: Array<{
    projectRubroId: string;
    accumQuantity: number;
    accumAmount: number;
  }>;
}

interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

export function NewDailyReportForm({
  project,
  allProjects,
  machinery,
  previousReport,
}: {
  project: ProjectData;
  allProjects?: ProjectOption[];
  machinery: MachineryItem[];
  previousReport: PreviousReportData | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab navigation inside form
  const [activeTab, setActiveTab] = useState<'general' | 'ehs' | 'rubros' | 'equipment' | 'personnel' | 'activities' | 'weather'>('general');

  // 1. General Header Data
  const nextNumber = previousReport ? previousReport.reportNumber + 1 : 1;
  const nextElapsed = previousReport ? previousReport.elapsedDays + 1 : 1;
  const [reportNumber, setReportNumber] = useState(nextNumber.toString());
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [roadSection, setRoadSection] = useState(project.roadSection || 'Valle de la Virgen - Las Muras');
  const [elapsedDays, setElapsedDays] = useState(nextElapsed.toString());

  // 2. Clima y EHS
  const [rainHoursDay, setRainHoursDay] = useState('0');
  const [rainHoursNight, setRainHoursNight] = useState('0');
  const [lostRainHoursDay, setLostRainHoursDay] = useState('0');
  const [safetyTalkMinutesDay, setSafetyTalkMinutesDay] = useState('5');
  const [incidentsDay, setIncidentsDay] = useState('0');
  const [accidentsDay, setAccidentsDay] = useState('0');

  // Accum EHS
  const prevTalkAccum = previousReport?.safetyTalkMinutesAccum || 100;
  const prevLostRainAccum = previousReport?.lostRainHoursAccum || 4;

  // 3. Rubros State
  const initialRubroRows = project.rubros.map((r) => {
    const prevExec = previousReport?.rubroExecutions.find(
      (e) => e.projectRubroId === r.id
    );
    const prevAccumQty = prevExec?.accumQuantity || 0;
    const prevAccumAmt = prevExec?.accumAmount || 0;

    return {
      projectRubroId: r.id,
      rubroNumber: r.rubroNumber,
      description: r.description,
      unit: r.unit,
      unitPrice: r.unitPrice,
      isPrincipal: r.isPrincipal,
      prevAccumQty,
      prevAccumAmt,
      dayQuantity: '', // user fills this
    };
  });

  const [rubroRows, setRubroRows] = useState(initialRubroRows);

  function handleRubroQtyChange(rubroId: string, val: string) {
    setRubroRows((prev) =>
      prev.map((row) =>
        row.projectRubroId === rubroId ? { ...row, dayQuantity: val } : row
      )
    );
  }

  // 4. Machinery Rows
  const initialMachineryRows = machinery.map((m) => ({
    machineryId: m.id,
    code: m.code,
    description: m.name,
    unit: m.unit,
    quantity: 1,
    dayHours: '',
    notes: '',
  }));
  const [machineryRows, setMachineryRows] = useState(initialMachineryRows);

  function handleMachineChange(id: string, field: 'dayHours' | 'notes', value: string) {
    setMachineryRows((prev) =>
      prev.map((m) => (m.machineryId === id ? { ...m, [field]: value } : m))
    );
  }

  // 5. Personnel Rows
  const defaultPersonnel = [
    { categoryRole: 'Ingeniero Residente', quantity: 1, manHoursDay: 10 },
    { categoryRole: 'Planilladora', quantity: 1, manHoursDay: 8 },
    { categoryRole: 'Ayudante de Obra - Recibidor', quantity: 1, manHoursDay: 10 },
    { categoryRole: 'Operador Tractor', quantity: 1, manHoursDay: 10 },
    { categoryRole: 'Operador Excavadora', quantity: 2, manHoursDay: 10 },
    { categoryRole: 'Chofer Volqueta', quantity: 14, manHoursDay: 10 },
    { categoryRole: 'Topógrafo', quantity: 1, manHoursDay: 10 },
    { categoryRole: 'Cadeneros', quantity: 1, manHoursDay: 10 },
    { categoryRole: 'Operador Rodillo', quantity: 1, manHoursDay: 10 },
    { categoryRole: 'Chofer de tanquero', quantity: 1, manHoursDay: 10 },
    { categoryRole: 'Ambiental', quantity: 1, manHoursDay: 8 },
  ];
  const [personnelRows, setPersonnelRows] = useState(defaultPersonnel);

  function handlePersonnelChange(index: number, field: 'quantity' | 'manHoursDay', value: number) {
    setPersonnelRows((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  }

  // 6. Activities & Comments
  const [activitiesTodayVial, setActivitiesTodayVial] = useState('EXCAVACION - DESALOJO\nRELLENO MATERIAL DE PRESTAMO IMPORTADO\nDESBROCE');
  const [activitiesTodayPavimento, setActivitiesTodayPavimento] = useState('');
  const [activitiesTodayDrenaje, setActivitiesTodayDrenaje] = useState('INSTALACION DE TUBERIA H.A 1200 -\nEXCAVACION Y RELLENO PARA ESTRUCTURAS');
  const [activitiesTodayPuentes, setActivitiesTodayPuentes] = useState('CONSTRUCCION DE ACCESO PROVISIONAL');
  const [activitiesTodayAmbiental, setActivitiesTodayAmbiental] = useState('AGUA PARA CONTROL DE POLVO');
  const [activitiesTomorrowVial, setActivitiesTomorrowVial] = useState('CONTINUACIÓN DE RELLENO Y COMPACTACIÓN');
  const [noveltiesRisks, setNoveltiesRisks] = useState('EX 09: CANTERA LA CABUYA PRODUCCIÓN Y CARGADA DE VOLQUETA\nRL 16: COMPACTACION DE CAPA DE PRESTAMO');
  const [contractorComments, setContractorComments] = useState('Se solicita aprobación de densidades en capa 1.');
  const [supervisorComments, setSupervisorComments] = useState('Se constata avance conforme a especificaciones técnicas.');

  // 7. Hourly weather (Codes: 1=Despejado, 2=Nublado, 3=Llovizna, 4=Lluvia)
  const timeSlots = ['0-6', '6-8', '8-10', '10-12', '12-14', '14-16', '16-18', '18-24'];
  const [weatherSlots, setWeatherSlots] = useState(
    timeSlots.map((slot) => ({ timeSlot: slot, conditionCode: 1 }))
  );

  function handleWeatherChange(slot: string, code: number) {
    setWeatherSlots((prev) =>
      prev.map((w) => (w.timeSlot === slot ? { ...w, conditionCode: code } : w))
    );
  }

  // 8. Signatures
  const [preparedByName, setPreparedByName] = useState('Ing. María Fernanda Ligua');
  const [preparedByTitle, setPreparedByTitle] = useState('Ing. de Planillas');
  const [reviewedByName, setReviewedByName] = useState('Ing. Jerson López');
  const [reviewedByTitle, setReviewedByTitle] = useState('Residente de Obra');

  // Real-time calculations
  let calculatedDayTotal = 0;
  let calculatedPrincipalDay = 0;
  let calculatedNonPrincipalDay = 0;

  const evaluatedRubros = rubroRows.map((r) => {
    const dayQty = parseFloat(r.dayQuantity) || 0;
    const dayAmt = dayQty * r.unitPrice;
    const newAccumQty = r.prevAccumQty + dayQty;
    const newAccumAmt = r.prevAccumAmt + dayAmt;

    calculatedDayTotal += dayAmt;
    if (r.isPrincipal) {
      calculatedPrincipalDay += dayAmt;
    } else {
      calculatedNonPrincipalDay += dayAmt;
    }

    return {
      ...r,
      dayQty,
      dayAmt,
      newAccumQty,
      newAccumAmt,
    };
  });

  const prevAccumTotal = previousReport?.totalExecutedAccum || 0;
  const newAccumTotal = prevAccumTotal + calculatedDayTotal;
  const estimatedProgressPercent = project.contractAmount > 0
    ? (newAccumTotal / project.contractAmount) * 100
    : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const rExecutions = evaluatedRubros.map((r) => ({
        projectRubroId: r.projectRubroId,
        dayQuantity: r.dayQty,
        accumQuantity: r.newAccumQty,
        dayAmount: r.dayAmt,
        accumAmount: r.newAccumAmt,
        isPrincipal: r.isPrincipal,
      }));

      const machLogs = machineryRows
        .filter((m) => (parseFloat(m.dayHours) || 0) > 0 || m.notes.trim())
        .map((m) => ({
          machineryId: m.machineryId,
          description: m.description,
          unit: m.unit,
          quantity: m.quantity,
          dayHours: parseFloat(m.dayHours) || 0,
          notes: m.notes.trim() || undefined,
        }));

      const newReport = await createDailyReport({
        projectId: project.id,
        reportNumber: parseInt(reportNumber) || 1,
        date,
        roadSection,
        elapsedDays: parseInt(elapsedDays) || 1,
        totalDays: project.durationDays,
        // EHS
        rainHoursDay: parseFloat(rainHoursDay) || 0,
        rainHoursNight: parseFloat(rainHoursNight) || 0,
        lostRainHoursDay: parseFloat(lostRainHoursDay) || 0,
        lostRainHoursAccum: prevLostRainAccum + (parseFloat(lostRainHoursDay) || 0),
        safetyTalkMinutesDay: parseFloat(safetyTalkMinutesDay) || 0,
        safetyTalkMinutesAccum: prevTalkAccum + (parseFloat(safetyTalkMinutesDay) || 0),
        incidentsDay: parseInt(incidentsDay) || 0,
        incidentsAccum: (previousReport?.incidentsAccum || 0) + (parseInt(incidentsDay) || 0),
        accidentsDay: parseInt(accidentsDay) || 0,
        accidentsAccum: (previousReport?.accidentsAccum || 0) + (parseInt(accidentsDay) || 0),
        // Activities
        activitiesTodayVial,
        activitiesTodayPavimento,
        activitiesTodayDrenaje,
        activitiesTodayPuentes,
        activitiesTodayAmbiental,
        activitiesTomorrowVial,
        noveltiesRisks,
        contractorComments,
        supervisorComments,
        preparedByName,
        preparedByTitle,
        reviewedByName,
        reviewedByTitle,
        rubroExecutions: rExecutions,
        machineryLogs: machLogs,
        personnelLogs: personnelRows,
        hourlyWeather: weatherSlots,
      });

      router.push(`/reportes/${newReport.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el reporte');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/reportes"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Reportes Diarios</span>
          </Link>
          <h1 className="text-xl md:text-2xl font-black text-slate-900">
            Emitir Reporte Diario de Obra N° {String(reportNumber).padStart(3, '0')}
          </h1>
          <p className="text-xs text-slate-500">
            {project.name} • {project.contractAmount.toLocaleString('es-EC', { style: 'currency', currency: 'USD' })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-600/20 disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Guardando Reporte...' : 'Guardar y Emitir Reporte'}</span>
          </button>
        </div>
      </div>

      {/* Obra Selector for the report */}
      {allProjects && allProjects.length > 1 && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 text-[11px]">Obra del Reporte:</span>
            <span>[{project.code}] {project.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Cambiar a otra obra:</span>
            <select
              value={project.id}
              onChange={(e) => router.push(`/reportes/nuevo?projectId=${e.target.value}`)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-orange-500"
            >
              {allProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.code}] {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Floating Quick Summary Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Producción de Hoy</span>
            <span className="font-mono font-black text-base text-orange-400">
              ${calculatedDayTotal.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="hidden sm:block border-l border-slate-700 pl-6">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Nuevo Acumulado Estimado</span>
            <span className="font-mono font-bold text-sm text-emerald-400">
              ${newAccumTotal.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="hidden md:block border-l border-slate-700 pl-6">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">% Avance Resultante</span>
            <span className="font-mono font-black text-sm text-white">
              {estimatedProgressPercent.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-300 text-[11px]">
          <span>Plazo: <strong>{elapsedDays} / {project.durationDays} días</strong></span>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 bg-white rounded-xl p-1 shadow-xs text-xs font-semibold gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'general' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          1. Datos & Clima / EHS
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rubros')}
          className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'rubros' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          2. Rubros del Día ({project.rubros.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('equipment')}
          className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'equipment' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          3. Equipos / Maquinaria ({machinery.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('personnel')}
          className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'personnel' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          4. Personal & H-Hombre
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('activities')}
          className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'activities' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          5. Resumen de Actividades & Novedades
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('weather')}
          className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'weather' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          6. Clima Horario & Firmas
        </button>
      </div>

      {/* TAB 1: General & Clima/EHS */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">
              Información de la Jornada
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">N° de Reporte</label>
                <input
                  type="number"
                  required
                  value={reportNumber}
                  onChange={(e) => setReportNumber(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fecha</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tramo / Segmento</label>
                <input
                  type="text"
                  required
                  value={roadSection}
                  onChange={(e) => setRoadSection(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Días Transcurridos</label>
                <input
                  type="number"
                  required
                  value={elapsedDays}
                  onChange={(e) => setElapsedDays(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b pb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                1. Reporte de Clima y EHS (Seguridad, Salud y Ambiente)
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Horas de lluvia (Día)</label>
                <input
                  type="number"
                  step="any"
                  value={rainHoursDay}
                  onChange={(e) => setRainHoursDay(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Horas de lluvia (Noche)</label>
                <input
                  type="number"
                  step="any"
                  value={rainHoursNight}
                  onChange={(e) => setRainHoursNight(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Horas perdidas lluvia (Día)</label>
                <input
                  type="number"
                  step="any"
                  value={lostRainHoursDay}
                  onChange={(e) => setLostRainHoursDay(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiempo charla diaria (min)</label>
                <input
                  type="number"
                  step="any"
                  value={safetyTalkMinutesDay}
                  onChange={(e) => setSafetyTalkMinutesDay(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Incidentes del Día</label>
                <input
                  type="number"
                  value={incidentsDay}
                  onChange={(e) => setIncidentsDay(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Accidentes del Día</label>
                <input
                  type="number"
                  value={accidentsDay}
                  onChange={(e) => setAccidentsDay(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Rubros del Día */}
      {activeTab === 'rubros' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3">
          <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                4. Rubros Principales y Ejecución de la Jornada
              </h3>
              <p className="text-[11px] text-slate-500">
                Ingrese la cantidad ejecutada hoy. El sistema calcula automáticamente montos y acumulados.
              </p>
            </div>
            <span className="font-mono font-bold text-emerald-700 text-sm">
              Total Día: ${calculatedDayTotal.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">N° Rubro</th>
                  <th className="py-2.5 px-3">Descripción</th>
                  <th className="py-2.5 px-2 text-center">Unid.</th>
                  <th className="py-2.5 px-2 text-right">P. Unitario</th>
                  <th className="py-2.5 px-3 text-right">Cant. Anterior</th>
                  <th className="py-2.5 px-3 text-right bg-orange-50/80 text-orange-900">Cant. Día (Hoy)</th>
                  <th className="py-2.5 px-3 text-right">Cant. Acumulada</th>
                  <th className="py-2.5 px-3 text-right">Monto Día ($)</th>
                  <th className="py-2.5 px-3 text-right">Monto Acum. ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evaluatedRubros.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-500 bg-slate-50/50">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                        <AlertCircle className="w-8 h-8 text-amber-500" />
                        <h4 className="font-bold text-slate-800 text-sm">Esta obra aún no tiene rubros registrados</h4>
                        <p className="text-xs text-slate-500">
                          Para registrar la planilla diaria de avance, primero configure los rubros contractuales de la obra [{project.code}].
                        </p>
                        <Link
                          href={`/proyectos/${project.id}`}
                          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-xs shadow-sm transition-all"
                        >
                          <span>+ Agregar Rubros en la Obra</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  evaluatedRubros.map((row) => (
                  <tr key={row.projectRubroId} className="hover:bg-slate-50/70">
                    <td className="py-2 px-3 font-mono font-bold text-orange-600">
                      {row.rubroNumber}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-900 max-w-xs">
                      {row.description}
                    </td>
                    <td className="py-2 px-2 text-center font-mono text-slate-500">
                      {row.unit}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-slate-700">
                      ${row.unitPrice.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">
                      {row.prevAccumQty.toLocaleString('es-EC')}
                    </td>
                    <td className="py-2 px-3 text-right bg-orange-50/40">
                      <input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={row.dayQuantity}
                        onChange={(e) => handleRubroQtyChange(row.projectRubroId, e.target.value)}
                        className="w-24 px-2 py-1 bg-white border border-orange-300 rounded font-mono font-bold text-right text-xs focus:ring-1 focus:ring-orange-500"
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                      {row.newAccumQty.toLocaleString('es-EC')}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-orange-600">
                      ${row.dayAmt.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700">
                      ${row.newAccumAmt.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Maquinaria */}
      {activeTab === 'equipment' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3">
          <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              2. Reporte de Equipo y Maquinaria en Obra
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-4">Descripción del Equipo</th>
                  <th className="py-2.5 px-3">Unidad</th>
                  <th className="py-2.5 px-3">Cantidad</th>
                  <th className="py-2.5 px-3 bg-orange-50/80 text-orange-900">Horas Día</th>
                  <th className="py-2.5 px-4">Observaciones / Frente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {machineryRows.map((m) => (
                  <tr key={m.machineryId} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {m.description}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{m.unit}</td>
                    <td className="py-2.5 px-3 font-mono">{m.quantity}</td>
                    <td className="py-2.5 px-3 bg-orange-50/40">
                      <input
                        type="number"
                        step="any"
                        placeholder="0.0"
                        value={m.dayHours}
                        onChange={(e) => handleMachineChange(m.machineryId, 'dayHours', e.target.value)}
                        className="w-20 px-2 py-1 bg-white border border-orange-300 rounded font-mono font-bold text-right text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-4">
                      <input
                        type="text"
                        placeholder="Ej. Cantera La Cabuya producción"
                        value={m.notes}
                        onChange={(e) => handleMachineChange(m.machineryId, 'notes', e.target.value)}
                        className="w-full px-2 py-1 bg-white border rounded text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Personal */}
      {activeTab === 'personnel' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3">
          <div className="p-4 bg-slate-50 border-b">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              3. Reporte de Personal y Horas-Hombre
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-4">Categoría / Cargo</th>
                  <th className="py-2.5 px-4 text-center">N° Personas</th>
                  <th className="py-2.5 px-4 text-center">H-Hombre Día</th>
                  <th className="py-2.5 px-4 text-right">Total H-Hombre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {personnelRows.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {p.categoryRole}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <input
                        type="number"
                        min="0"
                        value={p.quantity}
                        onChange={(e) => handlePersonnelChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-1 border rounded text-center font-mono text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <input
                        type="number"
                        min="0"
                        value={p.manHoursDay}
                        onChange={(e) => handlePersonnelChange(idx, 'manHoursDay', parseFloat(e.target.value) || 0)}
                        className="w-16 px-2 py-1 border rounded text-center font-mono text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                      {p.quantity * p.manHoursDay}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Activities */}
      {activeTab === 'activities' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm text-xs">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">
              6. Resumen de Actividades Realizadas Hoy (por Disciplina)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vial</label>
                <textarea
                  rows={3}
                  value={activitiesTodayVial}
                  onChange={(e) => setActivitiesTodayVial(e.target.value)}
                  className="w-full p-2.5 border rounded-lg font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Drenaje / Alcantarillas</label>
                <textarea
                  rows={3}
                  value={activitiesTodayDrenaje}
                  onChange={(e) => setActivitiesTodayDrenaje(e.target.value)}
                  className="w-full p-2.5 border rounded-lg font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Estructuras / Puentes</label>
                <textarea
                  rows={2}
                  value={activitiesTodayPuentes}
                  onChange={(e) => setActivitiesTodayPuentes(e.target.value)}
                  className="w-full p-2.5 border rounded-lg font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ambiental / Social / Seguridad</label>
                <textarea
                  rows={2}
                  value={activitiesTodayAmbiental}
                  onChange={(e) => setActivitiesTodayAmbiental(e.target.value)}
                  className="w-full p-2.5 border rounded-lg font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm text-xs">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">
              7. Actividades a Realizar Mañana & Novedades (GDO)
            </h3>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Planificación para Mañana</label>
              <textarea
                rows={2}
                value={activitiesTomorrowVial}
                onChange={(e) => setActivitiesTomorrowVial(e.target.value)}
                className="w-full p-2.5 border rounded-lg font-mono text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                8. Novedades / Paralizaciones / Riesgos de Seguridad (GDO)
              </label>
              <textarea
                rows={3}
                value={noveltiesRisks}
                onChange={(e) => setNoveltiesRisks(e.target.value)}
                className="w-full p-2.5 border rounded-lg font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Comentarios del Contratista</label>
                <textarea
                  rows={2}
                  value={contractorComments}
                  onChange={(e) => setContractorComments(e.target.value)}
                  className="w-full p-2.5 border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Comentarios de Fiscalización</label>
                <textarea
                  rows={2}
                  value={supervisorComments}
                  onChange={(e) => setSupervisorComments(e.target.value)}
                  className="w-full p-2.5 border rounded-lg text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: Clima Horario & Firmas */}
      {activeTab === 'weather' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm text-xs">
            <div className="border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                10. Condiciones Climáticas por Franja Horaria
              </h3>
              <p className="text-[11px] text-slate-500">
                Códigos: 1 = Despejado | 2 = Nublado | 3 = Llovizna | 4 = Lluvia
              </p>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {weatherSlots.map((slot) => (
                <div key={slot.timeSlot} className="p-2.5 bg-slate-50 rounded-xl border text-center">
                  <span className="font-mono font-bold text-[11px] text-slate-600 block mb-1">
                    {slot.timeSlot}
                  </span>
                  <select
                    value={slot.conditionCode}
                    onChange={(e) => handleWeatherChange(slot.timeSlot, parseInt(e.target.value))}
                    className="w-full p-1 bg-white border rounded font-mono font-bold text-xs text-center"
                  >
                    <option value={1}>1 (Desp.)</option>
                    <option value={2}>2 (Nubl.)</option>
                    <option value={3}>3 (Llov.)</option>
                    <option value={4}>4 (Lluvia)</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm text-xs">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">
              11. Cuadro de Responsables y Firmas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border space-y-3">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700 block">
                  Elaborado por (Planillaje):
                </span>
                <div>
                  <label className="block font-medium text-slate-500 mb-0.5">Nombre</label>
                  <input
                    type="text"
                    required
                    value={preparedByName}
                    onChange={(e) => setPreparedByName(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-lg bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-500 mb-0.5">Cargo</label>
                  <input
                    type="text"
                    required
                    value={preparedByTitle}
                    onChange={(e) => setPreparedByTitle(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border space-y-3">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700 block">
                  Revisado por (Residencia de Obra):
                </span>
                <div>
                  <label className="block font-medium text-slate-500 mb-0.5">Nombre</label>
                  <input
                    type="text"
                    required
                    value={reviewedByName}
                    onChange={(e) => setReviewedByName(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-lg bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-500 mb-0.5">Cargo</label>
                  <input
                    type="text"
                    required
                    value={reviewedByTitle}
                    onChange={(e) => setReviewedByTitle(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Action Footer */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <Link
          href="/reportes"
          className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-600/20 disabled:opacity-50 transition-all"
        >
          {loading ? 'Guardando Reporte...' : 'Guardar y Emitir Reporte Diario'}
        </button>
      </div>
    </form>
  );
}
