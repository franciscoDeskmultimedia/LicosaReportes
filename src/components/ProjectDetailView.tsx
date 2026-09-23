'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FolderGit2,
  PlusCircle,
  FilePlus,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Layers,
  History,
  FileCheck2,
  Calendar,
  Building2,
  ArrowLeft,
} from 'lucide-react';
import { AdjustRubroModal } from '@/components/AdjustRubroModal';
import { AddRubroModal } from '@/components/AddRubroModal';
import { BulkRubroImportModal } from '@/components/BulkRubroImportModal';

interface RubroAdjustment {
  id: string;
  type: string;
  quantityChange: number;
  newUnitPrice: number | null;
  reason: string;
  documentRef: string | null;
  date: Date | string;
  approvedBy: string;
}

interface ProjectRubro {
  id: string;
  rubroNumber: number;
  description: string;
  unit: string;
  unitPrice: number;
  initialQuantity: number;
  currentQuantity: number;
  isPrincipal: boolean;
  adjustments: RubroAdjustment[];
}

interface ProjectData {
  id: string;
  code: string;
  name: string;
  contractor: string;
  client: string;
  inspectionCompany: string;
  executingCompany: string;
  contractNumber: string;
  financingSource: string;
  roadSection: string;
  contractAmount: number;
  durationDays: number;
  startDate: Date | string;
  rubros: ProjectRubro[];
}

