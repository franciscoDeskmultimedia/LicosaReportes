'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  DollarSign,
  Loader2,
  FileCheck,
  Sparkles,
  Layers,
  ArrowRight,
  Database,
  Building2,
  Filter,
  Search,
  RefreshCw,
  Check,
  PlusCircle,
  HelpCircle,
  Info,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import {
  parseExpensesExcel,
  syncProjectExpenses,
  ParsedExpensesExcelResult,
  ExpenseComparisonItem,
  ExpenseComparisonSummary,
  ExpenseDiffStatus,
} from '@/lib/actions/expenses';

interface ImportExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectCode: string;
  projectName: string;
  onSuccess?: () => void;
}

export function ImportExpensesModal({
  isOpen,
  onClose,
  projectId,
  projectCode,
  projectName,
  onSuccess,
}: ImportExpensesModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Analysis result state
  const [parsedResult, setParsedResult] = useState<ParsedExpensesExcelResult | null>(null);
  
  // Sincronización: 'smart_merge' (cotejo sin duplicar) o 'replace_all' (reemplazo total)
  const [syncMode, setSyncMode] = useState<'smart_merge' | 'replace_all'>('smart_merge');
  const [updateModified, setUpdateModified] = useState<boolean>(true);

  // Tab de filtro visual comparativo: 'all' | 'new' | 'modified' | 'identical'
  const [activeFilterTab, setActiveFilterTab] = useState<'new' | 'modified' | 'identical' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await runAnalysis(file, undefined);
  }

  async function handleLoadLocalFile() {
    await runAnalysis(null, '/Users/franciscocornejo/Downloads/GASTOS OBRA VALLE DE LA VIRGEN.xls');
  }

  async function runAnalysis(file: File | null, localPath?: string) {
    setAnalyzing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('projectId', projectId);
      if (file) {
        formData.append('file', file);
      } else if (localPath) {
        formData.append('localPath', localPath);
      }
      const res = await parseExpensesExcel(formData);
      if (!res.success) {
        setError(res.error || 'No se pudo leer el archivo Excel.');
        setParsedResult(null);
        return;
      }
      setParsedResult(res);

      // Si hay ítems nuevos y ya existían registros previos, enfocar automáticamente en la pestaña de nuevos
      if (res.comparison?.summary?.existingCount && res.comparison.summary.existingCount > 0) {
        if (res.comparison.summary.newCount > 0) {
          setActiveFilterTab('new');
        } else if (res.comparison.summary.modifiedCount > 0) {
          setActiveFilterTab('modified');
        } else {
          setActiveFilterTab('all');
        }
      } else {
        setActiveFilterTab('all');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Error al procesar el archivo Excel.');
    } finally {
      setAnalyzing(false);
    }
  }

  function handleReset() {
    setParsedResult(null);
    setError(null);
    setActiveFilterTab('all');
    setSearchQuery('');
    setSyncMode('smart_merge');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleConfirmImport() {
    if (!parsedResult || parsedResult.expenses.length === 0) return;

    setImporting(true);
    setError(null);

    try {
      const res = await syncProjectExpenses({
        projectId,
        expenses: parsedResult.expenses,
        mode: syncMode,
        updateModified,
        fileName: parsedResult.fileName,
      });

      if (res.success) {
        handleReset();
        onClose();
        if (onSuccess) onSuccess();
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Error al guardar los costos en la base de datos.');
    } finally {
      setImporting(false);
    }
  }

  // Filtrado de items comparativos para la tabla
  const comparisonItems: ExpenseComparisonItem[] = useMemo(() => {
    if (!parsedResult) return [];
    if (parsedResult.comparison?.items) {
      return parsedResult.comparison.items;
    }
    // Fallback: considerar todos nuevos si no hubo comparativo previo
    return parsedResult.expenses.map((e) => ({ ...e, status: 'NUEVO' as ExpenseDiffStatus }));
  }, [parsedResult]);

  const filteredItems = useMemo(() => {
    let items = comparisonItems;

    // Filtro por tab
    if (activeFilterTab === 'new') {
      items = items.filter((i) => i.status === 'NUEVO');
    } else if (activeFilterTab === 'modified') {
      items = items.filter((i) => i.status === 'MODIFICADO');
    } else if (activeFilterTab === 'identical') {
      items = items.filter((i) => i.status === 'IDENTICO');
    }

    // Filtro por buscador
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.supplier.toLowerCase().includes(q) ||
          i.documentNumber.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          (i.category && i.category.toLowerCase().includes(q))
      );
    }

    return items;
  }, [comparisonItems, activeFilterTab, searchQuery]);

  const summary = parsedResult?.comparison?.summary;
  const hasExistingData = (summary?.existingCount || 0) > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Costos de Obra
                </span>
                <span className="text-xs text-slate-400 font-mono">[{projectCode}]</span>
              </div>
              <h2 className="text-base font-bold text-white">
                {parsedResult && hasExistingData ? 'Cotejo y Actualización de Costos' : 'Importar Planilla de Gastos desde Excel'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content area */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Atención:</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {!parsedResult ? (
            <div className="space-y-4">
              {/* Acceso rápido a archivo detectado en Downloads si aplica */}
              <div className="bg-gradient-to-r from-emerald-50 via-slate-50 to-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block mb-1">
                    Archivo de Gastos Disponible
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm">
                    GASTOS OBRA VALLE DE LA VIRGEN.xls
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Formato estándar de comprobantes con retenciones, IVA y proveedores.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLoadLocalFile}
                  disabled={analyzing}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex-shrink-0 cursor-pointer"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analizando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Cargar este Archivo</span>
                    </>
                  )}
                </button>
              </div>

              {/* Dropzone para subir cualquier archivo de costos */}
              <div className="p-7 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/60 text-center transition-all">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .xlsm"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="excel-expenses-file-input"
                  disabled={analyzing}
                />
                <label
                  htmlFor="excel-expenses-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2 py-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                    {analyzing ? (
                      <Loader2 className="w-7 h-7 animate-spin" />
                    ) : (
                      <Upload className="w-7 h-7" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {analyzing ? 'Cotejando comprobantes con la base de datos...' : 'Seleccione o arrastre el archivo de costos (.xls / .xlsx)'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      El sistema coteja automáticamente las facturas para <strong>evitar duplicados</strong> y detectar novedades o cambios.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          ) : (
            /* Vista previa con VISUAL COMPARATIVO */
            <div className="space-y-5">
              {/* Barra de archivo */}
              <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="font-bold text-slate-800 truncate">{parsedResult.fileName}</span>
                  <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                    Hoja: {parsedResult.sheetName}
                  </span>
                  <span className="bg-slate-200 text-slate-700 font-mono px-2 py-0.5 rounded text-[10px]">
                    {parsedResult.count} filas analizadas
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-slate-500 hover:text-red-600 font-semibold transition-colors cursor-pointer"
                >
                  Cambiar archivo
                </button>
              </div>

              {/* VISUAL COMPARATIVO: TARJETAS EJECUTIVAS */}
              {summary && hasExistingData ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Cotejo Inteligente vs. Costos Registrados en la Obra
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">
                      En BD: {summary.existingCount} ítems (${summary.existingTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Tarjeta 1: Nuevos */}
                    <div
                      onClick={() => setActiveFilterTab('new')}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        activeFilterTab === 'new'
                          ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'bg-emerald-50/30 border-emerald-200 hover:bg-emerald-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-emerald-800 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          Nuevos Ítems Detectados
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white shadow-xs">
                          +{summary.newCount}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-lg font-black text-emerald-900 font-mono">
                          +${summary.newTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <p className="text-[10px] text-emerald-700 mt-0.5">
                          {summary.newCount > 0 ? 'Facturas o gastos que se añadirán a la obra' : 'No se detectaron nuevas facturas'}
                        </p>
                      </div>
                    </div>

                    {/* Tarjeta 2: Modificados */}
                    <div
                      onClick={() => setActiveFilterTab('modified')}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        activeFilterTab === 'modified'
                          ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20'
                          : 'bg-amber-50/30 border-amber-200 hover:bg-amber-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-amber-800 flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                          Ítems con Cambios
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-600 text-white shadow-xs">
                          {summary.modifiedCount}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-lg font-black text-amber-900 font-mono">
                          {summary.modifiedTotalDelta >= 0 ? '+' : ''}${summary.modifiedTotalDelta.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <p className="text-[10px] text-amber-700 mt-0.5">
                          {summary.modifiedCount > 0 ? 'Mismos comprobantes con montos o retenciones actualizados' : 'Sin cambios en comprobantes ya registrados'}
                        </p>
                      </div>
                    </div>

                    {/* Tarjeta 3: Idénticos */}
                    <div
                      onClick={() => setActiveFilterTab('identical')}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        activeFilterTab === 'identical'
                          ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-400/20'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-600 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-slate-500" />
                          Ya en BD (Sin Cambios)
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-300 text-slate-800">
                          {summary.identicalCount}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-lg font-black text-slate-700 font-mono">
                          ${summary.identicalTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Omitidos automáticamente para <strong>evitar duplicar gastos</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Primera carga */
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">Total a Registrar</span>
                    <span className="text-base font-extrabold text-emerald-950 font-mono">
                      ${parsedResult.totalSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Subtotal Imponible</span>
                    <span className="text-base font-extrabold text-slate-700 font-mono">
                      ${parsedResult.subtotalSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">IVA Total</span>
                    <span className="text-base font-extrabold text-indigo-700 font-mono">
                      ${parsedResult.ivaSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Retenciones</span>
                    <span className="text-base font-extrabold text-amber-700 font-mono">
                      ${parsedResult.retentionsSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {/* MODO DE CARGA: COTEJO INTELIGENTE VS REEMPLAZO TOTAL */}
              {hasExistingData && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-slate-800 block">
                    ¿Cómo deseas procesar la actualización?
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <label
                      className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                        syncMode === 'smart_merge'
                          ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="syncMode"
                        checked={syncMode === 'smart_merge'}
                        onChange={() => setSyncMode('smart_merge')}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <strong className="block font-bold">
                          Cotejo Inteligente (Recomendado)
                        </strong>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Incorpora los <strong>+{summary?.newCount || 0} nuevos ítems</strong> y actualiza los <strong>{summary?.modifiedCount || 0} modificados</strong>. No duplica los comprobantes que ya existen.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                        syncMode === 'replace_all'
                          ? 'bg-rose-50/70 border-rose-500 ring-2 ring-rose-500/20 text-rose-950'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="syncMode"
                        checked={syncMode === 'replace_all'}
                        onChange={() => setSyncMode('replace_all')}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500"
                      />
                      <div>
                        <strong className="block font-bold">
                          Reemplazo Total (Sobrescribir Obra)
                        </strong>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Borra los {summary?.existingCount || 0} costos registrados anteriormente y deja exactamente los {parsedResult.count} ítems de este archivo.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* BARRA DE FILTROS Y BUSCADOR DE LA TABLA COMPARATIVA */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {hasExistingData ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveFilterTab('new')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            activeFilterTab === 'new'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Nuevos (+{summary?.newCount || 0})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveFilterTab('modified')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            activeFilterTab === 'modified'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Modificados ({summary?.modifiedCount || 0})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveFilterTab('identical')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            activeFilterTab === 'identical'
                              ? 'bg-slate-700 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Sin Cambios ({summary?.identicalCount || 0})</span>
                        </button>
                      </>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setActiveFilterTab('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeFilterTab === 'all'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Todos ({comparisonItems.length})</span>
                    </button>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por proveedor o # doc..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* TABLA COMPARATIVA CON BADGES DE ESTADO */}
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-[10px] text-slate-600 font-bold uppercase sticky top-0 border-b border-slate-200 z-10">
                      <tr>
                        <th className="p-2.5 w-28">Estado Cotejo</th>
                        <th className="p-2.5 w-20">Fecha</th>
                        <th className="p-2.5 w-28"># Comprobante</th>
                        <th className="p-2.5">Proveedor / Persona</th>
                        <th className="p-2.5 w-24 text-right">Total ($)</th>
                        <th className="p-2.5 w-24 text-right">Saldo ($)</th>
                        <th className="p-2.5 w-28">Categoría</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white font-mono text-[11px]">
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                            No se encontraron ítems en esta vista.
                          </td>
                        </tr>
                      ) : (
                        filteredItems.slice(0, 150).map((item, idx) => (
                          <tr
                            key={idx}
                            className={`transition-colors ${
                              item.status === 'NUEVO'
                                ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                                : item.status === 'MODIFICADO'
                                ? 'bg-amber-50/40 hover:bg-amber-50/70'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="p-2.5 font-sans">
                              {item.status === 'NUEVO' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <Sparkles className="w-3 h-3 text-emerald-600" />
                                  NUEVO
                                </span>
                              )}
                              {item.status === 'MODIFICADO' && (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 cursor-help"
                                  title={item.diffs?.map((d) => `${d.label}: $${d.oldValue} ➔ $${d.newValue}`).join(', ')}
                                >
                                  <RefreshCw className="w-3 h-3 text-amber-600" />
                                  MODIFICADO
                                </span>
                              )}
                              {item.status === 'IDENTICO' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  <Check className="w-3 h-3 text-slate-400" />
                                  YA EN BD
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-slate-600">{item.date}</td>
                            <td className="p-2.5 text-slate-700 font-bold">
                              {item.documentNumber || 'S/N'}
                            </td>
                            <td className="p-2.5 font-sans font-medium text-slate-900 truncate max-w-[200px]" title={item.supplier}>
                              {item.supplier}
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-900">
                              ${item.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-2.5 text-right text-slate-600">
                              ${item.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-2.5 font-sans">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 truncate block max-w-[120px]">
                                {item.category}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredItems.length > 150 && (
                  <p className="text-[11px] text-slate-400 text-right">
                    Mostrando los primeros 150 comprobantes de {filteredItems.length}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {parsedResult && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 flex-shrink-0">
            <div className="text-xs text-slate-500 hidden sm:block">
              {hasExistingData ? (
                syncMode === 'smart_merge' ? (
                  <span>
                    Acción: Se añadirán <strong>+{summary?.newCount || 0} nuevos</strong> y <strong>{summary?.modifiedCount || 0} modificados</strong>. No se duplicarán los <strong>{summary?.identicalCount || 0} existentes</strong>.
                  </span>
                ) : (
                  <span className="text-rose-600 font-semibold">
                    Acción: Se reemplazarán los {summary?.existingCount || 0} costos anteriores con los {parsedResult.count} de este archivo.
                  </span>
                )
              ) : (
                <span>Se registrarán los {parsedResult.count} gastos del archivo en la obra.</span>
              )}
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={handleReset}
                disabled={importing}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-white transition-colors cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importing || parsedResult.expenses.length === 0}
                className={`inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 ${
                  syncMode === 'replace_all'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                }`}
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sincronizando costos...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {hasExistingData
                        ? syncMode === 'smart_merge'
                          ? `Aceptar Carga e Incorporar (${summary?.newCount ? `+${summary.newCount} nuevos` : 'Actualizar'})`
                          : `Reemplazar Obra con ${parsedResult.count} Gastos`
                        : `Confirmar e Importar ${parsedResult.count} Gastos`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
