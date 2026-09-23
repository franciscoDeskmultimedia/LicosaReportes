'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Users,
  UserPlus,
  UserCheck,
  Briefcase,
  Trash2,
  Phone,
  Mail,
  HardHat,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { AdjustRubroModal } from '@/components/AdjustRubroModal';
import { AddRubroModal } from '@/components/AddRubroModal';
import { BulkRubroImportModal } from '@/components/BulkRubroImportModal';
import { AssignWorkerToProjectModal } from '@/components/AssignWorkerToProjectModal';
import { AssignContractorToProjectModal } from '@/components/AssignContractorToProjectModal';
import { removeWorkerFromProject } from '@/lib/actions/workers';
import { removeContractorFromProject } from '@/lib/actions/contractors';

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

interface WorkerAssignment {
  id: string;
  assignedRole: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  status: string;
  notes?: string | null;
  worker: {
    id: string;
    identification: string;
    name: string;
    roleCategory: string;
    phone?: string | null;
    email?: string | null;
    active: boolean;
  };
}

interface ProjectContractor {
  id: string;
  assignedAt: Date | string;
  contractAmount?: number | null;
  notes?: string | null;
  roleInProject: string;
  contractor: {
    id: string;
    name: string;
    ruc: string;
    specialty: string;
    contactPerson?: string | null;
    phone?: string | null;
    email?: string | null;
  };
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
  workerAssignments?: WorkerAssignment[];
  contractors?: ProjectContractor[];
}

