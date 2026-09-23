'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Layers, Check } from 'lucide-react';

interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

export function DashboardProjectFilter({
  projects,
  selectedProjectId,
}: {
  projects: ProjectOption[];
  selectedProjectId?: string;
}) {
  const router = useRouter();

  function handleSelect(id: string) {
    if (id === 'ALL') {
      router.push('/');
    } else {
      router.push(`/?projectId=${id}`);
    }
  }

  const isAll = !selectedProjectId || selectedProjectId === 'ALL';

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-md space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-orange-600/30">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-[10.5px] font-bold text-orange-400 uppercase tracking-wider block">
              Vista del Panel General:
            </span>
            <h2 className="text-sm sm:text-base font-bold text-white">
              {isAll
                ? 'Portafolio Corporativo Consolidado (Todas las Obras)'
                : projects.find((p) => p.id === selectedProjectId)?.name || 'Obra Seleccionada'}
            </h2>
          </div>
        </div>

        {/* Dropdown for Mobile / Direct selection */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">Seleccionar:</span>
          <select
            value={isAll ? 'ALL' : selectedProjectId}
            onChange={(e) => handleSelect(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 text-white text-xs font-semibold rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
          >
            <option value="ALL">🌐 Portafolio Consolidado (Todas las Obras)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.code}] {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Clickable Tabs */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80">
        <button
          onClick={() => handleSelect('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            isAll
              ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30 font-bold'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Todas las Obras ({projects.length})</span>
        </button>

        {projects.map((p) => {
          const isSelected = selectedProjectId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30 font-bold'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>[{p.code}]</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
