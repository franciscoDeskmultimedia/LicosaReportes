export interface ProjectAssignmentInfo {
  projectId: string;
  projectCode: string;
  projectName: string;
  roleInProject: 'RESIDENTE_OBRA' | 'BODEGUERO' | 'FISCALIZADOR';
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'RESIDENTE_OBRA' | 'BODEGUERO' | 'FISCALIZADOR' | 'ESTANDAR';
  title?: string | null;
  assignedProjectIds: string[];
  assignments: ProjectAssignmentInfo[];
  projectRoles: Record<string, 'RESIDENTE_OBRA' | 'BODEGUERO' | 'FISCALIZADOR'>;
}

export function getUserRoleInProject(user: CurrentUser | null | undefined, projectId?: string): string {
  if (!user) return 'ANONYMOUS';
  if (user.role === 'ADMIN') return 'ADMIN';
  if (!projectId) return user.role;
  return user.projectRoles?.[projectId] || user.role || 'RESIDENTE_OBRA';
}
