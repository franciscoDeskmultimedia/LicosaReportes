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
  Edit3,
  History,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { DailyReportHtmlDashboard } from '@/components/DailyReportHtmlDashboard';
import { OfficialReportDocument } from '@/components/OfficialReportDocument';
import { deleteDailyReport } from '@/lib/actions/dailyReports';
import { formatReportDate } from '@/lib/dateUtils';

interface DailyReportUnifiedViewProps {
  report: any;
  initialView?: 'html' | 'pdf';
  isAdmin?: boolean;
  canEdit?: boolean;
}

export function DailyReportUnifiedView({
  report,
  initialView = 'html',
  isAdmin = false,
  canEdit = false,
}: DailyReportUnifiedViewProps) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<'html' | 'pdf'>(initialView);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!report) return null;

  const project = report.project;
  const formattedDate = formatReportDate(report.date);

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

          {/* Admin Edit Action Button */}
          <Link
            href={`/reportes/${report.id}/editar`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Editar Reporte Diario (Administrador)"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-950" />
            <span>Editar Reporte</span>
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

      {/* Edit Audit Trail Notice Banner */}
      {report.editAuditLogs && report.editAuditLogs.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-amber-950 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <span className="p-2 bg-amber-200/70 text-amber-900 rounded-xl shrink-0">
              <History className="w-5 h-5 text-amber-700" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-black text-amber-950 text-sm">Reporte Diario Modificado por Administrador</span>
                <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full text-[10px] font-bold border border-amber-300">
                  {report.editAuditLogs.length} modificación(es) registrada(s)
                </span>
              </div>
              {(() => {
                const latest = report.editAuditLogs[0];
                const meta = JSON.parse(latest.metadata || '{}');
                return (
                  <p className="text-[11px] text-amber-800 mt-1">
                    Última edición por <strong>{latest.userName}</strong> ({latest.userRole}) el {new Date(latest.createdAt).toLocaleString('es-EC')}
                    {meta.reason ? ` • Motivo: "${meta.reason}"` : ''}
                    {meta.changesSummary ? ` • ${meta.changesSummary}` : ''}
                  </p>
                );
              })()}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setHistoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-amber-100/60 text-amber-950 font-bold rounded-xl text-xs shadow-xs border border-amber-300 transition-all cursor-pointer self-start md:self-auto shrink-0"
          >
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            <span>Ver Detalle de Cambios</span>
          </button>
        </div>
      )}

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

      {/* History & Changes Modal */}
      {historyModalOpen && report.editAuditLogs && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl text-slate-900 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <History className="w-5 h-5 text-amber-700" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Historial de Modificaciones del Reporte N° {String(report.reportNumber).padStart(3, '0')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Registro de auditoría: quién, cuándo y qué valores específicos se alteraron.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              {report.editAuditLogs.map((log: any, logIdx: number) => {
                const meta = JSON.parse(log.metadata || '{}');
                const hasChanges = Array.isArray(meta.changes) && meta.changes.length > 0;

                return (
                  <div key={log.id || logIdx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2 text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{log.userName}</span>{' '}
                        <span className="text-slate-500">({log.userEmail})</span>
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-mono text-[10px]">
                          {log.userRole}
                        </span>
                      </div>
                      <span className="text-slate-500 text-[11px] font-mono">
                        {new Date(log.createdAt).toLocaleString('es-EC')}
                      </span>
                    </div>

                    {meta.reason && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                        <strong className="block text-[10px] uppercase tracking-wider text-amber-800 mb-0.5">Motivo Técnico:</strong>
                        <p className="italic font-medium">"{meta.reason}"</p>
                      </div>
                    )}

                    {hasChanges ? (
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-2">Área</th>
                              <th className="p-2">Elemento Modificado</th>
                              <th className="p-2">Valor Anterior</th>
                              <th className="p-2">Valor Nuevo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {meta.changes.map((ch: any, cIdx: number) => (
                              <tr key={cIdx} className="hover:bg-slate-50/80">
                                <td className="p-2">
                                  <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[9.5px] font-bold">
                                    {ch.category || 'General'}
                                  </span>
                                </td>
                                <td className="p-2 font-medium text-slate-900">
                                  {ch.label || ch.field}
                                </td>
                                <td className="p-2 font-mono text-rose-800 bg-rose-50/40 text-[11px]">
                                  {String(ch.oldValue)}
                                </td>
                                <td className="p-2 font-mono font-semibold text-emerald-800 bg-emerald-50/40 text-[11px]">
                                  {String(ch.newValue)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600">
                        {log.description}
                      </p>
                    )}

                    {meta.financialImpact && (
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <span className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700">
                          Avance anterior: <strong>${Number(meta.financialImpact.previousExecutedDay || 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}</strong>
                        </span>
                        <span className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-emerald-700 font-bold">
                          Nuevo avance: ${Number(meta.financialImpact.newExecutedDay || 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <Link
                href="/auditoria"
                className="text-xs text-orange-600 hover:text-orange-700 font-bold"
              >
                Ver registro general en Pista de Auditoría →
              </Link>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
