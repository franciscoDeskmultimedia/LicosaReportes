'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HardHat,
  LayoutDashboard,
  FolderGit2,
  Package,
  Truck,
  FileSpreadsheet,
  PlusCircle,
  Menu,
  X,
  Layers,
  ArrowRightLeft,
  LogOut,
  LogIn,
  User,
  Shield,
  ShieldCheck,
  Building2,
  Users,
  UserCheck,
  Briefcase,
  TrendingUp,
  ClipboardList,
} from 'lucide-react';
import { logoutAction } from '@/lib/actions/auth';
import { CurrentUser } from '@/lib/authTypes';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles?: string[]; // Allowed roles. If undefined, allowed for all except bodeguero restricted
}

const allNavItems: NavItem[] = [
  { name: 'Panel General', href: '/', icon: LayoutDashboard, roles: ['ADMIN', 'RESIDENTE_OBRA', 'FISCALIZADOR'] },
  { name: 'Avance Acumulado', href: '/avance', icon: TrendingUp, roles: ['ADMIN', 'RESIDENTE_OBRA', 'FISCALIZADOR'] },
  { name: 'Proyectos & Rubros', href: '/proyectos', icon: FolderGit2, roles: ['ADMIN', 'RESIDENTE_OBRA', 'FISCALIZADOR'] },
  { name: 'Personal & Cuadrillas', href: '/personal', icon: UserCheck, roles: ['ADMIN', 'RESIDENTE_OBRA', 'FISCALIZADOR'] },
  { name: 'Contratistas', href: '/contratistas', icon: Briefcase, roles: ['ADMIN', 'RESIDENTE_OBRA', 'FISCALIZADOR'] },
  { name: 'Solicitudes de Obra', href: '/solicitudes', icon: ClipboardList, roles: ['ADMIN', 'RESIDENTE_OBRA', 'BODEGUERO', 'FISCALIZADOR'] },
  { name: 'Bodega & Almacén', href: '/bodega', icon: Package, roles: ['ADMIN', 'RESIDENTE_OBRA', 'BODEGUERO', 'FISCALIZADOR'] },
  { name: 'Maquinaria & Equipos', href: '/maquinaria', icon: Truck, roles: ['ADMIN', 'RESIDENTE_OBRA', 'FISCALIZADOR'] },
  { name: 'Reportes Diarios', href: '/reportes', icon: FileSpreadsheet, roles: ['ADMIN', 'RESIDENTE_OBRA', 'FISCALIZADOR'] },
  { name: 'Auditoría & Logs', href: '/auditoria', icon: ShieldCheck, roles: ['ADMIN', 'RESIDENTE_OBRA', 'FISCALIZADOR'] },
  { name: 'Usuarios & Roles', href: '/usuarios', icon: Users, roles: ['ADMIN'] },
];


