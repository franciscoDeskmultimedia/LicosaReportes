import { prisma } from '@/lib/prisma';
import { getProjectAccumulatedProgress } from '@/lib/actions/progress';

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export const AI_TOOLS_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'getSystemSummary',
      description: 'Obtiene un resumen global consolidado de toda la empresa y sistema: monto total contratado, monto total ejecutado en todas las obras, número de obras activas, materiales en alerta de stock bajo, maquinaria operativa y solicitudes pendientes.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listUserProjects',
      description: 'Obtiene la lista de proyectos u obras viales con su código, nombre, monto contractual, porcentaje de avance acumulado actual y monto ejecutado.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getProjectOverview',
      description: 'Obtiene el resumen ejecutivo, financiero y de avance de un proyecto específico (monto contractual, monto ejecutado, porcentaje de avance acumulado, días transcurridos vs plazo, índice SPI y horas de lluvia perdidas).',
      parameters: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'El ID único del proyecto o el código del proyecto (ej: "VALLE-001" o UUID).',
          },
        },
        required: ['projectId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getRubrosProgress',
      description: 'Consulta el estado y avance de los rubros contractuales de una obra: cantidades contratadas, cantidades ejecutadas, porcentaje de avance, precio unitario y montos.',
      parameters: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'El ID o código del proyecto.',
          },
          rubroNumber: {
            type: 'number',
            description: 'Opcional: Número específico del rubro (ej: 8, 9, 29, 163). Si se omite, devuelve un resumen de todos.',
          },
          filter: {
            type: 'string',
            enum: ['all', 'principales', 'superados', 'en_ejecucion', 'completados'],
            description: 'Filtro opcional: "principales" (solo rubros principales), "superados" (>100%), "en_ejecucion" (entre 0% y 100%), "completados" (=100%).',
          },
        },
        required: ['projectId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getDailyReportsSummary',
      description: 'Obtiene los últimos reportes diarios de obra oficial: número de reporte, fecha, actividades ejecutadas, clima/lluvia y observaciones de fiscalización/residencia.',
      parameters: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'El ID o código del proyecto.',
          },
          limit: {
            type: 'number',
            description: 'Cantidad de reportes recientes a obtener (por defecto 5).',
          },
        },
        required: ['projectId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getMaterialInventory',
      description: 'Consulta el inventario de materiales en bodega: existencias actuales, stock mínimo, unidad de medida y alertas de desabastecimiento.',
      parameters: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'Opcional: ID del proyecto para filtrar bodega de esa obra específica.',
          },
          onlyLowStock: {
            type: 'boolean',
            description: 'Si es true, sólo devuelve materiales que están bajo su stock mínimo de seguridad.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getMachineryStatus',
      description: 'Consulta el parque de maquinaria pesada y equipos asignados a la obra y su estado operativo (OPERATIVO, EN_MANTENIMIENTO, PARADO).',
      parameters: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'Opcional: ID del proyecto para ver maquinaria de esa obra.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getWorkRequestsSummary',
      description: 'Consulta las solicitudes de pedidos de obra (materiales, repuestos, combustible, herramientas) y su estado de aprobación.',
      parameters: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'Opcional: ID del proyecto.',
          },
          status: {
            type: 'string',
            enum: ['PENDIENTE', 'APROBADA', 'DESPACHADA_PARCIAL', 'DESPACHADA_TOTAL', 'RECHAZADA'],
            description: 'Filtro por estado de la solicitud.',
          },
        },
      },
    },
  },
];

/**
 * Resuelve el projectId real en caso de que el modelo haya pasado el código del proyecto (ej: "VALLE-001")
 */
async function resolveProjectId(idOrCode: string): Promise<string | null> {
  if (!idOrCode) return null;
  const project = await prisma.project.findFirst({
    where: {
      OR: [
        { id: idOrCode },
        { code: { equals: idOrCode, mode: 'insensitive' } },
        { name: { contains: idOrCode, mode: 'insensitive' } },
      ],
    },
    select: { id: true },
  });
  return project ? project.id : null;
}

