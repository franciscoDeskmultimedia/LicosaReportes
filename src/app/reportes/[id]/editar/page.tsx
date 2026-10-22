import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getDailyReportById } from '@/lib/actions/dailyReports';
import { getMachineryList } from '@/lib/actions/machinery';
import { EditDailyReportForm } from '@/components/EditDailyReportForm';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDailyReportPage({ params }: PageProps) {
  const currentUser = await requireAuth();

  // Solo Administradores y Residentes de Obra autorizados pueden editar reportes diarios
  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'RESIDENTE_OBRA') {
    const { id } = await params;
    redirect(`/reportes/${id}?unauthorized=1`);
  }

  const { id } = await params;
  const report = await getDailyReportById(id);

  if (!report) {
    notFound();
  }

  const [project, machinery] = await Promise.all([
    prisma.project.findUnique({
      where: { id: report.projectId },
      include: {
        rubros: {
          orderBy: { rubroNumber: 'asc' },
        },
      },
    }),
    getMachineryList(),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <EditDailyReportForm
      report={report as any}
      project={project as any}
      machinery={machinery}
    />
  );
}
