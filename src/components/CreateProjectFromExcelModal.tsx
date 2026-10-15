'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  Layers,
  Building2,
  Calendar,
  DollarSign,
  Download,
  Loader2,
  FileCheck,
  Sparkles,
  Wand2,
  Lightbulb,
  Check,
  Info,
} from 'lucide-react';
import {
  parseProjectExcel,
  createProjectWithRubros,
  ParsedProjectExcelResult,
  ProjectImportSuggestion,
} from '@/lib/actions/projects';
import { parseProjectFileClient, stripHeavySheets } from '@/lib/projectExcelParser';

interface CreateProjectFromExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateProjectFromExcelModal({
  isOpen,
  onClose,
}: CreateProjectFromExcelModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Parsed project info & rubros state
  const [parsedData, setParsedData] = useState<ParsedProjectExcelResult['projectData'] | null>(null);
  const [rubros, setRubros] = useState<ParsedProjectExcelResult['rubros']>([]);
  const [detectedSheet, setDetectedSheet] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ProjectImportSuggestion[]>([]);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setAnalyzing(true);
    setError(null);
    setAppliedSuggestions(new Set());

    try {
      // Parsear directamente en cliente para procesar al instante y soportar archivos grandes (>4.5MB con fotos)
      let res = await parseProjectFileClient(file);

      // Fallback a servidor si por alguna razón el parser del cliente fallara
      if (!res.success) {
        const cleanFile = await stripHeavySheets(file);
        const formData = new FormData();
        formData.append('file', cleanFile);
        res = await parseProjectExcel(formData);
      }

      if (!res.success) {
        setError(res.error || 'No se pudo leer el archivo Excel.');
        setParsedData(null);
        setRubros([]);
        setSuggestions([]);
        return;
      }

      setParsedData(res.projectData);
      setRubros(res.rubros);
      setDetectedSheet(res.detectedRubrosSheet || null);
      setSuggestions(res.suggestions || []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error al procesar el archivo Excel.');
    } finally {
      setAnalyzing(false);
    }
  }

  function handleReset() {
    setFileName(null);
    setParsedData(null);
    setRubros([]);
    setSuggestions([]);
    setAppliedSuggestions(new Set());
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleApplySuggestion(sug: ProjectImportSuggestion) {
    if (sug.actionType === 'FIX_AMOUNT' && sug.targetValue !== undefined) {
      if (parsedData) {
        setParsedData({ ...parsedData, contractAmount: sug.targetValue });
      }
      setAppliedSuggestions((prev) => new Set(prev).add(sug.id));
    } else if (sug.actionType === 'RENUMBER_RUBROS') {
      setRubros((prev) =>
        prev.map((r, i) => ({
          ...r,
          rubroNumber: i + 1,
        }))
      );
      setAppliedSuggestions((prev) => new Set(prev).add(sug.id));
    } else if (sug.actionType === 'AUTO_CLASSIFY_PRINCIPALS') {
      const totalBudget = rubros.reduce((acc, r) => acc + r.unitPrice * r.initialQuantity, 0);
      const sortedWithIdx = rubros
        .map((r, originalIdx) => ({
          originalIdx,
          val: r.unitPrice * r.initialQuantity,
        }))
        .sort((a, b) => b.val - a.val);

      const principalIndices = new Set<number>();
      let runningSum = 0;
      for (const item of sortedWithIdx) {
        runningSum += item.val;
        principalIndices.add(item.originalIdx);
        if (runningSum >= totalBudget * 0.8 && principalIndices.size >= 1) {
          break;
        }
      }

      setRubros((prev) =>
        prev.map((r, i) => ({
          ...r,
          isPrincipal: principalIndices.has(i),
        }))
      );
      setAppliedSuggestions((prev) => new Set(prev).add(sug.id));
    }
  }

  function toggleRubroPrincipal(index: number) {
    setRubros((prev) =>
      prev.map((r, i) => (i === index ? { ...r, isPrincipal: !r.isPrincipal } : r))
    );
  }

  async function handleConfirmCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!parsedData) return;

    if (!parsedData.code.trim()) {
      setError('El código de obra es obligatorio.');
      return;
    }
    if (!parsedData.name.trim()) {
      setError('El nombre del proyecto es obligatorio.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await createProjectWithRubros({
        project: parsedData,
        rubros,
      });

      if (res.success) {
        handleReset();
        onClose();
        router.refresh();
        router.push(`/proyectos/${res.projectId}`);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error al crear el proyecto en la base de datos.');
    } finally {
      setSubmitting(false);
    }
  }

  const calculatedTotalRubros = rubros.reduce((acc, r) => acc + r.unitPrice * r.initialQuantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Crear Obra y Cargar Catálogo desde Excel
              </h2>
              <p className="text-xs text-slate-400">
                Importe la ficha contractual y todos los rubros con validación y correcciones automáticas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Atención:</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Subida de archivo inicial */}
          {!parsedData ? (
            <div className="space-y-4">
              <div className="p-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/60 text-center transition-all">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="excel-project-file-input"
                />
                <label
                  htmlFor="excel-project-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2.5 py-4"
                >
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                    {analyzing ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {analyzing ? 'Analizando archivo Excel y validando relaciones...' : 'Seleccione o arrastre el archivo Excel (.xlsx)'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Soporta el formato estandarizado LICOSA con hojas &ldquo;PROYECTO&rdquo; y &ldquo;Rubros&rdquo;, detectando automáticamente relaciones de montos y tipos.
                    </p>
                  </div>
                </label>
              </div>

              {/* Botón y tarjeta para descargar la plantilla oficial con código de colores */}
              <div className="bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-emerald-200/80 rounded-2xl p-4.5 text-xs shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <p className="font-bold text-slate-900 text-sm">
                        Plantilla Oficial Diseñada y Estilizada (Formato LICOSA)
                      </p>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Estructura visual intuitiva con pestañas <strong className="text-slate-800">PROYECTO</strong>, <strong className="text-slate-800">Rubros</strong> y pestaña de ejemplo oficial <strong className="text-slate-800">RDO_Ejemplo</strong> (Reporte Diario de Obra).
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        Amarillo: Celdas editables
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Verde: Fórmulas automáticas
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-300 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        Pestaña RDO de ejemplo
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
                    <a
                      href="/api/plantilla-excel"
                      download="Plantilla_Carga_Licosa.xlsx"
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-sm shadow-emerald-700/20 text-xs cursor-pointer"
                      title="Descarga la plantilla completa con Proyecto, Rubros y pestaña de Reporte Diario de ejemplo"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Plantilla Proyecto + RDO</span>
                    </a>
                    <a
                      href="/api/plantilla-reporte-diario"
                      download="Plantilla_Reporte_Diario_Licosa.xlsx"
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm shadow-blue-700/20 text-xs cursor-pointer"
                      title="Descarga la plantilla dedicada exclusivamente para emitir y sincronizar reportes diarios"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Solo Plantilla RDO</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Vista previa y confirmación de los datos detectados */
            <form onSubmit={handleConfirmCreate} className="space-y-6">
              
              {/* Barra de archivo cargado */}
              <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="font-bold text-slate-800 truncate">{fileName}</span>
                  {detectedSheet && (
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                      Hoja: {detectedSheet}
                    </span>
                  )}
                  <span className="bg-slate-200 text-slate-700 font-mono px-2 py-0.5 rounded text-[10px]">
                    {rubros.length} rubros detectados
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

              {/* Panel de Diagnóstico Inteligente y Sugerencias de Corrección */}
              {suggestions.length > 0 && (
                <div className="bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border border-indigo-100 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Diagnóstico Inteligente del Importador ({suggestions.length} observaciones)
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Relaciones y coherencia de datos evaluadas
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {suggestions.map((sug) => {
                      const isApplied = appliedSuggestions.has(sug.id);
                      const isWarning = sug.type === 'warning';
                      const isSuccess = sug.type === 'success';

                      return (
                        <div
                          key={sug.id}
                          className={`p-3 rounded-xl border text-xs flex flex-col justify-between gap-2 transition-all ${
                            isApplied
                              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-xs'
                              : isWarning
                              ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                              : isSuccess
                              ? 'bg-emerald-50/40 border-emerald-200 text-emerald-900'
                              : 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {isApplied || isSuccess ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                            ) : isWarning ? (
                              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            ) : (
                              <Lightbulb className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-[11px] leading-tight flex items-center gap-1.5">
                                <span>{sug.title}</span>
                                {isApplied && (
                                  <span className="bg-emerald-200 text-emerald-900 text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase">
                                    Aplicado ✓
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] mt-1 opacity-90 leading-relaxed">
                                {sug.message}
                              </p>
                            </div>
                          </div>

                          {sug.actionLabel && (
                            <div className="pt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleApplySuggestion(sug)}
                                disabled={isApplied}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold transition-all shadow-xs cursor-pointer disabled:cursor-default ${
                                  isApplied
                                    ? 'bg-emerald-200 text-emerald-900 opacity-70'
                                    : isWarning
                                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                                }`}
                              >
                                <Wand2 className="w-3 h-3" />
                                <span>{isApplied ? 'Sugerencia Aplicada' : sug.actionLabel}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Formulario de Ficha Contractual Extraída */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Building2 className="w-4 h-4 text-orange-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Ficha Técnica y Contractual de la Obra
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Código de Obra *
                    </label>
                    <input
                      type="text"
                      required
                      value={parsedData.code}
                      onChange={(e) =>
                        setParsedData({ ...parsedData, code: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-orange-500 outline-none uppercase"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Nombre del Proyecto *
                    </label>
                    <input
                      type="text"
                      required
                      value={parsedData.name}
                      onChange={(e) =>
                        setParsedData({ ...parsedData, name: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold focus:ring-1 focus:ring-orange-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Contratista / Consorcio
                    </label>
                    <input
                      type="text"
                      value={parsedData.contractor}
                      onChange={(e) =>
                        setParsedData({ ...parsedData, contractor: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Cliente / Contratante
                    </label>
                    <input
                      type="text"
                      value={parsedData.client}
                      onChange={(e) =>
                        setParsedData({ ...parsedData, client: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Fiscalización
                    </label>
                    <input
                      type="text"
                      value={parsedData.inspectionCompany}
                      onChange={(e) =>
                        setParsedData({ ...parsedData, inspectionCompany: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Número de Contrato
                    </label>
                    <input
                      type="text"
                      value={parsedData.contractNumber}
                      onChange={(e) =>
                        setParsedData({ ...parsedData, contractNumber: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-orange-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Monto Contractual ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={parsedData.contractAmount}
                      onChange={(e) =>
                        setParsedData({
                          ...parsedData,
                          contractAmount: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-orange-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Plazo (Días)
                    </label>
                    <input
                      type="number"
                      value={parsedData.durationDays}
                      onChange={(e) =>
                        setParsedData({
                          ...parsedData,
                          durationDays: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-orange-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Fecha de Inicio
                    </label>
                    <input
                      type="date"
                      value={parsedData.startDate}
                      onChange={(e) =>
                        setParsedData({ ...parsedData, startDate: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Tramo o Segmento Vial
                    </label>
                    <input
                      type="text"
                      value={parsedData.roadSection}
                      onChange={(e) =>
                        setParsedData({ ...parsedData, roadSection: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Vista Previa del Catálogo de Rubros */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Catálogo de Rubros Extraídos ({rubros.length} ítems)
                    </h3>
                  </div>
                  <div className="text-xs font-mono text-slate-600 flex items-center gap-3">
                    <span>
                      Suma Rubros: <strong className="text-emerald-700 font-bold">${calculatedTotalRubros.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="text-[11px] text-slate-500">
                      Clic en &ldquo;Tipo&rdquo; para alternar Principal / Normal
                    </span>
                  </div>
                </div>

                {rubros.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-800">
                    No se detectaron rubros en las hojas del archivo. El proyecto se creará con el presupuesto base, pudiendo agregar rubros posteriormente.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-[10px] text-slate-600 font-bold uppercase sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-2 w-10 text-center">N°</th>
                          <th className="p-2">Descripción</th>
                          <th className="p-2 w-14 text-center">Unid.</th>
                          <th className="p-2 text-right">P.U. ($)</th>
                          <th className="p-2 text-right">Cantidad</th>
                          <th className="p-2 text-right">Total ($)</th>
                          <th className="p-2 w-24 text-center">Tipo (Clic)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white font-mono text-[11px]">
                        {rubros.map((r, idx) => {
                          const total = r.unitPrice * r.initialQuantity;
                          return (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2 text-center text-slate-500 font-bold">{r.rubroNumber}</td>
                              <td className="p-2 font-sans font-medium text-slate-800">{r.description}</td>
                              <td className="p-2 text-center text-slate-600 font-sans">{r.unit}</td>
                              <td className="p-2 text-right text-slate-700">${r.unitPrice.toFixed(2)}</td>
                              <td className="p-2 text-right text-slate-700">{r.initialQuantity.toLocaleString('en-US')}</td>
                              <td className="p-2 text-right font-bold text-slate-900">${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="p-2 text-center font-sans">
                                <button
                                  type="button"
                                  onClick={() => toggleRubroPrincipal(idx)}
                                  title="Clic para cambiar entre Principal y Normal"
                                  className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase transition-transform active:scale-95 cursor-pointer ${
                                    r.isPrincipal
                                      ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                                  }`}
                                >
                                  {r.isPrincipal ? '★ Principal' : 'Normal'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creando Proyecto y Rubros...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Crear Obra y Cargar {rubros.length} Rubros</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
}
