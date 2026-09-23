'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/lib/actions/auth';
import { HardHat, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, UserCheck } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError('Por favor ingrese su correo y contraseña');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const user = await loginAction({ email, password });
      if (user.role === 'BODEGUERO') {
        router.push('/bodega');
      } else {
        router.push('/');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(demoEmail: string, demoPass: string) {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-orange-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-orange-600/30">
            <HardHat className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-wider text-white">LICOSA</h1>
          <p className="text-xs text-orange-400 font-bold uppercase tracking-widest">
            Control de Obra Vial & Gestión de Bodega
          </p>
          <p className="text-xs text-slate-400">
            Acceso seguro con control de permisos y asignación por obra
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="usuario@licosa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Verificando...' : 'Iniciar Sesión'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="pt-5 border-t border-slate-800/80 space-y-3">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block text-center">
              Acceso Rápido de Prueba (Demo Roles)
            </span>

            <div className="grid grid-cols-1 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillDemo('admin@licosa.com', 'admin123')}
                className="p-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl flex items-center justify-between text-left transition-all"
              >
                <div>
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="text-orange-400 font-mono text-[11px] font-bold">[ADMIN]</span>
                    <span>Ing. Fernando Salazar</span>
                  </div>
                  <span className="text-[10.5px] text-slate-400">Acceso total a todas las obras y módulos</span>
                </div>
                <UserCheck className="w-4 h-4 text-orange-400" />
              </button>

              <button
                type="button"
                onClick={() => fillDemo('residente.valle@licosa.com', 'residente123')}
                className="p-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl flex items-center justify-between text-left transition-all"
              >
                <div>
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="text-blue-400 font-mono text-[11px] font-bold">[RESIDENTE]</span>
                    <span>Ing. Jerson López</span>
                  </div>
                  <span className="text-[10.5px] text-slate-400">Solo gestiona Obra Valle de la Virgen</span>
                </div>
                <UserCheck className="w-4 h-4 text-blue-400" />
              </button>

              <button
                type="button"
                onClick={() => fillDemo('bodega.valle@licosa.com', 'bodega123')}
                className="p-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl flex items-center justify-between text-left transition-all"
              >
                <div>
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="text-emerald-400 font-mono text-[11px] font-bold">[BODEGUERO]</span>
                    <span>Segundo Plúa</span>
                  </div>
                  <span className="text-[10.5px] text-slate-400">Solo Bodega de Obra Valle de la Virgen</span>
                </div>
                <UserCheck className="w-4 h-4 text-emerald-400" />
              </button>

              <button
                type="button"
                onClick={() => fillDemo('bodega.colimes@licosa.com', 'bodega123')}
                className="p-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl flex items-center justify-between text-left transition-all"
              >
                <div>
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="text-emerald-400 font-mono text-[11px] font-bold">[BODEGUERO]</span>
                    <span>Carlos Mendoza</span>
                  </div>
                  <span className="text-[10.5px] text-slate-400">Solo Bodega de Obra Colimes</span>
                </div>
                <UserCheck className="w-4 h-4 text-emerald-400" />
              </button>

              <button
                type="button"
                onClick={() => fillDemo('roberto.mixto@licosa.com', 'mixto123')}
                className="p-2.5 bg-slate-800 hover:bg-slate-700/80 border border-purple-500/40 rounded-xl flex items-center justify-between text-left transition-all"
              >
                <div>
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="text-purple-400 font-mono text-[11px] font-bold">[ROL MIXTO]</span>
                    <span>Ing. Roberto Alarcón</span>
                  </div>
                  <span className="text-[10.5px] text-slate-400">Bodeguero en Valle de la Virgen • Residente en Colimes</span>
                </div>
                <UserCheck className="w-4 h-4 text-purple-400" />
              </button>
            </div>

          </div>
        </div>

        <p className="text-center text-[11px] text-slate-500">
          LICOSA Constructora Vial • Sistema con Control de Roles RBAC
        </p>
      </div>
    </div>
  );
}
