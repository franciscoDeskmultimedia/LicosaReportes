'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Scale,
  FileSpreadsheet,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  ArrowRightLeft,
  Calendar,
  Building2,
  Filter,
  Search,
  Printer,
  ChevronDown,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  FileText,
  Info,
  ExternalLink,
  PlusCircle,
  Eye,
  SlidersHorizontal,
  FolderGit2,
  Clock,
  Sparkles,
  X,
  Upload,
  PenTool,
  ArrowRight,
} from 'lucide-react';
import { PlanillaComparisonResult, PlanillaComparisonItem } from '@/lib/actions/planillas';
import { PlanillaRaw } from '@/data/planillas/default-planillas';
import { UploadPlanillaModal } from '@/components/UploadPlanillaModal';

interface PlanillasComparatorViewProps {
  comparisonData: PlanillaComparisonResult;
  allPlanillas: PlanillaRaw[];
  projects: Array<{ id: string; code: string; name: string }>;
  selectedProjectId: string;
  selectedPlanillaId: string;
  currentMode: 'PERIOD' | 'ACCUMULATED';
}

export function PlanillasComparatorView({
  comparisonData,
  allPlanillas,
  projects,
  selectedProjectId,
  selectedPlanillaId,
  currentMode,
}: PlanillasComparatorViewProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'comparison' | 'chapters' | 'sabana'>('comparison');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'DIFF' | 'A_FAVOR' | 'EN_CONTRA' | 'CONCILIADO'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSabanaModal, setShowSabanaModal] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState<PlanillaComparisonItem | null>(null);

  const {
    planilla,
    project,
    mode,
    totalPlanilladoAmount,
    totalReportedAmount,
    netDiffAmount,
    netDiffPercent,
    globalStatus,
    verdictTitle,
    verdictDescription,
    priorCarryoverSummary,
    stats,
    chapters,
    items,
    dailyReportsCount,
    dailyReportsRange,
  } = comparisonData;

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filter by category
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }

      // Filter by status
      if (filterStatus === 'DIFF') {
        if (item.status !== 'A_FAVOR' && item.status !== 'EN_CONTRA') return false;
      } else if (filterStatus !== 'ALL' && item.status !== filterStatus) {
        return false;
      }

      // Filter by search text
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDesc = item.description.toLowerCase().includes(query);
        const matchesCode = item.code.toLowerCase().includes(query);
        const matchesItemNum = item.itemNumber.toLowerCase().includes(query);
        if (!matchesDesc && !matchesCode && !matchesItemNum) return false;
      }

      return true;
    });
  }, [items, selectedCategory, filterStatus, searchQuery]);

  // Handle change project or planilla
  const effectivePlanillas = useMemo(() => {
    if (allPlanillas.some((p) => p.id === selectedPlanillaId)) {
      return allPlanillas;
    }
    if (comparisonData?.planilla) {
      return [comparisonData.planilla, ...allPlanillas];
    }
    return allPlanillas;
  }, [allPlanillas, selectedPlanillaId, comparisonData?.planilla]);

  const handleProjectChange = (newProjId: string) => {
    router.push(`/planillas?projectId=${newProjId}&planillaId=${selectedPlanillaId}&mode=${currentMode}`);
  };

  const handlePlanillaChange = (newPlanillaId: string) => {
    router.push(`/planillas?projectId=${selectedProjectId}&planillaId=${newPlanillaId}&mode=${currentMode}`);
  };

  const handleModeChange = (newMode: 'PERIOD' | 'ACCUMULATED') => {
    router.push(`/planillas?projectId=${selectedProjectId}&planillaId=${selectedPlanillaId}&mode=${newMode}`);
  };

  const formatCurrency = (val: number) => {
    return `$${Math.abs(val).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatSignedCurrency = (val: number) => {
    const sign = val > 0 ? '+' : val < 0 ? '-' : '';
    return `${sign}$${Math.abs(val).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 0. Banner Destacado para Subir o Crear Planillas (Excel o Manual) */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 p-5 rounded-2xl shadow-lg shadow-orange-600/20 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-orange-200 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Módulo de Control y Conciliación de Planillas</span>
          </div>
          <h2 className="text-lg md:text-xl font-black tracking-tight">
            ¿Deseas registrar o comparar una nueva planilla?
          </h2>
          <p className="text-xs text-orange-100 max-w-2xl leading-relaxed">
            Puedes <strong>subir la sábana en Excel (.xlsx)</strong> o <strong>ingresar las cantidades manualmente</strong> rubro por rubro para conciliar de inmediato vs los partes diarios.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-orange-700 hover:bg-orange-50 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 text-orange-600" />
            <span>+ Subir Archivo Excel</span>
          </button>

          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900/60 hover:bg-slate-900/80 text-white border border-white/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <PenTool className="w-4 h-4 text-orange-300" />
            <span>+ Ingreso Manual</span>
          </button>
        </div>
      </div>

      {/* 1. Header con estilo ejecutivo */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
            <Scale className="w-4 h-4" />
            <span>Auditoría & Control Físico - Financiero</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Comparador: Planillas vs Reporte de Obra Diaria (RDO)
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-3xl">
            Conciliación de montos y volúmenes planillados ante fiscalización versus la producción real reportada en los partes diarios de campo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>+ Subir / Ingresar Planilla</span>
          </button>

          <button
            onClick={() => setShowSabanaModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all border border-slate-300"
          >
            <Eye className="w-4 h-4 text-slate-600" />
            <span>Ver Sábana Oficial</span>
          </button>

          <button
            onClick={() => window.print()}
            className="no-print inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md shadow-slate-900/10 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Conciliación</span>
          </button>
        </div>
      </div>

      {/* 2. Barra de Control de Filtros y Selección */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Selector de Proyecto */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <FolderGit2 className="w-3.5 h-3.5 text-orange-600" />
            <span>Proyecto / Frente de Obra</span>
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.code}] {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Planilla */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span>Planilla a Comparar</span>
              <span>Planilla Seleccionada para Comparar</span>
            </label>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
            >
              <PlusCircle className="w-3 h-3" />
              <span>+ Subir Nueva</span>
            </button>
          </div>
          <select
            value={selectedPlanillaId}
            onChange={(e) => handlePlanillaChange(e.target.value)}
            className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            className="w-full text-xs font-bold bg-blue-50/60 border border-blue-300 rounded-xl px-3 py-2.5 text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
          >
            {allPlanillas.map((pl) => (
            {effectivePlanillas.map((pl) => (
              <option key={pl.id} value={pl.id}>
                {pl.code}: {pl.title} ({pl.startDate} al {pl.endDate})
              </option>
            ))}
          </select>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>{effectivePlanillas.length} {effectivePlanillas.length === 1 ? 'planilla registrada' : 'planillas registradas'}</span>
            <span className="font-semibold text-blue-700">✓ Activa para conciliación</span>
          </div>
        </div>

        {/* Modo de Comparación */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
            <span>Base de Comparación</span>
          </label>
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => handleModeChange('PERIOD')}
              className={`text-xs font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                currentMode === 'PERIOD'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📅 Este Período
            </button>
            <button
              onClick={() => handleModeChange('ACCUMULATED')}
              className={`text-xs font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                currentMode === 'ACCUMULATED'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📈 Acumulado al Corte
            </button>
          </div>
        </div>
      </div>

      {/* 2.0 Banner Destacado: Planilla Actualmente en Comparación */}
      <div className="bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-sm shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 bg-blue-600 text-white font-black text-[10px] rounded-lg uppercase tracking-wider shadow-xs">
                {planilla.code}
              </span>
              <span className="text-sm font-black text-slate-900">
                {planilla.title}
              </span>
              {selectedPlanillaId === 'planilla-licosa-01' && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold rounded-md">
                  Planilla Oficial N° 01 (LICOSA)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Período de corte: <strong>{planilla.startDate}</strong> al <strong>{planilla.endDate}</strong> • Valor Facturado: <strong>{formatCurrency(totalPlanilladoAmount)}</strong> • Contrato: <strong>{planilla.contractNumber}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setShowSabanaModal(true)}
            className="px-3.5 py-2 bg-white text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Eye className="w-4 h-4 text-blue-600" />
            <span>Ver Sábana</span>
          </button>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Subir Otra Planilla</span>
          </button>
        </div>
      </div>

      {/* 2.1 Tarjeta Informativa: Rango de Reportes Diarios que Corresponden a este Corte */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
              Corte de Fechas & Partes Diarios Abarcados
            </span>
            <span className="font-black text-slate-900 text-sm md:text-base block mt-0.5">
              {dailyReportsRange.summaryText}
            </span>
            <span className="text-slate-500 text-xs">
              Fecha de corte: <strong>{planilla.startDate}</strong> al <strong>{planilla.endDate}</strong> • {dailyReportsCount} reportes diarios registrados en este intervalo
            </span>
          </div>
        </div>

        {dailyReportsRange.startReportNumber && dailyReportsRange.endReportNumber && (
          <div className="flex items-center gap-2 shrink-0 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Abarca:</span>
            <span className="px-2.5 py-1 bg-blue-100 text-blue-900 font-black rounded-lg text-xs font-mono">
              RDO #{String(dailyReportsRange.startReportNumber).padStart(3, '0')}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="px-2.5 py-1 bg-orange-100 text-orange-900 font-black rounded-lg text-xs font-mono">
              RDO #{String(dailyReportsRange.endReportNumber).padStart(3, '0')}
            </span>
          </div>
        )}
      </div>

      {/* 2.2 Tarjeta de Conciliación de Arrastre: Excedente o Faltante del Período Anterior */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-orange-600" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Conciliación de Arrastre: Período Anterior vs Período Actual
            </h3>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
              priorCarryoverSummary.consolidatedStatus === 'A_FAVOR'
                ? 'bg-blue-100 text-blue-800 border-blue-300'
                : priorCarryoverSummary.consolidatedStatus === 'EN_CONTRA'
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}
          >
            Saldo Consolidado Total:{' '}
            {priorCarryoverSummary.consolidatedBalance > 0
              ? `+${formatCurrency(priorCarryoverSummary.consolidatedBalance)}`
              : formatCurrency(priorCarryoverSummary.consolidatedBalance)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Arrastre anterior */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-slate-500 uppercase text-[10px] block">
              1. Arrastre Período Anterior (Excedente / Faltante)
            </span>
            <div
              className={`text-lg font-black font-mono ${
                priorCarryoverSummary.priorSurplusOrDeficit > 0
                  ? 'text-blue-700'
                  : priorCarryoverSummary.priorSurplusOrDeficit < 0
                  ? 'text-amber-700'
                  : 'text-slate-600'
              }`}
            >
              {priorCarryoverSummary.priorStatus === 'SIN_HISTORIAL'
                ? '$0.00 (Planilla 1)'
                : formatSignedCurrency(priorCarryoverSummary.priorSurplusOrDeficit)}
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              {priorCarryoverSummary.description}
            </p>
          </div>

          {/* Diferencia en este período */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-slate-500 uppercase text-[10px] block">
              2. Diferencia Este Período (Obra vs Planilla)
            </span>
            <div
              className={`text-lg font-black font-mono ${
                globalStatus === 'A_FAVOR'
                  ? 'text-blue-700'
                  : globalStatus === 'EN_CONTRA'
                  ? 'text-amber-700'
                  : 'text-emerald-700'
              }`}
            >
              {formatSignedCurrency(totalReportedAmount - totalPlanilladoAmount)}
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              {globalStatus === 'A_FAVOR'
                ? 'Obra en campo supera lo planillado este mes.'
                : globalStatus === 'EN_CONTRA'
                ? 'Planilla supera la obra reportada este mes.'
                : 'Mes 100% conciliado.'}
            </p>
          </div>

          {/* Saldo Neto Consolidado */}
          <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-1">
            <span className="font-bold text-slate-400 uppercase text-[10px] block">
              3. Saldo Neto Acumulado Consolidado
            </span>
            <div
              className={`text-lg font-black font-mono ${
                priorCarryoverSummary.consolidatedStatus === 'A_FAVOR'
                  ? 'text-blue-400'
                  : priorCarryoverSummary.consolidatedStatus === 'EN_CONTRA'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {formatSignedCurrency(priorCarryoverSummary.consolidatedBalance)}
            </div>
            <p className="text-[11px] text-slate-300 leading-tight">
              {priorCarryoverSummary.consolidatedStatus === 'A_FAVOR'
                ? 'La constructora tiene saldo neto acumulado a favor por cobrar.'
                : priorCarryoverSummary.consolidatedStatus === 'EN_CONTRA'
                ? 'Existe sobre-cobro neto acumulado pendiente de sustentar con partes diarios.'
                : 'Historial global totalmente conciliado.'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Veredicto Principal de la Auditoría */}
      <div
        className={`p-6 rounded-2xl border shadow-sm transition-all ${
          globalStatus === 'A_FAVOR'
            ? 'bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border-blue-200 text-blue-950'
            : globalStatus === 'EN_CONTRA'
            ? 'bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 border-amber-200 text-amber-950'
            : 'bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border-emerald-200 text-emerald-950'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-2xl shrink-0 ${
                globalStatus === 'A_FAVOR'
                  ? 'bg-blue-600 text-white'
                  : globalStatus === 'EN_CONTRA'
                  ? 'bg-amber-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {globalStatus === 'A_FAVOR' ? (
                <TrendingUp className="w-7 h-7" />
              ) : globalStatus === 'EN_CONTRA' ? (
                <AlertTriangle className="w-7 h-7" />
              ) : (
                <CheckCircle2 className="w-7 h-7" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide border ${
                    globalStatus === 'A_FAVOR'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : globalStatus === 'EN_CONTRA'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                >
                  {globalStatus === 'A_FAVOR'
                    ? 'Saldo a Favor de la Constructora'
                    : globalStatus === 'EN_CONTRA'
                    ? 'Planillado en Exceso (Riesgo Técnico)'
                    : 'Conciliación Cuadrada (En Regla)'}
                </span>

                <span className="text-xs font-semibold text-slate-600">
                  Período: {planilla.startDate} al {planilla.endDate} ({dailyReportsCount} reportes diarios analizados)
                </span>
              </div>

              <h2 className="text-lg md:text-xl font-black mt-1.5">{verdictTitle}</h2>
              <p className="text-xs md:text-sm mt-1 opacity-90 leading-relaxed">{verdictDescription}</p>
            </div>
          </div>

          <div className="text-right shrink-0 bg-white/70 backdrop-blur-xs p-4 rounded-xl border border-white/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Diferencia Neta Global
            </span>
            <span
              className={`text-2xl md:text-3xl font-black block mt-0.5 ${
                globalStatus === 'A_FAVOR'
                  ? 'text-blue-700'
                  : globalStatus === 'EN_CONTRA'
                  ? 'text-amber-700'
                  : 'text-emerald-700'
              }`}
            >
              {formatSignedCurrency(netDiffAmount)}
            </span>
            <span className="text-xs font-semibold text-slate-600 mt-0.5 block">
              Desvío relativo: {netDiffPercent > 0 ? `+${netDiffPercent}%` : `${netDiffPercent}%`}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Tarjetas de Métricas Ejecutivas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Planillado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {currentMode === 'PERIOD' ? 'Subtotal Planillado (Mes)' : 'Total Planillado Acumulado'}
            </span>
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(totalPlanilladoAmount)}
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Anticipo amortizado:</span>
            <span className="font-bold text-slate-700">{formatCurrency(planilla.advanceDeductionAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
            <span>Total a Cobrar (+IVA):</span>
            <span className="font-bold text-emerald-600">{formatCurrency(planilla.netToPay)}</span>
          </div>
        </div>

        {/* Total Reportado en Obra (RDO) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {currentMode === 'PERIOD' ? 'Reportado en Obra (RDO)' : 'Reportado Acumulado en RDO'}
            </span>
            <Building2 className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(totalReportedAmount)}
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Reportes en período:</span>
            <span className="font-bold text-slate-700">{dailyReportsCount} partes diarios</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
            <span>% Cobertura obra:</span>
            <span className="font-bold text-slate-700">
              {totalPlanilladoAmount > 0
                ? `${((totalReportedAmount / totalPlanilladoAmount) * 100).toFixed(1)}%`
                : '100%'}
            </span>
          </div>
        </div>

        {/* Rubros a Favor de la Constructora */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Rubros a Favor (Obra no cobrada)
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800">
              {stats.aFavorCount} rubros
            </span>
          </div>
          <div className="text-2xl font-black text-blue-700 mt-2">
            +{formatCurrency(stats.aFavorAmount)}
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-xs text-slate-500 leading-tight">
            Producción real realizada en campo pendiente de cobro para la siguiente planilla.
          </div>
        </div>

        {/* Rubros en Contra / Planillado en Exceso */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Rubros en Exceso (Riesgo Fiscalización)
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800">
              {stats.enContraCount} rubros
            </span>
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">
            -{formatCurrency(stats.enContraAmount)}
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-xs text-slate-500 leading-tight">
            Facturado en planilla que carece de soporte o registro en los partes diarios.
          </div>
        </div>
      </div>

      {/* 5. Selector de Pestañas Principales */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'comparison'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Detalle Rubro por Rubro ({items.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('chapters')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'chapters'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Consolidado por Capítulos ({chapters.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sabana')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'sabana'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Sábana Contractual Oficial</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Contrato:</span> {planilla.contractNumber}
        </div>
      </div>

      {/* 6. PESTAÑA: DETALLE RUBRO POR RUBRO */}
      {activeTab === 'comparison' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Buscador */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por código (ej. 304-1, 302-1) o descripción de rubro..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Filtro por Capítulo */}
            <div className="w-full md:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="ALL">Todos los Capítulos</option>
                {chapters.map((ch) => (
                  <option key={ch.category} value={ch.category}>
                    {ch.category}
                  </option>
                ))}
              </select>
            </div>

            {/* Badges de Estado */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({items.length})
              </button>

              <button
                onClick={() => setFilterStatus('DIFF')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === 'DIFF'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                ⚠️ Con Desvío ({stats.aFavorCount + stats.enContraCount})
              </button>

              <button
                onClick={() => setFilterStatus('A_FAVOR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === 'A_FAVOR'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                🔵 A Favor ({stats.aFavorCount})
              </button>

              <button
                onClick={() => setFilterStatus('EN_CONTRA')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === 'EN_CONTRA'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                🔴 En Exceso ({stats.enContraCount})
              </button>

              <button
                onClick={() => setFilterStatus('CONCILIADO')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === 'CONCILIADO'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                🟢 Conciliados ({stats.conciliadosCount})
              </button>
            </div>
          </div>

          {/* Tabla de Comparación Rubro por Rubro */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white border-b border-slate-800 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3 w-16 text-center">Ítem</th>
                    <th className="py-3 px-3 w-28">Código</th>
                    <th className="py-3 px-4 min-w-[220px]">Descripción del Rubro</th>
                    <th className="py-3 px-3 w-16 text-center">Unidad</th>
                    <th className="py-3 px-3 w-20 text-right">P.U. ($)</th>
                    <th className="py-3 px-3 w-24 text-right bg-blue-950/60 text-blue-200">
                      Cant. Planilla
                    </th>
                    <th className="py-3 px-3 w-24 text-right bg-blue-900 text-blue-100">
                      Monto Planilla
                    </th>
                    <th className="py-3 px-3 w-24 text-right bg-orange-950/60 text-orange-200">
                      Cant. Obra
                    </th>
                    <th className="py-3 px-3 w-24 text-right bg-orange-900 text-orange-100">
                      Monto Obra
                    </th>
                    <th className="py-3 px-3 w-24 text-right">Dif. Mes ($)</th>
                    <th className="py-3 px-3 w-24 text-right bg-slate-800/80 text-purple-200">Arrastre Ant. ($)</th>
                    <th className="py-3 px-3 w-28 text-right bg-slate-950 text-emerald-300">Saldo Consolidado ($)</th>
                    <th className="py-3 px-3 w-32 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-slate-400">
                        No se encontraron rubros con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => {
                      const hasDiff = item.status === 'A_FAVOR' || item.status === 'EN_CONTRA';
                      return (
                        <tr
                          key={`${item.itemNumber}-${idx}`}
                          onClick={() => setSelectedItemDetail(item)}
                          className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                            item.status === 'A_FAVOR'
                              ? 'bg-blue-50/30'
                              : item.status === 'EN_CONTRA'
                              ? 'bg-amber-50/40'
                              : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                            {item.itemNumber}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-600">
                            {item.code || '-'}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-800">
                            <div>{item.description}</div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              {item.category}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600 font-mono">
                            {item.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            ${item.unitPrice.toFixed(2)}
                          </td>

                          {/* Cantidad y Monto Planillado */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900 bg-blue-50/50">
                            {item.planilladoQuantity.toLocaleString('es-EC', { maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-950 bg-blue-100/60">
                            ${item.planilladoAmount.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Cantidad y Monto Reportado en Obra */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-orange-900 bg-orange-50/50">
                            {item.reportedQuantity.toLocaleString('es-EC', { maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-orange-950 bg-orange-100/60">
                            ${item.reportedAmount.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Diferencia en Dinero del Período */}
                          <td
                            className={`py-2.5 px-3 text-right font-mono font-black ${
                              item.status === 'A_FAVOR'
                                ? 'text-blue-700'
                                : item.status === 'EN_CONTRA'
                                ? 'text-amber-700'
                                : 'text-slate-400'
                            }`}
                          >
                            {formatSignedCurrency(item.amountDiff)}
                          </td>

                          {/* Arrastre Período Anterior */}
                          <td className="py-2.5 px-3 text-right font-mono text-xs bg-slate-50/50">
                            {item.priorSurplusOrDeficit === 0 ? (
                              <span className="text-slate-400 font-medium">$0.00</span>
                            ) : (
                              <span
                                className={`font-bold ${
                                  item.priorSurplusOrDeficit > 0 ? 'text-blue-600' : 'text-amber-600'
                                }`}
                              >
                                {formatSignedCurrency(item.priorSurplusOrDeficit)}
                              </span>
                            )}
                          </td>

                          {/* Saldo Neto Consolidado Acumulado */}
                          <td className="py-2.5 px-3 text-right font-mono font-black text-xs bg-slate-100/40">
                            {item.consolidatedBalance === 0 ? (
                              <span className="text-emerald-600 font-medium">$0.00</span>
                            ) : (
                              <span
                                className={
                                  item.consolidatedBalance > 0 ? 'text-blue-700' : 'text-amber-700'
                                }
                              >
                                {formatSignedCurrency(item.consolidatedBalance)}
                              </span>
                            )}
                          </td>

                          {/* Estado / Badge */}
                          <td className="py-2.5 px-4 text-center">
                            {item.status === 'A_FAVOR' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 shadow-xs">
                                <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
                                <span>A Favor</span>
                              </span>
                            ) : item.status === 'EN_CONTRA' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
                                <ArrowDownRight className="w-3.5 h-3.5 text-amber-600" />
                                <span>En Exceso</span>
                              </span>
                            ) : item.status === 'CONCILIADO' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Conciliado</span>
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                                Sin Avance
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pie de Tabla con Resumen de Sumas */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-bold text-slate-700">
              <div className="flex items-center gap-4">
                <span>Total Ítems Mostrados: {filteredItems.length}</span>
                <span>•</span>
                <span className="text-blue-700">
                  Planilla: $
                  {filteredItems
                    .reduce((a, b) => a + b.planilladoAmount, 0)
                    .toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                </span>
                <span>•</span>
                <span className="text-orange-700">
                  Obra (RDO): $
                  {filteredItems
                    .reduce((a, b) => a + b.reportedAmount, 0)
                    .toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="text-slate-500 text-[11px] font-normal">
                * Haz clic en cualquier fila para ver el desglose técnico y la justificación.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. PESTAÑA: CONSOLIDADO POR CAPÍTULOS */}
      {activeTab === 'chapters' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {chapters.map((ch) => {
              const maxVal = Math.max(ch.planilladoAmount, ch.reportedAmount, 1);
              const planPercent = Math.min(100, (ch.planilladoAmount / maxVal) * 100);
              const repPercent = Math.min(100, (ch.reportedAmount / maxVal) * 100);

              return (
                <div
                  key={ch.category}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">{ch.category}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {ch.itemsCount} rubros contractuales • {ch.itemsWithDiffCount} con diferencia
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                        ch.status === 'A_FAVOR'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : ch.status === 'EN_CONTRA'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : ch.status === 'CONCILIADO'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {ch.status === 'A_FAVOR'
                        ? 'A Favor (+)'
                        : ch.status === 'EN_CONTRA'
                        ? 'En Exceso (-)'
                        : ch.status === 'CONCILIADO'
                        ? 'Conciliado'
                        : 'Sin Avance'}
                    </span>
                  </div>

                  {/* Comparación Visual con Barras */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-blue-700 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block"></span>
                          Planillado:
                        </span>
                        <span className="font-mono text-blue-950 font-bold">
                          {formatCurrency(ch.planilladoAmount)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${planPercent}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-orange-700 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm bg-orange-600 inline-block"></span>
                          Reportado en Obra:
                        </span>
                        <span className="font-mono text-orange-950 font-bold">
                          {formatCurrency(ch.reportedAmount)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-orange-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${repPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Diferencia Neta del Capítulo */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Diferencia Neta Capítulo:</span>
                    <span
                      className={`font-mono font-black text-sm ${
                        ch.status === 'A_FAVOR'
                          ? 'text-blue-700'
                          : ch.status === 'EN_CONTRA'
                          ? 'text-amber-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {formatSignedCurrency(ch.amountDiff)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 8. PESTAÑA: SÁBANA CONTRACTUAL OFICIAL (ESTILO PDF PREFECTURA) */}
      {activeTab === 'sabana' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          {/* Encabezado Oficial */}
          <div className="border-b-2 border-slate-800 pb-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-black tracking-widest text-slate-500 uppercase block">
                  {planilla.client}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-0.5 uppercase">
                  {planilla.title}
                </h2>
                <p className="text-xs text-slate-600 font-semibold max-w-2xl mt-1">
                  {planilla.projectName}
                </p>
              </div>

              <div className="text-right text-xs space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500">Contrato:</span>{' '}
                  <span className="font-bold text-slate-900">{planilla.contractNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500">Monto Contrato:</span>{' '}
                  <span className="font-bold text-slate-900">{formatCurrency(planilla.contractAmount)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Período:</span>{' '}
                  <span className="font-bold text-orange-600">
                    {planilla.startDate} al {planilla.endDate}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cuadro de Liquidación Económica */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Subtotal Planilla</span>
              <span className="text-lg font-black text-slate-900">{formatCurrency(planilla.subtotal)}</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block">IVA ({planilla.ivaPercent}%)</span>
              <span className="text-lg font-black text-slate-900">{formatCurrency(planilla.ivaAmount)}</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block">
                Amortización Anticipo ({planilla.advanceDeductionPercent}%)
              </span>
              <span className="text-lg font-black text-rose-700">-{formatCurrency(planilla.advanceDeductionAmount)}</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Líquido a Cobrar</span>
              <span className="text-xl font-black text-emerald-700">{formatCurrency(planilla.netToPay)}</span>
            </div>
          </div>

          {/* Tabla Formato Sábana */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold text-[11px]">
                  <th className="p-2 border-r border-slate-200 text-center">ITEM</th>
                  <th className="p-2 border-r border-slate-200">CODIGO</th>
                  <th className="p-2 border-r border-slate-200 min-w-[200px]">DESCRIPCION</th>
                  <th className="p-2 border-r border-slate-200 text-center">UNIDAD</th>
                  <th className="p-2 border-r border-slate-200 text-right">CANT. CONTRATO</th>
                  <th className="p-2 border-r border-slate-200 text-right">P.U. ($)</th>
                  <th className="p-2 border-r border-slate-200 text-right">TOTAL CONTRATO</th>
                  <th className="p-2 border-r border-slate-200 text-right bg-blue-50 font-black">CANT. ESTE PERIODO</th>
                  <th className="p-2 border-r border-slate-200 text-right bg-blue-100 font-black">VALOR ESTE PERIODO</th>
                  <th className="p-2 text-right font-black">% AVANCE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                {planilla.items.map((it, idx) => (
                  <tr key={idx} className={it.periodAmount > 0 ? 'bg-amber-50/40' : 'hover:bg-slate-50'}>
                    <td className="p-2 text-center border-r border-slate-200 font-bold">{it.itemNumber}</td>
                    <td className="p-2 border-r border-slate-200 font-sans">{it.code || '-'}</td>
                    <td className="p-2 border-r border-slate-200 font-sans font-medium">{it.description}</td>
                    <td className="p-2 text-center border-r border-slate-200">{it.unit}</td>
                    <td className="p-2 text-right border-r border-slate-200">
                      {it.contractQuantity.toLocaleString('es-EC', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-2 text-right border-r border-slate-200">${it.unitPrice.toFixed(2)}</td>
                    <td className="p-2 text-right border-r border-slate-200">
                      ${it.contractTotal.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-2 text-right border-r border-slate-200 bg-blue-50/70 font-bold">
                      {it.periodQuantity > 0 ? it.periodQuantity.toLocaleString('es-EC', { maximumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="p-2 text-right border-r border-slate-200 bg-blue-100/70 font-bold">
                      {it.periodAmount > 0
                        ? `$${it.periodAmount.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '-'}
                    </td>
                    <td className="p-2 text-right font-bold text-slate-700">
                      {it.progressPercent > 0 ? `${it.progressPercent.toFixed(2)}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Firmas de Responsabilidad */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-slate-200 text-center">
            <div className="border-t border-slate-400 pt-2">
              <div className="font-bold text-xs text-slate-900">SR. IVÁN FORTUNATO ZAMBRANO AÑASCO</div>
              <div className="text-[11px] text-slate-500">Procurador Común</div>
              <div className="text-[11px] font-semibold text-slate-700 uppercase">{planilla.contractor}</div>
            </div>
            <div className="border-t border-slate-400 pt-2">
              <div className="font-bold text-xs text-slate-900">ING. JAIME DANIEL VILLAO CARRASCAL</div>
              <div className="text-[11px] text-slate-500">Procurador Común</div>
              <div className="text-[11px] font-semibold text-slate-700 uppercase">{planilla.fiscalizador}</div>
            </div>
            <div className="border-t border-slate-400 pt-2">
              <div className="font-bold text-xs text-slate-900">{planilla.administrator}</div>
              <div className="text-[11px] text-slate-500">Administrador de Obra</div>
              <div className="text-[11px] font-semibold text-slate-700 uppercase">{planilla.client}</div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETALLE DEL RUBRO AL HACER CLIC */}
      {selectedItemDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-orange-600 uppercase">
                  Ítem {selectedItemDetail.itemNumber} • {selectedItemDetail.category}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  {selectedItemDetail.description}
                </h3>
                {selectedItemDetail.code && (
                  <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md mt-1 inline-block">
                    Código MOP/Contrato: {selectedItemDetail.code}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedItemDetail(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comparativa Frente a Frente */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 space-y-2">
                <div className="text-xs font-bold text-blue-800 uppercase flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>En Planilla Oficial</span>
                </div>
                <div className="text-xl font-black text-blue-950 font-mono">
                  {selectedItemDetail.planilladoQuantity.toLocaleString('es-EC', { maximumFractionDigits: 2 })}{' '}
                  <span className="text-xs font-normal text-blue-800">{selectedItemDetail.unit}</span>
                </div>
                <div className="text-sm font-bold text-blue-900">
                  Total Facturado: {formatCurrency(selectedItemDetail.planilladoAmount)}
                </div>
              </div>

              <div className="bg-orange-50/70 p-4 rounded-2xl border border-orange-200 space-y-2">
                <div className="text-xs font-bold text-orange-800 uppercase flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  <span>Reportado en Obra (RDO)</span>
                </div>
                <div className="text-xl font-black text-orange-950 font-mono">
                  {selectedItemDetail.reportedQuantity.toLocaleString('es-EC', { maximumFractionDigits: 2 })}{' '}
                  <span className="text-xs font-normal text-orange-800">{selectedItemDetail.unit}</span>
                </div>
                <div className="text-sm font-bold text-orange-900">
                  Total en Partes: {formatCurrency(selectedItemDetail.reportedAmount)}
                </div>
              </div>
            </div>

            {/* Conciliación con Arrastre del Período Anterior */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Historial de Arrastre & Saldo Neto Consolidado
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-bold">1. Arrastre Anterior</span>
                  <span
                    className={`font-mono font-black text-sm block mt-0.5 ${
                      selectedItemDetail.priorSurplusOrDeficit > 0
                        ? 'text-blue-700'
                        : selectedItemDetail.priorSurplusOrDeficit < 0
                        ? 'text-amber-700'
                        : 'text-slate-600'
                    }`}
                  >
                    {selectedItemDetail.priorSurplusOrDeficit === 0
                      ? '$0.00'
                      : formatSignedCurrency(selectedItemDetail.priorSurplusOrDeficit)}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-bold">2. Saldo Este Período</span>
                  <span
                    className={`font-mono font-black text-sm block mt-0.5 ${
                      selectedItemDetail.status === 'A_FAVOR'
                        ? 'text-blue-700'
                        : selectedItemDetail.status === 'EN_CONTRA'
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {formatSignedCurrency(
                      selectedItemDetail.reportedAmount - selectedItemDetail.planilladoAmount
                    )}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-900 text-white rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">3. Saldo Consolidado</span>
                  <span
                    className={`font-mono font-black text-sm block mt-0.5 ${
                      selectedItemDetail.consolidatedBalance > 0
                        ? 'text-blue-400'
                        : selectedItemDetail.consolidatedBalance < 0
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {selectedItemDetail.consolidatedBalance === 0
                      ? '$0.00'
                      : formatSignedCurrency(selectedItemDetail.consolidatedBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Explicación Técnica y Diagnóstico */}
            <div
              className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                selectedItemDetail.status === 'A_FAVOR'
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : selectedItemDetail.status === 'EN_CONTRA'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="font-black text-sm mb-1 flex items-center gap-1.5">
                <Info className="w-4 h-4" />
                <span>Diagnóstico del Comparador:</span>
              </div>
              <p>{selectedItemDetail.explanation}</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedItemDetail(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SÁBANA OFICIAL EN PANTALLA COMPLETA */}
      {showSabanaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-orange-600" />
                <h3 className="text-base font-black text-slate-900">
                  Sábana Oficial Planilla No. 01 - LICOSA
                </h3>
              </div>
              <button
                onClick={() => setShowSabanaModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Render de la sábana */}
            <div className="text-xs space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <span>
                  <strong>Contrato:</strong> {planilla.contractNumber} | <strong>Contratista:</strong> {planilla.contractor}
                </span>
                <span className="font-bold text-orange-600">Período: {planilla.startDate} al {planilla.endDate}</span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[500px]">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-100 sticky top-0 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2 text-center">Ítem</th>
                      <th className="p-2">Código</th>
                      <th className="p-2">Descripción</th>
                      <th className="p-2 text-center">Und</th>
                      <th className="p-2 text-right">P.U. ($)</th>
                      <th className="p-2 text-right bg-blue-100">Cant. Período</th>
                      <th className="p-2 text-right bg-blue-200">Monto Período</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {planilla.items
                      .filter((it) => it.periodAmount > 0)
                      .map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 text-center font-bold">{it.itemNumber}</td>
                          <td className="p-2 font-sans">{it.code || '-'}</td>
                          <td className="p-2 font-sans font-medium">{it.description}</td>
                          <td className="p-2 text-center">{it.unit}</td>
                          <td className="p-2 text-right">${it.unitPrice.toFixed(2)}</td>
                          <td className="p-2 text-right font-bold bg-blue-50">
                            {it.periodQuantity.toLocaleString('es-EC', { maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-right font-black bg-blue-100">
                            ${it.periodAmount.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-900 text-white rounded-xl font-bold">
                <span>SUBTOTAL PLANILLA EJECUTADA:</span>
                <span className="text-base text-orange-400 font-mono">{formatCurrency(planilla.subtotal)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSabanaModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUBIR / IMPORTAR NUEVA PLANILLA EXCEL */}
      <UploadPlanillaModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        projectId={selectedProjectId}
        projectCode={project.code}
        onPlanillaUploaded={(newPlanillaId) => {
          handlePlanillaChange(newPlanillaId);
        }}
      />
    </div>
  );
}

