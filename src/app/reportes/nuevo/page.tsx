import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getPreviousReportStats } from '@/lib/actions/dailyReports';
import { getMachineryList } from '@/lib/actions/machinery';
import { getProjects } from '@/lib/actions/projects';
import { NewDailyReportForm } from '@/components/NewDailyReportForm';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function NewDailyReportPage({ searchParams }: PageProps) {
  const currentUser = await requireAuth();

  const isAdmin = currentUser.role === 'ADMIN';
  const residentProjectIds = isAdmin
    ? []
    : currentUser?.assignments
        ?.filter((a) => a.roleInProject === 'RESIDENTE_OBRA')
        .map((a) => a.projectId) || [];

  if (!isAdmin && residentProjectIds.length === 0) {
    redirect('/bodega');
  }

  const { projectId } = await searchParams;
  let projects = await getProjects();

  if (!isAdmin) {
    projects = projects.filter((p) => residentProjectIds.includes(p.id));
  }


  if (projects.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border">
        <h2 className="font-bold text-slate-800">No se encontró un proyecto asignado</h2>
        <p className="text-xs text-slate-500 mt-1">No tiene obras asignadas para emitir reportes de trabajo.</p>
      </div>
    );
  }

  // Validate selected project is within accessible projects
  let selectedProjectId = projectId;
  const allowedProjectIds = projects.map((p) => p.id);
  if (!selectedProjectId || !allowedProjectIds.includes(selectedProjectId)) {
    selectedProjectId = allowedProjectIds[0];
  }

  const project = await prisma.project.findUnique({
    where: { id: selectedProjectId },
    include: {
      rubros: {
        orderBy: { rubroNumber: 'asc' },
      },
    },
  });

  if (!project) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border">
        <h2 className="font-bold text-slate-800">Proyecto no encontrado</h2>
      </div>
    );
  }

  const [machinery, previousReport] = await Promise.all([
    getMachineryList(),
    getPreviousReportStats(project.id),
  ]);

  return (
    <NewDailyReportForm
      key={project.id}
      project={project}
      allProjects={projects}
      machinery={machinery}
      previousReport={previousReport}
    />
  );
}
