'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { recordAuditLog } from '@/lib/audit';
import * as XLSX from 'xlsx';

export async function getProjects() {
  return await prisma.project.findMany({
    include: {
      rubros: {
        orderBy: { rubroNumber: 'asc' },
      },
      dailyReports: {
        orderBy: { reportNumber: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getProjectById(id: string) {
  let project: any;
  try {
    project = await prisma.project.findUnique({
      where: { id },
      include: {
        rubros: {
          include: {
            adjustments: {
              orderBy: { createdAt: 'desc' },
            },
            dailyExecutions: {
              include: {
                dailyReport: true,
              },
            },
          },
          orderBy: { rubroNumber: 'asc' },
        },
        dailyReports: {
          orderBy: { reportNumber: 'desc' },
          include: {
            rubroExecutions: {
              include: {
                projectRubro: true,
              },
            },
            personnelLogs: true,
            machineryLogs: {
              include: {
                machinery: true,
              },
            },
            hourlyWeather: {
              orderBy: { timeSlot: 'asc' },
            },
          },
        },
        workerAssignments: {
          where: { status: 'ACTIVO' },
          include: {
            worker: true,
          },
          orderBy: { startDate: 'desc' },
        },
        contractors: {
          include: {
            contractor: true,
          },
          orderBy: { assignedAt: 'desc' },
        },
        expenses: {
          orderBy: { date: 'desc' },
        },
      },
    });
  } catch (err: any) {
    // If Prisma client in memory is stale (cached before schema update), fallback without expenses include
    if (err?.message?.includes('expenses') || err?.name === 'PrismaClientValidationError') {
      project = await prisma.project.findUnique({
        where: { id },
        include: {
          rubros: {
            include: {
              adjustments: {
                orderBy: { createdAt: 'desc' },
              },
              dailyExecutions: {
                include: {
                  dailyReport: true,
                },
              },
            },
            orderBy: { rubroNumber: 'asc' },
          },
          dailyReports: {
            orderBy: { reportNumber: 'desc' },
            include: {
              rubroExecutions: {
                include: {
                  projectRubro: true,
                },
              },
              personnelLogs: true,
              machineryLogs: {
                include: {
                  machinery: true,
                },
              },
              hourlyWeather: {
                orderBy: { timeSlot: 'asc' },
              },
            },
          },
          workerAssignments: {
            where: { status: 'ACTIVO' },
            include: {
              worker: true,
            },
            orderBy: { startDate: 'desc' },
          },
          contractors: {
            include: {
              contractor: true,
            },
            orderBy: { assignedAt: 'desc' },
          },
        },
      });
      if (project) {
        try {
          project.expenses = await (prisma as any).projectExpense?.findMany({
            where: { projectId: id },
            orderBy: { date: 'desc' },
          }) || [];
        } catch {
          project.expenses = [];
        }
      }
    } else {
      throw err;
    }
  }

  if (project?.dailyReports && project.dailyReports.length > 0) {
    function normalizeMach(desc?: string | null, machCode?: string | null): string {
      const str = (machCode || desc || '').toUpperCase().trim();
      const clean = str.replace(/[^A-Z0-9]/g, '');
      if (clean.includes('EX') && clean.match(/EX\d+/)) return clean.match(/EX\d+/)![0];
      if (clean.includes('TR') && clean.match(/TR\d+/)) return clean.match(/TR\d+/)![0];
      if (clean.includes('RL') && clean.match(/RL\d+/)) return clean.match(/RL\d+/)![0];
      if (clean.includes('VQ') && clean.match(/VQ\d+/)) return clean.match(/VQ\d+/)![0];
      return clean || str;
    }

    // Sort ascending by date and reportNumber to compute cumulative hours correctly
    const ascendingReports = [...project.dailyReports].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return a.reportNumber - b.reportNumber;
    });

    const accumMap = new Map<string, number>();
    for (const rep of ascendingReports) {
      rep.machineryLogs = (rep.machineryLogs as any[]).map((m) => {
        const key = m.machineryId || normalizeMach(m.description, m.machinery?.code);
        const prev = accumMap.get(key) || 0;
        const current = prev + (m.dayHours || 0);
        accumMap.set(key, current);

        const norm = normalizeMach(m.description, m.machinery?.code);
        if (norm && norm !== key) {
          accumMap.set(norm, (accumMap.get(norm) || 0) + (m.dayHours || 0));
        }

        return {
          ...m,
          accumHours: current,
          hourlyRate: m.hourlyRate ?? m.machinery?.hourlyRate ?? 0,
        };
      });
    }
  }

  return project;
}

export async function updateProjectStatus(projectId: string, status: string) {
  const project = await prisma.project.update({
    where: { id: projectId },
    data: { status },
  });

  await recordAuditLog({
    action: 'PROYECTO_ESTADO_ACTUALIZADO',
    entityType: 'Project',
    entityId: project.id,
    description: `Cambio de estado del proyecto [${project.code}] a: ${status}`,
    projectId: project.id,
    metadata: { status },
  });

  revalidatePath('/proyectos');
  revalidatePath(`/proyectos/${projectId}`);
  revalidatePath('/');
  return project;
}

export async function updateProject(
  projectId: string,
  formData: {
    code?: string;
    name?: string;
    contractor?: string;
    client?: string;
    inspectionCompany?: string;
    executingCompany?: string;
    contractNumber?: string;
    financingSource?: string;
    roadSection?: string;
    contractAmount?: number;
    durationDays?: number;
    startDate?: string | Date;
    status?: string;
  }
) {
  const dataToUpdate: any = {};
  if (formData.code !== undefined) dataToUpdate.code = formData.code;
  if (formData.name !== undefined) dataToUpdate.name = formData.name;
  if (formData.contractor !== undefined) dataToUpdate.contractor = formData.contractor;
  if (formData.client !== undefined) dataToUpdate.client = formData.client;
  if (formData.inspectionCompany !== undefined) dataToUpdate.inspectionCompany = formData.inspectionCompany;
  if (formData.executingCompany !== undefined) dataToUpdate.executingCompany = formData.executingCompany;
  if (formData.contractNumber !== undefined) dataToUpdate.contractNumber = formData.contractNumber;
  if (formData.financingSource !== undefined) dataToUpdate.financingSource = formData.financingSource;
  if (formData.roadSection !== undefined) dataToUpdate.roadSection = formData.roadSection;
  if (formData.contractAmount !== undefined) dataToUpdate.contractAmount = formData.contractAmount;
  if (formData.durationDays !== undefined) dataToUpdate.durationDays = formData.durationDays;
  if (formData.startDate !== undefined) dataToUpdate.startDate = new Date(formData.startDate);
  if (formData.status !== undefined) dataToUpdate.status = formData.status;

  const project = await prisma.project.update({
    where: { id: projectId },
    data: dataToUpdate,
  });

  await recordAuditLog({
    action: 'PROYECTO_ACTUALIZADO',
    entityType: 'Project',
    entityId: project.id,
    description: `Actualización de datos contractuales del proyecto [${project.code}] ${project.name}`,
    projectId: project.id,
    metadata: formData,
  });

  revalidatePath('/proyectos');
  revalidatePath(`/proyectos/${projectId}`);
  revalidatePath('/');
  return project;
}

export async function createProject(formData: {
  code: string;
  name: string;
  contractor: string;
  client: string;
  inspectionCompany: string;
  executingCompany: string;
  contractNumber: string;
  financingSource: string;
  roadSection: string;
  contractAmount: number;
  durationDays: number;
  startDate: string;
}) {
  const project = await prisma.project.create({
    data: {
      code: formData.code,
      name: formData.name,
      contractor: formData.contractor,
      client: formData.client,
      inspectionCompany: formData.inspectionCompany,
      executingCompany: formData.executingCompany,
      contractNumber: formData.contractNumber,
      financingSource: formData.financingSource,
      roadSection: formData.roadSection,
      contractAmount: formData.contractAmount,
      durationDays: formData.durationDays,
      startDate: new Date(formData.startDate),
      status: 'EN_EJECUCION',
    },
  });

  await recordAuditLog({
    action: 'PROYECTO_CREADO',
    entityType: 'Project',
    entityId: project.id,
    description: `Creación de nueva obra vial: [${project.code}] ${project.name} - Contrato: $${project.contractAmount.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`,
    projectId: project.id,
    metadata: {
      code: project.code,
      name: project.name,
      contractNumber: project.contractNumber,
      contractAmount: project.contractAmount,
      client: project.client,
    },
  });

  revalidatePath('/proyectos');
  revalidatePath('/');
  return project;
}

export async function addProjectRubro(data: {
  projectId: string;
  rubroNumber: number;
  description: string;
  unit: string;
  unitPrice: number;
  initialQuantity: number;
  isPrincipal: boolean;
}) {
  const rubro = await prisma.projectRubro.create({
    data: {
      projectId: data.projectId,
      rubroNumber: data.rubroNumber,
      description: data.description,
      unit: data.unit,
      unitPrice: data.unitPrice,
      initialQuantity: data.initialQuantity,
      currentQuantity: data.initialQuantity,
      isPrincipal: data.isPrincipal,
    },
  });

  await recordAuditLog({
    action: 'RUBRO_CREADO',
    entityType: 'ProjectRubro',
    entityId: rubro.id,
    description: `Incorporación de Rubro N° ${rubro.rubroNumber}: ${rubro.description} (${rubro.currentQuantity} ${rubro.unit} @ $${rubro.unitPrice.toFixed(2)})`,
    projectId: data.projectId,
    metadata: {
      rubroNumber: rubro.rubroNumber,
      description: rubro.description,
      unit: rubro.unit,
      unitPrice: rubro.unitPrice,
      initialQuantity: rubro.initialQuantity,
    },
  });

  revalidatePath(`/proyectos/${data.projectId}`);
  revalidatePath('/proyectos');
  return rubro;
}

export async function adjustRubroQuantity(data: {
  projectRubroId: string;
  quantityChange: number;
  type: string; // COMPLEMENTARY_CONTRACT, WORK_ORDER, ADJUSTMENT, INCREASE
  reason: string;
  documentRef?: string;
  approvedBy: string;
  newUnitPrice?: number;
}) {
  const existingRubro = await prisma.projectRubro.findUnique({
    where: { id: data.projectRubroId },
  });

  if (!existingRubro) {
    throw new Error('Rubro no encontrado');
  }

  const updatedCurrentQuantity = existingRubro.currentQuantity + data.quantityChange;

  const [adjustment, updatedRubro] = await prisma.$transaction([
    prisma.rubroAdjustment.create({
      data: {
        projectRubroId: data.projectRubroId,
        type: data.type,
        quantityChange: data.quantityChange,
        newUnitPrice: data.newUnitPrice || existingRubro.unitPrice,
        reason: data.reason,
        documentRef: data.documentRef,
        date: new Date(),
        approvedBy: data.approvedBy,
      },
    }),
    prisma.projectRubro.update({
      where: { id: data.projectRubroId },
      data: {
        currentQuantity: updatedCurrentQuantity,
        unitPrice: data.newUnitPrice || existingRubro.unitPrice,
      },
    }),
  ]);

  await recordAuditLog({
    action: 'REAJUSTE_RUBRO',
    entityType: 'RubroAdjustment',
    entityId: adjustment.id,
    description: `Reajuste de rubro N° ${existingRubro.rubroNumber} (${data.type}): cambio de ${data.quantityChange > 0 ? '+' : ''}${data.quantityChange} ${existingRubro.unit}. Motivo: ${data.reason}. Ref: ${data.documentRef || 'S/N'}. Aprobado por: ${data.approvedBy}`,
    projectId: existingRubro.projectId,
    metadata: {
      rubroNumber: existingRubro.rubroNumber,
      quantityChange: data.quantityChange,
      previousQuantity: existingRubro.currentQuantity,
      newQuantity: updatedCurrentQuantity,
      type: data.type,
      reason: data.reason,
      documentRef: data.documentRef,
      approvedBy: data.approvedBy,
    },
  });

  revalidatePath(`/proyectos/${existingRubro.projectId}`);
  revalidatePath('/proyectos');
  return { adjustment, updatedRubro };
}

export async function addBulkProjectRubros(data: {
  projectId: string;
  rubros: Array<{
    rubroNumber: number;
    description: string;
    unit: string;
    unitPrice: number;
    initialQuantity: number;
    isPrincipal: boolean;
  }>;
}) {
  const results = [];

  for (const r of data.rubros) {
    // Skip if rubro already exists for this project
    const existing = await prisma.projectRubro.findFirst({
      where: { projectId: data.projectId, rubroNumber: r.rubroNumber },
    });
    if (existing) continue;

    const rubro = await prisma.projectRubro.create({
      data: {
        projectId: data.projectId,
        rubroNumber: r.rubroNumber,
        description: r.description,
        unit: r.unit,
        unitPrice: r.unitPrice,
        initialQuantity: r.initialQuantity,
        currentQuantity: r.initialQuantity,
        isPrincipal: r.isPrincipal,
      },
    });
    results.push(rubro);
  }

  if (results.length > 0) {
    await recordAuditLog({
      action: 'RUBROS_IMPORTADOS',
      entityType: 'ProjectRubro',
      entityId: data.projectId,
      description: `Importación masiva de ${results.length} rubros contractuales al proyecto`,
      projectId: data.projectId,
      metadata: {
        totalImported: results.length,
        rubroNumbers: results.map((r) => r.rubroNumber),
      },
    });
  }

  revalidatePath(`/proyectos/${data.projectId}`);
  revalidatePath('/proyectos');
  revalidatePath('/reportes/nuevo');
  return { created: results.length, skipped: data.rubros.length - results.length };
}

export async function getGlobalRubrosCatalog() {
  const allRubros = await prisma.projectRubro.findMany({
    select: {
      rubroNumber: true,
      description: true,
      unit: true,
      unitPrice: true,
      isPrincipal: true,
      project: {
        select: {
          code: true,
          name: true,
        },
      },
    },
    orderBy: { rubroNumber: 'asc' },
  });

  // Unique rubros deduplicated by rubroNumber and normalized description
  const uniqueMap = new Map<string, typeof allRubros[0]>();
  for (const r of allRubros) {
    const key = `${r.rubroNumber}_${r.description.trim().toLowerCase()}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, r);
    }
  }

  return Array.from(uniqueMap.values());
}

export interface ProjectImportSuggestion {
  id: string;
  type: 'warning' | 'info' | 'error' | 'success';
  title: string;
  message: string;
  actionLabel?: string;
  actionType?: 'FIX_AMOUNT' | 'RENUMBER_RUBROS' | 'AUTO_CLASSIFY_PRINCIPALS';
  targetValue?: any;
}

export interface ParsedProjectExcelResult {
  success: boolean;
  error?: string;
  projectData: {
    code: string;
    name: string;
    contractor: string;
    client: string;
    inspectionCompany: string;
    executingCompany: string;
    contractNumber: string;
    financingSource: string;
    roadSection: string;
    contractAmount: number;
    durationDays: number;
    startDate: string;
    status: string;
  };
  rubros: Array<{
    rubroNumber: number;
    description: string;
    unit: string;
    unitPrice: number;
    initialQuantity: number;
    isPrincipal: boolean;
  }>;
  sheetNames: string[];
  detectedRubrosSheet?: string;
  suggestions: ProjectImportSuggestion[];
  metrics: {
    rubrosCount: number;
    rubrosSum: number;
    declaredAmount: number;
    difference: number;
    principalCount: number;
    duplicateCount: number;
    zeroPriceCount: number;
  };
}

/**
 * Parsea un archivo Excel para extraer la ficha del proyecto y el catálogo de rubros
 */
export async function parseProjectExcel(formData: FormData): Promise<ParsedProjectExcelResult> {
  const defaultEmptyResult: ParsedProjectExcelResult = {
    success: false,
    error: '',
    projectData: {} as any,
    rubros: [],
    sheetNames: [],
    suggestions: [],
    metrics: {
      rubrosCount: 0,
      rubrosSum: 0,
      declaredAmount: 0,
      difference: 0,
      principalCount: 0,
      duplicateCount: 0,
      zeroPriceCount: 0,
    },
  };

  try {
    const file = formData.get('file') as File | null;
    if (!file) {
      return {
        ...defaultEmptyResult,
        error: 'No se recibió ningún archivo.',
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetNames = wb.SheetNames;

    const projectData = {
      code: '',
      name: '',
      contractor: 'LICOSA, Licitaciones y Contratos S.A.',
      client: 'GAD PROVINCIAL DEL GUAYAS',
      inspectionCompany: '',
      executingCompany: 'LICOSA',
      contractNumber: '',
      financingSource: '',
      roadSection: '',
      contractAmount: 0,
      durationDays: 180,
      startDate: new Date().toISOString().split('T')[0],
      status: 'EN_EJECUCION',
    };

    // 1. Extraer metadatos de la hoja PROYECTO si existe
    const projSheetName = sheetNames.find((s) => s.trim().toUpperCase() === 'PROYECTO');
    if (projSheetName) {
      const wsProj = wb.Sheets[projSheetName];
      const rows = XLSX.utils.sheet_to_json(wsProj, { header: 1 }) as any[][];
      for (const row of rows) {
        if (!row || !row[0]) continue;
        const key = String(row[0]).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        const val = row[1];
        if (val === undefined || val === null || val === '') continue;

        if (key.includes('codigo') || key.includes('code')) projectData.code = String(val).trim().toUpperCase();
        else if (key.includes('nombre') || key.includes('proyecto')) projectData.name = String(val).trim();
        else if (key.includes('contratista')) projectData.contractor = String(val).trim();
        else if (key.includes('cliente') || key.includes('contratante')) projectData.client = String(val).trim();
        else if (key.includes('fiscaliza')) projectData.inspectionCompany = String(val).trim();
        else if (key.includes('ejecutora') || key.includes('empresa')) projectData.executingCompany = String(val).trim();
        else if (key.includes('numero_contrato') || key.includes('contrato')) projectData.contractNumber = String(val).trim();
        else if (key.includes('financiamiento') || key.includes('fuente')) projectData.financingSource = String(val).trim();
        else if (key.includes('tramo') || key.includes('segmento')) projectData.roadSection = String(val).trim();
        else if (key.includes('monto') || key.includes('presupuesto')) {
          const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '').trim());
          if (!isNaN(num)) projectData.contractAmount = num;
        } else if (key.includes('plazo') || key.includes('dias')) {
          const num = typeof val === 'number' ? val : parseInt(String(val).replace(/,/g, '').trim());
          if (!isNaN(num)) projectData.durationDays = num;
        } else if (key.includes('fecha_inicio') || key.includes('inicio')) {
          if (val instanceof Date) {
            projectData.startDate = val.toISOString().split('T')[0];
          } else if (typeof val === 'number') {
            const epoch = new Date(Date.UTC(1899, 11, 30));
            projectData.startDate = new Date(epoch.getTime() + val * 86400000).toISOString().split('T')[0];
          } else {
            const parsed = new Date(String(val));
            if (!isNaN(parsed.getTime())) projectData.startDate = parsed.toISOString().split('T')[0];
          }
        }
      }
    }

    // 2. Extraer catálogo de rubros
    const rubrosSheetName =
      sheetNames.find((s) => s.trim().toUpperCase() === 'RUBROS' || s.trim().toUpperCase() === 'PRESUPUESTO') ||
      sheetNames.find((s) => s.toLowerCase().includes('rubro')) ||
      sheetNames.find((s) => s.trim().toUpperCase() !== 'INSTRUCCIONES' && s.trim().toUpperCase() !== 'PROYECTO');

    const rubros: ParsedProjectExcelResult['rubros'] = [];

    if (rubrosSheetName) {
      const wsRubros = wb.Sheets[rubrosSheetName];
      const rows = XLSX.utils.sheet_to_json(wsRubros, { header: 1 }) as any[][];

      let headerIdx = -1;
      let colNum = 0;
      let colDesc = 1;
      let colUnit = 2;
      let colPrice = 3;
      let colQty = 4;
      let colType = 6;

      // Buscar fila de encabezados
      for (let i = 0; i < Math.min(20, rows.length); i++) {
        const row = rows[i];
        if (!row) continue;
        const rowStr = row.map((c) => String(c || '').toUpperCase()).join(' | ');
        if (rowStr.includes('DESCRIP') || (rowStr.includes('RUBRO') && rowStr.includes('UNID'))) {
          headerIdx = i;
          // Asignar columnas encontradas
          row.forEach((cell: any, cIdx: number) => {
            const text = String(cell || '').trim().toUpperCase();
            if (text.includes('N°') || text === 'ITEM' || text === 'RUBRO' || text === 'NUM') colNum = cIdx;
            else if (text.includes('DESCRIP') || text.includes('DETALLE') || text.includes('CONCEPTO')) colDesc = cIdx;
            else if (text.includes('UNID') || text.includes('MEDIDA') || text === 'U.') colUnit = cIdx;
            else if (text.includes('P.U') || text.includes('PRECIO') || text.includes('UNITARIO')) colPrice = cIdx;
            else if (text.includes('CANT') || text.includes('VOLUMEN')) colQty = cIdx;
            else if (text.includes('TIPO') || text.includes('CLASIF')) colType = cIdx;
          });
          break;
        }
      }

      const startRow = headerIdx >= 0 ? headerIdx + 1 : 0;
      let autoNum = 1;

      for (let i = startRow; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const rawDesc = row[colDesc];
        if (!rawDesc || typeof rawDesc !== 'string' || rawDesc.trim().length < 2) continue;
        const description = rawDesc.trim();

        // Evitar procesar filas que sean subtotales o encabezados
        if (description.toUpperCase().includes('PRESUPUESTO TOTAL') || description.toUpperCase().includes('SUMA TOTAL')) {
          continue;
        }

        const rawNum = row[colNum];
        let rubroNumber = typeof rawNum === 'number' ? rawNum : parseInt(String(rawNum || '').trim());
        if (isNaN(rubroNumber) || rubroNumber <= 0) {
          rubroNumber = autoNum;
        }
        autoNum = Math.max(autoNum, rubroNumber + 1);

        const unit = String(row[colUnit] || 'u').trim();

        const rawPrice = row[colPrice];
        let unitPrice = 0;
        if (typeof rawPrice === 'number') unitPrice = rawPrice;
        else if (rawPrice) {
          unitPrice = parseFloat(String(rawPrice).replace(/,/g, '').trim()) || 0;
        }

        const rawQty = row[colQty];
        let initialQuantity = 0;
        if (typeof rawQty === 'number') initialQuantity = rawQty;
        else if (rawQty) {
          initialQuantity = parseFloat(String(rawQty).replace(/,/g, '').trim()) || 0;
        }

        const rawType = row[colType];
        const isPrincipalExplicit = rawType && String(rawType).toLowerCase().includes('prin');

        if (unitPrice > 0 || initialQuantity > 0 || description.length > 3) {
          const totalVal = unitPrice * initialQuantity;
          rubros.push({
            rubroNumber,
            description,
            unit,
            unitPrice,
            initialQuantity,
            isPrincipal: Boolean(isPrincipalExplicit || totalVal > 15000),
          });
        }
      }
    }

    // 3. Cálculos de métricas y validaciones de relaciones
    const rubrosSum = rubros.reduce((acc, r) => acc + (r.unitPrice * r.initialQuantity), 0);
    const declaredAmount = projectData.contractAmount;

    // Detectar números duplicados
    const numCounts = new Map<number, number>();
    rubros.forEach((r) => numCounts.set(r.rubroNumber, (numCounts.get(r.rubroNumber) || 0) + 1));
    const duplicateNumbers = Array.from(numCounts.entries()).filter(([_, count]) => count > 1);

    // Detectar rubros con precio o cantidad en 0
    const zeroPrices = rubros.filter((r) => r.unitPrice <= 0 || r.initialQuantity <= 0);

    // Conteo de principales
    const principalCount = rubros.filter((r) => r.isPrincipal).length;

    // Sugerencias inteligentes
    const suggestions: ProjectImportSuggestion[] = [];

    // Relación A: Monto Contractual vs Suma de Rubros
    if (declaredAmount === 0 && rubrosSum > 0) {
      projectData.contractAmount = rubrosSum;
      suggestions.push({
        id: 'auto-amount',
        type: 'info',
        title: 'Presupuesto Calculado Automáticamente',
        message: `El monto contractual se calculó como la suma de los ${rubros.length} rubros detectados ($${rubrosSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).`,
      });
    } else if (rubrosSum > 0 && Math.abs(declaredAmount - rubrosSum) > 0.50) {
      const diff = declaredAmount - rubrosSum;
      suggestions.push({
        id: 'diff-amount',
        type: 'warning',
        title: 'Discrepancia en Presupuesto Contractual',
        message: `El monto contractual declarado en la ficha ($${declaredAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}) difiere de la suma de rubros ($${rubrosSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}). Diferencia: ${diff > 0 ? '+' : ''}$${diff.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`,
        actionLabel: `Ajustar a $${rubrosSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        actionType: 'FIX_AMOUNT',
        targetValue: rubrosSum,
      });
    } else if (rubrosSum > 0) {
      suggestions.push({
        id: 'amount-ok',
        type: 'success',
        title: 'Presupuesto Consistente',
        message: `El monto contractual declarado coincide exactamente con la sumatoria de rubros ($${rubrosSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}).`,
      });
    }

    // Relación B: Numeración de Rubros Duplicados
    if (duplicateNumbers.length > 0) {
      const dupSample = duplicateNumbers.slice(0, 3).map(([n]) => `N° ${n}`).join(', ');
      suggestions.push({
        id: 'dup-numbers',
        type: 'warning',
        title: 'Números de Rubro Duplicados',
        message: `Se detectaron ${duplicateNumbers.length} números repetidos (${dupSample}${duplicateNumbers.length > 3 ? '...' : ''}). Para evitar conflictos en reportes diarios, se recomienda re-enumerarlos correlativamente.`,
        actionLabel: 'Re-enumerar del 1 al N',
        actionType: 'RENUMBER_RUBROS',
      });
    }

    // Relación C: Precios o Volúmenes en Cero
    if (zeroPrices.length > 0) {
      suggestions.push({
        id: 'zero-prices',
        type: 'info',
        title: 'Rubros con Precio o Cantidad en Cero',
        message: `Hay ${zeroPrices.length} rubro(s) con precio unitario o cantidad contractual en $0.00. Podrán registrarse avances una vez definidos sus valores.`,
      });
    }

    // Relación D: Sugerencia de Clasificación Pareto (80/20)
    if (rubros.length >= 5) {
      if (principalCount === 0 || principalCount > rubros.length * 0.7) {
        suggestions.push({
          id: 'pareto-rubros',
          type: 'info',
          title: 'Optimización de Rubros Principales (Ley de Pareto)',
          message: `El sistema puede clasificar automáticamente como "Principales" los rubros que representan el 80% del valor económico de la obra para el seguimiento en reportes diarios.`,
          actionLabel: 'Auto-clasificar Principales (80/20)',
          actionType: 'AUTO_CLASSIFY_PRINCIPALS',
        });
      }
    }

    // Si el código no vino, generar uno tentativo
    if (!projectData.code) {
      projectData.code = `OBRA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;
    }
    if (!projectData.name) {
      projectData.name = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
    }

    return {
      success: true,
      projectData,
      rubros,
      sheetNames,
      detectedRubrosSheet: rubrosSheetName,
      suggestions,
      metrics: {
        rubrosCount: rubros.length,
        rubrosSum,
        declaredAmount: projectData.contractAmount,
        difference: projectData.contractAmount - rubrosSum,
        principalCount,
        duplicateCount: duplicateNumbers.length,
        zeroPriceCount: zeroPrices.length,
      },
    };
  } catch (err) {
    console.error('Error parseando Excel de proyecto:', err);
    return {
      ...defaultEmptyResult,
      error: err instanceof Error ? err.message : 'Error al procesar el archivo Excel.',
    };
  }
}

/**
 * Crea el proyecto y todos sus rubros en la base de datos tras la confirmación del usuario
 */
export async function createProjectWithRubros(payload: {
  project: {
    code: string;
    name: string;
    contractor: string;
    client: string;
    inspectionCompany?: string;
    executingCompany?: string;
    contractNumber?: string;
    financingSource?: string;
    roadSection?: string;
    contractAmount: number;
    durationDays: number;
    startDate: string;
  };
  rubros: Array<{
    rubroNumber: number;
    description: string;
    unit: string;
    unitPrice: number;
    initialQuantity: number;
    isPrincipal: boolean;
  }>;
}) {
  const existing = await prisma.project.findUnique({
    where: { code: payload.project.code.trim().toUpperCase() },
  });

  if (existing) {
    throw new Error(`Ya existe una obra con el código [${payload.project.code}]. Ingrese un código diferente.`);
  }

  const project = await prisma.project.create({
    data: {
      code: payload.project.code.trim().toUpperCase(),
      name: payload.project.name.trim(),
      contractor: payload.project.contractor.trim(),
      client: payload.project.client.trim(),
      inspectionCompany: payload.project.inspectionCompany?.trim() || 'CONSULTORA / ASOCIACIÓN FISCALIZADORA',
      executingCompany: payload.project.executingCompany?.trim() || 'LICOSA',
      contractNumber: payload.project.contractNumber?.trim() || 'SIN_NUMERO',
      financingSource: payload.project.financingSource?.trim() || 'FONDOS FISCALES',
      roadSection: payload.project.roadSection?.trim() || 'Tramo Principal',
      contractAmount: payload.project.contractAmount,
      durationDays: payload.project.durationDays,
      startDate: new Date(payload.project.startDate),
      status: 'EN_EJECUCION',
    },
  });

  if (payload.rubros && payload.rubros.length > 0) {
    await prisma.projectRubro.createMany({
      data: payload.rubros.map((r) => ({
        projectId: project.id,
        rubroNumber: r.rubroNumber,
        description: r.description.trim(),
        unit: r.unit.trim() || 'u',
        unitPrice: r.unitPrice,
        initialQuantity: r.initialQuantity,
        currentQuantity: r.initialQuantity,
        isPrincipal: r.isPrincipal,
      })),
    });
  }

  await recordAuditLog({
    action: 'PROYECTO_CREADO_DESDE_EXCEL',
    entityType: 'Project',
    entityId: project.id,
    description: `Creación de obra [${project.code}] ${project.name} importando ${payload.rubros.length} rubros desde Excel.`,
    projectId: project.id,
    metadata: {
      code: project.code,
      rubrosCount: payload.rubros.length,
      contractAmount: project.contractAmount,
    },
  });

  revalidatePath('/proyectos');
  revalidatePath('/');
  return { success: true, projectId: project.id };
}


