/**
 * Utilidades para manejo y formateo seguro de fechas en LICOSA
 * Evita desfasajes de huso horario (GMT-5 Ecuador vs UTC)
 */

/**
 * Convierte cualquier fecha (string o Date) a un Date seguro fijado a mediodía UTC
 * para evitar saltos de día por diferencias de huso horario.
 */
export function toSafeUTCDate(dateVal: string | Date | number): Date {
  if (typeof dateVal === 'number') {
    // Serial de Excel
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + dateVal * 86400000 + 12 * 3600000);
  }

  if (typeof dateVal === 'string') {
    const s = dateVal.trim();
    const isoDateMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoDateMatch) {
      const year = parseInt(isoDateMatch[1], 10);
      const month = parseInt(isoDateMatch[2], 10) - 1;
      const day = parseInt(isoDateMatch[3], 10);
      return new Date(Date.UTC(year, month, day, 12, 0, 0));
    }
    const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      return new Date(Date.UTC(year, month, day, 12, 0, 0));
    }
  }

  const d = new Date(dateVal);
  if (!isNaN(d.getTime())) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
  }

  return new Date();
}

/**
 * Obtiene la representación de fecha YYYY-MM-DD sin alteración por huso horario local
 */
export function toDateStringUTC(dateVal: string | Date | number): string {
  const d = toSafeUTCDate(dateVal);
  return d.toISOString().substring(0, 10);
}

/**
 * Formatea una fecha en español (Ecuador) forzando UTC para respetar siempre
 * el día calendario exacto del reporte.
 */
export function formatReportDate(
  dateVal: string | Date | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = toSafeUTCDate(dateVal);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return d.toLocaleDateString('es-EC', { ...defaultOptions, ...options });
}

/**
 * Formateo corto: DD/MM/YYYY en UTC
 */
export function formatReportDateShort(dateVal: string | Date | number): string {
  const d = toSafeUTCDate(dateVal);
  return d.toLocaleDateString('es-EC', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
