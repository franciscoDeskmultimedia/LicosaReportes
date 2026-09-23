'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { recordAuditLog } from '@/lib/audit';

export async function getStorageInventory(projectId?: string) {
  return await prisma.materialItem.findMany({
    where: projectId ? { projectId } : undefined,
    orderBy: { name: 'asc' },
    include: {
      project: true,
      movements: {
        take: 5,
        orderBy: { timestamp: 'desc' },
      },
    },
  });
}

export async function getStorageReceipts(projectId?: string) {
  return await prisma.storageReceipt.findMany({
    where: projectId ? { projectId } : undefined,
    orderBy: { entryDateTime: 'desc' },
    include: {
      project: true,
      movements: {
        include: {
          material: true,
        },
      },
    },
  });
}

export async function getStorageMovements(projectId?: string) {
  return await prisma.storageMovement.findMany({
    where: projectId ? { projectId } : undefined,
    orderBy: { timestamp: 'desc' },
    include: {
      material: true,
      receipt: true,
      project: true,
    },
  });
}

export async function createMaterialItem(data: {
  projectId?: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  minStock: number;
  initialStock?: number;
  location?: string;
}) {
  const item = await prisma.materialItem.create({
    data: {
      projectId: data.projectId || undefined,
      code: data.code.toUpperCase(),
      name: data.name,
      category: data.category,
      unit: data.unit,
      minStock: data.minStock,
      currentStock: data.initialStock || 0,
      location: data.location,
    },
  });

  await recordAuditLog({
    action: 'CREAR_ITEM_BODEGA',
    entityType: 'MaterialItem',
    entityId: item.id,
    description: `Alta de ítem en catálogo de bodega: [${item.code}] ${item.name} (${item.category})`,
    projectId: data.projectId || undefined,
    metadata: {
      code: item.code,
      name: item.name,
      category: item.category,
      unit: item.unit,
      minStock: item.minStock,
      initialStock: data.initialStock || 0,
    },
  });

  revalidatePath('/bodega');
  return item;
}

export async function registerPurchaseReceipt(data: {
  projectId?: string;
  receiptNumber: string;
  supplier: string;
  entryDateTime: string; // ISO string or datetime-local
  receivedBy: string;
  invoiceTotal?: number;
  notes?: string;
  items: Array<{
    materialItemId: string;
    quantity: number;
    unitCost?: number;
  }>;
}) {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Receipt
    const receipt = await tx.storageReceipt.create({
      data: {
        projectId: data.projectId || undefined,
        receiptNumber: data.receiptNumber,
        supplier: data.supplier,
        entryDateTime: new Date(data.entryDateTime),
        receivedBy: data.receivedBy,
        invoiceTotal: data.invoiceTotal,
        notes: data.notes,
      },
    });

    // 2. Create Movements and update stock
    for (const item of data.items) {
      await tx.storageMovement.create({
        data: {
          materialItemId: item.materialItemId,
          type: 'ENTRY',
          quantity: item.quantity,
          unitCost: item.unitCost,
          receiptId: receipt.id,
          projectId: data.projectId,
          timestamp: new Date(data.entryDateTime),
          notes: `Ingreso por comprobante ${data.receiptNumber}`,
        },
      });

      await tx.materialItem.update({
        where: { id: item.materialItemId },
        data: {
          currentStock: {
            increment: item.quantity,
          },
        },
      });
    }

    return receipt;
  });

  await recordAuditLog({
    action: 'INGRESO_BODEGA',
    entityType: 'StorageReceipt',
    entityId: result.id,
    description: `Ingreso de materiales según comprobante N° ${data.receiptNumber} (${data.supplier}), recibido por ${data.receivedBy} (${data.items.length} ítems)`,
    projectId: data.projectId,
    metadata: {
      receiptNumber: data.receiptNumber,
      supplier: data.supplier,
      receivedBy: data.receivedBy,
      totalItems: data.items.length,
      invoiceTotal: data.invoiceTotal,
    },
  });

  revalidatePath('/bodega');
  revalidatePath('/');
  return result;
}

export async function registerMaterialDispatch(data: {
  materialItemId: string;
  quantity: number;
  projectId?: string;
  targetWorkFront: string;
  departureDateTime: string; // ISO string or datetime-local
  dispatchedTo: string;
  authorizedBy: string;
  notes?: string;
}) {
  const result = await prisma.$transaction(async (tx) => {
    const material = await tx.materialItem.findUnique({
      where: { id: data.materialItemId },
    });

    if (!material) {
      throw new Error('Material no encontrado');
    }

    if (material.currentStock < data.quantity) {
      throw new Error(`Stock insuficiente en bodega. Stock actual: ${material.currentStock} ${material.unit}`);
    }

    // 1. Create Exit Movement
    const movement = await tx.storageMovement.create({
      data: {
        materialItemId: data.materialItemId,
        type: 'EXIT',
        quantity: data.quantity,
        projectId: data.projectId || material.projectId || undefined,
        targetWorkFront: data.targetWorkFront,
        departureDateTime: new Date(data.departureDateTime),
        dispatchedTo: data.dispatchedTo,
        authorizedBy: data.authorizedBy,
        notes: data.notes,
        timestamp: new Date(data.departureDateTime),
      },
    });

    // 2. Decrement stock
    await tx.materialItem.update({
      where: { id: data.materialItemId },
      data: {
        currentStock: {
          decrement: data.quantity,
        },
      },
    });

    return { movement, material };
  });

  await recordAuditLog({
    action: 'DESPACHO_BODEGA',
    entityType: 'StorageMovement',
    entityId: result.movement.id,
    description: `Despacho de ${data.quantity} ${result.material.unit} de "${result.material.name}" hacia frente: ${data.targetWorkFront}. Entregado a: ${data.dispatchedTo}`,
    projectId: data.projectId || result.material.projectId || undefined,
    metadata: {
      materialCode: result.material.code,
      materialName: result.material.name,
      quantity: data.quantity,
      unit: result.material.unit,
      targetWorkFront: data.targetWorkFront,
      dispatchedTo: data.dispatchedTo,
      authorizedBy: data.authorizedBy,
    },
  });

  revalidatePath('/bodega');
  revalidatePath('/');
  return result.movement;
}

