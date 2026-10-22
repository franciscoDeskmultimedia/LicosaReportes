'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { recordAuditLog } from '@/lib/audit';
import { toSafeUTCDate } from '@/lib/dateUtils';

export async function getDailyReports(projectId?: string) {
  const where: any = {};
  if (projectId && projectId !== 'ALL') {
    where.projectId = projectId;
  }

  return await prisma.dailyReport.findMany({
    where,
    orderBy: [
      { date: 'desc' },
      { reportNumber: 'desc' },
    ],
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
  const report = await prisma.dailyReport.findUnique({
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

function normalizeMachKey(desc?: string | null, machCode?: string | null): string {
  const str = (machCode || desc || '').toUpperCase().trim();
  const clean = str.replace(/[^A-Z0-9]/g, '');
  if (clean.includes('EX') && clean.match(/EX\d+/)) {
    return clean.match(/EX\d+/)![0];
  }
  if (clean.includes('TR') && clean.match(/TR\d+/)) {
    return clean.match(/TR\d+/)![0];
  }
  if (clean.includes('RL') && clean.match(/RL\d+/)) {
    return clean.match(/RL\d+/)![0];
  }
  if (clean.includes('VQ') && clean.match(/VQ\d+/)) {
    return clean.match(/VQ\d+/)![0];
  }
  return clean || str;
}

  if (!report) return null;

  // Requisito: Horas acumuladas de maquinaria hasta este reporte.
  // Sería las horas de este reporte más las horas de reportes antiguos, sin actualizar con reportes posteriores.
  const priorLogs = await prisma.dailyReportMachinery.findMany({
    where: {
      dailyReport: {
        projectId: report.projectId,
        OR: [
          { reportNumber: { lte: report.reportNumber } },
          { date: { lte: report.date } },
        ],
      },
    },
    select: {
      machineryId: true,
      description: true,
      dayHours: true,
      machinery: {
        select: {
          code: true,
          hourlyRate: true,
        },
      },
    },
  });

  const accumByKey = new Map<string, number>();

  for (const log of priorLogs) {
    const key = log.machineryId || normalizeMachKey(log.description, log.machinery?.code);
    accumByKey.set(key, (accumByKey.get(key) || 0) + (log.dayHours || 0));

    const norm = normalizeMachKey(log.description, log.machinery?.code);
    if (norm && norm !== key) {
      accumByKey.set(norm, (accumByKey.get(norm) || 0) + (log.dayHours || 0));
    }
  }

  const machineryLogsWithAccum = report.machineryLogs.map((m) => {
    const key = m.machineryId || normalizeMachKey(m.description, m.machinery?.code);
    const norm = normalizeMachKey(m.description, m.machinery?.code);
    let accum = accumByKey.get(key);
    if (accum === undefined) {
      accum = accumByKey.get(norm);
    }
    if (accum === undefined || accum === 0) {
      accum = m.dayHours;
    }
    return {
      ...m,
      accumHours: accum,
      hourlyRate: m.hourlyRate ?? m.machinery?.hourlyRate ?? 0,
    };
  });

  const editAuditLogs = await prisma.auditLog.findMany({
    where: {
      entityType: 'DailyReport',
      entityId: id,
      action: 'REPORTE_DIARIO_EDITADO',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return {
    ...report,
    machineryLogs: machineryLogsWithAccum,
    editAuditLogs,
  };
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

  if (!lastReport) return null;

  // Horas acumuladas históricas por maquinaria para precargar en nuevos reportes
  const allPriorLogs = await prisma.dailyReportMachinery.findMany({
    where: {
      dailyReport: {
        projectId,
        reportNumber: { lte: lastReport.reportNumber },
      },
    },
    select: {
      machineryId: true,
      dayHours: true,
    },
  });

  const previousMachineryHours: Record<string, number> = {};
  for (const log of allPriorLogs) {
    if (log.machineryId) {
      previousMachineryHours[log.machineryId] = (previousMachineryHours[log.machineryId] || 0) + (log.dayHours || 0);
    }
  }

  return {
    ...lastReport,
    previousMachineryHours,
  };
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
        date: toSafeUTCDate(data.date),
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

  // Disparar Notificación Web Push a los dispositivos suscritos
  try {
    const proj = await prisma.project.findUnique({
      where: { id: data.projectId },
      select: { code: true, name: true },
    });
    const { notifyNewDailyReport } = await import('@/lib/pushNotifications');
    await notifyNewDailyReport({
      id: result.id,
      reportNumber: data.reportNumber,
      projectCode: proj?.code || 'OBRA',
      projectName: proj?.name || 'Obra en ejecución',
      engineerName: data.reviewedByName || data.preparedByName,
      dateStr: data.date.substring(0, 10),
    });
  } catch (pushErr) {
    console.error('Error al enviar notificación push de reporte diario:', pushErr);
  }

  revalidatePath('/reportes');
  revalidatePath('/');
  return result;
}

export async function deleteDailyReport(id: string) {
  const { getCurrentUser } = await import('@/lib/auth');
  const user = await getCurrentUser();

  if (!user || (user.role !== 'ADMIN' && user.role !== 'RESIDENTE_OBRA')) {
    throw new Error('No autorizado. Solo los administradores o residentes pueden eliminar reportes diarios.');
  }

  const existing = await prisma.dailyReport.findUnique({
    where: { id },
    include: {
      machineryLogs: true,
      project: { select: { id: true, code: true, name: true } },
    },
  });

  if (!existing) {
    throw new Error('El reporte diario no existe o ya fue eliminado.');
  }

  if (user.role === 'RESIDENTE_OBRA' && user.assignedProjectIds && user.assignedProjectIds.length > 0 && !user.assignedProjectIds.includes(existing.projectId)) {
    throw new Error('No autorizado. No tiene permisos para eliminar reportes de esta obra.');
  }

  await prisma.$transaction(async (tx) => {
    // 1. Revertir horas acumuladas en maquinaria si correspondía
    for (const m of existing.machineryLogs) {
      if (m.machineryId && m.dayHours > 0) {
        await tx.machinery.update({
          where: { id: m.machineryId },
          data: {
            totalHoursWorked: {
              decrement: m.dayHours,
            },
          },
        }).catch(() => null);
      }
    }

    // 2. Eliminar el reporte (DailyReportMachinery, DailyReportPersonnel, rubroExecutions se borran en cascada)
    await tx.dailyReport.delete({
      where: { id },
    });
  });

  await recordAuditLog({
    action: 'REPORTE_DIARIO_ELIMINADO',
    entityType: 'DailyReport',
    entityId: id,
    description: `Eliminación de Reporte Diario N° ${existing.reportNumber} (Fecha: ${existing.date.toISOString().substring(0, 10)}) de la obra [${existing.project.code}] por administrador ${user.name}`,
    projectId: existing.projectId,
    metadata: {
      reportNumber: existing.reportNumber,
      roadSection: existing.roadSection,
      deletedBy: user.name,
      deletedByEmail: user.email,
    },
  });

  revalidatePath('/reportes');
  revalidatePath(`/proyectos/${existing.projectId}`);
  revalidatePath('/maquinaria');
  revalidatePath('/');
  return { success: true };
}

export async function updateDailyReport(data: {
  id: string;
  reportNumber: number;
  date: string;
  roadSection: string;
  elapsedDays: number;
  totalDays: number;
  reason?: string;
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
  // Observaciones
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
  machineryLogs: Array<{
    machineryId?: string;
    description: string;
    unit: string;
    quantity: number;
    dayHours: number;
    notes?: string;
  }>;
  personnelLogs: Array<{
    categoryRole: string;
    quantity: number;
    manHoursDay: number;
  }>;
  hourlyWeather: Array<{
    timeSlot: string;
    conditionCode: number;
  }>;
}) {
  const { getCurrentUser } = await import('@/lib/auth');
  const user = await getCurrentUser();

  if (!user || (user.role !== 'ADMIN' && user.role !== 'RESIDENTE_OBRA')) {
    throw new Error('No autorizado. Solo administradores o residentes de obra autorizados tienen permiso para editar reportes diarios.');
  }

  const existingReport = await prisma.dailyReport.findUnique({
    where: { id: data.id },
    include: {
      project: {
        include: {
          rubros: true,
        },
      },
      rubroExecutions: {
        include: {
          projectRubro: true,
        },
      },
      machineryLogs: true,
      personnelLogs: true,
      hourlyWeather: true,
    },
  });

  if (!existingReport) {
    throw new Error('El reporte diario a modificar no existe.');
  }

  // Detectar cambios detallados
  const changes: Array<{
    category: string;
    field: string;
    label: string;
    oldValue: any;
    newValue: any;
  }> = [];

  const checkChange = (category: string, field: string, label: string, oldVal: any, newVal: any) => {
    const normOld = oldVal === null || oldVal === undefined ? '' : String(oldVal).trim();
    const normNew = newVal === null || newVal === undefined ? '' : String(newVal).trim();
    if (normOld !== normNew) {
      changes.push({ category, field, label, oldValue: oldVal ?? '—', newValue: newVal ?? '—' });
    }
  };

  const checkNumChange = (category: string, field: string, label: string, oldVal: number, newVal: number, unit = '') => {
    if (Math.abs((oldVal || 0) - (newVal || 0)) > 0.0001) {
      changes.push({
        category,
        field,
        label,
        oldValue: `${Number(oldVal || 0).toLocaleString('es-EC', { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`,
        newValue: `${Number(newVal || 0).toLocaleString('es-EC', { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`,
      });
    }
  };

  // 1. General
  checkNumChange('General', 'reportNumber', 'N° de Reporte', existingReport.reportNumber, data.reportNumber);
  const oldDateStr = existingReport.date.toISOString().substring(0, 10);
  const newDateStr = data.date.substring(0, 10);
  if (oldDateStr !== newDateStr) {
    changes.push({ category: 'General', field: 'date', label: 'Fecha de Reporte', oldValue: oldDateStr, newValue: newDateStr });
  }
  checkChange('General', 'roadSection', 'Tramo / Frente', existingReport.roadSection, data.roadSection);
  checkNumChange('General', 'elapsedDays', 'Días Transcurridos', existingReport.elapsedDays, data.elapsedDays);
  checkNumChange('General', 'totalDays', 'Plazo Total Contractual', existingReport.totalDays, data.totalDays, 'días');

  // 2. Clima & EHS
  checkNumChange('Clima & EHS', 'rainHoursDay', 'Horas Lluvia Día', existingReport.rainHoursDay, data.rainHoursDay, 'h');
  checkNumChange('Clima & EHS', 'rainHoursNight', 'Horas Lluvia Noche', existingReport.rainHoursNight, data.rainHoursNight, 'h');
  checkNumChange('Clima & EHS', 'lostRainHoursDay', 'Horas Perdidas Lluvia', existingReport.lostRainHoursDay, data.lostRainHoursDay, 'h');
  checkNumChange('Clima & EHS', 'safetyTalkMinutesDay', 'Charla de Seguridad', existingReport.safetyTalkMinutesDay, data.safetyTalkMinutesDay, 'min');
  checkNumChange('Clima & EHS', 'incidentsDay', 'Incidentes Día', existingReport.incidentsDay, data.incidentsDay);
  checkNumChange('Clima & EHS', 'accidentsDay', 'Accidentes Día', existingReport.accidentsDay, data.accidentsDay);

  // 3. Rubros
  const rubroExecMapOld = new Map(existingReport.rubroExecutions.map((e) => [e.projectRubroId, e]));
  const rubroMap = new Map(existingReport.project.rubros.map((r) => [r.id, r]));

  for (const rNew of data.rubroExecutions) {
    const rOld = rubroExecMapOld.get(rNew.projectRubroId);
    const rubroInfo = rubroMap.get(rNew.projectRubroId);
    const labelPrefix = rubroInfo ? `Rubro ${rubroInfo.rubroNumber} (${rubroInfo.description})` : `Rubro`;
    const unit = rubroInfo?.unit || '';

    if (rOld) {
      if (Math.abs(rOld.dayQuantity - rNew.dayQuantity) > 0.0001) {
        changes.push({
          category: 'Rubros',
          field: `rubro_${rNew.projectRubroId}_qty`,
          label: `${labelPrefix} - Cantidad Día`,
          oldValue: `${rOld.dayQuantity.toLocaleString('es-EC', { maximumFractionDigits: 2 })} ${unit}`,
          newValue: `${rNew.dayQuantity.toLocaleString('es-EC', { maximumFractionDigits: 2 })} ${unit}`,
        });
      }
    } else if (rNew.dayQuantity > 0) {
      changes.push({
        category: 'Rubros',
        field: `rubro_${rNew.projectRubroId}_qty`,
        label: `${labelPrefix} - Asignado en Día`,
        oldValue: `0 ${unit}`,
        newValue: `${rNew.dayQuantity.toLocaleString('es-EC', { maximumFractionDigits: 2 })} ${unit}`,
      });
    }
  }

  // 4. Maquinaria
  const machOldMap = new Map(existingReport.machineryLogs.map((m) => [m.machineryId || m.description, m]));
  for (const mNew of data.machineryLogs) {
    const key = mNew.machineryId || mNew.description;
    const mOld = machOldMap.get(key);
    if (mOld) {
      if (Math.abs(mOld.dayHours - mNew.dayHours) > 0.001) {
        changes.push({
          category: 'Maquinaria',
          field: `mach_${key}_hours`,
          label: `Horas Maquinaria (${mNew.description})`,
          oldValue: `${mOld.dayHours} h`,
          newValue: `${mNew.dayHours} h`,
        });
      }
      if ((mOld.notes || '') !== (mNew.notes || '')) {
        changes.push({
          category: 'Maquinaria',
          field: `mach_${key}_notes`,
          label: `Notas Maquinaria (${mNew.description})`,
          oldValue: mOld.notes || '—',
          newValue: mNew.notes || '—',
        });
      }
    } else if (mNew.dayHours > 0) {
      changes.push({
        category: 'Maquinaria',
        field: `mach_${key}_added`,
        label: `Equipo Agregado (${mNew.description})`,
        oldValue: '0 h',
        newValue: `${mNew.dayHours} h`,
      });
    }
  }

  // 5. Personal
  const totalWorkersOld = existingReport.personnelLogs.reduce((acc, p) => acc + p.quantity, 0);
  const totalWorkersNew = data.personnelLogs.reduce((acc, p) => acc + p.quantity, 0);
  if (totalWorkersOld !== totalWorkersNew) {
    changes.push({
      category: 'Personal',
      field: 'totalWorkers',
      label: 'Total de Trabajadores en Obra',
      oldValue: `${totalWorkersOld} pers.`,
      newValue: `${totalWorkersNew} pers.`,
    });
  }

  // 6. Actividades & Observaciones
  checkChange('Actividades', 'activitiesTodayVial', 'Actividades Hoy: Vialidad', existingReport.activitiesTodayVial, data.activitiesTodayVial);
  checkChange('Actividades', 'activitiesTodayPavimento', 'Actividades Hoy: Pavimento', existingReport.activitiesTodayPavimento, data.activitiesTodayPavimento);
  checkChange('Actividades', 'activitiesTodayDrenaje', 'Actividades Hoy: Drenaje', existingReport.activitiesTodayDrenaje, data.activitiesTodayDrenaje);
  checkChange('Actividades', 'activitiesTodayPuentes', 'Actividades Hoy: Puentes', existingReport.activitiesTodayPuentes, data.activitiesTodayPuentes);
  checkChange('Actividades', 'activitiesTomorrowVial', 'Actividades Mañana: Vialidad', existingReport.activitiesTomorrowVial, data.activitiesTomorrowVial);
  checkChange('Observaciones', 'noveltiesRisks', 'Novedades / Riesgos', existingReport.noveltiesRisks, data.noveltiesRisks);
  checkChange('Observaciones', 'contractorComments', 'Comentarios Contratista', existingReport.contractorComments, data.contractorComments);
  checkChange('Observaciones', 'supervisorComments', 'Comentarios Fiscalización', existingReport.supervisorComments, data.supervisorComments);

  // 7. Firmas
  checkChange('Firmas', 'preparedByName', 'Elaborado Por', existingReport.preparedByName, data.preparedByName);
  checkChange('Firmas', 'reviewedByName', 'Revisado Por', existingReport.reviewedByName, data.reviewedByName);

  // Totales económicos recalculados
  const totalExecutedDay = data.rubroExecutions.reduce((sum, r) => sum + r.dayAmount, 0);
  const totalExecutedAccum = data.rubroExecutions.reduce((sum, r) => sum + r.accumAmount, 0);
  const contractTotal = existingReport.project.contractAmount || 1;
  const progressPercentAccum = (totalExecutedAccum / contractTotal) * 100;

  let principalExecutedDay = 0;
  let principalExecutedAccum = 0;
  let nonPrincipalExecutedDay = 0;
  let nonPrincipalExecutedAccum = 0;

  for (const exec of data.rubroExecutions) {
    const rubro = rubroMap.get(exec.projectRubroId);
    if (rubro?.isPrincipal) {
      principalExecutedDay += exec.dayAmount;
      principalExecutedAccum += exec.accumAmount;
    } else {
      nonPrincipalExecutedDay += exec.dayAmount;
      nonPrincipalExecutedAccum += exec.accumAmount;
    }
  }

  // Delta de horas de maquinaria
  const machineryHourDelta = new Map<string, number>();
  for (const oldLog of existingReport.machineryLogs) {
    if (oldLog.machineryId && oldLog.dayHours > 0) {
      machineryHourDelta.set(
        oldLog.machineryId,
        (machineryHourDelta.get(oldLog.machineryId) || 0) - oldLog.dayHours
      );
    }
  }
  for (const newLog of data.machineryLogs) {
    if (newLog.machineryId && newLog.dayHours > 0) {
      machineryHourDelta.set(
        newLog.machineryId,
        (machineryHourDelta.get(newLog.machineryId) || 0) + newLog.dayHours
      );
    }
  }

  // Transacción en BD
  const updatedReport = await prisma.$transaction(async (tx) => {
    // 1. Ajustar horas de maquinaria
    for (const [machId, delta] of machineryHourDelta.entries()) {
      if (Math.abs(delta) > 0.0001) {
        await tx.machinery.update({
          where: { id: machId },
          data: {
            totalHoursWorked: {
              increment: delta,
            },
          },
        }).catch(() => null);
      }
    }

    // 2. Actualizar reporte escalar
    const report = await tx.dailyReport.update({
      where: { id: data.id },
      data: {
        reportNumber: data.reportNumber,
        date: toSafeUTCDate(data.date),
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
        noveltiesRisks: data.noveltiesRisks,
        contractorComments: data.contractorComments,
        supervisorComments: data.supervisorComments,
        preparedByName: data.preparedByName,
        preparedByTitle: data.preparedByTitle,
        reviewedByName: data.reviewedByName,
        reviewedByTitle: data.reviewedByTitle,
      },
    });

    // 3. Reemplazar Rubro Executions
    await tx.dailyRubroExecution.deleteMany({
      where: { dailyReportId: data.id },
    });
    for (const r of data.rubroExecutions) {
      await tx.dailyRubroExecution.create({
        data: {
          dailyReportId: data.id,
          projectRubroId: r.projectRubroId,
          dayQuantity: r.dayQuantity,
          accumQuantity: r.accumQuantity,
          dayAmount: r.dayAmount,
          accumAmount: r.accumAmount,
        },
      });
    }

    // 4. Reemplazar Machinery Logs
    await tx.dailyReportMachinery.deleteMany({
      where: { dailyReportId: data.id },
    });
    for (const m of data.machineryLogs) {
      await tx.dailyReportMachinery.create({
        data: {
          dailyReportId: data.id,
          machineryId: m.machineryId,
          description: m.description,
          unit: m.unit,
          quantity: m.quantity,
          dayHours: m.dayHours,
          notes: m.notes,
        },
      });
    }

    // 5. Reemplazar Personnel Logs
    await tx.dailyReportPersonnel.deleteMany({
      where: { dailyReportId: data.id },
    });
    for (const p of data.personnelLogs) {
      await tx.dailyReportPersonnel.create({
        data: {
          dailyReportId: data.id,
          categoryRole: p.categoryRole,
          quantity: p.quantity,
          manHoursDay: p.manHoursDay,
          totalManHours: p.quantity * p.manHoursDay,
        },
      });
    }

    // 6. Reemplazar Clima Horario
    await tx.dailyHourlyWeather.deleteMany({
      where: { dailyReportId: data.id },
    });
    for (const w of data.hourlyWeather) {
      await tx.dailyHourlyWeather.create({
        data: {
          dailyReportId: data.id,
          timeSlot: w.timeSlot,
          conditionCode: w.conditionCode,
        },
      });
    }

    return report;
  });

  // Generar resumen compacto para notificaciones y descripción de auditoría
  const changedCategories = Array.from(new Set(changes.map((c) => c.category)));
  const changesSummary = changes.length > 0
    ? `${changes.length} cambio(s) en: ${changedCategories.join(', ')} (${changes.slice(0, 3).map((c) => c.label).join(', ')}${changes.length > 3 ? '...' : ''})`
    : 'Ajuste general sin variación en cantidades';

  // Registrar en Pista de Auditoría
  await recordAuditLog({
    action: 'REPORTE_DIARIO_EDITADO',
    entityType: 'DailyReport',
    entityId: data.id,
    description: `Edición de Reporte Diario N° ${data.reportNumber} (Fecha: ${data.date.substring(0, 10)}) de la obra [${existingReport.project.code}] por administrador ${user.name}. ${changesSummary}.${data.reason ? ` Motivo: "${data.reason}".` : ''}`,
    projectId: existingReport.projectId,
    metadata: {
      reportNumber: data.reportNumber,
      roadSection: data.roadSection,
      editedBy: user.name,
      editedByEmail: user.email,
      editedByRole: user.role,
      editedAt: new Date().toISOString(),
      reason: data.reason || 'Sin justificación técnica especificada',
      changesCount: changes.length,
      changesSummary,
      changes,
      financialImpact: {
        previousExecutedDay: existingReport.totalExecutedDay,
        newExecutedDay: totalExecutedDay,
        diffExecutedDay: totalExecutedDay - existingReport.totalExecutedDay,
        previousExecutedAccum: existingReport.totalExecutedAccum,
        newExecutedAccum: totalExecutedAccum,
      },
    },
  });

  // Notificación Push
  try {
    const { notifyDailyReportEdited } = await import('@/lib/pushNotifications');
    await notifyDailyReportEdited({
      id: data.id,
      reportNumber: data.reportNumber,
      projectCode: existingReport.project.code,
      projectName: existingReport.project.name,
      editorName: user.name,
      changesSummary,
      reason: data.reason,
    });
  } catch (pushErr) {
    console.error('Error al enviar notificación push de reporte editado:', pushErr);
  }

  revalidatePath('/reportes');
  revalidatePath(`/reportes/${data.id}`);
  revalidatePath(`/reportes/${data.id}/editar`);
  revalidatePath(`/proyectos/${existingReport.projectId}`);
  revalidatePath('/auditoria');
  revalidatePath('/maquinaria');
  revalidatePath('/');

  return { success: true, id: updatedReport.id, changesCount: changes.length };
}

