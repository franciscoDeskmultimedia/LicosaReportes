'use server';

import { savePushSubscription, removePushSubscription, sendPushNotificationToAll } from '@/lib/pushNotifications';
import { getCurrentUser } from '@/lib/auth';

export async function registerPushSubscriptionAction(
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  },
  userAgent?: string
) {
  try {
    const user = await getCurrentUser();
    const saved = await savePushSubscription(subscription, user?.id, userAgent);
    return { success: true, id: saved.id };
  } catch (err: any) {
    console.error('Error al registrar suscripción push:', err);
    return { success: false, error: err.message || 'Error al guardar suscripción' };
  }
}

export async function unregisterPushSubscriptionAction(endpoint: string) {
  try {
    await removePushSubscription(endpoint);
    return { success: true };
  } catch (err: any) {
    console.error('Error al desuscribir push:', err);
    return { success: false, error: err.message };
  }
}

export async function sendTestNotificationAction() {
  try {
    const result = await sendPushNotificationToAll({
      title: '🔔 LICOSA - Notificación de Prueba',
      body: '¡Excelente! Las notificaciones de obra en tiempo real están funcionando en este dispositivo.',
      url: '/reportes',
      tag: 'test-notification',
    });
    return { success: true, ...result };
  } catch (err: any) {
    console.error('Error al enviar notificación de prueba:', err);
    return { success: false, error: err.message };
  }
}
