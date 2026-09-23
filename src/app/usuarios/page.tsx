import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getProjects } from '@/lib/actions/projects';
import { getCurrentUser } from '@/lib/auth';
import { UsersManagerView } from '@/components/UsersManagerView';

export const dynamic = 'force-dynamic';

export default async function UsuariosPage() {
  const currentUser = await getCurrentUser();

  // Only ADMIN can access user management
  if (currentUser?.role !== 'ADMIN') {
    redirect('/');
  }

  const [users, projects] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: 'asc' },
      include: {
        assignments: {
          include: {
            project: true,
          },
        },
      },
    }),
    getProjects(),
  ]);

  return <UsersManagerView users={users} projects={projects} />;
}
