import React from 'react';
import { redirect } from 'next/navigation';
import { getProjects } from '@/lib/actions/projects';
import { getProjectAccumulatedProgress } from '@/lib/actions/progress';
import { ProjectProgressView } from '@/components/ProjectProgressView';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function AvanceAcumuladoPage({ searchParams }: PageProps) {
  const currentUser = await requireAuth();

  const isAdmin = currentUser.role === 'ADMIN';
  const allowedProjectIds = isAdmin
    ? []
    : currentUser?.assignments
        ?.filter((a) => a.roleInProject === 'RESIDENTE_OBRA' || a.roleInProject === 'FISCALIZADOR')
        .map((a) => a.projectId) || [];

  if (!isAdmin && allowedProjectIds.length === 0) {
    redirect('/bodega');
  }

  const { projectId } = await searchParams;
  let projects = await getProjects();

  if (!isAdmin) {
    projects = projects.filter((p) => allowedProjectIds.includes(p.id));
  }

  if (projects.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border">
        <h2 className="font-bold text-slate-800">No se encontraron proyectos asignados</h2>
      </div>
    );
  }

  let activeProjectId = projectId;
  const projectListIds = projects.map((p) => p.id);

  if (!activeProjectId || !projectListIds.includes(activeProjectId)) {
    activeProjectId = projectListIds[0];
  }

  const progressData = await getProjectAccumulatedProgress(activeProjectId);

  const projectOptions = projects.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    contractAmount: p.contractAmount,
  }));

  return (
    <ProjectProgressView
      progressData={progressData}
      projects={projectOptions}
      selectedProjectId={activeProjectId}
    />
  );
}
