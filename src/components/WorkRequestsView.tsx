'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardList,
  PlusCircle,
  Package,
  Truck,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRightLeft,
  Search,
  Filter,
  Trash2,
  User,
  Building2,
  Check,
  X,
  Send,
} from 'lucide-react';
import { CreateRequestModal } from './CreateRequestModal';
import {
  reviewWorkRequest,
  dispatchMaterialRequest,
  updateMachineryRequestStatus,
  deleteWorkRequest,
  adminUpdateRequestStatus,
} from '@/lib/actions/requests';
import { RotateCcw } from 'lucide-react';

interface WorkRequestItem {
  id: string;
  code: string;
  type: string;
  projectId: string;
  project: {
    id: string;
    code: string;
    name: string;
  };
  materialItemId?: string | null;
  materialName?: string | null;
  requestedQty?: number | null;
  unit?: string | null;
  machineryId?: string | null;
  machineryName?: string | null;
  estimatedHours?: number | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  withOperator: boolean;
  targetLocation?: string | null;
  priority: string;
  justification: string;
  neededDate?: Date | string | null;
  status: string;
  requestedByName: string;
  requestedByRole: string;
  reviewedByName?: string | null;
  reviewedAt?: Date | string | null;
  reviewNotes?: string | null;
  createdAt: Date | string;
}

interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

interface MaterialOption {
  id: string;
  projectId: string | null;
  code: string;
  name: string;
  unit: string;
  currentStock: number;
}

interface MachineryOption {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  status: string;
}

