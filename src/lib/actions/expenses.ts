'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { recordAuditLog } from '@/lib/audit';
import * as XLSX from 'xlsx';

export interface ExpenseItemData {
  id?: string;
  date: string; // ISO date string (YYYY-MM-DD)
  registerType: string;
  documentType: string;
  documentNumber: string;
  supplier: string;
  subtotalIva: number;
  subtotalZero: number;
  iva: number;
  ice: number;
  total: number;
  retentions: number;
  balance: number;
  description: string;
  category?: string;
}

export type ExpenseDiffStatus = 'NUEVO' | 'MODIFICADO' | 'IDENTICO';

export interface ExpenseComparisonDiff {
  field: string;
  label: string;
  oldValue: any;
  newValue: any;
}

export interface ExpenseComparisonItem extends ExpenseItemData {
  status: ExpenseDiffStatus;
  existingId?: string;
  diffs?: ExpenseComparisonDiff[];
}

export interface ExpenseComparisonSummary {
  existingCount: number;
  existingTotal: number;
  incomingCount: number;
  incomingTotal: number;

  newCount: number;
  newTotal: number;

  modifiedCount: number;
  modifiedTotalDelta: number;

  identicalCount: number;
  identicalTotal: number;

  netTotalDelta: number;
}

export interface ParsedExpensesExcelResult {
  success: boolean;
  error?: string;
  fileName: string;
  sheetName: string;
  count: number;
  totalSum: number;
  subtotalSum: number;
  ivaSum: number;
  retentionsSum: number;
  balanceSum: number;
  expenses: ExpenseItemData[];
  comparison?: {
    summary: ExpenseComparisonSummary;
    items: ExpenseComparisonItem[];
  };
}

function parseExpenseDate(val: any): string {
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + val * 86400000).toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    const parts = val.trim().split(/[\/\-]/);
    if (parts.length === 3) {
      let day = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      // Si el primer número tiene 4 dígitos es YYYY-MM-DD
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
      } else if (year < 100) {
        year += 2000;
      }
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }
  return new Date().toISOString().split('T')[0];
}

