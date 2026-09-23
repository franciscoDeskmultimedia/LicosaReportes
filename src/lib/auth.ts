import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const COOKIE_NAME = 'licosa_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'licosa-secret-key-obras-viales-2026';

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function signToken(payload: object): string {
  const data = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
  const encodedData = Buffer.from(data).toString('base64url');
  return `${encodedData}.${hmac}`;
}

export function verifyToken<T>(token: string): T | null {
  try {
    const [encodedData, signature] = token.split('.');
    if (!encodedData || !signature) return null;
    const data = Buffer.from(encodedData, 'base64url').toString();
    const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return JSON.parse(data) as T;
    }
    return null;
  } catch {
    return null;
  }
}

export type { ProjectAssignmentInfo, CurrentUser } from './authTypes';
export { getUserRoleInProject } from './authTypes';
import type { CurrentUser, ProjectAssignmentInfo } from './authTypes';


export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);
  if (!sessionCookie?.value) return null;

  const payload = verifyToken<{ userId: string }>(sessionCookie.value);
  if (!payload?.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      assignments: {
        include: {
          project: true,
        },
      },
    },
  });

  if (!user || !user.active) return null;

  const projectRoles: Record<string, 'RESIDENTE_OBRA' | 'BODEGUERO' | 'FISCALIZADOR'> = {};
  const assignments: ProjectAssignmentInfo[] = [];

  for (const a of user.assignments) {
    const r = (a.roleInProject || user.role || 'RESIDENTE_OBRA') as 'RESIDENTE_OBRA' | 'BODEGUERO' | 'FISCALIZADOR';
    projectRoles[a.projectId] = r;
    assignments.push({
      projectId: a.projectId,
      projectCode: a.project.code,
      projectName: a.project.name,
      roleInProject: r,
    });
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as CurrentUser['role'],
    title: user.title,
    assignedProjectIds: user.assignments.map((a) => a.projectId),
    assignments,
    projectRoles,
  };
}

export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}


export async function setSessionCookie(userId: string) {
  const token = signToken({ userId });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
