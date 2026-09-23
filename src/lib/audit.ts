import { prisma } from './prisma';
import { getCurrentUser } from './auth';

export interface RecordAuditLogParams {
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  projectId?: string;
  metadata?: Record<string, any>;
  user?: {
    id?: string;
    name: string;
    email: string;
    role: string;
  };
}

/**
 * Registra una acción de auditoría en la base de datos vinculada al usuario en sesión
 */
export async function recordAuditLog(params: RecordAuditLogParams) {
  try {
    let userName = params.user?.name;
    let userEmail = params.user?.email;
    let userRole = params.user?.role;
    let userId = params.user?.id;

    if (!userName || !userEmail) {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        userId = currentUser.id;
        userName = currentUser.name;
        userEmail = currentUser.email;
        // Si hay un projectId, usamos el rol específico en ese proyecto si existe
        if (params.projectId && currentUser.projectRoles?.[params.projectId]) {
          userRole = currentUser.projectRoles[params.projectId];
        } else {
          userRole = currentUser.role;
        }
      } else {
        userName = 'Sistema / Automático';
        userEmail = 'sistema@licosa.com';
        userRole = 'SISTEMA';
      }
    }

    const log = await prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        description: params.description,
        userId: userId || null,
        userName: userName || 'Desconocido',
        userEmail: userEmail || 'sin-correo@licosa.com',
        userRole: userRole || 'USUARIO',
        projectId: params.projectId || null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });

    return log;
  } catch (error) {
    console.error('Error registrando AuditLog:', error);
    return null;
  }
}

/**
 * Consulta los logs de auditoría con filtros opcionales
 */
export async function getAuditLogs(params?: {
  projectId?: string;
  action?: string;
  limit?: number;
}) {
  const where: any = {};
  if (params?.projectId) {
    where.projectId = params.projectId;
  }
  if (params?.action && params.action !== 'TODOS') {
    where.action = params.action;
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      project: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: params?.limit || 100,
  });

  return logs;
}
