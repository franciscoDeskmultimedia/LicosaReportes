'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  FileText,
  Printer,
  ArrowLeft,
  Calendar,
  Sparkles,
  Download,
  Share2,
} from 'lucide-react';
import { DailyReportHtmlDashboard } from '@/components/DailyReportHtmlDashboard';
import { OfficialReportDocument } from '@/components/OfficialReportDocument';

interface DailyReportUnifiedViewProps {
  report: any;
  initialView?: 'html' | 'pdf';
}

export function DailyReportUnifiedView({
  report,
  initialView = 'html',
}: DailyReportUnifiedViewProps) {
  const [activeView, setActiveView] = useState<'html' | 'pdf'>(initialView);

  if (!report) return null;

  const project = report.project;
  const reportDate = new Date(report.date);
  const formattedDate = reportDate.toLocaleDateString('es-EC', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Top Floating Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Breadcrumbs & Report Info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link
              href={project?.id ? `/proyectos/${project.id}?tab=reportes` : '/reportes'}
              className="inline-flex items-center gap-1 font-semibold text-orange-600 hover:text-orange-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a {project?.code ? `[${project.code}]` : 'Reportes'}</span>
            </Link>
            <span>•</span>
            <span className="text-slate-400">Reporte Diario de Obra</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-black text-slate-900">
              Reporte Diario N° {String(report.reportNumber).padStart(3, '0')}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
              Día {report.elapsedDays} de {report.totalDays}
            </span>
            <span className="text-xs text-slate-500 font-medium capitalize">
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Right: Dual View Mode Selector & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented View Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveView('html')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeView === 'html'
                  ? 'bg-white text-orange-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-orange-600" />
              <span>Versión HTML Visual</span>
            </button>

            <button
              onClick={() => setActiveView('pdf')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeView === 'pdf'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Versión PDF / A4 Oficial</span>
            </button>
          </div>

          {/* Direct Print Button */}
          <Link
            href={`/reportes/${report.id}/imprimir`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            title="Abrir vista de impresión y guardar como PDF"
          >
            <Printer className="w-4 h-4 text-orange-400" />
            <span>Imprimir / PDF</span>
          </Link>
        </div>
      </div>

      {/* Main View Container */}
      {activeView === 'html' ? (
        <DailyReportHtmlDashboard
          report={report}
          project={project}
          onToggleOfficialView={() => setActiveView('pdf')}
          showingOfficialView={false}
        />
      ) : (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>
                Estás visualizando el <strong>Formato Oficial Impreso A4</strong> con estructura tabular reglamentaria para firmas de fiscalización.
              </span>
            </div>
            <button
              onClick={() => setActiveView('html')}
              className="font-bold underline text-amber-900 hover:text-amber-950 cursor-pointer self-start sm:self-auto"
            >
              Cambiar a Versión HTML Visual
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-8">
            <OfficialReportDocument report={report} embedded={true} />
          </div>
        </div>
      )}
    </div>
  );
}
