import React from 'react';
import { redirect } from 'next/navigation';
import { getProjects } from '@/lib/actions/projects';
import { ProjectsListView } from '@/components/ProjectsListView';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const currentUser = await getCurrentUser();

  if (currentUser?.role === 'BODEGUERO') {
    redirect('/bodega');
  }

  let projects = await getProjects();

  if (currentUser && currentUser.role !== 'ADMIN' && currentUser.assignedProjectIds.length > 0) {
    projects = projects.filter((p) => currentUser.assignedProjectIds.includes(p.id));
  }

  return <ProjectsListView projects={projects} />;
}

