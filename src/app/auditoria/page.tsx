import React from 'react';
import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAuditLogs } from '@/lib/audit';
import { getProjects } from '@/lib/actions/projects';
import { AuditLogView } from '@/components/AuditLogView';

export const metadata = {
  title: 'Pista de Auditoría & Trazabilidad | LICOSA',
  description: 'Bitácora y registro de auditoría de todas las acciones del sistema vial y bodega',
};

export default async function AuditoriaPage() {
  const currentUser = await requireAuth();

  // Residentes y Administradores tienen acceso a la pista de auditoría
  const isAdmin = currentUser.role === 'ADMIN';
  const hasResidentAccess =
    isAdmin ||
    currentUser.role === 'RESIDENTE_OBRA' ||
    currentUser.assignments?.some((a) => a.roleInProject === 'RESIDENTE_OBRA');

  if (!hasResidentAccess) {
    redirect('/bodega');
  }

  const [rawLogs, projects] = await Promise.all([
    getAuditLogs({ limit: 150 }),
    getProjects(),
  ]);

  // Serializar fechas para pasar limpiamente a Client Component
  const logs = rawLogs.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
  }));

  const projectOptions = projects.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
  }));

  return (
    <div className="max-w-7xl mx-auto">
      <AuditLogView logs={logs} projects={projectOptions} />
    </div>
  );
}
