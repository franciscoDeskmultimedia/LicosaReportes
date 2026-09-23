'use client';

import React, { useState, useEffect, useRef } from 'react';
import { addProjectRubro, getGlobalRubrosCatalog } from '@/lib/actions/projects';
import { PlusCircle, X, AlertCircle, Search, CheckCircle2, Sparkles } from 'lucide-react';

interface CatalogRubro {
  rubroNumber: number;
  description: string;
  unit: string;
  unitPrice: number;
  isPrincipal: boolean;
  project?: {
    code: string;
    name: string;
  };
}

interface AddRubroModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AddRubroModal({ projectId, isOpen, onClose }: AddRubroModalProps) {
  const [catalog, setCatalog] = useState<CatalogRubro[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isFromCatalog, setIsFromCatalog] = useState(false);
  const [loading, setLoading] = useState(false);

  const [rubroNumber, setRubroNumber] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('m3');
  const [unitPrice, setUnitPrice] = useState('');
  const [initialQuantity, setInitialQuantity] = useState('');
  const [isPrincipal, setIsPrincipal] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const comboboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      getGlobalRubrosCatalog().then((items) => {
        setCatalog(items);
      });
      // Reset form
      setSearchQuery('');
      setDescription('');
      setRubroNumber('');
      setUnit('m3');
      setUnitPrice('');
      setInitialQuantity('');
      setIsPrincipal(true);
      setIsFromCatalog(false);
      setDropdownOpen(false);
      setError(null);
    }
  }, [isOpen]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Filter catalog based on search query
  const matchingRubros = catalog.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.description.toLowerCase().includes(q) ||
      item.rubroNumber.toString().includes(q) ||
      item.unit.toLowerCase().includes(q)
    );
  });

  function handleSelectCatalogItem(item: CatalogRubro) {
    setSearchQuery(item.description);
    setDescription(item.description);
    setRubroNumber(item.rubroNumber.toString());
    setUnit(item.unit);
    setUnitPrice(item.unitPrice.toString());
    setIsPrincipal(item.isPrincipal);
    setIsFromCatalog(true);
    setDropdownOpen(false);
  }

  function handleCreateAsNew(text: string) {
    const trimmed = text.trim();
    setSearchQuery(trimmed);
    setDescription(trimmed);
    setIsFromCatalog(false);
    setDropdownOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rNum = parseInt(rubroNumber);
    const uPrice = parseFloat(unitPrice);
    const iQty = parseFloat(initialQuantity);

    if (!description.trim()) {
      setError('Por favor ingrese la descripción del rubro');
      return;
    }

    if (!rNum || isNaN(uPrice) || isNaN(iQty)) {
      setError('Por favor complete todos los campos numéricos requeridos');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await addProjectRubro({
        projectId,
        rubroNumber: rNum,
        description: description.trim(),
        unit: unit.trim(),
        unitPrice: uPrice,
        initialQuantity: iQty,
        isPrincipal,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al agregar el rubro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">
              Presupuesto & Planillaje
            </span>
            <h3 className="text-lg font-black text-slate-900">
              Asignar / Crear Rubro Contractual
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Searchable Combobox */}
          <div ref={comboboxRef} className="relative space-y-1">
            <label className="block font-bold text-slate-800">
              Buscar Rubro o Escribir Nuevo *
            </label>
            <p className="text-[11px] text-slate-500">
              Escriba para buscar en el catálogo de obras o defina un rubro nuevo si no existe.
            </p>

            <div className="relative mt-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                placeholder="Ej. Excavación en suelo común, Hormigón f'c=210, 35..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setDescription(e.target.value);
                  setIsFromCatalog(false);
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setDescription('');
                    setIsFromCatalog(false);
                    setDropdownOpen(false);
                  }}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown Options List */}
            {dropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-50 divide-y divide-slate-100">
                {matchingRubros.length > 0 ? (
                  matchingRubros.slice(0, 10).map((item) => (
                    <button
                      key={`${item.rubroNumber}_${item.description}`}
                      type="button"
                      onClick={() => handleSelectCatalogItem(item)}
                      className="w-full text-left p-2.5 hover:bg-orange-50/80 flex items-center justify-between transition-colors group"
                    >
                      <div className="pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-800">
                            N° {item.rubroNumber}
                          </span>
                          <span className="font-semibold text-slate-800 text-xs group-hover:text-orange-950 line-clamp-1">
                            {item.description}
                          </span>
                        </div>
                        {item.project && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Historial: {item.project.code}
                          </span>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-mono text-[10px] text-slate-500 mr-1.5">
                          {item.unit}
                        </span>
                        <span className="font-bold text-slate-800 text-xs font-mono">
                          ${item.unitPrice.toFixed(2)}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-slate-500">
                    No se encontraron rubros con esa descripción en el catálogo.
                  </div>
                )}

                {/* Option to create as new */}
                {searchQuery.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleCreateAsNew(searchQuery)}
                    className="w-full text-left p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center gap-2 font-bold text-xs transition-colors"
                  >
                    <PlusCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      {matchingRubros.length === 0 ? 'Crear ' : 'O definir como nuevo: '}
                      "{searchQuery.trim()}"
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Catalog Selection Confirmation or Custom Notice */}
          {isFromCatalog ? (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                <strong>Rubro de Catálogo Seleccionado.</strong> Los datos técnicos y precio unitario fueron autocompletados.
              </span>
            </div>
          ) : searchQuery.trim() ? (
            <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>
                <strong>Nuevo Rubro Personalizado.</strong> Complete el número, unidad y precio unitario a continuación.
              </span>
            </div>
          ) : null}

          {/* Form details for Rubro */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                N° de Rubro *
              </label>
              <input
                type="number"
                required
                placeholder="Ej. 35"
                value={rubroNumber}
                onChange={(e) => setRubroNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-orange-600 focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Unidad *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. m3, m, kg"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tipo de Rubro
              </label>
              <select
                value={isPrincipal ? 'true' : 'false'}
                onChange={(e) => setIsPrincipal(e.target.value === 'true')}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-orange-500"
              >
                <option value="true">Principal</option>
                <option value="false">No Principal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Descripción Oficial del Rubro *
            </label>
            <textarea
              rows={2}
              required
              placeholder="Descripción detallada del rubro contractual..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setSearchQuery(e.target.value);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Cantidad Contractual para esta Obra *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="Ej. 1200"
                value={initialQuantity}
                onChange={(e) => setInitialQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Precio Unitario ($) *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="Ej. 145.50"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Guardando...' : 'Asignar Rubro a la Obra'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
