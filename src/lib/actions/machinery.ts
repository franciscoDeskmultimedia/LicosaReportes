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
}) {
  const machine = await prisma.machinery.create({
    data: {
      code: data.code.toUpperCase(),
      name: data.name,
      category: data.category,
      plateOrSerial: data.plateOrSerial,
      unit: data.unit || 'hora',
      status: data.status || 'OPERATIVO',
    },
  });

  revalidatePath('/maquinaria');
  return machine;
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

