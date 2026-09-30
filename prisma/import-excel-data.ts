import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

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

async function main() {
  console.log('================================================================');
  console.log('  LICOSA - IMPORTACIÓN DE PROYECTOS Y DATOS DESDE EXCEL');
  console.log('================================================================');

  const fileNarcisa = '/Users/franciscocornejo/Downloads/RDO_NARCISA_CANAL_METROPOLIS.xlsx';
  const fileValle = '/Users/franciscocornejo/Downloads/AVANCE DE OBRA VALLE DE LA VIRGEN....xlsx';

  if (!fs.existsSync(fileNarcisa)) {
    throw new Error(`No se encontró el archivo: ${fileNarcisa}`);
  }
  if (!fs.existsSync(fileValle)) {
    throw new Error(`No se encontró el archivo: ${fileValle}`);
  }

  // 1. Limpieza total de la BD asegurando estado cero
  console.log('1. Ejecutando limpieza inicial de la base de datos...');
  await prisma.dailyReportMachinery.deleteMany({});
  await prisma.dailyReportPersonnel.deleteMany({});
  await prisma.dailyRubroExecution.deleteMany({});
  await prisma.dailyHourlyWeather.deleteMany({});
  await prisma.dailyReport.deleteMany({});
  await prisma.storageMovement.deleteMany({});
  await prisma.storageReceipt.deleteMany({});
  await prisma.materialItem.deleteMany({});
  await prisma.workRequest.deleteMany({});
  await prisma.workerAssignment.deleteMany({});
  await prisma.worker.deleteMany({});
  await prisma.projectContractorAssignment.deleteMany({});
  await prisma.contractor.deleteMany({});
  await prisma.rubroAdjustment.deleteMany({});
  await prisma.projectRubro.deleteMany({});
  await prisma.userProjectAssignment.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.machinery.deleteMany({});

  // 2. Crear / asegurar usuario Admin y residentes
  console.log('2. Configurando usuarios principales...');
  const passwordHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@licosa.com' },
    update: {
      passwordHash,
      role: 'ADMIN',
      title: 'Administrador General',
      active: true,
    },
    create: {
      email: 'admin@licosa.com',
      name: 'Ing. Fernando Salazar (Administrador)',
      passwordHash,
      role: 'ADMIN',
      title: 'Administrador General',
      active: true,
    },
  });

  const resNarcisa = await prisma.user.upsert({
    where: { email: 'residente.narcisa@licosa.com' },
    update: { passwordHash, role: 'RESIDENTE_OBRA', title: 'Residente de Obra', active: true },
    create: {
      email: 'residente.narcisa@licosa.com',
      name: 'Ing. Gustavo Berrezueta',
      passwordHash,
      role: 'RESIDENTE_OBRA',
      title: 'Residente de Obra - Narcisa Club',
      active: true,
    },
  });

  const resValle = await prisma.user.upsert({
    where: { email: 'residente.valle@licosa.com' },
    update: { passwordHash, role: 'RESIDENTE_OBRA', title: 'Residente de Obra', active: true },
    create: {
      email: 'residente.valle@licosa.com',
      name: 'Ing. Jerson López',
      passwordHash,
      role: 'RESIDENTE_OBRA',
      title: 'Residente de Obra - Valle de la Virgen',
      active: true,
    },
  });

  // =================================================================
  // 3. PROYECTO 1: CANAL SECUNDARIO METROPOLIS (NARCISA CLUB)
  // =================================================================
  console.log('\n3. Procesando Proyecto Narcisa Canal Metrópolis...');
  const wbNarcisa = XLSX.readFile(fileNarcisa);

  const narcisaProject = await prisma.project.create({
    data: {
      code: 'OBRA-NARCISA-01',
      name: 'Construcción de Canal Secundario (Metrópolis) - Alternativa Verano - Proyecto Narcisa Club',
      contractor: 'LICOSA, Licitaciones y Contratos S.A.',
      client: 'Fideicomiso Narcisa Plaza (FIDEVAL S.A.)',
      inspectionCompany: 'Ing. Emiliano Sornoza Castillo',
      executingCompany: 'LICOSA',
      contractNumber: 'LICOSA-CANAL-2026-003',
      financingSource: 'Fideicomiso Narcisa Plaza',
      roadSection: '0+000 - 0+943.30 (Alternativa Verano)',
      contractAmount: 698885.39,
      durationDays: 150,
      startDate: new Date('2026-04-21T00:00:00.000Z'),
      status: 'EN_EJECUCION',
    },
  });

  await prisma.userProjectAssignment.createMany({
    data: [
      { userId: adminUser.id, projectId: narcisaProject.id, roleInProject: 'ADMIN' },
      { userId: resNarcisa.id, projectId: narcisaProject.id, roleInProject: 'RESIDENTE_OBRA' },
    ],
  });

  // Rubros de Narcisa
  console.log('   - Cargando rubros contractuales de Narcisa...');
  const wsNarcisaRubros = wbNarcisa.Sheets['Rubros'];
  const dataNarcisaRubros = XLSX.utils.sheet_to_json(wsNarcisaRubros, { header: 1 }) as any[][];
  const narcisaRubrosMap = new Map<number, string>();

  for (let i = 3; i < dataNarcisaRubros.length; i++) {
    const row = dataNarcisaRubros[i];
    if (!row || row.length === 0) continue;
    if (typeof row[0] === 'number') {
      const rubroNumber = row[0];
      const desc = String(row[1] || '').trim();
      const unit = String(row[2] || 'm3').trim();
      const unitPrice = parseNum(row[3]);
      const initialQty = parseNum(row[4]);

      const rubro = await prisma.projectRubro.create({
        data: {
          projectId: narcisaProject.id,
          rubroNumber,
          description: desc,
          unit,
          unitPrice,
          initialQuantity: initialQty,
          currentQuantity: initialQty,
          isPrincipal: true,
        },
      });
      narcisaRubrosMap.set(rubroNumber, rubro.id);
    }
  }
  console.log(`   ✓ ${narcisaRubrosMap.size} rubros creados para Narcisa.`);

  // Reportes Diarios de Narcisa (Hojas con fechas)
  console.log('   - Procesando reportes diarios (hojas con fecha) de Narcisa...');
  const narcisaDateSheets = [
    'mar 08-sep',
    'mié 09-sep',
    'jue 10-sep',
    'vie 11-sep',
    'sáb 12-sep',
    'lun 14-sep',
    'mar 15-sep',
  ];

  let narcisaReportSeq = 1;
  for (const sheetName of narcisaDateSheets) {
    const ws = wbNarcisa.Sheets[sheetName];
    if (!ws) continue;
    const d = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

    const reportDate = excelDateToDate(d[3]?.[2]);
    const roadSection = String(d[3]?.[8] || '0+000 - 0+943.30 (Alternativa Verano)');
    const totalExecutedDay = parseNum(d[4]?.[2]);
    const progressPercentAccum = parseNum(d[4]?.[5]);

    const rainHoursDay = parseNum(d[7]?.[3]);
    const rainHoursNight = parseNum(d[8]?.[3]);
    const lostRainHoursDay = parseNum(d[9]?.[3]);
    const lostRainHoursAccum = parseNum(d[10]?.[3]);

    const safetyTalkMinutesDay = parseNum(d[7]?.[9]);
    const safetyTalkMinutesAccum = parseNum(d[8]?.[9]);
    const incidents = parseRatio(d[9]?.[9]);
    const accidents = parseRatio(d[10]?.[9]);

    const principalExecutedDay = parseNum(d[42]?.[8]);
    const principalExecutedAccum = parseNum(d[42]?.[10]);
    const nonPrincipalExecutedDay = parseNum(d[43]?.[8]);
    const nonPrincipalExecutedAccum = parseNum(d[43]?.[10]);
    const totalExecutedAccum = parseNum(d[44]?.[10]);

    // Resumen actividades
    const actTodayVial = d[49]?.[2] || d[49]?.[1] || null;
    const actTodayPavimento = d[50]?.[2] || d[50]?.[1] || null;
    const actTodayDrenaje = d[51]?.[2] || d[51]?.[1] || null;
    const actTodayPuentes = d[52]?.[2] || d[52]?.[1] || null;
    const actTodayTopografia = d[54]?.[2] || d[54]?.[1] || null;
    const actTodayAmbiental = d[55]?.[2] || d[55]?.[1] || null;

    const actTomVial = d[58]?.[2] || d[58]?.[1] || null;
    const actTomDrenaje = d[59]?.[2] || d[59]?.[1] || null;
    const actTomPuentes = d[60]?.[2] || d[60]?.[1] || null;
    const actTomTopografia = d[63]?.[2] || d[63]?.[1] || null;
    const actTomAmbiental = d[64]?.[2] || d[64]?.[1] || null;

    const noveltiesRisks = d[66]?.[1] || d[67]?.[0] || d[68]?.[0] || null;
    const contractorComments = d[72]?.[1] || d[73]?.[0] || null;
    const supervisorComments = d[72]?.[7] || d[73]?.[6] || null;

    const preparedByName = String(d[85]?.[0] || 'Ing. Gustavo Berrezueta');
    const preparedByTitle = String(d[86]?.[0] || 'Residente de Obra - LICOSA');

    const dailyReport = await prisma.dailyReport.create({
      data: {
        projectId: narcisaProject.id,
        reportNumber: narcisaReportSeq,
        date: reportDate,
        roadSection,
        elapsedDays: Math.max(1, Math.round((reportDate.getTime() - narcisaProject.startDate.getTime()) / 86400000)),
        totalDays: 150,
        totalExecutedDay,
        totalExecutedAccum,
        principalExecutedDay,
        principalExecutedAccum,
        nonPrincipalExecutedDay,
        nonPrincipalExecutedAccum,
        progressPercentAccum,
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
        activitiesTodayAmbiental: actTodayAmbiental ? String(actTodayAmbiental).trim() : null,
        activitiesTomorrowVial: actTomVial ? String(actTomVial).trim() : null,
        activitiesTomorrowDrenaje: actTomDrenaje ? String(actTomDrenaje).trim() : null,
        activitiesTomorrowPuentes: actTomPuentes ? String(actTomPuentes).trim() : null,
        activitiesTomorrowTopografia: actTomTopografia ? String(actTomTopografia).trim() : null,
        activitiesTomorrowAmbiental: actTomAmbiental ? String(actTomAmbiental).trim() : null,
        noveltiesRisks: noveltiesRisks ? String(noveltiesRisks).trim() : null,
        contractorComments: contractorComments ? String(contractorComments).trim() : null,
        supervisorComments: supervisorComments ? String(supervisorComments).trim() : null,
        preparedByName,
        preparedByTitle,
        reviewedByName: 'Ing. Emiliano Sornoza Castillo',
        reviewedByTitle: 'Fiscalizador de Obra',
      },
    });

    // Machinery (rows 14 a 23)
    for (let r = 14; r <= 23; r++) {
      const row = d[r];
      if (!row) continue;
      const eqDesc = row[0] ? String(row[0]).trim() : '';
      if (eqDesc && eqDesc !== 'Descripción del equipo') {
        const unit = String(row[3] || 'hr').trim();
        const quantity = parseNum(row[4], 1);
        const dayHours = parseNum(row[5], 0);

        // Upsert machinery
        const code = eqDesc.replace(/[^A-Za-z0-9]/g, '_').substring(0, 15).toUpperCase();
        const mach = await prisma.machinery.upsert({
          where: { code },
          update: {},
          create: {
            code,
            name: eqDesc,
            category: eqDesc.includes('VOLQUETA') ? 'Volqueta' : 'Excavadora',
            unit,
            status: 'OPERATIVO',
          },
        });

        await prisma.dailyReportMachinery.create({
          data: {
            dailyReportId: dailyReport.id,
            machineryId: mach.id,
            description: eqDesc,
            unit,
            quantity,
            dayHours,
          },
        });
      }

      // Personnel
      const persRole = row[6] ? String(row[6]).trim() : '';
      if (persRole && persRole !== 'Categoría / Cargo') {
        const quantity = Math.round(parseNum(row[10], 1));
        const manHoursDay = parseNum(row[11], 8);
        await prisma.dailyReportPersonnel.create({
          data: {
            dailyReportId: dailyReport.id,
            categoryRole: persRole,
            quantity,
            manHoursDay,
            totalManHours: quantity * manHoursDay,
          },
        });
      }
    }

    // Rubros ejecutados en el reporte (rows 26 a 37)
    for (let r = 26; r <= 37; r++) {
      const row = d[r];
      if (!row || typeof row[0] !== 'number') continue;
      const rubroNum = row[0];
      const rubroId = narcisaRubrosMap.get(rubroNum);
      if (rubroId) {
        const dayQty = parseNum(row[6]);
        const accumQty = parseNum(row[7]);
        const dayAmt = parseNum(row[8]);
        const accumAmt = parseNum(row[10]);

        await prisma.dailyRubroExecution.create({
          data: {
            dailyReportId: dailyReport.id,
            projectRubroId: rubroId,
            dayQuantity: dayQty,
            accumQuantity: accumQty,
            dayAmount: dayAmt,
            accumAmount: accumAmt,
          },
        });
      }
    }

    // Condiciones climáticas por franja horaria (row 78-79)
    const slots = ['0-6', '6-8', '8-10', '10-12', '12-14', '14-16', '16-18', '18-24'];
    for (let sIdx = 0; sIdx < slots.length; sIdx++) {
      const codeVal = parseNum(d[79]?.[4 + sIdx], 1);
      await prisma.dailyHourlyWeather.create({
        data: {
          dailyReportId: dailyReport.id,
          timeSlot: slots[sIdx],
          conditionCode: codeVal,
        },
      });
    }

    console.log(`   ✓ Reporte N° ${narcisaReportSeq} (${sheetName}) importado correctamente.`);
    narcisaReportSeq++;
  }

  // =================================================================
  // 4. PROYECTO 2: VALLE DE LA VIRGEN
  // =================================================================
  console.log('\n4. Procesando Proyecto Valle de la Virgen...');
  const wbValle = XLSX.readFile(fileValle);

  const valleProject = await prisma.project.create({
    data: {
      code: 'OBRA-VALLE-VIRGEN-01',
      name: 'Rehabilitación de la Vía Valle de la Virgen – Lím. Provincial y Lím. Provincial – Las Muras – Lím. Provincial (Cantones Pedro Carbo y Colimes)',
      contractor: 'Consorcio Valle de la Virgen',
      client: 'GAD Provincial del Guayas (Prefectura del Guayas)',
      inspectionCompany: 'ASOCIACION C-D',
      executingCompany: 'LICOSA',
      contractNumber: 'EC-PREFGUAYAS-527225-CW-RFB',
      financingSource: 'BIRF 9722-EC (Banco Mundial)',
      roadSection: 'Valle de la Virgen – Lím. Provincial y Las Muras',
      contractAmount: 5939620.30,
      durationDays: 240,
      startDate: new Date('2026-08-28T00:00:00.000Z'),
      status: 'EN_EJECUCION',
    },
  });

  await prisma.userProjectAssignment.createMany({
    data: [
      { userId: adminUser.id, projectId: valleProject.id, roleInProject: 'ADMIN' },
      { userId: resValle.id, projectId: valleProject.id, roleInProject: 'RESIDENTE_OBRA' },
    ],
  });

  // Rubros de Valle de la Virgen
  console.log('   - Cargando rubros contractuales de Valle de la Virgen...');
  const wsValleRubros = wbValle.Sheets['Rubros'];
  const dataValleRubros = XLSX.utils.sheet_to_json(wsValleRubros, { header: 1 }) as any[][];
  const valleRubrosMap = new Map<number, string>();

  for (let i = 3; i < dataValleRubros.length; i++) {
    const row = dataValleRubros[i];
    if (!row || row.length === 0) continue;
    if (typeof row[0] === 'number') {
      const rubroNumber = row[0];
      const desc = String(row[1] || '').trim();
      const unit = String(row[2] || 'm3').trim();
      const unitPrice = parseNum(row[3]);
      const initialQty = parseNum(row[4]);

      const rubro = await prisma.projectRubro.create({
        data: {
          projectId: valleProject.id,
          rubroNumber,
          description: desc,
          unit,
          unitPrice,
          initialQuantity: initialQty,
          currentQuantity: initialQty,
          isPrincipal: true,
        },
      });
      valleRubrosMap.set(rubroNumber, rubro.id);
    }
  }
  console.log(`   ✓ ${valleRubrosMap.size} rubros creados para Valle de la Virgen.`);

  // Reporte Diario de Valle de la Virgen (Pestaña RDO)
  console.log('   - Procesando reporte diario de Valle de la Virgen (pestaña RDO)...');
  const wsValleRdo = wbValle.Sheets['RDO'];
  if (wsValleRdo) {
    const d = XLSX.utils.sheet_to_json(wsValleRdo, { header: 1 }) as any[][];

    const reportDate = excelDateToDate(d[4]?.[2]);
    const reportNum = Math.round(parseNum(d[4]?.[5], 25));
    const roadSection = String(d[4]?.[8] || 'Valle de la Virgen – Lím. Provincial y Las Muras');
    const totalExecutedDay = parseNum(d[5]?.[2]);
    const progressPercentAccum = parseNum(d[5]?.[5]);

    const rainHoursDay = parseNum(d[8]?.[3]);
    const rainHoursNight = parseNum(d[9]?.[3]);
    const lostRainHoursDay = parseNum(d[10]?.[3]);
    const lostRainHoursAccum = parseNum(d[11]?.[3]);

    const safetyTalkMinutesDay = parseNum(d[8]?.[9]);
    const safetyTalkMinutesAccum = parseNum(d[9]?.[9]);
    const incidents = parseRatio(d[10]?.[9]);
    const accidents = parseRatio(d[11]?.[9]);

    const principalExecutedDay = parseNum(d[47]?.[8]);
    const principalExecutedAccum = parseNum(d[47]?.[10]);
    const nonPrincipalExecutedDay = parseNum(d[48]?.[8]);
    const nonPrincipalExecutedAccum = parseNum(d[48]?.[10]);
    const totalExecutedAccum = parseNum(d[49]?.[10]);

    // Resumen actividades
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

    const dailyReport = await prisma.dailyReport.create({
      data: {
        projectId: valleProject.id,
        reportNumber: reportNum,
        date: reportDate,
        roadSection,
        elapsedDays: 25,
        totalDays: 240,
        totalExecutedDay,
        totalExecutedAccum,
        principalExecutedDay,
        principalExecutedAccum,
        nonPrincipalExecutedDay,
        nonPrincipalExecutedAccum,
        progressPercentAccum,
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
      },
    });

    // Machinery (rows 15 a 25)
    for (let r = 15; r <= 25; r++) {
      const row = d[r];
      if (!row) continue;
      const eqDesc = row[0] ? String(row[0]).trim() : '';
      if (eqDesc && eqDesc !== 'Descripción del equipo') {
        const unit = String(row[3] || 'hora').trim();
        const quantity = parseNum(row[4], 1);
        const dayHours = parseNum(row[5], 0);

        const code = eqDesc.replace(/[^A-Za-z0-9]/g, '_').substring(0, 15).toUpperCase();
        let cat = 'Excavadora';
        if (eqDesc.includes('TRACTOR')) cat = 'Tractor';
        else if (eqDesc.includes('BAÑERA') || eqDesc.includes('MULA')) cat = 'Volqueta';
        else if (eqDesc.includes('RL')) cat = 'Rodillo';

        const mach = await prisma.machinery.upsert({
          where: { code },
          update: {},
          create: {
            code,
            name: eqDesc,
            category: cat,
            unit,
            status: 'OPERATIVO',
          },
        });

        await prisma.dailyReportMachinery.create({
          data: {
            dailyReportId: dailyReport.id,
            machineryId: mach.id,
            description: eqDesc,
            unit,
            quantity,
            dayHours,
          },
        });
      }

      // Personnel
      const persRole = row[6] ? String(row[6]).trim() : '';
      if (persRole && persRole !== 'Categoría / Cargo') {
        const quantity = Math.round(parseNum(row[10], 1));
        const manHoursDay = parseNum(row[11], 10);
        await prisma.dailyReportPersonnel.create({
          data: {
            dailyReportId: dailyReport.id,
            categoryRole: persRole,
            quantity,
            manHoursDay,
            totalManHours: quantity * manHoursDay,
          },
        });
      }
    }

    // Rubros ejecutados (rows 29 a 37)
    for (let r = 29; r <= 37; r++) {
      const row = d[r];
      if (!row || typeof row[0] !== 'number') continue;
      const rubroNum = row[0];
      const rubroId = valleRubrosMap.get(rubroNum);
      if (rubroId) {
        const dayQty = parseNum(row[6]);
        const accumQty = parseNum(row[7]);
        const dayAmt = parseNum(row[8]);
        const accumAmt = parseNum(row[10]);

        await prisma.dailyRubroExecution.create({
          data: {
            dailyReportId: dailyReport.id,
            projectRubroId: rubroId,
            dayQuantity: dayQty,
            accumQuantity: accumQty,
            dayAmount: dayAmt,
            accumAmount: accumAmt,
          },
        });
      }
    }

    // Franjas horarias (rows 83-84)
    const slots = ['0-6', '6-8', '8-10', '10-12', '12-14', '14-16', '16-18', '18-24'];
    for (let sIdx = 0; sIdx < slots.length; sIdx++) {
      const codeVal = parseNum(d[84]?.[4 + sIdx], 1);
      await prisma.dailyHourlyWeather.create({
        data: {
          dailyReportId: dailyReport.id,
          timeSlot: slots[sIdx],
          conditionCode: codeVal,
        },
      });
    }

    console.log(`   ✓ Reporte N° 25 (RDO) importado correctamente.`);
  }

  // =================================================================
  // 5. RESUMEN FINAL
  // =================================================================
  const totalProjects = await prisma.project.count();
  const totalRubros = await prisma.projectRubro.count();
  const totalReports = await prisma.dailyReport.count();
  const totalMach = await prisma.machinery.count();

  console.log('\n================================================================');
  console.log('✓ IMPORTACIÓN COMPLETADA CON ÉXITO');
  console.log(`  - Proyectos creados: ${totalProjects}`);
  console.log(`  - Rubros contractuales totales: ${totalRubros}`);
  console.log(`  - Reportes Diarios generados: ${totalReports}`);
  console.log(`  - Maquinarias registradas: ${totalMach}`);
  console.log('================================================================');
}

main()
  .catch((e) => {
    console.error('Error durante la importación:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
