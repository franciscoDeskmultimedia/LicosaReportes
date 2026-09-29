import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getProjectById } from '@/lib/actions/projects';
import { getDailyReportById } from '@/lib/actions/dailyReports';
import { getWorkers } from '@/lib/actions/workers';
import { getContractors } from '@/lib/actions/contractors';
import { ProjectDetailView } from '@/components/ProjectDetailView';
import { requireAuth } from '@/lib/auth';

import { getProjectAccumulatedProgress } from '@/lib/actions/progress';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ProjectPage({ params, searchParams }: PageProps) {
  const currentUser = await requireAuth();

  if (currentUser.role === 'BODEGUERO') {
    redirect('/bodega');
  }

  const { id } = await params;
  const { tab } = await searchParams;

  // If user is resident and project not assigned to them, deny access
  if (currentUser && currentUser.role !== 'ADMIN' && currentUser.assignedProjectIds.length > 0) {
    if (!currentUser.assignedProjectIds.includes(id)) {
      notFound();
    }
  }

  const [project, progressData, allWorkers, allContractors] = await Promise.all([
    getProjectById(id),
    getProjectAccumulatedProgress(id),
    getWorkers(),
    getContractors(),
  ]);

  if (!project) {
    notFound();
  }

  const latestReportId = project.dailyReports && project.dailyReports.length > 0 ? project.dailyReports[0].id : null;
  const latestReportFull = latestReportId ? await getDailyReportById(latestReportId) : null;

  return (
    <ProjectDetailView
      project={project as any}
      progressData={progressData}
      latestReportFull={latestReportFull as any}
      initialTab={tab}
      allWorkers={allWorkers as any}
      allContractors={allContractors as any}
      currentUser={currentUser}
    />
  );
}

