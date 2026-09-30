import React from 'react';
import { notFound } from 'next/navigation';
import { getDailyReportById } from '@/lib/actions/dailyReports';
import { DailyReportUnifiedView } from '@/components/DailyReportUnifiedView';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}

export default async function DailyReportDetailPage({ params, searchParams }: PageProps) {
  await requireAuth();
  const { id } = await params;
  const { view } = await searchParams;
  const report = await getDailyReportById(id);

  if (!report) {
    notFound();
  }

  const initialView = view === 'pdf' ? 'pdf' : 'html';

  return <DailyReportUnifiedView report={report as any} initialView={initialView} />;
}
