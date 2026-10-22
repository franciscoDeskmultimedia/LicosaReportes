'use client';

import React, { useState, useMemo } from 'react';
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
  Search,
  Hash,
  X,
  Edit3,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { updateDailyReport } from '@/lib/actions/dailyReports';

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

interface ReportData {
  id: string;
  projectId: string;
  reportNumber: number;
  date: string | Date;
  roadSection: string;
  elapsedDays: number;
  totalDays: number;
  totalExecutedDay: number;
  totalExecutedAccum: number;
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
  activitiesTodayVial?: string | null;
  activitiesTodayPavimento?: string | null;
  activitiesTodayDrenaje?: string | null;
  activitiesTodayPuentes?: string | null;
  activitiesTodayTopografia?: string | null;
  activitiesTodaySenalizacion?: string | null;
  activitiesTodayAmbiental?: string | null;
  activitiesTomorrowVial?: string | null;
  activitiesTomorrowPavimento?: string | null;
  activitiesTomorrowDrenaje?: string | null;
  activitiesTomorrowPuentes?: string | null;
  activitiesTomorrowTopografia?: string | null;
  activitiesTomorrowSenalizacion?: string | null;
  activitiesTomorrowAmbiental?: string | null;
  noveltiesRisks?: string | null;
  contractorComments?: string | null;
  supervisorComments?: string | null;
  preparedByName?: string | null;
  preparedByTitle?: string | null;
  reviewedByName?: string | null;
  reviewedByTitle?: string | null;
  rubroExecutions: Array<{
    id?: string;
    projectRubroId: string;
    dayQuantity: number;
    accumQuantity: number;
    dayAmount: number;
    accumAmount: number;
    projectRubro?: {
      rubroNumber: number;
      description: string;
      unit: string;
    };
  }>;
  machineryLogs: Array<{
    id?: string;
    machineryId?: string | null;
    description: string;
    unit: string;
    quantity: number;
    dayHours: number;
    notes?: string | null;
  }>;
  personnelLogs: Array<{
    id?: string;
    categoryRole: string;
    quantity: number;
    manHoursDay: number;
    totalManHours?: number;
  }>;
  hourlyWeather: Array<{
    id?: string;
    timeSlot: string;
    conditionCode: number;
  }>;
}

