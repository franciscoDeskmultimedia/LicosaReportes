'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { recordAuditLog } from '@/lib/audit';

export async function getDailyReports(projectId?: string) {
  return await prisma.dailyReport.findMany({
    where: projectId ? { projectId } : undefined,
    orderBy: { reportNumber: 'desc' },
    include: {
      project: true,
      rubroExecutions: {
        include: {
          projectRubro: true,
        },
      },
      machineryLogs: true,
      personnelLogs: true,
    },
  });
}

export async function getDailyReportById(id: string) {
  return await prisma.dailyReport.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          rubros: {
            orderBy: { rubroNumber: 'asc' },
          },
        },
      },
      rubroExecutions: {
        include: {
          projectRubro: true,
        },
        orderBy: {
          projectRubro: {
            rubroNumber: 'asc',
          },
        },
      },
      machineryLogs: {
        include: {
          machinery: true,
        },
      },
      personnelLogs: true,
      hourlyWeather: {
        orderBy: { timeSlot: 'asc' },
      },
    },
  });
}

export async function getPreviousReportStats(projectId: string) {
  const lastReport = await prisma.dailyReport.findFirst({
    where: { projectId },
    orderBy: { reportNumber: 'desc' },
    include: {
      rubroExecutions: true,
      project: true,
    },
  });

  return lastReport;
}

