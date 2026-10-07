'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { recordAuditLog } from '@/lib/audit';
import * as XLSX from 'xlsx';
import fs from 'fs';

// Helper to convert Excel serial dates to Javascript Date (UTC)
function excelDateToDate(val: any): Date {
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + val * 86400000);
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
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
  let reportNumber = 1;
  let dayAmount = 0;

  for (let r = 0; r < Math.min(15, d.length); r++) {
    const row = d[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').toUpperCase().trim();
      if (cell === 'FECHA:' || cell === 'FECHA') {
        rawDate = row[c + 1] || row[c + 2];
      }
      if (cell.includes('REPORTE N') || cell.includes('REPORTE Nº')) {
        const num = parseNum(row[c + 1] || row[c + 2]);
        if (num > 0) reportNumber = Math.round(num);
      }
      if (cell.includes('MONTO DE TRABAJOS EJECUTADOS')) {
        const amt = parseNum(row[c + 1] || row[c + 2]);
        if (amt > 0) dayAmount = amt;
      }
    }
  }

  // Fallbacks estándar por celdas típicas en plantilla LICOSA
  if (!rawDate && d[4]?.[2]) rawDate = d[4]?.[2];
  if (reportNumber === 1 && d[4]?.[5]) reportNumber = Math.round(parseNum(d[4]?.[5], 1));
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

  // Rubros en RDO (filas 29 a 37)
  const rubros: RubroExecutionPreview[] = [];
  for (let r = 29; r <= 37; r++) {
    const row = d[r];
    if (!row || typeof row[0] !== 'number') continue;
    const rubroNum = row[0];
    const desc = String(row[1] || '').trim();
    const unit = String(row[5] || '').trim();
    const qty = parseNum(row[6]);
    const amt = parseNum(row[8]);
    const unitPrice = qty > 0 ? amt / qty : 0;
    rubros.push({
      rubroNumber: rubroNum,
      description: desc,
      unit,
      unitPrice,
      quantity: qty,
      amount: amt,
    });
  }

  // Maquinaria en RDO (filas 15 a 25)
  const machinery: Array<{ equipment: string; hours: number }> = [];
  const personnel: Array<{ categoryRole: string; quantity: number; manHoursDay: number }> = [];

  for (let r = 15; r <= 25; r++) {
    const row = d[r];
    if (!row) continue;
    const eqDesc = row[0] ? String(row[0]).trim() : '';
    if (eqDesc && eqDesc !== 'Descripción del equipo') {
      const dayHours = parseNum(row[5], 0);
      machinery.push({ equipment: eqDesc, hours: dayHours });
    }

    const persRole = row[6] ? String(row[6]).trim() : '';
    if (persRole && persRole !== 'Categoría / Cargo') {
      const quantity = Math.round(parseNum(row[10], 1));
      const manHoursDay = parseNum(row[11], 10);
      personnel.push({ categoryRole: persRole, quantity, manHoursDay });
    }
  }

  // Clima & EHS
  const rainHoursDay = parseNum(d[8]?.[3]);
  const rainHoursNight = parseNum(d[9]?.[3]);
  const lostRainHoursDay = parseNum(d[10]?.[3]);
  const lostRainHoursAccum = parseNum(d[11]?.[3]);

  const safetyTalkMinutesDay = parseNum(d[8]?.[9], 5);
  const safetyTalkMinutesAccum = parseNum(d[9]?.[9], 105);
  const incidents = parseRatio(d[10]?.[9]);
  const accidents = parseRatio(d[11]?.[9]);

  // Actividades
  const actTodayVial = d[54]?.[2] || d[54]?.[1] || null;
  const actTodayPavimento = d[55]?.[2] || d[55]?.[1] || null;
  const actTodayDrenaje = d[56]?.[2] || d[56]?.[1] || null;
  const actTodayPuentes = d[57]?.[2] || d[57]?.[1] || null;
  const actTodayTopografia = d[58]?.[2] || d[58]?.[1] || null;
  const actTodaySenalizacion = d[59]?.[2] || d[59]?.[1] || null;
  const actTodayAmbiental = d[60]?.[2] || d[60]?.[1] || null;

  const actTomVial = d[63]?.[2] || d[63]?.[1] || null;
  const actTomPavimento = d[64]?.[2] || d[64]?.[1] || null;
  const actTomDrenaje = d[65]?.[2] || d[65]?.[1] || null;
  const actTomPuentes = d[66]?.[2] || d[66]?.[1] || null;
  const actTomTopografia = d[67]?.[2] || d[67]?.[1] || null;
  const actTomSenalizacion = d[68]?.[2] || d[68]?.[1] || null;
  const actTomAmbiental = d[69]?.[2] || d[69]?.[1] || null;

  const noveltiesRisks = d[72]?.[0] || d[73]?.[0] || null;
  const contractorComments = d[77]?.[0] || d[78]?.[0] || null;
  const supervisorComments = d[77]?.[6] || d[78]?.[6] || null;

  const preparedByName = String(d[90]?.[0] || 'Ing. María Fernanda Ligua');
  const preparedByTitle = String(d[91]?.[0] || 'Ing. de Planillas');
  const reviewedByName = String(d[90]?.[6] || 'Ing. Jerson López');
  const reviewedByTitle = String(d[91]?.[6] || 'Residente de Obra');

  const rdoDetails: RdoDetailedMetadata = {
    rainHoursDay,
    rainHoursNight,
    lostRainHoursDay,
    lostRainHoursAccum,
    safetyTalkMinutesDay,
    safetyTalkMinutesAccum,
    incidentsDay: incidents.day,
    incidentsAccum: incidents.accum,
    accidentsDay: accidents.day,
    accidentsAccum: accidents.accum,
    activitiesTodayVial: actTodayVial ? String(actTodayVial).trim() : null,
    activitiesTodayPavimento: actTodayPavimento ? String(actTodayPavimento).trim() : null,
    activitiesTodayDrenaje: actTodayDrenaje ? String(actTodayDrenaje).trim() : null,
    activitiesTodayPuentes: actTodayPuentes ? String(actTodayPuentes).trim() : null,
    activitiesTodayTopografia: actTodayTopografia ? String(actTodayTopografia).trim() : null,
    activitiesTodaySenalizacion: actTodaySenalizacion ? String(actTodaySenalizacion).trim() : null,
    activitiesTodayAmbiental: actTodayAmbiental ? String(actTodayAmbiental).trim() : null,
    activitiesTomorrowVial: actTomVial ? String(actTomVial).trim() : null,
    activitiesTomorrowPavimento: actTomPavimento ? String(actTomPavimento).trim() : null,
    activitiesTomorrowDrenaje: actTomDrenaje ? String(actTomDrenaje).trim() : null,
    activitiesTomorrowPuentes: actTomPuentes ? String(actTomPuentes).trim() : null,
    activitiesTomorrowTopografia: actTomTopografia ? String(actTomTopografia).trim() : null,
    activitiesTomorrowSenalizacion: actTomSenalizacion ? String(actTomSenalizacion).trim() : null,
    activitiesTomorrowAmbiental: actTomAmbiental ? String(actTomAmbiental).trim() : null,
    noveltiesRisks: noveltiesRisks ? String(noveltiesRisks).trim() : null,
    contractorComments: contractorComments ? String(contractorComments).trim() : null,
    supervisorComments: supervisorComments ? String(supervisorComments).trim() : null,
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

  // 1. Diagnóstico de pestañas disponibles
  const detectedSheets: ExcelAnalysisResult['detectedSheets'] = [];
  let registroDiarioSheetName: string | null = null;
  const rdoSheetNames: string[] = [];
  let horometroSheetName: string | null = null;

  for (const name of sheetNames) {
    const ws = wb.Sheets[name];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    const count = data.length;
    const lower = name.toLowerCase().trim();

    const sampleText = JSON.stringify(data.slice(0, 15)).toUpperCase();
    const isPhoto = lower.includes('fotograf') || lower.includes('foto');
    const isBitacora =
      lower.includes('registro diario') ||
      lower.includes('bitacora') ||
      lower.includes('bitácora') ||
      lower === 'registros';

    const hasDatePattern =
      /\d{1,2}[-_/.]\d{1,2}/.test(lower) ||
      /\d{4}[-_/.]\d{1,2}/.test(lower) ||
      /^(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i.test(lower);

    const hasRdoContent =
      sampleText.includes('REPORTE DIARIO DE OBRA') ||
      (sampleText.includes('REPORTE N') && sampleText.includes('MONTO DE TRABAJOS EJECUTADOS')) ||
      (sampleText.includes('REPORTE DE CLIMA') && sampleText.includes('REPORTE DE EQUIPO'));

    if (isBitacora) {
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
    if (rdoSheetNames.length > 0) {
      const wsRdo = wb.Sheets[rdoSheetNames[0]];
      const rdoData = XLSX.utils.sheet_to_json(wsRdo, { header: 1 }) as any[][];
      sampleText = JSON.stringify(rdoData.slice(0, 10));
    }

    if (sampleText.includes('VALLE') || sampleText.includes('527225')) {
      project = allProjects.find((p) => p.code.includes('VALLE')) || allProjects[0];
    } else if (sampleText.includes('NARCISA') || sampleText.includes('METROPOLIS')) {
      project = allProjects.find((p) => p.code.includes('NARCISA')) || allProjects[0];
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

  // 3. Extraer Horómetros por fecha si existe pestaña
  const horoByDate = new Map<string, Array<{ equipment: string; hours: number; inicio?: number; fin?: number }>>();
  if (horometroSheetName) {
    const wsHoro = wb.Sheets[horometroSheetName];
    const horoData = XLSX.utils.sheet_to_json(wsHoro, { header: 1 }) as any[][];
    for (let i = 2; i < horoData.length; i++) {
      const row = horoData[i];
      if (!row || !row[0] || !row[1]) continue;
      const eq = String(row[0]).trim();
      const rawDate = row[1];
      if (typeof rawDate !== 'number' && isNaN(Date.parse(rawDate))) continue;
      const dStr = excelDateToDate(rawDate).toISOString().substring(0, 10);
      const total = parseNum(row[4], 0);
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

  // A. Procesar Registro Diario (si está presente y no se forzó solo RDO)
  if (registroDiarioSheetName && syncMode !== 'rdo') {
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

  // B. Procesar Hojas RDO y Fusión Inteligente cuando ambos coinciden
  if (rdoSheetNames.length > 0 && syncMode !== 'registro_diario') {
    for (const rdoSheet of rdoSheetNames) {
      const ws = wb.Sheets[rdoSheet];
      const rdoResult = extractFullRdoData(ws, rdoSheet);
      const rdoDate = rdoResult.dateStr;

      const existingInItems = itemsByDate.get(rdoDate);

      if (existingInItems) {
        // COINCIDENCIA: La fecha existe en Registro Diario Y en RDO
        // 1. Adoptar el N° de reporte oficial de la hoja RDO
        existingInItems.reportNumber = rdoResult.reportNumber;
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
          reportNumber: rdoResult.reportNumber,
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

  // Ordenar cronológicamente
  items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
        const code = m.equipment.replace(/[^A-Za-z0-9]/g, '_').substring(0, 15).toUpperCase();
        if (!machineIdByCode.has(code)) {
          const mach = await prisma.machinery.upsert({
            where: { code },
            update: {},
            create: {
              code,
              name: m.equipment,
              category: m.equipment.includes('TRACTOR') ? 'Tractor' : 'Excavadora',
              status: 'OPERATIVO',
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

  // 3. Ejecutar las inserciones/actualizaciones en PostgreSQL
  let createdCount = 0;
  let updatedCount = 0;
  const timeSlots = ['0-6', '6-8', '8-10', '10-12', '12-14', '14-16', '16-18', '18-24'];

  for (const prep of preparedTimeline) {
    if (!prep.item) continue;
    const it = prep.item;
    const reportDate = new Date(`${prep.date}T00:00:00.000Z`);

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
        const machLogsData = it.machineryLogs.map((m) => {
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

        await prisma.dailyReportMachinery.createMany({
          data: machLogsData,
        });
      }

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
