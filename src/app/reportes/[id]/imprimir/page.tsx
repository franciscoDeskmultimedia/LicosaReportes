import React from 'react';
import { notFound } from 'next/navigation';
import { getDailyReportById } from '@/lib/actions/dailyReports';
import { OfficialReportDocument } from '@/components/OfficialReportDocument';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PrintReportPage({ params }: PageProps) {
  const { id } = await params;
  const report = await getDailyReportById(id);

  if (!report) {
    notFound();
  }

  return (
    <div className="bg-white min-h-screen py-4">
      <OfficialReportDocument report={report as any} />
    </div>
  );
}
