import React from 'react';
import {
  getStorageInventory,
  getStorageReceipts,
  getStorageMovements,
} from '@/lib/actions/storage';
import { getProjects } from '@/lib/actions/projects';
import { StorageView } from '@/components/StorageView';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function BodegaPage({ searchParams }: PageProps) {
  const { projectId } = await searchParams;
  const currentUser = await requireAuth();
  let projects = await getProjects();

  // If non-admin user has assigned projects, restrict to their assigned projects
  if (currentUser && currentUser.role !== 'ADMIN' && currentUser.assignedProjectIds.length > 0) {
    projects = projects.filter((p) => currentUser.assignedProjectIds.includes(p.id));
  }

  // If user requested a project they cannot access or didn't specify one, default to first accessible project
  let activeProjectId = projectId;
  const allowedProjectIds = projects.map((p) => p.id);

  if (activeProjectId && !allowedProjectIds.includes(activeProjectId)) {
    activeProjectId = allowedProjectIds[0];
  } else if (!activeProjectId && projects.length > 0) {
    activeProjectId = projects[0].id;
  }

  const [materials, receipts, movements] = await Promise.all([
    getStorageInventory(activeProjectId),
    getStorageReceipts(activeProjectId),
    getStorageMovements(activeProjectId),
  ]);

  return (
    <StorageView
      materials={materials}
      receipts={receipts}
      movements={movements}
      projects={projects}
      selectedProjectId={activeProjectId}
      currentUser={currentUser}
    />
  );
}

