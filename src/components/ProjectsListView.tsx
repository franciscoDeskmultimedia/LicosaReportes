'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FolderGit2,
  PlusCircle,
  Layers,
  Calendar,
  Building2,
  ChevronRight,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { CreateProjectModal } from '@/components/CreateProjectModal';

interface ProjectItem {
  id: string;
  code: string;
  name: string;
  contractor: string;
  client: string;
  contractNumber: string;
  contractAmount: number;
  durationDays: number;
  startDate: Date | string;
  status: string;
  rubros: Array<{ id: string; rubroNumber: number; description: string; currentQuantity: number; unitPrice: number }>;
  dailyReports: Array<{ id: string; reportNumber: number; progressPercentAccum: number; totalExecutedAccum: number; elapsedDays: number }>;
}

export function ProjectsListView({ projects }: { projects: ProjectItem[] }) {
  const [createModalOpen, setCreateModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <FolderGit2 className="w-4 h-4 text-orange-600" />
            <span>Administración Contractual</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900">
            Proyectos & Obras Viales
          </h1>
          <p className="text-xs text-slate-500">
            Gestión de contratos, presupuesto de rubros y complementarios
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Registrar Nuevo Proyecto</span>
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((proj) => {
          const lastReport = proj.dailyReports[0];
          const progress = lastReport?.progressPercentAccum || 0;
          const totalExecuted = lastReport?.totalExecutedAccum || 0;

          return (
            <div
              key={proj.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md border border-slate-300">
                    {proj.code}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    En Ejecución
                  </span>
                </div>

                <div>
                  <h2 className="text-base font-bold text-slate-900 line-clamp-2 leading-snug">
                    {proj.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Contrato N° {proj.contractNumber}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-3 border-y border-slate-100 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Contratante:</span>
                    <span className="font-semibold text-slate-800 line-clamp-1">{proj.client}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Contratista:</span>
                    <span className="font-semibold text-slate-800 line-clamp-1">{proj.contractor}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Presupuesto Total:</span>
                    <span className="font-mono font-bold text-slate-900">
                      ${proj.contractAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Plazo de Obra:</span>
                    <span className="font-semibold text-slate-800">
                      {proj.durationDays} días ({lastReport?.elapsedDays || 0} transcurridos)
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-slate-500 font-medium">Avance Acumulado:</span>
                    <span className="font-mono font-bold text-emerald-600">{progress.toFixed(2)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>${totalExecuted.toLocaleString('es-EC', { minimumFractionDigits: 2 })} ejecutados</span>
                    <span>{proj.rubros.length} rubros activos</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={`/reportes?projectId=${proj.id}`}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Ver Reportes Diarios
                </Link>
                <Link
                  href={`/proyectos/${proj.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                >
                  <span>Ficha de Rubros</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <CreateProjectModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  );
}
