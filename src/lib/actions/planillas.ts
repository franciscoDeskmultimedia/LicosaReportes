'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';
import { OFFICIAL_PLANILLA_01, PlanillaRaw, PlanillaItemRaw } from '@/data/planillas/default-planillas';
import * as XLSX from 'xlsx';

export interface PlanillaComparisonItem {
  itemNumber: string;
  code: string;
  category: string;
  description: string;
  unit: string;
  unitPrice: number;
  contractQuantity: number;
  contractTotal: number;
  planilladoQuantity: number;
  planilladoAmount: number;
  reportedQuantity: number;
  reportedAmount: number;
  quantityDiff: number; // planilladoQuantity - reportedQuantity
  amountDiff: number;   // planilladoAmount - reportedAmount
  percentageDiff: number;
  status: 'A_FAVOR' | 'EN_CONTRA' | 'CONCILIADO' | 'NO_EJECUTADO';
  matchedRubroId?: string;
  matchedRubroNumber?: number;
  explanation: string;
  // Arrastre histórico del período anterior
  priorPlanilladoAmount: number;
  priorReportedAmount: number;
  priorSurplusOrDeficit: number; // positivo = excedente a favor de constructora, negativo = faltante de obra
  consolidatedBalance: number;   // Saldo neto acumulado histórico
}

export interface ChapterSummary {
  category: string;
  planilladoAmount: number;
  reportedAmount: number;
  amountDiff: number;
  status: 'A_FAVOR' | 'EN_CONTRA' | 'CONCILIADO' | 'NO_EJECUTADO';
  itemsCount: number;
  itemsWithDiffCount: number;
}

export interface PlanillaComparisonResult {
  planilla: PlanillaRaw;
  project: {
    id: string;
    code: string;
    name: string;
    contractAmount: number;
    contractor: string;
    client: string;
    fiscalizador: string;
    administrator: string;
  };
  mode: 'PERIOD' | 'ACCUMULATED';
  tolerance: number;
  totalPlanilladoAmount: number;
  totalReportedAmount: number;
  netDiffAmount: number; // planillado - reported
  netDiffPercent: number;
  globalStatus: 'A_FAVOR' | 'EN_CONTRA' | 'CONCILIADO';
  verdictTitle: string;
  verdictDescription: string;
  // Arrastre histórico del período anterior
  priorCarryoverSummary: {
    totalPriorPlanillado: number;
    totalPriorReported: number;
    priorSurplusOrDeficit: number; // Excedente (+) o Faltante (-) del período anterior
    priorStatus: 'A_FAVOR' | 'EN_CONTRA' | 'CONCILIADO' | 'SIN_HISTORIAL';
    consolidatedBalance: number;   // Saldo consolidado sumando período anterior + este período
    consolidatedStatus: 'A_FAVOR' | 'EN_CONTRA' | 'CONCILIADO';
    description: string;
  };
  stats: {
    totalItems: number;
    aFavorCount: number;
    aFavorAmount: number;
    enContraCount: number;
    enContraAmount: number;
    conciliadosCount: number;
    noEjecutadoCount: number;
  };
  chapters: ChapterSummary[];
  items: PlanillaComparisonItem[];
  dailyReportsCount: number;
  dailyReportsRange: {
    start: string;
    end: string;
    startReportNumber: number | null;
    endReportNumber: number | null;
    startReportDate: string | null;
    endReportDate: string | null;
    totalReportsCount: number;
    summaryText: string;
  };
}

const PLANILLAS_DIR = path.join(process.cwd(), 'src', 'data', 'planillas');
const CUSTOM_PLANILLAS_FILE = path.join(PLANILLAS_DIR, 'custom_planillas.json');

function ensureDataDir() {
  if (!fs.existsSync(PLANILLAS_DIR)) {
    fs.mkdirSync(PLANILLAS_DIR, { recursive: true });
  }
}

function getStoredCustomPlanillas(): PlanillaRaw[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(CUSTOM_PLANILLAS_FILE)) {
      return [];
    }
    const content = fs.readFileSync(CUSTOM_PLANILLAS_FILE, 'utf-8');
    return JSON.parse(content) || [];
  } catch (err) {
    console.error('Error reading custom planillas:', err);
    return [];
  }
}