export function WorkRequestsView({
  requests,
  projects,
  materials,
  machinery,
  selectedProjectId,
  currentUserRole,
  isAdmin = false,
  canApprove,
  canDispatch,
}: {
  requests: WorkRequestItem[];
  projects: ProjectOption[];
  materials: MaterialOption[];
  machinery: MachineryOption[];
  selectedProjectId?: string;
  currentUserRole?: string;
  isAdmin?: boolean;
  canApprove: boolean;
  canDispatch: boolean;
}) {
  const router = useRouter();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MATERIAL' | 'MAQUINARIA'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'DESPACHADA' | 'EN_USO'>('ALL');
  const [search, setSearch] = useState('');

  // Review modal state
  const [reviewTarget, setReviewTarget] = useState<{
    request: WorkRequestItem;
    decision: 'APROBADA' | 'RECHAZADA';
  } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // Dispatch modal state
  const [dispatchTarget, setDispatchTarget] = useState<WorkRequestItem | null>(null);
  const [dispatchTo, setDispatchTo] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [dispatchLoading, setDispatchLoading] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<WorkRequestItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleAdminForceStatus(requestId: string, newStatus: string) {
    try {
      await adminUpdateRequestStatus(requestId, newStatus);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || 'Error al cambiar estado');
    }
  }

  // Filtered requests
  const filtered = requests.filter((r) => {
    if (selectedProjectId && selectedProjectId !== 'ALL' && r.projectId !== selectedProjectId) {
      return false;
    }
    if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchCode = r.code.toLowerCase().includes(q);
      const matchItem =
        (r.materialName && r.materialName.toLowerCase().includes(q)) ||
        (r.machineryName && r.machineryName.toLowerCase().includes(q));
      const matchProject = r.project.name.toLowerCase().includes(q) || r.project.code.toLowerCase().includes(q);
      const matchJustification = r.justification.toLowerCase().includes(q);
      const matchUser = r.requestedByName.toLowerCase().includes(q);
      if (!matchCode && !matchItem && !matchProject && !matchJustification && !matchUser) {
        return false;
      }
    }

    return true;
  });

  // KPI stats
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'PENDIENTE').length;
  const approvedCount = requests.filter((r) => r.status === 'APROBADA').length;
  const dispatchedOrInUseCount = requests.filter(
    (r) => r.status === 'DESPACHADA' || r.status === 'EN_USO' || r.status === 'FINALIZADA'
  ).length;

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewTarget) return;
    try {
      setReviewLoading(true);
      await reviewWorkRequest(
        reviewTarget.request.id,
        reviewTarget.decision,
        reviewNotes.trim() || undefined
      );
      setReviewTarget(null);
      setReviewNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleDispatchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dispatchTarget) return;
    try {
      setDispatchLoading(true);
      await dispatchMaterialRequest(dispatchTarget.id, {
        dispatchedTo: dispatchTo.trim() || dispatchTarget.requestedByName,
        notes: dispatchNotes.trim() || undefined,
      });
      setDispatchTarget(null);
      setDispatchTo('');
      setDispatchNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setDispatchLoading(false);
    }
  }

  async function handleMachineryStatus(requestId: string, status: 'EN_USO' | 'FINALIZADA') {
    try {
      await updateMachineryRequestStatus(requestId, status);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await deleteWorkRequest(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <ClipboardList className="w-4 h-4 text-orange-600" />
            <span>Gestión de Requerimientos de Obra</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900">
            Solicitudes de Materiales & Maquinaria
          </h1>
          <p className="text-xs text-slate-500">
            Peticiones formales por frente de trabajo, autorización técnica y despacho a obra
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Nueva Solicitud</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Solicitudes
          </span>
          <span className="font-mono text-2xl font-black text-slate-900">{totalCount}</span>
          <p className="text-[10px] text-slate-500">Histórico acumulado</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 bg-amber-50/20 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
            Pendientes de Aprobación
          </span>
          <span className="font-mono text-2xl font-black text-amber-700">{pendingCount}</span>
          <p className="text-[10px] text-amber-600">Requieren visto bueno</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200/80 bg-blue-50/20 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
            Aprobadas (Listas)
          </span>
          <span className="font-mono text-2xl font-black text-blue-700">{approvedCount}</span>
          <p className="text-[10px] text-blue-600">Pendientes de despacho/uso</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
            Atendidas en Frente
          </span>
          <span className="font-mono text-2xl font-black text-emerald-700">
            {dispatchedOrInUseCount}
          </span>
          <p className="text-[10px] text-emerald-600">Despachadas / En uso</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Obra Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Filtrar Obra:</span>
            <select
              value={selectedProjectId || 'ALL'}
              onChange={(e) => {
                const val = e.target.value;
                router.push(val === 'ALL' ? '/solicitudes' : `/solicitudes?projectId=${val}`);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 text-xs focus:ring-1 focus:ring-orange-500"
            >
              <option value="ALL">Todas las obras</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.code}] {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por código, material o justificación..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-full sm:w-72 focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Toggles: Tipo & Estado */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Type tabs */}
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[11px] font-semibold text-slate-600">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1 rounded-md transition-all ${
                typeFilter === 'ALL' ? 'bg-white shadow-xs text-orange-600 font-bold' : 'hover:text-slate-900'
              }`}
            >
              Todos los Tipos
            </button>
            <button
              onClick={() => setTypeFilter('MATERIAL')}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all ${
                typeFilter === 'MATERIAL' ? 'bg-white shadow-xs text-orange-600 font-bold' : 'hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Materiales</span>
            </button>
            <button
              onClick={() => setTypeFilter('MAQUINARIA')}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all ${
                typeFilter === 'MAQUINARIA' ? 'bg-white shadow-xs text-orange-600 font-bold' : 'hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Maquinaria</span>
            </button>
          </div>

          {/* Status chips */}
          <div className="flex flex-wrap items-center gap-1 text-[11px]">
            <span className="text-slate-400 mr-1">Estado:</span>
            {(['ALL', 'PENDIENTE', 'APROBADA', 'DESPACHADA', 'EN_USO', 'RECHAZADA'] as const).map(
              (st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-0.5 rounded-full border transition-all ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white border-slate-900 font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {st === 'ALL'
                    ? 'Todos'
                    : st === 'PENDIENTE'
                    ? 'Pendientes'
                    : st === 'APROBADA'
                    ? 'Aprobadas'
                    : st === 'DESPACHADA'
                    ? 'Despachadas'
                    : st === 'EN_USO'
                    ? 'En Uso'
                    : 'Rechazadas'}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Requests List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs space-y-2">
          <ClipboardList className="w-10 h-10 mx-auto text-slate-300" />
          <p className="font-semibold text-slate-700">No se encontraron solicitudes con los filtros aplicados</p>
          <p className="text-[11px]">Haga clic en "+ Nueva Solicitud" para emitir un requerimiento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((req) => {
            const isMaterial = req.type === 'MATERIAL';
            const isPending = req.status === 'PENDIENTE';
            const isApproved = req.status === 'APROBADA';
            const isDispatched = req.status === 'DESPACHADA';
            const isInUse = req.status === 'EN_USO';
            const isFinished = req.status === 'FINALIZADA';
            const isRejected = req.status === 'RECHAZADA';

            const isUrgent = req.priority === 'URGENTE';
            const isHigh = req.priority === 'ALTA';

            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow p-5 flex flex-col md:flex-row md:items-start justify-between gap-4"
              >
                {/* Left block: details */}
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black text-slate-900 px-2.5 py-0.5 bg-slate-100 rounded-md">
                      {req.code}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                        isMaterial
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {isMaterial ? <Package className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                      <span>{isMaterial ? 'Material / Insumo' : 'Uso de Maquinaria'}</span>
                    </span>

                    <span
                      className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isUrgent
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : isHigh
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {req.priority}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full ml-auto md:ml-0 border ${
                        isPending
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : isApproved
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : isDispatched
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isInUse
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : isFinished
                          ? 'bg-slate-100 text-slate-700 border-slate-300'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  {/* Item Description */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {isMaterial
                        ? `${req.requestedQty?.toLocaleString('es-EC')} ${req.unit} de ${req.materialName}`
                        : req.machineryName}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Obra: [{req.project.code}] {req.project.name}
                    </p>
                  </div>

                  {/* Justification & target location */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
                      {req.targetLocation && (
                        <span>
                          <strong>Frente / Tramo:</strong> {req.targetLocation}
                        </span>
                      )}
                      {req.neededDate && (
                        <span>
                          <strong>Fecha Requerida:</strong>{' '}
                          {new Date(req.neededDate).toLocaleDateString('es-EC')}
                        </span>
                      )}
                      {!isMaterial && req.estimatedHours && (
                        <span>
                          <strong>Horas Estimadas:</strong> {req.estimatedHours}h
                        </span>
                      )}
                      {!isMaterial && req.withOperator && (
                        <span className="text-blue-700 font-semibold">• Con Operador</span>
                      )}
                    </div>
                    <p className="text-slate-700 italic pt-1">
                      "{req.justification}"
                    </p>
                  </div>

                  {/* Requester & Review info */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      <span>Solicitante: <strong>{req.requestedByName}</strong> ({req.requestedByRole})</span>
                    </span>
                    <span>
                      Fecha: {new Date(req.createdAt).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>

                    {req.reviewedByName && (
                      <span className="text-slate-500 font-medium">
                        • Revisado por: <strong>{req.reviewedByName}</strong>
                        {req.reviewNotes && ` ("${req.reviewNotes}")`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right block: Contextual action buttons */}
                <div className="flex flex-wrap md:flex-col items-end gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {/* Approve / Reject buttons for Pending */}
                  {isPending && canApprove && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setReviewTarget({ request: req, decision: 'APROBADA' })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Aprobar</span>
                      </button>

                      <button
                        onClick={() => setReviewTarget({ request: req, decision: 'RECHAZADA' })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Rechazar</span>
                      </button>
                    </div>
                  )}

                  {/* Dispatch Material button */}
                  {isApproved && isMaterial && canDispatch && (
                    <button
                      onClick={() => {
                        setDispatchTarget(req);
                        setDispatchTo(req.requestedByName);
                        setDispatchNotes(`Despacho directo para ${req.targetLocation || 'obra'}`);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-sm shadow-orange-600/20 transition-all"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Despachar desde Bodega</span>
                    </button>
                  )}

                  {/* Machinery In Use / Finish buttons */}
                  {isApproved && !isMaterial && canApprove && (
                    <button
                      onClick={() => handleMachineryStatus(req.id, 'EN_USO')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Poner En Operación</span>
                    </button>
                  )}

                  {isInUse && !isMaterial && canApprove && (
                    <button
                      onClick={() => handleMachineryStatus(req.id, 'FINALIZADA')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Finalizar / Devolver</span>
                    </button>
                  )}

                  {/* Reopen button for Admin on Rejected */}
                  {isRejected && isAdmin && (
                    <button
                      onClick={() => handleAdminForceStatus(req.id, 'PENDIENTE')}
                      title="Reabrir solicitud a estado Pendiente"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reabrir</span>
                    </button>
                  )}

                  {/* Delete button (Admin or requester when pending) */}
                  {(currentUserRole === 'ADMIN' || isPending) && (
                    <button
                      onClick={() => setDeleteTarget(req)}
                      title="Eliminar solicitud"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Create Request */}
      <CreateRequestModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        projects={projects}
        materials={materials}
        machinery={machinery}
        defaultProjectId={selectedProjectId}
        isAdmin={isAdmin}
      />

      {/* Modal Review (Approve / Reject) */}
      {reviewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {reviewTarget.decision === 'APROBADA'
                  ? 'Aprobar Solicitud'
                  : 'Rechazar Solicitud'}{' '}
                {reviewTarget.request.code}
              </h3>
              <button
                onClick={() => setReviewTarget(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <p className="font-bold text-slate-800">
                {reviewTarget.request.type === 'MATERIAL'
                  ? `${reviewTarget.request.requestedQty} ${reviewTarget.request.unit} de ${reviewTarget.request.materialName}`
                  : reviewTarget.request.machineryName}
              </p>
              <p className="text-slate-500">
                Obra: [{reviewTarget.request.project.code}] {reviewTarget.request.project.name}
              </p>
              <p className="text-slate-500">
                Solicitante: {reviewTarget.request.requestedByName} ({reviewTarget.request.requestedByRole})
              </p>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Observaciones / Motivo de Revisión
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    reviewTarget.decision === 'APROBADA'
                      ? 'Ej. Aprobado para ejecución en tramo 2 con prioridad alta...'
                      : 'Ej. Se rechaza por disponibilidad o falta de sustento técnico...'
                  }
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewTarget(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={reviewLoading}
                  className={`px-5 py-2 text-white font-bold rounded-xl transition-all shadow-sm ${
                    reviewTarget.decision === 'APROBADA'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {reviewLoading
                    ? 'Procesando...'
                    : reviewTarget.decision === 'APROBADA'
                    ? 'Confirmar Aprobación'
                    : 'Confirmar Rechazo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dispatch Material */}
      {dispatchTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Despachar Material a Obra ({dispatchTarget.code})
              </h3>
              <button
                onClick={() => setDispatchTarget(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-orange-50 rounded-xl border border-orange-200 space-y-1">
              <p className="font-bold text-orange-950">
                {dispatchTarget.requestedQty} {dispatchTarget.unit} de {dispatchTarget.materialName}
              </p>
              <p className="text-orange-900 text-[11px]">
                Destino: {dispatchTarget.targetLocation || 'Frente de Obra'} • [{dispatchTarget.project.code}]
              </p>
              <p className="text-orange-800 text-[11px]">
                Esta acción creará un movimiento de salida (EXIT) en el kardex de bodega y descontará el stock.
              </p>
            </div>

            <form onSubmit={handleDispatchSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Quién retira en bodega (Chofer / Responsable)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nombre de quien recibe el despacho"
                  value={dispatchTo}
                  onChange={(e) => setDispatchTo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notas de Despacho / Observaciones
                </label>
                <textarea
                  rows={2}
                  placeholder="Observaciones de entrega..."
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDispatchTarget(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={dispatchLoading}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-all shadow-sm"
                >
                  {dispatchLoading ? 'Despachando...' : 'Confirmar y Salir de Bodega'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Eliminar Solicitud</h3>
                <p className="text-xs text-slate-500">{deleteTarget.code}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              ¿Está seguro de eliminar esta solicitud de{' '}
              <strong>
                {deleteTarget.type === 'MATERIAL' ? deleteTarget.materialName : deleteTarget.machineryName}
              </strong>
              ?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-sm"
              >
                {deleteLoading ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
