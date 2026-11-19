import React from 'react';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { getProjects } from '@/lib/actions/projects';
import { getPlanillas, comparePlanillaVsRdo } from '@/lib/actions/planillas';
import { PlanillasComparatorView } from '@/components/PlanillasComparatorView';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    projectId?: string;
    planillaId?: string;
    mode?: 'PERIOD' | 'ACCUMULATED';
  }>;
}

export default async function PlanillasPage({ searchParams }: PageProps) {
  const currentUser = await requireAuth();

  const isAdmin = currentUser.role === 'ADMIN';
  const assignedRoles = currentUser?.assignments?.map((a) => a.roleInProject) || [];
  const hasResidentRole = isAdmin || assignedRoles.includes('RESIDENTE_OBRA') || assignedRoles.includes('FISCALIZADOR');

  if (!hasResidentRole) {
    redirect('/bodega');
  }

  // Next.js 15/16: searchParams is a Promise and must be awaited
  const { projectId, planillaId, mode } = await searchParams;

  // 1. Obtener proyectos disponibles
  let projects = await getProjects();
  if (!isAdmin) {
    const allowedProjectIds = currentUser?.assignments?.map((a) => a.projectId) || [];
    projects = projects.filter((p) => allowedProjectIds.includes(p.id));
  }

  // Si no hay proyectos en la BD (o la BD no tiene aún registros), crear opción por defecto de la obra
  const projectOptions =
    projects.length > 0
      ? projects.map((p) => ({ id: p.id, code: p.code, name: p.name }))
      : [
          {
            id: 'OBRA-VALLE-VIRGEN-01',
            code: 'OBRA-VALLE-VIRGEN-01',
            name: 'Rehabilitación de la Vía Valle de la Virgen – Lím. Provincial y Las Muras',
          },
        ];

  // 2. Determinar proyecto activo
  let activeProjectId = projectId;
  if (!activeProjectId || !projectOptions.some((p) => p.id === activeProjectId || p.code === activeProjectId)) {
    activeProjectId = projectOptions[0].id;
  }

  // 3. Obtener listado de planillas
  const allPlanillas = await getPlanillas(activeProjectId);
  let activePlanillaId = planillaId;
  if (!activePlanillaId || !allPlanillas.some((p) => p.id === activePlanillaId)) {
    activePlanillaId = allPlanillas[0]?.id || 'planilla-licosa-01';
  }

  const activeMode: 'PERIOD' | 'ACCUMULATED' = mode === 'ACCUMULATED' ? 'ACCUMULATED' : 'PERIOD';

  // 4. Ejecutar la comparación
  const comparisonData = await comparePlanillaVsRdo({
    projectId: activeProjectId,
    planillaId: activePlanillaId,
    mode: activeMode,
    tolerance: 1.0,
  });

  if (!comparisonData) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <h2 className="text-base font-bold text-slate-800">No se pudieron cargar datos de la planilla</h2>
        <p className="text-xs text-slate-500 mt-1">Verifique la configuración del proyecto y la planilla.</p>
      </div>
    );
  }

  return (
    <PlanillasComparatorView
      comparisonData={comparisonData}
      allPlanillas={allPlanillas}
      projects={projectOptions}
      selectedProjectId={activeProjectId}
      selectedPlanillaId={activePlanillaId}
      currentMode={activeMode}
    />
  );
}

