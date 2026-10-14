'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  Plus,
  Upload,
  Search,
  Filter,
  FileSpreadsheet,
  Receipt,
  PieChart,
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Download,
} from 'lucide-react';
import { exportExpensesToPdf } from '@/lib/exportExpensesPdf';
import { ImportExpensesModal } from '@/components/ImportExpensesModal';
import { ExpenseFormModal } from '@/components/ExpenseFormModal';
import { deleteSingleExpense, ExpenseItemData } from '@/lib/actions/expenses';

interface ProjectExpensesTabProps {
  projectId: string;
  projectCode: string;
  projectName: string;
  contractAmount: number;
  totalExecutedAccum: number; // Monto acumulado de avance planillado
  expenses: any[];
}

export function ProjectExpensesTab({
  projectId,
  projectCode,
  projectName,
  contractAmount,
  totalExecutedAccum,
  expenses = [],
}: ProjectExpensesTabProps) {
  const router = useRouter();

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItemData | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDocType, setSelectedDocType] = useState<string>('ALL');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const isFilterActive = searchTerm.trim() !== '' || selectedCategory !== 'ALL' || selectedDocType !== 'ALL';

  // Aggregates
  const totalCost = useMemo(() => expenses.reduce((acc, e) => acc + (e.total || 0), 0), [expenses]);
  const subtotalCost = useMemo(() => expenses.reduce((acc, e) => acc + ((e.subtotalIva || 0) + (e.subtotalZero || 0)), 0), [expenses]);
  const totalIva = useMemo(() => expenses.reduce((acc, e) => acc + (e.iva || 0), 0), [expenses]);
  const totalRetentions = useMemo(() => expenses.reduce((acc, e) => acc + (e.retentions || 0), 0), [expenses]);
  const totalBalance = useMemo(() => expenses.reduce((acc, e) => acc + (e.balance || 0), 0), [expenses]);

  // Rentabilidad
  const grossProfit = totalExecutedAccum - totalCost;
  const marginPercent = totalExecutedAccum > 0 ? (grossProfit / totalExecutedAccum) * 100 : 0;

  // Breakdown by Category
  const categoriesMap = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => {
      const cat = e.category || 'Otros Gastos de Obra';
      map.set(cat, (map.get(cat) || 0) + (e.total || 0));
    });
    return Array.from(map.entries())
      .map(([name, sum]) => ({ name, sum, pct: totalCost > 0 ? (sum / totalCost) * 100 : 0 }))
      .sort((a, b) => b.sum - a.sum);
  }, [expenses, totalCost]);

  // Unique document types
  const docTypes = useMemo(() => {
    const types = new Set<string>();
    expenses.forEach((e) => {
      if (e.documentType) types.add(e.documentType);
    });
    return Array.from(types).sort();
  }, [expenses]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (selectedCategory !== 'ALL' && (e.category || 'Otros Gastos de Obra') !== selectedCategory) {
        return false;
      }
      if (selectedDocType !== 'ALL' && e.documentType !== selectedDocType) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const sSupplier = (e.supplier || '').toLowerCase();
        const sDoc = (e.documentNumber || '').toLowerCase();
        const sDesc = (e.description || '').toLowerCase();
        const sDate = (e.date ? (typeof e.date === 'string' ? e.date : e.date.toISOString().split('T')[0]) : '').toLowerCase();
        if (!sSupplier.includes(term) && !sDoc.includes(term) && !sDesc.includes(term) && !sDate.includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [expenses, searchTerm, selectedCategory, selectedDocType]);

  async function handleDelete(id: string) {
    if (!confirm('¿Está seguro de eliminar este comprobante de gasto?')) return;
    setDeletingId(id);
    try {
      await deleteSingleExpense(id, projectId);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar el comprobante.');
    } finally {
      setDeletingId(null);
    }
  }

  function handleDownloadPdf() {
    if (filteredExpenses.length === 0) return;
    setIsGeneratingPdf(true);
    try {
      exportExpensesToPdf({
        projectName,
        projectCode,
        contractAmount,
        expenses: filteredExpenses,
        filters: {
          searchTerm,
          selectedCategory,
          selectedDocType,
          totalUnfiltered: expenses.length,
        },
      });
    } catch (err) {
      console.error('Error al generar el PDF de costos:', err);
      alert('Ocurrió un error al generar el PDF de costos.');
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* 1. FILA DE MÉTRICAS EJECUTIVAS DE COSTOS Y RENTABILIDAD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Costos */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Costos / Gastos
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
            ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">{expenses.length}</span> comprobantes registrados
          </div>
        </div>

        {/* Base Imponible & IVA */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Subtotal Imponible & IVA
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
            ${subtotalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-indigo-700 font-bold mt-1">
            + ${totalIva.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} de IVA Pagado
          </div>
        </div>

        {/* Retenciones y Saldo Pendiente */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Retenciones & Saldo
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-900 font-mono">
            ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-amber-700 font-semibold mt-1">
            Retenciones retenidas: ${totalRetentions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Comparativa Avance vs Costo (Margen Bruto) */}
        <div className={`border rounded-2xl p-4.5 shadow-xs ${
          grossProfit >= 0 ? 'bg-gradient-to-br from-white to-emerald-50/40 border-emerald-200' : 'bg-gradient-to-br from-white to-rose-50/40 border-rose-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Margen Bruto de Obra
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              grossProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {grossProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-extrabold font-mono ${
            grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
          }`}>
            {grossProfit >= 0 ? '+' : ''}${grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Avance Planillado: <strong className="font-mono text-slate-700">${totalExecutedAccum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
            <span className={`font-bold ${grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {marginPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* 2. TOP CATEGORÍAS DE COSTO */}
      {categoriesMap.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-emerald-600" />
            Distribución de Gastos por Categoría
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {categoriesMap.slice(0, 6).map((cat) => (
              <div
                key={cat.name}
                onClick={() => setSelectedCategory(selectedCategory === cat.name ? 'ALL' : cat.name)}
                className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  selectedCategory === cat.name
                    ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <p className="font-bold text-[11px] text-slate-800 truncate" title={cat.name}>
                  {cat.name}
                </p>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    ${cat.sum.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {cat.pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. BARRA DE ACCIONES Y FILTROS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Registro de Comprobantes y Facturas
              </h3>
              <p className="text-xs text-slate-500">
                {filteredExpenses.length} de {expenses.length} comprobantes mostrados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {expenses.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf || filteredExpenses.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  filteredExpenses.length === 0
                    ? 'No hay comprobantes con los filtros seleccionados'
                    : isFilterActive
                    ? `Descargar PDF de ${filteredExpenses.length} comprobantes filtrados`
                    : `Descargar PDF de todos los comprobantes (${expenses.length})`
                }
              >
                <Download className="w-3.5 h-3.5 text-rose-600" />
                <span>{isGeneratingPdf ? 'Generando PDF...' : 'Descargar PDF'}</span>
                {isFilterActive && filteredExpenses.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-[10px] font-mono font-bold">
                    {filteredExpenses.length}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cargar Gastos desde Excel</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingExpense(null);
                setIsFormModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Gasto Individual</span>
            </button>
          </div>
        </div>

        {/* Filtros de búsqueda */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por proveedor, factura o detalle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none bg-white text-slate-700"
            >
              <option value="ALL">Todas las Categorías ({categoriesMap.length})</option>
              {categoriesMap.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} (${c.sum.toLocaleString('en-US', { maximumFractionDigits: 0 })})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none bg-white text-slate-700"
            >
              <option value="ALL">Todos los Tipos de Documento ({docTypes.length})</option>
              {docTypes.map((dt) => (
                <option key={dt} value={dt}>
                  {dt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Indicador de Filtros Activos con botón de reinicio rápido */}
        {isFilterActive && (
          <div className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2 text-slate-600">
              <Filter className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Filtros activos:{' '}
                <strong className="text-slate-900">{filteredExpenses.length}</strong> de {expenses.length} comprobantes encontrados
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('ALL');
                setSelectedDocType('ALL');
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* 4. TABLA DE COMPROBANTES DE GASTOS */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Receipt className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-800">
              {expenses.length === 0
                ? 'No hay costos registrados en esta obra'
                : 'No se encontraron gastos con los filtros aplicados'}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {expenses.length === 0
                ? 'Cargue la planilla oficial de comprobantes en Excel o registre gastos individuales para iniciar el control de costos de la obra.'
                : 'Intente cambiando los términos de búsqueda o limpiando los filtros seleccionados.'}
            </p>
          </div>
          {expenses.length === 0 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Importar desde Excel</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingExpense(null);
                  setIsFormModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Registrar Gasto Individual</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-[10px] text-slate-600 font-bold uppercase sticky top-0 border-b border-slate-200 z-10">
                <tr>
                  <th className="p-3 w-24">Fecha</th>
                  <th className="p-3 w-28">Tipo Doc.</th>
                  <th className="p-3 w-36"># Documento</th>
                  <th className="p-3">Proveedor / Beneficiario</th>
                  <th className="p-3 w-36">Categoría</th>
                  <th className="p-3 w-24 text-right">Subtotal ($)</th>
                  <th className="p-3 w-20 text-right">IVA ($)</th>
                  <th className="p-3 w-28 text-right">Total ($)</th>
                  <th className="p-3 w-24 text-right">Retención ($)</th>
                  <th className="p-3 w-28 text-right">Saldo ($)</th>
                  <th className="p-3 w-16 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredExpenses.map((e) => {
                  const dateStr = typeof e.date === 'string' ? e.date : e.date?.toISOString ? e.date.toISOString().split('T')[0] : '';
                  const isDeleting = deletingId === e.id;

                  return (
                    <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-slate-600 font-sans whitespace-nowrap">{dateStr}</td>
                      <td className="p-3 font-sans text-slate-700 whitespace-nowrap">{e.documentType}</td>
                      <td className="p-3 text-slate-800 font-bold font-mono whitespace-nowrap">{e.documentNumber}</td>
                      <td className="p-3 font-sans">
                        <div className="font-semibold text-slate-900">{e.supplier}</div>
                        {e.description && (
                          <div className="text-[10px] text-slate-500 font-normal truncate max-w-xs" title={e.description}>
                            {e.description}
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-sans whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                          {e.category || 'Otros'}
                        </span>
                      </td>
                      <td className="p-3 text-right text-slate-600">
                        ${((e.subtotalIva || 0) + (e.subtotalZero || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right text-slate-500">
                        ${(e.iva || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-extrabold text-slate-900">
                        ${(e.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right text-amber-700">
                        ${(e.retentions || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-800">
                        ${(e.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingExpense({
                                ...e,
                                date: dateStr,
                              });
                              setIsFormModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                            title="Editar gasto"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleDelete(e.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Eliminar gasto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALES */}
      <ImportExpensesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        projectId={projectId}
        projectCode={projectCode}
        projectName={projectName}
        onSuccess={() => router.refresh()}
      />

      <ExpenseFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingExpense(null);
        }}
        projectId={projectId}
        projectCode={projectCode}
        initialData={editingExpense}
        onSuccess={() => router.refresh()}
      />

    </div>
  );
}
