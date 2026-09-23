import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando precarga de datos (Seed) de Obra Vial LICOSA ---');

  // Limpiar datos previos si existen
  await prisma.userProjectAssignment.deleteMany();
  await prisma.user.deleteMany();
  await prisma.dailyHourlyWeather.deleteMany();
  await prisma.dailyRubroExecution.deleteMany();
  await prisma.dailyReportPersonnel.deleteMany();
  await prisma.dailyReportMachinery.deleteMany();
  await prisma.dailyReport.deleteMany();
  await prisma.storageMovement.deleteMany();
  await prisma.storageReceipt.deleteMany();
  await prisma.materialItem.deleteMany();
  await prisma.machinery.deleteMany();
  await prisma.rubroAdjustment.deleteMany();
  await prisma.projectRubro.deleteMany();
  await prisma.project.deleteMany();


  // 1. Proyecto Oficial 1 (Consorcio Valle de la Virgen / LICOSA)
  const project1 = await prisma.project.create({
    data: {
      code: 'OBRA-VALLE-VIRGEN-01',
      name: 'Rehabilitación de la vía Valle de la Virgen – Lím. Provincial y Lím. Provincial – Las Muras – Lím. Provincial, Cantones Pedro Carbo y Colimes – Provincia del Guayas',
      contractor: 'CONSORCIO VALLE DE LA VIRGEN',
      client: 'GAD PROVINCIAL DEL GUAYAS (PREFECTURA DEL GUAYAS)',
      inspectionCompany: 'ASOCIACION C-D',
      executingCompany: 'LICOSA',
      contractNumber: 'EC-PREFGUAYAS-527225-CW-RFB',
      financingSource: 'BIRF 9722-EC (Banco Mundial)',
      roadSection: 'Valle de la Virgen – Las Muras',
      contractAmount: 5939620.30,
      durationDays: 240,
      startDate: new Date('2026-08-28'),
      status: 'EN_EJECUCION',
    },
  });

  console.log('✔ Proyecto 1 creado:', project1.name);

  // 2. Proyecto Oficial 2 (Vía Colimes - Olmedo)
  const project2 = await prisma.project.create({
    data: {
      code: 'OBRA-COLIMES-02',
      name: 'Mantenimiento Periódico y Asfaltado de la Vía Colimes – Olmedo, Cantón Colimes – Provincia del Guayas',
      contractor: 'CONSORCIO VIAL GUAYAS NORTE',
      client: 'GAD PROVINCIAL DEL GUAYAS (PREFECTURA DEL GUAYAS)',
      inspectionCompany: 'CONSULTORA GUAYAS ASOCIADOS',
      executingCompany: 'LICOSA (Frente Colimes)',
      contractNumber: 'EC-PREFGUAYAS-441209-CW-LPN',
      financingSource: 'Fondos Fiscales GAD Guayas',
      roadSection: 'Colimes - Olmedo (Km 0+000 al Km 18+500)',
      contractAmount: 2450000.00,
      durationDays: 180,
      startDate: new Date('2026-09-01'),
      status: 'EN_EJECUCION',
    },
  });

  console.log('✔ Proyecto 2 creado:', project2.name);

  // Rubros Proyecto 1 — Rehabilitación Vial Valle de la Virgen
  const rubrosP1 = [
    { rubroNumber: 1, description: 'REPLANTEO Y NIVELACIÓN CON EQUIPO TOPOGRÁFICO', unit: 'km', unitPrice: 348.25, initialQuantity: 24.5, isPrincipal: false },
    { rubroNumber: 2, description: 'EXCAVACIÓN DE LA PLATAFORMA DEL CAMINO', unit: 'm3', unitPrice: 4.15, initialQuantity: 35000, isPrincipal: true },
    { rubroNumber: 3, description: 'DESBROCE, DESRAIGUE Y LIMPIEZA DE LA FAJA DE LA VÍA', unit: 'ha', unitPrice: 2156.92, initialQuantity: 3.38, isPrincipal: false },
    { rubroNumber: 4, description: 'DESALOJO DE MATERIAL SOBRANTE', unit: 'm3', unitPrice: 3.80, initialQuantity: 42000, isPrincipal: true },
    { rubroNumber: 5, description: 'REMOCIÓN DE DERRUMBES', unit: 'm3', unitPrice: 4.62, initialQuantity: 8000, isPrincipal: false },
    { rubroNumber: 6, description: 'EXCAVACIÓN PARA CUNETAS Y ENCAUZAMIENTOS', unit: 'm3', unitPrice: 5.75, initialQuantity: 6500, isPrincipal: false },
    { rubroNumber: 7, description: 'EXCAVACIÓN PARA ESTRUCTURAS', unit: 'm3', unitPrice: 7.20, initialQuantity: 4200, isPrincipal: true },
    { rubroNumber: 8, description: 'MATERIAL DE PRESTAMO IMPORTADO (*)', unit: 'm3', unitPrice: 5.28, initialQuantity: 110000, isPrincipal: true },
    { rubroNumber: 9, description: 'TRANSPORTE DE MATERIAL DE PRESTAMO IMPORTADO, LONGITUD DE ACARREO DE 30-65 KM', unit: 'm3-km', unitPrice: 0.25, initialQuantity: 5225000, isPrincipal: true },
    { rubroNumber: 10, description: 'RELLENO COMPACTADO CON MATERIAL DE PRÉSTAMO LOCAL', unit: 'm3', unitPrice: 4.90, initialQuantity: 22000, isPrincipal: true },
    { rubroNumber: 11, description: 'CAPA DE RODADURA (MATERIAL GRANULAR e=15CM)', unit: 'm3', unitPrice: 12.35, initialQuantity: 18000, isPrincipal: true },
    { rubroNumber: 12, description: 'SUB-BASE CLASE II', unit: 'm3', unitPrice: 18.62, initialQuantity: 14000, isPrincipal: true },
    { rubroNumber: 13, description: 'BASE CLASE II', unit: 'm3', unitPrice: 22.45, initialQuantity: 10500, isPrincipal: true },
    { rubroNumber: 14, description: 'IMPRIMACIÓN ASFÁLTICA CON ASFALTO LÍQUIDO RC-250', unit: 'm2', unitPrice: 1.85, initialQuantity: 145000, isPrincipal: true },
    { rubroNumber: 15, description: 'CARPETA DE HORMIGÓN ASFÁLTICO EN CALIENTE e=5CM', unit: 'm2', unitPrice: 14.80, initialQuantity: 145000, isPrincipal: true },
    { rubroNumber: 16, description: 'RIEGO DE ADHERENCIA CON EMULSIÓN CSS-1H', unit: 'm2', unitPrice: 0.95, initialQuantity: 145000, isPrincipal: false },
    { rubroNumber: 20, description: 'HORMIGÓN SIMPLE f\'c=180 kg/cm2 EN CUNETAS', unit: 'm3', unitPrice: 195.40, initialQuantity: 850, isPrincipal: true },
    { rubroNumber: 21, description: 'HORMIGÓN SIMPLE f\'c=210 kg/cm2 EN CABEZALES DE ALCANTARILLA', unit: 'm3', unitPrice: 225.80, initialQuantity: 320, isPrincipal: true },
    { rubroNumber: 22, description: 'HORMIGÓN CICLÓPEO f\'c=180 kg/cm2 (60% H.S. + 40% PIEDRA)', unit: 'm3', unitPrice: 145.60, initialQuantity: 600, isPrincipal: true },
    { rubroNumber: 25, description: 'ACERO DE REFUERZO fy=4200 kg/cm2', unit: 'kg', unitPrice: 2.15, initialQuantity: 35000, isPrincipal: true },
    { rubroNumber: 27, description: 'TUBERÍA DE ACERO CORRUGADO DE 1200MM', unit: 'm', unitPrice: 385.00, initialQuantity: 280, isPrincipal: true },
    { rubroNumber: 28, description: 'SUMINISTRO E INSTALACIÓN DE TUBERIA H.A. 36\" (INC./JUNTA NEOPRENO)', unit: 'm', unitPrice: 320.50, initialQuantity: 150, isPrincipal: true },
    { rubroNumber: 29, description: 'SUMINISTRO E INSTALACIÓN DE TUBERIA H.A. 48\" (INC./JUNTA NEOPRENO Y TRANSPORTE)', unit: 'm', unitPrice: 424.64, initialQuantity: 350, isPrincipal: true },
    { rubroNumber: 30, description: 'GEOTEXTIL PARA DRENAJE', unit: 'm2', unitPrice: 3.45, initialQuantity: 8500, isPrincipal: false },
    { rubroNumber: 35, description: 'GAVIONES TIPO CAJA (2.0x1.0x1.0m)', unit: 'm3', unitPrice: 72.30, initialQuantity: 2800, isPrincipal: true },
    { rubroNumber: 40, description: 'SEÑALIZACIÓN HORIZONTAL (PINTURA REFLECTIVA)', unit: 'm', unitPrice: 1.35, initialQuantity: 48000, isPrincipal: false },
    { rubroNumber: 41, description: 'SEÑALIZACIÓN VERTICAL (PREVENTIVAS Y REGLAMENTARIAS)', unit: 'u', unitPrice: 185.00, initialQuantity: 120, isPrincipal: false },
    { rubroNumber: 42, description: 'GUARDAVÍAS METÁLICAS', unit: 'm', unitPrice: 62.50, initialQuantity: 3200, isPrincipal: true },
    { rubroNumber: 50, description: 'ENCESPADO DE TALUDES', unit: 'm2', unitPrice: 4.80, initialQuantity: 15000, isPrincipal: false },
    { rubroNumber: 55, description: 'CHARLA DE SEGURIDAD Y SALUD OCUPACIONAL', unit: 'u', unitPrice: 25.00, initialQuantity: 300, isPrincipal: false },
    { rubroNumber: 60, description: 'PLAN DE MANEJO AMBIENTAL', unit: 'global', unitPrice: 45000.00, initialQuantity: 1, isPrincipal: false },
    { rubroNumber: 163, description: 'Agua para control de polvo', unit: 'm3', unitPrice: 2.49, initialQuantity: 12000, isPrincipal: true },
  ];

  const createdRubrosP1: Record<number, string> = {};
  for (const r of rubrosP1) {
    const created = await prisma.projectRubro.create({
      data: { projectId: project1.id, ...r, currentQuantity: r.initialQuantity },
    });
    createdRubrosP1[r.rubroNumber] = created.id;
  }

  const r8 = { id: createdRubrosP1[8] };
  const r9 = { id: createdRubrosP1[9] };
  const r29 = { id: createdRubrosP1[29] };
  const r163 = { id: createdRubrosP1[163] };

  console.log(`✔ ${rubrosP1.length} rubros creados para Proyecto 1`);

  // Rubros Proyecto 2 — Mantenimiento Periódico Colimes-Olmedo
  const rubrosP2 = [
    { rubroNumber: 1, description: 'REPLANTEO Y NIVELACIÓN', unit: 'km', unitPrice: 295.00, initialQuantity: 18.0, isPrincipal: false },
    { rubroNumber: 2, description: 'FRESADO DE PAVIMENTO EXISTENTE e=5CM', unit: 'm2', unitPrice: 3.20, initialQuantity: 95000, isPrincipal: true },
    { rubroNumber: 3, description: 'LIMPIEZA DE CUNETAS EXISTENTES', unit: 'm', unitPrice: 1.85, initialQuantity: 36000, isPrincipal: false },
    { rubroNumber: 5, description: 'BACHEO ASFÁLTICO PROFUNDO', unit: 'm3', unitPrice: 145.00, initialQuantity: 1200, isPrincipal: true },
    { rubroNumber: 7, description: 'SELLO DE FISURAS CON EMULSIÓN MODIFICADA', unit: 'm', unitPrice: 4.50, initialQuantity: 8500, isPrincipal: false },
    { rubroNumber: 8, description: 'BASE CLASE II', unit: 'm3', unitPrice: 22.45, initialQuantity: 5000, isPrincipal: true },
    { rubroNumber: 10, description: 'IMPRIMACIÓN ASFÁLTICA CON ASFALTO LÍQUIDO RC-250', unit: 'm2', unitPrice: 2.15, initialQuantity: 85000, isPrincipal: true },
    { rubroNumber: 12, description: 'RIEGO DE ADHERENCIA CON EMULSIÓN CSS-1H', unit: 'm2', unitPrice: 0.95, initialQuantity: 85000, isPrincipal: false },
    { rubroNumber: 15, description: 'CARPETA DE HORMIGÓN ASFÁLTICO EN CALIENTE DE 5 CM', unit: 'm2', unitPrice: 14.80, initialQuantity: 85000, isPrincipal: true },
    { rubroNumber: 18, description: 'HORMIGÓN SIMPLE f\'c=210 kg/cm2 EN CABEZALES', unit: 'm3', unitPrice: 225.80, initialQuantity: 120, isPrincipal: true },
    { rubroNumber: 20, description: 'LIMPIEZA Y REPARACIÓN DE ALCANTARILLAS EXISTENTES', unit: 'u', unitPrice: 450.00, initialQuantity: 45, isPrincipal: false },
    { rubroNumber: 22, description: 'SEÑALIZACIÓN HORIZONTAL (PINTURA REFLECTIVA)', unit: 'm', unitPrice: 1.35, initialQuantity: 36000, isPrincipal: false },
    { rubroNumber: 23, description: 'SEÑALIZACIÓN VERTICAL (PREVENTIVAS Y REGLAMENTARIAS)', unit: 'u', unitPrice: 185.00, initialQuantity: 80, isPrincipal: false },
    { rubroNumber: 25, description: 'GUARDAVÍAS METÁLICAS', unit: 'm', unitPrice: 62.50, initialQuantity: 1200, isPrincipal: true },
    { rubroNumber: 30, description: 'PLAN DE MANEJO AMBIENTAL', unit: 'global', unitPrice: 28000.00, initialQuantity: 1, isPrincipal: false },
  ];

  const createdRubrosP2: Record<number, string> = {};
  for (const r of rubrosP2) {
    const created = await prisma.projectRubro.create({
      data: { projectId: project2.id, ...r, currentQuantity: r.initialQuantity },
    });
    createdRubrosP2[r.rubroNumber] = created.id;
  }

  const r2_1 = { id: createdRubrosP2[10] };
  const r2_2 = { id: createdRubrosP2[15] };

  console.log(`✔ ${rubrosP2.length} rubros creados para Proyecto 2`);


  // 3. Catálogo de Maquinaria y Equipos
  const machines = [
    { code: 'EX09', name: 'EXCAVADORA EX09', category: 'Excavadora', unit: 'hora', totalHoursWorked: 230.4 },
    { code: 'TR-08', name: 'TRACTOR TR-08', category: 'Tractor', unit: 'hora', totalHoursWorked: 185.0 },
    { code: 'TRACTOMULAS', name: 'TRACTOMULAS (FLOTA)', category: 'Tractomula', unit: 'Unidad', totalHoursWorked: 0 },
    { code: 'MULA', name: 'MULA (FLOTA)', category: 'Mula', unit: 'Unidad', totalHoursWorked: 0 },
    { code: 'RL-16', name: 'RODILLO RL-16', category: 'Rodillo', unit: 'hora', totalHoursWorked: 142.8 },
    { code: 'EX15', name: 'EXCAVADORA - EX15', category: 'Excavadora', unit: 'hora', totalHoursWorked: 98.6 },
    { code: 'TQ-02', name: 'CHOFER DE TANQUERO (EQUIPO TANQUERO)', category: 'Tanquero', unit: 'hora', totalHoursWorked: 110.0 },
    { code: 'FINI-01', name: 'FINISHADORA DE ASFALTO CAT AP655', category: 'Pavimentadora', unit: 'hora', totalHoursWorked: 64.0 },
  ];

  for (const m of machines) {
    await prisma.machinery.create({ data: m });
  }

  // 4. Catálogo de Materiales en BODEGA DE LA OBRA 1 (Valle de la Virgen)
  const matTub = await prisma.materialItem.create({
    data: {
      projectId: project1.id,
      code: 'TUB-HA-48',
      name: 'Tubería de Hormigón Armado H.A. 48" con Junta Neopreno',
      category: 'Tuberías y Alcantarillas',
      unit: 'm',
      minStock: 25,
      currentStock: 197.5,
      location: 'Campamento Central Pedro Carbo - Patio A',
    },
  });

  const matPrestamo = await prisma.materialItem.create({
    data: {
      projectId: project1.id,
      code: 'MAT-PREST-GRAN',
      name: 'Material de Préstamo Importado Cantera La Cabuya',
      category: 'Áridos y Granulares',
      unit: 'm3',
      minStock: 3000,
      currentStock: 26355,
      location: 'Acopio Km 12 - Frente 1',
    },
  });

  const matDiesel1 = await prisma.materialItem.create({
    data: {
      projectId: project1.id,
      code: 'COMB-DIESEL-P1',
      name: 'Combustible Diésel Automotriz (Frente Valle de la Virgen)',
      category: 'Combustibles y Lubricantes',
      unit: 'gal',
      minStock: 1000,
      currentStock: 4250,
      location: 'Cisterna Móvil Tanquero TQ-02',
    },
  });

  const matPolvo = await prisma.materialItem.create({
    data: {
      projectId: project1.id,
      code: 'INS-AGUA-POLVO',
      name: 'Agua para Riego y Mitigación de Polvo',
      category: 'Insumos Ambientales',
      unit: 'm3',
      minStock: 100,
      currentStock: 654.8,
      location: 'Toma Autorizada Río Puca',
    },
  });

  const matCemento = await prisma.materialItem.create({
    data: {
      projectId: project1.id,
      code: 'CEM-TIPO-HE',
      name: 'Cemento Hidráulico de Alta Resistencia Temprana (HE)',
      category: 'Conglomerantes',
      unit: 'fundas',
      minStock: 100,
      currentStock: 450,
      location: 'Bodega Techada Pedro Carbo',
    },
  });

  // 4b. Catálogo de Materiales en BODEGA DE LA OBRA 2 (Colimes - Olmedo)
  const matAsfalto = await prisma.materialItem.create({
    data: {
      projectId: project2.id,
      code: 'ASF-RC-250',
      name: 'Asfalto Líquido de Curado Rápido RC-250 para Imprimación',
      category: 'Asfaltos y Emulsiones',
      unit: 'gal',
      minStock: 2000,
      currentStock: 6800,
      location: 'Planta de Asfalto LICOSA - Frente Colimes',
    },
  });

  const matAgregado = await prisma.materialItem.create({
    data: {
      projectId: project2.id,
      code: 'AGR-TRIT-34',
      name: 'Agregado Pétreo Triturado 3/4" para Mezcla Asfáltica',
      category: 'Áridos y Granulares',
      unit: 'm3',
      minStock: 500,
      currentStock: 1850,
      location: 'Silos de Dosificación Colimes',
    },
  });

  console.log('✔ Bodegas creadas individualmente por obra');

  // 5. Comprobantes de compra / recepción de bodega - OBRA 1
  const receipt1 = await prisma.storageReceipt.create({
    data: {
      projectId: project1.id,
      receiptNumber: 'FAC-001-09843',
      supplier: 'PREFABRICADOS VIALES DEL ECUADOR S.A.',
      entryDateTime: new Date('2026-09-17T09:45:00'),
      receivedBy: 'Segundo Plúa (Bodeguero / Recibidor)',
      invoiceTotal: 84928.00,
      notes: 'Recepción de 200 metros lineales de Tubería H.A. 48" con certificado de rotura y juntas de neopreno.',
    },
  });

  await prisma.storageMovement.create({
    data: {
      materialItemId: matTub.id,
      type: 'ENTRY',
      quantity: 200,
      unitCost: 424.64,
      receiptId: receipt1.id,
      projectId: project1.id,
      targetWorkFront: 'Bodega General Pedro Carbo',
      timestamp: new Date('2026-09-17T09:45:00'),
      authorizedBy: 'Ing. Jerson López',
      notes: 'Lote de tuberías para obras de arte y cruces transversales',
    },
  });

  await prisma.storageMovement.create({
    data: {
      materialItemId: matTub.id,
      type: 'EXIT',
      quantity: 7.5,
      projectId: project1.id,
      targetWorkFront: 'Tramo 2 - Instalación de Alcantarilla 1200 mm',
      departureDateTime: new Date('2026-09-21T07:20:00'),
      dispatchedTo: 'Manuel Castro (Operador Excavadora EX15)',
      authorizedBy: 'Ing. Jerson López (Residente de Obra)',
      notes: 'Tuberías despachadas para colocación según reporte diario N° 024',
    },
  });

  // Comprobante de compra - OBRA 2
  const receipt2 = await prisma.storageReceipt.create({
    data: {
      projectId: project2.id,
      receiptNumber: 'FAC-EPPETRO-87612',
      supplier: 'EP PETROECUADOR - REFINERÍA LA LIBERTAD',
      entryDateTime: new Date('2026-09-19T11:30:00'),
      receivedBy: 'Carlos Mendoza (Bodeguero Colimes)',
      invoiceTotal: 17680.00,
      notes: 'Despacho de autotanque cisterna con asfalto RC-250 para imprimación',
    },
  });

  await prisma.storageMovement.create({
    data: {
      materialItemId: matAsfalto.id,
      type: 'ENTRY',
      quantity: 7000,
      unitCost: 2.52,
      receiptId: receipt2.id,
      projectId: project2.id,
      targetWorkFront: 'Tanque Térmico Colimes',
      timestamp: new Date('2026-09-19T11:30:00'),
      authorizedBy: 'Ing. Roberto Alvear (Residente Colimes)',
      notes: 'Recepción directa en cisterna térmica',
    },
  });

  // 6. Reporte Diario de Obra N° 024 (Proyecto 1 - Valle de la Virgen)
  const report24 = await prisma.dailyReport.create({
    data: {
      projectId: project1.id,
      reportNumber: 24,
      date: new Date('2026-09-21T12:00:00'),
      roadSection: 'Tramo 2: Valle de la Virgen - Las Muras',
      elapsedDays: 24,
      totalDays: 240,
      
      // Montos económicos exactos
      totalExecutedDay: 21388.51,
      totalExecutedAccum: 660032.12,
      principalExecutedDay: 21388.51,
      principalExecutedAccum: 470312.24,
      nonPrincipalExecutedDay: 0.00,
      nonPrincipalExecutedAccum: 189719.88,
      progressPercentAccum: 11.11,

      // 1. Clima y EHS
      rainHoursDay: 0,
      rainHoursNight: 0,
      lostRainHoursDay: 0,
      lostRainHoursAccum: 4,
      safetyTalkMinutesDay: 5,
      safetyTalkMinutesAccum: 105,
      incidentsDay: 0,
      incidentsAccum: 0,
      accidentsDay: 0,
      accidentsAccum: 0,

      // 6. Resumen de Actividades Realizadas Hoy
      activitiesTodayVial: 'EXCAVACION - DESALOJO\nRELLENO MATERIAL DE PRESTAMO IMPORTADO\nDESBROCE',
      activitiesTodayPavimento: '',
      activitiesTodayDrenaje: 'INSTALACION DE TUBERIA H.A 1200 -\nEXCAVACION Y RELLENO PARA ESTRUCTURAS',
      activitiesTodayPuentes: 'CONSTRUCCION DE ACCESO PROVISIONAL',
      activitiesTodayTopografia: 'Nivelación de plataforma y replanteo de alcantarillas',
      activitiesTodaySenalizacion: 'Mantenimiento de señalización preventiva y balizas diurnas',
      activitiesTodayAmbiental: 'AGUA PARA CONTROL DE POLVO',

      // 7. Actividades a Realizar Mañana
      activitiesTomorrowVial: 'Continuación de desbroce en frente norte y tendido de capa de subbase granular con rodillo RL-16.',
      activitiesTomorrowDrenaje: 'Sellado de juntas con neopreno y relleno compactado de cabezales.',
      activitiesTomorrowAmbiental: 'Riego con tanquero TQ-02 en zonas pobladas de Pedro Carbo.',

      // 8. Novedades / Paralizaciones / Riesgos
      noveltiesRisks: 
        'EX 09: CANTERA LA CABUYA PRODUCCIÓN Y CARGADA DE VOLQUETA\n' +
        'EX 15: INSTALACION DE TUBERIA H.A 1200 MM - EXCAVACION Y RELLENO PARA ESTRUCTURAS\n' +
        'TRACT 08 : DESBROCE EN TRAMO 2\n' +
        'RL 16: COMPACTACION DE 1ERA Y 2DA CAPA DE MATERIAL DE PRESTAMO IMPORTADO\n' +
        'RE-06: DAÑO EN MANGUERA (En reparación preventiva por taller mecánico)\n' +
        'MT-03: ACABADO DE LA ÚLTIMA CAPA DE MEJORAMIENTO',

      // 9. Comentarios
      contractorComments: 'Se mantiene ritmo óptimo en acarreo de material desde Cantera La Cabuya. Se solicita a fiscalización la aprobación de niveles en abscisa 14+200.',
      supervisorComments: 'Se constata la correcta aplicación de riego de agua para control de polvo en frentes habitados.',

      // 11. Firmas
      preparedByName: 'Ing. María Fernanda Ligua',
      preparedByTitle: 'Ing. de Planillas',
      reviewedByName: 'Ing. Jerson López',
      reviewedByTitle: 'Residente de Obra',
    },
  });

  // Rubros ejecutados en el reporte 24
  await prisma.dailyRubroExecution.createMany({
    data: [
      {
        dailyReportId: report24.id,
        projectRubroId: r8.id,
        dayQuantity: 893.07,
        accumQuantity: 23644.94,
        dayAmount: 4715.41,
        accumAmount: 124845.28,
      },
      {
        dailyReportId: report24.id,
        projectRubroId: r9.id,
        dayQuantity: 41974.29,
        accumQuantity: 874530.81,
        dayAmount: 13431.77,
        accumAmount: 279849.86,
      },
      {
        dailyReportId: report24.id,
        projectRubroId: r29.id,
        dayQuantity: 7.50,
        accumQuantity: 152.50,
        dayAmount: 3184.80,
        accumAmount: 64757.60,
      },
      {
        dailyReportId: report24.id,
        projectRubroId: r163.id,
        dayQuantity: 22.70,
        accumQuantity: 345.18,
        dayAmount: 56.52,
        accumAmount: 859.50,
      },
    ],
  });

  // Equipos reportados en el día
  await prisma.dailyReportMachinery.createMany({
    data: [
      { dailyReportId: report24.id, description: 'EXCAVADORA EX09', unit: 'hora', quantity: 1, dayHours: 9.6, notes: 'Cantera La Cabuya producción y carga' },
      { dailyReportId: report24.id, description: 'TRACTOR TR-08', unit: 'hora', quantity: 1, dayHours: 1.6, notes: 'Desbroce en tramo 2' },
      { dailyReportId: report24.id, description: 'TRACTOMULAS', unit: 'Unidad', quantity: 11, dayHours: 0, notes: 'Transporte de préstamo' },
      { dailyReportId: report24.id, description: 'MULA', unit: 'Unidad', quantity: 3, dayHours: 0, notes: 'Acarreo general' },
      { dailyReportId: report24.id, description: 'RL-16', unit: 'hora', quantity: 1, dayHours: 3.4, notes: 'Compactación 1era y 2da capa' },
      { dailyReportId: report24.id, description: 'EXCAVADORA - EX15', unit: 'hora', quantity: 1, dayHours: 2.4, notes: 'Instalación tubería H.A. 1200 mm' },
    ],
  });

  // Personal reportado en el día
  await prisma.dailyReportPersonnel.createMany({
    data: [
      { dailyReportId: report24.id, categoryRole: 'Ingeniero Residente', quantity: 1, manHoursDay: 10, totalManHours: 10 },
      { dailyReportId: report24.id, categoryRole: 'Planilladora', quantity: 1, manHoursDay: 8, totalManHours: 8 },
      { dailyReportId: report24.id, categoryRole: 'Ayudante de Obra - Recibidor', quantity: 1, manHoursDay: 10, totalManHours: 10 },
      { dailyReportId: report24.id, categoryRole: 'Operador Tractor', quantity: 1, manHoursDay: 10, totalManHours: 10 },
      { dailyReportId: report24.id, categoryRole: 'Operador Excavadora', quantity: 2, manHoursDay: 10, totalManHours: 20 },
      { dailyReportId: report24.id, categoryRole: 'Chofer Volqueta', quantity: 14, manHoursDay: 10, totalManHours: 140 },
      { dailyReportId: report24.id, categoryRole: 'Topógrafo', quantity: 1, manHoursDay: 10, totalManHours: 10 },
      { dailyReportId: report24.id, categoryRole: 'Cadeneros', quantity: 1, manHoursDay: 10, totalManHours: 10 },
      { dailyReportId: report24.id, categoryRole: 'Operador Rodillo', quantity: 1, manHoursDay: 10, totalManHours: 10 },
      { dailyReportId: report24.id, categoryRole: 'Chofer de tanquero', quantity: 1, manHoursDay: 10, totalManHours: 10 },
      { dailyReportId: report24.id, categoryRole: 'Ambiental', quantity: 1, manHoursDay: 8, totalManHours: 8 },
    ],
  });

  // Clima horario Proyecto 1
  const timeSlots = ['0-6', '6-8', '8-10', '10-12', '12-14', '14-16', '16-18', '18-24'];
  for (const slot of timeSlots) {
    await prisma.dailyHourlyWeather.create({
      data: {
        dailyReportId: report24.id,
        timeSlot: slot,
        conditionCode: 1,
      },
    });
  }

  // 7. Reporte Diario N° 005 para Proyecto 2 (Vía Colimes - Olmedo)
  const reportColimes5 = await prisma.dailyReport.create({
    data: {
      projectId: project2.id,
      reportNumber: 5,
      date: new Date('2026-09-22T12:00:00'),
      roadSection: 'Abscisa 03+400 al 05+800',
      elapsedDays: 22,
      totalDays: 180,
      totalExecutedDay: 12540.00,
      totalExecutedAccum: 184500.00,
      principalExecutedDay: 12540.00,
      principalExecutedAccum: 184500.00,
      nonPrincipalExecutedDay: 0.00,
      nonPrincipalExecutedAccum: 0.00,
      progressPercentAccum: 7.53,
      rainHoursDay: 0,
      rainHoursNight: 0,
      lostRainHoursDay: 0,
      lostRainHoursAccum: 0,
      safetyTalkMinutesDay: 5,
      safetyTalkMinutesAccum: 30,
      incidentsDay: 0,
      incidentsAccum: 0,
      accidentsDay: 0,
      accidentsAccum: 0,
      activitiesTodayVial: 'BARRIDO Y LIMPIEZA DE SUPERFICIE DE BASE\nAPLICACIÓN DE RIEGO DE IMPRIMACIÓN ASFÁLTICA RC-250',
      activitiesTomorrowVial: 'CURADO DE IMPRIMACIÓN Y COLOCACIÓN DE PRIMERA CAPA DE MEZCLA EN CALIENTE',
      noveltiesRisks: 'SIN NOVEDADES. CLIMA FAVORABLE Y TRÁFICO CONTROLADO.',
      contractorComments: 'Se finalizó imprimación en 5,800 m2 con tasa de 1.1 lt/m2.',
      supervisorComments: 'Verificación de tasa de aplicación aprobada.',
      preparedByName: 'Ing. Carlos Mendoza',
      preparedByTitle: 'Ing. de Planillas Colimes',
      reviewedByName: 'Ing. Roberto Alvear',
      reviewedByTitle: 'Residente de Obra Colimes',
    },
  });

  await prisma.dailyRubroExecution.create({
    data: {
      dailyReportId: reportColimes5.id,
      projectRubroId: r2_1.id,
      dayQuantity: 5832.55,
      accumQuantity: 28400.00,
      dayAmount: 12540.00,
      accumAmount: 61060.00,
    },
  });

  console.log('✔ Reporte Diario de Colimes (Proyecto 2) precargado');

  // 8. Usuarios del Sistema con Roles y Asignaciones por Obra
  const bcrypt = await import('bcryptjs');
  const adminPass = await bcrypt.hash('admin123', 10);
  const residentePass = await bcrypt.hash('residente123', 10);
  const bodegaPass = await bcrypt.hash('bodega123', 10);

  // a. Administrador General (Acceso a todo)
  const userAdmin = await prisma.user.create({
    data: {
      email: 'admin@licosa.com',
      name: 'Ing. Fernando Salazar (Administrador)',
      passwordHash: adminPass,
      role: 'ADMIN',
      title: 'Director de Operaciones Viales',
    },
  });

  // b. Residente de Obra (Asignado solo a Valle de la Virgen)
  const userResidente = await prisma.user.create({
    data: {
      email: 'residente.valle@licosa.com',
      name: 'Ing. Jerson López',
      passwordHash: residentePass,
      role: 'RESIDENTE_OBRA',
      title: 'Residente de Obra Valle de la Virgen',
      assignments: {
        create: {
          projectId: project1.id,
          roleInProject: 'RESIDENTE_OBRA',
        },
      },
    },
  });

  // c. Bodeguero 1 (Asignado a Bodega Valle de la Virgen)
  const userBodegaValle = await prisma.user.create({
    data: {
      email: 'bodega.valle@licosa.com',
      name: 'Segundo Plúa',
      passwordHash: bodegaPass,
      role: 'BODEGUERO',
      title: 'Encargado de Bodega Pedro Carbo',
      assignments: {
        create: {
          projectId: project1.id,
          roleInProject: 'BODEGUERO',
        },
      },
    },
  });

  // d. Bodeguero 2 (Asignado a Bodega Colimes)
  const userBodegaColimes = await prisma.user.create({
    data: {
      email: 'bodega.colimes@licosa.com',
      name: 'Carlos Mendoza',
      passwordHash: bodegaPass,
      role: 'BODEGUERO',
      title: 'Encargado de Bodega Colimes',
      assignments: {
        create: {
          projectId: project2.id,
          roleInProject: 'BODEGUERO',
        },
      },
    },
  });

  // e. Usuario Híbrido Multirrol (Bodeguero en Valle de la Virgen, Residente en Colimes)
  const userMixto = await prisma.user.create({
    data: {
      email: 'roberto.mixto@licosa.com',
      name: 'Ing. Roberto Alarcón',
      passwordHash: await bcrypt.hash('mixto123', 10),
      role: 'ESTANDAR',
      title: 'Ingeniero & Coordinador Logístico',
      assignments: {
        create: [
          {
            projectId: project1.id,
            roleInProject: 'BODEGUERO',
          },
          {
            projectId: project2.id,
            roleInProject: 'RESIDENTE_OBRA',
          },
        ],
      },
    },
  });

  console.log('✔ Usuarios con roles y asignaciones por obra creados con éxito');
  console.log('--- Proceso de Seed completado con éxito ---');

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
