'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function getWorkRequests(filters?: {
  projectId?: string;
  type?: string;
  status?: string;
}) {
  const where: any = {};
  if (filters?.projectId && filters.projectId !== 'ALL') {
    where.projectId = filters.projectId;
  }
  if (filters?.type && filters.type !== 'ALL') {
    where.type = filters.type;
  }
  if (filters?.status && filters.status !== 'ALL') {
    where.status = filters.status;
  }

  return await prisma.workRequest.findMany({
    where,
    include: {
      project: true,
      materialItem: true,
      machinery: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createWorkRequest(data: {
  projectId: string;
  type: 'MATERIAL' | 'MAQUINARIA';
  // Material details
  materialItemId?: string;
  materialName?: string;
  requestedQty?: number;
  unit?: string;
  // Machinery details
  machineryId?: string;
  machineryName?: string;
  estimatedHours?: number;
  startDate?: string;
  endDate?: string;
  withOperator?: boolean;
  // Common details
  targetLocation?: string;
  priority?: 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE';
  justification: string;
  neededDate?: string;
}) {
  const user = await getCurrentUser();
  const userName = user?.name || 'Usuario';
  const userRole = user?.role || 'RESIDENTE_OBRA';

  // Generate code e.g. SOL-MAT-024 o SOL-MAQ-024
  const prefix = data.type === 'MATERIAL' ? 'SOL-MAT' : 'SOL-MAQ';
  const count = await prisma.workRequest.count({
    where: { type: data.type },
  });
  const code = `${prefix}-${String(count + 1).padStart(3, '0')}`;

  let finalMaterialName = data.materialName;
  let finalUnit = data.unit;

  if (data.materialItemId) {
    const item = await prisma.materialItem.findUnique({
      where: { id: data.materialItemId },
    });
    if (item) {
      finalMaterialName = item.name;
      finalUnit = item.unit;
    }
  }

  let finalMachineryName = data.machineryName;
  if (data.machineryId) {
    const mach = await prisma.machinery.findUnique({
      where: { id: data.machineryId },
    });
    if (mach) {
      finalMachineryName = `[${mach.code}] ${mach.name}`;
    }
  }

  const request = await prisma.workRequest.create({
    data: {
      code,
      type: data.type,
      projectId: data.projectId,
      materialItemId: data.materialItemId || null,
      materialName: finalMaterialName || null,
      requestedQty: data.requestedQty ? Number(data.requestedQty) : null,
      unit: finalUnit || null,
      machineryId: data.machineryId || null,
      machineryName: finalMachineryName || null,
      estimatedHours: data.estimatedHours ? Number(data.estimatedHours) : null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      withOperator: !!data.withOperator,
      targetLocation: data.targetLocation || null,
      priority: data.priority || 'NORMAL',
      justification: data.justification,
      neededDate: data.neededDate ? new Date(data.neededDate) : null,
      status: 'PENDIENTE',
      requestedById: user?.id || null,
      requestedByName: userName,
      requestedByRole: userRole,
    },
    include: {
      project: true,
      materialItem: true,
      machinery: true,
    },
  });

  await recordAuditLog({
    action: 'SOLICITUD_CREADA',
    entityType: 'WorkRequest',
    entityId: request.id,
    description: `Nueva solicitud ${request.code} (${request.type}): ${
      request.type === 'MATERIAL'
        ? `${request.requestedQty} ${request.unit} de ${request.materialName}`
        : `${request.machineryName} (${request.estimatedHours || 0} hrs)`
    } para obra [${request.project.code}] - Frente: ${request.targetLocation || 'General'}`,
    projectId: request.projectId,
    metadata: {
      code: request.code,
      type: request.type,
      priority: request.priority,
      justification: request.justification,
      requestedBy: userName,
    },
  });

  revalidatePath('/solicitudes');
  revalidatePath('/bodega');
  revalidatePath('/maquinaria');
  return request;
}

export async function reviewWorkRequest(
  requestId: string,
  decision: 'APROBADA' | 'RECHAZADA',
  notes?: string
) {
  const user = await getCurrentUser();
  const userName = user?.name || 'Administración';

  const existing = await prisma.workRequest.findUnique({
    where: { id: requestId },
    include: { project: true },
  });

  if (!existing) {
    throw new Error('Solicitud no encontrada');
  }

  const updated = await prisma.workRequest.update({
    where: { id: requestId },
    data: {
      status: decision,
      reviewedById: user?.id || null,
      reviewedByName: userName,
      reviewedAt: new Date(),
      reviewNotes: notes || null,
    },
  });

  await recordAuditLog({
    action: decision === 'APROBADA' ? 'SOLICITUD_APROBADA' : 'SOLICITUD_RECHAZADA',
    entityType: 'WorkRequest',
    entityId: updated.id,
    description: `Solicitud ${updated.code} fue ${decision.toLowerCase()} por ${userName}. Notas: ${notes || 'Sin observaciones'}`,
    projectId: existing.projectId,
    metadata: {
      code: updated.code,
      status: updated.status,
      reviewer: userName,
      notes: notes,
    },
  });

  revalidatePath('/solicitudes');
  revalidatePath('/bodega');
  revalidatePath('/maquinaria');
  return updated;
}

export async function dispatchMaterialRequest(
  requestId: string,
  dispatchData?: {
    departureDateTime?: string;
    dispatchedTo?: string;
    notes?: string;
  }
) {
  const user = await getCurrentUser();
  const userName = user?.name || 'Bodeguero';

  const request = await prisma.workRequest.findUnique({
    where: { id: requestId },
    include: {
      project: true,
      materialItem: true,
    },
  });

  if (!request) {
    throw new Error('Solicitud no encontrada');
  }

  if (request.status !== 'APROBADA') {
    throw new Error('Solo se pueden despachar solicitudes previamente APROBADAS');
  }

  if (request.type !== 'MATERIAL') {
    throw new Error('Esta acción solo aplica para solicitudes de materiales');
  }

  if (!request.materialItemId || !request.requestedQty) {
    // Si no está vinculado a un MaterialItem existente, simplemente marcar despachada
    const updated = await prisma.workRequest.update({
      where: { id: requestId },
      data: { status: 'DESPACHADA' },
    });
    revalidatePath('/solicitudes');
    return updated;
  }

  // Generar movimiento de salida de bodega y actualizar stock
  const result = await prisma.$transaction(async (tx) => {
    const item = await tx.materialItem.findUnique({
      where: { id: request.materialItemId! },
    });

    if (!item) {
      throw new Error('El ítem de bodega asociado no existe');
    }

    const currentStock = item.currentStock;
    const newStock = currentStock - request.requestedQty!;

    // 1. Crear movimiento de salida
    const movement = await tx.storageMovement.create({
      data: {
        materialItemId: item.id,
        type: 'EXIT',
        quantity: request.requestedQty!,
        projectId: request.projectId,
        targetWorkFront: request.targetLocation || 'Frente de Obra',
        departureDateTime: dispatchData?.departureDateTime
          ? new Date(dispatchData.departureDateTime)
          : new Date(),
        dispatchedTo: dispatchData?.dispatchedTo || request.requestedByName,
        authorizedBy: userName,
        notes: `Despacho atendiendo Solicitud ${request.code}: ${dispatchData?.notes || request.justification}`,
      },
    });

    // 2. Actualizar stock
    await tx.materialItem.update({
      where: { id: item.id },
      data: { currentStock: newStock },
    });

    // 3. Actualizar estado de la solicitud
    const updatedRequest = await tx.workRequest.update({
      where: { id: requestId },
      data: {
        status: 'DESPACHADA',
      },
    });

    return { movement, updatedRequest, item };
  });

  await recordAuditLog({
    action: 'SOLICITUD_DESPACHADA',
    entityType: 'WorkRequest',
    entityId: request.id,
    description: `Despacho de Solicitud ${request.code}: Salida de ${request.requestedQty} ${request.unit} de ${request.materialName} hacia ${request.targetLocation || 'Frente'} por ${userName}`,
    projectId: request.projectId,
    metadata: {
      code: request.code,
      material: request.materialName,
      quantity: request.requestedQty,
      dispatchedBy: userName,
    },
  });

  revalidatePath('/solicitudes');
  revalidatePath('/bodega');
  return result.updatedRequest;
}

export async function updateMachineryRequestStatus(
  requestId: string,
  newStatus: 'EN_USO' | 'FINALIZADA',
  notes?: string
) {
  const user = await getCurrentUser();
  const userName = user?.name || 'Usuario';

  const request = await prisma.workRequest.findUnique({
    where: { id: requestId },
    include: { project: true, machinery: true },
  });

  if (!request) {
    throw new Error('Solicitud no encontrada');
  }

  const updated = await prisma.workRequest.update({
    where: { id: requestId },
    data: {
      status: newStatus,
      reviewNotes: notes ? `${request.reviewNotes || ''}\n[${userName}]: ${notes}` : request.reviewNotes,
    },
  });

  await recordAuditLog({
    action: `MAQUINARIA_SOLICITUD_${newStatus}`,
    entityType: 'WorkRequest',
    entityId: updated.id,
    description: `Equipo ${request.machineryName} en Solicitud ${request.code} cambió a estado ${newStatus}`,
    projectId: request.projectId,
    metadata: {
      code: request.code,
      status: newStatus,
      updatedBy: userName,
    },
  });

  revalidatePath('/solicitudes');
  revalidatePath('/maquinaria');
  return updated;
}

export async function deleteWorkRequest(requestId: string) {
  const user = await getCurrentUser();
  const isAdmin = user?.role === 'ADMIN';

  const request = await prisma.workRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error('Solicitud no encontrada');
  }

  if (!isAdmin && request.status !== 'PENDIENTE') {
    throw new Error('Solo se pueden eliminar solicitudes en estado PENDIENTE');
  }

  await prisma.workRequest.delete({
    where: { id: requestId },
  });

  await recordAuditLog({
    action: 'SOLICITUD_ELIMINADA',
    entityType: 'WorkRequest',
    entityId: requestId,
    description: `Eliminación de Solicitud ${request.code} (${request.type})`,
    projectId: request.projectId,
    metadata: {
      code: request.code,
      type: request.type,
      user: user?.name,
    },
  });

  revalidatePath('/solicitudes');
  return { success: true };
}
