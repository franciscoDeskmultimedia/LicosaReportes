import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:soporte@licosa.com';

let isVapidConfigured = false;
if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    isVapidConfigured = true;
  } catch (err) {
    console.error('Error al configurar VAPID en web-push:', err);
  }
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Guarda o actualiza la suscripción push de un dispositivo en la base de datos
 */
export async function savePushSubscription(
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  },
  userId?: string,
  userAgent?: string
) {
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    throw new Error('Suscripción push inválida');
  }

  return await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      userId: userId || null,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: userAgent || null,
      updatedAt: new Date(),
    },
    create: {
      userId: userId || null,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: userAgent || null,
    },
  });
}

/**
 * Elimina una suscripción push por su endpoint
 */
export async function removePushSubscription(endpoint: string) {
  try {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });
    return { success: true };
  } catch (err) {
    console.error('Error al remover suscripción push:', err);
    return { success: false };
  }
}

/**
 * Envía una notificación push a todos los dispositivos registrados en la plataforma
 */
export async function sendPushNotificationToAll(payload: PushPayload) {
  if (!isVapidConfigured) {
    console.warn('VAPID no está configurado. No se envió la notificación push.');
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany();
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const payloadString = JSON.stringify(payload);
  let sentCount = 0;
  let failedCount = 0;
  const expiredEndpoints: string[] = [];

  const promises = subscriptions.map(async (sub) => {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSub, payloadString);
      sentCount++;
    } catch (error: any) {
      failedCount++;
      // Si el navegador responde 404 o 410, la suscripción expiró o el usuario revocó permisos
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        expiredEndpoints.push(sub.endpoint);
      }
    }
  });

  await Promise.all(promises);

  // Limpiar suscripciones expiradas automáticamente
  if (expiredEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint: { in: expiredEndpoints },
      },
    });
  }

  return { sent: sentCount, failed: failedCount, cleaned: expiredEndpoints.length };
}

/**
 * Disparador específico cuando se crea o actualiza un reporte de obra desde la UI
 */
export async function notifyNewDailyReport(report: {
  id: string;
  reportNumber: number;
  projectCode: string;
  projectName: string;
  engineerName?: string;
  dateStr?: string;
}) {
  const title = `👷‍♂️ Nuevo Reporte: Obra ${report.projectCode}`;
  const engineerInfo = report.engineerName ? ` por ${report.engineerName}` : '';
  const dateInfo = report.dateStr ? ` (${report.dateStr})` : '';
  const body = `Se ha generado el Reporte Diario N° ${String(report.reportNumber).padStart(3, '0')}${engineerInfo}${dateInfo} en "${report.projectName}".`;
  const url = `/reportes/${report.id}`;

  return await sendPushNotificationToAll({
    title,
    body,
    url,
    tag: `report-${report.id}`,
  });
}

/**
 * Disparador cuando se sincronizan reportes diarios desde Excel
 */
export async function notifyDailyReportsSync(data: {
  projectId: string;
  projectCode: string;
  projectName: string;
  createdCount: number;
  updatedCount: number;
  datesSummary?: string[];
  latestReportId?: string;
}) {
  const title = `📊 Sincronización Excel: Obra ${data.projectCode}`;
  const parts: string[] = [];
  if (data.createdCount > 0) {
    parts.push(`${data.createdCount} reporte(s) nuevo(s)`);
  }
  if (data.updatedCount > 0) {
    parts.push(`${data.updatedCount} actualizado(s) por discrepancias`);
  }
  const summary = parts.length > 0 ? parts.join(' y ') : 'Sincronización completada';
  const datesText = data.datesSummary && data.datesSummary.length > 0
    ? ` [${data.datesSummary.slice(0, 3).join(', ')}${data.datesSummary.length > 3 ? '...' : ''}]`
    : '';

  const body = `${summary}${datesText} en la obra "${data.projectName}".`;
  const url = data.latestReportId ? `/reportes/${data.latestReportId}` : `/proyectos/${data.projectId}`;

  return await sendPushNotificationToAll({
    title,
    body,
    url,
    tag: `sync-${data.projectId}-${Date.now()}`,
  });
}

/**
 * Disparador cuando se edita un proyecto o su estado
 */
export async function notifyProjectUpdated(data: {
  projectId: string;
  projectCode: string;
  projectName: string;
  description?: string;
}) {
  const title = `🏗️ Obra Actualizada: ${data.projectCode}`;
  const body = data.description || `Se han modificado los datos contractuales de "${data.projectName}".`;
  const url = `/proyectos/${data.projectId}`;

  return await sendPushNotificationToAll({
    title,
    body,
    url,
    tag: `project-update-${data.projectId}`,
  });
}

/**
 * Disparador cuando se crea una nueva obra/proyecto
 */
export async function notifyProjectCreated(data: {
  projectId: string;
  projectCode: string;
  projectName: string;
  rubrosCount?: number;
}) {
  const title = `🚀 Nueva Obra Creada: ${data.projectCode}`;
  const rubrosText = data.rubrosCount ? ` con ${data.rubrosCount} rubros contractuales` : '';
  const body = `Se ha registrado e ingresado al sistema la obra "${data.projectName}"${rubrosText}.`;
  const url = `/proyectos/${data.projectId}`;

  return await sendPushNotificationToAll({
    title,
    body,
    url,
    tag: `project-create-${data.projectId}`,
  });
}

