'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export interface ChatProjectOption {
  id: string;
  code: string;
  name: string;
}

export async function getChatAvailableProjects(): Promise<ChatProjectOption[]> {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    // Si es ADMIN, ve todos los proyectos
    if (user.role === 'ADMIN') {
      const projects = await prisma.project.findMany({
        select: { id: true, code: true, name: true },
        orderBy: { code: 'asc' },
      });
      return projects;
    }

    // Si tiene proyectos asignados
    if (user.assignments && user.assignments.length > 0) {
      return user.assignments.map((a) => ({
        id: a.projectId,
        code: a.projectCode,
        name: a.projectName,
      }));
    }

    // Fallback: proyectos generales
    const projects = await prisma.project.findMany({
      select: { id: true, code: true, name: true },
      take: 10,
    });
    return projects;
  } catch (error) {
    console.error('Error al obtener proyectos para el chat:', error);
    return [];
  }
}
