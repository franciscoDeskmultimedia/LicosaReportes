'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function getContractors() {
  return await prisma.contractor.findMany({
    where: { active: true },
    include: {
      projectAssignments: {
        include: {
          project: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function createContractor(data: {
  name: string;
  ruc: string;
  specialty: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
}) {
  const user = await getCurrentUser();

  const existing = await prisma.contractor.findUnique({
    where: { ruc: data.ruc.trim() },
  });

  if (existing) {
    throw new Error(`Ya existe un contratista registrado con el RUC: ${data.ruc}`);
  }

  const contractor = await prisma.contractor.create({
    data: {
      name: data.name.trim(),
      ruc: data.ruc.trim(),
      specialty: data.specialty.trim(),
      contactPerson: data.contactPerson?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      active: true,
    },
  });

  await recordAuditLog({
    action: 'CONTRATISTA_CREADO',
    entityType: 'Contractor',
    entityId: contractor.id,
    description: `Registro de nuevo contratista: ${contractor.name} (RUC: ${contractor.ruc}) - Especialidad: ${contractor.specialty}`,
    metadata: {
      name: contractor.name,
      ruc: contractor.ruc,
      specialty: contractor.specialty,
      createdBy: user?.name,
    },
  });

  revalidatePath('/contratistas');
  revalidatePath('/proyectos');
  return contractor;
}

export async function assignContractorToProject(data: {
  contractorId: string;
  projectId: string;
  roleInProject: string;
  contractAmount?: number;
  notes?: string;
}) {
  const user = await getCurrentUser();

  const contractor = await prisma.contractor.findUnique({
    where: { id: data.contractorId },
  });
  if (!contractor) throw new Error('Contratista no encontrado');

  const project = await prisma.project.findUnique({
    where: { id: data.projectId },
  });
  if (!project) throw new Error('Proyecto no encontrado');

  const assignment = await prisma.projectContractorAssignment.upsert({
    where: {
      contractorId_projectId: {
        contractorId: data.contractorId,
        projectId: data.projectId,
      },
    },
    update: {
      roleInProject: data.roleInProject,
      contractAmount: data.contractAmount ? Number(data.contractAmount) : null,
      notes: data.notes || null,
    },
    create: {
      contractorId: data.contractorId,
      projectId: data.projectId,
      roleInProject: data.roleInProject,
      contractAmount: data.contractAmount ? Number(data.contractAmount) : null,
      notes: data.notes || null,
    },
  });

  await recordAuditLog({
    action: 'CONTRATISTA_ASIGNADO',
    entityType: 'ProjectContractorAssignment',
    entityId: assignment.id,
    description: `Asignación de ${contractor.name} a la obra [${project.code}] como ${data.roleInProject}`,
    projectId: project.id,
    metadata: {
      contractorName: contractor.name,
      roleInProject: data.roleInProject,
      contractAmount: data.contractAmount,
      assignedBy: user?.name,
    },
  });

  revalidatePath('/contratistas');
  revalidatePath(`/proyectos/${project.id}`);
  revalidatePath('/proyectos');
  return assignment;
}

export async function removeContractorFromProject(contractorId: string, projectId: string) {
  const user = await getCurrentUser();

  const assignment = await prisma.projectContractorAssignment.findUnique({
    where: {
      contractorId_projectId: {
        contractorId,
        projectId,
      },
    },
    include: { contractor: true, project: true },
  });

  if (!assignment) throw new Error('Asignación de contratista no encontrada');

  await prisma.projectContractorAssignment.delete({
    where: {
      contractorId_projectId: {
        contractorId,
        projectId,
      },
    },
  });

  await recordAuditLog({
    action: 'CONTRATISTA_DESVINCULADO',
    entityType: 'ProjectContractorAssignment',
    entityId: assignment.id,
    description: `Desvinculación del contratista ${assignment.contractor.name} de la obra [${assignment.project.code}]`,
    projectId,
    metadata: {
      contractorName: assignment.contractor.name,
      projectCode: assignment.project.code,
      user: user?.name,
    },
  });

  revalidatePath('/contratistas');
  revalidatePath(`/proyectos/${projectId}`);
  return { success: true };
}
