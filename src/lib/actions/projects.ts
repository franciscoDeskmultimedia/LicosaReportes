'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { recordAuditLog } from '@/lib/audit';
import * as XLSX from 'xlsx';

export async function getProjects() {
  return await prisma.project.findMany({
    include: {
      rubros: {
        orderBy: { rubroNumber: 'asc' },
      },
      dailyReports: {
        orderBy: { reportNumber: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getProjectById(id: string) {
  let project: any;
  try {
    project = await prisma.project.findUnique({
      where: { id },
      include: {
        rubros: {
          include: {
            adjustments: {
              orderBy: { createdAt: 'desc' },
            },
            dailyExecutions: {
              include: {
                dailyReport: true,
              },
            },
          },
          orderBy: { rubroNumber: 'asc' },
        },
        dailyReports: {
          orderBy: { reportNumber: 'desc' },
          include: {
            rubroExecutions: {
              include: {
                projectRubro: true,
              },
            },
            personnelLogs: true,
            machineryLogs: {
              include: {
                machinery: true,
              },
            },
            hourlyWeather: {
              orderBy: { timeSlot: 'asc' },
            },
          },
        },
        workerAssignments: {
          where: { status: 'ACTIVO' },
          include: {
            worker: true,
          },
          orderBy: { startDate: 'desc' },
        },
        contractors: {
          include: {
            contractor: true,
          },
          orderBy: { assignedAt: 'desc' },
        },
        expenses: {
          orderBy: { date: 'desc' },
        },
      },
    });
  } catch (err: any) {
    // If Prisma client in memory is stale (cached before schema update), fallback without expenses include
    if (err?.message?.includes('expenses') || err?.name === 'PrismaClientValidationError') {
      project = await prisma.project.findUnique({
        where: { id },
        include: {
          rubros: {
            include: {
              adjustments: {
                orderBy: { createdAt: 'desc' },
              },
              dailyExecutions: {
                include: {
                  dailyReport: true,
                },
              },
            },
            orderBy: { rubroNumber: 'asc' },
          },
          dailyReports: {
            orderBy: { reportNumber: 'desc' },
            include: {
              rubroExecutions: {
                include: {
                  projectRubro: true,
                },
              },
              personnelLogs: true,
              machineryLogs: {
                include: {
                  machinery: true,
                },
              },
              hourlyWeather: {
                orderBy: { timeSlot: 'asc' },
              },
            },
          },
          workerAssignments: {
            where: { status: 'ACTIVO' },
            include: {
              worker: true,
            },
            orderBy: { startDate: 'desc' },
          },
          contractors: {
            include: {
              contractor: true,
            },
            orderBy: { assignedAt: 'desc' },
          },
        },
      });
      if (project) {
        try {
          project.expenses = await (prisma as any).projectExpense?.findMany({
            where: { projectId: id },
            orderBy: { date: 'desc' },
          }) || [];
        } catch {
          project.expenses = [];
        }
      }
    } else {
      throw err;
    }
  }

  if (project?.dailyReports && project.dailyReports.length > 0) {
    function normalizeMach(desc?: string | null, machCode?: string | null): string {
      const str = (machCode || desc || '').toUpperCase().trim();
      const clean = str.replace(/[^A-Z0-9]/g, '');
      if (clean.includes('EX') && clean.match(/EX\d+/)) return clean.match(/EX\d+/)![0];
      if (clean.includes('TR') && clean.match(/TR\d+/)) return clean.match(/TR\d+/)![0];
      if (clean.includes('RL') && clean.match(/RL\d+/)) return clean.match(/RL\d+/)![0];
      if (clean.includes('VQ') && clean.match(/VQ\d+/)) return clean.match(/VQ\d+/)![0];
      return clean || str;
    }

    // Sort ascending by date and reportNumber to compute cumulative hours correctly
    const ascendingReports = [...project.dailyReports].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return a.reportNumber - b.reportNumber;
    });

    const accumMap = new Map<string, number>();
    for (const rep of ascendingReports) {
      rep.machineryLogs = (rep.machineryLogs as any[]).map((m) => {
        const key = m.machineryId || normalizeMach(m.description, m.machinery?.code);
        const prev = accumMap.get(key) || 0;
        const current = prev + (m.dayHours || 0);
        accumMap.set(key, current);

        const norm = normalizeMach(m.description, m.machinery?.code);
        if (norm && norm !== key) {
          accumMap.set(norm, (accumMap.get(norm) || 0) + (m.dayHours || 0));
        }

        return {
          ...m,
          accumHours: current,
          hourlyRate: m.hourlyRate ?? m.machinery?.hourlyRate ?? 0,
        };
      });
    }
  }

  return project;
}

export async function updateProjectStatus(projectId: string, status: string) {
  const project = await prisma.project.update({
    where: { id: projectId },
    data: { status },
  });

  await recordAuditLog({
    action: 'PROYECTO_ESTADO_ACTUALIZADO',
    entityType: 'Project',
    entityId: project.id,
    description: `Cambio de estado del proyecto [${project.code}] a: ${status}`,
    projectId: project.id,
    metadata: { status },
  });

  revalidatePath('/proyectos');
  revalidatePath(`/proyectos/${projectId}`);
  revalidatePath('/');
  return project;
}

export async function updateProject(
  projectId: string,
  formData: {
    code?: string;
    name?: string;
    contractor?: string;
    client?: string;
    inspectionCompany?: string;
    executingCompany?: string;
    contractNumber?: string;
    financingSource?: string;
    roadSection?: string;
    contractAmount?: number;
    durationDays?: number;
    startDate?: string | Date;
    status?: string;
  }
) {
  const dataToUpdate: any = {};
  if (formData.code !== undefined) dataToUpdate.code = formData.code;
  if (formData.name !== undefined) dataToUpdate.name = formData.name;
  if (formData.contractor !== undefined) dataToUpdate.contractor = formData.contractor;
  if (formData.client !== undefined) dataToUpdate.client = formData.client;
  if (formData.inspectionCompany !== undefined) dataToUpdate.inspectionCompany = formData.inspectionCompany;
  if (formData.executingCompany !== undefined) dataToUpdate.executingCompany = formData.executingCompany;
  if (formData.contractNumber !== undefined) dataToUpdate.contractNumber = formData.contractNumber;
  if (formData.financingSource !== undefined) dataToUpdate.financingSource = formData.financingSource;
  if (formData.roadSection !== undefined) dataToUpdate.roadSection = formData.roadSection;
  if (formData.contractAmount !== undefined) dataToUpdate.contractAmount = formData.contractAmount;
  if (formData.durationDays !== undefined) dataToUpdate.durationDays = formData.durationDays;
  if (formData.startDate !== undefined) dataToUpdate.startDate = new Date(formData.startDate);
  if (formData.status !== undefined) dataToUpdate.status = formData.status;

  const project = await prisma.project.update({
    where: { id: projectId },
    data: dataToUpdate,
  });

  await recordAuditLog({
    action: 'PROYECTO_ACTUALIZADO',
    entityType: 'Project',
    entityId: project.id,
    description: `Actualización de datos contractuales del proyecto [${project.code}] ${project.name}`,
    projectId: project.id,
    metadata: formData,
  });

  revalidatePath('/proyectos');
  revalidatePath(`/proyectos/${projectId}`);
  revalidatePath('/');
  return project;
}

export async function createProject(formData: {
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
}) {
  const project = await prisma.project.create({
    data: {
      code: formData.code,
      name: formData.name,
      contractor: formData.contractor,
      client: formData.client,
      inspectionCompany: formData.inspectionCompany,
      executingCompany: formData.executingCompany,
      contractNumber: formData.contractNumber,
      financingSource: formData.financingSource,
      roadSection: formData.roadSection,
      contractAmount: formData.contractAmount,
      durationDays: formData.durationDays,
      startDate: new Date(formData.startDate),
      status: 'EN_EJECUCION',
    },
  });

  await recordAuditLog({
    action: 'PROYECTO_CREADO',
    entityType: 'Project',
    entityId: project.id,
    description: `Creación de nueva obra vial: [${project.code}] ${project.name} - Contrato: $${project.contractAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`,
    projectId: project.id,
    metadata: {
      code: project.code,
      name: project.name,
      contractNumber: project.contractNumber,
      contractAmount: project.contractAmount,
      client: project.client,
    },
  });

  revalidatePath('/proyectos');
  revalidatePath('/');
  return project;
}

export async function addProjectRubro(data: {
  projectId: string;
  rubroNumber: number;
  description: string;
  unit: string;
  unitPrice: number;
  initialQuantity: number;
  isPrincipal: boolean;
}) {
  const rubro = await prisma.projectRubro.create({
    data: {
      projectId: data.projectId,
      rubroNumber: data.rubroNumber,
      description: data.description,
      unit: data.unit,
      unitPrice: data.unitPrice,
      initialQuantity: data.initialQuantity,
      currentQuantity: data.initialQuantity,
      isPrincipal: data.isPrincipal,
    },
  });

  await recordAuditLog({
    action: 'RUBRO_CREADO',
    entityType: 'ProjectRubro',
    entityId: rubro.id,
    description: `Incorporación de Rubro N° ${rubro.rubroNumber}: ${rubro.description} (${rubro.currentQuantity} ${rubro.unit} @ $${rubro.unitPrice.toFixed(2)})`,
    projectId: data.projectId,
    metadata: {
      rubroNumber: rubro.rubroNumber,
      description: rubro.description,
      unit: rubro.unit,
      unitPrice: rubro.unitPrice,
      initialQuantity: rubro.initialQuantity,
    },
  });

  revalidatePath(`/proyectos/${data.projectId}`);
  revalidatePath('/proyectos');
  return rubro;
}

export async function adjustRubroQuantity(data: {
  projectRubroId: string;
  quantityChange: number;
  type: string; // COMPLEMENTARY_CONTRACT, WORK_ORDER, ADJUSTMENT, INCREASE
  reason: string;
  documentRef?: string;
  approvedBy: string;
  newUnitPrice?: number;
}) {
  const existingRubro = await prisma.projectRubro.findUnique({
    where: { id: data.projectRubroId },
  });

  if (!existingRubro) {
    throw new Error('Rubro no encontrado');
  }

  const updatedCurrentQuantity = existingRubro.currentQuantity + data.quantityChange;

  const [adjustment, updatedRubro] = await prisma.$transaction([
    prisma.rubroAdjustment.create({
      data: {
        projectRubroId: data.projectRubroId,
        type: data.type,
        quantityChange: data.quantityChange,
        newUnitPrice: data.newUnitPrice || existingRubro.unitPrice,
        reason: data.reason,
        documentRef: data.documentRef,
        date: new Date(),
        approvedBy: data.approvedBy,
      },
    }),
    prisma.projectRubro.update({
      where: { id: data.projectRubroId },
      data: {
        currentQuantity: updatedCurrentQuantity,
        unitPrice: data.newUnitPrice || existingRubro.unitPrice,
      },
    }),
  ]);

  await recordAuditLog({
    action: 'REAJUSTE_RUBRO',
    entityType: 'RubroAdjustment',
    entityId: adjustment.id,
    description: `Reajuste de rubro N° ${existingRubro.rubroNumber} (${data.type}): cambio de ${data.quantityChange > 0 ? '+' : ''}${data.quantityChange} ${existingRubro.unit}. Motivo: ${data.reason}. Ref: ${data.documentRef || 'S/N'}. Aprobado por: ${data.approvedBy}`,
    projectId: existingRubro.projectId,
    metadata: {
      rubroNumber: existingRubro.rubroNumber,
      quantityChange: data.quantityChange,
      previousQuantity: existingRubro.currentQuantity,
      newQuantity: updatedCurrentQuantity,
      type: data.type,
      reason: data.reason,
      documentRef: data.documentRef,
      approvedBy: data.approvedBy,
    },
  });

  revalidatePath(`/proyectos/${existingRubro.projectId}`);
  revalidatePath('/proyectos');
  return { adjustment, updatedRubro };
}

export async function addBulkProjectRubros(data: {
  projectId: string;
  rubros: Array<{
    rubroNumber: number;
    description: string;
    unit: string;
    unitPrice: number;
    initialQuantity: number;
    isPrincipal: boolean;
  }>;
}) {
  const results = [];

  for (const r of data.rubros) {
    // Skip if rubro already exists for this project
    const existing = await prisma.projectRubro.findFirst({
      where: { projectId: data.projectId, rubroNumber: r.rubroNumber },
    });
    if (existing) continue;

    const rubro = await prisma.projectRubro.create({
      data: {
        projectId: data.projectId,
        rubroNumber: r.rubroNumber,
        description: r.description,
        unit: r.unit,
        unitPrice: r.unitPrice,
        initialQuantity: r.initialQuantity,
        currentQuantity: r.initialQuantity,
        isPrincipal: r.isPrincipal,
      },
    });
    results.push(rubro);
  }

  if (results.length > 0) {
    await recordAuditLog({
      action: 'RUBROS_IMPORTADOS',
      entityType: 'ProjectRubro',
      entityId: data.projectId,
      description: `Importación masiva de ${results.length} rubros contractuales al proyecto`,
      projectId: data.projectId,
      metadata: {
        totalImported: results.length,
        rubroNumbers: results.map((r) => r.rubroNumber),
      },
    });
  }

  revalidatePath(`/proyectos/${data.projectId}`);
  revalidatePath('/proyectos');
  revalidatePath('/reportes/nuevo');
  return { created: results.length, skipped: data.rubros.length - results.length };
}

export async function getGlobalRubrosCatalog() {
  const allRubros = await prisma.projectRubro.findMany({
    select: {
      rubroNumber: true,
      description: true,
      unit: true,
      unitPrice: true,
      isPrincipal: true,
      project: {
        select: {
          code: true,
          name: true,
        },
      },
    },
    orderBy: { rubroNumber: 'asc' },
  });

  // Unique rubros deduplicated by rubroNumber and normalized description
  const uniqueMap = new Map<string, typeof allRubros[0]>();
  for (const r of allRubros) {
    const key = `${r.rubroNumber}_${r.description.trim().toLowerCase()}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, r);
    }
  }

  return Array.from(uniqueMap.values());
}
import {
  parseProjectWorkbook,
  type ProjectImportSuggestion,
  type ParsedProjectExcelResult,
} from '@/lib/projectExcelParser';

export type { ProjectImportSuggestion, ParsedProjectExcelResult };

/**
 * Parsea un archivo Excel para extraer la ficha del proyecto y el catálogo de rubros
 */
export async function parseProjectExcel(formData: FormData): Promise<ParsedProjectExcelResult> {
  const defaultEmptyResult: ParsedProjectExcelResult = {
    success: false,
    error: '',
    projectData: {} as any,
    rubros: [],
    sheetNames: [],
    suggestions: [],
    metrics: {
      rubrosCount: 0,
      rubrosSum: 0,
      declaredAmount: 0,
      difference: 0,
      principalCount: 0,
      duplicateCount: 0,
      zeroPriceCount: 0,
    },
  };

  try {
    const file = formData.get('file') as File | null;
    if (!file) {
      return {
        ...defaultEmptyResult,
        error: 'No se recibió ningún archivo.',
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const wb = XLSX.read(buffer, { type: 'buffer' });
    return parseProjectWorkbook(wb, file.name);
  } catch (err) {
    console.error('Error parseando Excel de proyecto:', err);
    return {
      ...defaultEmptyResult,
      error: err instanceof Error ? err.message : 'Error al procesar el archivo Excel.',
    };
  }
}

/**
 * Crea el proyecto y todos sus rubros en la base de datos tras la confirmación del usuario
 */
export async function createProjectWithRubros(payload: {
  project: {
    code: string;
    name: string;
    contractor: string;
    client: string;
    inspectionCompany?: string;
    executingCompany?: string;
    contractNumber?: string;
    financingSource?: string;
    roadSection?: string;
    contractAmount: number;
    durationDays: number;
    startDate: string;
  };
  rubros: Array<{
    rubroNumber: number;
    description: string;
    unit: string;
    unitPrice: number;
    initialQuantity: number;
    isPrincipal: boolean;
  }>;
}) {
  const existing = await prisma.project.findUnique({
    where: { code: payload.project.code.trim().toUpperCase() },
  });

  if (existing) {
    throw new Error(`Ya existe una obra con el código [${payload.project.code}]. Ingrese un código diferente.`);
  }

  const project = await prisma.project.create({
    data: {
      code: payload.project.code.trim().toUpperCase(),
      name: payload.project.name.trim(),
      contractor: payload.project.contractor.trim(),
      client: payload.project.client.trim(),
      inspectionCompany: payload.project.inspectionCompany?.trim() || 'CONSULTORA / ASOCIACIÓN FISCALIZADORA',
      executingCompany: payload.project.executingCompany?.trim() || 'LICOSA',
      contractNumber: payload.project.contractNumber?.trim() || 'SIN_NUMERO',
      financingSource: payload.project.financingSource?.trim() || 'FONDOS FISCALES',
      roadSection: payload.project.roadSection?.trim() || 'Tramo Principal',
      contractAmount: payload.project.contractAmount,
      durationDays: payload.project.durationDays,
      startDate: new Date(payload.project.startDate),
      status: 'EN_EJECUCION',
    },
  });

  if (payload.rubros && payload.rubros.length > 0) {
    await prisma.projectRubro.createMany({
      data: payload.rubros.map((r) => ({
        projectId: project.id,
        rubroNumber: r.rubroNumber,
        description: r.description.trim(),
        unit: r.unit.trim() || 'u',
        unitPrice: r.unitPrice,
        initialQuantity: r.initialQuantity,
        currentQuantity: r.initialQuantity,
        isPrincipal: r.isPrincipal,
      })),
    });
  }

  await recordAuditLog({
    action: 'PROYECTO_CREADO_DESDE_EXCEL',
    entityType: 'Project',
    entityId: project.id,
    description: `Creación de obra [${project.code}] ${project.name} importando ${payload.rubros.length} rubros desde Excel.`,
    projectId: project.id,
    metadata: {
      code: project.code,
      rubrosCount: payload.rubros.length,
      contractAmount: project.contractAmount,
    },
  });

  revalidatePath('/proyectos');
  revalidatePath('/');
  return { success: true, projectId: project.id };
}


