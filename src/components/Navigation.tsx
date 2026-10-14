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
  Bot,
  Sparkles,
} from 'lucide-react';
import { logoutAction } from '@/lib/actions/auth';
import { CurrentUser } from '@/lib/authTypes';
import { useAiChat } from '@/components/chat/AiChatContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles?: string[]; // Allowed roles. If undefined, allowed for all except bodeguero restricted
}

const allNavItems: NavItem[] = [
  { name: 'Panel General', href: '/', icon: LayoutDashboard, roles: ['ADMIN', 'RESIDENTE_OBRA', 'FISCALIZADOR'] },
  { name: 'Proyectos', href: '/proyectos', icon: FolderGit2, roles: ['ADMIN', 'RESIDENTE_OBRA', 'FISCALIZADOR'] },
  // Ocultados temporalmente por solicitud del usuario:
  // { name: 'Personal & Cuadrillas', href: '/personal', icon: UserCheck, roles: ['ADMIN', 'RESIDENTE_OBRA', 'FISCALIZADOR'] },
  // { name: 'Contratistas', href: '/contratistas', icon: Briefcase, roles: ['ADMIN', 'RESIDENTE_OBRA', 'FISCALIZADOR'] },
  { name: 'Maquinaria & Equipos', href: '/maquinaria', icon: Truck, roles: ['ADMIN', 'RESIDENTE_OBRA', 'FISCALIZADOR'] },
  { name: 'Auditoria & Logs', href: '/auditoria', icon: ShieldCheck, roles: ['ADMIN', 'RESIDENTE_OBRA', 'FISCALIZADOR'] },
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
  const { toggleChat } = useAiChat();

  // If path is a pure print view or login view, render clean full width
  const isPrintView = pathname?.endsWith('/imprimir');
  const isLoginView = pathname === '/login';

  if (isPrintView || isLoginView || !currentUser) {
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
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="LICOSA"
              className="h-11 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-sm"
            />
            <div className="border-l border-slate-700 pl-3">
              <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider block">
                Control Vial
              </span>
              <span className="text-[9px] text-slate-400 block font-medium">
                & Obra Civil
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
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

        {/* User Profile Card (Sesión Activa - Movida a la parte inferior del menú) */}
        <div className="p-3 mx-3 mb-3 bg-slate-800/90 rounded-xl border border-slate-700/80 text-xs space-y-2">
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
                    className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold cursor-pointer"
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

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
          <span>Control RBAC</span>
          <span className="font-mono text-emerald-400">Activo</span>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="no-print md:hidden bg-slate-900 text-white border-b border-slate-800 p-3.5 sticky top-0 z-40 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="LICOSA"
            className="h-8 w-auto object-contain"
          />
          <div className="border-l border-slate-700 pl-2">
            <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider block">
              Control Vial
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {currentUser && (
            <button
              onClick={toggleChat}
              className="p-2 text-cyan-300 bg-blue-900/60 border border-blue-700/50 hover:bg-blue-800 rounded-lg cursor-pointer"
              aria-label="Abrir Asistente IA Copilot"
              title="Copilot IA"
            >
              <Bot className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
            aria-label="Abrir Menú"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="no-print md:hidden fixed inset-0 top-[65px] z-50 bg-slate-900/95 p-4 flex flex-col justify-between">
          <div className="space-y-2">
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
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-2">
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
            {/* Botón de Asistente Copilot IA en la barra superior a la derecha */}
            {currentUser && (
              <button
                onClick={toggleChat}
                className="relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white hover:from-blue-600 hover:to-indigo-700 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer border border-blue-400/30"
                title="Abrir Asistente de IA (Copilot)"
              >
                <div className="relative flex items-center justify-center">
                  <Bot className="w-4 h-4 text-cyan-200" />
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
                  </span>
                </div>
                <span className="text-xs font-bold">Copilot IA</span>
              </button>
            )}

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