function parseNum(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const clean = val.replace(/,/g, '').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function inferCategory(desc: string, supplier: string): string {
  const text = `${desc} ${supplier}`.toUpperCase();

  if (text.includes('PETREO') || text.includes('CANTERA') || text.includes('MATERIAL DE PRESTAMO') || text.includes('SUB-BASE') || text.includes('BASE GRANULAR')) {
    return 'Materiales Pétreos';
  }
  if (text.includes('SERVICIOS PROFESIONALES') || text.includes('HONORARIOS') || text.includes('ASESORIA') || text.includes('RESIDENTE')) {
    return 'Servicios Profesionales';
  }
  if (text.includes('SUBCONTRATO') || text.includes('ALCANTARILLA') || text.includes('H.A.') || text.includes('HORMIGON')) {
    return 'Subcontratos de Obra';
  }
  if (text.includes('DENSIDAD') || text.includes('PROCTOR') || text.includes('LABORATORIO') || text.includes('SUELOS') || text.includes('MUESTRA') || text.includes('ENSAYO')) {
    return 'Ensayos y Laboratorio';
  }
  if (text.includes('ALIMENTACION') || text.includes('CAFETERIA') || text.includes('ALMUERZO') || text.includes('ASOMINCOM') || text.includes('RESTAURANTE')) {
    return 'Alimentación de Personal';
  }
  if (text.includes('PEAJE') || text.includes('CONORTE') || text.includes('PARQUEO') || text.includes('TARCOM')) {
    return 'Peajes y Movilización';
  }
  if (text.includes('REPUESTO') || text.includes('LLANTA') || text.includes('BATERIA') || text.includes('SOLDADURA') || text.includes('PERNO') || text.includes('MECANIC')) {
    return 'Mantenimiento y Repuestos';
  }
  if (text.includes('GASFITERO') || text.includes('MANO DE OBRA') || text.includes('CUADRILLA') || text.includes('LIMPIEZA DE MALEZA')) {
    return 'Mano de Obra Menor';
  }
  if (text.includes('ENERGIA') || text.includes('CNEL') || text.includes('AGUA') || text.includes('ARRIENDO') || text.includes('CAMPAMENTO') || text.includes('OFICINA')) {
    return 'Campamento y Servicios Básicos';
  }
  if (text.includes('FERRETERIA') || text.includes('MACONSA') || text.includes('VARILLA') || text.includes('ALAMBRE') || text.includes('CEMENTO') || text.includes('KYWI')) {
    return 'Materiales e Insumos';
  }
  if (text.includes('TOPOGRAFIA') || text.includes('ESTACION TOTAL') || text.includes('CAÑAS')) {
    return 'Topografía y Mediciones';
  }

  return 'Otros Gastos de Obra';
}

/**
 * Obtiene los costos registrados de un proyecto junto con métricas agregadas
 */
export async function getProjectExpenses(projectId: string) {
  const expenses = await prisma.projectExpense.findMany({
    where: { projectId },
    orderBy: { date: 'desc' },
  });

  const totalSum = expenses.reduce((acc, e) => acc + e.total, 0);
  const subtotalSum = expenses.reduce((acc, e) => acc + e.subtotalIva + e.subtotalZero, 0);
  const ivaSum = expenses.reduce((acc, e) => acc + e.iva, 0);
  const retentionsSum = expenses.reduce((acc, e) => acc + e.retentions, 0);
  const balanceSum = expenses.reduce((acc, e) => acc + e.balance, 0);

  // Agrupado por categoría
  const categoryMap = new Map<string, { count: number; total: number }>();
  for (const e of expenses) {
    const cat = e.category || 'Otros';
    const curr = categoryMap.get(cat) || { count: 0, total: 0 };
    categoryMap.set(cat, { count: curr.count + 1, total: curr.total + e.total });
  }

  const byCategory = Array.from(categoryMap.entries())
    .map(([category, stats]) => ({ category, ...stats }))
    .sort((a, b) => b.total - a.total);

  // Top proveedores
  const supplierMap = new Map<string, { count: number; total: number }>();
  for (const e of expenses) {
    const supp = e.supplier || 'Varios';
    const curr = supplierMap.get(supp) || { count: 0, total: 0 };
    supplierMap.set(supp, { count: curr.count + 1, total: curr.total + e.total });
  }

  const topSuppliers = Array.from(supplierMap.entries())
    .map(([supplier, stats]) => ({ supplier, ...stats }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  return {
    expenses: expenses.map((e) => ({
      ...e,
      date: e.date.toISOString().split('T')[0],
    })),
    metrics: {
      count: expenses.length,
      totalSum,
      subtotalSum,
      ivaSum,
      retentionsSum,
      balanceSum,
      byCategory,
      topSuppliers,
    },
  };
}

/**
 * Parsea un archivo Excel de gastos (como GASTOS OBRA VALLE DE LA VIRGEN.xls)
 */
export async function parseExpensesExcel(formData: FormData): Promise<ParsedExpensesExcelResult> {
  try {
    const file = formData.get('file') as File | null;
    let localPath = formData.get('localPath') as string | null;

    let buffer: Buffer;
    let fileName = '';

    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      fileName = file.name;
    } else if (localPath) {
      const fs = await import('fs');
      if (!fs.existsSync(localPath)) {
        return {
          success: false,
          error: `No se encontró el archivo en la ruta local: ${localPath}`,
          fileName: localPath,
          sheetName: '',
          count: 0,
          totalSum: 0,
          subtotalSum: 0,
          ivaSum: 0,
          retentionsSum: 0,
          balanceSum: 0,
          expenses: [],
        };
      }
      buffer = fs.readFileSync(localPath);
      fileName = localPath.split('/').pop() || 'Archivo Local';
    } else {
      return {
        success: false,
        error: 'No se recibió ningún archivo.',
        fileName: '',
        sheetName: '',
        count: 0,
        totalSum: 0,
        subtotalSum: 0,
        ivaSum: 0,
        retentionsSum: 0,
        balanceSum: 0,
        expenses: [],
      };
    }

    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

    // Buscar fila de encabezados
    let headerIdx = -1;
    let colFecha = 0;
    let colTipoReg = 1;
    let colTipoDoc = 2;
    let colNumDoc = 3;
    let colPersona = 4;
    let colSubIva = 5;
    let colSubZero = 6;
    let colIva = 7;
    let colIce = 8;
    let colTotal = 9;
    let colRet = 10;
    let colSaldo = 11;
    let colDesc = 12;

    for (let r = 0; r < Math.min(15, rows.length); r++) {
      const row = rows[r];
      if (!row) continue;
      const rowStr = row.map((c) => String(c || '').toUpperCase()).join(' | ');
      if (rowStr.includes('FECHA') && (rowStr.includes('DOCUMENTO') || rowStr.includes('PERSONA') || rowStr.includes('TOTAL'))) {
        headerIdx = r;
        row.forEach((cell: any, cIdx: number) => {
          const txt = String(cell || '').trim().toUpperCase();
          if (txt === 'FECHA') colFecha = cIdx;
          else if (txt.includes('TIPO REGISTRO') || txt === 'TIPO') colTipoReg = cIdx;
          else if (txt.includes('TIPO DOCUMENTO') || txt.includes('TIPO DOC')) colTipoDoc = cIdx;
          else if (txt.includes('# DOCUMENTO') || txt.includes('NUMERO') || txt.includes('COMPROBANTE')) colNumDoc = cIdx;
          else if (txt.includes('PERSONA') || txt.includes('PROVEEDOR') || txt.includes('BENEFICIARIO')) colPersona = cIdx;
          else if (txt.includes('SUBTOTAL IVA MAYOR') || txt.includes('SUBTOTAL CON IVA')) colSubIva = cIdx;
          else if (txt.includes('SUBTOTAL IVA 0') || txt.includes('SUBTOTAL 0%')) colSubZero = cIdx;
          else if (txt === 'IVA') colIva = cIdx;
          else if (txt === 'ICE') colIce = cIdx;
          else if (txt === 'TOTAL') colTotal = cIdx;
          else if (txt.includes('RETENCION')) colRet = cIdx;
          else if (txt.includes('SALDO')) colSaldo = cIdx;
          else if (txt.includes('DESCRIPCION') || txt.includes('DETALLE') || txt.includes('CONCEPTO')) colDesc = cIdx;
        });
        break;
      }
    }

    if (headerIdx === -1) {
      headerIdx = 0; // Fallback
    }

    const expenses: ExpenseItemData[] = [];

    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      // Omitir fila de totales
      const rowStr = row.map((c) => String(c || '').toUpperCase()).join(' ');
      if (rowStr.includes('TOTALES') || rowStr.includes('SUMA TOTAL')) continue;

      const rawDate = row[colFecha];
      if (!rawDate && !row[colPersona] && !row[colTotal]) continue;

      const dateStr = parseExpenseDate(rawDate);
      const registerType = String(row[colTipoReg] || 'Proveedor').trim();
      const documentType = String(row[colTipoDoc] || 'Factura').trim();
      const documentNumber = String(row[colNumDoc] || 'S/N').trim();
      const supplier = String(row[colPersona] || 'Varios').trim();

      const subtotalIva = parseNum(row[colSubIva]);
      const subtotalZero = parseNum(row[colSubZero]);
      const iva = parseNum(row[colIva]);
      const ice = parseNum(row[colIce]);
      let total = parseNum(row[colTotal]);

      // Si el total viene vacío o 0, calcularlo como la suma de subtotales + iva
      if (total === 0) {
        total = subtotalIva + subtotalZero + iva + ice;
      }

      const retentions = parseNum(row[colRet]);
      let balance = parseNum(row[colSaldo]);
      if (balance === 0 && total > 0 && retentions > 0) {
        balance = total - retentions;
      } else if (balance === 0) {
        balance = total;
      }

      const description = String(row[colDesc] || '').trim() || `${documentType} ${documentNumber} - ${supplier}`;
      const category = inferCategory(description, supplier);

      // Solo agregar filas con contenido o valor significativo
      if (total > 0 || supplier.length > 2 || description.length > 3) {
        expenses.push({
          date: dateStr,
          registerType,
          documentType,
          documentNumber,
          supplier,
          subtotalIva,
          subtotalZero,
          iva,
          ice,
          total,
          retentions,
          balance,
          description,
          category,
        });
      }
    }

    const totalSum = expenses.reduce((acc, e) => acc + e.total, 0);
    const subtotalSum = expenses.reduce((acc, e) => acc + e.subtotalIva + e.subtotalZero, 0);
    const ivaSum = expenses.reduce((acc, e) => acc + e.iva, 0);
    const retentionsSum = expenses.reduce((acc, e) => acc + e.retentions, 0);
    const balanceSum = expenses.reduce((acc, e) => acc + e.balance, 0);

    let comparison: { summary: ExpenseComparisonSummary; items: ExpenseComparisonItem[] } | undefined = undefined;
    const projectId = formData.get('projectId') as string | null;
    if (projectId) {
      try {
        comparison = await compareExpensesWithDatabase(projectId, expenses);
      } catch (compErr) {
        console.error('Error calculando comparativo con costos existentes:', compErr);
      }
    }

    return {
      success: true,
      fileName,
      sheetName,
      count: expenses.length,
      totalSum,
      subtotalSum,
      ivaSum,
      retentionsSum,
      balanceSum,
      expenses,
      comparison,
    };
  } catch (err: any) {
    console.error('Error parseando Excel de gastos:', err);
    return {
      success: false,
      error: err?.message || 'Error al procesar el archivo Excel de gastos.',
      fileName: '',
      sheetName: '',
      count: 0,
      totalSum: 0,
      subtotalSum: 0,
      ivaSum: 0,
      retentionsSum: 0,
      balanceSum: 0,
      expenses: [],
    };
  }
}

function normalizeDocNumber(doc?: string | null): string {
  if (!doc) return '';
  return doc
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^0+/, '');
}

