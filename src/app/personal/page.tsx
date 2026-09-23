import React from 'react';
import { redirect } from 'next/navigation';
import { getProjects } from '@/lib/actions/projects';
import { getWorkers } from '@/lib/actions/workers';
import { WorkersView } from '@/components/WorkersView';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function PersonalPage({ searchParams }: PageProps) {
  const currentUser = await requireAuth();

  if (currentUser.role === 'BODEGUERO') {
    redirect('/bodega');
  }

  const { projectId } = await searchParams;
  const [projects, workers] = await Promise.all([
    getProjects(),
    getWorkers({ projectId: projectId !== 'ALL' ? projectId : undefined }),
  ]);

  const projectOptions = projects.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
  }));

  return (
    <WorkersView
      workers={workers as any}
      projects={projectOptions}
      selectedProjectId={projectId}
    />
  );
}
