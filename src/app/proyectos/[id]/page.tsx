import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getProjectById } from '@/lib/actions/projects';
import { ProjectDetailView } from '@/components/ProjectDetailView';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
  const currentUser = await getCurrentUser();

  if (currentUser?.role === 'BODEGUERO') {
    redirect('/bodega');
  }

  const { id } = await params;

  // If user is resident and project not assigned to them, deny access
  if (currentUser && currentUser.role !== 'ADMIN' && currentUser.assignedProjectIds.length > 0) {
    if (!currentUser.assignedProjectIds.includes(id)) {
      notFound();
    }
  }

  const project = await getProjectById(id);

  if (!project) {
    notFound();
  }

  return <ProjectDetailView project={project} />;
}