export async function createDailyReport(data: {
  projectId: string;
  reportNumber: number;
  date: string;
  roadSection: string;
  elapsedDays: number;
  totalDays: number;
  // Clima & EHS
  rainHoursDay: number;
  rainHoursNight: number;
  lostRainHoursDay: number;
  lostRainHoursAccum: number;
  safetyTalkMinutesDay: number;
  safetyTalkMinutesAccum: number;
  incidentsDay: number;
  incidentsAccum: number;
  accidentsDay: number;
  accidentsAccum: number;
  // Actividades
  activitiesTodayVial?: string;
  activitiesTodayPavimento?: string;
  activitiesTodayDrenaje?: string;
  activitiesTodayPuentes?: string;
  activitiesTodayTopografia?: string;
  activitiesTodaySenalizacion?: string;
  activitiesTodayAmbiental?: string;
  activitiesTomorrowVial?: string;
  activitiesTomorrowPavimento?: string;
  activitiesTomorrowDrenaje?: string;
  activitiesTomorrowPuentes?: string;
  activitiesTomorrowTopografia?: string;
  activitiesTomorrowSenalizacion?: string;
  activitiesTomorrowAmbiental?: string;
  // Novedades & Comentarios
  noveltiesRisks?: string;
  contractorComments?: string;
  supervisorComments?: string;
  // Firmas
  preparedByName?: string;
  preparedByTitle?: string;
  reviewedByName?: string;
  reviewedByTitle?: string;
  // Relaciones
  rubroExecutions: Array<{
    projectRubroId: string;
    dayQuantity: number;
    accumQuantity: number;
    dayAmount: number;
    accumAmount: number;
  }>;
  // Maquinaria
  machineryLogs: Array<{
    machineryId?: string;
    description: string;
    unit: string;
    quantity: number;
    dayHours: number;
    notes?: string;
  }>;
  // Personal
  personnelLogs: Array<{
    categoryRole: string;
    quantity: number;
    manHoursDay: number;
  }>;
  // Clima Horario
  hourlyWeather: Array<{
    timeSlot: string;
    conditionCode: number;
  }>;
}) {
  // Calcular totales
  const totalExecutedDay = data.rubroExecutions.reduce((sum, r) => sum + r.dayAmount, 0);
  const totalExecutedAccum = data.rubroExecutions.reduce((sum, r) => sum + r.accumAmount, 0);

  // Obtener monto contractual del proyecto para calcular % acumulado
  const project = await prisma.project.findUnique({
    where: { id: data.projectId },
    include: { rubros: true },
  });

  const contractTotal = project?.contractAmount || 1;
  const progressPercentAccum = (totalExecutedAccum / contractTotal) * 100;

  // Separar principal vs no principal
  let principalExecutedDay = 0;
  let principalExecutedAccum = 0;
  let nonPrincipalExecutedDay = 0;
  let nonPrincipalExecutedAccum = 0;

  if (project?.rubros) {
    const rubroMap = new Map(project.rubros.map((r) => [r.id, r.isPrincipal]));
    for (const exec of data.rubroExecutions) {
      if (rubroMap.get(exec.projectRubroId)) {
        principalExecutedDay += exec.dayAmount;
        principalExecutedAccum += exec.accumAmount;
      } else {
        nonPrincipalExecutedDay += exec.dayAmount;
        nonPrincipalExecutedAccum += exec.accumAmount;
      }
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Report
    const report = await tx.dailyReport.create({
      data: {
        projectId: data.projectId,
        reportNumber: data.reportNumber,
        date: new Date(data.date),
        roadSection: data.roadSection,
        elapsedDays: data.elapsedDays,
        totalDays: data.totalDays,
        totalExecutedDay,
        totalExecutedAccum,
        principalExecutedDay,
        principalExecutedAccum,
        nonPrincipalExecutedDay,
        nonPrincipalExecutedAccum,
        progressPercentAccum,
        // Clima & EHS
        rainHoursDay: data.rainHoursDay,
        rainHoursNight: data.rainHoursNight,
        lostRainHoursDay: data.lostRainHoursDay,
        lostRainHoursAccum: data.lostRainHoursAccum,
        safetyTalkMinutesDay: data.safetyTalkMinutesDay,
        safetyTalkMinutesAccum: data.safetyTalkMinutesAccum,
        incidentsDay: data.incidentsDay,
        incidentsAccum: data.incidentsAccum,
        accidentsDay: data.accidentsDay,
        accidentsAccum: data.accidentsAccum,
        // Actividades
        activitiesTodayVial: data.activitiesTodayVial,
        activitiesTodayPavimento: data.activitiesTodayPavimento,
        activitiesTodayDrenaje: data.activitiesTodayDrenaje,
        activitiesTodayPuentes: data.activitiesTodayPuentes,
        activitiesTodayTopografia: data.activitiesTodayTopografia,
        activitiesTodaySenalizacion: data.activitiesTodaySenalizacion,
        activitiesTodayAmbiental: data.activitiesTodayAmbiental,
        activitiesTomorrowVial: data.activitiesTomorrowVial,
        activitiesTomorrowPavimento: data.activitiesTomorrowPavimento,
        activitiesTomorrowDrenaje: data.activitiesTomorrowDrenaje,
        activitiesTomorrowPuentes: data.activitiesTomorrowPuentes,
        activitiesTomorrowTopografia: data.activitiesTomorrowTopografia,
        activitiesTomorrowSenalizacion: data.activitiesTomorrowSenalizacion,
        activitiesTomorrowAmbiental: data.activitiesTomorrowAmbiental,
        // Observaciones
        noveltiesRisks: data.noveltiesRisks,
        contractorComments: data.contractorComments,
        supervisorComments: data.supervisorComments,
        // Firmas
        preparedByName: data.preparedByName,
        preparedByTitle: data.preparedByTitle,
        reviewedByName: data.reviewedByName,
        reviewedByTitle: data.reviewedByTitle,
      },
    });

    // 2. Insert Rubros
    for (const r of data.rubroExecutions) {
      await tx.dailyRubroExecution.create({
        data: {
          dailyReportId: report.id,
          projectRubroId: r.projectRubroId,
          dayQuantity: r.dayQuantity,
          accumQuantity: r.accumQuantity,
          dayAmount: r.dayAmount,
          accumAmount: r.accumAmount,
        },
      });
    }

    // 3. Insert Machinery Logs
    for (const m of data.machineryLogs) {
      await tx.dailyReportMachinery.create({
        data: {
          dailyReportId: report.id,
          machineryId: m.machineryId,
          description: m.description,
          unit: m.unit,
          quantity: m.quantity,
          dayHours: m.dayHours,
          notes: m.notes,
        },
      });

      // Update machine total hours worked
      if (m.machineryId && m.dayHours > 0) {
        await tx.machinery.update({
          where: { id: m.machineryId },
          data: {
            totalHoursWorked: {
              increment: m.dayHours,
            },
          },
        });
      }
    }

    // 4. Insert Personnel Logs
    for (const p of data.personnelLogs) {
      await tx.dailyReportPersonnel.create({
        data: {
          dailyReportId: report.id,
          categoryRole: p.categoryRole,
          quantity: p.quantity,
          manHoursDay: p.manHoursDay,
          totalManHours: p.quantity * p.manHoursDay,
        },
      });
    }

    // 5. Insert Hourly Weather
    for (const w of data.hourlyWeather) {
      await tx.dailyHourlyWeather.create({
        data: {
          dailyReportId: report.id,
          timeSlot: w.timeSlot,
          conditionCode: w.conditionCode,
        },
      });
    }

    return report;
  });

  await recordAuditLog({
    action: 'REPORTE_DIARIO_CREADO',
    entityType: 'DailyReport',
    entityId: result.id,
    description: `Emisión de Reporte Diario N° ${data.reportNumber} (Fecha: ${data.date.substring(0, 10)}, Tramo: ${data.roadSection}) - Avance día: $${totalExecutedDay.toLocaleString('es-EC', { minimumFractionDigits: 2 })} (${progressPercentAccum.toFixed(2)}% acum.)`,
    projectId: data.projectId,
    metadata: {
      reportNumber: data.reportNumber,
      date: data.date,
      roadSection: data.roadSection,
      totalExecutedDay,
      totalExecutedAccum,
      progressPercentAccum: Number(progressPercentAccum.toFixed(2)),
      preparedBy: data.preparedByName,
      reviewedBy: data.reviewedByName,
    },
  });

  revalidatePath('/reportes');
  revalidatePath('/');
  return result;
}

export async function deleteDailyReport(id: string) {
  const existing = await prisma.dailyReport.findUnique({
    where: { id },
  });

  await prisma.dailyReport.delete({
    where: { id },
  });

  if (existing) {
    await recordAuditLog({
      action: 'REPORTE_DIARIO_ELIMINADO',
      entityType: 'DailyReport',
      entityId: id,
      description: `Eliminación de Reporte Diario N° ${existing.reportNumber} de la obra`,
      projectId: existing.projectId,
      metadata: {
        reportNumber: existing.reportNumber,
        roadSection: existing.roadSection,
      },
    });
  }

  revalidatePath('/reportes');
  revalidatePath('/');
  return { success: true };
}
