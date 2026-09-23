import React from 'react';
import { redirect } from 'next/navigation';
import { getDailyReports } from '@/lib/actions/dailyReports';
import { getProjects } from '@/lib/actions/projects';
import { DailyReportsListView } from '@/components/DailyReportsListView';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function DailyReportsPage({ searchParams }: PageProps) {
  const currentUser = await getCurrentUser();

  const isAdmin = currentUser?.role === 'ADMIN';
  const allowedProjectIds = isAdmin
    ? []
    : currentUser?.assignments
        ?.filter((a) => a.roleInProject === 'RESIDENTE_OBRA' || a.roleInProject === 'FISCALIZADOR')
        .map((a) => a.projectId) || [];

  // If not admin and not resident in any project, redirect to bodega
  if (!isAdmin && allowedProjectIds.length === 0) {
    redirect('/bodega');
  }

  const { projectId } = await searchParams;
  let projects = await getProjects();

  // If not admin, restrict projects to where user is resident/fiscalizador
  if (!isAdmin) {
    projects = projects.filter((p) => allowedProjectIds.includes(p.id));
  }

  // Validate activeProjectId: must be in allowed projects
  let activeProjectId = projectId;
  const projectListIds = projects.map((p) => p.id);

  if (activeProjectId && !projectListIds.includes(activeProjectId)) {
    activeProjectId = projectListIds[0];
  } else if (!activeProjectId && projects.length > 0) {
    activeProjectId = projects[0].id;
  }

  const reports = await getDailyReports(activeProjectId);


  return (
    <DailyReportsListView
      reports={reports}
      projects={projects}
      selectedProjectId={activeProjectId}
    />
  );
}