function saveStoredCustomPlanillas(planillas: PlanillaRaw[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(CUSTOM_PLANILLAS_FILE, JSON.stringify(planillas, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing custom planillas:', err);
  }
}

// Normalize strings for fuzzy matching
function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Obtener listado de planillas registradas (por proyecto o todas)
 */
export async function getPlanillas(projectId?: string): Promise<PlanillaRaw[]> {
  const custom = getStoredCustomPlanillas();
  const all = [OFFICIAL_PLANILLA_01, ...custom];

  if (!projectId || projectId === 'ALL') {
    return all;
  }

  // Si se busca por project id, intentamos resolver el project code
  // Si se busca por project id, intentamos resolver el project code y nombre
  let targetProjectCode = projectId;
  let targetProjectName = '';
  let targetContractNumber = '';
  try {
    const proj = await prisma.project.findUnique({
      where: { id: projectId },
      select: { code: true },
    const proj = await prisma.project.findFirst({
      where: {
        OR: [{ id: projectId }, { code: projectId }],
      },
      select: { id: true, code: true, name: true, contractNumber: true },
    });
    if (proj?.code) {
      targetProjectCode = proj.code;
    }
    if (proj?.code) targetProjectCode = proj.code;
    if (proj?.name) targetProjectName = proj.name;
    if (proj?.contractNumber) targetContractNumber = proj.contractNumber;
  } catch (e) {
    // ignore
  }

  return all.filter(
    (p) =>
      p.projectCode === targetProjectCode ||
      p.projectCode === projectId ||
      targetProjectCode === 'OBRA-VALLE-VIRGEN-01'
  );
  const normTargetCode = normalizeText(targetProjectCode);
  const normTargetName = normalizeText(targetProjectName);

  const filtered = all.filter((p) => {
    // 1. Coincidencia directa por id o código de proyecto
    if (p.projectCode === targetProjectCode || p.projectCode === projectId) return true;

    // 2. Coincidencia por número de contrato (ej. EC-PREFGUAYAS-527225-CW-RFB)
    if (
      targetContractNumber &&
      p.contractNumber &&
      p.contractNumber.trim().toLowerCase() === targetContractNumber.trim().toLowerCase()
    ) {
      return true;
    }

    // 3. Coincidencia por nombre o código relacionado con Valle de la Virgen / LICOSA para la Planilla 01
    if (
      p.id === 'planilla-licosa-01' &&
      (normTargetName.includes('valle') ||
        normTargetName.includes('virgen') ||
        normTargetName.includes('licosa') ||
        normTargetCode.includes('valle') ||
        normTargetCode.includes('virgen') ||
        normTargetCode.includes('licosa') ||
        targetProjectCode === 'OBRA-VALLE-VIRGEN-01')
    ) {
      return true;
    }

    return false;
  });

  // Si el proyecto no tiene planillas personalizadas registradas aún,
  // ofrecemos la Planilla Oficial 01 para que el comparador pueda explorarse y nunca quede el selector vacío
  if (filtered.length === 0) {
    return [OFFICIAL_PLANILLA_01];
  }

  return filtered;
}

/**
 * Obtener una planilla por su ID o código
 */
export async function getPlanillaById(id: string): Promise<PlanillaRaw | null> {
  const all = await getPlanillas();
  return all.find((p) => p.id === id || p.code === id) || null;
}

/**
 * Motor de comparación: PLANILLA vs REPORTE DE OBRA DIARIA (RDO)
 */
export async function comparePlanillaVsRdo(params: {
  projectId: string;
  planillaId?: string;
  mode?: 'PERIOD' | 'ACCUMULATED';
  tolerance?: number;
}): Promise<PlanillaComparisonResult | null> {
  const { projectId, planillaId = 'planilla-licosa-01', mode = 'PERIOD', tolerance = 1.0 } = params;

  // 1. Obtener la planilla
  let planilla = await getPlanillaById(planillaId);
  if (!planilla) {
    planilla = OFFICIAL_PLANILLA_01;
  }

  // 2. Obtener el proyecto desde la base de datos
  let project: any = null;
  try {
    project = await prisma.project.findFirst({
      where: {
        OR: [
          { id: projectId },
          { code: projectId },
          { code: planilla.projectCode },
          { name: { contains: 'Valle de la Virgen', mode: 'insensitive' } },
        ],
      },
      include: {
        rubros: {
          include: {
            dailyExecutions: {
              include: {
                dailyReport: {
                  select: {
                    id: true,
                    reportNumber: true,
                    date: true,
                  },
                },
              },
            },
          },
          orderBy: { rubroNumber: 'asc' },
        },
        dailyReports: {
          orderBy: { reportNumber: 'asc' },
          include: {
            rubroExecutions: {
              include: {
                projectRubro: true,
              },
            },
          },
        },
      },
    });
  } catch (err) {
    console.error('Error fetching project from DB for planilla comparison:', err);
  }

  // Proyecto fallback si la BD está offline o vacía
  if (!project) {
    project = {
      id: projectId || 'OBRA-VALLE-VIRGEN-01',
      code: planilla.projectCode,
      name: planilla.projectName,
      contractAmount: planilla.contractAmount,
      contractor: planilla.contractor,
      client: planilla.client,
      inspectionCompany: planilla.fiscalizador,
      executingCompany: 'LICOSA',
      contractNumber: planilla.contractNumber,
      rubros: [],
      dailyReports: [],
    };
  }

  const pStartDate = new Date(planilla.startDate);
  const pEndDate = new Date(planilla.endDate);
  // Ajuste de fin de día
  pEndDate.setHours(23, 59, 59, 999);

  // 3. Filtrar los reportes diarios según el período de la planilla
  const allReports: any[] = project.dailyReports || [];

  // Reportes correspondientes exactamente al período de esta planilla
  const periodReports = allReports.filter((r) => {
    const rDate = new Date(r.date);
    return rDate >= pStartDate && rDate <= pEndDate;
  });

  // Reportes correspondientes a períodos anteriores (estrictamente antes de startDate)
  const priorReports = allReports.filter((r) => {
    const rDate = new Date(r.date);
    return rDate < pStartDate;
  });

  // Reportes acumulados hasta la fecha de corte (fin de período de planilla)
  const cutoffReports = allReports.filter((r) => {
    const rDate = new Date(r.date);
    return rDate <= pEndDate;
  });

  // Ordenar cronológicamente para determinar reporte inicial y final del período
  const sortedPeriodReports = [...periodReports].sort((a, b) => {
    if (a.reportNumber !== b.reportNumber) return a.reportNumber - b.reportNumber;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  const firstPeriodRep = sortedPeriodReports[0];
  const lastPeriodRep = sortedPeriodReports[sortedPeriodReports.length - 1];

  const dailyReportsRange = {
    start: planilla.startDate,
    end: planilla.endDate,
    startReportNumber: firstPeriodRep ? firstPeriodRep.reportNumber : null,
    endReportNumber: lastPeriodRep ? lastPeriodRep.reportNumber : null,
    startReportDate: firstPeriodRep ? new Date(firstPeriodRep.date).toISOString().split('T')[0] : null,
    endReportDate: lastPeriodRep ? new Date(lastPeriodRep.date).toISOString().split('T')[0] : null,
    totalReportsCount: periodReports.length,
    summaryText: firstPeriodRep && lastPeriodRep
      ? `Abarca del Reporte Diario N° ${String(firstPeriodRep.reportNumber).padStart(3, '0')} (${new Date(firstPeriodRep.date).toLocaleDateString('es-EC')}) al Reporte Diario N° ${String(lastPeriodRep.reportNumber).padStart(3, '0')} (${new Date(lastPeriodRep.date).toLocaleDateString('es-EC')})`
      : `No se registraron partes diarios entre el ${new Date(pStartDate).toLocaleDateString('es-EC')} y el ${new Date(pEndDate).toLocaleDateString('es-EC')}`,
  };

  const targetReports = mode === 'PERIOD' ? periodReports : cutoffReports;
  const latestCutoffReport = cutoffReports[cutoffReports.length - 1];

  // 4. Mapear ejecución de rubros en los partes diarios del período actual
  const rubroExecMap = new Map<string, { qty: number; amount: number }>();
  const rubroExecByNumberMap = new Map<number, { qty: number; amount: number }>();

  // Mapear ejecución de rubros en períodos anteriores (para arrastre de saldo)
  const priorRubroExecMap = new Map<string, { qty: number; amount: number }>();
  const priorRubroExecByNumberMap = new Map<number, { qty: number; amount: number }>();

  for (const report of priorReports) {
    for (const exec of report.rubroExecutions || []) {
      const q = Number(exec.dayQuantity) || 0;
      const a = Number(exec.dayAmount) || (q * (exec.projectRubro?.unitPrice || 0));

      const prevId = priorRubroExecMap.get(exec.projectRubroId) || { qty: 0, amount: 0 };
      priorRubroExecMap.set(exec.projectRubroId, {
        qty: prevId.qty + q,
        amount: prevId.amount + a,
      });

      if (exec.projectRubro?.rubroNumber) {
        const prevNum = priorRubroExecByNumberMap.get(exec.projectRubro.rubroNumber) || { qty: 0, amount: 0 };
        priorRubroExecByNumberMap.set(exec.projectRubro.rubroNumber, {
          qty: prevNum.qty + q,
          amount: prevNum.amount + a,
        });
      }
    }
  }

  // Si estamos en modo acumulado y hay último reporte, tomar el acumulado registrado
  if (mode === 'ACCUMULATED' && latestCutoffReport) {
    for (const exec of latestCutoffReport.rubroExecutions || []) {
      const q = Number(exec.accumQuantity) || 0;
      const a = Number(exec.accumAmount) || (q * (exec.projectRubro?.unitPrice || 0));
      if (exec.projectRubroId) {
        rubroExecMap.set(exec.projectRubroId, { qty: q, amount: a });
      }
      if (exec.projectRubro?.rubroNumber) {
        rubroExecByNumberMap.set(exec.projectRubro.rubroNumber, { qty: q, amount: a });
      }
    }
  } else {
    // Modo PERIOD: sumar día por día los reportes en el rango
    for (const report of targetReports) {
      for (const exec of report.rubroExecutions || []) {
        const q = Number(exec.dayQuantity) || 0;
        const a = Number(exec.dayAmount) || (q * (exec.projectRubro?.unitPrice || 0));
        
        // Acumular por rubroId
        const prevId = rubroExecMap.get(exec.projectRubroId) || { qty: 0, amount: 0 };
        rubroExecMap.set(exec.projectRubroId, {
          qty: prevId.qty + q,
          amount: prevId.amount + a,
        });

        // Acumular por rubroNumber
        if (exec.projectRubro?.rubroNumber) {
          const prevNum = rubroExecByNumberMap.get(exec.projectRubro.rubroNumber) || { qty: 0, amount: 0 };
          rubroExecByNumberMap.set(exec.projectRubro.rubroNumber, {
            qty: prevNum.qty + q,
            amount: prevNum.amount + a,
          });
        }
      }
    }
  }

  // Indexar rubros del proyecto por descripción y por código
  const projectRubros: any[] = project.rubros || [];
  const normalizedProjectRubros = projectRubros.map((pr) => ({
    ...pr,
    normDesc: normalizeText(pr.description),
  }));

  // 5. Comparar cada ítem de la planilla vs los datos reportados
  const comparisonItems: PlanillaComparisonItem[] = [];
  const matchedRubroIdsSet = new Set<string>();

  for (const item of planilla.items) {
    // 5.1 Buscar correspondencia en los rubros del proyecto
    let matchedRubro: any = null;

    // A) Buscar por número extraído de itemNumber (ej. "1.2" -> 2 o 1, o código)
    const itemNumInt = parseInt(item.itemNumber.replace(/[^0-9]/g, ''), 10);
    if (!matchedRubro && !isNaN(itemNumInt)) {
      matchedRubro = projectRubros.find((pr) => pr.rubroNumber === itemNumInt);
    }

    // B) Buscar por código en descripción (ej. "302-1", "304-1(2)*")
    if (!matchedRubro && item.code) {
      const cleanCode = item.code.trim().toLowerCase();
      matchedRubro = projectRubros.find(
        (pr) => pr.description.toLowerCase().includes(cleanCode) || pr.rubroNumber.toString() === cleanCode
      );
    }

    // C) Buscar por coincidencia de texto
    if (!matchedRubro) {
      const itemNorm = normalizeText(item.description);
      matchedRubro = normalizedProjectRubros.find((pr) => {
        return (
          pr.normDesc.includes(itemNorm) ||
          itemNorm.includes(pr.normDesc) ||
          (itemNorm.length > 8 && pr.normDesc.substring(0, 15) === itemNorm.substring(0, 15))
        );
      });
    }

    // 5.2 Obtener los valores reportados en obra diaria del período
    let repQty = 0;
    let repAmount = 0;

    // Valores reportados en períodos anteriores
    let priorRepQty = 0;
    let priorRepAmount = 0;

    if (matchedRubro) {
      matchedRubroIdsSet.add(matchedRubro.id);
      const fromId = rubroExecMap.get(matchedRubro.id);
      const fromNum = rubroExecByNumberMap.get(matchedRubro.rubroNumber);
      repQty = fromId?.qty || fromNum?.qty || 0;
      repAmount = fromId?.amount || fromNum?.amount || (repQty * item.unitPrice);

      const fromPriorId = priorRubroExecMap.get(matchedRubro.id);
      const fromPriorNum = priorRubroExecByNumberMap.get(matchedRubro.rubroNumber);
      priorRepQty = fromPriorId?.qty || fromPriorNum?.qty || 0;
      priorRepAmount = fromPriorId?.amount || fromPriorNum?.amount || (priorRepQty * item.unitPrice);
    }

    // Planillado según el modo
    const planQty = mode === 'PERIOD' ? item.periodQuantity : item.accumQuantity;
    const planAmount = mode === 'PERIOD' ? item.periodAmount : item.accumAmount;

    // Arrastre del período anterior
    const priorPlanQty = item.previousQuantity || 0;
    const priorPlanAmount = item.previousAmount || (priorPlanQty * item.unitPrice) || 0;
    // Si la obra reportó más que lo planificado anteriormente: Excedente (+)
    // Si la planilla cobró más que la obra anteriormente: Faltante de obra (-)
    const priorSurplusOrDeficit = Number((priorRepAmount - priorPlanAmount).toFixed(2));

    // Calcular diferencias del período actual
    const quantityDiff = Number((planQty - repQty).toFixed(4));
    const amountDiff = Number((planAmount - repAmount).toFixed(2));
    const absDiff = Math.abs(amountDiff);

    // Saldo neto acumulado consolidado (Arrastre anterior + Saldo actual)
    const currentPeriodSurplusOrDeficit = Number((repAmount - planAmount).toFixed(2));
    const consolidatedBalance = Number((priorSurplusOrDeficit + currentPeriodSurplusOrDeficit).toFixed(2));

    let status: 'A_FAVOR' | 'EN_CONTRA' | 'CONCILIADO' | 'NO_EJECUTADO' = 'CONCILIADO';
    let explanation = '';

    if (planQty === 0 && repQty === 0 && priorPlanQty === 0 && priorRepQty === 0) {
      status = 'NO_EJECUTADO';
      explanation = 'Sin avance registrado en este rubro (ni en planilla ni en partes diarios).';
    } else if (absDiff <= tolerance) {
      status = 'CONCILIADO';
      explanation = 'Lo reportado en obra y lo planillado coinciden perfectamente en este período.';
    } else if (amountDiff < -tolerance) {
      // Obra física reportada > Planilla: La empresa ejecutó más de lo que cobró
      status = 'A_FAVOR';
      const surplus = Math.abs(amountDiff).toLocaleString('es-EC', { minimumFractionDigits: 2 });
      explanation = `A favor de la constructora: Se ejecutó más en obra de lo planillado. Hay $${surplus} pendientes de cobrar en la próxima planilla.`;
    } else {
      // Planilla > Obra física reportada: Se cobró más de lo reportado en partes diarios
      status = 'EN_CONTRA';
      const excess = amountDiff.toLocaleString('es-EC', { minimumFractionDigits: 2 });
      explanation = `Planillado en exceso: Se facturaron $${excess} por encima de lo reportado en los partes diarios. Riesgo de justificación ante fiscalización.`;
    }

    const percentageDiff = planAmount > 0 ? Number(((amountDiff / planAmount) * 100).toFixed(2)) : 0;

    comparisonItems.push({
      itemNumber: item.itemNumber,
      code: item.code || '',
      category: item.category,
      description: item.description,
      unit: item.unit,
      unitPrice: item.unitPrice,
      contractQuantity: item.contractQuantity,
      contractTotal: item.contractTotal,
      planilladoQuantity: planQty,
      planilladoAmount: planAmount,
      reportedQuantity: repQty,
      reportedAmount: repAmount,
      quantityDiff,
      amountDiff,
      percentageDiff,
      status,
      matchedRubroId: matchedRubro?.id,
      matchedRubroNumber: matchedRubro?.rubroNumber,
      explanation,
      priorPlanilladoAmount: priorPlanAmount,
      priorReportedAmount: priorRepAmount,
      priorSurplusOrDeficit,
      consolidatedBalance,
    });
  }

  // 6. Resumen por Capítulos
  const chaptersMap = new Map<string, { plan: number; rep: number; diff: number; count: number; diffCount: number }>();
  for (const it of comparisonItems) {
    const prev = chaptersMap.get(it.category) || { plan: 0, rep: 0, diff: 0, count: 0, diffCount: 0 };
    chaptersMap.set(it.category, {
      plan: prev.plan + it.planilladoAmount,
      rep: prev.rep + it.reportedAmount,
      diff: prev.diff + it.amountDiff,
      count: prev.count + 1,
      diffCount: prev.diffCount + (it.status === 'A_FAVOR' || it.status === 'EN_CONTRA' ? 1 : 0),
    });
  }

  const chapters: ChapterSummary[] = Array.from(chaptersMap.entries()).map(([cat, data]) => {
    let status: 'A_FAVOR' | 'EN_CONTRA' | 'CONCILIADO' | 'NO_EJECUTADO' = 'CONCILIADO';
    if (data.plan === 0 && data.rep === 0) {
      status = 'NO_EJECUTADO';
    } else if (Math.abs(data.diff) <= tolerance) {
      status = 'CONCILIADO';
    } else if (data.diff < -tolerance) {
      status = 'A_FAVOR';
    } else {
      status = 'EN_CONTRA';
    }
    return {
      category: cat,
      planilladoAmount: Number(data.plan.toFixed(2)),
      reportedAmount: Number(data.rep.toFixed(2)),
      amountDiff: Number(data.diff.toFixed(2)),
      status,
      itemsCount: data.count,
      itemsWithDiffCount: data.diffCount,
    };
  });

  // 7. Totales Globales y Métricas
  const totalPlanilladoAmount = Number(
    comparisonItems.reduce((acc, it) => acc + it.planilladoAmount, 0).toFixed(2)
  );
  const totalReportedAmount = Number(
    comparisonItems.reduce((acc, it) => acc + it.reportedAmount, 0).toFixed(2)
  );
  const netDiffAmount = Number((totalPlanilladoAmount - totalReportedAmount).toFixed(2));
  const netDiffPercent =
    totalPlanilladoAmount > 0
      ? Number(((netDiffAmount / totalPlanilladoAmount) * 100).toFixed(2))
      : 0;

  const aFavorItems = comparisonItems.filter((it) => it.status === 'A_FAVOR');
  const enContraItems = comparisonItems.filter((it) => it.status === 'EN_CONTRA');
  const conciliadosItems = comparisonItems.filter((it) => it.status === 'CONCILIADO');
  const noEjecutadoItems = comparisonItems.filter((it) => it.status === 'NO_EJECUTADO');

  const aFavorAmount = Number(
    aFavorItems.reduce((acc, it) => acc + Math.abs(it.amountDiff), 0).toFixed(2)
  );
  const enContraAmount = Number(
    enContraItems.reduce((acc, it) => acc + it.amountDiff, 0).toFixed(2)
  );

  let globalStatus: 'A_FAVOR' | 'EN_CONTRA' | 'CONCILIADO' = 'CONCILIADO';
  let verdictTitle = 'Planilla y Reporte de Obra Conciliados';
  let verdictDescription =
    'El valor cobrado en la planilla concuerda con el avance físico reportado en los partes diarios.';

  if (netDiffAmount < -tolerance) {
    globalStatus = 'A_FAVOR';
    verdictTitle = 'Saldo a Favor de la Constructora (Obra no cobrada)';
    verdictDescription = `La obra física reportada en campo supera lo planillado por $${Math.abs(netDiffAmount).toLocaleString('es-EC', { minimumFractionDigits: 2 })}. Hay avance ejecutado listo para ser cobrado en la siguiente planilla.`;
  } else if (netDiffAmount > tolerance) {
    globalStatus = 'EN_CONTRA';
    verdictTitle = 'Planillado Superior al Avance de Obra Reportado';
    verdictDescription = `Lo planillado supera el avance físico registrado en los reportes diarios por $${netDiffAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}. Se recomienda revisar los partes diarios para asegurar el sustento técnico ante Fiscalización.`;
  }

  // 8. Arrastre Histórico y Conciliación del Período Anterior
  const totalPriorPlanillado = Number(
    comparisonItems.reduce((acc, it) => acc + (it.priorPlanilladoAmount || 0), 0).toFixed(2)
  );
  const totalPriorReported = Number(
    comparisonItems.reduce((acc, it) => acc + (it.priorReportedAmount || 0), 0).toFixed(2)
  );
  const priorSurplusOrDeficit = Number((totalPriorReported - totalPriorPlanillado).toFixed(2));
  const consolidatedBalance = Number(
    (priorSurplusOrDeficit + (totalReportedAmount - totalPlanilladoAmount)).toFixed(2)
  );

  let priorStatus: 'A_FAVOR' | 'EN_CONTRA' | 'CONCILIADO' | 'SIN_HISTORIAL' = 'CONCILIADO';
  let priorDesc = 'El período anterior quedó completamente conciliado.';

  if (totalPriorPlanillado === 0 && totalPriorReported === 0) {
    priorStatus = 'SIN_HISTORIAL';
    priorDesc = 'Primer período contractual (Planilla inicial sin arrastres previos).';
  } else if (priorSurplusOrDeficit > tolerance) {
    priorStatus = 'A_FAVOR';
    priorDesc = `Del período anterior quedó un excedente a favor de la constructora de $${priorSurplusOrDeficit.toLocaleString('es-EC', { minimumFractionDigits: 2 })} (obra ejecutada pendiente de cobro).`;
  } else if (priorSurplusOrDeficit < -tolerance) {
    priorStatus = 'EN_CONTRA';
    priorDesc = `Del período anterior se arrastra un faltante de obra de $${Math.abs(priorSurplusOrDeficit).toLocaleString('es-EC', { minimumFractionDigits: 2 })} (cobrado por adelantado en planilla previa).`;
  }

  let consolidatedStatus: 'A_FAVOR' | 'EN_CONTRA' | 'CONCILIADO' = 'CONCILIADO';
  if (consolidatedBalance > tolerance) {
    consolidatedStatus = 'A_FAVOR';
  } else if (consolidatedBalance < -tolerance) {
    consolidatedStatus = 'EN_CONTRA';
  }

  const priorCarryoverSummary = {
    totalPriorPlanillado,
    totalPriorReported,
    priorSurplusOrDeficit,
    priorStatus,
    consolidatedBalance,
    consolidatedStatus,
    description: priorDesc,
  };

  return {
    planilla,
    project: {
      id: project.id,
      code: project.code,
      name: project.name,
      contractAmount: project.contractAmount,
      contractor: project.contractor || planilla.contractor,
      client: project.client || planilla.client,
      fiscalizador: project.inspectionCompany || planilla.fiscalizador,
      administrator: planilla.administrator,
    },
    mode,
    tolerance,
    totalPlanilladoAmount,
    totalReportedAmount,
    netDiffAmount,
    netDiffPercent,
    globalStatus,
    verdictTitle,
    verdictDescription,
    priorCarryoverSummary,
    stats: {
      totalItems: comparisonItems.length,
      aFavorCount: aFavorItems.length,
      aFavorAmount,
      enContraCount: enContraItems.length,
      enContraAmount,
      conciliadosCount: conciliadosItems.length,
      noEjecutadoCount: noEjecutadoItems.length,
    },
    chapters,
    items: comparisonItems,
    dailyReportsCount: targetReports.length,
    dailyReportsRange,
  };
}

/**
 * Guardar o actualizar una planilla
 */
export async function savePlanilla(planillaData: Partial<PlanillaRaw>): Promise<{ success: boolean; planilla?: PlanillaRaw; error?: string }> {
  try {
    const existing = getStoredCustomPlanillas();
    const id = planillaData.id || `planilla-${Date.now()}`;
    const code = planillaData.code || `PLANILLA-${String(existing.length + 2).padStart(2, '0')}`;

    const newPlanilla: PlanillaRaw = {
      id,
      number: planillaData.number || existing.length + 2,
      code,
      title: planillaData.title || `Planilla No. ${existing.length + 2} de Avance de Obra`,
      projectCode: planillaData.projectCode || 'OBRA-VALLE-VIRGEN-01',
      projectName: planillaData.projectName || 'Rehabilitación de la Vía Valle de la Virgen',
      contractNumber: planillaData.contractNumber || 'EC-PREFGUAYAS-527225-CW-RFB',
      contractor: planillaData.contractor || 'CONSORCIO VALLE DE LA VIRGEN',
      client: planillaData.client || 'PREFECTURA DEL GUAYAS / BANCO MUNDIAL BIRF',
      fiscalizador: planillaData.fiscalizador || 'ASOCIACION C-D',
      administrator: planillaData.administrator || 'ING. ALBERTO JARRIN',
      contractAmount: Number(planillaData.contractAmount) || 12104252.06,
      advanceAmount: Number(planillaData.advanceAmount) || 2420850.41,
      advancePercent: Number(planillaData.advancePercent) || 20.0,
      startDate: planillaData.startDate || new Date().toISOString().split('T')[0],
      endDate: planillaData.endDate || new Date().toISOString().split('T')[0],
      presentationDate: planillaData.presentationDate || new Date().toISOString().split('T')[0],
      durationDays: Number(planillaData.durationDays) || 240,
      status: planillaData.status || 'APROBADA',
      subtotal: Number(planillaData.subtotal) || 0,
      ivaPercent: Number(planillaData.ivaPercent) || 15.0,
      ivaAmount: Number(planillaData.ivaAmount) || 0,
      totalWithIva: Number(planillaData.totalWithIva) || 0,
      advanceDeductionPercent: Number(planillaData.advanceDeductionPercent) || 20.0,
      advanceDeductionAmount: Number(planillaData.advanceDeductionAmount) || 0,
      penaltiesAmount: Number(planillaData.penaltiesAmount) || 0,
      netToPay: Number(planillaData.netToPay) || 0,
      economicAdvancePeriodPercent: Number(planillaData.economicAdvancePeriodPercent) || 0,
      economicAdvanceAccumPercent: Number(planillaData.economicAdvanceAccumPercent) || 0,
      notes: planillaData.notes || '',
      items: planillaData.items || [],
    };

    const idx = existing.findIndex((p) => p.id === id);
    if (idx >= 0) {
      existing[idx] = newPlanilla;
    } else {
      existing.push(newPlanilla);
    }

    saveStoredCustomPlanillas(existing);
    revalidatePath('/planillas');
    return { success: true, planilla: newPlanilla };
  } catch (err: any) {
    console.error('Error saving planilla:', err);
    return { success: false, error: err.message || 'Error al guardar planilla' };
  }
}

/**
 * Obtener rubros contractuales para ingreso manual de planillas
 */
export async function getProjectContractRubros(projectId?: string): Promise<PlanillaItemRaw[]> {
  try {
    const project = await prisma.project.findFirst({
      where: {
        OR: [
          ...(projectId ? [{ id: projectId }, { code: projectId }] : []),
          { code: 'OBRA-VALLE-VIRGEN-01' },
          { name: { contains: 'Valle de la Virgen', mode: 'insensitive' } },
        ],
      },
      include: {
        rubros: {
          orderBy: { rubroNumber: 'asc' },
        },
      },
    });

    if (project?.rubros && project.rubros.length > 0) {
      return project.rubros.map((r) => ({
        itemNumber: String(r.rubroNumber),
        code: '',
        category: r.isPrincipal ? 'RUBROS PRINCIPALES' : 'RUBROS SECUNDARIOS',
        description: r.description,
        unit: r.unit,
        contractQuantity: r.currentQuantity,
        unitPrice: r.unitPrice,
        contractTotal: Number((r.currentQuantity * r.unitPrice).toFixed(2)),
        previousQuantity: 0,
        periodQuantity: 0,
        accumQuantity: 0,
        previousAmount: 0,
        periodAmount: 0,
        accumAmount: 0,
        progressPercent: 0,
      }));
    }
  } catch (e) {
    // ignore
  }

  // Fallback a los rubros base de la planilla oficial
  return OFFICIAL_PLANILLA_01.items.map((it) => ({
    ...it,
    previousQuantity: it.accumQuantity, // Para sugerir acumulado previo
    previousAmount: it.accumAmount,
    periodQuantity: 0,
    periodAmount: 0,
    accumQuantity: it.accumQuantity,
    accumAmount: it.accumAmount,
  }));
}

/**
 * Eliminar una planilla personalizada
 */
export async function deletePlanilla(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (id === 'planilla-licosa-01') {
      return { success: false, error: 'No se puede eliminar la planilla oficial base del contrato.' };
    }
    const existing = getStoredCustomPlanillas();
    const filtered = existing.filter((p) => p.id !== id);
    saveStoredCustomPlanillas(filtered);
    revalidatePath('/planillas');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al eliminar planilla' };
  }
}

/**
 * Helper para analizar números de celdas de Excel
 */
function parseCellNumber(val: any, fallback = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/,/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? fallback : num;
  }
  return fallback;
}

/**
 * Analizador inteligente de archivos Excel de Planillas / Sábanas de Obra
 */
export async function parsePlanillaExcel(formData: FormData): Promise<{
  success: boolean;
  planilla?: PlanillaRaw;
  sheetName?: string;
  itemsCount?: number;
  error?: string;
}> {
  try {
    const file = formData.get('file') as File | null;
    const localPath = formData.get('localPath') as string | null;
    const projectCode = (formData.get('projectCode') as string) || 'OBRA-VALLE-VIRGEN-01';
    const planillaNumber = parseInt(formData.get('planillaNumber') as string, 10) || 2;
    const startDate = (formData.get('startDate') as string) || new Date().toISOString().split('T')[0];
    const endDate = (formData.get('endDate') as string) || new Date().toISOString().split('T')[0];

    let buffer: Buffer;

    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if (localPath && fs.existsSync(localPath)) {
      buffer = fs.readFileSync(localPath);
    } else {
      return { success: false, error: 'No se proporcionó ningún archivo Excel válido para procesar.' };
    }

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { success: false, error: 'El archivo Excel no contiene hojas de cálculo.' };
    }

    // Seleccionar la hoja más probable (SABANA, PLANILLA, AVANCE, etc.)
    const sheetName =
      workbook.SheetNames.find((s) => {
        const lower = s.toLowerCase();
        return (
          lower.includes('sabana') ||
          lower.includes('planilla') ||
          lower.includes('avance') ||
          lower.includes('rubro') ||
          lower.includes('contrato')
        );
      }) || workbook.SheetNames[0];

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (!rows || rows.length < 5) {
      return { success: false, error: 'La hoja seleccionada contiene muy pocas filas o está vacía.' };
    }

    // 1. Detectar fila de cabeceras
    let headerRowIndex = -1;
    let colItem = -1;
    let colCode = -1;
    let colDesc = -1;
    let colUnit = -1;
    let colQtyContract = -1;
    let colUnitPrice = -1;
    let colTotalContract = -1;
    let colQtyPeriod = -1;
    let colAmountPeriod = -1;
    let colQtyAccum = -1;
    let colAmountAccum = -1;

    for (let r = 0; r < Math.min(rows.length, 25); r++) {
      const row = rows[r];
      if (!row || !Array.isArray(row)) continue;

      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] || '').toLowerCase().trim();
        if (cell.includes('descrip') || cell.includes('concepto') || cell.includes('detalle') || cell.includes('rubro')) {
          headerRowIndex = r;
          break;
        }
      }
      if (headerRowIndex !== -1) break;
    }

    if (headerRowIndex === -1) {
      // Fallback a fila 0 si no se detecta
      headerRowIndex = 0;
    }

    // Mapear columnas desde la fila de cabeceras (o filas adyacentes para cabeceras compuestas)
    const hRow = rows[headerRowIndex] || [];
    const subHRow = rows[headerRowIndex + 1] || [];

    for (let c = 0; c < Math.max(hRow.length, subHRow.length); c++) {
      const hText = `${String(hRow[c] || '')} ${String(subHRow[c] || '')}`.toLowerCase().trim();

      if (colItem === -1 && (hText.includes('item') || hText.includes('n°') || hText.includes('nro') || hText === 'no')) {
        colItem = c;
      } else if (colCode === -1 && (hText.includes('cod') || hText.includes('código'))) {
        colCode = c;
      } else if (colDesc === -1 && (hText.includes('descrip') || hText.includes('rubro') || hText.includes('concepto'))) {
        colDesc = c;
      } else if (colUnit === -1 && (hText.includes('unid') || hText.includes('und') || hText === 'u')) {
        colUnit = c;
      } else if (colQtyContract === -1 && (hText.includes('cant') && (hText.includes('contrat') || hText.includes('presupuesto') || hText.includes('inicial')))) {
        colQtyContract = c;
      } else if (colUnitPrice === -1 && (hText.includes('p.u') || hText.includes('precio') || hText.includes('unitario') || hText.includes('costo unit'))) {
        colUnitPrice = c;
      } else if (colTotalContract === -1 && (hText.includes('total') && (hText.includes('contrat') || hText.includes('presupuesto')))) {
        colTotalContract = c;
      } else if (colQtyPeriod === -1 && (hText.includes('este periodo') || hText.includes('este período') || hText.includes('periodo') || hText.includes('mes'))) {
        colQtyPeriod = c;
      } else if (colAmountPeriod === -1 && (hText.includes('valor') && (hText.includes('periodo') || hText.includes('este') || hText.includes('mes')))) {
        colAmountPeriod = c;
      } else if (colQtyAccum === -1 && hText.includes('acum')) {
        colQtyAccum = c;
      }
    }

    // Asignaciones por defecto si alguna columna no tuvo match exacto
    if (colDesc === -1) colDesc = 2;
    if (colItem === -1) colItem = 0;
    if (colCode === -1 && colDesc > 1) colCode = 1;
    if (colUnit === -1) colUnit = 3;
    if (colQtyContract === -1) colQtyContract = 4;
    if (colUnitPrice === -1) colUnitPrice = 5;
    if (colQtyPeriod === -1) colQtyPeriod = colQtyContract + 2;
    if (colAmountPeriod === -1) colAmountPeriod = colQtyPeriod + 3;

    // 2. Extraer los rubros fila a fila
    const items: PlanillaItemRaw[] = [];
    let currentCategory = 'RUBROS PRINCIPALES DE OBRA';

    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !Array.isArray(row) || row.length === 0) continue;

      const rawItem = String(row[colItem] || '').trim();
      const rawCode = colCode !== -1 ? String(row[colCode] || '').trim() : '';
      const rawDesc = String(row[colDesc] || '').trim();

      if (!rawDesc) continue;

      // Si la fila es un título de capítulo o categoría (ej. "1 OBRAS PRELIMINARES", "2 MOVIMIENTO DE TIERRAS")
      const isCategoryRow =
        (/^[0-9]+(\.[0-9]+)*\s+[A-Z]/.test(rawDesc) || /^[0-9]+\s+[A-Z]/.test(rawItem)) &&
        !row[colUnitPrice] &&
        !row[colUnit];

      if (isCategoryRow) {
        currentCategory = rawDesc || rawItem;
        continue;
      }

      const unit = String(row[colUnit] || 'u').trim();
      const contractQty = parseCellNumber(row[colQtyContract]);
      const unitPrice = parseCellNumber(row[colUnitPrice]);
      const contractTotal =
        colTotalContract !== -1 && row[colTotalContract]
          ? parseCellNumber(row[colTotalContract])
          : contractQty * unitPrice;

      const periodQty = colQtyPeriod !== -1 ? parseCellNumber(row[colQtyPeriod]) : 0;
      let periodAmount = colAmountPeriod !== -1 ? parseCellNumber(row[colAmountPeriod]) : 0;
      if (periodAmount === 0 && periodQty > 0 && unitPrice > 0) {
        periodAmount = Number((periodQty * unitPrice).toFixed(2));
      }

      const accumQty = colQtyAccum !== -1 ? parseCellNumber(row[colQtyAccum]) : periodQty;
      const accumAmount = Number((accumQty * unitPrice).toFixed(2));
      const progressPercent = contractQty > 0 ? Number(((accumQty / contractQty) * 100).toFixed(2)) : 0;

      // Descartar filas de totales finales
      const lowerDesc = rawDesc.toLowerCase();
      if (
        lowerDesc.includes('total') ||
        lowerDesc.includes('subtotal') ||
        lowerDesc.includes('iva') ||
        lowerDesc.includes('anticipo') ||
        lowerDesc.includes('liquido') ||
        lowerDesc.includes('firmas')
      ) {
        continue;
      }

      // Debe tener al menos descripción y precio o cantidad
      if (unitPrice > 0 || contractQty > 0 || periodQty > 0) {
        items.push({
          itemNumber: rawItem || String(items.length + 1),
          code: rawCode,
          category: currentCategory,
          description: rawDesc,
          unit,
          contractQuantity: contractQty,
          unitPrice,
          contractTotal,
          previousQuantity: 0,
          periodQuantity: periodQty,
          accumQuantity: accumQty,
          previousAmount: 0,
          periodAmount,
          accumAmount,
          progressPercent,
        });
      }
    }

    if (items.length === 0) {
      return {
        success: false,
        error: `No se pudieron extraer rubros válidos de la hoja "${sheetName}". Verifique que contenga columnas de descripción y precio/cantidades.`,
      };
    }

    // 3. Liquidación Económica
    const subtotal = Number(items.reduce((sum, it) => sum + it.periodAmount, 0).toFixed(2));
    const ivaPercent = 15.0;
    const ivaAmount = Number((subtotal * 0.15).toFixed(2));
    const totalWithIva = Number((subtotal + ivaAmount).toFixed(2));
    const advancePercent = 20.0;
    const advanceDeductionAmount = Number((subtotal * 0.20).toFixed(2));
    const netToPay = Number((totalWithIva - advanceDeductionAmount).toFixed(2));

    const codeStr = `PLANILLA-${String(planillaNumber).padStart(2, '0')}`;
    const newPlanilla: PlanillaRaw = {
      id: `planilla-custom-${Date.now()}`,
      number: planillaNumber,
      code: codeStr,
      title: `Planilla No. ${String(planillaNumber).padStart(2, '0')} de Avance de Obra - Sábana`,
      projectCode,
      projectName: 'Rehabilitación de la Vía Valle de la Virgen – Lícosa',
      contractNumber: 'EC-PREFGUAYAS-527225-CW-RFB',
      contractor: 'CONSORCIO VALLE DE LA VIRGEN',
      client: 'PREFECTURA DEL GUAYAS / BANCO MUNDIAL BIRF',
      fiscalizador: 'ASOCIACION C-D',
      administrator: 'ING. ALBERTO JARRIN',
      contractAmount: 12104252.06,
      advanceAmount: 2420850.41,
      advancePercent: 20.0,
      startDate,
      endDate,
      presentationDate: new Date().toISOString().split('T')[0],
      durationDays: 240,
      status: 'APROBADA',
      subtotal,
      ivaPercent,
      ivaAmount,
      totalWithIva,
      advanceDeductionPercent: advancePercent,
      advanceDeductionAmount,
      penaltiesAmount: 0,
      netToPay,
      economicAdvancePeriodPercent: subtotal > 0 ? Number(((subtotal / 12104252.06) * 100).toFixed(2)) : 0,
      economicAdvanceAccumPercent: subtotal > 0 ? Number(((subtotal / 12104252.06) * 100).toFixed(2)) : 0,
      notes: `Importada desde archivo Excel "${file?.name || 'Sábana'}" (Hoja: ${sheetName}) con ${items.length} rubros.`,
      items,
    };

    return {
      success: true,
      planilla: newPlanilla,
      sheetName,
      itemsCount: items.length,
    };
  } catch (err: any) {
    console.error('Error parsing Planilla Excel:', err);
    return { success: false, error: err.message || 'Error desconocido al procesar el archivo Excel.' };
  }
}