export function EditDailyReportForm({
  report,
  project,
  machinery,
}: {
  report: ReportData;
  project: ProjectData;
  machinery: MachineryItem[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab navigation inside form
  const [activeTab, setActiveTab] = useState<'general' | 'ehs' | 'rubros' | 'equipment' | 'personnel' | 'activities' | 'weather'>('general');

  // Reason for modification (Audit Trail)
  const [editReason, setEditReason] = useState('');

  // 1. General Header Data
  const initialDateStr = report.date instanceof Date
    ? report.date.toISOString().split('T')[0]
    : typeof report.date === 'string'
    ? report.date.split('T')[0]
    : new Date().toISOString().split('T')[0];

  const [reportNumber, setReportNumber] = useState(report.reportNumber.toString());
  const [date, setDate] = useState(initialDateStr);
  const [roadSection, setRoadSection] = useState(report.roadSection || project.roadSection || '');
  const [elapsedDays, setElapsedDays] = useState(report.elapsedDays.toString());
  const [totalDays, setTotalDays] = useState(report.totalDays?.toString() || project.durationDays.toString());

  // 2. Clima y EHS
  const [rainHoursDay, setRainHoursDay] = useState(report.rainHoursDay?.toString() || '0');
  const [rainHoursNight, setRainHoursNight] = useState(report.rainHoursNight?.toString() || '0');
  const [lostRainHoursDay, setLostRainHoursDay] = useState(report.lostRainHoursDay?.toString() || '0');
  const [lostRainHoursAccum, setLostRainHoursAccum] = useState(report.lostRainHoursAccum?.toString() || '0');
  const [safetyTalkMinutesDay, setSafetyTalkMinutesDay] = useState(report.safetyTalkMinutesDay?.toString() || '5');
  const [safetyTalkMinutesAccum, setSafetyTalkMinutesAccum] = useState(report.safetyTalkMinutesAccum?.toString() || '105');
  const [incidentsDay, setIncidentsDay] = useState(report.incidentsDay?.toString() || '0');
  const [incidentsAccum, setIncidentsAccum] = useState(report.incidentsAccum?.toString() || '0');
  const [accidentsDay, setAccidentsDay] = useState(report.accidentsDay?.toString() || '0');
  const [accidentsAccum, setAccidentsAccum] = useState(report.accidentsAccum?.toString() || '0');

  // 3. Rubros State
  // Initial mapping: for each project rubro, find execution if already registered in this report
  const existingRubroMap = new Map(report.rubroExecutions.map((e) => [e.projectRubroId, e]));

  const initialRubroRows = project.rubros.map((r) => {
    const exec = existingRubroMap.get(r.id);
    const dayQty = exec ? exec.dayQuantity : 0;
    // Base accum before this day = exec.accumQuantity - exec.dayQuantity
    const prevAccumQty = exec ? Math.max(0, exec.accumQuantity - exec.dayQuantity) : 0;
    const prevAccumAmt = exec ? Math.max(0, exec.accumAmount - exec.dayAmount) : 0;

    return {
      projectRubroId: r.id,
      rubroNumber: r.rubroNumber,
      description: r.description,
      unit: r.unit,
      unitPrice: r.unitPrice,
      isPrincipal: r.isPrincipal,
      prevAccumQty,
      prevAccumAmt,
      dayQuantity: dayQty > 0 ? dayQty.toString() : '',
    };
  });

  const [rubroRows, setRubroRows] = useState(initialRubroRows);
  const [rubroNumberSearch, setRubroNumberSearch] = useState('');
  const [rubroNameSearch, setRubroNameSearch] = useState('');
  const [rubroFilterType, setRubroFilterType] = useState<'all' | 'withWork' | 'principal'>('all');

  function handleRubroQtyChange(rubroId: string, val: string) {
    setRubroRows((prev) =>
      prev.map((row) =>
        row.projectRubroId === rubroId ? { ...row, dayQuantity: val } : row
      )
    );
  }

  // 4. Machinery Rows
  const existingMachMap = new Map(report.machineryLogs.map((m) => [m.machineryId || m.description, m]));

  const initialMachineryRows = machinery.map((m) => {
    const existingLog = existingMachMap.get(m.id) || existingMachMap.get(m.code) || existingMachMap.get(m.name);
    return {
      machineryId: m.id,
      code: m.code,
      description: m.name,
      unit: m.unit,
      quantity: 1,
      dayHours: existingLog?.dayHours ? existingLog.dayHours.toString() : '',
      notes: existingLog?.notes || '',
    };
  });

  // Include any extra machinery that might be in report but not in active master list
  for (const mLog of report.machineryLogs) {
    const exists = initialMachineryRows.some(
      (im) => im.machineryId === mLog.machineryId || im.description === mLog.description
    );
    if (!exists) {
      initialMachineryRows.push({
        machineryId: mLog.machineryId || mLog.description,
        code: mLog.description.split(' ')[0] || 'MAQ',
        description: mLog.description,
        unit: mLog.unit || 'hora',
        quantity: mLog.quantity || 1,
        dayHours: mLog.dayHours ? mLog.dayHours.toString() : '',
        notes: mLog.notes || '',
      });
    }
  }

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

  const initialPersonnel = report.personnelLogs && report.personnelLogs.length > 0
    ? report.personnelLogs.map((p) => ({
        categoryRole: p.categoryRole,
        quantity: p.quantity,
        manHoursDay: p.manHoursDay,
      }))
    : defaultPersonnel;

  const [personnelRows, setPersonnelRows] = useState(initialPersonnel);

  function handlePersonnelChange(index: number, field: 'quantity' | 'manHoursDay', value: number) {
    setPersonnelRows((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  }

  // 6. Activities & Comments
  const [activitiesTodayVial, setActivitiesTodayVial] = useState(report.activitiesTodayVial || '');
  const [activitiesTodayPavimento, setActivitiesTodayPavimento] = useState(report.activitiesTodayPavimento || '');
  const [activitiesTodayDrenaje, setActivitiesTodayDrenaje] = useState(report.activitiesTodayDrenaje || '');
  const [activitiesTodayPuentes, setActivitiesTodayPuentes] = useState(report.activitiesTodayPuentes || '');
  const [activitiesTodayTopografia, setActivitiesTodayTopografia] = useState(report.activitiesTodayTopografia || '');
  const [activitiesTodaySenalizacion, setActivitiesTodaySenalizacion] = useState(report.activitiesTodaySenalizacion || '');
  const [activitiesTodayAmbiental, setActivitiesTodayAmbiental] = useState(report.activitiesTodayAmbiental || '');
  const [activitiesTomorrowVial, setActivitiesTomorrowVial] = useState(report.activitiesTomorrowVial || '');
  const [noveltiesRisks, setNoveltiesRisks] = useState(report.noveltiesRisks || '');
  const [contractorComments, setContractorComments] = useState(report.contractorComments || '');
  const [supervisorComments, setSupervisorComments] = useState(report.supervisorComments || '');

  // 7. Hourly weather
  const timeSlots = ['0-6', '6-8', '8-10', '10-12', '12-14', '14-16', '16-18', '18-24'];
  const existingWeatherMap = new Map((report.hourlyWeather || []).map((w) => [w.timeSlot, w.conditionCode]));
  const initialWeather = timeSlots.map((slot) => ({
    timeSlot: slot,
    conditionCode: existingWeatherMap.has(slot) ? existingWeatherMap.get(slot)! : 1,
  }));
  const [weatherSlots, setWeatherSlots] = useState(initialWeather);

  function handleWeatherChange(slot: string, code: number) {
    setWeatherSlots((prev) =>
      prev.map((w) => (w.timeSlot === slot ? { ...w, conditionCode: code } : w))
    );
  }

  // 8. Signatures
  const [preparedByName, setPreparedByName] = useState(report.preparedByName || 'Ing. María Fernanda Ligua');
  const [preparedByTitle, setPreparedByTitle] = useState(report.preparedByTitle || 'Ing. de Planillas');
  const [reviewedByName, setReviewedByName] = useState(report.reviewedByName || 'Ing. Jerson López');
  const [reviewedByTitle, setReviewedByTitle] = useState(report.reviewedByTitle || 'Residente de Obra');

  // Real-time calculations
  let calculatedDayTotal = 0;
  let calculatedPrincipalDay = 0;
  let calculatedNonPrincipalDay = 0;
  let rubrosWithWorkCount = 0;

  const evaluatedRubros = rubroRows.map((r) => {
    const dayQty = parseFloat(r.dayQuantity) || 0;
    if (dayQty > 0) rubrosWithWorkCount++;
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

  const filteredRubros = useMemo(() => {
    return evaluatedRubros.filter((row) => {
      if (rubroFilterType === 'withWork' && (parseFloat(row.dayQuantity) || 0) <= 0) return false;
      if (rubroFilterType === 'principal' && !row.isPrincipal) return false;

      if (rubroNumberSearch.trim() !== '') {
        const queryNum = rubroNumberSearch.trim().toLowerCase();
        if (!row.rubroNumber.toString().includes(queryNum)) return false;
      }

      if (rubroNameSearch.trim() !== '') {
        const queryName = rubroNameSearch.trim().toLowerCase();
        if (!row.description.toLowerCase().includes(queryName)) return false;
      }

      return true;
    });
  }, [evaluatedRubros, rubroFilterType, rubroNumberSearch, rubroNameSearch]);

  const activeEquipmentCount = machineryRows.filter((m) => (parseFloat(m.dayHours) || 0) > 0).length;
  const totalMachineryHours = machineryRows.reduce((sum, m) => sum + (parseFloat(m.dayHours) || 0), 0);
  const diffExecutedDay = calculatedDayTotal - (report.totalExecutedDay || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const rExecutions = evaluatedRubros
        .filter((r) => r.dayQty > 0 || r.prevAccumQty > 0)
        .map((r) => ({
          projectRubroId: r.projectRubroId,
          dayQuantity: r.dayQty,
          accumQuantity: r.newAccumQty,
          dayAmount: r.dayAmt,
          accumAmount: r.newAccumAmt,
        }));

      const machLogs = machineryRows
        .filter((m) => (parseFloat(m.dayHours) || 0) > 0 || m.notes.trim())
        .map((m) => ({
          machineryId: m.machineryId.startsWith('MAQ') ? undefined : m.machineryId,
          description: m.description,
          unit: m.unit,
          quantity: m.quantity,
          dayHours: parseFloat(m.dayHours) || 0,
          notes: m.notes.trim() || undefined,
        }));

      await updateDailyReport({
        id: report.id,
        reportNumber: parseInt(reportNumber) || report.reportNumber,
        date,
        roadSection,
        elapsedDays: parseInt(elapsedDays) || report.elapsedDays,
        totalDays: parseInt(totalDays) || report.totalDays || project.durationDays,
        reason: editReason.trim() || undefined,
        // EHS
        rainHoursDay: parseFloat(rainHoursDay) || 0,
        rainHoursNight: parseFloat(rainHoursNight) || 0,
        lostRainHoursDay: parseFloat(lostRainHoursDay) || 0,
        lostRainHoursAccum: parseFloat(lostRainHoursAccum) || 0,
        safetyTalkMinutesDay: parseFloat(safetyTalkMinutesDay) || 0,
        safetyTalkMinutesAccum: parseFloat(safetyTalkMinutesAccum) || 0,
        incidentsDay: parseInt(incidentsDay) || 0,
        incidentsAccum: parseInt(incidentsAccum) || 0,
        accidentsDay: parseInt(accidentsDay) || 0,
        accidentsAccum: parseInt(accidentsAccum) || 0,
        // Activities
        activitiesTodayVial,
        activitiesTodayPavimento,
        activitiesTodayDrenaje,
        activitiesTodayPuentes,
        activitiesTodayTopografia,
        activitiesTodaySenalizacion,
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

      router.push(`/reportes/${report.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar los cambios en el reporte');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link
              href={`/reportes/${report.id}`}
              className="inline-flex items-center gap-1 font-semibold text-orange-600 hover:text-orange-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a Reporte N° {String(report.reportNumber).padStart(3, '0')}</span>
            </Link>
            <span>•</span>
            <span className="text-slate-400">Modificación de Reporte Diario</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-amber-500" />
              <span>Editar Reporte Diario N° {String(report.reportNumber).padStart(3, '0')}</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
              Modo Administrador
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Obra: <strong>[{project.code}] {project.name}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/reportes/${report.id}`}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Guardando y Notificando...' : 'Guardar Modificación'}</span>
          </button>
        </div>
      </div>

      {/* Audit Banner Notice */}
      <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900 shadow-xs">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">
            Registro de Auditoría y Trazabilidad en Tiempo Real:
          </p>
          <p className="text-amber-800 text-[11px] leading-relaxed">
            Cualquier cambio realizado en este formulario quedará registrado permanentemente en la <strong>Pista de Auditoría</strong> con tu usuario, fecha y un desglose campo por campo de los valores anteriores versus nuevos. Asimismo, se emitirá una notificación push automática alertando de la modificación a todo el equipo.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Real-Time Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Avance Diario Modificado
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              ${calculatedDayTotal.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10px]">
            <span className="text-slate-400">Original:</span>
            <span className="font-mono text-slate-600">
              ${Number(report.totalExecutedDay || 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
            </span>
            {Math.abs(diffExecutedDay) > 0.01 && (
              <span className={`font-bold font-mono px-1.5 py-0.2 rounded ${
                diffExecutedDay > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {diffExecutedDay > 0 ? '+' : ''}${diffExecutedDay.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Rubros con Producción
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-blue-600">
              {rubrosWithWorkCount}
            </span>
            <span className="text-xs text-slate-400">de {project.rubros.length} rubros</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            Principal: ${calculatedPrincipalDay.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Maquinaria en Operación
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-amber-600">
              {activeEquipmentCount}
            </span>
            <span className="text-xs text-slate-400">máquinas activas</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            Total horas: {totalMachineryHours.toFixed(1)} h
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Días de Plazo
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-purple-600">
              {elapsedDays}
            </span>
            <span className="text-xs text-slate-400">/ {totalDays} días</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {((parseInt(elapsedDays) || 1) / (parseInt(totalDays) || 1) * 100).toFixed(1)}% transcurrido
          </span>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-xs flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'general'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>1. General & Motivo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rubros')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'rubros'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>2. Rubros & Producción ({rubrosWithWorkCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('equipment')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'equipment'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>3. Maquinaria & Equipos ({activeEquipmentCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('personnel')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'personnel'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>4. Personal & Cuadrillas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('weather')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'weather'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CloudSun className="w-4 h-4" />
          <span>5. Clima Horario & EHS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('activities')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'activities'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>6. Actividades & Firmas</span>
        </button>
      </div>

      {/* TAB 1: General & Motivo de Modificación */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Datos Generales & Justificación de Auditoría</h2>
            <p className="text-xs text-slate-500">Configura la cabecera del reporte y explica el motivo del cambio.</p>
          </div>

          {/* Edit Reason Box */}
          <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-2xl space-y-2">
            <label className="text-xs font-bold text-orange-900 flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-orange-600" />
              <span>Motivo / Justificación de la Modificación (Recomendado para la Pista de Auditoría)</span>
            </label>
            <input
              type="text"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="Ej: Corrección de metraje de excavación según conciliación con fiscalización..."
              className="w-full px-3.5 py-2.5 bg-white border border-orange-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
            />
            <p className="text-[11px] text-orange-700/80">
              Este motivo quedará registrado junto a tu nombre y correo en la bitácora inmutable de auditoría.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">N° de Reporte</label>
              <input
                type="number"
                value={reportNumber}
                onChange={(e) => setReportNumber(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Fecha del Reporte</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Días Transcurridos</label>
              <input
                type="number"
                value={elapsedDays}
                onChange={(e) => setElapsedDays(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Plazo Contractual (Días)</label>
              <input
                type="number"
                value={totalDays}
                onChange={(e) => setTotalDays(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Tramo / Segmento de Intervención</label>
            <input
              type="text"
              value={roadSection}
              onChange={(e) => setRoadSection(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium"
            />
          </div>
        </div>
      )}

      {/* TAB 2: Rubros & Producción */}
      {activeTab === 'rubros' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Cantidades & Avance de Rubros</h2>
              <p className="text-xs text-slate-500">
                Ajusta las cantidades producidas en la fecha. Los montos diarios y acumulados se recalculan automáticamente.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setRubroFilterType('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  rubroFilterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Todos ({project.rubros.length})
              </button>
              <button
                type="button"
                onClick={() => setRubroFilterType('withWork')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  rubroFilterType === 'withWork' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                Con Trabajo ({rubrosWithWorkCount})
              </button>
              <button
                type="button"
                onClick={() => setRubroFilterType('principal')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  rubroFilterType === 'principal' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                Principales
              </button>
            </div>
          </div>

          {/* Quick Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por N° de Rubro..."
                value={rubroNumberSearch}
                onChange={(e) => setRubroNumberSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
              />
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por Descripción..."
                value={rubroNameSearch}
                onChange={(e) => setRubroNameSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
            <table className="w-full text-xs text-left min-w-[700px]">
              <thead className="bg-slate-100 text-slate-600 text-[11px] uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-16">N°</th>
                  <th className="p-3">Descripción del Rubro</th>
                  <th className="p-3 text-right">P. Unitario</th>
                  <th className="p-3 text-right">Cant. Anterior</th>
                  <th className="p-3 text-center w-36">Cant. Día (Editar)</th>
                  <th className="p-3 text-right">Monto Día ($)</th>
                  <th className="p-3 text-right">Cant. Acumulada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRubros.map((row) => {
                  const hasWork = (parseFloat(row.dayQuantity) || 0) > 0;
                  return (
                    <tr
                      key={row.projectRubroId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        hasWork ? 'bg-orange-50/20' : ''
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-slate-800">
                        {row.rubroNumber}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900">{row.description}</span>
                          {row.isPrincipal && (
                            <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[9px] font-bold">
                              Principal
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Unidad: {row.unit}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">
                        ${row.unitPrice.toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-500">
                        {row.prevAccumQty.toLocaleString('es-EC', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.dayQuantity}
                          onChange={(e) => handleRubroQtyChange(row.projectRubroId, e.target.value)}
                          placeholder="0.00"
                          className={`w-28 px-2.5 py-1.5 text-right font-mono font-bold text-xs rounded-lg border transition-all ${
                            hasWork
                              ? 'border-orange-500 bg-orange-50/50 text-orange-950 focus:ring-2 focus:ring-orange-400'
                              : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                          }`}
                        />
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        ${row.dayAmt.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">
                        {row.newAccumQty.toLocaleString('es-EC', { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Maquinaria */}
      {activeTab === 'equipment' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Parte Diario de Maquinaria & Horómetros</h2>
            <p className="text-xs text-slate-500">
              Registra las horas trabajadas por equipo en la jornada. El sistema conciliará automáticamente la diferencia con el horómetro acumulado del equipo.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
            <table className="w-full text-xs text-left min-w-[650px]">
              <thead className="bg-slate-100 text-slate-600 text-[11px] uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Código / Equipo</th>
                  <th className="p-3 text-center w-36">Horas Día (Editar)</th>
                  <th className="p-3">Observaciones / Frente de Trabajo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {machineryRows.map((mach) => {
                  const hasHours = (parseFloat(mach.dayHours) || 0) > 0;
                  return (
                    <tr
                      key={mach.machineryId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        hasHours ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                            {mach.code}
                          </span>
                          <span className="font-semibold text-slate-900">{mach.description}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          value={mach.dayHours}
                          onChange={(e) => handleMachineChange(mach.machineryId, 'dayHours', e.target.value)}
                          placeholder="0.0"
                          className={`w-24 px-2.5 py-1.5 text-center font-mono font-bold text-xs rounded-lg border ${
                            hasHours
                              ? 'border-amber-500 bg-amber-50/60 text-amber-950 font-black'
                              : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={mach.notes}
                          onChange={(e) => handleMachineChange(mach.machineryId, 'notes', e.target.value)}
                          placeholder="Ej: Tramo 2, cargando material de cantera..."
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Personal */}
      {activeTab === 'personnel' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Personal & Mano de Obra en Frente</h2>
            <p className="text-xs text-slate-500">
              Modifica el número de trabajadores y las horas hombre por categoría en el reporte.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {personnelRows.map((person, idx) => (
              <div
                key={person.categoryRole}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 line-clamp-1">
                    {person.categoryRole}
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-slate-500">
                    {(person.quantity * person.manHoursDay).toFixed(0)} H-H
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">N° Trabajadores</label>
                    <input
                      type="number"
                      min="0"
                      value={person.quantity}
                      onChange={(e) => handlePersonnelChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono font-bold text-slate-900 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">H-H / Día</label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      value={person.manHoursDay}
                      onChange={(e) => handlePersonnelChange(idx, 'manHoursDay', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono font-bold text-slate-900 text-center"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Clima Horario & EHS */}
      {activeTab === 'weather' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Condición Climática Horaria & Seguridad (EHS)</h2>
            <p className="text-xs text-slate-500">
              Registra el tiempo de lluvia, incidentes y la matriz horaria del día.
            </p>
          </div>

          {/* Weather Slot Matrix */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Condición Climática por Tramo Horario
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {weatherSlots.map((w) => (
                <div
                  key={w.timeSlot}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1.5"
                >
                  <span className="font-mono text-xs font-bold text-slate-700 block">
                    {w.timeSlot} h
                  </span>
                  <select
                    value={w.conditionCode}
                    onChange={(e) => handleWeatherChange(w.timeSlot, parseInt(e.target.value))}
                    className="w-full text-[11px] font-bold p-1 bg-white border border-slate-200 rounded text-slate-800"
                  >
                    <option value={1}>☀️ Despejado</option>
                    <option value={2}>⛅ Nublado</option>
                    <option value={3}>🌦️ Llovizna</option>
                    <option value={4}>🌧️ Lluvia</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* EHS Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Horas Lluvia Día</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={rainHoursDay}
                onChange={(e) => setRainHoursDay(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Horas Perdidas por Lluvia</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={lostRainHoursDay}
                onChange={(e) => setLostRainHoursDay(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Charla Seguridad (min)</label>
              <input
                type="number"
                min="0"
                value={safetyTalkMinutesDay}
                onChange={(e) => setSafetyTalkMinutesDay(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Incidentes / Accidentes Día</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  value={incidentsDay}
                  onChange={(e) => setIncidentsDay(e.target.value)}
                  placeholder="Inc."
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-center"
                />
                <input
                  type="number"
                  min="0"
                  value={accidentsDay}
                  onChange={(e) => setAccidentsDay(e.target.value)}
                  placeholder="Acc."
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-center"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: Actividades & Firmas */}
      {activeTab === 'activities' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Resumen de Actividades & Responsables Técnicos</h2>
            <p className="text-xs text-slate-500">
              Modifica la descripción técnica de los frentes de trabajo y las firmas de responsabilidad.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Actividades Ejecutadas Hoy (Vialidad / Movimiento de Tierras)
              </label>
              <textarea
                rows={3}
                value={activitiesTodayVial}
                onChange={(e) => setActivitiesTodayVial(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Drenaje & Estructuras
                </label>
                <textarea
                  rows={2}
                  value={activitiesTodayDrenaje}
                  onChange={(e) => setActivitiesTodayDrenaje(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Puentes & Accesos
                </label>
                <textarea
                  rows={2}
                  value={activitiesTodayPuentes}
                  onChange={(e) => setActivitiesTodayPuentes(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Actividades Previstas para Mañana
              </label>
              <textarea
                rows={2}
                value={activitiesTomorrowVial}
                onChange={(e) => setActivitiesTomorrowVial(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Novedades / Paralizaciones / Riesgos de Seguridad
              </label>
              <textarea
                rows={2}
                value={noveltiesRisks}
                onChange={(e) => setNoveltiesRisks(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Comentarios del Contratista
                </label>
                <textarea
                  rows={2}
                  value={contractorComments}
                  onChange={(e) => setContractorComments(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Comentarios de la Fiscalización
                </label>
                <textarea
                  rows={2}
                  value={supervisorComments}
                  onChange={(e) => setSupervisorComments(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 mb-3">Firmas de Responsabilidad</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Elaborado Por
                </span>
                <input
                  type="text"
                  value={preparedByName}
                  onChange={(e) => setPreparedByName(e.target.value)}
                  placeholder="Nombre del Ingeniero"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                />
                <input
                  type="text"
                  value={preparedByTitle}
                  onChange={(e) => setPreparedByTitle(e.target.value)}
                  placeholder="Cargo"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Revisado / Aprobado Por
                </span>
                <input
                  type="text"
                  value={reviewedByName}
                  onChange={(e) => setReviewedByName(e.target.value)}
                  placeholder="Nombre del Residente"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                />
                <input
                  type="text"
                  value={reviewedByTitle}
                  onChange={(e) => setReviewedByTitle(e.target.value)}
                  placeholder="Cargo"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fixed bottom submission bar */}
      <div className="sticky bottom-4 z-30 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-xl border border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600/20 text-orange-400 flex items-center justify-center font-bold">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold block text-white">
              Reporte Diario N° {reportNumber} • ${calculatedDayTotal.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400">
              {rubrosWithWorkCount} rubros activos • {activeEquipmentCount} máquinas • {roadSection}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/reportes/${report.id}`}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs shadow-md shadow-orange-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Guardando...' : 'Confirmar Edición'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
