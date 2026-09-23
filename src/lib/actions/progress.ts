'use server';

import { prisma } from '@/lib/prisma';

export interface RubroProgressItem {
  id: string;
  rubroNumber: number;
  description: string;
  unit: string;
  unitPrice: number;
  initialQuantity: number;
  currentQuantity: number;
  contractTotalAmount: number;
  accumQuantity: number;
  accumAmount: number;
  remainingQuantity: number;
  remainingAmount: number;
  progressPercent: number;
  status: 'COMPLETADO' | 'EN_EJECUCION' | 'SIN_INICIAR' | 'SUPERADO';
  isPrincipal: boolean;
  adjustmentsCount: number;
}

export interface ProgressEvolutionPoint {
  reportNumber: number;
  date: string;
  formattedDate: string;
  totalExecutedDay: number;
  totalExecutedAccum: number;
  progressPercentAccum: number;
  principalExecutedAccum: number;
  nonPrincipalExecutedAccum: number;
  lostRainHoursAccum: number;
  elapsedDays: number;
}

export interface ProjectAccumulatedProgress {
  project: {
    id: string;
    code: string;
    name: string;
    contractor: string;
    client: string;
    inspectionCompany: string;
    executingCompany: string;
    contractNumber: string;
    financingSource: string;
    roadSection: string;
    contractAmount: number;
    durationDays: number;
    startDate: string;
    status: string;
  };
  summary: {
    contractAmount: number;
    totalExecutedAccum: number;
    remainingAmount: number;
    progressPercent: number;
    durationDays: number;
    elapsedDays: number;
    remainingDays: number;
    timeConsumedPercent: number;
    schedulePerformanceIndex: number; // SPI = % avance / % tiempo
    principalExecutedAccum: number;
    nonPrincipalExecutedAccum: number;
    reportsCount: number;
    latestReportNumber: number;
    latestReportDate: string | null;
    totalLostRainHours: number;
  };
  rubros: RubroProgressItem[];
  evolution: ProgressEvolutionPoint[];
}

export async function getProjectAccumulatedProgress(
  projectId: string
): Promise<ProjectAccumulatedProgress | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      rubros: {
        include: {
          adjustments: true,
          dailyExecutions: {
            include: {
              dailyReport: {
                select: {
                  reportNumber: true,
                  date: true,
                },
              },
            },
            orderBy: {
              dailyReport: {
                reportNumber: 'desc',
              },
            },
          },
        },
        orderBy: { rubroNumber: 'asc' },
      },
      dailyReports: {
        orderBy: { reportNumber: 'asc' },
      },
    },
  });

  if (!project) return null;

  // 1. Process evolution over time based on daily reports
  const evolution: ProgressEvolutionPoint[] = project.dailyReports.map((rep) => {
    const d = new Date(rep.date);
    const formattedDate = d.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: 'short',
    });
    return {
      reportNumber: rep.reportNumber,
      date: rep.date.toISOString().split('T')[0],
      formattedDate,
      totalExecutedDay: rep.totalExecutedDay,
      totalExecutedAccum: rep.totalExecutedAccum,
      progressPercentAccum: rep.progressPercentAccum,
      principalExecutedAccum: rep.principalExecutedAccum,
      nonPrincipalExecutedAccum: rep.nonPrincipalExecutedAccum,
      lostRainHoursAccum: rep.lostRainHoursAccum,
      elapsedDays: rep.elapsedDays,
    };
  });

  const latestReport = project.dailyReports[project.dailyReports.length - 1];

  // 2. Process rubros progress
  const rubros: RubroProgressItem[] = project.rubros.map((r) => {
    // Look at latest execution or sum of executions
    const latestExecution = r.dailyExecutions[0]; // ordered desc by reportNumber
    const accumQuantity = latestExecution ? latestExecution.accumQuantity : 0;
    const accumAmount = latestExecution
      ? latestExecution.accumAmount
      : accumQuantity * r.unitPrice;

    const contractTotalAmount = r.currentQuantity * r.unitPrice;
    const remainingQuantity = Math.max(0, r.currentQuantity - accumQuantity);
    const remainingAmount = Math.max(0, contractTotalAmount - accumAmount);

    const progressPercent =
      r.currentQuantity > 0 ? (accumQuantity / r.currentQuantity) * 100 : 0;

    let status: 'COMPLETADO' | 'EN_EJECUCION' | 'SIN_INICIAR' | 'SUPERADO';
    if (progressPercent > 100.01) {
      status = 'SUPERADO';
    } else if (progressPercent >= 99.9) {
      status = 'COMPLETADO';
    } else if (progressPercent > 0) {
      status = 'EN_EJECUCION';
    } else {
      status = 'SIN_INICIAR';
    }

    return {
      id: r.id,
      rubroNumber: r.rubroNumber,
      description: r.description,
      unit: r.unit,
      unitPrice: r.unitPrice,
      initialQuantity: r.initialQuantity,
      currentQuantity: r.currentQuantity,
      contractTotalAmount,
      accumQuantity,
      accumAmount,
      remainingQuantity,
      remainingAmount,
      progressPercent,
      status,
      isPrincipal: r.isPrincipal,
      adjustmentsCount: r.adjustments.length,
    };
  });

  // 3. Summaries
  const totalExecutedAccum = latestReport
    ? latestReport.totalExecutedAccum
    : rubros.reduce((sum, r) => sum + r.accumAmount, 0);

  const remainingAmount = Math.max(0, project.contractAmount - totalExecutedAccum);
  const progressPercent =
    project.contractAmount > 0
      ? (totalExecutedAccum / project.contractAmount) * 100
      : 0;

  const elapsedDays = latestReport ? latestReport.elapsedDays : 0;
  const durationDays = project.durationDays || 240;
  const remainingDays = Math.max(0, durationDays - elapsedDays);
  const timeConsumedPercent = durationDays > 0 ? (elapsedDays / durationDays) * 100 : 0;
  const schedulePerformanceIndex =
    timeConsumedPercent > 0 ? progressPercent / timeConsumedPercent : 1;

  const principalExecutedAccum = latestReport
    ? latestReport.principalExecutedAccum
    : rubros.filter((r) => r.isPrincipal).reduce((sum, r) => sum + r.accumAmount, 0);

  const nonPrincipalExecutedAccum = latestReport
    ? latestReport.nonPrincipalExecutedAccum
    : rubros.filter((r) => !r.isPrincipal).reduce((sum, r) => sum + r.accumAmount, 0);

  return {
    project: {
      id: project.id,
      code: project.code,
      name: project.name,
      contractor: project.contractor,
      client: project.client,
      inspectionCompany: project.inspectionCompany,
      executingCompany: project.executingCompany,
      contractNumber: project.contractNumber,
      financingSource: project.financingSource,
      roadSection: project.roadSection,
      contractAmount: project.contractAmount,
      durationDays: project.durationDays,
      startDate: project.startDate.toISOString().split('T')[0],
      status: project.status,
    },
    summary: {
      contractAmount: project.contractAmount,
      totalExecutedAccum,
      remainingAmount,
      progressPercent,
      durationDays,
      elapsedDays,
      remainingDays,
      timeConsumedPercent,
      schedulePerformanceIndex,
      principalExecutedAccum,
      nonPrincipalExecutedAccum,
      reportsCount: project.dailyReports.length,
      latestReportNumber: latestReport ? latestReport.reportNumber : 0,
      latestReportDate: latestReport
        ? latestReport.date.toISOString().split('T')[0]
        : null,
      totalLostRainHours: latestReport ? latestReport.lostRainHoursAccum : 0,
    },
    rubros,
    evolution,
  };
}
