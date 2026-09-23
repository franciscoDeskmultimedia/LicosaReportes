'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Package,
  PlusCircle,
  ArrowRightLeft,
  FileText,
  Clock,
  Search,
  Building2,
  AlertCircle,
  CheckCircle2,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { RegisterReceiptModal } from '@/components/RegisterReceiptModal';
import { RegisterDispatchModal } from '@/components/RegisterDispatchModal';
import { CreateMaterialModal } from '@/components/CreateMaterialModal';
import { CurrentUser, getUserRoleInProject } from '@/lib/authTypes';

interface ProjectOption {


  id: string;
  code: string;
  name: string;
  roadSection?: string;
}

interface Movement {
  id: string;
  type: string;
  quantity: number;
  unitCost: number | null;
  targetWorkFront: string | null;
  departureDateTime: Date | string | null;
  dispatchedTo: string | null;
  authorizedBy: string | null;
  notes: string | null;
  timestamp: Date | string;
  projectId?: string | null;
  project?: {
    id: string;
    code: string;
    name: string;
  } | null;
  material: {
    id: string;
    code: string;
    name: string;
    unit: string;
  };
  receipt?: {
    receiptNumber: string;
    supplier: string;
    entryDateTime: Date | string;
  } | null;
}

interface Receipt {
  id: string;
  receiptNumber: string;
  supplier: string;
  entryDateTime: Date | string;
  receivedBy: string;
  invoiceTotal: number | null;
  notes: string | null;
  projectId?: string | null;
  project?: {
    id: string;
    code: string;
    name: string;
  } | null;
  movements: Array<{
    id: string;
    quantity: number;
    unitCost: number | null;
    material: {
      name: string;
      unit: string;
      code: string;
    };
  }>;
}

interface Material {
  id: string;
  projectId?: string | null;
  project?: {
    id: string;
    code: string;
    name: string;
  } | null;
  code: string;
  name: string;
  category: string;
  unit: string;
  minStock: number;
  currentStock: number;
  location: string | null;
}

