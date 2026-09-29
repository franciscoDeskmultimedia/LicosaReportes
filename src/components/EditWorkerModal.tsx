'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateWorker } from '@/lib/actions/workers';
import { X, UserCheck, AlertCircle, HardHat } from 'lucide-react';

const CATEGORIES = [
  'Ingeniero Residente',
  'Ingeniero de Planillas',
  'Topógrafo',
  'Cadenero',
  'Operador Excavadora',
  'Operador Tractor',
  'Operador Rodillo',
  'Chofer Volqueta',
  'Chofer de Tanquero',
  'Ayudante de Obra - Recibidor',
  'Inspector Ambiental',
  'Seguridad y Salud (EHS)',
  'Mecánico de Obra',
];

interface EditWorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: {
    id: string;
    identification: string;
    name: string;
    roleCategory: string;
    phone?: string | null;
    email?: string | null;
    active: boolean;
  } | null;
}

export function EditWorkerModal({ isOpen, onClose, worker }: EditWorkerModalProps) {
  const router = useRouter();
  const [identification, setIdentification] = useState('');
  const [name, setName] = useState('');
  const [roleCategory, setRoleCategory] = useState(CATEGORIES[0]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (worker) {
      setIdentification(worker.identification);
      setName(worker.name);
      setRoleCategory(worker.roleCategory || CATEGORIES[0]);
      setPhone(worker.phone || '');
      setEmail(worker.email || '');
      setActive(worker.active ?? true);
      setError(null);
    }
  }, [worker]);

  if (!isOpen || !worker) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identification.trim() || !name.trim()) {
      setError('Por favor complete la identificación y nombre');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await updateWorker(worker!.id, {
        identification: identification.trim(),
        name: name.trim().toUpperCase(),
        roleCategory,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        active,
      });
      router.refresh();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar trabajador');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <HardHat className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Editar Información de Personal</h3>
              <p className="text-[11px] text-slate-400">Modifica datos del trabajador y cargo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Cédula / DNI <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={identification}
              onChange={(e) => setIdentification(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nombres y Apellidos Completos <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none font-bold"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Categoría / Cargo en Obra <span className="text-rose-500">*</span>
            </label>
            <select
              value={roleCategory}
              onChange={(e) => setRoleCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none font-medium"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Teléfono Móvil</label>
              <input
                type="text"
                placeholder="0991234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Correo Electrónico</label>
              <input
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-slate-600 font-semibold">Estado en Nómina:</span>
            <button
              type="button"
              onClick={() => setActive(!active)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                active
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}
            >
              {active ? '● Activo en Nómina' : 'Inactivo'}
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-md shadow-orange-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
