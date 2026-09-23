'use client';

import React, { useState } from 'react';
import { addBulkProjectRubros } from '@/lib/actions/projects';
import { Upload, X, AlertCircle, CheckCircle2, FileSpreadsheet, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BulkRubroImportModalProps {
  projectId: string;
  projectCode: string;
  isOpen: boolean;
  onClose: () => void;
}

interface RubroRow {
  rubroNumber: string;
  description: string;
  unit: string;
  unitPrice: string;
  initialQuantity: string;
  isPrincipal: boolean;
}

const emptyRow: RubroRow = {
  rubroNumber: '',
  description: '',
  unit: 'm3',
  unitPrice: '',
  initialQuantity: '',
  isPrincipal: true,
};

export function BulkRubroImportModal({ projectId, projectCode, isOpen, onClose }: BulkRubroImportModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'table' | 'paste'>('table');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Table mode: manual rows
  const [rows, setRows] = useState<RubroRow[]>([
    { ...emptyRow },
    { ...emptyRow },
    { ...emptyRow },
  ]);

  // Paste mode
  const [pasteText, setPasteText] = useState('');

  if (!isOpen) return null;

  function addRow() {
    setRows((prev) => [...prev, { ...emptyRow }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRow(index: number, field: keyof RubroRow, value: string | boolean) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function parsePasteText(): RubroRow[] {
    const lines = pasteText.trim().split('\n').filter((line) => line.trim());
    const parsed: RubroRow[] = [];

    for (const line of lines) {
      // Accept tab-separated or semicolon-separated: N°;Descripción;Unidad;Cantidad;PrecioUnitario
      const parts = line.includes('\t')
        ? line.split('\t').map((s) => s.trim())
        : line.split(';').map((s) => s.trim());

      if (parts.length >= 4) {
        parsed.push({
          rubroNumber: parts[0],
          description: parts[1],
          unit: parts[2],
          initialQuantity: parts[3].replace(/,/g, '.'),
          unitPrice: parts[4]?.replace(/,/g, '.') || '0',
          isPrincipal: true,
        });
      }
    }
    return parsed;
  }

  async function handleSubmit() {
    setError(null);
    setSuccess(null);

    const sourceRows = mode === 'table' ? rows : parsePasteText();
    const validRows = sourceRows.filter(
      (r) => r.rubroNumber && r.description && r.unit && r.initialQuantity
    );

    if (validRows.length === 0) {
      setError('No se encontraron rubros válidos para importar. Cada rubro necesita al menos: N°, Descripción, Unidad y Cantidad.');
      return;
    }

    const rubros = validRows.map((r) => ({
      rubroNumber: parseInt(r.rubroNumber),
      description: r.description,
      unit: r.unit,
      unitPrice: parseFloat(r.unitPrice) || 0,
      initialQuantity: parseFloat(r.initialQuantity) || 0,
      isPrincipal: r.isPrincipal,
    }));

    // Validate all parsed correctly
    const invalid = rubros.filter((r) => isNaN(r.rubroNumber) || isNaN(r.initialQuantity));
    if (invalid.length > 0) {
      setError(`${invalid.length} fila(s) tienen datos numéricos inválidos. Revise N° de Rubro y Cantidad.`);
      return;
    }

    try {
      setLoading(true);
      const result = await addBulkProjectRubros({ projectId, rubros });
      setSuccess(`✅ ${result.created} rubro(s) importados exitosamente${result.skipped > 0 ? ` (${result.skipped} ya existían y fueron omitidos)` : ''}`);
      router.refresh();

      // Auto-close after 2s
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al importar rubros');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 flex-shrink-0">
          <div>
            <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider">
              Importación Masiva — [{projectCode}]
            </span>
            <h3 className="text-lg font-black text-slate-900">
              Importar Rubros Contractuales
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Agregue los rubros del contrato al proyecto. Los rubros con número duplicado serán omitidos.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-slate-200 flex-shrink-0">
          <button
            onClick={() => setMode('table')}
            className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'table'
                ? 'text-orange-700 bg-orange-50 border-b-2 border-orange-600'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Ingreso Manual (Tabla)
          </button>
          <button
            onClick={() => setMode('paste')}
            className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'paste'
                ? 'text-orange-700 bg-orange-50 border-b-2 border-orange-600'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Pegar desde Excel / CSV
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {mode === 'table' && (
            <div className="space-y-2">
              {/* Header Row */}
              <div className="grid grid-cols-[60px_1fr_80px_100px_100px_80px_40px] gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
                <span>N° Rubro</span>
                <span>Descripción</span>
                <span>Unidad</span>
                <span>Cantidad</span>
                <span>P. Unitario $</span>
                <span>Tipo</span>
                <span></span>
              </div>

              {rows.map((row, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[60px_1fr_80px_100px_100px_80px_40px] gap-2 items-center"
                >
                  <input
                    type="number"
                    placeholder="N°"
                    value={row.rubroNumber}
                    onChange={(e) => updateRow(index, 'rubroNumber', e.target.value)}
                    className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Descripción del rubro..."
                    value={row.description}
                    onChange={(e) => updateRow(index, 'description', e.target.value)}
                    className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="m3"
                    value={row.unit}
                    onChange={(e) => updateRow(index, 'unit', e.target.value)}
                    className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={row.initialQuantity}
                    onChange={(e) => updateRow(index, 'initialQuantity', e.target.value)}
                    className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={row.unitPrice}
                    onChange={(e) => updateRow(index, 'unitPrice', e.target.value)}
                    className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                  <select
                    value={row.isPrincipal ? 'P' : 'NP'}
                    onChange={(e) => updateRow(index, 'isPrincipal', e.target.value === 'P')}
                    className="px-1 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="P">Principal</option>
                    <option value="NP">No Princ.</option>
                  </select>
                  <button
                    onClick={() => removeRow(index)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                    title="Eliminar fila"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <button
                onClick={addRow}
                className="flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-800 font-semibold py-2 px-3 rounded-lg hover:bg-orange-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar otra fila
              </button>
            </div>
          )}

          {mode === 'paste' && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <p className="font-bold mb-1">📋 Formato esperado (separado por tabuladores o punto y coma):</p>
                <code className="block bg-white/60 rounded p-2 font-mono text-[10px] text-slate-700 whitespace-pre">
{`N°;Descripción;Unidad;Cantidad;PrecioUnitario
3;DESBROCE, DESRAIGUE Y LIMPIEZA;ha;3.38;2156.92
8;MATERIAL DE PRESTAMO IMPORTADO;m3;110000;5.09
9;TRANSPORTE MATERIAL PRESTAMO 30-65 KM;m3-km;5225000;0.25`}
                </code>
                <p className="mt-1.5 text-[10px]">
                  💡 Puede copiar directamente desde Excel, Google Sheets, o un archivo CSV.
                </p>
              </div>
              <textarea
                rows={14}
                placeholder="Pegue aquí los rubros copiados desde Excel o CSV..."
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none"
              />
              {pasteText.trim() && (
                <div className="text-xs text-slate-500">
                  📊 Se detectaron <span className="font-bold text-slate-800">{parsePasteText().length}</span> rubros válidos para importar
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500">
            {mode === 'table'
              ? `${rows.filter((r) => r.rubroNumber && r.description).length} rubro(s) listos`
              : `${parsePasteText().length} rubro(s) detectados`}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-xs"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !!success}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              {loading ? 'Importando...' : 'Importar Rubros'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
