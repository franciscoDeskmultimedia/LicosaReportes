import React from 'react';
import { redirect } from 'next/navigation';
import { getDailyReports } from '@/lib/actions/dailyReports';
import { getProjects } from '@/lib/actions/projects';
import { DailyReportsListView } from '@/components/DailyReportsListView';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function DailyReportsPage({ searchParams }: PageProps) {
  const currentUser = await requireAuth();

  const isAdmin = currentUser.role === 'ADMIN';
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

  const projectListIds = projects.map((p) => p.id);

  // If projectId is 'ALL' or not specified, default to 'ALL' (Consolidado)
  // If projectId is a valid project ID from allowed works, filter to that project
  let activeProjectId = 'ALL';
  if (projectId && projectId !== 'ALL' && projectListIds.includes(projectId)) {
    activeProjectId = projectId;
  }

  const filterProjectId = activeProjectId === 'ALL' ? undefined : activeProjectId;
  let reports = await getDailyReports(filterProjectId);

  // If not admin and viewing all, only include reports from allowed projects
  if (!isAdmin && activeProjectId === 'ALL') {
    reports = reports.filter((r) => allowedProjectIds.includes(r.projectId));
  }

  return (
    <DailyReportsListView
      reports={reports}
      projects={projects}
      selectedProjectId={activeProjectId}
    />
  );
}