function normalizeSupplier(sup?: string | null): string {
  if (!sup) return '';
  return sup
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function isGenericDocNumber(doc: string): boolean {
  const norm = normalizeDocNumber(doc);
  return (
    !norm ||
    norm === 'sn' ||
    norm === 'sin' ||
    norm === 'snum' ||
    norm === 'na' ||
    norm === 'peaje' ||
    norm.length <= 1
  );
}

function supplierMatches(s1: string, s2: string): boolean {
  const n1 = normalizeSupplier(s1);
  const n2 = normalizeSupplier(s2);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;
  if (n1.length > 5 && n2.length > 5 && (n1.includes(n2) || n2.includes(n1))) return true;
  return false;
}

/**
 * Coteja los gastos del Excel con los ya existentes en la base de datos
 */
export async function compareExpensesWithDatabase(
  projectId: string,
  incomingExpenses: ExpenseItemData[]
): Promise<{
  summary: ExpenseComparisonSummary;
  items: ExpenseComparisonItem[];
}> {
  const expenseClient = (prisma as any).projectExpense;
  if (!expenseClient) {
    return {
      summary: {
        existingCount: 0,
        existingTotal: 0,
        incomingCount: incomingExpenses.length,
        incomingTotal: incomingExpenses.reduce((s, e) => s + e.total, 0),
        newCount: incomingExpenses.length,
        newTotal: incomingExpenses.reduce((s, e) => s + e.total, 0),
        modifiedCount: 0,
        modifiedTotalDelta: 0,
        identicalCount: 0,
        identicalTotal: 0,
        netTotalDelta: incomingExpenses.reduce((s, e) => s + e.total, 0),
      },
      items: incomingExpenses.map((e) => ({ ...e, status: 'NUEVO' })),
    };
  }

  const existing = await expenseClient.findMany({
    where: { projectId },
    orderBy: { date: 'desc' },
  });

  const existingTotal = existing.reduce((sum: number, e: any) => sum + Number(e.total || 0), 0);
  const incomingTotal = incomingExpenses.reduce((sum: number, e) => sum + Number(e.total || 0), 0);

  // Marcar existentes disponibles para cotejo
  const availableExisting = existing.map((ex: any) => ({
    ...ex,
    matched: false,
    normDoc: normalizeDocNumber(ex.documentNumber),
    normSup: normalizeSupplier(ex.supplier),
    dateOnly: new Date(ex.date).toISOString().split('T')[0],
  }));

  const comparedItems: ExpenseComparisonItem[] = [];

  let newCount = 0;
  let newTotal = 0;
  let modifiedCount = 0;
  let modifiedTotalDelta = 0;
  let identicalCount = 0;
  let identicalTotal = 0;

  for (const inc of incomingExpenses) {
    const incNormDoc = normalizeDocNumber(inc.documentNumber);
    const incDateOnly = inc.date;
    const incIsGenericDoc = isGenericDocNumber(inc.documentNumber);

    // 1. Intentar matching por # Documento + Proveedor
    let matchIdx = -1;
    if (!incIsGenericDoc && incNormDoc.length >= 2) {
      matchIdx = availableExisting.findIndex(
        (ex: any) => !ex.matched && ex.normDoc === incNormDoc && supplierMatches(ex.supplier, inc.supplier)
      );
      // Cotejo secundario: mismo número de factura exacta aunque varíe el nombre del proveedor
      if (matchIdx === -1 && incNormDoc.length >= 4) {
        matchIdx = availableExisting.findIndex(
          (ex: any) => !ex.matched && ex.normDoc === incNormDoc
        );
      }
    }

    // 2. Si es genérico (S/N, Peaje) o no hizo match: por Proveedor + Fecha + Monto Total
    if (matchIdx === -1) {
      matchIdx = availableExisting.findIndex(
        (ex: any) =>
          !ex.matched &&
          supplierMatches(ex.supplier, inc.supplier) &&
          ex.dateOnly === incDateOnly &&
          Math.abs(Number(ex.total) - Number(inc.total)) < 0.01
      );
    }

    // 3. Fallback: Proveedor + Fecha + Coincidencia de descripción
    if (matchIdx === -1 && inc.description.length > 5) {
      matchIdx = availableExisting.findIndex(
        (ex: any) =>
          !ex.matched &&
          supplierMatches(ex.supplier, inc.supplier) &&
          ex.dateOnly === incDateOnly &&
          ex.description.toLowerCase().trim() === inc.description.toLowerCase().trim()
      );
    }

    if (matchIdx === -1) {
      // NUEVO ITEM
      newCount++;
      newTotal += inc.total;
      comparedItems.push({
        ...inc,
        status: 'NUEVO',
      });
    } else {
      const matchedDb = availableExisting[matchIdx];
      matchedDb.matched = true;

      // Evaluar si hubo modificaciones en montos o descripción
      const diffs: ExpenseComparisonDiff[] = [];

      if (Math.abs(Number(inc.total) - Number(matchedDb.total)) >= 0.01) {
        diffs.push({
          field: 'total',
          label: 'Total',
          oldValue: Number(matchedDb.total),
          newValue: Number(inc.total),
        });
      }

      if (Math.abs(Number(inc.retentions) - Number(matchedDb.retentions)) >= 0.01) {
        diffs.push({
          field: 'retentions',
          label: 'Retenciones',
          oldValue: Number(matchedDb.retentions),
          newValue: Number(inc.retentions),
        });
      }

      if (Math.abs(Number(inc.balance) - Number(matchedDb.balance)) >= 0.01) {
        diffs.push({
          field: 'balance',
          label: 'Saldo',
          oldValue: Number(matchedDb.balance),
          newValue: Number(inc.balance),
        });
      }

      if (Math.abs(Number(inc.subtotalIva) - Number(matchedDb.subtotalIva)) >= 0.01) {
        diffs.push({
          field: 'subtotalIva',
          label: 'Subtotal IVA',
          oldValue: Number(matchedDb.subtotalIva),
          newValue: Number(inc.subtotalIva),
        });
      }

      if (Math.abs(Number(inc.subtotalZero) - Number(matchedDb.subtotalZero)) >= 0.01) {
        diffs.push({
          field: 'subtotalZero',
          label: 'Subtotal 0%',
          oldValue: Number(matchedDb.subtotalZero),
          newValue: Number(inc.subtotalZero),
        });
      }

      if (diffs.length > 0) {
        modifiedCount++;
        modifiedTotalDelta += (Number(inc.total) - Number(matchedDb.total));
        comparedItems.push({
          ...inc,
          status: 'MODIFICADO',
          existingId: matchedDb.id,
          diffs,
        });
      } else {
        identicalCount++;
        identicalTotal += inc.total;
        comparedItems.push({
          ...inc,
          status: 'IDENTICO',
          existingId: matchedDb.id,
        });
      }
    }
  }

  const netTotalDelta = incomingTotal - existingTotal;

  return {
    summary: {
      existingCount: existing.length,
      existingTotal,
      incomingCount: incomingExpenses.length,
      incomingTotal,
      newCount,
      newTotal,
      modifiedCount,
      modifiedTotalDelta,
      identicalCount,
      identicalTotal,
      netTotalDelta,
    },
    items: comparedItems,
  };
}

/**
 * Sincronización inteligente de costos:
 * - 'smart_merge': Añade nuevos ítems y actualiza modificados sin duplicar los idénticos ya existentes.
 * - 'replace_all': Borra todos los costos anteriores de la obra y carga el archivo completo.
 */
export async function syncProjectExpenses(payload: {
  projectId: string;
  expenses: ExpenseItemData[];
  mode: 'smart_merge' | 'replace_all';
  updateModified?: boolean;
  fileName?: string;
}) {
  const project = await prisma.project.findUnique({
    where: { id: payload.projectId },
  });

  if (!project) {
    throw new Error('Proyecto no encontrado.');
  }

  const expenseClient = (prisma as any).projectExpense;
  if (!expenseClient) {
    throw new Error('El servicio de costos no está disponible.');
  }

  const importTag = payload.fileName ? `Excel: ${payload.fileName}` : 'Importación Excel';

  if (payload.mode === 'replace_all') {
    await expenseClient.deleteMany({
      where: { projectId: payload.projectId },
    });

    await expenseClient.createMany({
      data: payload.expenses.map((e) => {
        const d = new Date(e.date);
        const safeDate = isNaN(d.getTime()) ? new Date() : d;
        return {
          projectId: payload.projectId,
          date: safeDate,
          registerType: e.registerType || 'GASTO',
          documentType: e.documentType || 'FACTURA',
          documentNumber: e.documentNumber || '',
          supplier: e.supplier || 'PROVEEDOR',
          subtotalIva: e.subtotalIva || 0,
          subtotalZero: e.subtotalZero || 0,
          iva: e.iva || 0,
          ice: e.ice || 0,
          total: e.total || 0,
          retentions: e.retentions || 0,
          balance: e.balance || 0,
          description: e.description || '',
          category: e.category || inferCategory(e.description || '', e.supplier || ''),
          importedFrom: importTag,
        };
      }),
    });

    const totalImported = payload.expenses.reduce((acc, e) => acc + e.total, 0);

    await recordAuditLog({
      action: 'COSTOS_OBRA_REEMPLAZADOS',
      entityType: 'ProjectExpense',
      entityId: payload.projectId,
      description: `Reemplazo total de costos para la obra [${project.code}]: ${payload.expenses.length} registros cargados ($${totalImported.toLocaleString('en-US', { minimumFractionDigits: 2 })}).`,
      projectId: payload.projectId,
      metadata: { count: payload.expenses.length, total: totalImported, fileName: payload.fileName },
    });

    revalidatePath(`/proyectos/${payload.projectId}`);
    revalidatePath('/proyectos');

    return {
      success: true,
      mode: 'replace_all',
      insertedCount: payload.expenses.length,
      updatedCount: 0,
      skippedCount: 0,
      total: totalImported,
    };
  }

  // MODO SMART_MERGE (COTEJO INTELIGENTE)
  const comparison = await compareExpensesWithDatabase(payload.projectId, payload.expenses);
  const newItems = comparison.items.filter((i) => i.status === 'NUEVO');
  const modifiedItems = comparison.items.filter((i) => i.status === 'MODIFICADO');
  const identicalItems = comparison.items.filter((i) => i.status === 'IDENTICO');

  // 1. Insertar únicamente los items NUEVOS
  if (newItems.length > 0) {
    await expenseClient.createMany({
      data: newItems.map((e) => {
        const d = new Date(e.date);
        const safeDate = isNaN(d.getTime()) ? new Date() : d;
        return {
          projectId: payload.projectId,
          date: safeDate,
          registerType: e.registerType || 'GASTO',
          documentType: e.documentType || 'FACTURA',
          documentNumber: e.documentNumber || '',
          supplier: e.supplier || 'PROVEEDOR',
          subtotalIva: e.subtotalIva || 0,
          subtotalZero: e.subtotalZero || 0,
          iva: e.iva || 0,
          ice: e.ice || 0,
          total: e.total || 0,
          retentions: e.retentions || 0,
          balance: e.balance || 0,
          description: e.description || '',
          category: e.category || inferCategory(e.description || '', e.supplier || ''),
          importedFrom: importTag,
        };
      }),
    });
  }

  // 2. Actualizar items modificados (si updateModified !== false)
  if (payload.updateModified !== false && modifiedItems.length > 0) {
    for (const mod of modifiedItems) {
      if (mod.existingId) {
        await expenseClient.update({
          where: { id: mod.existingId },
          data: {
            registerType: mod.registerType,
            documentType: mod.documentType,
            documentNumber: mod.documentNumber,
            supplier: mod.supplier,
            subtotalIva: mod.subtotalIva,
            subtotalZero: mod.subtotalZero,
            iva: mod.iva,
            ice: mod.ice,
            total: mod.total,
            retentions: mod.retentions,
            balance: mod.balance,
            description: mod.description,
            category: mod.category,
            updatedAt: new Date(),
          },
        });
      }
    }
  }

  // 3. Los items IDENTICOS NO se insertan -> NO HAY DUPLICACIÓN!
  await recordAuditLog({
    action: 'COSTOS_OBRA_SINCRONIZADOS',
    entityType: 'ProjectExpense',
    entityId: payload.projectId,
    description: `Cotejo y actualización de costos de obra [${project.code}]: +${newItems.length} nuevos incorporados, ${modifiedItems.length} modificados actualizados, ${identicalItems.length} idénticos conservados sin duplicar.`,
    projectId: payload.projectId,
    metadata: {
      newCount: newItems.length,
      modifiedCount: modifiedItems.length,
      identicalCount: identicalItems.length,
      netTotalDelta: comparison.summary.netTotalDelta,
      fileName: payload.fileName,
    },
  });

  revalidatePath(`/proyectos/${payload.projectId}`);
  revalidatePath('/proyectos');

  return {
    success: true,
    mode: 'smart_merge',
    insertedCount: newItems.length,
    updatedCount: modifiedItems.length,
    skippedCount: identicalItems.length,
    summary: comparison.summary,
  };
}

/**
 * Importa los gastos procesados a la base de datos (wrapper compatible)
 */
export async function importProjectExpenses(payload: {
  projectId: string;
  expenses: ExpenseItemData[];
  replaceExisting?: boolean;
  fileName?: string;
}) {
  return syncProjectExpenses({
    projectId: payload.projectId,
    expenses: payload.expenses,
    mode: payload.replaceExisting ? 'replace_all' : 'smart_merge',
    updateModified: true,
    fileName: payload.fileName,
  });
}

/**
 * Crea un gasto individual de manera manual
 */
export async function createSingleExpense(payload: {
  projectId: string;
  date: string;
  registerType: string;
  documentType: string;
  documentNumber: string;
  supplier: string;
  subtotalIva: number;
  subtotalZero: number;
  iva: number;
  ice?: number;
  total: number;
  retentions?: number;
  balance?: number;
  description: string;
  category?: string;
}) {
  const expense = await prisma.projectExpense.create({
    data: {
      projectId: payload.projectId,
      date: new Date(payload.date),
      registerType: payload.registerType || 'Proveedor',
      documentType: payload.documentType || 'Factura',
      documentNumber: payload.documentNumber || 'S/N',
      supplier: payload.supplier,
      subtotalIva: payload.subtotalIva || 0,
      subtotalZero: payload.subtotalZero || 0,
      iva: payload.iva || 0,
      ice: payload.ice || 0,
      total: payload.total,
      retentions: payload.retentions || 0,
      balance: payload.balance ?? (payload.total - (payload.retentions || 0)),
      description: payload.description,
      category: payload.category || inferCategory(payload.description, payload.supplier),
      importedFrom: 'Manual',
    },
  });

  await recordAuditLog({
    action: 'COSTO_OBRA_CREADO',
    entityType: 'ProjectExpense',
    entityId: expense.id,
    description: `Registro individual de gasto: ${expense.documentType} ${expense.documentNumber} (${expense.supplier}) por $${expense.total.toFixed(2)}`,
    projectId: payload.projectId,
    metadata: payload,
  });

  revalidatePath(`/proyectos/${payload.projectId}`);
  return expense;
}

/**
 * Actualiza un gasto existente
 */
export async function updateSingleExpense(payload: {
  id: string;
  projectId: string;
  date: string;
  registerType: string;
  documentType: string;
  documentNumber: string;
  supplier: string;
  subtotalIva: number;
  subtotalZero: number;
  iva: number;
  ice?: number;
  total: number;
  retentions?: number;
  balance?: number;
  description: string;
  category?: string;
}) {
  const expense = await prisma.projectExpense.update({
    where: { id: payload.id },
    data: {
      date: new Date(payload.date),
      registerType: payload.registerType,
      documentType: payload.documentType,
      documentNumber: payload.documentNumber,
      supplier: payload.supplier,
      subtotalIva: payload.subtotalIva,
      subtotalZero: payload.subtotalZero,
      iva: payload.iva,
      ice: payload.ice || 0,
      total: payload.total,
      retentions: payload.retentions || 0,
      balance: payload.balance ?? (payload.total - (payload.retentions || 0)),
      description: payload.description,
      category: payload.category || inferCategory(payload.description, payload.supplier),
    },
  });

  revalidatePath(`/proyectos/${payload.projectId}`);
  return expense;
}

/**
 * Elimina un gasto de la obra
 */
export async function deleteSingleExpense(expenseId: string, projectId: string) {
  const expense = await prisma.projectExpense.delete({
    where: { id: expenseId },
  });

  await recordAuditLog({
    action: 'COSTO_OBRA_ELIMINADO',
    entityType: 'ProjectExpense',
    entityId: expenseId,
    description: `Eliminación de registro de gasto: ${expense.documentType} ${expense.documentNumber} ($${expense.total.toFixed(2)})`,
    projectId,
  });

  revalidatePath(`/proyectos/${projectId}`);
  return { success: true };
}
