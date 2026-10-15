'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  Smartphone,
  X,
  ShieldCheck,
} from 'lucide-react';
import {
  registerPushSubscriptionAction,
  unregisterPushSubscriptionAction,
  sendTestNotificationAction,
} from '@/lib/actions/pushSubscription';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const panelRef = useRef<HTMLDivElement>(null);

  // Check support and active subscription status on mount
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    ) {
      setIsSupported(true);
      setPermission(Notification.permission);

      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          setIsSubscribed(!!sub);
        })
        .catch((err) => {
          console.warn('[Push] Error al comprobar suscripción:', err);
        });
    }
  }, []);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSubscribe = async () => {
    setLoading(true);
    setStatusMessage(null);

    try {
      const vapidPublicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        'BFFVr5aGIMA45XNrBs_U8QUHz-uPEVvJ3_RhSXRXTH1S7jsQOkejzMl2quJeVjnfjiPgGRZE6XPqUOTKXIpQau8';

      if (!vapidPublicKey) {
        throw new Error('La clave pública VAPID no está configurada.');
      }

      // 1. Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        setMessageType('error');
        setStatusMessage('El permiso de notificaciones fue denegado o bloqueado en el navegador.');
        setLoading(false);
        return;
      }

      // 2. Register / Get Service Worker
      const registration = await navigator.serviceWorker.ready;

      // 3. Subscribe to Push Manager
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });
      }

      // 4. Send subscription to server DB
      const subJSON = subscription.toJSON();
      if (!subJSON.endpoint || !subJSON.keys?.p256dh || !subJSON.keys?.auth) {
        throw new Error('No se pudo generar la llave criptográfica de la suscripción.');
      }

      const res = await registerPushSubscriptionAction(
        {
          endpoint: subJSON.endpoint,
          keys: {
            p256dh: subJSON.keys.p256dh,
            auth: subJSON.keys.auth,
          },
        },
        navigator.userAgent
      );

      if (!res.success) {
        throw new Error(res.error || 'Error al guardar la suscripción en el servidor');
      }

      setIsSubscribed(true);
      setMessageType('success');
      setStatusMessage('¡Notificaciones activadas! Recibirás alertas cada vez que se agregue un nuevo reporte.');
    } catch (err: any) {
      console.error('[Push] Error al suscribir:', err);
      setMessageType('error');
      setStatusMessage(err.message || 'Error al activar las notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    setStatusMessage(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await unregisterPushSubscriptionAction(endpoint);
      }

      setIsSubscribed(false);
      setMessageType('info');
      setStatusMessage('Has desactivado las notificaciones en este dispositivo.');
    } catch (err: any) {
      console.error('[Push] Error al desuscribir:', err);
      setMessageType('error');
      setStatusMessage(err.message || 'Error al desactivar');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await sendTestNotificationAction();
      if (res.success) {
        setMessageType('success');
        setStatusMessage('🔔 ¡Notificación de prueba enviada exitosamente! Revisa las alertas de tu dispositivo.');
      } else {
        throw new Error(res.error || 'No se pudo enviar la prueba');
      }
    } catch (err: any) {
      console.error('[Push] Error en prueba:', err);
      setMessageType('error');
      setStatusMessage(err.message || 'Error al disparar prueba');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block" ref={panelRef}>
      {/* Bell Icon Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
          isSubscribed
            ? 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100 shadow-xs'
            : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-200'
        }`}
        title={
          isSubscribed
            ? 'Alertas Push Activas: Reportes Diarios'
            : 'Configurar Notificaciones Push de Obra'
        }
        aria-label="Notificaciones Push"
      >
        {isSubscribed ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}

        {/* Live indicator dot */}
        {isSubscribed && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white" />
          </span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-xl ${
                  isSubscribed ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {isSubscribed ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 leading-tight">
                  Alertas Push de Obras
                </h4>
                <p className="text-[11px] text-slate-500">PWA & Notificaciones en Tiempo Real</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status Badge */}
          <div className="my-3">
            <div
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${
                !isSupported
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : permission === 'denied'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : isSubscribed
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {!isSupported ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                ) : permission === 'denied' ? (
                  <BellOff className="w-4 h-4 text-rose-600" />
                ) : isSubscribed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Bell className="w-4 h-4 text-slate-500" />
                )}
                <span>
                  {!isSupported
                    ? 'Navegador sin soporte de Push'
                    : permission === 'denied'
                    ? 'Permiso Bloqueado en Navegador'
                    : isSubscribed
                    ? 'Notificaciones Activas'
                    : 'Inactivas en este dispositivo'}
                </span>
              </div>
              <span className="text-[10px] font-mono uppercase opacity-75">
                {isSubscribed ? 'VAPID OK' : 'OFF'}
              </span>
            </div>
          </div>

          {/* Explanation Text */}
          <p className="text-xs text-slate-600 leading-relaxed">
            Recibe un aviso instantáneo en tu teléfono móvil o computadora cada vez que un
            residente o fiscalizador <strong>guarde un nuevo reporte diario de obra</strong>.
          </p>

          {/* Status Message feedback */}
          {statusMessage && (
            <div
              className={`mt-3 p-2.5 rounded-xl text-xs ${
                messageType === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : messageType === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              {statusMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-4 space-y-2">
            {!isSubscribed ? (
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={loading || !isSupported || permission === 'denied'}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-orange-600 hover:bg-orange-500 transition-all shadow-md shadow-orange-600/20 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <BellRing className="w-4 h-4" />
                )}
                <span>Activar Notificaciones en este Equipo</span>
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs text-emerald-800 bg-emerald-100 hover:bg-emerald-200 transition-colors border border-emerald-300 cursor-pointer shadow-xs"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 text-emerald-700" />
                  )}
                  <span>Probar Notificación de Alerta</span>
                </button>

                <button
                  type="button"
                  onClick={handleUnsubscribe}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl font-medium text-[11px] text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <BellOff className="w-3.5 h-3.5" />
                  )}
                  <span>Desactivar en este dispositivo</span>
                </button>
              </div>
            )}
          </div>

          {/* iOS Safari Tip */}
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-start gap-2 text-[10.5px] text-slate-500 bg-slate-50 p-2.5 rounded-xl">
            <Smartphone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              <strong>¿Usas iPhone (iOS)?</strong> Agrega primero esta web a tu pantalla de inicio
              (icono <em>Compartir</em> → <em>Añadir a pantalla de inicio</em>) para recibir alertas
              incluso con la pantalla bloqueada.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
