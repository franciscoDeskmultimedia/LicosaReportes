'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { recordAuditLog } from '@/lib/audit';
import * as XLSX from 'xlsx';
import fs from 'fs';

// Helper to convert Excel serial dates and string dates to Javascript Date (UTC)
function excelDateToDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) {
    return new Date(Date.UTC(val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate(), 12, 0, 0));
  }
  if (typeof val === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    // Agregar 12 horas (mediodía UTC) para que el huso horario de Ecuador (UTC-5) nunca retroceda de día
    return new Date(epoch.getTime() + val * 86400000 + 12 * 3600000);
  }
  if (typeof val === 'string') {
    const s = val.trim();
    // Formato YYYY-MM-DD
    const isoMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      return new Date(Date.UTC(year, month, day, 12, 0, 0));
    }
    // Formato DD/MM/YYYY o DD-MM-YYYY
    const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (dmy) {
      const day = parseInt(dmy[1], 10);
      const month = parseInt(dmy[2], 10) - 1;
      let year = parseInt(dmy[3], 10);
      if (year < 100) year += 2000;
      return new Date(Date.UTC(year, month, day, 12, 0, 0));
    }
    // Formato con mes en español (ej: 08-sep-2026 o 8 sep 2026)
    const months: Record<string, number> = {
      ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
      jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
    };
    const monthMatch = s.toLowerCase().match(/(\d{1,2})[\s\-_]+([a-z]{3})[\s\-_]+(\d{2,4})/);
    if (monthMatch && months[monthMatch[2]] !== undefined) {
      const day = parseInt(monthMatch[1], 10);
      const month = months[monthMatch[2]];
      let year = parseInt(monthMatch[3], 10);
      if (year < 100) year += 2000;
      return new Date(Date.UTC(year, month, day, 12, 0, 0));
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
    }
  }
  return new Date();
}

/**
 * Validador estricto para filtrar textos que no corresponden a maquinaria
 */
function isValidMachineryName(name: any): boolean {
  if (!name || typeof name !== 'string') return false;
  const s = name.trim().toUpperCase();
  if (s.length < 3) return false;
  const badKeywords = [
    'RUBRO', 'PRINCIPAL', 'DESCRIPCI', 'REPORTE', 'PERSONAL', 'CARGO',
    'CATEGOR', 'ACTIVIDAD', 'OBSERVACI', 'FIRMA', 'CLIMA', 'SEGURIDAD',
    'TOTAL', 'SUBTOTAL', 'ITEM', 'CANTIDAD', 'UNIDAD', 'HORAS', 'HOROMETRO',
    'FECHA', 'AYUDANTE', 'RESIDENTE', 'TOPOGRAFO', 'CADENERO', 'CHOFER',
    'OPERADOR', 'AMBIENTAL', 'PLANILLA'
  ];
  if (badKeywords.some((b) => s.includes(b))) return false;
  return true;
}


function parseNum(val: any, fallback = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/,/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? fallback : num;
  }
  return fallback;
}

function parseRatio(strVal: any): { day: number; accum: number } {
  if (typeof strVal === 'string' && strVal.includes('/')) {
    const parts = strVal.split('/').map((s) => parseNum(s.trim()));
    return { day: parts[0] || 0, accum: parts[1] || 0 };
  }
  return { day: parseNum(strVal), accum: parseNum(strVal) };
}

export interface DiscrepancyDetail {
  field: string;
  label: string;
  dbValue: string | number;
  excelValue: string | number;
  diff?: number;
}

export interface RubroExecutionPreview {
  rubroNumber: number;
  description: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  amount: number;
  tramo?: string;
  desde?: number;
  hasta?: number;
}

export interface RdoDetailedMetadata {
  rainHoursDay?: number;
  rainHoursNight?: number;
  lostRainHoursDay?: number;
  lostRainHoursAccum?: number;
  safetyTalkMinutesDay?: number;
  safetyTalkMinutesAccum?: number;
  incidentsDay?: number;
  incidentsAccum?: number;
  accidentsDay?: number;
  accidentsAccum?: number;
  activitiesTodayVial?: string | null;
  activitiesTodayPavimento?: string | null;
  activitiesTodayDrenaje?: string | null;
  activitiesTodayPuentes?: string | null;
  activitiesTodayTopografia?: string | null;
  activitiesTodaySenalizacion?: string | null;
  activitiesTodayAmbiental?: string | null;
  activitiesTomorrowVial?: string | null;
  activitiesTomorrowPavimento?: string | null;
  activitiesTomorrowDrenaje?: string | null;
  activitiesTomorrowPuentes?: string | null;
  activitiesTomorrowTopografia?: string | null;
  activitiesTomorrowSenalizacion?: string | null;
  activitiesTomorrowAmbiental?: string | null;
  noveltiesRisks?: string | null;
  contractorComments?: string | null;
  supervisorComments?: string | null;
  preparedByName?: string;
  preparedByTitle?: string;
  reviewedByName?: string;
  reviewedByTitle?: string;
  personnelLogs?: Array<{
    categoryRole: string;
    quantity: number;
    manHoursDay: number;
  }>;
}

export interface ReportSyncItem {
  id?: string; // ID en DB si existe
  date: string; // YYYY-MM-DD
  reportNumber: number;
  status: 'NEW' | 'DISCREPANCY' | 'IDENTICAL';
  statusLabel: string;
  sourceSheet: string;
  dayTotalAmount: number;
  dbTotalAmount?: number;
  rubrosCount: number;
  dbRubrosCount?: number;
  machineryCount: number;
  discrepancies: DiscrepancyDetail[];
  rubroExecutions: RubroExecutionPreview[];
  machineryLogs?: Array<{
    equipment: string;
    hours: number;
    inicio?: number;
    fin?: number;
  }>;
  rdoData?: RdoDetailedMetadata;
  selected: boolean;
}

export interface ExcelAnalysisResult {
  fileName: string;
  filePath?: string;
  detectedSheets: {
    name: string;
    type: 'REGISTRO_DIARIO' | 'RDO' | 'HOROMETRO' | 'RUBROS' | 'OTHER';
    rowCount: number;
    description: string;
  }[];
  detectedProject?: {
    id: string;
    code: string;
    name: string;
  };
  totalDatesFound: number;
  newCount: number;
  discrepancyCount: number;
  identicalCount: number;
  items: ReportSyncItem[];
}

/**
 * Extrae metadatos completos y estructura detallada de una hoja RDO
 */
