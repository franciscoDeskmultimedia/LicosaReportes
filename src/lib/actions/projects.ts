'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { recordAuditLog } from '@/lib/audit';

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
  return await prisma.project.findUnique({
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
      },
    },
  });
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