/**
 * Ejecutor seguro de herramientas que interactúan con Prisma
 */
export async function executeAiTool(name: string, args: Record<string, any>): Promise<any> {
  try {
    switch (name) {
      case 'getSystemSummary': {
        const [projects, lowStockCount, totalMachinery, pendingRequests] = await Promise.all([
          prisma.project.findMany({
            include: {
              dailyReports: {
                orderBy: { reportNumber: 'desc' },
                take: 1,
                select: {
                  totalExecutedAccum: true,
                  progressPercentAccum: true,
                  reportNumber: true,
                  date: true,
                },
              },
            },
          }),
          prisma.materialItem.count({
            where: { currentStock: { lte: prisma.materialItem.fields.minStock } },
          }).catch(async () => {
            // Fallback si la comparación directa no se soporta en la versión
            const allItems = await prisma.materialItem.findMany({ select: { currentStock: true, minStock: true } });
            return allItems.filter((i) => i.currentStock <= i.minStock).length;
          }),
          prisma.machinery.findMany({
            select: { status: true },
          }),
          prisma.workRequest.count({
            where: { status: 'PENDIENTE' },
          }),
        ]);

        const totalContractAmount = projects.reduce((acc, p) => acc + p.contractAmount, 0);
        const totalExecutedAmount = projects.reduce((acc, p) => {
          const latest = p.dailyReports[0];
          return acc + (latest?.totalExecutedAccum || 0);
        }, 0);

        const operativeMachinery = totalMachinery.filter((m) => m.status === 'OPERATIVO').length;

        return {
          totalObras: projects.length,
          montoTotalContratadoEmpresa: `$${totalContractAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          montoTotalEjecutadoAcumulado: `$${totalExecutedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          porcentajeAvanceGlobal: `${((totalExecutedAmount / (totalContractAmount || 1)) * 100).toFixed(2)}%`,
          materialesAlertaStockBajo: lowStockCount,
          maquinariaTotal: totalMachinery.length,
          maquinariaOperativa: operativeMachinery,
          solicitudesPendientesAprobacion: pendingRequests,
          obras: projects.map((p) => {
            const latest = p.dailyReports[0];
            return {
              codigo: p.code,
              nombre: p.name,
              montoContrato: `$${p.contractAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
              avanceFinanciero: latest ? `${latest.progressPercentAccum.toFixed(2)}%` : '0.00%',
              montoEjecutado: latest ? `$${latest.totalExecutedAccum.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$0.00',
              estado: p.status,
            };
          }),
        };
      }

      case 'listUserProjects': {
        const projects = await prisma.project.findMany({
          select: {
            id: true,
            code: true,
            name: true,
            contractor: true,
            client: true,
            status: true,
            contractAmount: true,
            durationDays: true,
            startDate: true,
            dailyReports: {
              orderBy: { reportNumber: 'desc' },
              take: 1,
              select: {
                progressPercentAccum: true,
                totalExecutedAccum: true,
              },
            },
          },
          orderBy: { code: 'asc' },
        });
        return {
          total: projects.length,
          projects: projects.map((p) => {
            const latest = p.dailyReports[0];
            return {
              id: p.id,
              code: p.code,
              name: p.name,
              contractor: p.contractor,
              client: p.client,
              status: p.status,
              contractAmount: `$${p.contractAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
              avanceFinanciero: latest ? `${latest.progressPercentAccum.toFixed(2)}%` : '0.00%',
              montoEjecutado: latest ? `$${latest.totalExecutedAccum.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$0.00',
              startDate: p.startDate.toISOString().split('T')[0],
            };
          }),
        };
      }

      case 'getProjectOverview': {
        const resolvedId = await resolveProjectId(args.projectId);
        if (!resolvedId) {
          return { error: `No se encontró ningún proyecto con el identificador "${args.projectId}".` };
        }
        const data = await getProjectAccumulatedProgress(resolvedId);
        if (!data) {
          return { error: 'No se pudo cargar el avance del proyecto.' };
        }
        return {
          project: data.project,
          metrics: {
            montoContractual: `$${data.summary.contractAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            montoEjecutadoAcumulado: `$${data.summary.totalExecutedAccum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            saldoPorEjecutar: `$${data.summary.remainingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            porcentajeAvanceFinanciero: `${data.summary.progressPercent.toFixed(2)}%`,
            diasPlazoContractual: data.summary.durationDays,
            diasTranscurridos: data.summary.elapsedDays,
            diasRestantes: data.summary.remainingDays,
            porcentajeTiempoConsumido: `${data.summary.timeConsumedPercent.toFixed(2)}%`,
            indiceDesempenoCronogramaSPI: data.summary.schedulePerformanceIndex.toFixed(3),
            estadoCronograma:
              data.summary.schedulePerformanceIndex >= 1
                ? 'ADELANTADO / A TIEMPO'
                : 'CON RETRASO SEGÚN CRONOGRAMA',
            horasLluviaPerdidasAcumuladas: data.summary.totalLostRainHours,
            totalReportesDiariosAprobados: data.summary.reportsCount,
            ultimoReporteFecha: data.summary.latestReportDate,
          },
        };
      }

      case 'getRubrosProgress': {
        const resolvedId = await resolveProjectId(args.projectId);
        if (!resolvedId) {
          return { error: `No se encontró ningún proyecto con el identificador "${args.projectId}".` };
        }
        const data = await getProjectAccumulatedProgress(resolvedId);
        if (!data) {
          return { error: 'No se encontraron rubros para este proyecto.' };
        }

        let rubros = data.rubros;

        if (args.rubroNumber !== undefined && args.rubroNumber !== null) {
          rubros = rubros.filter((r) => r.rubroNumber === Number(args.rubroNumber));
        }

        if (args.filter) {
          if (args.filter === 'principales') {
            rubros = rubros.filter((r) => r.isPrincipal);
          } else if (args.filter === 'superados') {
            rubros = rubros.filter((r) => r.progressPercent > 100);
          } else if (args.filter === 'en_ejecucion') {
            rubros = rubros.filter((r) => r.progressPercent > 0 && r.progressPercent < 100);
          } else if (args.filter === 'completados') {
            rubros = rubros.filter((r) => r.progressPercent >= 100);
          }
        }

        return {
          totalRubros: rubros.length,
          rubros: rubros.map((r) => ({
            rubroNumber: r.rubroNumber,
            descripcion: r.description,
            unidad: r.unit,
            precioUnitario: `$${r.unitPrice.toFixed(2)}`,
            cantidadContratada: r.currentQuantity,
            cantidadEjecutada: r.accumQuantity,
            cantidadRestante: r.remainingQuantity,
            avancePorcentaje: `${r.progressPercent.toFixed(2)}%`,
            montoEjecutado: `$${r.accumAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            estado: r.status,
            esPrincipal: r.isPrincipal,
          })),
        };
      }

      case 'getDailyReportsSummary': {
        const resolvedId = await resolveProjectId(args.projectId);
        const limit = args.limit || 5;

        const reports = await prisma.dailyReport.findMany({
          where: resolvedId ? { projectId: resolvedId } : undefined,
          orderBy: [{ date: 'desc' }, { reportNumber: 'desc' }],
          take: Math.min(limit, 15),
          include: {
            project: { select: { code: true, name: true } },
            hourlyWeather: { take: 1, orderBy: { timeSlot: 'asc' } },
            rubroExecutions: {
              include: {
                projectRubro: { select: { rubroNumber: true, description: true, unit: true } },
              },
            },
          },
        });

        return {
          total: reports.length,
          reports: reports.map((rep) => ({
            reportNumber: rep.reportNumber,
            proyecto: rep.project.name,
            codigoProyecto: rep.project.code,
            fecha: rep.date.toISOString().split('T')[0],
            diasTranscurridos: `${rep.elapsedDays} de ${rep.totalDays} días`,
            horasLluviaDia: rep.rainHoursDay,
            horasPerdidasLluviaDia: rep.lostRainHoursDay,
            horasPerdidasLluviaAcumuladas: rep.lostRainHoursAccum,
            avanceFinancieroAcumulado: `${rep.progressPercentAccum.toFixed(2)}%`,
            montoEjecutadoHoy: `$${rep.totalExecutedDay.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            montoEjecutadoAcumulado: `$${rep.totalExecutedAccum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            actividadesVialHoy: rep.activitiesTodayVial || 'Sin detalle de vialidad',
            actividadesPavimentoHoy: rep.activitiesTodayPavimento || 'Sin detalle',
            novedadesYRiesgos: rep.noveltiesRisks || 'Sin novedades registradas',
            comentariosContratista: rep.contractorComments || 'Ninguno',
            comentariosFiscalizacion: rep.supervisorComments || 'Ninguno',
            rubrosEjecutadosEnEsteDia: rep.rubroExecutions.map((re) => ({
              rubro: re.projectRubro.rubroNumber,
              descripcion: re.projectRubro.description,
              cantidadHoy: re.dayQuantity,
              cantidadAcumulada: re.accumQuantity,
              montoHoy: `$${re.dayAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
              unidad: re.projectRubro.unit,
            })),
          })),
        };
      }

      case 'getMaterialInventory': {
        const resolvedId = args.projectId ? await resolveProjectId(args.projectId) : undefined;
        const materials = await prisma.materialItem.findMany({
          where: resolvedId ? { projectId: resolvedId } : undefined,
          orderBy: { name: 'asc' },
          include: {
            project: { select: { code: true, name: true } },
          },
        });

        let results = materials.map((m) => ({
          codigo: m.code,
          nombre: m.name,
          categoria: m.category,
          stockActual: m.currentStock,
          stockMinimo: m.minStock,
          unidad: m.unit,
          alertaStockBajo: m.currentStock <= m.minStock,
          proyecto: m.project?.name || 'General',
        }));

        if (args.onlyLowStock) {
          results = results.filter((m) => m.alertaStockBajo);
        }

        return {
          total: results.length,
          materiales: results,
        };
      }

      case 'getMachineryStatus': {
        const machinery = await prisma.machinery.findMany({
          orderBy: { code: 'asc' },
        });

        return {
          total: machinery.length,
          maquinaria: machinery.map((m) => ({
            codigo: m.code,
            nombre: m.name,
            categoria: m.category,
            placaOSerie: m.plateOrSerial || 'N/A',
            unidad: m.unit,
            estadoOperativo: m.status,
            horasTrabajadasAcumuladas: m.totalHoursWorked,
          })),
        };
      }

      case 'getWorkRequestsSummary': {
        const resolvedId = args.projectId ? await resolveProjectId(args.projectId) : undefined;
        const requests = await prisma.workRequest.findMany({
          where: {
            ...(resolvedId ? { projectId: resolvedId } : {}),
            ...(args.status ? { status: args.status } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            project: { select: { code: true, name: true } },
          },
        });

        return {
          total: requests.length,
          solicitudes: requests.map((req) => ({
            codigo: req.code,
            tipo: req.type,
            estado: req.status,
            prioridad: req.priority,
            materialOMaquinaria: req.materialName || req.machineryName || 'No especificado',
            cantidadRequerida: req.requestedQty ? `${req.requestedQty} ${req.unit || ''}` : `${req.estimatedHours || 0} horas`,
            solicitante: req.requestedByName,
            rolSolicitante: req.requestedByRole,
            proyecto: req.project.name,
            fecha: req.createdAt.toISOString().split('T')[0],
            justificacion: req.justification,
          })),
        };
      }

      default:
        return { error: `Herramienta desconocida: ${name}` };
    }
  } catch (error: any) {
    console.error(`Error ejecutando tool ${name}:`, error);
    return { error: `Error al consultar la base de datos: ${error.message || 'Error desconocido'}` };
  }
}