function extractFullRdoData(
  ws: XLSX.WorkSheet,
  sheetName: string
): {
  dateStr: string;
  reportNumber: number;
  dayAmount: number;
  rubros: RubroExecutionPreview[];
  machinery: Array<{ equipment: string; hours: number }>;
  rdoDetails: RdoDetailedMetadata;
} {
  const d = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
  let rawDate: any = null;
  let reportNumber = 0;
  let dayAmount = 0;

  for (let r = 0; r < Math.min(15, d.length); r++) {
    const row = d[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').toUpperCase().trim();
      if (cell === 'FECHA:' || cell === 'FECHA') {
        rawDate = row[c + 1] || row[c + 2];
      }
      if (cell.includes('REPORTE N') || cell.includes('REPORTE Nº') || cell === 'RDO' || cell.startsWith('RDO N')) {
        const cellDigits = cell.replace(/[^0-9]/g, '');
        if (cellDigits.length > 0 && cellDigits.length <= 5) {
          reportNumber = parseInt(cellDigits, 10);
        } else {
          const n1 = parseNum(row[c + 1]);
          const n2 = typeof row[c + 2] === 'number' ? row[c + 2] : (typeof row[c + 2] === 'string' && !String(row[c + 2]).includes(':') ? parseNum(row[c + 2]) : 0);
          if (n1 > 0) reportNumber = Math.round(n1);
          else if (n2 > 0) reportNumber = Math.round(n2);
        }
      }
      if (cell.includes('MONTO DE TRABAJOS EJECUTADOS')) {
        const amt = parseNum(row[c + 1] || row[c + 2]);
        if (amt > 0) dayAmount = amt;
      }
    }
  }

  // Si no se encontró número en las celdas, verificar si el nombre de la pestaña lo contiene (ej. RDO_05, Reporte 12)
  if (reportNumber <= 0) {
    const matchSheet = sheetName.match(/RDO[_\s-]*(\d+)/i) || sheetName.match(/REP[_\s-]*(\d+)/i);
    if (matchSheet) {
      reportNumber = parseInt(matchSheet[1], 10);
    }
  }

  // Fallbacks estándar por celdas típicas en plantilla LICOSA
  if (!rawDate && d[4]?.[2]) rawDate = d[4]?.[2];
  if (dayAmount === 0 && d[5]?.[2]) dayAmount = parseNum(d[5]?.[2], 0);

  let dateStr = '';
  if (rawDate) {
    dateStr = excelDateToDate(rawDate).toISOString().substring(0, 10);
  } else {
    const cleaned = sheetName.replace(/[^\d\-_/.]/g, '').trim();
    if (cleaned) {
      const parts = cleaned.split(/[-_/.]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          dateStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else {
          const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          dateStr = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      } else if (parts.length === 2) {
        dateStr = `2026-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }

  if (!dateStr || isNaN(Date.parse(dateStr))) {
    dateStr = new Date().toISOString().substring(0, 10);
  }

  // 1. Detección Dinámica de Secciones mediante Marcadores Semánticos (Sin filas hardcodeadas)
  let rowClima = -1;
  let rowRecursos = -1;
  let rowRubros = -1;
  let rowActHoy = -1;
  let rowActManana = -1;
  let rowNovedades = -1;
  let rowComentarios = -1;
  let rowFirmas = -1;

  for (let i = 0; i < d.length; i++) {
    const r = d[i];
    if (!r || !Array.isArray(r)) continue;
    const line = r.map((c) => String(c || '').toUpperCase().trim()).join(' ');

    if (rowClima === -1 && (line.includes('REPORTE DE CLIMA') || line.includes('CLIMA Y EHS') || line.includes('1. REPORTE'))) {
      rowClima = i;
    }
    if (rowRecursos === -1 && (line.includes('REPORTE DE EQUIPO') || line.includes('DESCRIPCIÓN DEL EQUIPO') || line.includes('2. REPORTE'))) {
      rowRecursos = i;
    }
    if (rowRubros === -1 && (line.includes('RUBROS PRINCIPALES') || line.includes('4. RUBROS') || line.includes('N° RUBRO'))) {
      rowRubros = i;
    }
    if (rowActHoy === -1 && (line.includes('ACTIVIDADES REALIZADAS') || line.includes('RESUMEN DE ACTIVIDADES') || line.includes('6. RESUMEN') || line.includes('5. RESUMEN'))) {
      rowActHoy = i;
    }
    if (rowActManana === -1 && (line.includes('ACTIVIDADES A REALIZAR') || line.includes('ACTIVIDADES PROGRAMADAS') || line.includes('7. ACTIVIDADES') || line.includes('6. ACTIVIDADES'))) {
      rowActManana = i;
    }
    if (rowNovedades === -1 && (line.includes('NOVEDADES') || line.includes('PARALIZACIONES') || line.includes('RIESGOS DE SEGURIDAD') || line.includes('8. NOVEDADES') || line.includes('7. NOVEDADES'))) {
      rowNovedades = i;
    }
    if (rowComentarios === -1 && (line.includes('COMENTARIOS') || line.includes('9. COMENTARIOS') || line.includes('8. COMENTARIOS'))) {
      rowComentarios = i;
    }
    if (rowFirmas === -1 && (line.includes('11. FIRMAS') || line.includes('10. FIRMAS') || line.includes('FIRMAS') || line.includes('ELABORADO POR'))) {
      rowFirmas = i;
    }
  }

  // --- SECCIÓN CLIMA & EHS DINÁMICA ---
  let rainHoursDay = 0;
  let rainHoursNight = 0;
  let lostRainHoursDay = 0;
  let lostRainHoursAccum = 0;
  let safetyTalkMinutesDay = 5;
  let safetyTalkMinutesAccum = 10;
  let incidentsDay = 0;
  let incidentsAccum = 0;
  let accidentsDay = 0;
  let accidentsAccum = 0;

  const climaStart = rowClima !== -1 ? rowClima : 6;
  const climaEnd = rowRecursos !== -1 ? rowRecursos : climaStart + 8;

  for (let r = climaStart; r < Math.min(climaEnd, d.length); r++) {
    const row = d[r];
    if (!row || !Array.isArray(row)) continue;
    for (let c = 0; c < row.length; c++) {
      const txt = String(row[c] || '').toUpperCase().trim();
      if (txt.includes('LLUVIA (DIA)') || txt.includes('LLUVIA (DÍA)')) {
        rainHoursDay = parseNum(row[c + 1] !== undefined && row[c + 1] !== '' ? row[c + 1] : row[c + 2], 0);
      } else if (txt.includes('LLUVIA (NOCHE)')) {
        rainHoursNight = parseNum(row[c + 1] !== undefined && row[c + 1] !== '' ? row[c + 1] : row[c + 2], 0);
      } else if (txt.includes('PERDIDAS POR LLUVIA') && !txt.includes('ACUM')) {
        lostRainHoursDay = parseNum(row[c + 1] !== undefined && row[c + 1] !== '' ? row[c + 1] : row[c + 2], 0);
      } else if (txt.includes('PERDIDAS ACUM') || (txt.includes('PERDIDAS') && txt.includes('ACUM'))) {
        lostRainHoursAccum = parseNum(row[c + 1] !== undefined && row[c + 1] !== '' ? row[c + 1] : row[c + 2], 0);
      } else if (txt.includes('CHARLA DIARIA')) {
        safetyTalkMinutesDay = parseNum(row[c + 1] !== undefined && row[c + 1] !== '' ? row[c + 1] : row[c + 2], 5);
      } else if (txt.includes('CHARLA ACUM')) {
        safetyTalkMinutesAccum = parseNum(row[c + 1] !== undefined && row[c + 1] !== '' ? row[c + 1] : row[c + 2], 10);
      } else if (txt.includes('INCIDENTES')) {
        const ratio = parseRatio(row[c + 1] !== undefined && row[c + 1] !== '' ? row[c + 1] : row[c + 2]);
        incidentsDay = ratio.day;
        incidentsAccum = ratio.accum;
      } else if (txt.includes('ACCIDENTES')) {
        const ratio = parseRatio(row[c + 1] !== undefined && row[c + 1] !== '' ? row[c + 1] : row[c + 2]);
        accidentsDay = ratio.day;
        accidentsAccum = ratio.accum;
      }
    }
  }

  // --- SECCIÓN EQUIPOS & PERSONAL EN PARALELO (Cajas separadas por columna) ---
  const machinery: Array<{ equipment: string; hours: number }> = [];
  const personnel: Array<{ categoryRole: string; quantity: number; manHoursDay: number }> = [];

  let eqHeaderRow = -1;
  let colEqDesc = 0;
  let colEqQty = 4;
  let colEqHrs = 5;

  let colPersRole = 6;
  let colPersQty = 10;
  let colPersHrs = 11;
  let colDivider = 6; // Columna que divide Equipos (izquierda) de Personal (derecha)

  if (rowRecursos !== -1) {
    for (let r = rowRecursos; r < Math.min(rowRecursos + 4, d.length); r++) {
      const row = d[r];
      if (!row) continue;
      const strRow = row.map((c) => String(c || '').toUpperCase());
      if (strRow.some((c) => c.includes('DESCRIPCIÓN') || c.includes('EQUIPO'))) {
        eqHeaderRow = r;
        strRow.forEach((c, idx) => {
          if (!c) return;
          if (c.includes('CATEGORÍA') || c.includes('CARGO') || c.includes('PERSONAL')) {
            colDivider = idx;
            colPersRole = idx;
          }
        });
        strRow.forEach((c, idx) => {
          if (!c) return;
          if (idx < colDivider) {
            if (c.includes('DESCRIPCIÓN') || c.includes('EQUIPO')) colEqDesc = idx;
            if (c.includes('CANTIDAD') || c === 'CANT') colEqQty = idx;
            if (c.includes('HORAS') || c.includes('HORA')) colEqHrs = idx;
          } else {
            if (c.includes('CATEGORÍA') || c.includes('CARGO')) colPersRole = idx;
            if (c.includes('N°') || c.includes('CANT') || c === 'N') colPersQty = idx;
            if (c.includes('H-HOMBRE') || c.includes('HOMBRE') || c.includes('HORA')) colPersHrs = idx;
          }
        });
        break;
      }
    }
  }

  const recStart = eqHeaderRow !== -1 ? eqHeaderRow + 1 : (rowRecursos !== -1 ? rowRecursos + 2 : 13);
  const recEnd = rowRubros !== -1 ? rowRubros : recStart + 25;

  for (let r = recStart; r < Math.min(recEnd, d.length); r++) {
    const row = d[r];
    if (!row || !Array.isArray(row)) continue;
    const lineText = row.map((c) => String(c || '')).join(' ').toUpperCase();
    if (lineText.includes('4. RUBROS') || lineText.includes('RUBROS PRINCIPALES') || lineText.includes('N° RUBRO')) {
      break;
    }

    // CAJA IZQUIERDA: EQUIPOS
    const eqName = String(row[colEqDesc] || '').trim();
    const eqHrs = parseNum(row[colEqHrs], 0);
    const eqQty = parseNum(row[colEqQty], 0);

    if (isValidMachineryName(eqName) && (eqHrs > 0 || eqQty > 0)) {
      machinery.push({ equipment: eqName, hours: eqHrs });
    }

    // CAJA DERECHA: PERSONAL
    const persName = String(row[colPersRole] || '').trim();
    const persQty = parseNum(row[colPersQty], 0);
    const persHrs = parseNum(row[colPersHrs], 0);

    if (
      persName.length > 2 &&
      !persName.toUpperCase().includes('CATEGORÍA') &&
      !persName.toUpperCase().includes('CARGO') &&
      !persName.toUpperCase().includes('PERSONAL') &&
      (persQty > 0 || persHrs > 0)
    ) {
      personnel.push({ categoryRole: persName, quantity: persQty, manHoursDay: persHrs });
    }
  }

  // --- SECCIÓN RUBROS PRINCIPALES DEL DÍA (Dinámica sin límite de filas) ---
  const rubros: RubroExecutionPreview[] = [];
  let calculatedDayAmount = 0;

  let rubroHeaderRow = -1;
  let colRNum = 0;
  let colRDesc = 1;
  let colRUnit = 5;
  let colRCantDia = 6;
  let colRMontoDia = 8;

  if (rowRubros !== -1) {
    for (let r = rowRubros; r < Math.min(rowRubros + 4, d.length); r++) {
      const row = d[r];
      if (!row) continue;
      const strRow = row.map((c) => String(c || '').toUpperCase());
      if (strRow.some((c) => c.includes('N°') || c.includes('RUBRO') || c.includes('DESCRIPCIÓN'))) {
        rubroHeaderRow = r;
        strRow.forEach((c, idx) => {
          if (!c) return;
          if (c.includes('N°') || c.includes('RUBRO')) colRNum = idx;
          if (c.includes('DESCRIPCIÓN')) colRDesc = idx;
          if (c.includes('UNID')) colRUnit = idx;
          if (c.includes('CANT. DÍA') || c.includes('CANT DIA') || c.includes('CANTIDAD DÍA')) colRCantDia = idx;
          if (c.includes('MONTO DÍA') || c.includes('MONTO DIA')) colRMontoDia = idx;
        });
        break;
      }
    }
  }

  const rubroStart = rubroHeaderRow !== -1 ? rubroHeaderRow + 1 : (rowRubros !== -1 ? rowRubros + 2 : 25);
  for (let r = rubroStart; r < d.length; r++) {
    const row = d[r];
    if (!row || !Array.isArray(row)) continue;
    const lineText = row.map((c) => String(c || '')).join(' ').toUpperCase();

    // Detener la lectura cuando termine la tabla de rubros
    if (
      lineText.includes('SUBTOTAL') ||
      lineText.includes('TOTAL RUBROS') ||
      lineText.includes('5. ACTIVIDADES') ||
      lineText.includes('6. RESUMEN') ||
      lineText.includes('5. AVANCE ECONÓMICO') ||
      lineText.includes('ACTIVIDADES REALIZADAS')
    ) {
      break;
    }

    const num = parseInt(String(row[colRNum] || '').trim(), 10);
    if (isNaN(num) || num <= 0) continue;

    const desc = String(row[colRDesc] || '').trim();
    const unit = String(row[colRUnit] || 'u').trim();
    const qty = parseNum(row[colRCantDia], 0);
    const amt = parseNum(row[colRMontoDia], 0);
    const unitPrice = qty > 0 && amt > 0 ? amt / qty : 0;

    if (desc.length > 1 && (qty > 0 || amt > 0)) {
      rubros.push({
        rubroNumber: num,
        description: desc,
        unit,
        unitPrice,
        quantity: qty,
        amount: amt,
      });
      calculatedDayAmount += amt;
    }
  }

  if (dayAmount === 0 && calculatedDayAmount > 0) {
    dayAmount = calculatedDayAmount;
  }

  // --- SECCIÓN ACTIVIDADES REALIZADAS HOY (Búsqueda Semántica) ---
  let activitiesTodayVial: string | null = null;
  let activitiesTodayPavimento: string | null = null;
  let activitiesTodayDrenaje: string | null = null;
  let activitiesTodayPuentes: string | null = null;
  let activitiesTodayTopografia: string | null = null;
  let activitiesTodaySenalizacion: string | null = null;
  let activitiesTodayAmbiental: string | null = null;

  if (rowActHoy !== -1) {
    const actEnd = rowActManana !== -1 ? rowActManana : (rowNovedades !== -1 ? rowNovedades : rowActHoy + 12);
    for (let r = rowActHoy + 1; r < Math.min(actEnd, d.length); r++) {
      const row = d[r];
      if (!row || !Array.isArray(row)) continue;
      const tag = String(row[0] || row[1] || '').toUpperCase();
      const val = String(row[2] || row[3] || row[1] || '').trim();
      if (!val || val.length < 2) continue;

      if (tag.includes('VIAL')) activitiesTodayVial = val;
      else if (tag.includes('PAVIMENTO')) activitiesTodayPavimento = val;
      else if (tag.includes('DRENAJE')) activitiesTodayDrenaje = val;
      else if (tag.includes('PUENTES') || tag.includes('ESTRUCTURAS')) activitiesTodayPuentes = val;
      else if (tag.includes('TOPOGRAF')) activitiesTodayTopografia = val;
      else if (tag.includes('SEÑALIZAC')) activitiesTodaySenalizacion = val;
      else if (tag.includes('AMBIENTAL') || tag.includes('SEGURIDAD')) activitiesTodayAmbiental = val;
    }
  }

  // --- SECCIÓN ACTIVIDADES MAÑANA (Búsqueda Semántica) ---
  let activitiesTomorrowVial: string | null = null;
  if (rowActManana !== -1) {
    const mananaEnd = rowNovedades !== -1 ? rowNovedades : (rowComentarios !== -1 ? rowComentarios : rowActManana + 8);
    const mananaParts: string[] = [];
    for (let r = rowActManana + 1; r < Math.min(mananaEnd, d.length); r++) {
      const row = d[r];
      if (!row) continue;
      const txt = row.map((c) => String(c || '').trim()).filter((c) => c.length > 2 && !c.toUpperCase().includes('ACTIVIDADES') && !c.toUpperCase().includes('SECTOR') && !c.toUpperCase().includes('DETALLE')).join(' ');
      if (txt) mananaParts.push(txt);
    }
    activitiesTomorrowVial = mananaParts.join('; ') || null;
  }

  // --- SECCIÓN NOVEDADES Y RIESGOS ---
  let noveltiesRisks: string | null = null;
  if (rowNovedades !== -1) {
    const novEnd = rowComentarios !== -1 ? rowComentarios : (rowFirmas !== -1 ? rowFirmas : rowNovedades + 6);
    const novParts: string[] = [];
    for (let r = rowNovedades + 1; r < Math.min(novEnd, d.length); r++) {
      const row = d[r];
      if (!row) continue;
      const txt = row.map((c) => String(c || '').trim()).filter((c) => c.length > 2 && !c.toUpperCase().includes('NOVEDADES') && !c.toUpperCase().includes('RIESGOS') && !c.toUpperCase().includes('PARALIZACIONES')).join(' ');
      if (txt) novParts.push(txt);
    }
    noveltiesRisks = novParts.join('; ') || null;
  }

  // --- SECCIÓN COMENTARIOS ---
  let contractorComments: string | null = null;
  let supervisorComments: string | null = null;
  if (rowComentarios !== -1) {
    const comEnd = rowFirmas !== -1 ? rowFirmas : rowComentarios + 8;
    for (let r = rowComentarios; r < Math.min(comEnd, d.length); r++) {
      const row = d[r];
      if (!row) continue;
      for (let c = 0; c < row.length; c++) {
        const txt = String(row[c] || '').toUpperCase();
        if (txt.includes('CONTRATISTA')) {
          contractorComments = String(row[c + 1] || row[c + 2] || d[r + 1]?.[c] || '').trim() || null;
        }
        if (txt.includes('FISCALIZAC')) {
          supervisorComments = String(row[c + 1] || row[c + 2] || d[r + 1]?.[c] || '').trim() || null;
        }
      }
    }
  }

  // --- SECCIÓN FIRMAS DINÁMICA ---
  let preparedByName = 'Ing. María Fernanda Ligua';
  let preparedByTitle = 'Ing. de Planillas';
  let reviewedByName = 'Ing. Jerson López';
  let reviewedByTitle = 'Residente de Obra';

  const firmasScanStart = rowFirmas !== -1 ? rowFirmas : Math.max(0, d.length - 20);
  for (let r = firmasScanStart; r < d.length; r++) {
    const row = d[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').toUpperCase().trim();
      if (cell.includes('ELABORADO')) {
        const val = row[c + 1] || d[r + 1]?.[c] || d[r - 1]?.[c];
        if (val && String(val).length > 3) preparedByName = String(val).trim();
      }
      if (cell.includes('REVISADO')) {
        const val = row[c + 1] || d[r + 1]?.[c] || d[r - 1]?.[c];
        if (val && String(val).length > 3) reviewedByName = String(val).trim();
      }
    }
  }

  const rdoDetails: RdoDetailedMetadata = {
    rainHoursDay,
    rainHoursNight,
    lostRainHoursDay,
    lostRainHoursAccum,
    safetyTalkMinutesDay,
    safetyTalkMinutesAccum,
    incidentsDay,
    incidentsAccum,
    accidentsDay,
    accidentsAccum,
    activitiesTodayVial,
    activitiesTodayPavimento,
    activitiesTodayDrenaje,
    activitiesTodayPuentes,
    activitiesTodayTopografia,
    activitiesTodaySenalizacion,
    activitiesTodayAmbiental,
    activitiesTomorrowVial,
    noveltiesRisks,
    contractorComments,
    supervisorComments,
    preparedByName,
    preparedByTitle,
    reviewedByName,
    reviewedByTitle,
    personnelLogs: personnel,
  };

  return {
    dateStr,
    reportNumber,
    dayAmount,
    rubros,
    machinery,
    rdoDetails,
  };
}

/**
 * Detecta si el libro de Excel es un único RDO seccionado en múltiples pestañas
 */
function isMultiTabRdoWorkbook(sheetNames: string[]): boolean {
  const lowers = sheetNames.map((s) => s.toLowerCase().trim());
  const hasGeneral = lowers.some((s) => s.includes('general') || s.includes('0.') || s.includes('cabecera') || s.includes('datos'));
  const hasClima = lowers.some((s) => s.includes('clima') || s.includes('ehs') || s.includes('1.'));
  const hasEquipo = lowers.some((s) => (s.includes('equipo') || s.includes('2.')) && !s.includes('control de horometro'));
  const hasPersonal = lowers.some((s) => s.includes('personal') || s.includes('3.'));
  const hasRubros = lowers.some((s) => s.includes('rubro') || s.includes('4.'));

  let score = 0;
  if (hasGeneral) score++;
  if (hasClima) score++;
  if (hasEquipo) score++;
  if (hasPersonal) score++;
  if (hasRubros) score++;

  return score >= 3;
}

/**
 * Extrae todos los datos de un RDO distribuido en 11 pestañas especializadas
 */
function extractMultiTabRdoData(wb: XLSX.WorkBook): {
  dateStr: string;
  reportNumber: number;
  dayAmount: number;
  roadSection: string;
  rubros: RubroExecutionPreview[];
  machinery: Array<{ equipment: string; hours: number }>;
  rdoDetails: RdoDetailedMetadata;
} {
  const findSheet = (pattern: string) => {
    const p = pattern.toLowerCase();
    const found = wb.SheetNames.find((name) => name.toLowerCase().includes(p));
    return found ? wb.Sheets[found] : null;
  };

  // 1. Hoja General / Cabecera
  const wsGeneral = findSheet('general') || findSheet('0.') || findSheet('datos') || wb.Sheets[wb.SheetNames[0]];
  const genData = wsGeneral ? (XLSX.utils.sheet_to_json(wsGeneral, { header: 1 }) as any[][]) : [];

  let dateStr = '';
  let reportNumber = 0;
  let dayAmount = 0;
  let roadSection = '';

  for (let r = 0; r < Math.min(15, genData.length); r++) {
    const row = genData[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c] || '').toUpperCase().trim();
      if (cellVal.includes('FECHA')) {
        const val = row[c + 1] !== undefined && row[c + 1] !== '' ? row[c + 1] : row[c + 2];
        if (val) {
          dateStr = excelDateToDate(val).toISOString().substring(0, 10);
        }
      }
      if (cellVal.includes('REPORTE N') || cellVal.includes('REPORTE Nº')) {
        const val = row[c + 1] !== undefined && row[c + 1] !== '' ? row[c + 1] : row[c + 2];
        const num = parseNum(val, 0);
        if (num > 0) reportNumber = Math.round(num);
      }
      if (cellVal.includes('TRAMO') || cellVal.includes('SEGMENTO')) {
        const val = row[c + 1] !== undefined && row[c + 1] !== '' ? row[c + 1] : row[c + 2];
        if (val) roadSection = String(val).trim();
      }
      if (cellVal.includes('MONTO TRABAJOS') || cellVal.includes('MONTO DE TRABAJOS')) {
        const val = row[c + 1] !== undefined && row[c + 1] !== '' ? row[c + 1] : row[c + 2];
        const amt = parseNum(val, 0);
        if (amt > 0) dayAmount = amt;
      }
    }
  }

  if (!dateStr || isNaN(Date.parse(dateStr))) {
    dateStr = new Date().toISOString().substring(0, 10);
  }

  // 2. Hoja Clima y EHS
  const wsClima = findSheet('clima') || findSheet('ehs') || findSheet('1.');
  const climaData = wsClima ? (XLSX.utils.sheet_to_json(wsClima, { header: 1 }) as any[][]) : [];
  let rainHoursDay = 0;
  let rainHoursNight = 0;
  let lostRainHoursDay = 0;
  let lostRainHoursAccum = 0;
  let safetyTalkMinutesDay = 5;
  let safetyTalkMinutesAccum = 10;
  let incidentsDay = 0;
  let incidentsAccum = 0;
  let accidentsDay = 0;
  let accidentsAccum = 0;

  for (const row of climaData) {
    if (!row || !Array.isArray(row)) continue;
    for (let c = 0; c < row.length; c++) {
      const text = String(row[c] || '').toLowerCase().trim();
      if (text.includes('horas de lluvia (dia)') || text.includes('lluvia (dia)')) {
        rainHoursDay = parseNum(row[c + 1], 0);
      } else if (text.includes('horas de lluvia (noche)') || text.includes('lluvia (noche)')) {
        rainHoursNight = parseNum(row[c + 1], 0);
      } else if (text.includes('horas perdidas por lluvia') && !text.includes('acum')) {
        lostRainHoursDay = parseNum(row[c + 1], 0);
      } else if (text.includes('horas perdidas acum')) {
        lostRainHoursAccum = parseNum(row[c + 1], 0);
      } else if (text.includes('charla diaria')) {
        safetyTalkMinutesDay = parseNum(row[c + 1], 5);
      } else if (text.includes('charla acum')) {
        safetyTalkMinutesAccum = parseNum(row[c + 1], 10);
      } else if (text.includes('incidentes')) {
        const ratio = parseRatio(row[c + 1]);
        incidentsDay = ratio.day;
        incidentsAccum = ratio.accum;
      } else if (text.includes('accidentes')) {
        const ratio = parseRatio(row[c + 1]);
        accidentsDay = ratio.day;
        accidentsAccum = ratio.accum;
      }
    }
  }

  // 3. Hoja Equipos
  const wsEquipo = findSheet('equipo') || findSheet('2.');
  const equipoData = wsEquipo ? (XLSX.utils.sheet_to_json(wsEquipo, { header: 1 }) as any[][]) : [];
  const machinery: Array<{ equipment: string; hours: number }> = [];

  let eqHeader = -1;
  let colEqDesc = 0;
  let colEqQty = 2;
  let colEqHrs = 3;

  for (let i = 0; i < Math.min(10, equipoData.length); i++) {
    const row = equipoData[i];
    if (!row) continue;
    const str = row.map((c) => String(c || '').toUpperCase());
    if (str.some((c) => c.includes('DESCRIPCIÓN') || c.includes('EQUIPO'))) {
      eqHeader = i;
      str.forEach((c, idx) => {
        if (c.includes('DESCRIPCIÓN') || c.includes('EQUIPO')) colEqDesc = idx;
        if (c.includes('CANTIDAD') || c === 'CANT') colEqQty = idx;
        if (c.includes('HORAS') || c.includes('HR')) colEqHrs = idx;
      });
      break;
    }
  }

  if (eqHeader !== -1) {
    for (let i = eqHeader + 1; i < equipoData.length; i++) {
      const row = equipoData[i];
      if (!row || !Array.isArray(row)) continue;
      const eqName = String(row[colEqDesc] || '').trim();
      const qty = parseNum(row[colEqQty], 0);
      const hrs = parseNum(row[colEqHrs], 0);

      if (isValidMachineryName(eqName) && (hrs > 0 || qty > 0)) {
        machinery.push({ equipment: eqName, hours: hrs });
      }
    }
  }

  // 4. Hoja Personal
  const wsPersonal = findSheet('personal') || findSheet('3.');
  const persData = wsPersonal ? (XLSX.utils.sheet_to_json(wsPersonal, { header: 1 }) as any[][]) : [];
  const personnel: Array<{ categoryRole: string; quantity: number; manHoursDay: number }> = [];

  let persHeader = -1;
  let colPersRole = 0;
  let colPersQty = 1;
  let colPersHrs = 2;

  for (let i = 0; i < Math.min(10, persData.length); i++) {
    const row = persData[i];
    if (!row) continue;
    const str = row.map((c) => String(c || '').toUpperCase());
    if (str.some((c) => c.includes('CATEGOR') || c.includes('CARGO'))) {
      persHeader = i;
      str.forEach((c, idx) => {
        if (c.includes('CATEGOR') || c.includes('CARGO')) colPersRole = idx;
        if (c.includes('N°') || c.includes('CANT') || c === 'N') colPersQty = idx;
        if (c.includes('H-HOMBRE') || c.includes('HORA')) colPersHrs = idx;
      });
      break;
    }
  }

  if (persHeader !== -1) {
    for (let i = persHeader + 1; i < persData.length; i++) {
      const row = persData[i];
      if (!row || !Array.isArray(row)) continue;
      const role = String(row[colPersRole] || '').trim();
      const qty = parseNum(row[colPersQty], 0);
      const hrs = parseNum(row[colPersHrs], 0);

      if (role.length > 2 && !role.toUpperCase().includes('CATEGORÍA') && (qty > 0 || hrs > 0)) {
        personnel.push({ categoryRole: role, quantity: qty, manHoursDay: hrs });
      }
    }
  }

  // 5. Hoja Rubros del Día
  const wsRubros = findSheet('rubro') || findSheet('4.');
  const rubrosData = wsRubros ? (XLSX.utils.sheet_to_json(wsRubros, { header: 1 }) as any[][]) : [];
  const rubros: RubroExecutionPreview[] = [];
  let calculatedDayAmount = 0;

  // Mapa de Precios Unitarios desde la pestaña CATÁLOGO RUBROS (para fallback automático si solo se ingresa cantidad)
  const wsCat = findSheet('catálogo') || findSheet('catalogo') || findSheet('presupuesto');
  const catData = wsCat ? (XLSX.utils.sheet_to_json(wsCat, { header: 1 }) as any[][]) : [];
  const puCatalog = new Map<number, number>();
  for (let i = 2; i < catData.length; i++) {
    const row = catData[i];
    if (!row || !row[0]) continue;
    const rNum = parseInt(String(row[0]).trim(), 10);
    const pu = parseNum(row[3], 0);
    if (!isNaN(rNum) && pu > 0) {
      puCatalog.set(rNum, pu);
    }
  }

  let rubroHeader = -1;
  let colRNum = 0;
  let colRDesc = 1;
  let colRUnit = 2;
  let colRCantDia = 3;
  let colRMontoDia = 5;

  for (let i = 0; i < Math.min(10, rubrosData.length); i++) {
    const row = rubrosData[i];
    if (!row) continue;
    const str = row.map((c) => String(c || '').toUpperCase());
    if (str.some((c) => c.includes('RUBRO') || c.includes('DESCRIPCIÓN'))) {
      rubroHeader = i;
      str.forEach((c, idx) => {
        if (c.includes('N°') || c.includes('RUBRO')) colRNum = idx;
        if (c.includes('DESCRIPCIÓN')) colRDesc = idx;
        if (c.includes('UNID')) colRUnit = idx;
        if (c.includes('CANT. DÍA') || c.includes('CANT DIA') || c.includes('CANTIDAD DÍA')) colRCantDia = idx;
        if (c.includes('MONTO DÍA') || c.includes('MONTO DIA')) colRMontoDia = idx;
      });
      break;
    }
  }

  if (rubroHeader !== -1) {
    for (let i = rubroHeader + 1; i < rubrosData.length; i++) {
      const row = rubrosData[i];
      if (!row || !Array.isArray(row)) continue;
      const lineStr = row.map((c) => String(c || '').toUpperCase()).join(' ');
      if (lineStr.includes('SUBTOTAL') || lineStr.includes('TOTAL')) break;

      const num = parseInt(String(row[colRNum] || '').trim(), 10);
      if (isNaN(num) || num <= 0) continue;

      const desc = String(row[colRDesc] || '').trim();
      const unit = String(row[colRUnit] || 'u').trim();
      const qty = parseNum(row[colRCantDia], 0);
      let amt = parseNum(row[colRMontoDia], 0);
      let unitPrice = qty > 0 && amt > 0 ? amt / qty : (puCatalog.get(num) || 0);

      // Si el usuario ingresó la cantidad del día pero el visor no calculó el monto dinámicamente:
      if (amt === 0 && qty > 0 && unitPrice > 0) {
        amt = Number((qty * unitPrice).toFixed(2));
      }

      if (desc.length > 1 && (qty > 0 || amt > 0)) {
        rubros.push({
          rubroNumber: num,
          description: desc,
          unit,
          unitPrice,
          quantity: qty,
          amount: amt,
        });
        calculatedDayAmount += amt;
      }
    }
  }

  if (dayAmount === 0 && calculatedDayAmount > 0) {
    dayAmount = calculatedDayAmount;
  }

  // 6. Actividades Hoy
  const wsActHoy = findSheet('actividades hoy') || findSheet('6.');
  const actHoyData = wsActHoy ? (XLSX.utils.sheet_to_json(wsActHoy, { header: 1 }) as any[][]) : [];
  let actVial: string | null = null;
  let actPavimento: string | null = null;
  let actDrenaje: string | null = null;
  let actPuentes: string | null = null;
  let actTopografia: string | null = null;
  let actSenalizacion: string | null = null;
  let actAmbiental: string | null = null;

  for (const row of actHoyData) {
    if (!row || row.length < 2) continue;
    const tag = String(row[0] || '').toUpperCase();
    const val = String(row[1] || '').trim();
    if (!val) continue;
    if (tag.includes('VIAL')) actVial = val;
    else if (tag.includes('PAVIMENTO')) actPavimento = val;
    else if (tag.includes('DRENAJE')) actDrenaje = val;
    else if (tag.includes('PUENTES') || tag.includes('ESTRUCTURAS')) actPuentes = val;
    else if (tag.includes('TOPOGRAF')) actTopografia = val;
    else if (tag.includes('SEÑALIZAC')) actSenalizacion = val;
    else if (tag.includes('AMBIENTAL') || tag.includes('SEGURIDAD')) actAmbiental = val;
  }

  // 7. Actividades Mañana
  const wsActManana = findSheet('actividades mañana') || findSheet('7.');
  const actMananaData = wsActManana ? (XLSX.utils.sheet_to_json(wsActManana, { header: 1 }) as any[][]) : [];
  const mananaParts: string[] = [];
  for (const row of actMananaData) {
    if (!row) continue;
    const val = String(row[1] || row[0] || '').trim();
    if (val && !val.toUpperCase().includes('PLANIFICADOS') && !val.toUpperCase().includes('DETALLE')) {
      mananaParts.push(val);
    }
  }
  const activitiesTomorrowVial = mananaParts.join('; ') || null;

  // 8. Novedades y Riesgos
  const wsNov = findSheet('novedades') || findSheet('8.');
  const novData = wsNov ? (XLSX.utils.sheet_to_json(wsNov, { header: 1 }) as any[][]) : [];
  const novParts: string[] = [];
  for (const row of novData) {
    if (!row) continue;
    const val = String(row[1] || row[0] || '').trim();
    if (val && !val.toUpperCase().includes('CONCEPTO') && !val.toUpperCase().includes('DETALLE')) {
      novParts.push(val);
    }
  }
  const noveltiesRisks = novParts.join('; ') || null;

  // 9. Comentarios
  const wsCom = findSheet('comentarios') || findSheet('9.');
  const comData = wsCom ? (XLSX.utils.sheet_to_json(wsCom, { header: 1 }) as any[][]) : [];
  let contractorComments: string | null = null;
  let supervisorComments: string | null = null;
  for (const row of comData) {
    if (!row) continue;
    const text0 = String(row[0] || '').toUpperCase();
    const val = String(row[1] || '').trim();
    if (text0.includes('CONTRATISTA')) contractorComments = val;
    if (text0.includes('FISCALIZAC')) supervisorComments = val;
  }

  // 11. Firmas
  const wsFirmas = findSheet('firmas') || findSheet('11.');
  const firmasData = wsFirmas ? (XLSX.utils.sheet_to_json(wsFirmas, { header: 1 }) as any[][]) : [];
  let preparedByName = 'Ing. María Fernanda Ligua';
  let preparedByTitle = 'Ing. de Planillas';
  let reviewedByName = 'Ing. Jerson López';
  let reviewedByTitle = 'Residente de Obra';

  for (const row of firmasData) {
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').toUpperCase();
      if (cell.includes('ELABORADO')) {
        if (row[c + 1]) preparedByName = String(row[c + 1]).trim();
      }
      if (cell.includes('REVISADO')) {
        if (row[c + 1]) reviewedByName = String(row[c + 1]).trim();
      }
    }
  }

  const rdoDetails: RdoDetailedMetadata = {
    rainHoursDay,
    rainHoursNight,
    lostRainHoursDay,
    lostRainHoursAccum,
    safetyTalkMinutesDay,
    safetyTalkMinutesAccum,
    incidentsDay,
    incidentsAccum,
    accidentsDay,
    accidentsAccum,
    activitiesTodayVial: actVial,
    activitiesTodayPavimento: actPavimento,
    activitiesTodayDrenaje: actDrenaje,
    activitiesTodayPuentes: actPuentes,
    activitiesTodayTopografia: actTopografia,
    activitiesTodaySenalizacion: actSenalizacion,
    activitiesTodayAmbiental: actAmbiental,
    activitiesTomorrowVial,
    noveltiesRisks,
    contractorComments,
    supervisorComments,
    preparedByName,
    preparedByTitle,
    reviewedByName,
    reviewedByTitle,
    personnelLogs: personnel,
  };

  return {
    dateStr,
    reportNumber,
    dayAmount,
    roadSection,
    rubros,
    machinery,
    rdoDetails,
  };
}

/**
 * Analiza un libro de Excel y lo compara contra la base de datos de un proyecto específico
 */
export async function analyzeExcelBuffer(
  buffer: Buffer,
  fileName: string,
  targetProjectId?: string,
  syncMode: 'auto' | 'registro_diario' | 'rdo' = 'auto'
): Promise<ExcelAnalysisResult> {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetNames = wb.SheetNames;

  // Detección si es un archivo de RDO Multi-Pestaña oficial (11 pestañas)
  const isMultiTab = isMultiTabRdoWorkbook(sheetNames);

  // 1. Diagnóstico de pestañas disponibles
  const detectedSheets: ExcelAnalysisResult['detectedSheets'] = [];
  let registroDiarioSheetName: string | null = null;
  const rdoSheetNames: string[] = [];
  let horometroSheetName: string | null = null;

  if (isMultiTab) {
    for (const name of sheetNames) {
      const ws = wb.Sheets[name];
      const count = ws ? (XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]).length : 0;
      detectedSheets.push({
        name,
        type: 'RDO',
        rowCount: count,
        description: `Sección oficial de RDO (${count} filas)`,
      });
    }
  } else {
    for (const name of sheetNames) {
      const ws = wb.Sheets[name];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      const count = data.length;
      const lower = name.toLowerCase().trim();

      const sampleText = JSON.stringify(data.slice(0, 15)).toUpperCase();
      const isPhoto = lower.includes('fotograf') || lower.includes('foto');
      const isInstruction = lower.includes('instruccion') || lower.includes('ayuda') || lower.includes('guia');
      const isBitacora =
        lower.includes('registro diario') ||
        lower.includes('bitacora') ||
        lower.includes('bitácora') ||
        lower === 'registros';

      const hasDatePattern =
        /\d{1,2}[-_/.]\d{1,2}/.test(lower) ||
        /\d{4}[-_/.]\d{1,2}/.test(lower) ||
        /(lun|mar|mie|mié|jue|vie|sab|sáb|dom|\d{1,2})[\s\-_.]*(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i.test(lower) ||
        /(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[_\s-]*\d{1,2}/i.test(lower);

      const hasRdoContent =
        sampleText.includes('REPORTE DIARIO DE OBRA') ||
        (sampleText.includes('REPORTE N') && sampleText.includes('MONTO DE TRABAJOS EJECUTADOS')) ||
        (sampleText.includes('REPORTE DE CLIMA') && sampleText.includes('REPORTE DE EQUIPO'));

      if (isInstruction) {
        detectedSheets.push({
          name,
          type: 'OTHER',
          rowCount: count,
          description: `Guía e instrucciones de llenado (${count} filas)`,
        });
      } else if (isBitacora) {
        registroDiarioSheetName = name;
        detectedSheets.push({
          name,
          type: 'REGISTRO_DIARIO',
          rowCount: count,
          description: `Bitácora continua de rubros ejecutados (${count} filas)`,
        });
      } else if (!isPhoto && (lower.startsWith('rdo') || lower.includes('reporte') || hasDatePattern || hasRdoContent)) {
        rdoSheetNames.push(name);
        const isDateNamed = hasDatePattern && !lower.startsWith('rdo');
        detectedSheets.push({
          name,
          type: 'RDO',
          rowCount: count,
          description: isDateNamed
            ? `Plantilla oficial RDO detectada por fecha y estructura (${count} filas)`
            : `Plantilla oficial de Reporte Diario de Obra (${count} filas)`,
        });
      } else if (lower.includes('horometro') || lower.includes('equipo')) {
        horometroSheetName = name;
        detectedSheets.push({
          name,
          type: 'HOROMETRO',
          rowCount: count,
          description: `Control y registro de horas/horómetro de maquinaria (${count} filas)`,
        });
      } else if (lower.includes('rubro')) {
        detectedSheets.push({
          name,
          type: 'RUBROS',
          rowCount: count,
          description: `Catálogo contractual de rubros y especificaciones (${count} filas)`,
        });
      } else {
        detectedSheets.push({
          name,
          type: 'OTHER',
          rowCount: count,
          description: `Pestaña auxiliar (${count} filas)`,
        });
      }
    }
  }

  // 2. Detección / Resolución del Proyecto
  const allProjects = await prisma.project.findMany({
    include: {
      rubros: true,
      dailyReports: {
        include: {
          rubroExecutions: {
            include: { projectRubro: true },
          },
          machineryLogs: true,
        },
      },
    },
  });

  let project = allProjects.find((p) => p.id === targetProjectId);

  if (!project) {
    let sampleText = '';
    if (isMultiTab) {
      const ws0 = wb.Sheets[wb.SheetNames[0]];
      const d0 = ws0 ? (XLSX.utils.sheet_to_json(ws0, { header: 1 }) as any[][]) : [];
      sampleText = JSON.stringify(d0.slice(0, 10)).toUpperCase();
    } else if (rdoSheetNames.length > 0) {
      const wsRdo = wb.Sheets[rdoSheetNames[0]];
      const rdoData = XLSX.utils.sheet_to_json(wsRdo, { header: 1 }) as any[][];
      sampleText = JSON.stringify(rdoData.slice(0, 10));
    }

    if (sampleText.includes('VALLE') || sampleText.includes('527225')) {
      project = allProjects.find((p) => p.code.includes('VALLE') || p.name.toUpperCase().includes('VALLE')) || allProjects[0];
    } else if (sampleText.includes('NARCISA') || sampleText.includes('METROPOLIS')) {
      project = allProjects.find((p) => p.code.includes('NARCISA') || p.name.toUpperCase().includes('NARCISA') || p.name.toUpperCase().includes('METROPOLIS')) || allProjects[0];
    } else {
      project = allProjects[0];
    }
  }

  if (!project) {
    throw new Error('No se encontró ningún proyecto disponible en el sistema.');
  }

  const existingReportsByDate = new Map<string, any>();
  for (const rep of project.dailyReports) {
    const dStr = rep.date.toISOString().substring(0, 10);
    existingReportsByDate.set(dStr, rep);
  }

  // 3. Extraer Horómetros por fecha si existe pestaña (solo para archivos tradicionales)
  const horoByDate = new Map<string, Array<{ equipment: string; hours: number; inicio?: number; fin?: number }>>();
  if (horometroSheetName) {
    const wsHoro = wb.Sheets[horometroSheetName];
    const horoData = XLSX.utils.sheet_to_json(wsHoro, { header: 1 }) as any[][];
    for (let i = 2; i < horoData.length; i++) {
      const row = horoData[i];
      if (!row || !row[0] || !row[1]) continue;
      const eq = String(row[0]).trim();
      if (!isValidMachineryName(eq)) continue;
      const rawDate = row[1];
      if (typeof rawDate !== 'number' && isNaN(Date.parse(rawDate))) continue;
      const dStr = excelDateToDate(rawDate).toISOString().substring(0, 10);
      const total = parseNum(row[4], 0);
      if (total <= 0) continue; // Solo registrar maquinarias que efectivamente trabajaron horas
      if (!horoByDate.has(dStr)) horoByDate.set(dStr, []);
      horoByDate.get(dStr)!.push({
        equipment: eq,
        hours: total,
        inicio: parseNum(row[2]),
        fin: parseNum(row[3]),
      });
    }
  }

  // 4. Extracción de Ítems
  const items: ReportSyncItem[] = [];
  const itemsByDate = new Map<string, ReportSyncItem>();

  // A0. Procesar RDO Multi-Pestaña Oficial (un solo reporte estructurado en 11 pestañas)
  if (isMultiTab) {
    const multiData = extractMultiTabRdoData(wb);
    const dStr = multiData.dateStr;
    const existingInDb = existingReportsByDate.get(dStr);

    let status: 'NEW' | 'DISCREPANCY' | 'IDENTICAL' = 'NEW';
    let statusLabel = 'Nuevo Reporte (RDO Oficial Multi-Pestaña)';
    const discrepancies: DiscrepancyDetail[] = [];

    let reportNumber = multiData.reportNumber;
    if (existingInDb) {
      if (reportNumber <= 0) reportNumber = existingInDb.reportNumber;
      const diffTotal = Math.abs(existingInDb.totalExecutedDay - multiData.dayAmount);
      if (diffTotal > 0.05) {
        discrepancies.push({
          field: 'totalExecutedDay',
          label: 'Monto Total del Día',
          dbValue: Number(existingInDb.totalExecutedDay.toFixed(2)),
          excelValue: Number(multiData.dayAmount.toFixed(2)),
          diff: Number((multiData.dayAmount - existingInDb.totalExecutedDay).toFixed(2)),
        });
      }
      if (discrepancies.length > 0) {
        status = 'DISCREPANCY';
        statusLabel = `${discrepancies.length} Discrepancia(s)`;
      } else {
        status = 'IDENTICAL';
        statusLabel = 'Sin Cambios (Idéntico)';
      }
    }

    const syncItem: ReportSyncItem = {
      id: existingInDb?.id,
      date: dStr,
      reportNumber,
      status,
      statusLabel,
      sourceSheet: 'RDO Oficial (11 Pestañas)',
      dayTotalAmount: multiData.dayAmount,
      dbTotalAmount: existingInDb?.totalExecutedDay,
      rubrosCount: multiData.rubros.length,
      dbRubrosCount: existingInDb?.rubroExecutions?.length,
      machineryCount: multiData.machinery.length,
      discrepancies,
      rubroExecutions: multiData.rubros,
      machineryLogs: multiData.machinery,
      rdoData: multiData.rdoDetails,
      selected: status !== 'IDENTICAL',
    };

    items.push(syncItem);
    itemsByDate.set(dStr, syncItem);
  }

  // A. Procesar Registro Diario (si está presente y no se forzó solo RDO)
  if (!isMultiTab && registroDiarioSheetName && syncMode !== 'rdo') {
    const ws = wb.Sheets[registroDiarioSheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

    const dailyLedger = new Map<string, any[]>();
    for (let i = 3; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[0]) continue;
      const dStr = excelDateToDate(row[0]).toISOString().substring(0, 10);
      if (!dailyLedger.has(dStr)) dailyLedger.set(dStr, []);

      const rubroNum = parseInt(row[1]);
      if (isNaN(rubroNum)) continue;

      const qty = parseNum(row[5]);
      const amt = parseNum(row[6]);
      const unitPrice = parseNum(row[4]);
      const desc = String(row[2] || '').trim();
      const unit = String(row[3] || '').trim();

      dailyLedger.get(dStr)!.push({
        rubroNumber: rubroNum,
        description: desc,
        unit,
        unitPrice,
        quantity: qty,
        amount: amt,
        sentido: row[8],
        desde: parseNum(row[9]),
        hasta: parseNum(row[10]),
        tramo: row[9] !== undefined && row[10] !== undefined ? `${row[9]} - ${row[10]}m` : undefined,
      });
    }

    const sortedDates = Array.from(dailyLedger.keys()).sort();
    const usedReportNumbers = new Set(project.dailyReports.map((r) => r.reportNumber));
    let nextAvailableReportNum = 1;

    for (let idx = 0; idx < sortedDates.length; idx++) {
      const dStr = sortedDates[idx];
      const dayRows = dailyLedger.get(dStr)!;
      const dayTotalAmt = dayRows.reduce((sum, r) => sum + r.amount, 0);
      const existing = existingReportsByDate.get(dStr);

      let reportNumber: number;
      if (existing) {
        reportNumber = existing.reportNumber;
      } else {
        while (usedReportNumbers.has(nextAvailableReportNum)) {
          nextAvailableReportNum++;
        }
        reportNumber = nextAvailableReportNum;
        usedReportNumbers.add(reportNumber);
      }

      let status: 'NEW' | 'DISCREPANCY' | 'IDENTICAL' = 'NEW';
      let statusLabel = 'Nuevo Reporte';
      const discrepancies: DiscrepancyDetail[] = [];

      if (existing) {
        const diffTotal = Math.abs(existing.totalExecutedDay - dayTotalAmt);
        if (diffTotal > 0.05) {
          discrepancies.push({
            field: 'totalExecutedDay',
            label: 'Monto Total del Día',
            dbValue: Number(existing.totalExecutedDay.toFixed(2)),
            excelValue: Number(dayTotalAmt.toFixed(2)),
            diff: Number((dayTotalAmt - existing.totalExecutedDay).toFixed(2)),
          });
        }

        const dbRubroExecs = new Map<number, any>();
        for (const e of existing.rubroExecutions) {
          dbRubroExecs.set(e.projectRubro.rubroNumber, e);
        }

        for (const r of dayRows) {
          const dbExec = dbRubroExecs.get(r.rubroNumber);
          if (!dbExec) {
            discrepancies.push({
              field: 'rubroAddition',
              label: `Rubro ${r.rubroNumber} (${r.description})`,
              dbValue: 'No registrado',
              excelValue: `${r.quantity} ${r.unit} ($${r.amount.toFixed(2)})`,
              diff: r.amount,
            });
          } else {
            const qtyDiff = Math.abs(dbExec.dayQuantity - r.quantity);
            const amtDiff = Math.abs(dbExec.dayAmount - r.amount);
            if (qtyDiff > 0.01 || amtDiff > 0.05) {
              discrepancies.push({
                field: 'rubroQty',
                label: `Rubro ${r.rubroNumber} (${r.description})`,
                dbValue: `${dbExec.dayQuantity} ${r.unit} ($${dbExec.dayAmount.toFixed(2)})`,
                excelValue: `${r.quantity} ${r.unit} ($${r.amount.toFixed(2)})`,
                diff: Number((r.amount - dbExec.dayAmount).toFixed(2)),
              });
            }
          }
        }

        const excelRubroNums = new Set(dayRows.map((r) => r.rubroNumber));
        for (const [num, dbExec] of dbRubroExecs.entries()) {
          if (!excelRubroNums.has(num)) {
            discrepancies.push({
              field: 'rubroRemoval',
              label: `Rubro ${num} (${dbExec.projectRubro.description})`,
              dbValue: `${dbExec.dayQuantity} ($${dbExec.dayAmount.toFixed(2)})`,
              excelValue: 'No presente en Excel',
              diff: -dbExec.dayAmount,
            });
          }
        }

        if (discrepancies.length > 0) {
          status = 'DISCREPANCY';
          statusLabel = `${discrepancies.length} Discrepancia(s)`;
        } else {
          status = 'IDENTICAL';
          statusLabel = 'Sin Cambios (Idéntico)';
        }
      }

      const syncItem: ReportSyncItem = {
        id: existing?.id,
        date: dStr,
        reportNumber,
        status,
        statusLabel,
        sourceSheet: 'Registro Diario',
        dayTotalAmount: dayTotalAmt,
        dbTotalAmount: existing?.totalExecutedDay,
        rubrosCount: dayRows.length,
        dbRubrosCount: existing?.rubroExecutions?.length,
        machineryCount: (horoByDate.get(dStr) || []).length,
        discrepancies,
        rubroExecutions: dayRows.map((r) => ({
          rubroNumber: r.rubroNumber,
          description: r.description,
          unit: r.unit,
          unitPrice: r.unitPrice,
          quantity: r.quantity,
          amount: r.amount,
          tramo: r.tramo,
          desde: r.desde,
          hasta: r.hasta,
        })),
        machineryLogs: horoByDate.get(dStr),
        selected: status !== 'IDENTICAL',
      };

      items.push(syncItem);
      itemsByDate.set(dStr, syncItem);
    }
  }

  // B. Procesar Hojas RDO tradicionales y Fusión Inteligente cuando ambos coinciden
  if (!isMultiTab && rdoSheetNames.length > 0 && syncMode !== 'registro_diario') {
    for (const rdoSheet of rdoSheetNames) {
      const ws = wb.Sheets[rdoSheet];
      const rdoResult = extractFullRdoData(ws, rdoSheet);
      const rdoDate = rdoResult.dateStr;

      const existingInItems = itemsByDate.get(rdoDate);

      if (existingInItems) {
        // COINCIDENCIA: La fecha existe en Registro Diario Y en RDO
        // 1. Adoptar el N° de reporte oficial de la hoja RDO solo si es válido (> 0)
        if (rdoResult.reportNumber > 0) {
          existingInItems.reportNumber = rdoResult.reportNumber;
        }
        existingInItems.sourceSheet = `Híbrido (${rdoSheet} + Registro Diario)`;
        existingInItems.rdoData = rdoResult.rdoDetails;

        // 2. Conciliación cruzada entre RDO y Registro Diario
        const rdoDiff = Math.abs(rdoResult.dayAmount - existingInItems.dayTotalAmount);
        if (rdoDiff > 0.05) {
          existingInItems.discrepancies.push({
            field: 'rdo_vs_registro',
            label: `Diferencia Interna en Excel (${rdoSheet} vs Registro Diario)`,
            dbValue: `Bitácora: $${existingInItems.dayTotalAmount.toFixed(2)}`,
            excelValue: `${rdoSheet}: $${rdoResult.dayAmount.toFixed(2)}`,
            diff: Number((rdoResult.dayAmount - existingInItems.dayTotalAmount).toFixed(2)),
          });
          existingInItems.status = 'DISCREPANCY';
          existingInItems.statusLabel = `${existingInItems.discrepancies.length} Discrepancia(s)`;
          existingInItems.selected = true;
        }

        // 3. Complementar maquinaria si RDO tiene equipos
        if (rdoResult.machinery.length > 0) {
          const currentLogs = existingInItems.machineryLogs || [];
          const currentEqs = new Set(currentLogs.map((m) => m.equipment.toUpperCase()));
          for (const rm of rdoResult.machinery) {
            if (!currentEqs.has(rm.equipment.toUpperCase())) {
              currentLogs.push({ equipment: rm.equipment, hours: rm.hours });
            }
          }
          existingInItems.machineryLogs = currentLogs;
          existingInItems.machineryCount = currentLogs.length;
        }
      } else {
        // La fecha solo está en RDO (no en Registro Diario)
        const existingInDb = existingReportsByDate.get(rdoDate);
        let status: 'NEW' | 'DISCREPANCY' | 'IDENTICAL' = 'NEW';
        let statusLabel = 'Nuevo Reporte (Hoja RDO)';
        const discrepancies: DiscrepancyDetail[] = [];

        if (existingInDb) {
          const diffTotal = Math.abs(existingInDb.totalExecutedDay - rdoResult.dayAmount);
          if (diffTotal > 0.05) {
            discrepancies.push({
              field: 'totalExecutedDay',
              label: 'Monto Total del Día',
              dbValue: Number(existingInDb.totalExecutedDay.toFixed(2)),
              excelValue: Number(rdoResult.dayAmount.toFixed(2)),
              diff: Number((rdoResult.dayAmount - existingInDb.totalExecutedDay).toFixed(2)),
            });
          }
          if (discrepancies.length > 0) {
            status = 'DISCREPANCY';
            statusLabel = `${discrepancies.length} Discrepancia(s)`;
          } else {
            status = 'IDENTICAL';
            statusLabel = 'Sin Cambios (Idéntico)';
          }
        }

        const syncItem: ReportSyncItem = {
          id: existingInDb?.id,
          date: rdoDate,
          reportNumber: rdoResult.reportNumber > 0 ? rdoResult.reportNumber : (existingInDb?.reportNumber ?? 0),
          status,
          statusLabel,
          sourceSheet: rdoSheet,
          dayTotalAmount: rdoResult.dayAmount,
          dbTotalAmount: existingInDb?.totalExecutedDay,
          rubrosCount: rdoResult.rubros.length,
          dbRubrosCount: existingInDb?.rubroExecutions?.length,
          machineryCount: rdoResult.machinery.length,
          discrepancies,
          rubroExecutions: rdoResult.rubros,
          machineryLogs: rdoResult.machinery,
          rdoData: rdoResult.rdoDetails,
          selected: status !== 'IDENTICAL',
        };

        items.push(syncItem);
        itemsByDate.set(rdoDate, syncItem);
      }
    }
  }

  // 1. Ordenar cronológicamente por fecha
  items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 2. Inferencia inteligente de números de reporte por orden cronológico y prevención de duplicados
  const usedReportNumbers = new Set<number>();
  project.dailyReports.forEach((r) => usedReportNumbers.add(r.reportNumber));

  // Asignar reportes existentes en la base de datos
  for (const item of items) {
    const existingRep = existingReportsByDate.get(item.date);
    if (existingRep) {
      item.reportNumber = existingRep.reportNumber;
      usedReportNumbers.add(item.reportNumber);
    }
  }

  // Para reportes nuevos:
  // Si traen número explícito válido (> 0) y no colisiona, se mantiene.
  // Si no traen número (0 / null) o colisiona con otro reporte, se infiere correlativamente por fecha.
  const claimedItems = new Set<ReportSyncItem>();
  for (const item of items) {
    const existingRep = existingReportsByDate.get(item.date);
    if (existingRep) {
      claimedItems.add(item);
      continue;
    }
    if (item.reportNumber && item.reportNumber > 0 && !usedReportNumbers.has(item.reportNumber)) {
      usedReportNumbers.add(item.reportNumber);
      claimedItems.add(item);
    }
  }

  let nextAvailableNum = 1;
  for (const item of items) {
    if (claimedItems.has(item)) continue;

    while (usedReportNumbers.has(nextAvailableNum)) {
      nextAvailableNum++;
    }
    item.reportNumber = nextAvailableNum;
    usedReportNumbers.add(nextAvailableNum);
    claimedItems.add(item);
  }

  const newCount = items.filter((i) => i.status === 'NEW').length;
  const discrepancyCount = items.filter((i) => i.status === 'DISCREPANCY').length;
  const identicalCount = items.filter((i) => i.status === 'IDENTICAL').length;

  return {
    fileName,
    detectedSheets,
    detectedProject: {
      id: project.id,
      code: project.code,
      name: project.name,
    },
    totalDatesFound: items.length,
    newCount,
    discrepancyCount,
    identicalCount,
    items,
  };
}

/**
 * Analiza un archivo que se sube mediante FormData desde el cliente
 */
export async function analyzeExcelFormData(formData: FormData): Promise<ExcelAnalysisResult> {
  const file = formData.get('file') as File | null;
  const projectId = formData.get('projectId') as string | undefined;
  const syncMode = (formData.get('syncMode') as 'auto' | 'registro_diario' | 'rdo') || 'auto';

  if (!file) {
    throw new Error('No se recibió ningún archivo Excel.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return await analyzeExcelBuffer(buffer, file.name, projectId, syncMode);
}

/**
 * Analiza directamente el archivo en la ruta local del sistema
 */
export async function analyzeLocalExcelFile(
  filePath: string = '/Users/franciscocornejo/Downloads/AVANCE DE OBRA MOD.xlsx',
  projectId?: string
): Promise<ExcelAnalysisResult> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`El archivo local no fue encontrado en: ${filePath}`);
  }

  const buffer = fs.readFileSync(filePath);
  const fileName = filePath.split('/').pop() || 'archivo.xlsx';
  return await analyzeExcelBuffer(buffer, fileName, projectId, 'auto');
}

export interface SyncApplyPayload {
  projectId: string;
  itemsToApply: ReportSyncItem[];
}

/**
 * Aplica la sincronización de forma ultra-resiliente con batching en PostgreSQL (Neon)
 */
export async function applyExcelSync(payload: SyncApplyPayload) {
  const { projectId, itemsToApply } = payload;

  if (!itemsToApply || itemsToApply.length === 0) {
    throw new Error('No se seleccionó ningún reporte para sincronizar.');
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      rubros: true,
      dailyReports: {
        orderBy: [{ date: 'asc' }, { reportNumber: 'asc' }],
        include: {
          rubroExecutions: true,
        },
      },
    },
  });

  if (!project) {
    throw new Error('El proyecto especificado no existe.');
  }

  const rubroMap = new Map<number, string>(); // rubroNumber -> projectRubroId
  for (const r of project.rubros) {
    rubroMap.set(r.rubroNumber, r.id);
  }

  const selectedItems = itemsToApply.filter(
    (item) => item.selected && (item.status === 'NEW' || item.status === 'DISCREPANCY')
  );

  if (selectedItems.length === 0) {
    return {
      success: true,
      createdCount: 0,
      updatedCount: 0,
      message: 'No hubo cambios que aplicar. Los reportes existentes ya están actualizados.',
    };
  }

  // 1. Asegurar registro de maquinaria único en bloque
  const machineIdByCode = new Map<string, string>();
  for (const item of selectedItems) {
    if (item.machineryLogs) {
      for (const m of item.machineryLogs) {
        if (!isValidMachineryName(m.equipment)) continue;
        const code = m.equipment.replace(/[^A-Za-z0-9]/g, '_').substring(0, 15).toUpperCase();
        if (!machineIdByCode.has(code)) {
          const upper = m.equipment.toUpperCase();
          let category = 'Pesada';
          if (upper.includes('TRACTOR') || upper.includes('TR-')) category = 'Tractor';
          else if (upper.includes('RODILLO') || upper.includes('RL-')) category = 'Rodillo';
          else if (upper.includes('VOLQUETA') || upper.includes('VQ') || upper.includes('BAÑERA') || upper.includes('BANERA')) category = 'Volqueta';
          else if (upper.includes('MULA') || upper.includes('TRACTOMULA')) category = 'Tractomula';
          else if (upper.includes('MOTO') || upper.includes('NIVELADORA')) category = 'Motoniveladora';
          else if (upper.includes('RETRO') || upper.includes('GALLINETA')) category = 'Retroexcavadora';
          else if (upper.includes('CARGADOR')) category = 'Cargadora';
          else if (upper.includes('TANQUERO') || upper.includes('AGUA')) category = 'Tanquero';
          else if (upper.includes('CAMIONETA')) category = 'Camioneta';
          else if (upper.includes('EXCAVADORA') || upper.includes('EXC') || upper.includes('EX0') || upper.includes('EX1')) category = 'Excavadora';

          const mach = await prisma.machinery.upsert({
            where: { code },
            update: { name: m.equipment },
            create: {
              code,
              name: m.equipment,
              category,
              status: 'OPERATIVO',
              hourlyRate: 0,
            },
          });
          machineIdByCode.set(code, mach.id);
        }
      }
    }
  }

  // 2. Pre-calcular acumulados cronológicos en memoria
  const timelineMap = new Map<string, { item?: ReportSyncItem; existingReport?: any }>();

  for (const rep of project.dailyReports) {
    const dStr = rep.date.toISOString().substring(0, 10);
    timelineMap.set(dStr, { existingReport: rep });
  }

  for (const item of selectedItems) {
    timelineMap.set(item.date, {
      item,
      existingReport: timelineMap.get(item.date)?.existingReport,
    });
  }

  const sortedTimelineDates = Array.from(timelineMap.keys()).sort();

  let runningGrandTotal = 0;
  let runningPrincipalTotal = 0;
  let runningNonPrincipalTotal = 0;
  const runningRubroQty = new Map<string, number>();
  const runningRubroAmt = new Map<string, number>();

  interface PreparedDay {
    date: string;
    item?: ReportSyncItem;
    existingId?: string;
    dayTotal: number;
    accumTotal: number;
    principalDay: number;
    principalAccum: number;
    nonPrincipalDay: number;
    nonPrincipalAccum: number;
    progressPercent: number;
    rubroExecs: Array<{
      projectRubroId: string;
      dayQuantity: number;
      accumQuantity: number;
      dayAmount: number;
      accumAmount: number;
    }>;
  }

  const preparedTimeline: PreparedDay[] = [];

  for (const dStr of sortedTimelineDates) {
    const entry = timelineMap.get(dStr)!;

    if (entry.item) {
      const it = entry.item;
      let pDay = 0;
      let npDay = 0;

      const rubroExecsForDay: PreparedDay['rubroExecs'] = [];

      for (const exec of it.rubroExecutions) {
        const projectRubroId = rubroMap.get(exec.rubroNumber);
        if (!projectRubroId) continue;

        const rubro = project.rubros.find((r) => r.id === projectRubroId);
        if (rubro?.isPrincipal) {
          pDay += exec.amount;
        } else {
          npDay += exec.amount;
        }

        const newQty = (runningRubroQty.get(projectRubroId) || 0) + exec.quantity;
        const newAmt = (runningRubroAmt.get(projectRubroId) || 0) + exec.amount;

        runningRubroQty.set(projectRubroId, newQty);
        runningRubroAmt.set(projectRubroId, newAmt);

        rubroExecsForDay.push({
          projectRubroId,
          dayQuantity: exec.quantity,
          accumQuantity: newQty,
          dayAmount: exec.amount,
          accumAmount: newAmt,
        });
      }

      runningGrandTotal += it.dayTotalAmount;
      runningPrincipalTotal += pDay;
      runningNonPrincipalTotal += npDay;

      preparedTimeline.push({
        date: dStr,
        item: it,
        existingId: entry.existingReport?.id,
        dayTotal: it.dayTotalAmount,
        accumTotal: runningGrandTotal,
        principalDay: pDay,
        principalAccum: runningPrincipalTotal,
        nonPrincipalDay: npDay,
        nonPrincipalAccum: runningNonPrincipalTotal,
        progressPercent: (runningGrandTotal / project.contractAmount) * 100,
        rubroExecs: rubroExecsForDay,
      });
    } else if (entry.existingReport) {
      const rep = entry.existingReport;
      runningGrandTotal += rep.totalExecutedDay;
      runningPrincipalTotal += rep.principalExecutedDay;
      runningNonPrincipalTotal += rep.nonPrincipalExecutedDay;

      for (const exec of rep.rubroExecutions) {
        const newQty = (runningRubroQty.get(exec.projectRubroId) || 0) + exec.dayQuantity;
        const newAmt = (runningRubroAmt.get(exec.projectRubroId) || 0) + exec.dayAmount;
        runningRubroQty.set(exec.projectRubroId, newQty);
        runningRubroAmt.set(exec.projectRubroId, newAmt);
      }
    }
  }

  // 3. Salvaguarda definitiva de unicidad de reportNumber en PostgreSQL
  const existingDbReports = await prisma.dailyReport.findMany({
    where: { projectId },
    select: { id: true, reportNumber: true, date: true },
  });
  const dbUsedNumbers = new Set(existingDbReports.map((r) => r.reportNumber));

  // Ordenar cronológicamente para mantener el orden secuencial por fecha
  preparedTimeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let nextSafeNumber = 1;
  for (const prep of preparedTimeline) {
    if (!prep.item) continue;
    const it = prep.item;

    if (it.status === 'DISCREPANCY' && prep.existingId) {
      const match = existingDbReports.find((r) => r.id === prep.existingId);
      if (match) {
        it.reportNumber = match.reportNumber;
      }
    } else if (it.status === 'NEW') {
      if (!it.reportNumber || it.reportNumber <= 0 || dbUsedNumbers.has(it.reportNumber)) {
        while (dbUsedNumbers.has(nextSafeNumber)) {
          nextSafeNumber++;
        }
        it.reportNumber = nextSafeNumber;
        dbUsedNumbers.add(nextSafeNumber);
      } else {
        dbUsedNumbers.add(it.reportNumber);
      }
    }
  }

  // 4. Ejecutar las inserciones/actualizaciones en PostgreSQL
  let createdCount = 0;
  let updatedCount = 0;
  let latestCreatedReportId: string | undefined;
  const timeSlots = ['0-6', '6-8', '8-10', '10-12', '12-14', '14-16', '16-18', '18-24'];

  for (const prep of preparedTimeline) {
    if (!prep.item) continue;
    const it = prep.item;
    const reportDate = new Date(`${prep.date}T12:00:00.000Z`);

    const startDiffMs = reportDate.getTime() - new Date(project.startDate).getTime();
    const elapsedDays = Math.max(1, Math.round(startDiffMs / (1000 * 60 * 60 * 24)));

    // Extraer campos ricos si vienen de RDO
    const rdo = it.rdoData;

    if (it.status === 'NEW') {
      const newReport = await prisma.dailyReport.create({
        data: {
          projectId,
          reportNumber: it.reportNumber,
          date: reportDate,
          roadSection: project.roadSection,
          elapsedDays,
          totalDays: project.durationDays,
          totalExecutedDay: prep.dayTotal,
          totalExecutedAccum: prep.accumTotal,
          principalExecutedDay: prep.principalDay,
          principalExecutedAccum: prep.principalAccum,
          nonPrincipalExecutedDay: prep.nonPrincipalDay,
          nonPrincipalExecutedAccum: prep.nonPrincipalAccum,
          progressPercentAccum: prep.progressPercent,
          rainHoursDay: rdo?.rainHoursDay ?? 0,
          rainHoursNight: rdo?.rainHoursNight ?? 0,
          lostRainHoursDay: rdo?.lostRainHoursDay ?? 0,
          lostRainHoursAccum: rdo?.lostRainHoursAccum ?? 0,
          safetyTalkMinutesDay: rdo?.safetyTalkMinutesDay ?? 5,
          safetyTalkMinutesAccum: rdo?.safetyTalkMinutesAccum ?? 105,
          incidentsDay: rdo?.incidentsDay ?? 0,
          incidentsAccum: rdo?.incidentsAccum ?? 0,
          accidentsDay: rdo?.accidentsDay ?? 0,
          accidentsAccum: rdo?.accidentsAccum ?? 0,
          activitiesTodayVial: rdo?.activitiesTodayVial || null,
          activitiesTodayPavimento: rdo?.activitiesTodayPavimento || null,
          activitiesTodayDrenaje: rdo?.activitiesTodayDrenaje || null,
          activitiesTodayPuentes: rdo?.activitiesTodayPuentes || null,
          activitiesTodayTopografia: rdo?.activitiesTodayTopografia || null,
          activitiesTodaySenalizacion: rdo?.activitiesTodaySenalizacion || null,
          activitiesTodayAmbiental: rdo?.activitiesTodayAmbiental || null,
          activitiesTomorrowVial: rdo?.activitiesTomorrowVial || null,
          activitiesTomorrowPavimento: rdo?.activitiesTomorrowPavimento || null,
          activitiesTomorrowDrenaje: rdo?.activitiesTomorrowDrenaje || null,
          activitiesTomorrowPuentes: rdo?.activitiesTomorrowPuentes || null,
          activitiesTomorrowTopografia: rdo?.activitiesTomorrowTopografia || null,
          activitiesTomorrowSenalizacion: rdo?.activitiesTomorrowSenalizacion || null,
          activitiesTomorrowAmbiental: rdo?.activitiesTomorrowAmbiental || null,
          noveltiesRisks: rdo?.noveltiesRisks || null,
          contractorComments: rdo?.contractorComments || null,
          supervisorComments: rdo?.supervisorComments || null,
          preparedByName: rdo?.preparedByName || 'Ing. María Fernanda Ligua',
          preparedByTitle: rdo?.preparedByTitle || 'Ing. de Planillas',
          reviewedByName: rdo?.reviewedByName || 'Ing. Jerson López',
          reviewedByTitle: rdo?.reviewedByTitle || 'Residente de Obra',
        },
      });

      // Insertar rubros en lote
      if (prep.rubroExecs.length > 0) {
        await prisma.dailyRubroExecution.createMany({
          data: prep.rubroExecs.map((r) => ({
            dailyReportId: newReport.id,
            projectRubroId: r.projectRubroId,
            dayQuantity: r.dayQuantity,
            accumQuantity: r.accumQuantity,
            dayAmount: r.dayAmount,
            accumAmount: r.accumAmount,
          })),
        });
      }

      // Insertar clima horario en lote
      await prisma.dailyHourlyWeather.createMany({
        data: timeSlots.map((slot) => ({
          dailyReportId: newReport.id,
          timeSlot: slot,
          conditionCode: 1,
        })),
      });

      // Insertar personal si viene de RDO
      if (rdo?.personnelLogs && rdo.personnelLogs.length > 0) {
        await prisma.dailyReportPersonnel.createMany({
          data: rdo.personnelLogs.map((p) => ({
            dailyReportId: newReport.id,
            categoryRole: p.categoryRole,
            quantity: p.quantity,
            manHoursDay: p.manHoursDay,
            totalManHours: p.quantity * p.manHoursDay,
          })),
        });
      }

      // Insertar maquinarias en lote si hay horómetros o equipos en RDO
      if (it.machineryLogs && it.machineryLogs.length > 0) {
        const validMachLogs = it.machineryLogs.filter(
          (m) => isValidMachineryName(m.equipment) && (m.hours > 0 || (m as any).quantity > 0)
        );
        const machLogsData = validMachLogs.map((m) => {
          const code = m.equipment.replace(/[^A-Za-z0-9]/g, '_').substring(0, 15).toUpperCase();
          const machId = machineIdByCode.get(code);
          return {
            dailyReportId: newReport.id,
            machineryId: machId || null,
            description: m.equipment,
            unit: 'hora',
            quantity: 1,
            dayHours: m.hours,
          };
        });

        if (machLogsData.length > 0) {
          await prisma.dailyReportMachinery.createMany({
            data: machLogsData,
          });
        }
      }

      latestCreatedReportId = newReport.id;
      createdCount++;
    } else if (it.status === 'DISCREPANCY' && prep.existingId) {
      // Actualizar reporte existente
      await prisma.dailyReport.update({
        where: { id: prep.existingId },
        data: {
          totalExecutedDay: prep.dayTotal,
          totalExecutedAccum: prep.accumTotal,
          principalExecutedDay: prep.principalDay,
          principalExecutedAccum: prep.principalAccum,
          nonPrincipalExecutedDay: prep.nonPrincipalDay,
          nonPrincipalExecutedAccum: prep.nonPrincipalAccum,
          progressPercentAccum: prep.progressPercent,
          ...(rdo && {
            rainHoursDay: rdo.rainHoursDay ?? 0,
            safetyTalkMinutesDay: rdo.safetyTalkMinutesDay ?? 5,
            activitiesTodayVial: rdo.activitiesTodayVial || undefined,
            preparedByName: rdo.preparedByName || undefined,
            reviewedByName: rdo.reviewedByName || undefined,
          }),
        },
      });

      // Reemplazar ejecuciones de rubros en bloque
      await prisma.dailyRubroExecution.deleteMany({
        where: { dailyReportId: prep.existingId },
      });

      if (prep.rubroExecs.length > 0) {
        await prisma.dailyRubroExecution.createMany({
          data: prep.rubroExecs.map((r) => ({
            dailyReportId: prep.existingId!,
            projectRubroId: r.projectRubroId,
            dayQuantity: r.dayQuantity,
            accumQuantity: r.accumQuantity,
            dayAmount: r.dayAmount,
            accumAmount: r.accumAmount,
          })),
        });
      }

      // Reemplazar o actualizar maquinaria si viene en la sincronización
      if (it.machineryLogs && it.machineryLogs.length > 0) {
        await prisma.dailyReportMachinery.deleteMany({
          where: { dailyReportId: prep.existingId },
        });
        const validMachLogs = it.machineryLogs.filter(
          (m) => isValidMachineryName(m.equipment) && (m.hours > 0 || (m as any).quantity > 0)
        );
        if (validMachLogs.length > 0) {
          await prisma.dailyReportMachinery.createMany({
            data: validMachLogs.map((m) => {
              const code = m.equipment.replace(/[^A-Za-z0-9]/g, '_').substring(0, 15).toUpperCase();
              return {
                dailyReportId: prep.existingId!,
                machineryId: machineIdByCode.get(code) || null,
                description: m.equipment,
                unit: 'hora',
                quantity: 1,
                dayHours: m.hours,
              };
            }),
          });
        }
      }

      // Actualizar personal si viene de RDO
      if (rdo?.personnelLogs && rdo.personnelLogs.length > 0) {
        await prisma.dailyReportPersonnel.deleteMany({
          where: { dailyReportId: prep.existingId },
        });
        await prisma.dailyReportPersonnel.createMany({
          data: rdo.personnelLogs.map((p) => ({
            dailyReportId: prep.existingId!,
            categoryRole: p.categoryRole,
            quantity: p.quantity,
            manHoursDay: p.manHoursDay,
            totalManHours: p.quantity * p.manHoursDay,
          })),
        });
      }

      updatedCount++;
    }
  }

  // Registro de Auditoría
  try {
    await recordAuditLog({
      action: 'SINCRONIZACION_EXCEL_REPORTES',
      entityType: 'DailyReport',
      projectId,
      description: `Sincronización desde Excel: ${createdCount} reportes creados, ${updatedCount} actualizados por discrepancias.`,
      metadata: {
        createdCount,
        updatedCount,
        totalProcessed: selectedItems.length,
        datesProcessed: selectedItems.map((i) => i.date),
      },
    });
  } catch (auditErr) {
    console.warn('Aviso: no se pudo registrar AuditLog en este contexto:', auditErr);
  }

  // Disparar Notificación Push a los dispositivos suscritos
  try {
    const { notifyDailyReportsSync } = await import('@/lib/pushNotifications');
    await notifyDailyReportsSync({
      projectId,
      projectCode: project.code,
      projectName: project.name,
      createdCount,
      updatedCount,
      datesSummary: selectedItems.map((i) => i.date),
      latestReportId: latestCreatedReportId,
    });
  } catch (notifErr) {
    console.warn('Aviso: no se pudo enviar notificación de sincronización:', notifErr);
  }

  try {
    revalidatePath('/reportes');
    revalidatePath(`/proyectos/${projectId}`);
    revalidatePath(`/avance`);
    revalidatePath('/');
  } catch (revalErr) {
    // Contexto CLI seguro
  }

  return {
    success: true,
    createdCount,
    updatedCount,
    message: `¡Sincronización exitosa! Se crearon ${createdCount} nuevos reportes y se actualizaron ${updatedCount} reportes con discrepancias.`,
  };
}
