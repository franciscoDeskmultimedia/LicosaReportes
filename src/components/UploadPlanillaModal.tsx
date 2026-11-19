'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Calendar,
  Download,
  Info,
  Building2,
  ArrowRight,
  PenTool,
  Search,
  Plus,
  Trash2,
} from 'lucide-react';
import { parsePlanillaExcel, savePlanilla, getProjectContractRubros } from '@/lib/actions/planillas';
import { PlanillaRaw, PlanillaItemRaw } from '@/data/planillas/default-planillas';

interface UploadPlanillaModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectCode: string;
  onPlanillaUploaded?: (newPlanillaId: string) => void;
}

export function UploadPlanillaModal({
  isOpen,
  onClose,
  projectId,
  projectCode,
  onPlanillaUploaded,
}: UploadPlanillaModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modo: 'excel' o 'manual'
  const [activeMode, setActiveMode] = useState<'excel' | 'manual'>('excel');

  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingRubros, setLoadingRubros] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parámetros de la Planilla
  const [planillaNumber, setPlanillaNumber] = useState<number>(2);
  const [title, setTitle] = useState<string>('Planilla No. 02 de Avance de Obra - Sábana');
  const [startDate, setStartDate] = useState<string>('2026-09-27');
  const [endDate, setEndDate] = useState<string>('2026-10-26');
  const [advancePercent, setAdvancePercent] = useState<number>(20);
  const [ivaPercent, setIvaPercent] = useState<number>(15);

  // Estado para modo Excel
  const [parsedPlanilla, setParsedPlanilla] = useState<PlanillaRaw | null>(null);
  const [detectedSheet, setDetectedSheet] = useState<string>('');

  // Estado para modo Manual
  const [manualRubros, setManualRubros] = useState<PlanillaItemRaw[]>([]);
  const [rubroSearchQuery, setRubroSearchQuery] = useState('');

  // Cargar rubros base al cambiar a modo manual
  useEffect(() => {
    if (activeMode === 'manual' && manualRubros.length === 0) {
      loadContractRubros();
    }
  }, [activeMode]);

  async function loadContractRubros() {
    setLoadingRubros(true);
    try {
      const rubros = await getProjectContractRubros(projectId);
      setManualRubros(rubros);
    } catch (err: any) {
      console.error('Error cargando rubros:', err);
    } finally {
      setLoadingRubros(false);
    }
  }

  // Filtrado de rubros en modo manual
  const filteredManualRubros = useMemo(() => {
    if (!rubroSearchQuery.trim()) return manualRubros;
    const q = rubroSearchQuery.toLowerCase();
    return manualRubros.filter(
      (r) =>
        r.description.toLowerCase().includes(q) ||
        r.itemNumber.toLowerCase().includes(q) ||
        (r.code && r.code.toLowerCase().includes(q))
    );
  }, [manualRubros, rubroSearchQuery]);

  // Actualizar cantidad de un rubro manual
  function handleManualQuantityChange(index: number, newQty: number) {
    setManualRubros((prev) => {
      const updated = [...prev];
      const target = updated[index];
      if (!target) return prev;
      const validQty = Math.max(0, newQty || 0);
      const periodAmount = Number((validQty * target.unitPrice).toFixed(2));
      const accumQty = (target.previousQuantity || 0) + validQty;
      const accumAmount = Number((accumQty * target.unitPrice).toFixed(2));
      const progressPercent =
        target.contractQuantity > 0 ? Number(((accumQty / target.contractQuantity) * 100).toFixed(2)) : 0;

      updated[index] = {
        ...target,
        periodQuantity: validQty,
        periodAmount,
        accumQuantity: accumQty,
        accumAmount,
        progressPercent,
      };
      return updated;
    });
  }

  // Cálculos financieros manuales
  const manualSubtotal = useMemo(() => {
    return Number(manualRubros.reduce((sum, r) => sum + (r.periodAmount || 0), 0).toFixed(2));
  }, [manualRubros]);

  const manualIva = Number((manualSubtotal * (ivaPercent / 100)).toFixed(2));
  const manualAdvance = Number((manualSubtotal * (advancePercent / 100)).toFixed(2));
  const manualNetToPay = Number((manualSubtotal + manualIva - manualAdvance).toFixed(2));
  const activeManualItemsCount = manualRubros.filter((r) => r.periodQuantity > 0).length;

  if (!isOpen) return null;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    await processFile(selected);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;
    setFile(droppedFile);
    await processFile(droppedFile);
  }

  async function processFile(targetFile: File) {
    setAnalyzing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', targetFile);
      formData.append('projectCode', projectCode);
      formData.append('planillaNumber', String(planillaNumber));
      formData.append('startDate', startDate);
      formData.append('endDate', endDate);

      const res = await parsePlanillaExcel(formData);

      if (!res.success || !res.planilla) {
        setError(res.error || 'No se pudo leer la sábana de la planilla.');
        setParsedPlanilla(null);
        return;
      }

      setParsedPlanilla(res.planilla);
      setDetectedSheet(res.sheetName || 'SABANA');
    } catch (err: any) {
      setError(err?.message || 'Error al analizar el archivo Excel.');
      setParsedPlanilla(null);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      let finalPlanilla: PlanillaRaw;

      if (activeMode === 'excel') {
        if (!parsedPlanilla) return;
        finalPlanilla = {
          ...parsedPlanilla,
          number: planillaNumber,
          code: `PLANILLA-${String(planillaNumber).padStart(2, '0')}`,
          title: `Planilla No. ${String(planillaNumber).padStart(2, '0')} de Avance de Obra - Sábana`,
          startDate,
          endDate,
          ivaPercent,
          advanceDeductionPercent: advancePercent,
          ivaAmount: Number((parsedPlanilla.subtotal * (ivaPercent / 100)).toFixed(2)),
          advanceDeductionAmount: Number((parsedPlanilla.subtotal * (advancePercent / 100)).toFixed(2)),
          totalWithIva: Number((parsedPlanilla.subtotal * (1 + ivaPercent / 100)).toFixed(2)),
          netToPay: Number(
            (
              parsedPlanilla.subtotal * (1 + ivaPercent / 100) -
              parsedPlanilla.subtotal * (advancePercent / 100)
            ).toFixed(2)
          ),
        };
      } else {
        // Modo manual
        if (manualRubros.length === 0) {
          throw new Error('No hay rubros cargados en la planilla manual.');
        }

        finalPlanilla = {
          id: `planilla-manual-${Date.now()}`,
          number: planillaNumber,
          code: `PLANILLA-${String(planillaNumber).padStart(2, '0')}`,
          title: title || `Planilla No. ${String(planillaNumber).padStart(2, '0')} de Avance de Obra`,
          projectCode,
          projectName: 'Rehabilitación de la Vía Valle de la Virgen – Lícosa',
          contractNumber: 'EC-PREFGUAYAS-527225-CW-RFB',
          contractor: 'CONSORCIO VALLE DE LA VIRGEN',
          client: 'PREFECTURA DEL GUAYAS / BANCO MUNDIAL BIRF',
          fiscalizador: 'ASOCIACION C-D',
          administrator: 'ING. ALBERTO JARRIN',
          contractAmount: 12104252.06,
          advanceAmount: 2420850.41,
          advancePercent,
          startDate,
          endDate,
          presentationDate: new Date().toISOString().split('T')[0],
          durationDays: 240,
          status: 'APROBADA',
          subtotal: manualSubtotal,
          ivaPercent,
          ivaAmount: manualIva,
          totalWithIva: Number((manualSubtotal + manualIva).toFixed(2)),
          advanceDeductionPercent: advancePercent,
          advanceDeductionAmount: manualAdvance,
          penaltiesAmount: 0,
          netToPay: manualNetToPay,
          economicAdvancePeriodPercent:
            manualSubtotal > 0 ? Number(((manualSubtotal / 12104252.06) * 100).toFixed(2)) : 0,
          economicAdvanceAccumPercent:
            manualSubtotal > 0 ? Number(((manualSubtotal / 12104252.06) * 100).toFixed(2)) : 0,
          notes: `Ingresada manualmente en el sistema con ${activeManualItemsCount} rubros ejecutados.`,
          items: manualRubros,
        };
      }

      const res = await savePlanilla(finalPlanilla);
      if (!res.success || !res.planilla) {
        throw new Error(res.error || 'Error al guardar la planilla.');
      }

      if (onPlanillaUploaded) {
        onPlanillaUploaded(res.planilla.id);
      } else {
        router.push(`/planillas?projectId=${projectId}&planillaId=${res.planilla.id}`);
        router.refresh();
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar la planilla.');
    } finally {
      setSaving(false);
    }
  }

  const formatCurrency = (val: number) => {
    return `$${Math.abs(val).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-6 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header con Selector de Modo */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 text-orange-700 rounded-2xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Registrar Nueva Planilla de Avance de Obra
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Carga la planilla mediante archivo Excel (.xlsx) o ingresa las cantidades manualmente.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Pestañas: Excel vs Manual */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveMode('excel')}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeMode === 'excel'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>1. Subir Archivo Excel (.xlsx / .xls)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('manual')}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeMode === 'manual'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>2. Ingreso Manual Asistido (Escribir Cantidades)</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Parámetros Básicos Comunes */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                N° de Planilla
              </label>
              <input
                type="number"
                min={1}
                value={planillaNumber}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10) || 1;
                  setPlanillaNumber(n);
                  setTitle(`Planilla No. ${String(n).padStart(2, '0')} de Avance de Obra - Sábana`);
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Fecha Inicio Período
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Fecha Fin Período
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Anticipo / IVA
              </label>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-500 text-[11px]">Ant:</span>
                <input
                  type="number"
                  value={advancePercent}
                  onChange={(e) => setAdvancePercent(parseFloat(e.target.value) || 0)}
                  className="w-14 bg-white border border-slate-300 rounded-xl px-2 py-2 text-center font-bold text-slate-800"
                />
                <span className="font-semibold text-slate-500 text-[11px]">% | IVA:</span>
                <input
                  type="number"
                  value={ivaPercent}
                  onChange={(e) => setIvaPercent(parseFloat(e.target.value) || 0)}
                  className="w-14 bg-white border border-slate-300 rounded-xl px-2 py-2 text-center font-bold text-slate-800"
                />
                <span className="font-semibold text-slate-500 text-[11px]">%</span>
              </div>
            </div>
          </div>

          {/* CONTENIDO MODO 1: SUBIDA POR EXCEL */}
          {activeMode === 'excel' && (
            <div className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all ${
                  file
                    ? 'border-emerald-500 bg-emerald-50/40'
                    : 'border-slate-300 hover:border-orange-500 hover:bg-orange-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center space-y-2">
                  <div
                    className={`p-3.5 rounded-full ${
                      file ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-600'
                    }`}
                  >
                    {analyzing ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : file ? (
                      <FileCheck className="w-6 h-6" />
                    ) : (
                      <Upload className="w-6 h-6" />
                    )}
                  </div>

                  {analyzing ? (
                    <div className="text-xs font-bold text-orange-600">
                      Analizando columnas, rubros y montos de la sábana Excel...
                    </div>
                  ) : file ? (
                    <div>
                      <div className="text-xs font-bold text-emerald-800">
                        Archivo cargado: {file.name}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {(file.size / 1024).toFixed(1)} KB • Haz clic para cambiar de archivo
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Arrastra aquí tu archivo Excel de la Planilla o haz clic para seleccionarlo
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Formatos compatibles: .xlsx, .xls con sábana de rubros, cantidades y valores
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Descargar Plantilla Modelo */}
              <div className="flex items-center justify-between text-xs p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>¿Prefieres llenar un Excel ya formateado con los rubros oficiales?</span>
                </div>
                <a
                  href="/api/plantilla-sabana"
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] transition-colors shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Plantilla Excel</span>
                </a>
              </div>

              {/* Vista Previa de la Planilla Analizada desde Excel */}
              {parsedPlanilla && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 uppercase flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>
                        Vista Previa: {parsedPlanilla.items.length} Rubros Detectados (Hoja: {detectedSheet})
                      </span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-900 text-white rounded-2xl">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Subtotal Período</span>
                      <span className="text-base font-black text-orange-400 font-mono">
                        {formatCurrency(parsedPlanilla.subtotal)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">IVA ({ivaPercent}%)</span>
                      <span className="text-base font-bold font-mono">
                        {formatCurrency(parsedPlanilla.subtotal * (ivaPercent / 100))}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Anticipo (-{advancePercent}%)
                      </span>
                      <span className="text-base font-bold text-rose-300 font-mono">
                        -{formatCurrency(parsedPlanilla.subtotal * (advancePercent / 100))}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Líquido a Cobrar</span>
                      <span className="text-base font-black text-emerald-400 font-mono">
                        {formatCurrency(
                          parsedPlanilla.subtotal * (1 + ivaPercent / 100) -
                            parsedPlanilla.subtotal * (advancePercent / 100)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CONTENIDO MODO 2: INGRESO MANUAL ASISTIDO */}
          {activeMode === 'manual' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar rubro por nombre o código para ingresar cantidad..."
                    value={rubroSearchQuery}
                    onChange={(e) => setRubroSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="text-xs text-slate-600 font-semibold flex items-center gap-2">
                  <span>{activeManualItemsCount} rubros con avance</span>
                  <span>•</span>
                  <span className="text-orange-700 font-bold">Subtotal: {formatCurrency(manualSubtotal)}</span>
                </div>
              </div>

              {/* Resumen Financiero en Vivo */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-900 text-white rounded-2xl">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Subtotal Período</span>
                  <span className="text-base font-black text-orange-400 font-mono">
                    {formatCurrency(manualSubtotal)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">IVA ({ivaPercent}%)</span>
                  <span className="text-base font-bold font-mono">{formatCurrency(manualIva)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Anticipo (-{advancePercent}%)
                  </span>
                  <span className="text-base font-bold text-rose-300 font-mono">
                    -{formatCurrency(manualAdvance)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Líquido a Cobrar</span>
                  <span className="text-base font-black text-emerald-400 font-mono">
                    {formatCurrency(manualNetToPay)}
                  </span>
                </div>
              </div>

              {/* Tabla Editable de Rubros */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                {loadingRubros ? (
                  <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                    <span>Cargando catálogo contractual de rubros...</span>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 sticky top-0 font-bold text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="p-2 w-14 text-center">Ítem</th>
                        <th className="p-2 min-w-[220px]">Descripción del Rubro</th>
                        <th className="p-2 w-14 text-center">Und</th>
                        <th className="p-2 w-20 text-right">P.U. ($)</th>
                        <th className="p-2 w-32 text-center bg-orange-50 text-orange-950">
                          Cant. Este Período
                        </th>
                        <th className="p-2 w-28 text-right bg-orange-100/70 text-orange-950">
                          Monto Período ($)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {filteredManualRubros.map((it, idx) => {
                        const originalIndex = manualRubros.findIndex((r) => r.itemNumber === it.itemNumber);
                        const hasQty = it.periodQuantity > 0;
                        return (
                          <tr key={it.itemNumber} className={hasQty ? 'bg-orange-50/40' : 'hover:bg-slate-50'}>
                            <td className="p-2 text-center font-bold text-slate-600">{it.itemNumber}</td>
                            <td className="p-2 font-sans font-medium text-slate-800">
                              <div>{it.description}</div>
                              {it.code && <div className="text-[10px] text-slate-400 font-mono">{it.code}</div>}
                            </td>
                            <td className="p-2 text-center text-slate-500 font-sans">{it.unit}</td>
                            <td className="p-2 text-right">${it.unitPrice.toFixed(2)}</td>

                            {/* Input Editable de Cantidad */}
                            <td className="p-1.5 text-center bg-orange-50/50">
                              <input
                                type="number"
                                min={0}
                                step="any"
                                placeholder="0.00"
                                value={it.periodQuantity === 0 ? '' : it.periodQuantity}
                                onChange={(e) =>
                                  handleManualQuantityChange(
                                    originalIndex !== -1 ? originalIndex : idx,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-full text-center bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            </td>

                            {/* Monto Calculado */}
                            <td className="p-2 text-right font-black bg-orange-100/40 text-slate-900">
                              {it.periodAmount > 0
                                ? `$${it.periodAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`
                                : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Alerta de Error */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">No se pudo guardar la planilla:</div>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={
              (activeMode === 'excel' && !parsedPlanilla) ||
              (activeMode === 'manual' && activeManualItemsCount === 0) ||
              saving ||
              analyzing
            }
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 transition-all cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando Planilla...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {activeMode === 'excel'
                    ? 'Guardar Planilla desde Excel'
                    : `Guardar Planilla Manual (${activeManualItemsCount} Rubros)`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
