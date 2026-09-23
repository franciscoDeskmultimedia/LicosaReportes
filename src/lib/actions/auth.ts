'use server';

import { prisma } from '@/lib/prisma';
import { verifyPassword, hashPassword, setSessionCookie, clearSessionCookie, getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { recordAuditLog } from '@/lib/audit';

export async function loginAction(formData: { email: string; password: string }) {
  const user = await prisma.user.findUnique({
    where: { email: formData.email.toLowerCase().trim() },
    include: {
      assignments: true,
    },
  });

  if (!user || !user.active) {
    throw new Error('Credenciales incorrectas o usuario inactivo');
  }

  const isValid = await verifyPassword(formData.password, user.passwordHash);
  if (!isValid) {
    throw new Error('Credenciales incorrectas');
  }

  await setSessionCookie(user.id);

  // Registrar log de auditoría del inicio de sesión
  await recordAuditLog({
    action: 'INICIO_SESION',
    entityType: 'User',
    entityId: user.id,
    description: `Inicio de sesión exitoso en la plataforma: ${user.name} (${user.role})`,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    metadata: {
      email: user.email,
      role: user.role,
      assignmentsCount: user.assignments.length,
    },
  });

  revalidatePath('/');
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function logoutAction() {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    await recordAuditLog({
      action: 'CIERRE_SESION',
      entityType: 'User',
      entityId: currentUser.id,
      description: `Cierre de sesión del usuario: ${currentUser.name}`,
      user: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
      },
    });
  }

  await clearSessionCookie();
  revalidatePath('/');
  redirect('/login');
}

export async function getUsersList() {
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== 'ADMIN') {
    throw new Error('Solo los administradores pueden gestionar usuarios');
  }

  return await prisma.user.findMany({
    orderBy: { name: 'asc' },
    include: {
      assignments: {
        include: {
          project: true,
        },
      },
    },
  });
}

export async function createUserAction(data: {
  name: string;
  email: string;
  password: string;
  role: string;
  title?: string;
  assignments: Array<{ projectId: string; roleInProject: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== 'ADMIN') {
    throw new Error('Solo los administradores pueden registrar usuarios');
  }

  const passwordHash = await hashPassword(data.password);

  const newUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase().trim(),
        passwordHash,
        role: data.role,
        title: data.title,
      },
    });

    for (const a of data.assignments) {
      await tx.userProjectAssignment.create({
        data: {
          userId: user.id,
          projectId: a.projectId,
          roleInProject: a.roleInProject,
        },
      });
    }

    return user;
  });

  await recordAuditLog({
    action: 'USUARIO_CREADO',
    entityType: 'User',
    entityId: newUser.id,
    description: `Creación de nuevo usuario: ${newUser.name} (${newUser.email}) - Rol Global: ${newUser.role} con ${data.assignments.length} asignaciones de obra`,
    metadata: {
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      assignments: data.assignments,
    },
  });

  revalidatePath('/usuarios');
  return newUser;
}

export async function updateUserAction(data: {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  title?: string;
  active?: boolean;
  assignments: Array<{ projectId: string; roleInProject: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== 'ADMIN') {
    throw new Error('Solo los administradores pueden editar usuarios');
  }

  await prisma.$transaction(async (tx) => {
    const updateData: {
      name: string;
      email: string;
      role: string;
      title?: string;
      active?: boolean;
      passwordHash?: string;
    } = {
      name: data.name,
      email: data.email.toLowerCase().trim(),
      role: data.role,
      title: data.title,
      active: data.active !== undefined ? data.active : true,
    };

    if (data.password && data.password.trim().length > 0) {
      updateData.passwordHash = await hashPassword(data.password);
    }

    await tx.user.update({
      where: { id: data.id },
      data: updateData,
    });

    // Remove existing assignments and rebuild
    await tx.userProjectAssignment.deleteMany({
      where: { userId: data.id },
    });

    for (const a of data.assignments) {
      await tx.userProjectAssignment.create({
        data: {
          userId: data.id,
          projectId: a.projectId,
          roleInProject: a.roleInProject,
        },
      });
    }
  });

  await recordAuditLog({
    action: 'USUARIO_MODIFICADO',
    entityType: 'User',
    entityId: data.id,
    description: `Modificación de perfil y permisos del usuario: ${data.name} (${data.email}). Rol: ${data.role}, ${data.assignments.length} proyectos asignados`,
    metadata: {
      name: data.name,
      email: data.email,
      role: data.role,
      active: data.active,
      assignments: data.assignments,
    },
  });

  revalidatePath('/usuarios');
  revalidatePath('/');
  return { success: true };
}


