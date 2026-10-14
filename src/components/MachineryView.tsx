'use client';

import React, { useState } from 'react';
import { Truck, PlusCircle, Clock, AlertTriangle, CheckCircle2, Wrench, Search, X, Trash2, Pencil, DollarSign } from 'lucide-react';
import { createMachinery, updateMachineryStatus, deleteMachinery } from '@/lib/actions/machinery';

interface MachineryItem {
  id: string;
  code: string;
  name: string;
  category: string;
  plateOrSerial: string | null;
  unit: string;
  status: string;
  totalHoursWorked: number;
  hourlyRate?: number;
  dailyLogs: Array<{
    id: string;
    dayHours: number;
    notes: string | null;
    dailyReport: {
      reportNumber: number;
      date: Date | string;
    };
  }>;
}

export function MachineryView({
  machinery,
  isAdmin = false,
}: {
  machinery: MachineryItem[];
  isAdmin?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MachineryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Create state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Excavadora');
  const [unit, setUnit] = useState('hora');
  const [hourlyRate, setHourlyRate] = useState('0');
  const [loading, setLoading] = useState(false);

  // Edit state (Admin only)
  const [editTarget, setEditTarget] = useState<MachineryItem | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('Excavadora');
  const [editUnit, setEditUnit] = useState('hora');
  const [editStatus, setEditStatus] = useState('OPERATIVO');
  const [editHourlyRate, setEditHourlyRate] = useState('0');
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const filtered = machinery.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.code.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  function openEditModal(m: MachineryItem) {
    setEditTarget(m);
    setEditCode(m.code);
    setEditName(m.name);
    setEditCategory(m.category);
    setEditUnit(m.unit || 'hora');
    setEditStatus(m.status || 'OPERATIVO');
    setEditHourlyRate(String(m.hourlyRate ?? 0));
    setEditError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!code || !name) return;
    try {
      setLoading(true);
      await createMachinery({
        code: code.trim().toUpperCase(),
        name: name.trim().toUpperCase(),
        category,
        unit,
        hourlyRate: parseFloat(hourlyRate) || 0,
      });
      setModalOpen(false);
      setCode('');
      setName('');
      setHourlyRate('0');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    try {
      setEditing(true);
      setEditError(null);
      const { updateMachinery } = await import('@/lib/actions/machinery');
      await updateMachinery(editTarget.id, {
        code: editCode.trim().toUpperCase(),
        name: editName.trim(),
        category: editCategory,
        unit: editUnit,
        status: editStatus,
        hourlyRate: parseFloat(editHourlyRate) || 0,
      });
      setEditTarget(null);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Error al actualizar maquinaria');
    } finally {
      setEditing(false);
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    await updateMachineryStatus(id, newStatus);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      await deleteMachinery(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Error al eliminar maquinaria');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <Truck className="w-4 h-4 text-orange-600" />
            <span>Parque de Maquinaria Pesada</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900">
            Control de Maquinaria & Equipos de Obra
          </h1>
          <p className="text-xs text-slate-500">
            Seguimiento de horas operativas, tarifas horarias y estado mecánico
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Registrar Nuevo Equipo</span>
        </button>
      </div>

      {/* Machinery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((m) => {
          const isOperative = m.status === 'OPERATIVO';
          const isMaintenance = m.status === 'EN_MANTENIMIENTO';

          return (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-900 text-white rounded-md">
                    {m.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={m.status}
                      onChange={(e) => handleStatusChange(m.id, e.target.value)}
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border focus:outline-none ${
                        isOperative
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isMaintenance
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      <option value="OPERATIVO">Operativo</option>
                      <option value="EN_MANTENIMIENTO">En Mantenimiento</option>
                      <option value="AVERIADO">Averiado / Taller</option>
                    </select>

                    {isAdmin && (
                      <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
                        <button
                          type="button"
                          onClick={() => openEditModal(m)}
                          title="Editar maquinaria y valor hora (Admin)"
                          className="p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(m);
                          }}
                          title="Eliminar maquinaria (Admin)"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h2 className="text-base font-bold text-slate-900">{m.name}</h2>
                <p className="text-xs text-slate-500">{m.category}</p>

                {/* Metrics: Hours + Hourly Rate */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                      <Clock className="w-3.5 h-3.5 text-orange-600" />
                      <span className="text-[11px]">Horas Totales:</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      {m.totalHoursWorked.toFixed(1)} {m.unit}s
                    </span>
                  </div>

                  <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-700 mb-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-semibold">Valor Hora:</span>
                    </div>
                    <span className="font-mono font-black text-emerald-700">
                      ${(m.hourlyRate || 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })} / {m.unit}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent report logs */}
              <div className="pt-3 border-t border-slate-100 text-[11px] space-y-1.5">
                <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">
                  Últimos Reportes Diarios:
                </span>
                {m.dailyLogs.length > 0 ? (
                  m.dailyLogs.slice(0, 2).map((log) => (
                    <div key={log.id} className="flex justify-between text-slate-600">
                      <span>Rep. N° {String(log.dailyReport.reportNumber).padStart(3, '0')}: {log.notes || 'Operando'}</span>
                      <strong className="font-mono text-slate-800">{log.dayHours}h</strong>
                    </div>
                  ))
                ) : (
                  <span className="text-slate-400 italic">Sin actividad reciente registrada</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal create machinery */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="text-lg font-black text-slate-900">Registrar Nuevo Equipo</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Código del Equipo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. EX20, TR-10, RL-18"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-xs font-mono uppercase"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre / Modelo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. EXCAVADORA CATERPILLAR 320D"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                  >
                    <option value="Excavadora">Excavadora</option>
                    <option value="Tractor">Tractor</option>
                    <option value="Rodillo">Rodillo</option>
                    <option value="Mula">Mula</option>
                    <option value="Tractomula">Tractomula</option>
                    <option value="Volqueta">Volqueta</option>
                    <option value="Tanquero">Tanquero</option>
                    <option value="Motoniveladora">Motoniveladora</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unidad de Medida</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                  >
                    <option value="hora">hora</option>
                    <option value="Unidad">Unidad</option>
                    <option value="km">km</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Valor / Costo por Hora ($/h)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border rounded-lg text-xs font-mono"
                  />
                </div>
                <p className="text-[10.5px] text-slate-400 mt-1">
                  Este valor se multiplicará automáticamente por las horas trabajadas en los reportes diarios.
                </p>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-orange-600 text-white rounded-lg font-bold"
                >
                  Guardar Equipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit machinery (Admin only) */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Editar Maquinaria & Valor Hora</h3>
                  <p className="text-[10px] text-slate-500">Gestión de tarifas de equipo (Admin)</p>
                </div>
              </div>
              <button
                onClick={() => setEditTarget(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Código</label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs font-mono uppercase bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estado</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                  >
                    <option value="OPERATIVO">Operativo</option>
                    <option value="EN_MANTENIMIENTO">En Mantenimiento</option>
                    <option value="AVERIADO">Averiado / Taller</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre / Descripción</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Categoría</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                  >
                    <option value="Excavadora">Excavadora</option>
                    <option value="Tractor">Tractor</option>
                    <option value="Rodillo">Rodillo</option>
                    <option value="Mula">Mula</option>
                    <option value="Tractomula">Tractomula</option>
                    <option value="Volqueta">Volqueta</option>
                    <option value="Tanquero">Tanquero</option>
                    <option value="Motoniveladora">Motoniveladora</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unidad</label>
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                  >
                    <option value="hora">hora</option>
                    <option value="Unidad">Unidad</option>
                    <option value="km">km</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-orange-50/50 rounded-xl border border-orange-200/80">
                <label className="block font-bold text-orange-900 mb-1 flex items-center justify-between">
                  <span>Valor / Tarifa por Hora ($/h)</span>
                  <span className="text-[10px] text-orange-600 font-normal">Requerido para reportes</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={editHourlyRate}
                    onChange={(e) => setEditHourlyRate(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-orange-300 rounded-lg text-xs font-mono font-bold bg-white text-slate-900 focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  En los reportes diarios se multiplicará: <em>(Horas Día × Valor Hora)</em> para totalizar el costo de este equipo.
                </p>
              </div>

              {editError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                  {editError}
                </div>
              )}

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  disabled={editing}
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold shadow-md shadow-orange-600/20 disabled:opacity-50"
                >
                  {editing ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirm Delete */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Eliminar Maquinaria</h3>
                <p className="text-xs text-slate-500">Acción exclusiva de Administrador</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
              <p className="text-slate-700 font-bold">
                [{deleteTarget.code}] {deleteTarget.name}
              </p>
              <p className="text-slate-500">Categoría: {deleteTarget.category}</p>
              <p className="text-slate-500 font-mono">
                Horas acumuladas: {deleteTarget.totalHoursWorked.toFixed(1)} {deleteTarget.unit}s
              </p>
            </div>

            <p className="text-xs text-rose-600 font-medium">
              ¿Está seguro de eliminar este equipo del inventario de maquinaria pesada? El registro quedará archivado en la bitácora de auditoría.
            </p>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Eliminando...' : 'Sí, Eliminar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
