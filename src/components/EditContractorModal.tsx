'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateContractor } from '@/lib/actions/contractors';
import { X, Briefcase, AlertCircle } from 'lucide-react';

const SPECIALTIES = [
  'Consorcio Constructor Principal',
  'Movimiento de Tierras & Canteras',
  'Asfaltado & Pavimentación',
  'Puentes & Estructuras Mayores',
  'Fiscalización & Control de Calidad',
  'Transporte Pesado & Desalojo',
  'Drenaje & Obras de Arte',
  'Señalización Vial & Seguridad',
];

interface EditContractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractor: {
    id: string;
    name: string;
    ruc: string;
    specialty: string;
    contactPerson?: string | null;
    phone?: string | null;
    email?: string | null;
    active?: boolean;
  } | null;
}

export function EditContractorModal({ isOpen, onClose, contractor }: EditContractorModalProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [ruc, setRuc] = useState('');
  const [specialty, setSpecialty] = useState(SPECIALTIES[0]);
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contractor) {
      setName(contractor.name);
      setRuc(contractor.ruc);
      setSpecialty(contractor.specialty || SPECIALTIES[0]);
      setContactPerson(contractor.contactPerson || '');
      setPhone(contractor.phone || '');
      setEmail(contractor.email || '');
      setActive(contractor.active ?? true);
      setError(null);
    }
  }, [contractor]);

  if (!isOpen || !contractor) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !ruc.trim()) {
      setError('Por favor complete la razón social y RUC');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await updateContractor(contractor!.id, {
        name: name.trim().toUpperCase(),
        ruc: ruc.trim(),
        specialty,
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        active,
      });
      router.refresh();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar contratista');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Editar Contratista / Subcontratista</h3>
              <p className="text-[11px] text-slate-400">Modifica datos comerciales y contacto</p>
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
              Razón Social / Nombre Comercial <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                RUC <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={13}
                value={ruc}
                onChange={(e) => setRuc(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Especialidad <span className="text-rose-500">*</span>
              </label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none text-[11px]"
              >
                {SPECIALTIES.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Persona de Contacto / Representante</label>
            <input
              type="text"
              placeholder="Ing. Juan Pérez"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none"
            />
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
                placeholder="contacto@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-slate-600 font-semibold">Estado de Proveedor:</span>
            <button
              type="button"
              onClick={() => setActive(!active)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                active
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}
            >
              {active ? '● Activo / Habilitado' : 'Inactivo'}
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
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
