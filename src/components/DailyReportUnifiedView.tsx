'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  FileText,
  Printer,
  ArrowLeft,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
} from 'lucide-react';
import { DailyReportHtmlDashboard } from '@/components/DailyReportHtmlDashboard';
import { OfficialReportDocument } from '@/components/OfficialReportDocument';
import { deleteDailyReport } from '@/lib/actions/dailyReports';

interface DailyReportUnifiedViewProps {
  report: any;
  initialView?: 'html' | 'pdf';
  isAdmin?: boolean;
}

export function DailyReportUnifiedView({
  report,
  initialView = 'html',
  isAdmin = false,
}: DailyReportUnifiedViewProps) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<'html' | 'pdf'>(initialView);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!report) return null;

  const project = report.project;
  const reportDate = new Date(report.date);
  const formattedDate = reportDate.toLocaleDateString('es-EC', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setDeleteError(null);
      await deleteDailyReport(report.id);
      setDeleteModalOpen(false);
      router.push(project?.id ? `/proyectos/${project.id}?tab=reportes` : '/reportes');
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setDeleteError(err.message || 'Error al eliminar el reporte');
      setDeleting(false);
    }
  };

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
        <div className="flex flex-wrap items-center gap-2.5">
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
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            title="Abrir vista de impresión y guardar como PDF"
          >
            <Printer className="w-4 h-4 text-orange-400" />
            <span>Imprimir / PDF</span>
          </Link>

          {/* Admin Delete Action Button */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setDeleteError(null);
                setDeleteModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="Eliminar Reporte Diario (Solo Administradores)"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Eliminar</span>
            </button>
          )}
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
              className="font-bold underline text-amber-900 hover:text-amber-955 cursor-pointer self-start sm:self-auto"
            >
              Cambiar a Versión HTML Visual
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-8">
            <OfficialReportDocument report={report} embedded={true} />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-900 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                ¿Eliminar Reporte Diario N° {report.reportNumber}?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Obra: <strong>[{project?.code}] {project?.name}</strong> • Fecha: {formattedDate}
              </p>
            </div>

            <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-2">
              <p className="font-semibold">Esta acción es irreversible:</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-800">
                <li>Se eliminarán las ejecuciones de rubros registradas en este día.</li>
                <li>Se descontarán las horas de maquinaria trabajadas en esta fecha.</li>
                <li>Se registrará un evento permanente en la bitácora de auditoría.</li>
              </ul>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-100 text-rose-800 rounded-xl text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sí, Eliminar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