export function ProjectDetailView({ project }: { project: ProjectData }) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'principal' | 'non-principal'>('all');
  const [addRubroOpen, setAddRubroOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [selectedRubroForAdjust, setSelectedRubroForAdjust] = useState<ProjectRubro | null>(null);

  const filteredRubros = project.rubros.filter((r) => {
    const matchesSearch =
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      r.rubroNumber.toString().includes(search);
    if (filterType === 'principal') return matchesSearch && r.isPrincipal;
    if (filterType === 'non-principal') return matchesSearch && !r.isPrincipal;
    return matchesSearch;
  });

  const totalContractBudget = project.rubros.reduce(
    (acc, r) => acc + r.currentQuantity * r.unitPrice,
    0
  );

  const allAdjustments = project.rubros.flatMap((r) =>
    r.adjustments.map((a) => ({
      ...a,
      rubroNumber: r.rubroNumber,
      rubroDescription: r.description,
      unit: r.unit,
    }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/proyectos"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Catálogo de Proyectos</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/bodega?projectId=${project.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-300"
          >
            <span>Bodega de esta Obra</span>
          </Link>
          <Link
            href={`/reportes?projectId=${project.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-300"
          >
            <span>Reportes Diarios de esta Obra</span>
          </Link>
          <Link
            href={`/reportes/nuevo?projectId=${project.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Emitir Reporte</span>
          </Link>
          <button
            onClick={() => setAddRubroOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Crear Rubro</span>
          </button>
          <button
            onClick={() => setBulkImportOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <FilePlus className="w-4 h-4" />
            <span>📋 Importar Rubros Masivo</span>
          </button>
        </div>
      </div>

      {/* Contract Executive Profile Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-orange-50 text-orange-700 rounded border border-orange-200">
                {project.code}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Contrato: {project.contractNumber}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
              {project.name}
            </h1>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 block font-medium">Monto Contractual Total</span>
            <span className="text-2xl font-black text-slate-900">
              ${project.contractAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-600">
          <div>
            <span className="text-slate-400 block font-medium">Contratista</span>
            <span className="font-semibold text-slate-800">{project.contractor}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Contratante</span>
            <span className="font-semibold text-slate-800">{project.client}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Fiscalización</span>
            <span className="font-semibold text-slate-800">{project.inspectionCompany}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Financiamiento</span>
            <span className="font-semibold text-blue-700">{project.financingSource}</span>
          </div>
        </div>
      </div>

      {/* Rubros Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Controls Bar */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-orange-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Catálogo de Rubros Contractuales
              </h2>
              <p className="text-xs text-slate-500">
                Control de cantidades iniciales y ampliaciones por contrato complementario
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar rubro por número o nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-md transition-all ${
                  filterType === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({project.rubros.length})
              </button>
              <button
                onClick={() => setFilterType('principal')}
                className={`px-3 py-1 rounded-md transition-all ${
                  filterType === 'principal'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Principales
              </button>
              <button
                onClick={() => setFilterType('non-principal')}
                className={`px-3 py-1 rounded-md transition-all ${
                  filterType === 'non-principal'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                No Principales
              </button>
            </div>
          </div>
        </div>

        {/* Rubros Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4 w-16">N°</th>
                <th className="py-3 px-4">Descripción del Rubro</th>
                <th className="py-3 px-3 text-center">Unid.</th>
                <th className="py-3 px-3 text-right">P. Unitario ($)</th>
                <th className="py-3 px-3 text-right">Cant. Inicial</th>
                <th className="py-3 px-3 text-right">Cant. Vigente</th>
                <th className="py-3 px-3 text-right">Monto Vigente ($)</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRubros.map((rubro) => {
                const isIncreased = rubro.currentQuantity > rubro.initialQuantity;
                const totalItemBudget = rubro.currentQuantity * rubro.unitPrice;

                return (
                  <tr key={rubro.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-orange-600">
                      {rubro.rubroNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {rubro.description}
                          </span>
                          {rubro.isPrincipal ? (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold border border-blue-200">
                              Principal
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                              No Principal
                            </span>
                          )}
                        </div>
                        {rubro.adjustments.length > 0 && (
                          <p className="text-[10px] text-amber-700 font-medium">
                            • {rubro.adjustments.length} modificación(es) registrada(s)
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono text-slate-600">
                      {rubro.unit}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-800">
                      ${rubro.unitPrice.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-500">
                      {rubro.initialQuantity.toLocaleString('es-EC')}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono">
                      <span className={`font-bold ${isIncreased ? 'text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded' : 'text-slate-900'}`}>
                        {rubro.currentQuantity.toLocaleString('es-EC')}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                      ${totalItemBudget.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedRubroForAdjust(rubro)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 transition-colors shadow-xs"
                        title="Registrar Ampliación o Contrato Complementario"
                      >
                        <FilePlus className="w-3.5 h-3.5" />
                        <span>Ampliación</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modifications & Addendums Audit Trail */}
      {allAdjustments.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <History className="w-5 h-5 text-orange-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Historial de Modificaciones Contractuales y Adendas
              </h3>
              <p className="text-xs text-slate-500">
                Trazabilidad oficial de aumentos de cantidades y contratos complementarios
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {allAdjustments.map((adj) => (
              <div key={adj.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded text-[11px]">
                      Rubro {adj.rubroNumber}
                    </span>
                    <span className="font-semibold text-slate-800">{adj.rubroDescription}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {adj.type === 'COMPLEMENTARY_CONTRACT' ? 'Contrato Complementario' : 'Ajuste de Obra'}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] italic">
                    "{adj.reason}"
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Aprobado por: {adj.approvedBy} • Ref: {adj.documentRef || 'Sin documento registrado'}
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-mono font-bold text-emerald-700 text-sm block">
                    {adj.quantityChange > 0 ? '+' : ''}{adj.quantityChange.toLocaleString('es-EC')} {adj.unit}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(adj.date).toLocaleDateString('es-EC')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedRubroForAdjust && (
        <AdjustRubroModal
          rubroId={selectedRubroForAdjust.id}
          rubroNumber={selectedRubroForAdjust.rubroNumber}
          description={selectedRubroForAdjust.description}
          currentQuantity={selectedRubroForAdjust.currentQuantity}
          unit={selectedRubroForAdjust.unit}
          unitPrice={selectedRubroForAdjust.unitPrice}
          isOpen={true}
          onClose={() => setSelectedRubroForAdjust(null)}
        />
      )}

      <AddRubroModal
        projectId={project.id}
        isOpen={addRubroOpen}
        onClose={() => setAddRubroOpen(false)}
      />

      <BulkRubroImportModal
        projectId={project.id}
        projectCode={project.code}
        isOpen={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
      />
    </div>
  );
}
