'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  Upload,
  X,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Sparkles,
  ArrowRight,
  Database,
  Check,
  Clock,
  Truck,
  Wrench,
  AlertCircle,
  FileCheck,
  ShieldCheck,
} from 'lucide-react';
import {
  analyzeExcelFormData,
  analyzeLocalExcelFile,
  applyExcelSync,
  ExcelAnalysisResult,
  ReportSyncItem,
} from '@/lib/actions/excelSync';

interface ExcelReportSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Array<{ id: string; code: string; name: string }>;
  defaultProjectId?: string;
  onSyncComplete?: () => void;
}

export function ExcelReportSyncModal({
  isOpen,
  onClose,
  projects,
  defaultProjectId,
  onSyncComplete,
}: ExcelReportSyncModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Wizard step
  const [step, setStep] = useState<'upload' | 'review' | 'success'>('upload');

  // Upload state
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    defaultProjectId && defaultProjectId !== 'ALL' ? defaultProjectId : (projects[0]?.id || '')
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [syncMode, setSyncMode] = useState<'auto' | 'registro_diario' | 'rdo'>('auto');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Analysis result & review state
  const [analysisResult, setAnalysisResult] = useState<ExcelAnalysisResult | null>(null);
  const [items, setItems] = useState<ReportSyncItem[]>([]);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<'all' | 'new' | 'discrepancy' | 'identical'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Sync execution state
  const [syncing, setSyncing] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    createdCount: number;
    updatedCount: number;
  } | null>(null);

  if (!isOpen) return null;

  // Handler para subir archivo desde el input file
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    await runAnalysis(file, undefined);
  }

  // Handler para cargar archivo local directo del sistema
  async function handleLoadLocalFile() {
    await runAnalysis(null, '/Users/franciscocornejo/Downloads/AVANCE DE OBRA MOD.xlsx');
  }

  // Ejecuta el análisis del Excel
  async function runAnalysis(file: File | null, localPath?: string) {
    setAnalyzing(true);
    setError(null);
    try {
      let result: ExcelAnalysisResult;
      if (localPath) {
        result = await analyzeLocalExcelFile(localPath, selectedProjectId || undefined);
      } else if (file) {
        const formData = new FormData();
        formData.append('file', file);
        if (selectedProjectId) {
          formData.append('projectId', selectedProjectId);
        }
        formData.append('syncMode', syncMode);
        result = await analyzeExcelFormData(formData);
      } else {
        throw new Error('Seleccione un archivo Excel para continuar.');
      }

      setAnalysisResult(result);
      if (result.detectedProject && (!selectedProjectId || selectedProjectId === 'ALL')) {
        setSelectedProjectId(result.detectedProject.id);
      }
      setItems(result.items);
      // Expandir la primera discrepancia o primer nuevo
      const firstExpand = result.items.find((i) => i.status === 'DISCREPANCY' || i.status === 'NEW');
      if (firstExpand) {
        setExpandedDates(new Set([firstExpand.date]));
      }
      setStep('review');
    } catch (err: any) {
      console.error('Error analyzing Excel:', err);
      setError(err?.message || 'Error al procesar el archivo Excel. Verifique que el formato sea válido.');
    } finally {
      setAnalyzing(false);
    }
  }

  // Alternar selección de un item
  function toggleItemSelection(date: string) {
    setItems((prev) =>
      prev.map((item) => (item.date === date ? { ...item, selected: !item.selected } : item))
    );
  }

  // Alternar selección masiva (solo de nuevos y discrepancias)
  function handleSelectAll(select: boolean) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.status === 'IDENTICAL') {
          return { ...item, selected: false }; // Mantener idénticos sin marcar para no duplicar
        }
        return { ...item, selected: select };
      })
    );
  }

  // Alternar acordeón de detalles por fecha
  function toggleExpand(date: string) {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  }

  // Editar número de reporte si es necesario
  function handleReportNumberChange(date: string, newNum: number) {
    setItems((prev) =>
      prev.map((item) => (item.date === date ? { ...item, reportNumber: newNum } : item))
    );
  }

  // Proceder con la actualización atómica
  async function handleProceedUpdate() {
    if (!analysisResult) return;
    const targetProject = selectedProjectId || analysisResult.detectedProject?.id;
    if (!targetProject) {
      setError('Por favor seleccione el proyecto al cual aplicar los reportes.');
      return;
    }

    const selectedCount = items.filter((i) => i.selected && i.status !== 'IDENTICAL').length;
    if (selectedCount === 0) {
      setError('No ha seleccionado ningún reporte nuevo o con discrepancias para actualizar.');
      return;
    }

    setSyncing(true);
    setError(null);
    try {
      const res = await applyExcelSync({
        projectId: targetProject,
        itemsToApply: items,
      });

      setSuccessInfo(res);
      setStep('success');

      startTransition(() => {
        router.refresh();
      });

      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (err: any) {
      console.error('Error applying Excel sync:', err);
      setError(err?.message || 'Ocurrió un error al aplicar la actualización.');
    } finally {
      setSyncing(false);
    }
  }

  // Filtrado de items para la vista
  const filteredItems = items.filter((item) => {
    if (activeFilter === 'new' && item.status !== 'NEW') return false;
    if (activeFilter === 'discrepancy' && item.status !== 'DISCREPANCY') return false;
    if (activeFilter === 'identical' && item.status !== 'IDENTICAL') return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchDate = item.date.includes(term);
      const matchRep = `reporte ${item.reportNumber}`.includes(term);
      const matchRubro = item.rubroExecutions.some(
        (r) =>
          r.description.toLowerCase().includes(term) ||
          r.rubroNumber.toString().includes(term)
      );
      if (!matchDate && !matchRep && !matchRubro) return false;
    }

    return true;
  });

  const selectedCount = items.filter((i) => i.selected && i.status !== 'IDENTICAL').length;
  const newCount = items.filter((i) => i.status === 'NEW').length;
  const discrepancyCount = items.filter((i) => i.status === 'DISCREPANCY').length;
  const identicalCount = items.filter((i) => i.status === 'IDENTICAL').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-orange-600/90 border border-orange-500/40 flex items-center justify-center shadow-lg shadow-orange-600/30">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  Sincronizador Inteligente
                </span>
                <span className="text-xs text-slate-400">RDO & Bitácora Diaria</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Actualizar / Crear Reportes Diarios desde Excel
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ERROR BANNER */}
        {error && (
          <div className="m-4 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Error en la operación</p>
              <p className="mt-0.5 text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {/* STEP 1: UPLOAD & DIAGNOSTIC */}
        {step === 'upload' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Target Project Selector */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                1. Seleccione la Obra / Proyecto de Destino:
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Database className="w-4 h-4 text-orange-600" />
                  <span>Se compararán los datos del Excel con los reportes existentes de esta obra.</span>
                </div>
              </div>
            </div>

            {/* Sync Mode Selection */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                2. Modo de Origen de Datos:
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSyncMode('auto')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    syncMode === 'auto'
                      ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-bold text-slate-900">Modo Híbrido (Auto)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Detecta automáticamente pestañas RDO y la bitácora 'Registro Diario'.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSyncMode('registro_diario')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    syncMode === 'registro_diario'
                      ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-bold text-slate-900">Bitácora Registro Diario</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Carga continua de todas las fechas y rubros ejecutados + horómetros.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSyncMode('rdo')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    syncMode === 'rdo'
                      ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FileSpreadsheet className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-bold text-slate-900">Solo Hoja RDO</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Importa únicamente la plantilla oficial RDO con EHS, clima y personal.
                  </p>
                </button>
              </div>
            </div>

            {/* Quick Button for detected local file */}
            <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10 border border-orange-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full inline-block mb-1">
                  Archivo Local Detectado
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  AVANCE DE OBRA MOD.xlsx
                </h4>
                <p className="text-[11px] text-slate-500">
                  Ubicación: /Users/franciscocornejo/Downloads/AVANCE DE OBRA MOD.xlsx
                </p>
              </div>
              <button
                type="button"
                onClick={handleLoadLocalFile}
                disabled={analyzing}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 transition-all flex-shrink-0"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analizando libro...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analizar este Archivo Ahora</span>
                  </>
                )}
              </button>
            </div>

            {/* File Dropzone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                O seleccione un archivo Excel de su ordenador (.xlsx, .xlsm):
              </label>
              <label className="border-2 border-dashed border-slate-300 hover:border-orange-500 bg-slate-50/50 hover:bg-orange-50/30 rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-white group-hover:bg-orange-600 group-hover:text-white text-slate-500 border border-slate-200 shadow-sm flex items-center justify-center transition-colors mb-3">
                  <Upload className="w-7 h-7" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-800 text-center">
                  Arrastre su archivo Excel aquí o haga clic para examinar
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Formatos soportados: .xlsx, .xlsm (compatible con plantillas oficiales de LICOSA)
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xlsm"
                  onChange={handleFileSelect}
                  disabled={analyzing}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* STEP 2: REVIEW & DISCREPANCIES */}
        {step === 'review' && analysisResult && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* SHEET DIAGNOSTIC BAR */}
            <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-600">Pestañas Detectadas en Excel:</span>
                {analysisResult.detectedSheets.map((s) => (
                  <span
                    key={s.name}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                      s.type === 'REGISTRO_DIARIO'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : s.type === 'RDO'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : s.type === 'HOROMETRO'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                    title={s.description}
                  >
                    {s.type === 'REGISTRO_DIARIO' && <Layers className="w-3 h-3" />}
                    {s.type === 'RDO' && <FileSpreadsheet className="w-3 h-3" />}
                    {s.type === 'HOROMETRO' && <Clock className="w-3 h-3" />}
                    <span>{s.name}</span>
                    <span className="text-[10px] opacity-75 font-normal">({s.rowCount} f.)</span>
                  </span>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setStep('upload')}
                className="text-xs text-orange-600 hover:text-orange-700 font-bold underline"
              >
                Cambiar archivo / parámetros
              </button>
            </div>

            {/* KPI METRICS CARDS */}
            <div className="p-6 pb-2 grid grid-cols-2 sm:grid-cols-4 gap-3 flex-shrink-0">
              {/* Nuevos */}
              <div
                onClick={() => setActiveFilter('new')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  activeFilter === 'new'
                    ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-emerald-700 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Nuevos a Crear</span>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-slate-900">{newCount}</div>
                <p className="text-[10px] text-slate-500 mt-0.5">Fechas no registradas en BD</p>
              </div>

              {/* Discrepancias */}
              <div
                onClick={() => setActiveFilter('discrepancy')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  activeFilter === 'discrepancy'
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-amber-700 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Con Discrepancias</span>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-slate-900">{discrepancyCount}</div>
                <p className="text-[10px] text-slate-500 mt-0.5">Valores modificados en Excel</p>
              </div>

              {/* Sin Cambios */}
              <div
                onClick={() => setActiveFilter('identical')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  activeFilter === 'identical'
                    ? 'border-slate-500 bg-slate-100 ring-2 ring-slate-400/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-slate-600 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Sin Cambios</span>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-slate-900">{identicalCount}</div>
                <p className="text-[10px] text-slate-500 mt-0.5">Omitidos para no duplicar</p>
              </div>

              {/* Total a procesar */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between text-slate-600 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Total Seleccionados</span>
                  <ShieldCheck className="w-4 h-4 text-orange-600" />
                </div>
                <div className="text-2xl font-black text-orange-600">{selectedCount}</div>
                <p className="text-[10px] text-slate-500 mt-0.5">Listos para procesar</p>
              </div>
            </div>

            {/* FILTER AND SELECTION CONTROLS */}
            <div className="px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                    activeFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todos ({items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('new')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                    activeFilter === 'new'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  Nuevos ({newCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('discrepancy')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                    activeFilter === 'discrepancy'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  Discrepancias ({discrepancyCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('identical')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                    activeFilter === 'identical'
                      ? 'bg-slate-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Sin Cambios ({identicalCount})
                </button>
              </div>

              {/* Search & Bulk Select */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filtrar fecha, rubro..."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none w-44 sm:w-56"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl whitespace-nowrap"
                  title="Marcar todos los reportes nuevos y con discrepancias"
                >
                  Marcar Nuevos
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-semibold rounded-xl whitespace-nowrap"
                >
                  Desmarcar
                </button>
              </div>
            </div>

            {/* NOTICE */}
            <div className="mx-6 my-2 px-3.5 py-2 bg-blue-50/70 border border-blue-200/60 rounded-xl text-[11px] text-blue-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>
                <strong>Control de Duplicados:</strong> Los reportes que ya existen y están idénticos están desmarcados por defecto para no duplicar datos. Solo se crearán los nuevos y se actualizarán las discrepancias marcadas.
              </span>
            </div>

            {/* ITEMS LIST */}
            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-3">
              {filteredItems.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                  No se encontraron reportes con el filtro o término de búsqueda aplicado.
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isExpanded = expandedDates.has(item.date);
                  const isIdentical = item.status === 'IDENTICAL';
                  const isDiscrepancy = item.status === 'DISCREPANCY';

                  return (
                    <div
                      key={item.date}
                      className={`border rounded-2xl transition-all ${
                        isDiscrepancy
                          ? 'border-amber-300 bg-amber-50/20 shadow-sm'
                          : isIdentical
                          ? 'border-slate-200 bg-slate-50/50 opacity-80'
                          : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      {/* Card Row Header */}
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            disabled={isIdentical}
                            onChange={() => toggleItemSelection(item.date)}
                            className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 cursor-pointer disabled:opacity-40"
                          />

                          {/* Status Badge */}
                          {item.status === 'NEW' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <Sparkles className="w-3 h-3 text-emerald-600" />
                              Nuevo Reporte
                            </span>
                          )}
                          {item.status === 'DISCREPANCY' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              {item.statusLabel}
                            </span>
                          )}
                          {item.status === 'IDENTICAL' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                              <CheckCircle2 className="w-3 h-3 text-slate-500" />
                              Sin Cambios (Idéntico)
                            </span>
                          )}

                          {/* Date and Report number */}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-black text-slate-900">
                                {item.date}
                              </span>
                              <span className="text-xs text-slate-500">
                                (Reporte N° {item.reportNumber})
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 block">
                              Origen: {item.sourceSheet} • {item.rubrosCount} rubros ejecutados
                              {item.machineryCount > 0 && ` • ${item.machineryCount} equipos`}
                            </span>
                          </div>
                        </div>

                        {/* Financial summary & Accordion trigger */}
                        <div className="flex items-center gap-4 justify-between sm:justify-end">
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Monto del Día
                            </span>
                            <span className="text-sm font-black text-slate-900">
                              ${item.dayTotalAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleExpand(item.date)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                          >
                            <span>{isExpanded ? 'Ocultar' : 'Ver Detalle'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Details Drawer */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/70 rounded-b-2xl space-y-3">
                          {/* Discrepancies Side-by-Side Comparison */}
                          {item.discrepancies.length > 0 && (
                            <div className="bg-white rounded-xl border border-amber-200 p-3 shadow-xs">
                              <h5 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                <span>Discrepancias Detectadas vs Base de Datos:</span>
                              </h5>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase">
                                      <th className="py-1 px-2">Parámetro / Rubro</th>
                                      <th className="py-1 px-2">En Base de Datos (Actual)</th>
                                      <th className="py-1 px-2">En Archivo Excel (Nuevo)</th>
                                      <th className="py-1 px-2 text-right">Diferencia</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.discrepancies.map((d, dIdx) => (
                                      <tr key={dIdx} className="border-b border-slate-100">
                                        <td className="py-1.5 px-2 font-semibold text-slate-800">{d.label}</td>
                                        <td className="py-1.5 px-2 text-slate-600 font-mono">{String(d.dbValue)}</td>
                                        <td className="py-1.5 px-2 text-slate-900 font-bold font-mono">{String(d.excelValue)}</td>
                                        <td className="py-1.5 px-2 text-right font-mono font-bold">
                                          {d.diff !== undefined ? (
                                            <span className={d.diff >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                                              {d.diff >= 0 ? `+${d.diff.toFixed(2)}` : d.diff.toFixed(2)}
                                            </span>
                                          ) : (
                                            '—'
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Executed Rubros Detail Table */}
                          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
                            <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                              <FileCheck className="w-3.5 h-3.5 text-orange-600" />
                              <span>Rubros Ejecutados este Día ({item.rubroExecutions.length} ítems):</span>
                            </h5>
                            <div className="overflow-x-auto max-h-48">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase sticky top-0 bg-white">
                                    <th className="py-1 px-2">N°</th>
                                    <th className="py-1 px-2">Descripción</th>
                                    <th className="py-1 px-2">Unid.</th>
                                    <th className="py-1 px-2 text-right">Cant. Día</th>
                                    <th className="py-1 px-2 text-right">P.U. ($)</th>
                                    <th className="py-1 px-2 text-right">Monto Día ($)</th>
                                    <th className="py-1 px-2">Abscisa / Tramo</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {item.rubroExecutions.map((r, rIdx) => (
                                    <tr key={rIdx} className="border-b border-slate-100 hover:bg-slate-50">
                                      <td className="py-1.5 px-2 font-mono font-bold text-orange-600">{r.rubroNumber}</td>
                                      <td className="py-1.5 px-2 font-medium text-slate-800">{r.description}</td>
                                      <td className="py-1.5 px-2 text-slate-500">{r.unit}</td>
                                      <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                                        {r.quantity.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className="py-1.5 px-2 text-right font-mono text-slate-600">
                                        ${r.unitPrice.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                                        ${r.amount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className="py-1.5 px-2 text-slate-500 text-[11px]">
                                        {r.tramo || '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Machinery Logs if available */}
                          {item.machineryLogs && item.machineryLogs.length > 0 && (
                            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
                              <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                                <Truck className="w-3.5 h-3.5 text-blue-600" />
                                <span>Horómetros de Equipo ({item.machineryLogs.length} equipos):</span>
                              </h5>
                              <div className="flex flex-wrap gap-2">
                                {item.machineryLogs.map((m, mIdx) => (
                                  <div
                                    key={mIdx}
                                    className="px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-2"
                                  >
                                    <span className="font-bold">{m.equipment}:</span>
                                    <span className="font-mono">{m.hours} hrs</span>
                                    {m.inicio !== undefined && m.fin !== undefined && (
                                      <span className="text-[10px] text-blue-600 font-mono">
                                        ({m.inicio} - {m.fin})
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS CONFIRMATION */}
        {step === 'success' && successInfo && (
          <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="max-w-md">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block mb-2">
                Sincronización Completada
              </span>
              <h3 className="text-xl font-black text-slate-900">
                ¡Actualización de Reportes Exitosa!
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                {successInfo.message}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-xs w-full text-center py-2">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Creados</span>
                <p className="text-xl font-black text-emerald-600">{successInfo.createdCount}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Actualizados</span>
                <p className="text-xl font-black text-amber-600">{successInfo.updatedCount}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-4 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              Cerrar y Ver Reportes Actualizados
            </button>
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={syncing}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            {step === 'success' ? 'Cerrar' : 'Cancelar'}
          </button>

          {step === 'review' && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 hidden sm:inline">
                {selectedCount} reporte(s) seleccionados
              </span>
              <button
                type="button"
                onClick={handleProceedUpdate}
                disabled={syncing || selectedCount === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-600/20 transition-all"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Actualizando base de datos...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Aceptar y Proceder a Actualizar ({selectedCount})</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