export function StorageView({
  materials,
  receipts,
  movements,
  projects,
  selectedProjectId,
  currentUser,
}: {
  materials: Material[];
  receipts: Receipt[];
  movements: Movement[];
  projects: ProjectOption[];
  selectedProjectId?: string;
  currentUser?: CurrentUser | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'inventory' | 'receipts' | 'kardex'>('inventory');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);

  // Active project selection
  const activeProjectId = selectedProjectId || (projects.length > 0 ? projects[0].id : '');
  const currentProject = projects.find((p) => p.id === activeProjectId);

  const roleInActiveProject = getUserRoleInProject(currentUser, activeProjectId);
  const isBodegueroInActiveProject = roleInActiveProject === 'BODEGUERO';

  function handleProjectChange(newId: string) {
    if (newId === 'ALL') {
      router.push('/bodega');
    } else {
      router.push(`/bodega?projectId=${newId}`);
    }
  }

  // Filter materials
  const categories = Array.from(new Set(materials.map((m) => m.category)));

  const filteredMaterials = materials.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.code.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'ALL' || m.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <Package className="w-4 h-4 text-orange-600" />
            <span>Almacén e Inventario de Insumos</span>
            {currentUser && (
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isBodegueroInActiveProject
                    ? 'bg-emerald-100 text-emerald-800'
                    : roleInActiveProject === 'ADMIN'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                Rol en esta obra:{' '}
                {isBodegueroInActiveProject
                  ? 'Encargado de Bodega'
                  : roleInActiveProject === 'ADMIN'
                  ? 'Administrador'
                  : 'Ing. Residente'}
              </span>
            )}
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900">
            Control de Bodega por Obra
          </h1>
          <p className="text-xs text-slate-500">
            Gestión de stock, comprobantes de compra con fecha/hora de entrada y despachos con fecha/hora de salida
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setReceiptModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Ingreso Compra (Entrada)</span>
          </button>
          <button
            onClick={() => setDispatchModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>- Despacho a Obra (Salida)</span>
          </button>
          {!isBodegueroInActiveProject && (
            <button
              onClick={() => setMaterialModalOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all"
            >
              <span>+ Nuevo Ítem</span>
            </button>
          )}
        </div>
      </div>

      {/* Obra Selector Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-700 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider block">
              Bodega Asignada a la Obra:
            </span>
            <h2 className="text-sm sm:text-base font-bold text-white line-clamp-1">
              {currentProject ? currentProject.name : 'Todas las Obras Viales'}
            </h2>
          </div>
        </div>

        {/* Obra Dropdown Switcher */}
        {projects.length > 1 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300 font-medium whitespace-nowrap hidden sm:inline">
              Cambiar Obra:
            </span>
            <select
              value={activeProjectId || 'ALL'}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-600 text-white text-xs font-semibold rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              {currentUser?.role === 'ADMIN' && <option value="ALL">Todas las Bodegas (Consolidado)</option>}
              {projects.map((p) => (

                <option key={p.id} value={p.id}>
                  [{p.code}] {p.name}
                </option>
              ))}
            </select>
          </div>
        ) : currentProject ? (
          <div className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300">
            Obra Asignada: <strong className="text-white">[{currentProject.code}]</strong>
          </div>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setTab('inventory')}
          className={`py-3 px-5 border-b-2 flex items-center gap-2 transition-all ${
            tab === 'inventory'
              ? 'border-orange-600 text-orange-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Stock Visible de Bodega ({filteredMaterials.length})</span>
        </button>
        <button
          onClick={() => setTab('receipts')}
          className={`py-3 px-5 border-b-2 flex items-center gap-2 transition-all ${
            tab === 'receipts'
              ? 'border-orange-600 text-orange-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Comprobantes de Compra ({receipts.length})</span>
        </button>
        <button
          onClick={() => setTab('kardex')}
          className={`py-3 px-5 border-b-2 flex items-center gap-2 transition-all ${
            tab === 'kardex'
              ? 'border-orange-600 text-orange-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Kardex / Historial de Entradas y Salidas ({movements.length})</span>
        </button>
      </div>

      {/* TAB 1: Visible Inventory */}
      {tab === 'inventory' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por código o nombre de material..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Categoría:
              </span>
              <button
                onClick={() => setCategoryFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  categoryFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todas
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    categoryFilter === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Material / Insumo</th>
                    <th className="py-3 px-3">Obra Asignada</th>
                    <th className="py-3 px-3">Categoría</th>
                    <th className="py-3 px-3 text-center">Unidad</th>
                    <th className="py-3 px-4 text-right">Stock Actual</th>
                    <th className="py-3 px-3 text-right">Stock Mínimo</th>
                    <th className="py-3 px-4">Ubicación Bodega</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMaterials.map((mat) => {
                    const isLow = mat.currentStock <= mat.minStock;
                    return (
                      <tr key={mat.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                          {mat.code}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {mat.name}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-mono text-[10.5px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                            {mat.project?.code || 'General'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-slate-500">
                          {mat.category}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-600">
                          {mat.unit}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-sm font-bold text-slate-900">
                          {mat.currentStock.toLocaleString('es-EC')}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-400">
                          {mat.minStock.toLocaleString('es-EC')}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                          {mat.location || 'Bodega Central'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertCircle className="w-3 h-3" />
                              Bajo Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Disponible
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Purchase Receipts */}
      {tab === 'receipts' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Comprobantes de Compra e Ingresos de Materiales
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {receipts.length} comprobante(s) registrado(s)
            </span>
          </div>

          <div className="divide-y divide-slate-200">
            {receipts.map((rec) => (
              <div key={rec.id} className="p-5 hover:bg-slate-50/60 transition-colors space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-xs px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
                      {rec.receiptNumber}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">{rec.supplier}</span>
                    {rec.project && (
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                        Obra: {rec.project.code}
                      </span>
                    )}
                  </div>

                  <div className="text-right text-xs">
                    {rec.invoiceTotal && (
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        ${rec.invoiceTotal.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      <strong className="text-slate-700">Fecha/Hora Ingreso:</strong>{' '}
                      {new Date(rec.entryDateTime).toLocaleString('es-EC')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Recibido por:</span>{' '}
                    <strong className="text-slate-800">{rec.receivedBy}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Observación:</span>{' '}
                    <span className="text-slate-700 italic">{rec.notes || 'Sin novedad'}</span>
                  </div>
                </div>

                {/* Items in this receipt */}
                <div className="pt-1">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Ítems Ingresados a Bodega:
                  </h4>
                  <div className="space-y-1">
                    {rec.movements.map((mov) => (
                      <div
                        key={mov.id}
                        className="flex items-center justify-between text-xs py-1 px-2.5 rounded bg-white border border-slate-100"
                      >
                        <span className="font-medium text-slate-800">
                          [{mov.material.code}] {mov.material.name}
                        </span>
                        <div className="space-x-3 font-mono">
                          <span className="font-bold text-emerald-700">
                            +{mov.quantity} {mov.material.unit}
                          </span>
                          {mov.unitCost && (
                            <span className="text-slate-400 text-[11px]">
                              @ ${mov.unitCost.toFixed(2)}/{mov.material.unit}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Kardex */}
      {tab === 'kardex' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/60">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Kardex Detallado: Registro Cronológico de Entradas y Salidas
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Material</th>
                  <th className="py-3 px-3 text-right">Cantidad</th>
                  <th className="py-3 px-4">Fecha y Hora de Registro</th>
                  <th className="py-3 px-4">Obra / Destino</th>
                  <th className="py-3 px-4">Responsables</th>
                  <th className="py-3 px-4">Detalles / Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => {
                  const isEntry = m.type === 'ENTRY';
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        {isEntry ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ▲ Entrada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                            ▼ Salida
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{m.material.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{m.material.code}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-xs">
                        <span className={isEntry ? 'text-emerald-700' : 'text-orange-700'}>
                          {isEntry ? '+' : '-'}{m.quantity} {m.material.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {isEntry
                          ? m.receipt?.entryDateTime
                            ? new Date(m.receipt.entryDateTime).toLocaleString('es-EC')
                            : new Date(m.timestamp).toLocaleString('es-EC')
                          : m.departureDateTime
                            ? new Date(m.departureDateTime).toLocaleString('es-EC')
                            : new Date(m.timestamp).toLocaleString('es-EC')}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {isEntry ? (
                          <span>Bodega [{m.project?.code || 'General'}]</span>
                        ) : (
                          <div>
                            <span className="font-bold text-slate-900 block">{m.targetWorkFront || 'Obra'}</span>
                            <span className="text-[10px] text-slate-400">Obra: {m.project?.code || '-'}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {isEntry ? (
                          <span>Prov: {m.receipt?.supplier || 'Proveedor'}</span>
                        ) : (
                          <div>
                            <div>Retiró: <strong className="text-slate-800">{m.dispatchedTo}</strong></div>
                            <div className="text-[10px] text-slate-400">Autorizó: {m.authorizedBy}</div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] italic max-w-xs">
                        {m.notes || (m.receipt ? `Ref: ${m.receipt.receiptNumber}` : '-')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <RegisterReceiptModal
        materials={materials}
        projects={projects}
        defaultProjectId={activeProjectId}
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
      />

      <RegisterDispatchModal
        materials={materials}
        projects={projects}
        defaultProjectId={activeProjectId}
        isOpen={dispatchModalOpen}
        onClose={() => setDispatchModalOpen(false)}
      />

      <CreateMaterialModal
        projects={projects}
        defaultProjectId={activeProjectId}
        isOpen={materialModalOpen}
        onClose={() => setMaterialModalOpen(false)}
      />
    </div>
  );
}
