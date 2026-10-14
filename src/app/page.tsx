import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  Truck,
  FileSpreadsheet,
  ArrowRight,
  ChevronRight,
  Briefcase,
} from 'lucide-react';
import { ProjectSliderCards } from '@/components/ProjectSliderCards';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const currentUser = await requireAuth();

  // If user only has BODEGUERO role in all their projects, redirect to /bodega
  const isAdmin = currentUser.role === 'ADMIN';
  const assignedRoles = currentUser?.assignments?.map((a) => a.roleInProject) || [];
  if (currentUser?.role && currentUser.role !== 'ADMIN' && currentUser.role !== 'ESTANDAR') {
    assignedRoles.push(currentUser.role);
  }
  const hasResidentRole = isAdmin || assignedRoles.includes('RESIDENTE_OBRA');
  const hasBodegaRole = isAdmin || assignedRoles.includes('BODEGUERO');

  if (!isAdmin && hasBodegaRole && !hasResidentRole) {
    redirect('/bodega');
  }

  // Filter accessible projects for user
  const userProjectFilter =
    currentUser && currentUser.role !== 'ADMIN' && currentUser.assignedProjectIds.length > 0
      ? { id: { in: currentUser.assignedProjectIds } }
      : {};

  // Fetch all accessible projects with rich relations for the slider cards
  const allProjects = await prisma.project.findMany({
    where: userProjectFilter,
    include: {
      rubros: {
        orderBy: { rubroNumber: 'asc' },
      },
      dailyReports: {
        orderBy: { reportNumber: 'desc' },
        take: 1,
        include: {
          rubroExecutions: {
            include: {
              projectRubro: true,
            },
          },
          machineryLogs: {
            include: {
              machinery: true,
            },
          },
          personnelLogs: true,
        },
      },
      workerAssignments: {
        where: { status: 'ACTIVO' },
        include: { worker: true },
      },
      contractors: {
        include: { contractor: true },
      },
    },
    orderBy: { code: 'asc' },
  });

  // Recent daily reports across all worksites
  const recentReports = await prisma.dailyReport.findMany({
    where: userProjectFilter.id ? { projectId: userProjectFilter.id } : undefined,
    orderBy: { date: 'desc' },
    take: 5,
    include: {
      project: true,
      rubroExecutions: {
        include: {
          projectRubro: true,
        },
      },
    },
  });

  // Machinery fleet
  const machineryList = await prisma.machinery.findMany({
    orderBy: { totalHoursWorked: 'desc' },
    take: 6,
  });

  return (
    <div className="space-y-8">
      {/* 1. Portafolio de Proyectos & Obras Viales */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-orange-600" />
              <span>Portafolio de Proyectos & Obras Viales ({allProjects.length})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Resumen de cada proyecto en tarjetas interactivas tipo slider, filtrables por estado
            </p>
          </div>
          <Link
            href="/proyectos"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors"
          >
            <span>Administrar Proyectos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <ProjectSliderCards projects={allProjects as any} />
      </div>

      {/* Grid: 2. Últimos Reportes Diarios Emitidos & 3. Flota de Maquinaria Operativa */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 2. Últimos Reportes Diarios Emitidos en el Portafolio */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-orange-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                Últimos Reportes Diarios Emitidos en el Portafolio
              </h3>
            </div>
            <Link
              href="/reportes"
              className="text-xs font-semibold text-orange-600 hover:text-orange-700"
            >
              Ver Todos
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentReports.length > 0 ? (
              recentReports.map((r) => (
                <div
                  key={r.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200 text-[11px]">
                        [{r.project.code}] Rep N° {r.reportNumber}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="font-medium text-slate-700">
                        {new Date(r.date).toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{r.project.name}</p>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="text-right">
                      <span className="font-bold text-slate-900 block font-mono">
                        ${r.totalExecutedDay.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Acum: ${r.totalExecutedAccum.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <Link
                      href={`/reportes/${r.id}`}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No hay reportes emitidos aún.</p>
            )}
          </div>
        </div>

        {/* 3. Flota de Maquinaria Operativa */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-slate-900 text-sm">Flota de Maquinaria Operativa</h3>
              </div>
              <Link
                href="/maquinaria"
                className="text-xs font-semibold text-orange-600 hover:text-orange-700"
              >
                Ver Flota
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {machineryList.map((m) => (
                <div
                  key={m.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-900 block">{m.code}</span>
                    <span className="text-[11px] text-slate-500 line-clamp-1">{m.name}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Total:</span>
                    <span className="font-bold text-slate-700">{m.totalHoursWorked} {m.unit}s</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