export function Navigation({
  children,
  currentUser,
}: {
  children: React.ReactNode;
  currentUser: CurrentUser | null;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If path is a pure print view or login view, render clean full width
  const isPrintView = pathname?.endsWith('/imprimir');
  const isLoginView = pathname === '/login';

  if (isPrintView || isLoginView) {
    return <main className="w-full min-h-screen bg-white">{children}</main>;
  }

  // Calculate distinct roles held by user across projects
  const isAdmin = currentUser?.role === 'ADMIN';
  const assignedRoles = currentUser?.assignments?.map((a) => a.roleInProject) || [];
  if (currentUser?.role && currentUser.role !== 'ADMIN' && currentUser.role !== 'ESTANDAR') {
    assignedRoles.push(currentUser.role);
  }

  const hasResidentRole = isAdmin || assignedRoles.includes('RESIDENTE_OBRA');
  const hasBodegaRole = isAdmin || assignedRoles.includes('BODEGUERO');
  const isBodegueroOnly = !isAdmin && hasBodegaRole && !hasResidentRole;

  // Filter navigation items dynamically
  const allowedNavItems = allNavItems.filter((item) => {
    if (item.href === '/usuarios') return isAdmin;
    if (item.href === '/auditoria') return isAdmin || hasResidentRole;
    if (item.href === '/solicitudes') return isAdmin || hasResidentRole || hasBodegaRole;
    if (item.href === '/bodega') return isAdmin || hasBodegaRole || hasResidentRole;
    if (item.href === '/reportes' || item.href === '/reportes/nuevo') return isAdmin || hasResidentRole;
    if (
      item.href === '/avance' ||
      item.href === '/proyectos' ||
      item.href === '/personal' ||
      item.href === '/contratistas' ||
      item.href === '/maquinaria' ||
      item.href === '/'
    ) {
      return isAdmin || hasResidentRole;
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-100">
      {/* Sidebar for Desktop */}
      <aside className="no-print hidden md:flex md:w-64 flex-col fixed inset-y-0 z-50 bg-slate-900 border-r border-slate-800 text-white">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/30">
              <HardHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-wider text-white">LICOSA</h1>
              <p className="text-xs text-orange-400 font-semibold uppercase tracking-wider">
                Control Vial & Obra
              </p>
            </div>
          </div>
        </div>

        {/* User Profile Card */}
        <div className="p-3 mx-3 my-3 bg-slate-800/90 rounded-xl border border-slate-700/80 text-xs space-y-2">
          {currentUser ? (
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3 text-orange-400" />
                  Sesión Activa
                </span>
                <span
                  className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${
                    isAdmin
                      ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                      : hasResidentRole && hasBodegaRole
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      : hasResidentRole
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {isAdmin
                    ? 'ADMIN'
                    : hasResidentRole && hasBodegaRole
                    ? 'ROL MIXTO'
                    : hasResidentRole
                    ? 'RESIDENTE'
                    : 'BODEGUERO'}
                </span>
              </div>

              <p className="font-bold text-slate-200 mt-1 line-clamp-1">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400">{currentUser.title || currentUser.email}</p>


              <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  {currentUser.role === 'ADMIN'
                    ? 'Acceso: Todas las obras'
                    : `Asignado a: ${currentUser.assignedProjectIds.length} obra(s)`}
                </span>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
                    title="Cerrar Sesión"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Salir</span>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Modo Invitado</span>
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 font-bold"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Ingresar</span>
              </Link>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto">
          {allowedNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname?.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Action Shortcuts */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          {!isBodegueroOnly && (
            <Link
              href="/reportes/nuevo"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Nuevo Reporte Diario</span>
            </Link>
          )}

          <Link
            href="/bodega"
            className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all border border-slate-700"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-orange-400" />
            <span>Gestionar Bodega de Obra</span>
          </Link>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
          <span>Control RBAC</span>
          <span className="font-mono text-emerald-400">Activo</span>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="no-print md:hidden bg-slate-900 text-white border-b border-slate-800 p-4 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center">
            <HardHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white">LICOSA</h1>
            <p className="text-[10px] text-orange-400 uppercase font-semibold">
              {currentUser ? `${currentUser.name} (${currentUser.role})` : 'Control de Obra'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
          aria-label="Abrir Menú"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="no-print md:hidden fixed inset-0 top-[65px] z-50 bg-slate-900/95 p-4 flex flex-col space-y-2">
          {allowedNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                  isActive ? 'bg-orange-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            {!isBodegueroOnly && (
              <Link
                href="/reportes/nuevo"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 text-white rounded-lg text-sm font-bold"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Nuevo Reporte Diario</span>
              </Link>
            )}

            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-800 text-slate-200 rounded-lg text-xs"
            >
              <LogIn className="w-4 h-4" />
              <span>Cambiar de Usuario / Rol</span>
            </Link>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Top bar on desktop */}
        <div className="no-print hidden md:flex items-center justify-between px-8 py-3 bg-white border-b border-slate-200">
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md border border-slate-300">
              LICOSA Construcciones Viales S.A.
            </span>
            <span className="text-xs text-slate-500">
              Sistema de Planillaje, Kardex de Bodega & Reportes Oficiales
            </span>
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-600">
                  Conectado como: <strong className="text-slate-900">{currentUser.name}</strong>{' '}
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-bold ml-1">
                    {currentUser.role}
                  </span>
                </span>
                <Link
                  href="/login"
                  className="text-xs text-slate-500 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                >
                  Cambiar Rol
                </Link>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 text-white hover:bg-orange-500 transition-all shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Iniciar Sesión</span>
              </Link>
            )}
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
