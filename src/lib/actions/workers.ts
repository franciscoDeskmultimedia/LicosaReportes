'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function getWorkers(filters?: { projectId?: string; roleCategory?: string }) {
  const where: any = { active: true };
  if (filters?.roleCategory && filters.roleCategory !== 'ALL') {
    where.roleCategory = filters.roleCategory;
  }

  const workers = await prisma.worker.findMany({
    where,
    include: {
      assignments: {
        where: { status: 'ACTIVO' },
        include: {
          project: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  if (filters?.projectId && filters.projectId !== 'ALL') {
    return workers.filter((w) =>
      w.assignments.some((a) => a.projectId === filters.projectId)
    );
  }

  return workers;
}

export async function createWorker(data: {
  identification: string;
  name: string;
  roleCategory: string;
  phone?: string;
  email?: string;
}) {
  const user = await getCurrentUser();

  const existing = await prisma.worker.findUnique({
    where: { identification: data.identification.trim() },
  });

  if (existing) {
    throw new Error(`Ya existe un trabajador registrado con la cédula/DNI: ${data.identification}`);
  }

  const worker = await prisma.worker.create({
    data: {
      identification: data.identification.trim(),
      name: data.name.trim(),
      roleCategory: data.roleCategory,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      active: true,
    },
  });

  await recordAuditLog({
    action: 'PERSONAL_CREADO',
    entityType: 'Worker',
    entityId: worker.id,
    description: `Registro de nuevo personal: ${worker.name} (${worker.roleCategory}) - C.I.: ${worker.identification}`,
    metadata: {
      identification: worker.identification,
      name: worker.name,
      roleCategory: worker.roleCategory,
      createdBy: user?.name,
    },
  });

  revalidatePath('/personal');
  revalidatePath('/proyectos');
  return worker;
}

export async function updateWorker(
  id: string,
  data: {
    identification: string;
    name: string;
    roleCategory: string;
    phone?: string;
    email?: string;
    active?: boolean;
  }
) {
  const user = await getCurrentUser();

  const existing = await prisma.worker.findUnique({
    where: { id },
  });
  if (!existing) throw new Error('Personal no encontrado');

  // If identification changed, check uniqueness
  if (data.identification.trim() !== existing.identification) {
    const duplicate = await prisma.worker.findUnique({
      where: { identification: data.identification.trim() },
    });
    if (duplicate) {
      throw new Error(`Ya existe otro trabajador con la cédula/DNI: ${data.identification}`);
    }
  }

  const updated = await prisma.worker.update({
    where: { id },
    data: {
      identification: data.identification.trim(),
      name: data.name.trim().toUpperCase(),
      roleCategory: data.roleCategory,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      active: data.active !== undefined ? data.active : existing.active,
    },
  });

  await recordAuditLog({
    action: 'PERSONAL_ACTUALIZADO',
    entityType: 'Worker',
    entityId: updated.id,
    description: `Edición de datos de personal: ${updated.name} (${updated.roleCategory}) - C.I.: ${updated.identification}`,
    metadata: {
      previous: {
        name: existing.name,
        roleCategory: existing.roleCategory,
        identification: existing.identification,
        phone: existing.phone,
        email: existing.email,
      },
      updated: {
        name: updated.name,
        roleCategory: updated.roleCategory,
        identification: updated.identification,
        phone: updated.phone,
        email: updated.email,
      },
      editedBy: user?.name,
    },
  });

  revalidatePath('/personal');
  revalidatePath('/proyectos');
  return updated;
}

export async function assignWorkerToProject(data: {
  workerId: string;
  projectId: string;
  assignedRole: string;
  notes?: string;
}) {
  const user = await getCurrentUser();

  const worker = await prisma.worker.findUnique({
    where: { id: data.workerId },
    include: {
      assignments: {
        where: { status: 'ACTIVO' },
        include: { project: true },
      },
    },
  });

  if (!worker) throw new Error('Personal no encontrado');

  const project = await prisma.project.findUnique({
    where: { id: data.projectId },
  });

  if (!project) throw new Error('Proyecto no encontrado');

  // Check if currently assigned to another project
  const currentAssignment = worker.assignments[0];
  let transferNote = '';

  const result = await prisma.$transaction(async (tx) => {
    if (currentAssignment) {
      if (currentAssignment.projectId === data.projectId) {
        // Update current role
        return await tx.workerAssignment.update({
          where: { id: currentAssignment.id },
          data: {
            assignedRole: data.assignedRole,
            notes: data.notes || currentAssignment.notes,
          },
        });
      }

      // Transfer from previous project
      transferNote = `Transferido desde obra [${currentAssignment.project.code}]`;
      await tx.workerAssignment.update({
        where: { id: currentAssignment.id },
        data: {
          status: 'TRANSFERIDO',
          endDate: new Date(),
          notes: `${currentAssignment.notes || ''} [Transferido a ${project.code}]`.trim(),
        },
      });
    }

    // Create new active assignment
    return await tx.workerAssignment.create({
      data: {
        workerId: data.workerId,
        projectId: data.projectId,
        assignedRole: data.assignedRole,
        status: 'ACTIVO',
        notes: data.notes ? `${data.notes} ${transferNote}`.trim() : transferNote || null,
      },
    });
  });

  await recordAuditLog({
    action: 'PERSONAL_ASIGNADO',
    entityType: 'WorkerAssignment',
    entityId: result.id,
    description: `Asignación de ${worker.name} como ${data.assignedRole} a la obra [${project.code}]. ${transferNote}`,
    projectId: project.id,
    metadata: {
      workerName: worker.name,
      role: data.assignedRole,
      assignedBy: user?.name,
      previousProject: currentAssignment?.project?.code || null,
    },
  });

  revalidatePath('/personal');
  revalidatePath(`/proyectos/${project.id}`);
  revalidatePath('/proyectos');
  return result;
}

export async function removeWorkerFromProject(assignmentId: string) {
  const user = await getCurrentUser();

  const assignment = await prisma.workerAssignment.findUnique({
    where: { id: assignmentId },
    include: { worker: true, project: true },
  });

  if (!assignment) throw new Error('Asignación no encontrada');

  const updated = await prisma.workerAssignment.update({
    where: { id: assignmentId },
    data: {
      status: 'FINALIZADO',
      endDate: new Date(),
    },
  });

  await recordAuditLog({
    action: 'PERSONAL_DESVINCULADO',
    entityType: 'WorkerAssignment',
    entityId: assignmentId,
    description: `Desvinculación de ${assignment.worker.name} de la obra [${assignment.project.code}]`,
    projectId: assignment.projectId,
    metadata: {
      workerName: assignment.worker.name,
      projectName: assignment.project.name,
      user: user?.name,
    },
  });

  revalidatePath('/personal');
  revalidatePath(`/proyectos/${assignment.projectId}`);
  return updated;
}
