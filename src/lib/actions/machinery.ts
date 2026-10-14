'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getMachineryList() {
  return await prisma.machinery.findMany({
    orderBy: { code: 'asc' },
    include: {
      dailyLogs: {
        take: 5,
        orderBy: { dailyReport: { date: 'desc' } },
        include: {
          dailyReport: true,
        },
      },
    },
  });
}

export async function createMachinery(data: {
  code: string;
  name: string;
  category: string;
  plateOrSerial?: string;
  unit?: string;
  status?: string;
  hourlyRate?: number;
}) {
  const machine = await prisma.machinery.create({
    data: {
      code: data.code.toUpperCase(),
      name: data.name,
      category: data.category,
      plateOrSerial: data.plateOrSerial,
      unit: data.unit || 'hora',
      status: data.status || 'OPERATIVO',
      hourlyRate: data.hourlyRate || 0,
    },
  });

  revalidatePath('/maquinaria');
  return machine;
}

export async function updateMachinery(
  id: string,
  data: {
    code?: string;
    name?: string;
    category?: string;
    plateOrSerial?: string;
    unit?: string;
    status?: string;
    hourlyRate?: number;
  }
) {
  const { getCurrentUser } = await import('@/lib/auth');
  const { recordAuditLog } = await import('@/lib/audit');

  const user = await getCurrentUser();
  if (user?.role !== 'ADMIN') {
    throw new Error('Permiso denegado: Solo los administradores pueden editar maquinaria y sus valores hora.');
  }

  const updated = await prisma.machinery.update({
    where: { id },
    data: {
      ...(data.code ? { code: data.code.trim().toUpperCase() } : {}),
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.category ? { category: data.category } : {}),
      ...(data.unit ? { unit: data.unit } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.plateOrSerial !== undefined ? { plateOrSerial: data.plateOrSerial } : {}),
      ...(data.hourlyRate !== undefined ? { hourlyRate: Number(data.hourlyRate) || 0 } : {}),
    },
  });

  await recordAuditLog({
    action: 'MAQUINARIA_ACTUALIZADA',
    entityType: 'Machinery',
    entityId: id,
    description: `Actualización de equipo [${updated.code}] ${updated.name}. Valor hora: $${updated.hourlyRate}/h`,
    metadata: data,
  });

  revalidatePath('/maquinaria');
  revalidatePath('/reportes');
  return updated;
}

export async function updateMachineryStatus(id: string, status: string) {
  const machine = await prisma.machinery.update({
    where: { id },
    data: { status },
  });

  revalidatePath('/maquinaria');
  return machine;
}

export async function deleteMachinery(id: string) {
  const { getCurrentUser } = await import('@/lib/auth');
  const { recordAuditLog } = await import('@/lib/audit');

  const user = await getCurrentUser();
  if (user?.role !== 'ADMIN') {
    throw new Error('Permiso denegado: Solo los administradores pueden eliminar maquinaria.');
  }

  const machine = await prisma.machinery.findUnique({
    where: { id },
  });

  if (!machine) {
    throw new Error('Maquinaria no encontrada');
  }

  await prisma.machinery.delete({
    where: { id },
  });

  await recordAuditLog({
    action: 'MAQUINARIA_ELIMINADA',
    entityType: 'Machinery',
    entityId: id,
    description: `Eliminación de equipo del parque: [${machine.code}] ${machine.name} (${machine.category}) - ${machine.totalHoursWorked.toFixed(1)} hrs registradas`,
    metadata: {
      code: machine.code,
      name: machine.name,
      category: machine.category,
      plateOrSerial: machine.plateOrSerial,
      totalHoursWorked: machine.totalHoursWorked,
    },
  });

  revalidatePath('/maquinaria');
  revalidatePath('/reportes/nuevo');
  return { success: true, deletedMachine: machine };
}