export function ProjectDetailView({
  project,
  allWorkers = [],
  allContractors = [],
  currentUser,
}: {
  project: ProjectData;
  allWorkers?: any[];
  allContractors?: any[];
  currentUser?: any;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'rubros' | 'personal' | 'contratistas' | 'modificaciones'>('rubros');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'principal' | 'non-principal'>('all');

  // Modals
  const [addRubroOpen, setAddRubroOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [selectedRubroForAdjust, setSelectedRubroForAdjust] = useState<ProjectRubro | null>(null);
  const [assignWorkerOpen, setAssignWorkerOpen] = useState(false);
  const [assignContractorOpen, setAssignContractorOpen] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const allAdjustments = project.rubros
    .flatMap((r) =>
      r.adjustments.map((a) => ({
        ...a,
        rubroNumber: r.rubroNumber,
        rubroDescription: r.description,
        unit: r.unit,
      }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const activeWorkers = project.workerAssignments || [];
  const activeContractors = project.contractors || [];

  async function handleRemoveWorker(assignmentId: string, workerName: string) {
    if (!confirm(`¿Confirmas que deseas desvincular a ${workerName} de esta obra?`)) return;
    try {
      setDeletingId(assignmentId);
      await removeWorkerFromProject(assignmentId);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al desvincular personal');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRemoveContractor(assignmentId: string, contractorName: string) {
    if (!confirm(`¿Confirmas que deseas desvincular al contratista "${contractorName}" de esta obra?`)) return;
    try {
      setDeletingId(assignmentId);
      await removeContractorFromProject(assignmentId, project.id);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al desvincular contratista');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Top Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
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
            <span>Bodega</span>
          </Link>
          <Link
            href={`/reportes?projectId=${project.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-300"
          >
            <span>Reportes Diarios</span>
          </Link>
          <Link
            href={`/reportes/nuevo?projectId=${project.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Emitir Reporte</span>
          </Link>

          {/* Quick Action: Assign Staff */}
          <button
            onClick={() => setAssignWorkerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Asignar Personal</span>
          </button>

          {/* Quick Action: Assign Contractor */}
          <button
            onClick={() => setAssignContractorOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <Briefcase className="w-4 h-4" />
            <span>+ Contratista</span>
          </button>

          {/* Add Rubro */}
          <button
            onClick={() => setAddRubroOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Asignar Rubro</span>
          </button>

          <button
            onClick={() => setBulkImportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-all"
          >
            <FilePlus className="w-4 h-4 text-slate-500" />
            <span>Importar Masivo</span>
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
            <span className="text-slate-400 block font-medium">Contratista Principal</span>
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

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('rubros')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'rubros'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Rubros Contractuales ({project.rubros.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('personal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'personal'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Personal & Cuadrillas ({activeWorkers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('contratistas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'contratistas'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Contratistas & Subcontratos ({activeContractors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('modificaciones')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'modificaciones'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Modificaciones ({allAdjustments.length})</span>
        </button>
      </div>

      {/* TAB 1: RUBROS */}
      {activeTab === 'rubros' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-orange-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Catálogo de Rubros Contractuales
                </h2>
                <p className="text-xs text-slate-500">
                  Cantidades vigentes, precios unitarios y control de ampliaciones
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
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

              <button
                onClick={() => setAddRubroOpen(true)}
                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Agregar Rubro</span>
              </button>
            </div>
          </div>

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
                        <span
                          className={`font-bold ${
                            isIncreased
                              ? 'text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded'
                              : 'text-slate-900'
                          }`}
                        >
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
      )}

      {/* TAB 2: PERSONAL & CUADRILLAS */}
      {activeTab === 'personal' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Personal Asignado a esta Obra
                </h2>
                <p className="text-xs text-slate-500">
                  Cuadrillas de trabajo, operadores de maquinaria y personal técnico asignados activamente
                </p>
              </div>
            </div>

            <button
              onClick={() => setAssignWorkerOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Asignar Personal a esta Obra</span>
            </button>
          </div>

          {activeWorkers.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                <HardHat className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-bold text-slate-900 text-sm">
                  No hay personal asignado a esta obra todavía
                </h3>
                <p className="text-xs text-slate-500">
                  Vincule técnicos, maestros, choferes y operadores del padrón general a este proyecto para llevar el control de mano de obra.
                </p>
              </div>
              <button
                onClick={() => setAssignWorkerOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
              >
                <UserPlus className="w-4 h-4" />
                <span>Asignar el Primer Trabajador</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">Trabajador</th>
                    <th className="py-3 px-4">Oficio / Categoría</th>
                    <th className="py-3 px-4">Cargo en esta Obra</th>
                    <th className="py-3 px-4">Contacto</th>
                    <th className="py-3 px-4">Fecha de Asignación</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeWorkers.map((asg) => (
                    <tr key={asg.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-bold text-slate-900 block text-xs">
                            {asg.worker.name}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            CI: {asg.worker.identification}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {asg.worker.roleCategory}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-emerald-800">
                          {asg.assignedRole}
                        </span>
                        {asg.notes && (
                          <p className="text-[10px] text-slate-400 italic mt-0.5">
                            {asg.notes}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {asg.worker.phone ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {asg.worker.phone}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Sin teléfono</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {new Date(asg.startDate).toLocaleDateString('es-EC')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ACTIVO EN OBRA
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleRemoveWorker(asg.id, asg.worker.name)}
                          disabled={deletingId === asg.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold border border-rose-200 transition-colors disabled:opacity-50"
                          title="Desvincular de esta obra"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Desvincular</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CONTRATISTAS */}
      {activeTab === 'contratistas' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Contratistas & Subcontratistas Vinculados
                </h2>
                <p className="text-xs text-slate-500">
                  Empresas ejecutoras, subcontratos de maquinaria, estructuras o asfalto en este proyecto
                </p>
              </div>
            </div>

            <button
              onClick={() => setAssignContractorOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
            >
              <Briefcase className="w-4 h-4" />
              <span>+ Asignar Contratista</span>
            </button>
          </div>

          {activeContractors.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
                <Briefcase className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-bold text-slate-900 text-sm">
                  No hay subcontratistas vinculados a esta obra
                </h3>
                <p className="text-xs text-slate-500">
                  Vincule empresas contratistas para registrar el alcance de sus trabajos y montos subcontratados.
                </p>
              </div>
              <button
                onClick={() => setAssignContractorOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20"
              >
                <Briefcase className="w-4 h-4" />
                <span>Asignar Contratista</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">Razón Social / Consorcio</th>
                    <th className="py-3 px-4">Especialidad</th>
                    <th className="py-3 px-4">Monto Subcontratado</th>
                    <th className="py-3 px-4">Alcance / Tramo</th>
                    <th className="py-3 px-4">Contacto</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeContractors.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-bold text-slate-900 block text-xs">
                            {c.contractor.name}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            RUC: {c.contractor.ruc}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {c.contractor.specialty}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {c.contractAmount
                          ? `$${c.contractAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`
                          : 'No especificado'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {c.notes || c.roleInProject || 'Sin detalle'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                        {c.contractor.contactPerson && (
                          <div className="font-medium text-slate-800">
                            {c.contractor.contactPerson}
                          </div>
                        )}
                        {c.contractor.phone && (
                          <div className="font-mono text-[10px] text-slate-500">
                            {c.contractor.phone}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleRemoveContractor(c.id, c.contractor.name)}
                          disabled={deletingId === c.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold border border-rose-200 transition-colors disabled:opacity-50"
                          title="Desvincular contratista"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Desvincular</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MODIFICACIONES */}
      {activeTab === 'modificaciones' && (
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

          {allAdjustments.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 italic">
              No se han registrado modificaciones ni adendas en este contrato.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {allAdjustments.map((adj) => (
                <div
                  key={adj.id}
                  className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded text-[11px]">
                        Rubro {adj.rubroNumber}
                      </span>
                      <span className="font-semibold text-slate-800">{adj.rubroDescription}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {adj.type === 'COMPLEMENTARY_CONTRACT'
                          ? 'Contrato Complementario'
                          : 'Ajuste de Obra'}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] italic">"{adj.reason}"</p>
                    <p className="text-[10px] text-slate-400">
                      Aprobado por: {adj.approvedBy} • Ref: {adj.documentRef || 'Sin documento registrado'}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-700 text-sm block">
                      {adj.quantityChange > 0 ? '+' : ''}
                      {adj.quantityChange.toLocaleString('es-EC')} {adj.unit}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(adj.date).toLocaleDateString('es-EC')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
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

      <AssignWorkerToProjectModal
        projectId={project.id}
        projectName={project.name}
        projectCode={project.code}
        allWorkers={allWorkers}
        isOpen={assignWorkerOpen}
        onClose={() => setAssignWorkerOpen(false)}
      />

      <AssignContractorToProjectModal
        projectId={project.id}
        projectName={project.name}
        projectCode={project.code}
        allContractors={allContractors}
        isOpen={assignContractorOpen}
        onClose={() => setAssignContractorOpen(false)}
      />
    </div>
  );
}
