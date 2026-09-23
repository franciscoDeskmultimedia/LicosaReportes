import React from 'react';
import { prisma } from '@/lib/prisma';
import { getProjects } from '@/lib/actions/projects';
import { getMachineryList } from '@/lib/actions/machinery';
import { getWorkRequests } from '@/lib/actions/requests';
import { WorkRequestsView } from '@/components/WorkRequestsView';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function SolicitudesPage({ searchParams }: PageProps) {
  const currentUser = await requireAuth();

  const isAdmin = currentUser.role === 'ADMIN';
  const assignedProjectIds = isAdmin
    ? []
    : currentUser?.assignments?.map((a) => a.projectId) || [];

  const { projectId } = await searchParams;
  let projects = await getProjects();

  if (!isAdmin && assignedProjectIds.length > 0) {
    projects = projects.filter((p) => assignedProjectIds.includes(p.id));
  }

  // Get activeProjectId
  let activeProjectId = projectId;
  const projectListIds = projects.map((p) => p.id);
  if (activeProjectId && activeProjectId !== 'ALL' && !projectListIds.includes(activeProjectId)) {
    activeProjectId = projectListIds[0];
  }

  // Fetch materials, machinery and requests
  const [materials, machinery, requests] = await Promise.all([
    prisma.materialItem.findMany({
      orderBy: { name: 'asc' },
    }),
    getMachineryList(),
    getWorkRequests({ projectId: activeProjectId }),
  ]);

  const assignedRoles = currentUser?.assignments?.map((a) => a.roleInProject) || [];
  if (currentUser?.role && currentUser.role !== 'ADMIN' && currentUser.role !== 'ESTANDAR') {
    assignedRoles.push(currentUser.role);
  }

  const canApprove = isAdmin || assignedRoles.includes('RESIDENTE_OBRA') || assignedRoles.includes('FISCALIZADOR');
  const canDispatch = isAdmin || assignedRoles.includes('BODEGUERO') || assignedRoles.includes('RESIDENTE_OBRA');

  const projectOptions = projects.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
  }));

  const materialOptions = materials.map((m) => ({
    id: m.id,
    projectId: m.projectId,
    code: m.code,
    name: m.name,
    unit: m.unit,
    currentStock: m.currentStock,
  }));

  const machineryOptions = machinery.map((m) => ({
    id: m.id,
    code: m.code,
    name: m.name,
    category: m.category,
    unit: m.unit,
    status: m.status,
  }));

  return (
    <WorkRequestsView
      requests={requests as any}
      projects={projectOptions}
      materials={materialOptions}
      machinery={machineryOptions}
      selectedProjectId={activeProjectId}
      currentUserRole={currentUser?.role}
      isAdmin={isAdmin}
      canApprove={canApprove}
      canDispatch={canDispatch}
    />
  );
}
