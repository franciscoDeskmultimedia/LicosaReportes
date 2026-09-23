import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('  LICOSA - ENCERANDO BASE DE DATOS Y GENERANDO SUPER DEMO REAL');
  console.log('================================================================');

  // 1. LIMPIEZA TOTAL EN CASCADA
  console.log('1. Purgando registros existentes...');
  await prisma.auditLog.deleteMany();
  await prisma.workRequest.deleteMany();
  await prisma.workerAssignment.deleteMany();
  await prisma.worker.deleteMany();
  await prisma.projectContractorAssignment.deleteMany();
  await prisma.contractor.deleteMany();
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
  console.log('✔ Base de datos encerada a cero.');

  // 2. CREACIÓN DE USUARIOS DEL SISTEMA
  console.log('\n2. Creando usuarios y roles...');
  const passwordHash = await bcrypt.hash('admin123', 10);
  const passwordUser = await bcrypt.hash('licosa2026', 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@licosa.com',
      name: 'Ing. Fernando Salazar (Administrador General)',
      passwordHash,
      role: 'ADMIN',
      title: 'Gerente de Proyectos & Fiscalización',
      active: true,
    },
  });

  const resident1 = await prisma.user.create({
    data: {
      email: 'residente.valle@licosa.com',
      name: 'Ing. Carlos Mendoza (Residente Valle de la Virgen)',
      passwordHash: passwordUser,
      role: 'RESIDENTE_OBRA',
      title: 'Ingeniero Residente Principal',
      active: true,
    },
  });

  const resident2 = await prisma.user.create({
    data: {
      email: 'residente.colimes@licosa.com',
      name: 'Ing. Elena Velasco (Residente Colimes & Salitre)',
      passwordHash: passwordUser,
      role: 'RESIDENTE_OBRA',
      title: 'Ingeniera Residente de Obra',
      active: true,
    },
  });

  const bodeguero = await prisma.user.create({
    data: {
      email: 'bodeguero@licosa.com',
      name: 'Sr. Víctor Hugo Quijije (Encargado Central de Bodegas)',
      passwordHash: passwordUser,
      role: 'BODEGUERO',
      title: 'Jefe de Almacén & Logística',
      active: true,
    },
  });

  const fiscalizador = await prisma.user.create({
    data: {
      email: 'fiscalizador@licosa.com',
      name: 'Ing. Gonzalo Morales (Fiscalizador GAD Guayas)',
      passwordHash: passwordUser,
      role: 'FISCALIZADOR',
      title: 'Fiscalizador Principal de Obra',
      active: true,
    },
  });

  console.log('✔ Usuarios registrados (Admin, Residentes, Bodeguero, Fiscalizador).');

  // 3. PROYECTOS VIALES PRINCIPALES
  console.log('\n3. Creando proyectos de obra vial...');
  
  // PROYECTO 1
  const project1 = await prisma.project.create({
    data: {
      code: 'OBRA-VALLE-VIRGEN-01',
      name: 'Rehabilitación y Asfaltado de la Vía Valle de la Virgen – Límite Provincial y Las Muras (24.5 Km)',
      contractor: 'CONSORCIO VALLE DE LA VIRGEN',
      client: 'GAD PROVINCIAL DEL GUAYAS (PREFECTURA DEL GUAYAS)',
      inspectionCompany: 'ASOCIACIÓN CONSULTORA C-D',
      executingCompany: 'LICOSA Construcciones S.A.',
      contractNumber: 'EC-PREFGUAYAS-527225-CW-RFB',
      financingSource: 'BIRF 9722-EC (Banco Mundial)',
      roadSection: 'Valle de la Virgen – San Rafael – Las Muras',
      contractAmount: 5939620.30,
      durationDays: 240,
      startDate: new Date('2026-08-01'),
      status: 'EN_EJECUCION',
    },
  });

  // PROYECTO 2
  const project2 = await prisma.project.create({
    data: {
      code: 'OBRA-COLIMES-02',
      name: 'Rectificación de Trazado, Rasante y Construcción de Nuevo Puente sobre el Río Colimes (18.2 Km)',
      contractor: 'CONSORCIO VIAL GUAYAS NORTE',
      client: 'GAD PROVINCIAL DEL GUAYAS (PREFECTURA DEL GUAYAS)',
      inspectionCompany: 'CONSULTORA GUAYAS ASOCIADOS',
      executingCompany: 'LICOSA (Frente Norte)',
      contractNumber: 'EC-PREFGUAYAS-441209-CW-LPN',
      financingSource: 'Fondos Fiscales GAD Guayas',
      roadSection: 'Colimes - Olmedo (Km 0+000 al Km 18+200)',
      contractAmount: 3840000.00,
      durationDays: 210,
      startDate: new Date('2026-08-15'),
      status: 'EN_EJECUCION',
    },
  });

  // PROYECTO 3
  const project3 = await prisma.project.create({
    data: {
      code: 'OBRA-SALITRE-03',
      name: 'Construcción de Paso Lateral y Accesos Viales a la Parroquia General Vernaza - Salitre (14.2 Km)',
      contractor: 'CONSTRUCTORA DEL PACIFICO S.A.',
      client: 'MINISTERIO DE TRANSPORTE Y OBRAS PÚBLICAS (MTOP)',
      inspectionCompany: 'GEOTÉCNICA & VIAL ECUADOR CÍA.',
      executingCompany: 'LICOSA (División Vial)',
      contractNumber: 'MTOP-CVP-2026-088',
      financingSource: 'Préstamo BID 4821/OC-EC',
      roadSection: 'Salitre – Gral. Vernaza – Bypass',
      contractAmount: 3420000.00,
      durationDays: 180,
      startDate: new Date('2026-09-01'),
      status: 'EN_EJECUCION',
    },
  });

  // PROYECTO 4
  const project4 = await prisma.project.create({
    data: {
      code: 'OBRA-DAULE-04',
      name: 'Mantenimiento Periódico, Bacheo Profundo y Microaglomerado en Frío Red Vial Daule – Nobol (16.0 Km)',
      contractor: 'CONSORCIO NOBOL-DAULE',
      client: 'GAD PROVINCIAL DEL GUAYAS',
      inspectionCompany: 'INSPECCIONES VIALES GUAYAS CIA.',
      executingCompany: 'LICOSA Mantenimientos',
      contractNumber: 'EC-PREFGUAYAS-772101-MP-04',
      financingSource: 'Presupuesto Operativo Provincial',
      roadSection: 'Daule - Los Lojas - Nobol',
      contractAmount: 1780000.00,
      durationDays: 120,
      startDate: new Date('2026-09-05'),
      status: 'EN_EJECUCION',
    },
  });

  console.log('✔ 4 Proyectos viales creados exitosamente.');

  // Asignar usuarios a proyectos
  await prisma.userProjectAssignment.createMany({
    data: [
      { userId: resident1.id, projectId: project1.id, roleInProject: 'RESIDENTE_OBRA' },
      { userId: resident1.id, projectId: project3.id, roleInProject: 'RESIDENTE_OBRA' },
      { userId: resident2.id, projectId: project2.id, roleInProject: 'RESIDENTE_OBRA' },
      { userId: resident2.id, projectId: project4.id, roleInProject: 'RESIDENTE_OBRA' },
      { userId: bodeguero.id, projectId: project1.id, roleInProject: 'BODEGUERO' },
      { userId: bodeguero.id, projectId: project2.id, roleInProject: 'BODEGUERO' },
      { userId: bodeguero.id, projectId: project3.id, roleInProject: 'BODEGUERO' },
      { userId: bodeguero.id, projectId: project4.id, roleInProject: 'BODEGUERO' },
      { userId: fiscalizador.id, projectId: project1.id, roleInProject: 'FISCALIZADOR' },
      { userId: fiscalizador.id, projectId: project2.id, roleInProject: 'FISCALIZADOR' },
    ],
  });

  // 4. RUBROS CONTRACTUALES
  console.log('\n4. Creando catálogo detallado de rubros por obra...');

  // Rubros Obra 1 (Valle de la Virgen)
  const rubrosP1Data = [
    { rubroNumber: 1, description: 'REPLANTEO Y NIVELACIÓN CON ESTACIÓN TOTAL', unit: 'km', unitPrice: 385.00, initialQuantity: 24.5, isPrincipal: false },
    { rubroNumber: 2, description: 'DESBROCE, LIMPIEZA Y DESRAIGUE EN ZONA DE CAMINO', unit: 'ha', unitPrice: 2200.00, initialQuantity: 5.5, isPrincipal: false },
    { rubroNumber: 3, description: 'EXCAVACIÓN DE LA PLATAFORMA DEL CAMINO EN SUELO COMÚN', unit: 'm3', unitPrice: 4.15, initialQuantity: 38000, isPrincipal: true },
    { rubroNumber: 4, description: 'DESALOJO DE MATERIAL INADECUADO A BOTADERO AUTORIZADO (D<=5KM)', unit: 'm3', unitPrice: 3.80, initialQuantity: 42000, isPrincipal: true },
    { rubroNumber: 5, description: 'MEJORAMIENTO DE SUBRASANTE CON SUELO SELECCIONADO (CBR > 15%)', unit: 'm3', unitPrice: 6.20, initialQuantity: 28000, isPrincipal: true },
    { rubroNumber: 6, description: 'SUB-BASE GRANULAR CLASE 3 (COMPACTADA AL 100% PROCTOR)', unit: 'm3', unitPrice: 18.50, initialQuantity: 16500, isPrincipal: true },
    { rubroNumber: 7, description: 'BASE GRANULAR CLASE 1 (CHANCADA 100%)', unit: 'm3', unitPrice: 23.40, initialQuantity: 12000, isPrincipal: true },
    { rubroNumber: 8, description: 'IMPRIMACIÓN ASFÁLTICA CON ASFALTO LÍQUIDO RC-250', unit: 'm2', unitPrice: 1.85, initialQuantity: 152000, isPrincipal: true },
    { rubroNumber: 9, description: 'CARPETA DE HORMIGÓN ASFÁLTICO EN CALIENTE e=7.5CM', unit: 'm2', unitPrice: 16.50, initialQuantity: 152000, isPrincipal: true },
    { rubroNumber: 10, description: 'ALCANTARILLAS METÁLICAS CORRUGADAS D=1200MM', unit: 'm', unitPrice: 380.00, initialQuantity: 320, isPrincipal: true },
    { rubroNumber: 11, description: 'HORMIGÓN SIMPLE f\'c=210 kg/cm2 EN CABEZALES Y ALEROS', unit: 'm3', unitPrice: 235.00, initialQuantity: 410, isPrincipal: true },
    { rubroNumber: 12, description: 'SEÑALIZACIÓN HORIZONTAL CON PINTURA TERMOPLÁSTICA Y MICROESFERAS', unit: 'm', unitPrice: 1.65, initialQuantity: 52000, isPrincipal: false },
    { rubroNumber: 13, description: 'SUMINISTRO E INSTALACIÓN DE TACHAS REFLECTIVAS BIDIRECCIONALES', unit: 'u', unitPrice: 12.50, initialQuantity: 2400, isPrincipal: false },
    { rubroNumber: 14, description: 'GUARDAVÍAS METÁLICAS DE ACERO GALVANIZADO TIPO W', unit: 'm', unitPrice: 65.00, initialQuantity: 3800, isPrincipal: true },
  ];

  const p1Rubros = [];
  for (const r of rubrosP1Data) {
    const rubro = await prisma.projectRubro.create({
      data: {
        projectId: project1.id,
        rubroNumber: r.rubroNumber,
        description: r.description,
        unit: r.unit,
        unitPrice: r.unitPrice,
        initialQuantity: r.initialQuantity,
        currentQuantity: r.initialQuantity,
        isPrincipal: r.isPrincipal,
      },
    });
    p1Rubros.push(rubro);
  }

  // Rubros Obra 2 (Colimes)
  const rubrosP2Data = [
    { rubroNumber: 1, description: 'REPLANTEO GENERAL Y TOPOGRAFÍA DE ALTA PRECISIÓN', unit: 'km', unitPrice: 420.00, initialQuantity: 18.2, isPrincipal: false },
    { rubroNumber: 2, description: 'EXCAVACIÓN DE SUELO BAJO AGUA PARA ESTRIBOS DE PUENTE', unit: 'm3', unitPrice: 14.50, initialQuantity: 3400, isPrincipal: true },
    { rubroNumber: 3, description: 'HORMIGÓN ESTRUCTURAL f\'c=280 kg/cm2 EN PILAS Y ESTRIBOS', unit: 'm3', unitPrice: 285.00, initialQuantity: 1250, isPrincipal: true },
    { rubroNumber: 4, description: 'ACERO DE REFUERZO CORRUGADO fy=4200 kg/cm2', unit: 'kg', unitPrice: 2.25, initialQuantity: 85000, isPrincipal: true },
    { rubroNumber: 5, description: 'SUMINISTRO Y MONTAJE DE VIGAS POSTENSADAS DE HORMIGÓN L=30M', unit: 'u', unitPrice: 18500.00, initialQuantity: 8, isPrincipal: true },
    { rubroNumber: 6, description: 'LOSA DE TABLERO EN HORMIGÓN f\'c=350 kg/cm2 e=22CM', unit: 'm3', unitPrice: 320.00, initialQuantity: 480, isPrincipal: true },
    { rubroNumber: 7, description: 'BASE GRANULAR ESTABILIZADA CON CEMENTO AL 4%', unit: 'm3', unitPrice: 34.00, initialQuantity: 11000, isPrincipal: true },
    { rubroNumber: 8, description: 'CARPETA DE HORMIGÓN ASFÁLTICO EN CALIENTE e=7.5CM', unit: 'm2', unitPrice: 16.50, initialQuantity: 125000, isPrincipal: true },
    { rubroNumber: 9, description: 'GAVIONES METÁLICOS DE PROTECCIÓN RIBEREÑA (2x1x1 m)', unit: 'm3', unitPrice: 78.00, initialQuantity: 3200, isPrincipal: true },
  ];

  const p2Rubros = [];
  for (const r of rubrosP2Data) {
    const rubro = await prisma.projectRubro.create({
      data: {
        projectId: project2.id,
        rubroNumber: r.rubroNumber,
        description: r.description,
        unit: r.unit,
        unitPrice: r.unitPrice,
        initialQuantity: r.initialQuantity,
        currentQuantity: r.initialQuantity,
        isPrincipal: r.isPrincipal,
      },
    });
    p2Rubros.push(rubro);
  }

  // Rubros Obra 3 (Salitre)
  const rubrosP3Data = [
    { rubroNumber: 1, description: 'REPLANTEO Y TRAZADO VIAL', unit: 'km', unitPrice: 350.00, initialQuantity: 14.2, isPrincipal: false },
    { rubroNumber: 2, description: 'DESBROCE Y DESPALME DE CAPA VEGETAL', unit: 'ha', unitPrice: 1950.00, initialQuantity: 4.8, isPrincipal: false },
    { rubroNumber: 3, description: 'CORTE EN EXCAVACIÓN PARA FORMACIÓN DE TERRAPLÉN', unit: 'm3', unitPrice: 3.90, initialQuantity: 48000, isPrincipal: true },
    { rubroNumber: 4, description: 'SUB-BASE GRANULAR CLASE 3', unit: 'm3', unitPrice: 18.50, initialQuantity: 14000, isPrincipal: true },
    { rubroNumber: 5, description: 'BASE GRANULAR CLASE 1', unit: 'm3', unitPrice: 23.40, initialQuantity: 9800, isPrincipal: true },
    { rubroNumber: 6, description: 'DOBLE TRATAMIENTO SUPERFICIAL BITUMINOSO CON POLÍMEROS', unit: 'm2', unitPrice: 7.80, initialQuantity: 98000, isPrincipal: true },
    { rubroNumber: 7, description: 'BORDILLOS CUNETA DE HORMIGÓN SIMPLE f\'c=180 kg/cm2', unit: 'm', unitPrice: 18.50, initialQuantity: 8500, isPrincipal: false },
  ];

  for (const r of rubrosP3Data) {
    await prisma.projectRubro.create({
      data: {
        projectId: project3.id,
        rubroNumber: r.rubroNumber,
        description: r.description,
        unit: r.unit,
        unitPrice: r.unitPrice,
        initialQuantity: r.initialQuantity,
        currentQuantity: r.initialQuantity,
        isPrincipal: r.isPrincipal,
      },
    });
  }

  // Rubros Obra 4 (Daule)
  const rubrosP4Data = [
    { rubroNumber: 1, description: 'FRESADO DE CARPETA ASFÁLTICA DETERIORADA e=5CM', unit: 'm2', unitPrice: 2.80, initialQuantity: 45000, isPrincipal: true },
    { rubroNumber: 2, description: 'BACHEO PROFUNDO CON BASE ESTABILIZADA', unit: 'm3', unitPrice: 42.00, initialQuantity: 1800, isPrincipal: true },
    { rubroNumber: 3, description: 'RIEGO DE LIGA CON EMULSIÓN MODIFICADA CON POLÍMEROS', unit: 'm2', unitPrice: 0.95, initialQuantity: 110000, isPrincipal: false },
    { rubroNumber: 4, description: 'RECAPEO ASFÁLTICO EN CALIENTE e=5CM', unit: 'm2', unitPrice: 12.80, initialQuantity: 110000, isPrincipal: true },
    { rubroNumber: 5, description: 'SELLADO DE FISURAS CON MASTIQUE BITUMINOSO', unit: 'm', unitPrice: 3.20, initialQuantity: 14000, isPrincipal: false },
  ];

  for (const r of rubrosP4Data) {
    await prisma.projectRubro.create({
      data: {
        projectId: project4.id,
        rubroNumber: r.rubroNumber,
        description: r.description,
        unit: r.unit,
        unitPrice: r.unitPrice,
        initialQuantity: r.initialQuantity,
        currentQuantity: r.initialQuantity,
        isPrincipal: r.isPrincipal,
      },
    });
  }

  console.log('✔ Catálogo de rubros generado para las 4 obras.');

  // 5. MAQUINARIA Y EQUIPO PESADO DE LICOSA
  console.log('\n5. Registrando maquinaria pesada...');
  const machineryList = [
    { code: 'EX-09', name: 'Excavadora Caterpillar 320D2L', category: 'EXCAVADORA', plateOrSerial: 'CAT0320D2LF9082', status: 'OPERATIVO', totalHoursWorked: 4820 },
    { code: 'EX-12', name: 'Excavadora Komatsu PC200-8M0', category: 'EXCAVADORA', plateOrSerial: 'KMT0PC2008M912', status: 'OPERATIVO', totalHoursWorked: 3150 },
    { code: 'TR-08', name: 'Tractor Oruga Caterpillar D6T XL', category: 'TRACTOR', plateOrSerial: 'CAT00D6TXL4412', status: 'OPERATIVO', totalHoursWorked: 6240 },
    { code: 'MN-04', name: 'Motoniveladora Caterpillar 140K', category: 'MOTONIVELADORA', plateOrSerial: 'CAT00140K2290', status: 'OPERATIVO', totalHoursWorked: 3890 },
    { code: 'MN-05', name: 'Motoniveladora John Deere 770G', category: 'MOTONIVELADORA', plateOrSerial: 'JHD00770G5511', status: 'OPERATIVO', totalHoursWorked: 1980 },
    { code: 'RO-03', name: 'Rodillo Liso Vibratorio Dynapac CA250', category: 'RODILLO', plateOrSerial: 'DNP0CA250D303', status: 'OPERATIVO', totalHoursWorked: 5410 },
    { code: 'RO-06', name: 'Rodillo Neumático Bomag BW 24 RH', category: 'RODILLO', plateOrSerial: 'BMG0BW24RH882', status: 'OPERATIVO', totalHoursWorked: 2450 },
    { code: 'VQ-14', name: 'Volqueta Hino 700 6x4 14m3', category: 'VOLQUETA', plateOrSerial: 'GSX-4912', status: 'OPERATIVO', totalHoursWorked: 4200 },
    { code: 'VQ-15', name: 'Volqueta Mercedes Benz Actros 3344 14m3', category: 'VOLQUETA', plateOrSerial: 'GBB-7821', status: 'OPERATIVO', totalHoursWorked: 5120 },
    { code: 'VQ-18', name: 'Volqueta Volvo FMX 440 8x4 16m3', category: 'VOLQUETA', plateOrSerial: 'GAA-9034', status: 'OPERATIVO', totalHoursWorked: 2100 },
    { code: 'TQ-02', name: 'Tanquero de Agua International 2500 Gal', category: 'TANQUERO', plateOrSerial: 'GBA-3310', status: 'OPERATIVO', totalHoursWorked: 4890 },
    { code: 'PAV-01', name: 'Terminadora de Asfalto Vögele Super 1800-3i', category: 'PAVIMENTADORA', plateOrSerial: 'VOG018003I001', status: 'OPERATIVO', totalHoursWorked: 1650 },
  ];

  const machineryCreated = [];
  for (const m of machineryList) {
    const item = await prisma.machinery.create({ data: m });
    machineryCreated.push(item);
  }
  console.log(`✔ ${machineryCreated.length} Equipos pesados registrados en la flota.`);

  // 6. PERSONAL DE OBRA & CUADRILLAS
  console.log('\n6. Registrando padrón de personal y asignando a obras...');
  const workersData = [
    { identification: '0918273645', name: 'ING. CARLOS MENDOZA CHÁVEZ', roleCategory: 'Ingeniero Residente', phone: '0998761234', email: 'cmendoza@licosa.com' },
    { identification: '0928374651', name: 'ING. PATRICIA ROMERO ALVARADO', roleCategory: 'Ingeniero de Planillas', phone: '0987654321', email: 'promero@licosa.com' },
    { identification: '1309876543', name: 'LCDO. ROBERTO CEDEÑO ZAMBRANO', roleCategory: 'Seguridad y Salud (EHS)', phone: '0991234567', email: 'rcedeno@licosa.com' },
    { identification: '0912345678', name: 'TÉC. MARCO QUIMI SUÁREZ', roleCategory: 'Topógrafo', phone: '0981122334', email: 'mquimi@licosa.com' },
    { identification: '0922334455', name: 'JOSÉ LAJE TOMALÁ', roleCategory: 'Cadenero', phone: '0982233445' },
    { identification: '0933445566', name: 'CARLOS MORÁN MACÍAS', roleCategory: 'Operador Excavadora', phone: '0983344556' },
    { identification: '0944556677', name: 'JORGE TOMALÁ MENDOZA', roleCategory: 'Operador Tractor', phone: '0984455667' },
    { identification: '0955667788', name: 'PEDRO GÓMEZ PINCAY', roleCategory: 'Operador Motoniveladora', phone: '0985566778' },
    { identification: '0966778899', name: 'LUIS BARZOLA SUÁREZ', roleCategory: 'Operador Rodillo', phone: '0986677889' },
    { identification: '0977889900', name: 'GABRIEL ALAY VILLAMAR', roleCategory: 'Chofer Volqueta', phone: '0987788990' },
    { identification: '0988990011', name: 'WASHINGTON TIGRERO LÓPEZ', roleCategory: 'Chofer Volqueta', phone: '0988899001' },
    { identification: '0999001122', name: 'NELSON FIGUEROA REYES', roleCategory: 'Chofer de Tanquero', phone: '0989900112' },
    { identification: '1311223344', name: 'BOLÍVAR CHÓEZ ALCÍVAR', roleCategory: 'Fierrero / Albañil', phone: '0991122334' },
    { identification: '1322334455', name: 'JACINTO VILLAO MERA', roleCategory: 'Fierrero / Albañil', phone: '0992233445' },
    { identification: '0911223399', name: 'DAVID BAILÓN ASENCIO', roleCategory: 'Ayudante de Obra - Recibidor', phone: '0993344556' },
    { identification: '0912983746', name: 'ING. JORGE SOLÓRZANO', roleCategory: 'Inspector Ambiental', phone: '0994455667' },
    { identification: '0919283745', name: 'ALEXANDER BORBOR', roleCategory: 'Mecánico de Obra', phone: '0995566778' },
  ];

  const workersCreated = [];
  for (const w of workersData) {
    const worker = await prisma.worker.create({ data: w });
    workersCreated.push(worker);
  }

  // Asignaciones de Personal a Obra 1 (Valle de la Virgen)
  const p1Workers = [
    { workerId: workersCreated[0].id, assignedRole: 'Ingeniero Residente de Obra Frente 1', notes: 'Coordinación general de frentes de asfalto' },
    { workerId: workersCreated[1].id, assignedRole: 'Ingeniera de Planillaje & Control de Rubros', notes: 'Medición diaria en campo con fiscalización' },
    { workerId: workersCreated[2].id, assignedRole: 'Inspector EHS Seguridad Industrial', notes: 'Charlas de seguridad y control de EPP' },
    { workerId: workersCreated[3].id, assignedRole: 'Topógrafo Principal de Rasante', notes: 'Replanteo de abscisas km 10+000 al km 18+500' },
    { workerId: workersCreated[4].id, assignedRole: 'Cadenero Topografía', notes: 'Cuadrilla topográfica' },
    { workerId: workersCreated[5].id, assignedRole: 'Operador Excavadora EX-09', notes: 'Desmonte y excavación de terraplén' },
    { workerId: workersCreated[6].id, assignedRole: 'Operador Tractor TR-08', notes: 'Extendido de material de préstamo' },
    { workerId: workersCreated[7].id, assignedRole: 'Operador Motoniveladora MN-04', notes: 'Conformación de base granular' },
    { workerId: workersCreated[8].id, assignedRole: 'Operador Rodillo RO-03', notes: 'Compactación de capas granulares' },
    { workerId: workersCreated[9].id, assignedRole: 'Chofer Volqueta VQ-14', notes: 'Acarreo de material desde cantera' },
    { workerId: workersCreated[10].id, assignedRole: 'Chofer Volqueta VQ-15', notes: 'Transporte de desalojo a botadero' },
    { workerId: workersCreated[11].id, assignedRole: 'Chofer Tanquero TQ-02', notes: 'Humectación de sub-base y control de polvo' },
    { workerId: workersCreated[14].id, assignedRole: 'Recibidor de Materiales en Cancha', notes: 'Control de boletos de volquetas en abscisa' },
  ];

  for (const a of p1Workers) {
    await prisma.workerAssignment.create({
      data: {
        workerId: a.workerId,
        projectId: project1.id,
        assignedRole: a.assignedRole,
        notes: a.notes,
        status: 'ACTIVO',
      },
    });
  }

  // Asignaciones de Personal a Obra 2 (Colimes)
  const p2Workers = [
    { workerId: workersCreated[12].id, assignedRole: 'Capataz de Estructuras y Puentes', notes: 'Encofrado y armado de estribo izquierdo' },
    { workerId: workersCreated[13].id, assignedRole: 'Maestro Fierrero Estructural', notes: 'Armado de acero fy=4200 en zapatas de puente' },
    { workerId: workersCreated[15].id, assignedRole: 'Inspector de Cumplimiento Ambiental', notes: 'Monitoreo de cuenca del Río Colimes' },
    { workerId: workersCreated[16].id, assignedRole: 'Jefe Mecánico de Taller de Frente', notes: 'Mantenimiento preventivo de maquinaria pesada' },
  ];

  for (const a of p2Workers) {
    await prisma.workerAssignment.create({
      data: {
        workerId: a.workerId,
        projectId: project2.id,
        assignedRole: a.assignedRole,
        notes: a.notes,
        status: 'ACTIVO',
      },
    });
  }

  console.log('✔ Padrón de 17 trabajadores y cuadrillas asignados.');

  // 7. CONTRATISTAS Y SUBCONTRATOS
  console.log('\n7. Registrando empresas contratistas y subcontratos...');
  const contractorsData = [
    { name: 'CONSORCIO VIAL DEL GUAYAS', ruc: '0992837482001', specialty: 'Construcción y Pavimentación de Carreteras', contactPerson: 'Ing. Marcelo Echeverría', phone: '042889900', email: 'mecheverria@consorciovial.ec' },
    { name: 'ASFALTOS & PAVIMENTOS DEL LITORAL CÍA. LTDA.', ruc: '0991827364001', specialty: 'Producción y Tendido de Asfalto en Caliente', contactPerson: 'Ing. Rodrigo Cárdenas', phone: '042998811', email: 'rcardenas@asfaltoslitoral.com' },
    { name: 'ESTRUCTURAS & PUENTES DEL AUSTRO S.A.', ruc: '0190384729001', specialty: 'Ingeniería de Puentes y Hormigón Estructural', contactPerson: 'Ing. Xavier Andrade', phone: '072834511', email: 'xandrade@puentesaustro.ec' },
    { name: 'TRANSPORTES PESADOS NOBOL S.A.', ruc: '0993049583001', specialty: 'Transporte de Material Pétreo y Desalojo Masivo', contactPerson: 'Sr. Wilson Ronquillo', phone: '0981239876', email: 'transnobol@hotmail.com' },
    { name: 'SEÑALIZACIÓN & SEGURIDAD VIAL ANDINA S.A.S.', ruc: '1792837491001', specialty: 'Señalización Horizontal, Vertical y Guardavías', contactPerson: 'Ing. Daniela Serrano', phone: '022998877', email: 'dserrano@seguridadvialandina.com' },
  ];

  const contractorsCreated = [];
  for (const c of contractorsData) {
    const contractor = await prisma.contractor.create({ data: c });
    contractorsCreated.push(contractor);
  }

  // Vincular Contratistas a Obra 1
  await prisma.projectContractorAssignment.createMany({
    data: [
      {
        contractorId: contractorsCreated[0].id,
        projectId: project1.id,
        roleInProject: 'CONTRATISTA_PRINCIPAL',
        contractAmount: 5939620.30,
        notes: 'Ejecutor principal consorciado según contrato oficial GAD Guayas',
      },
      {
        contractorId: contractorsCreated[1].id,
        projectId: project1.id,
        roleInProject: 'SUBCONTRATISTA_ASFALTO',
        contractAmount: 1850000.00,
        notes: 'Suministro y colocación de 152,000 m2 de carpeta asfáltica e=7.5cm',
      },
      {
        contractorId: contractorsCreated[3].id,
        projectId: project1.id,
        roleInProject: 'PROVEEDOR_TRANSPORTE',
        contractAmount: 420000.00,
        notes: 'Acarreo de 110,000 m3 de material de préstamo importado con flota de volquetas',
      },
      {
        contractorId: contractorsCreated[4].id,
        projectId: project1.id,
        roleInProject: 'SUBCONTRATISTA_SENALIZACION',
        contractAmount: 165000.00,
        notes: 'Pintura termoplástica, tachas reflectivas y guardavías metálicas',
      },
    ],
  });

  // Vincular Contratistas a Obra 2
  await prisma.projectContractorAssignment.createMany({
    data: [
      {
        contractorId: contractorsCreated[2].id,
        projectId: project2.id,
        roleInProject: 'SUBCONTRATISTA_PUENTES',
        contractAmount: 850000.00,
        notes: 'Construcción integral de superestructura y vigas postensadas de 30m para puente',
      },
      {
        contractorId: contractorsCreated[3].id,
        projectId: project2.id,
        roleInProject: 'PROVEEDOR_TRANSPORTE',
        contractAmount: 210000.00,
        notes: 'Desalojo de sedimentos y acarreo de piedra bola para gaviones ribereños',
      },
    ],
  });

  console.log('✔ Empresas contratistas y subcontratos vinculados con montos.');

  // 8. BODEGA & INVENTARIO POR OBRA
  console.log('\n8. Configurando bodegas de obra, ingresos y egresos de almacén...');
  
  // Materiales en Obra 1 (Valle de la Virgen)
  const p1MaterialsData = [
    { code: 'MAT-CEM-01', name: 'Cemento Holcim Fuerte Tipo GU (Saco 50 kg)', category: 'CEMENTO', unit: 'saco', currentStock: 480, minStock: 100, location: 'Bodega Central Valle - Galpón 1' },
    { code: 'MAT-ASF-01', name: 'Asfalto Líquido RC-250 para Imprimación', category: 'ASFALTO', unit: 'galon', currentStock: 6200, minStock: 1500, location: 'Tanque Térmico Estacionario N° 2' },
    { code: 'MAT-TUB-1200', name: 'Tubo de Acero Corrugado Galvanizado D=1200mm', category: 'TUBERIA', unit: 'm', currentStock: 85, minStock: 30, location: 'Patio de Estructuras Abscisa 8+200' },
    { code: 'MAT-VAR-12', name: 'Varilla de Acero Corrugado 12mm x 12m (fy=4200)', category: 'ACERO', unit: 'quintal', currentStock: 220, minStock: 50, location: 'Galpón de Acero y Encofrados' },
    { code: 'MAT-VAR-16', name: 'Varilla de Acero Corrugado 16mm x 12m (fy=4200)', category: 'ACERO', unit: 'quintal', currentStock: 185, minStock: 40, location: 'Galpón de Acero y Encofrados' },
    { code: 'MAT-DSL-01', name: 'Combustible Diésel Automotriz Premium', category: 'COMBUSTIBLE', unit: 'galon', currentStock: 4250, minStock: 1000, location: 'Estación de Despacho de Combustible' },
    { code: 'MAT-GEO-01', name: 'Geotextil No Tejido Clase 2 para Subdrenes', category: 'GEOSINTETICO', unit: 'm2', currentStock: 3400, minStock: 800, location: 'Bodega 1 - Estante C3' },
    { code: 'MAT-TAC-01', name: 'Tacha Reflectiva Vial Bidireccional Amarilla 3M', category: 'SENALIZACION', unit: 'unidad', currentStock: 950, minStock: 200, location: 'Bodega 2 - Paquetería' },
    { code: 'MAT-PIN-TRA', name: 'Pintura Termoplástica Amarilla para Tráfico', category: 'SENALIZACION', unit: 'caneca', currentStock: 85, minStock: 20, location: 'Bodega 2 - Solventes' },
    { code: 'MAT-GRA-34', name: 'Agregado Grueso Triturado 3/4" para Hormigón', category: 'ARIDOS', unit: 'm3', currentStock: 1450, minStock: 300, location: 'Patio de Áridos Cantera Central' },
  ];

  const p1Materials = [];
  for (const m of p1MaterialsData) {
    const item = await prisma.materialItem.create({
      data: { ...m, projectId: project1.id },
    });
    p1Materials.push(item);
  }

  // Obra 1: Ingreso de compra (Entry)
  const receipt1 = await prisma.storageReceipt.create({
    data: {
      projectId: project1.id,
      receiptNumber: 'FAC-001-002-0948382',
      supplier: 'HOLCIM ECUADOR S.A. (RUC: 0990004199001)',
      entryDateTime: new Date('2026-08-20T09:30:00Z'),
      receivedBy: 'Víctor Hugo Quijije',
      invoiceTotal: 4950.00,
      notes: 'Despacho directo de planta en plataforma de 600 sacos',
    },
  });

  await prisma.storageMovement.create({
    data: {
      materialItemId: p1Materials[0].id,
      receiptId: receipt1.id,
      projectId: project1.id,
      type: 'ENTRY',
      quantity: 600,
      unitCost: 8.25,
      targetWorkFront: 'Bodega Central Valle',
      authorizedBy: 'Ing. Carlos Mendoza',
      notes: 'Ingreso inicial para cabezales de alcantarilla',
    },
  });

  // Obra 1: Egreso de despacho a frente (Exit)
  const receipt2 = await prisma.storageReceipt.create({
    data: {
      projectId: project1.id,
      receiptNumber: 'VALE-DESP-2026-014',
      supplier: 'FRENTE DE DRENAJES KM 12+400',
      entryDateTime: new Date('2026-08-25T14:15:00Z'),
      receivedBy: 'Jacinto Villao (Maestro Albañil)',
      invoiceTotal: 990.00,
      notes: 'Despacho a cancha para fundición de cabezal alcantarilla N° 14',
    },
  });

  await prisma.storageMovement.create({
    data: {
      materialItemId: p1Materials[0].id,
      receiptId: receipt2.id,
      projectId: project1.id,
      type: 'EXIT',
      quantity: 120,
      unitCost: 8.25,
      targetWorkFront: 'Abscisa km 12+400',
      dispatchedTo: 'Jacinto Villao (Maestro Albañil)',
      authorizedBy: 'Ing. Carlos Mendoza (Residente)',
      notes: 'Despachado a cuadrilla de obras de arte',
    },
  });

  // Materiales en Obra 2 (Colimes)
  const p2MaterialsData = [
    { code: 'MAT-COL-CEM', name: 'Cemento Selvalegre Alta Resistencia Tipo HE (Saco 50kg)', category: 'CEMENTO', unit: 'saco', currentStock: 750, minStock: 150, location: 'Bodega Puente Colimes' },
    { code: 'MAT-COL-ACR', name: 'Acero Corrugado 25mm para Pilas de Puente (fy=4200)', category: 'ACERO', unit: 'quintal', currentStock: 340, minStock: 80, location: 'Patio de Armado Estructural' },
    { code: 'MAT-COL-ACR32', name: 'Acero Corrugado 32mm para Zapatas y Pilas', category: 'ACERO', unit: 'quintal', currentStock: 260, minStock: 60, location: 'Patio de Armado Estructural' },
    { code: 'MAT-COL-GAV', name: 'Malla Triple Torsión para Gavión 2x1x1m Galfán', category: 'GAVIONES', unit: 'unidad', currentStock: 420, minStock: 100, location: 'Plataforma Ribereña' },
    { code: 'MAT-COL-DSL', name: 'Diésel para Generadores y Maquinaria Puente', category: 'COMBUSTIBLE', unit: 'galon', currentStock: 2800, minStock: 800, location: 'Cisterna Móvil 01' },
    { code: 'MAT-COL-NEO', name: 'Apoyos de Neopreno Zunchado para Vigas Puente (400x500x70mm)', category: 'ESTRUCTURAS', unit: 'unidad', currentStock: 24, minStock: 8, location: 'Contenedor Climatizado' },
    { code: 'MAT-COL-TOR', name: 'Torones de Acero Especial para Postensado Grado 270 (1/2")', category: 'ACERO', unit: 'rollo', currentStock: 85, minStock: 20, location: 'Galpón de Postensado' },
    { code: 'MAT-COL-ADI', name: 'Aditivo Superfluidificante Reductor de Agua para f\'c=350', category: 'ADITIVOS', unit: 'caneca', currentStock: 65, minStock: 15, location: 'Bodega Química' },
    { code: 'MAT-COL-JUN', name: 'Junta de Dilatación Dentada para Tablero de Puente', category: 'ESTRUCTURAS', unit: 'm', currentStock: 36, minStock: 10, location: 'Patio de Ensamblaje' },
  ];

  const p2Materials = [];
  for (const m of p2MaterialsData) {
    const item = await prisma.materialItem.create({
      data: { ...m, projectId: project2.id },
    });
    p2Materials.push(item);
  }

  // Obra 2: Ingreso de acero estructural y cemento
  const receiptCol1 = await prisma.storageReceipt.create({
    data: {
      projectId: project2.id,
      receiptNumber: 'FAC-ACER-2026-0811',
      supplier: 'ACERÍA DEL ECUADOR S.A. ADELCA (RUC: 1790012345001)',
      entryDateTime: new Date('2026-08-15T11:00:00Z'),
      receivedBy: 'Jaime Vera (Bodeguero Puente)',
      invoiceTotal: 18450.00,
      notes: 'Entrega de barras de 25mm y 32mm para armadura de pilas',
    },
  });

  await prisma.storageMovement.create({
    data: {
      materialItemId: p2Materials[1].id,
      receiptId: receiptCol1.id,
      projectId: project2.id,
      type: 'ENTRY',
      quantity: 400,
      unitCost: 46.12,
      targetWorkFront: 'Patio de Armado Estructural',
      authorizedBy: 'Ing. Elena Velasco',
      notes: 'Recepción conforme con certificado de calidad de fábrica',
    },
  });

  // Obra 2: Despacho a Pila Central
  const receiptCol2 = await prisma.storageReceipt.create({
    data: {
      projectId: project2.id,
      receiptNumber: 'VALE-DESP-COL-008',
      supplier: 'FRENTE PILA CENTRAL PUENTE COLIMES',
      entryDateTime: new Date('2026-08-22T08:30:00Z'),
      receivedBy: 'Segundo Pilay (Maestro Mayor)',
      invoiceTotal: 2767.20,
      notes: 'Despacho de acero para estribo y pila N° 1',
    },
  });

  await prisma.storageMovement.create({
    data: {
      materialItemId: p2Materials[1].id,
      receiptId: receiptCol2.id,
      projectId: project2.id,
      type: 'EXIT',
      quantity: 60,
      unitCost: 46.12,
      targetWorkFront: 'Pila Central Río Colimes',
      dispatchedTo: 'Segundo Pilay (Maestro Mayor)',
      authorizedBy: 'Ing. Elena Velasco (Residente)',
      notes: 'Armado de canastilla de columna cilíndrica',
    },
  });

  // Materiales en Obra 3 (Vía Salitre - T de Baba)
  const p3MaterialsData = [
    { code: 'MAT-SAL-ESC', name: 'Piedra Escollera Seleccionada para Mejoramiento de Base', category: 'ARIDOS', unit: 'm3', currentStock: 2400, minStock: 500, location: 'Acopio Abscisa 2+500' },
    { code: 'MAT-SAL-GEO', name: 'Geotextil Tejido de Alto Módulo para Refuerzo Subrasante', category: 'GEOSINTETICO', unit: 'm2', currentStock: 4800, minStock: 1000, location: 'Bodega Campamento Salitre' },
    { code: 'MAT-SAL-ASF', name: 'Emulsión Asfáltica de Rotura Rápida CRS-2 para Riego', category: 'ASFALTO', unit: 'galon', currentStock: 5400, minStock: 1200, location: 'Tanque Nodriza N° 1' },
    { code: 'MAT-SAL-AR1', name: 'Árido Pétreo Clasificado 3/4" para Primer Riego', category: 'ARIDOS', unit: 'm3', currentStock: 1200, minStock: 300, location: 'Acopio Km 6+000' },
    { code: 'MAT-SAL-AR2', name: 'Árido Pétreo Clasificado 3/8" para Sello Asfáltico', category: 'ARIDOS', unit: 'm3', currentStock: 980, minStock: 250, location: 'Acopio Km 6+000' },
    { code: 'MAT-SAL-TUB1000', name: 'Tubo de Chapa de Acero Corrugado D=1000mm', category: 'TUBERIA', unit: 'm', currentStock: 64, minStock: 20, location: 'Patio de Tuberías Salitre' },
    { code: 'MAT-SAL-DSL', name: 'Diésel Automotriz para Equipo Caminero', category: 'COMBUSTIBLE', unit: 'galon', currentStock: 3100, minStock: 800, location: 'Cisterna Central Salitre' },
    { code: 'MAT-SAL-POST', name: 'Postes de Delineación Reflectivos Flexibles H=1.20m', category: 'SENALIZACION', unit: 'unidad', currentStock: 320, minStock: 80, location: 'Bodega Pañol 1' },
  ];

  const p3Materials = [];
  for (const m of p3MaterialsData) {
    const item = await prisma.materialItem.create({
      data: { ...m, projectId: project3.id },
    });
    p3Materials.push(item);
  }

  // Obra 3: Ingreso y Egreso
  const receiptSal1 = await prisma.storageReceipt.create({
    data: {
      projectId: project3.id,
      receiptNumber: 'FAC-CANTERA-9921',
      supplier: 'CANTERAS & ÁRIDOS DEL LITORAL (RUC: 0992817263001)',
      entryDateTime: new Date('2026-08-18T10:00:00Z'),
      receivedBy: 'Nelson Macías',
      invoiceTotal: 16800.00,
      notes: 'Ingreso de piedra escollera para terraplenes inestables',
    },
  });

  await prisma.storageMovement.create({
    data: {
      materialItemId: p3Materials[0].id,
      receiptId: receiptSal1.id,
      projectId: project3.id,
      type: 'ENTRY',
      quantity: 1200,
      unitCost: 14.00,
      targetWorkFront: 'Acopio Abscisa 2+500',
      authorizedBy: 'Ing. Carlos Mendoza',
      notes: 'Colocación en subbase inundable',
    },
  });

  // Materiales en Obra 4 (Recta de Daule)
  const p4MaterialsData = [
    { code: 'MAT-DAU-CEM', name: 'Cemento Portland Tipo IP Alta Resistencia Pavimento', category: 'CEMENTO', unit: 'saco', currentStock: 1200, minStock: 300, location: 'Silo y Bodega Daule' },
    { code: 'MAT-DAU-PAS', name: 'Barras de Acero Lisas Pasa-Juntas 32mm x 45cm con Capuchón', category: 'ACERO', unit: 'unidad', currentStock: 1800, minStock: 400, location: 'Galpón de Ensamblaje' },
    { code: 'MAT-DAU-AMA', name: 'Varillas de Amarre Corrugadas 16mm x 75cm', category: 'ACERO', unit: 'unidad', currentStock: 1400, minStock: 300, location: 'Galpón de Ensamblaje' },
    { code: 'MAT-DAU-SEL', name: 'Sellador Elástico Silicona Autonivelante para Juntas', category: 'QUIMICOS', unit: 'caja', currentStock: 85, minStock: 25, location: 'Bodega Químicos Daule' },
    { code: 'MAT-DAU-COR', name: 'Cordón de Respaldo de Espuma de Polietileno D=13mm', category: 'QUIMICOS', unit: 'm', currentStock: 3500, minStock: 800, location: 'Bodega 1' },
    { code: 'MAT-DAU-CUR', name: 'Membrana Líquida Curadora Base Solvente Blanca', category: 'QUIMICOS', unit: 'caneca', currentStock: 90, minStock: 20, location: 'Bodega 1' },
    { code: 'MAT-DAU-DSL', name: 'Combustible Diésel Tren de Pavimentación Rígida', category: 'COMBUSTIBLE', unit: 'galon', currentStock: 2600, minStock: 600, location: 'Cisterna Daule 01' },
    { code: 'MAT-DAU-FIB', name: 'Macrofibra Sintética Estructural para Pavimento', category: 'ADITIVOS', unit: 'kg', currentStock: 450, minStock: 100, location: 'Bodega 2' },
  ];

  const p4Materials = [];
  for (const m of p4MaterialsData) {
    const item = await prisma.materialItem.create({
      data: { ...m, projectId: project4.id },
    });
    p4Materials.push(item);
  }

  // Obra 4: Ingreso de Barras Pasa-Juntas
  const receiptDau1 = await prisma.storageReceipt.create({
    data: {
      projectId: project4.id,
      receiptNumber: 'FAC-DOWEL-8812',
      supplier: 'INDUSTRIAS METALÚRGICAS DEL GUAYAS (RUC: 0990887766001)',
      entryDateTime: new Date('2026-08-19T14:00:00Z'),
      receivedBy: 'Manuel Chiquito',
      invoiceTotal: 8100.00,
      notes: 'Entrega de barras pasa-juntas cortadas y biseladas',
    },
  });

  await prisma.storageMovement.create({
    data: {
      materialItemId: p4Materials[1].id,
      receiptId: receiptDau1.id,
      projectId: project4.id,
      type: 'ENTRY',
      quantity: 1800,
      unitCost: 4.50,
      targetWorkFront: 'Patio de Ensamblaje de Canastillas',
      authorizedBy: 'Ing. Elena Velasco',
      notes: 'Para juntas transversales de contracción cada 4.5 metros',
    },
  });

  console.log('✔ Bodegas de obra provistas de materiales con kardex trazable en las 4 obras.');

  // 9. REPORTES DIARIOS SECUENCIALES
  console.log('\n9. Generando serie de reportes diarios oficiales con avance acumulado...');

  // 5 Reportes Diarios Consecutivos para Obra 1 (Valle de la Virgen) - Días 20 a 24
  const p1ReportsData = [
    { reportNumber: 20, date: new Date('2026-08-20'), elapsedDays: 20, rainDay: 0, rainNight: 0, excav: 920.00, subbase: 410.00, base: 0, prime: 0, asphalt: 0 },
    { reportNumber: 21, date: new Date('2026-08-21'), elapsedDays: 21, rainDay: 0, rainNight: 0, excav: 1050.00, subbase: 520.00, base: 0, prime: 0, asphalt: 0 },
    { reportNumber: 22, date: new Date('2026-08-22'), elapsedDays: 22, rainDay: 2.5, rainNight: 1.0, excav: 640.00, subbase: 320.00, base: 0, prime: 0, asphalt: 0 },
    { reportNumber: 23, date: new Date('2026-08-23'), elapsedDays: 23, rainDay: 0, rainNight: 0, excav: 1120.00, subbase: 650.00, base: 280.00, prime: 1200.00, asphalt: 0 },
    { reportNumber: 24, date: new Date('2026-08-24'), elapsedDays: 24, rainDay: 0, rainNight: 0, excav: 893.07, subbase: 720.00, base: 450.00, prime: 2500.00, asphalt: 1850.00 },
  ];

  let accumExcav = 18500.00;
  let accumSubbase = 5200.00;
  let accumBase = 0;
  let accumPrime = 0;
  let accumAsphalt = 0;
  let totalExecAccum = 420000.00;

  for (const rep of p1ReportsData) {
    accumExcav += rep.excav;
    accumSubbase += rep.subbase;
    accumBase += rep.base;
    accumPrime += rep.prime;
    accumAsphalt += rep.asphalt;

    const dayExecTotal =
      rep.excav * p1Rubros[2].unitPrice +
      rep.subbase * p1Rubros[5].unitPrice +
      rep.base * p1Rubros[6].unitPrice +
      rep.prime * p1Rubros[7].unitPrice +
      rep.asphalt * p1Rubros[8].unitPrice;

    totalExecAccum += dayExecTotal;
    const progressPercent = (totalExecAccum / project1.contractAmount) * 100;

    const dailyReport = await prisma.dailyReport.create({
      data: {
        projectId: project1.id,
        reportNumber: rep.reportNumber,
        date: rep.date,
        roadSection: 'Valle de la Virgen – San Rafael (Km 10+000 al 14+500)',
        elapsedDays: rep.elapsedDays,
        totalDays: 240,
        totalExecutedDay: dayExecTotal,
        totalExecutedAccum: totalExecAccum,
        principalExecutedDay: dayExecTotal,
        principalExecutedAccum: totalExecAccum,
        progressPercentAccum: parseFloat(progressPercent.toFixed(2)),
        rainHoursDay: rep.rainDay,
        rainHoursNight: rep.rainNight,
        lostRainHoursDay: rep.rainDay > 0 ? 2.0 : 0,
        lostRainHoursAccum: 8.5,
        safetyTalkMinutesDay: 10,
        safetyTalkMinutesAccum: 120,
        incidentsDay: 0,
        incidentsAccum: 0,
        accidentsDay: 0,
        accidentsAccum: 0,
        activitiesTodayVial: 'Excavación de plataforma y desalojo en taludes tramo km 12+200.',
        activitiesTodayPavimento: rep.prime > 0 ? 'Imprimación asfáltica con RC-250 en calzada compactada.' : 'Conformación y humectación de capa de sub-base granular.',
        activitiesTodayDrenaje: 'Encofrado y fundición de cabezal de hormigón f\'c=210 kg/cm2.',
        activitiesTodayTopografia: 'Control de cotas de rasante y replanteo de niveles de sub-base.',
        activitiesTomorrowVial: 'Continuar excavación en abscisa 14+800 y extendido de base.',
        noveltiesRisks: rep.rainDay > 0 ? 'Lluvia moderada de 14:00 a 16:30 requirió suspender compactación.' : 'Ninguna novedad reportada. Jornada sin novedades de seguridad.',
        contractorComments: 'Frente de trabajo avanza dentro de cronograma valorado vigente.',
        supervisorComments: 'Verificado cumplimiento de densidades de campo (densidad > 98% Proctor).',
        preparedByName: 'Ing. Patricia Romero Alvarado',
        preparedByTitle: 'Ingeniera de Planillas LICOSA',
        reviewedByName: 'Ing. Carlos Mendoza Chávez',
        reviewedByTitle: 'Superintendente / Residente de Obra',
      },
    });

    // Rubros ejecutados en el día
    await prisma.dailyRubroExecution.createMany({
      data: [
        {
          dailyReportId: dailyReport.id,
          projectRubroId: p1Rubros[2].id, // Excavación
          dayQuantity: rep.excav,
          accumQuantity: accumExcav,
          dayAmount: rep.excav * p1Rubros[2].unitPrice,
          accumAmount: accumExcav * p1Rubros[2].unitPrice,
        },
        {
          dailyReportId: dailyReport.id,
          projectRubroId: p1Rubros[5].id, // Sub-base
          dayQuantity: rep.subbase,
          accumQuantity: accumSubbase,
          dayAmount: rep.subbase * p1Rubros[5].unitPrice,
          accumAmount: accumSubbase * p1Rubros[5].unitPrice,
        },
        ...(rep.base > 0 ? [{
          dailyReportId: dailyReport.id,
          projectRubroId: p1Rubros[6].id, // Base
          dayQuantity: rep.base,
          accumQuantity: accumBase,
          dayAmount: rep.base * p1Rubros[6].unitPrice,
          accumAmount: accumBase * p1Rubros[6].unitPrice,
        }] : []),
        ...(rep.prime > 0 ? [{
          dailyReportId: dailyReport.id,
          projectRubroId: p1Rubros[7].id, // Imprimación
          dayQuantity: rep.prime,
          accumQuantity: accumPrime,
          dayAmount: rep.prime * p1Rubros[7].unitPrice,
          accumAmount: accumPrime * p1Rubros[7].unitPrice,
        }] : []),
      ],
    });

    // Maquinaria del día
    await prisma.dailyReportMachinery.createMany({
      data: [
        { dailyReportId: dailyReport.id, machineryId: machineryCreated[0].id, description: 'EXCAVADORA EX-09 (CAT 320D)', unit: 'hora', quantity: 1, dayHours: 9.5, notes: 'Excavación en taludes tramo km 12' },
        { dailyReportId: dailyReport.id, machineryId: machineryCreated[2].id, description: 'TRACTOR TR-08 (CAT D6T)', unit: 'hora', quantity: 1, dayHours: 8.0, notes: 'Desmonte y extendido' },
        { dailyReportId: dailyReport.id, machineryId: machineryCreated[3].id, description: 'MOTONIVELADORA MN-04 (140K)', unit: 'hora', quantity: 1, dayHours: 9.0, notes: 'Nivelación de sub-base' },
        { dailyReportId: dailyReport.id, machineryId: machineryCreated[5].id, description: 'RODILLO RO-03 (DYNAPAC)', unit: 'hora', quantity: 1, dayHours: 9.0, notes: 'Compactación sistemática' },
        { dailyReportId: dailyReport.id, machineryId: machineryCreated[7].id, description: 'VOLQUETA VQ-14 (HINO 14M3)', unit: 'hora', quantity: 1, dayHours: 10.0, notes: 'Acarreo de material pétreo' },
        { dailyReportId: dailyReport.id, machineryId: machineryCreated[10].id, description: 'TANQUERO TQ-02 (2500 GAL)', unit: 'hora', quantity: 1, dayHours: 8.5, notes: 'Riego para humedad óptima' },
      ],
    });

    // Personal del día
    await prisma.dailyReportPersonnel.createMany({
      data: [
        { dailyReportId: dailyReport.id, categoryRole: 'Ingeniero Residente', quantity: 1, manHoursDay: 10, totalManHours: 10 },
        { dailyReportId: dailyReport.id, categoryRole: 'Ingeniero de Planillas', quantity: 1, manHoursDay: 9, totalManHours: 9 },
        { dailyReportId: dailyReport.id, categoryRole: 'Topógrafo', quantity: 2, manHoursDay: 10, totalManHours: 20 },
        { dailyReportId: dailyReport.id, categoryRole: 'Cadeneros', quantity: 3, manHoursDay: 10, totalManHours: 30 },
        { dailyReportId: dailyReport.id, categoryRole: 'Operadores de Equipo Pesado', quantity: 6, manHoursDay: 10, totalManHours: 60 },
        { dailyReportId: dailyReport.id, categoryRole: 'Choferes de Volquetas y Tanquero', quantity: 4, manHoursDay: 10, totalManHours: 40 },
        { dailyReportId: dailyReport.id, categoryRole: 'Cuadrilla de Obras de Arte (Albañiles/Fierreros)', quantity: 8, manHoursDay: 9, totalManHours: 72 },
        { dailyReportId: dailyReport.id, categoryRole: 'Ayudantes de Obra y Recibidores', quantity: 12, manHoursDay: 9, totalManHours: 108 },
      ],
    });

    // Clima del día
    await prisma.dailyHourlyWeather.createMany({
      data: [
        { dailyReportId: dailyReport.id, timeSlot: '6-8', conditionCode: 1 },
        { dailyReportId: dailyReport.id, timeSlot: '8-10', conditionCode: 1 },
        { dailyReportId: dailyReport.id, timeSlot: '10-12', conditionCode: 1 },
        { dailyReportId: dailyReport.id, timeSlot: '12-14', conditionCode: rep.rainDay > 0 ? 4 : 2 },
        { dailyReportId: dailyReport.id, timeSlot: '14-16', conditionCode: rep.rainDay > 0 ? 3 : 1 },
        { dailyReportId: dailyReport.id, timeSlot: '16-18', conditionCode: 1 },
      ],
    });
  }

  // 3 Reportes Diarios Consecutivos para Obra 2 (Colimes)
  const p2ReportsData = [
    { reportNumber: 1, date: new Date('2026-08-16'), elapsedDays: 1, excav: 450.00 },
    { reportNumber: 2, date: new Date('2026-08-17'), elapsedDays: 2, excav: 620.00 },
    { reportNumber: 3, date: new Date('2026-08-18'), elapsedDays: 3, excav: 780.00 },
  ];

  let p2AccumExcav = 0;
  let p2TotalExecAccum = 0;

  for (const rep of p2ReportsData) {
    p2AccumExcav += rep.excav;
    const dayExec = rep.excav * p2Rubros[1].unitPrice;
    p2TotalExecAccum += dayExec;
    const progressPercent = (p2TotalExecAccum / project2.contractAmount) * 100;

    const repObj = await prisma.dailyReport.create({
      data: {
        projectId: project2.id,
        reportNumber: rep.reportNumber,
        date: rep.date,
        roadSection: 'Acceso y Estribo Izquierdo Río Colimes',
        elapsedDays: rep.elapsedDays,
        totalDays: 210,
        totalExecutedDay: dayExec,
        totalExecutedAccum: p2TotalExecAccum,
        principalExecutedDay: dayExec,
        principalExecutedAccum: p2TotalExecAccum,
        progressPercentAccum: parseFloat(progressPercent.toFixed(2)),
        rainHoursDay: 0,
        rainHoursNight: 0,
        lostRainHoursDay: 0,
        lostRainHoursAccum: 0,
        safetyTalkMinutesDay: 15,
        safetyTalkMinutesAccum: 45,
        incidentsDay: 0,
        incidentsAccum: 0,
        accidentsDay: 0,
        accidentsAccum: 0,
        activitiesTodayPuentes: 'Inicio de excavación profunda para cimentación de estribos del nuevo puente Colimes.',
        activitiesTodayVial: 'Desalojo de suelo limoso con retroexcavadora y volquetas hacia botadero autorizado.',
        activitiesTomorrowPuentes: 'Colocación de plantilla de hormigón pobre f\'c=140 para armado de zapata.',
        preparedByName: 'Ing. Elena Velasco',
        preparedByTitle: 'Residente de Obra Frente Norte',
        reviewedByName: 'Ing. Gonzalo Morales',
        reviewedByTitle: 'Fiscalizador Principal',
      },
    });

    await prisma.dailyRubroExecution.create({
      data: {
        dailyReportId: repObj.id,
        projectRubroId: p2Rubros[1].id,
        dayQuantity: rep.excav,
        accumQuantity: p2AccumExcav,
        dayAmount: dayExec,
        accumAmount: p2TotalExecAccum,
      },
    });

    await prisma.dailyReportMachinery.createMany({
      data: [
        { dailyReportId: repObj.id, machineryId: machineryCreated[1].id, description: 'EXCAVADORA KOMATSU EX-12', unit: 'hora', quantity: 1, dayHours: 9.0, notes: 'Excavación en cauce' },
        { dailyReportId: repObj.id, machineryId: machineryCreated[8].id, description: 'VOLQUETA VQ-18 (VOLVO 16M3)', unit: 'hora', quantity: 1, dayHours: 8.5, notes: 'Desalojo de lodo' },
      ],
    });
  }

  console.log('✔ Serie de reportes diarios generados con acumulaciones físicas y financieras.');

  // 10. SOLICITUDES DE OBRA (MATERIALES Y MAQUINARIA)
  console.log('\n10. Creando solicitudes de materiales y maquinaria con estados variados...');
  await prisma.workRequest.createMany({
    data: [
      // Obra 1 (Valle Hermoso - Virgen del Cisne)
      {
        code: 'SOL-MAT-001',
        projectId: project1.id,
        type: 'MATERIAL',
        materialItemId: p1Materials[0].id,
        materialName: 'Cemento Holcim Fuerte Tipo GU',
        requestedQty: 150,
        unit: 'saco',
        neededDate: new Date('2026-08-28'),
        targetLocation: 'Abscisa km 14+350 - Cruce de quebrada',
        priority: 'ALTA',
        status: 'DESPACHADA',
        justification: 'Fundición programada de aletas y muros de contención de alcantarilla',
        requestedById: resident1.id,
        requestedByName: 'Ing. Carlos Mendoza',
        requestedByRole: 'RESIDENTE_OBRA',
        reviewedById: adminUser.id,
        reviewedByName: 'Ing. Fernando Salazar',
        reviewedAt: new Date('2026-08-25'),
        reviewNotes: 'Aprobado y despachado desde bodega central con comprobante EGR-014',
      },
      {
        code: 'SOL-MAT-002',
        projectId: project1.id,
        type: 'MATERIAL',
        materialItemId: p1Materials[2].id,
        materialName: 'Tubo de Acero Corrugado Galvanizado D=1200mm',
        requestedQty: 48,
        unit: 'm',
        neededDate: new Date('2026-09-02'),
        targetLocation: 'Abscisa km 18+100',
        priority: 'URGENTE',
        status: 'APROBADA',
        justification: 'Paso de agua colapsado por lluvias pasadas, requiere reemplazo urgente',
        requestedById: resident1.id,
        requestedByName: 'Ing. Carlos Mendoza',
        requestedByRole: 'RESIDENTE_OBRA',
        reviewedById: adminUser.id,
        reviewedByName: 'Ing. Fernando Salazar',
        reviewedAt: new Date('2026-08-29'),
        reviewNotes: 'Aprobado por el Administrador. Notificado a bodega para entrega en patio',
      },
      {
        code: 'SOL-MAQ-001',
        projectId: project1.id,
        type: 'MAQUINARIA',
        machineryId: machineryCreated[6].id,
        machineryName: 'Rodillo Neumático Bomag BW 24 RH',
        estimatedHours: 24,
        startDate: new Date('2026-09-04'),
        endDate: new Date('2026-09-07'),
        withOperator: true,
        targetLocation: 'Km 10+000 al 12+500',
        priority: 'NORMAL',
        status: 'PENDIENTE',
        justification: 'Sellado y compactación de carpeta asfáltica en caliente con equipo neumático',
        requestedById: resident1.id,
        requestedByName: 'Ing. Carlos Mendoza',
        requestedByRole: 'RESIDENTE_OBRA',
      },
      {
        code: 'SOL-MAT-003',
        projectId: project1.id,
        type: 'MATERIAL',
        materialItemId: p1Materials[8].id,
        materialName: 'Pintura Termoplástica Amarilla para Tráfico',
        requestedQty: 40,
        unit: 'caneca',
        neededDate: new Date('2026-09-10'),
        targetLocation: 'Tramo 1 Km 0 a 8',
        priority: 'BAJA',
        status: 'RECHAZADA',
        justification: 'Señalización horizontal prematura de bordes de calzada',
        requestedById: resident1.id,
        requestedByName: 'Ing. Carlos Mendoza',
        requestedByRole: 'RESIDENTE_OBRA',
        reviewedById: adminUser.id,
        reviewedByName: 'Ing. Fernando Salazar',
        reviewedAt: new Date('2026-08-30'),
        reviewNotes: 'Rechazado temporalmente: Primero debe culminarse la carpeta asfáltica de 7.5cm en el tramo antes de pintar.',
      },

      // Obra 2 (Puente sobre Río Colimes)
      {
        code: 'SOL-MAT-004',
        projectId: project2.id,
        type: 'MATERIAL',
        materialItemId: p2Materials[1].id,
        materialName: 'Acero Corrugado 25mm para Armadura de Pilas de Puente',
        requestedQty: 80,
        unit: 'quintal',
        neededDate: new Date('2026-08-30'),
        targetLocation: 'Campamento Puente Colimes',
        priority: 'ALTA',
        status: 'APROBADA',
        justification: 'Armado de columnas cilíndricas de pila central del puente',
        requestedById: resident2.id,
        requestedByName: 'Ing. Elena Velasco',
        requestedByRole: 'RESIDENTE_OBRA',
        reviewedById: adminUser.id,
        reviewedByName: 'Ing. Fernando Salazar',
        reviewedAt: new Date('2026-08-27'),
        reviewNotes: 'Autorizada entrega inmediata desde bodega de Colimes',
      },
      {
        code: 'SOL-MAQ-002',
        projectId: project2.id,
        type: 'MAQUINARIA',
        machineryId: machineryCreated[2].id,
        machineryName: 'Tractor Oruga Caterpillar D6T XL',
        estimatedHours: 35,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-05'),
        withOperator: true,
        targetLocation: 'Acceso Margen Derecha Río Colimes',
        priority: 'NORMAL',
        status: 'EN_USO',
        justification: 'Apertura de rampa de acceso para camiones hormigoneros mixer',
        requestedById: resident2.id,
        requestedByName: 'Ing. Elena Velasco',
        requestedByRole: 'RESIDENTE_OBRA',
        reviewedById: adminUser.id,
        reviewedByName: 'Ing. Fernando Salazar',
        reviewedAt: new Date('2026-08-30'),
        reviewNotes: 'Asignado a frente norte de Colimes en operación activa',
      },
      {
        code: 'SOL-MAT-005',
        projectId: project2.id,
        type: 'MATERIAL',
        materialItemId: p2Materials[5].id,
        materialName: 'Apoyos de Neopreno Zunchado para Vigas Puente (400x500x70mm)',
        requestedQty: 12,
        unit: 'unidad',
        neededDate: new Date('2026-09-12'),
        targetLocation: 'Estribo Izquierdo y Pila 1',
        priority: 'ALTA',
        status: 'PENDIENTE',
        justification: 'Instalación previa al lanzamiento e izaje de vigas presforzadas AASHTO',
        requestedById: resident2.id,
        requestedByName: 'Ing. Elena Velasco',
        requestedByRole: 'RESIDENTE_OBRA',
      },
      {
        code: 'SOL-MAQ-003',
        projectId: project2.id,
        type: 'MAQUINARIA',
        machineryId: machineryCreated[1].id,
        machineryName: 'Excavadora Komatsu PC200-8M0 (EX-12)',
        estimatedHours: 25,
        startDate: new Date('2026-09-02'),
        endDate: new Date('2026-09-06'),
        withOperator: true,
        targetLocation: 'Cauce de Río Colimes - Sector Pilas',
        priority: 'ALTA',
        status: 'APROBADA',
        justification: 'Desbroce y limpieza de palizadas y sedimentos en el lecho del río',
        requestedById: resident2.id,
        requestedByName: 'Ing. Elena Velasco',
        requestedByRole: 'RESIDENTE_OBRA',
        reviewedById: adminUser.id,
        reviewedByName: 'Ing. Fernando Salazar',
        reviewedAt: new Date('2026-08-31'),
        reviewNotes: 'Aprobada operación con operador autorizado',
      },

      // Obra 3 (Vía Salitre - T de Baba)
      {
        code: 'SOL-MAT-006',
        projectId: project3.id,
        type: 'MATERIAL',
        materialItemId: p3Materials[2].id,
        materialName: 'Emulsión Asfáltica de Rotura Rápida CRS-2 para Riego',
        requestedQty: 1800,
        unit: 'galon',
        neededDate: new Date('2026-09-05'),
        targetLocation: 'Abscisa Km 3+200 al 5+000',
        priority: 'ALTA',
        status: 'APROBADA',
        justification: 'Aplicación de primer riego de liga y penetración en base estabilizada',
        requestedById: resident1.id,
        requestedByName: 'Ing. Carlos Mendoza',
        requestedByRole: 'RESIDENTE_OBRA',
        reviewedById: adminUser.id,
        reviewedByName: 'Ing. Fernando Salazar',
        reviewedAt: new Date('2026-09-01'),
        reviewNotes: 'Autorizada salida de tanque nodriza Salitre',
      },
      {
        code: 'SOL-MAT-007',
        projectId: project3.id,
        type: 'MATERIAL',
        materialItemId: p3Materials[0].id,
        materialName: 'Piedra Escollera Seleccionada para Mejoramiento de Base',
        requestedQty: 350,
        unit: 'm3',
        neededDate: new Date('2026-08-26'),
        targetLocation: 'Zona baja inundable Abscisa Km 4+200',
        priority: 'URGENTE',
        status: 'DESPACHADA',
        justification: 'Colchón de pedraplén drenante para estabilización de subrasante fangosa',
        requestedById: resident1.id,
        requestedByName: 'Ing. Carlos Mendoza',
        requestedByRole: 'RESIDENTE_OBRA',
        reviewedById: adminUser.id,
        reviewedByName: 'Ing. Fernando Salazar',
        reviewedAt: new Date('2026-08-25'),
        reviewNotes: 'Despacho completado con volquetas de la obra',
      },
      {
        code: 'SOL-MAQ-004',
        projectId: project3.id,
        type: 'MAQUINARIA',
        machineryId: machineryCreated[4].id,
        machineryName: 'Motoniveladora Caterpillar 140K (MN-05)',
        estimatedHours: 40,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-06'),
        withOperator: true,
        targetLocation: 'Km 2+000 al 6+000',
        priority: 'NORMAL',
        status: 'EN_USO',
        justification: 'Conformación de rasante y bombeo al 2% en capa de subbase clase 1',
        requestedById: resident1.id,
        requestedByName: 'Ing. Carlos Mendoza',
        requestedByRole: 'RESIDENTE_OBRA',
        reviewedById: adminUser.id,
        reviewedByName: 'Ing. Fernando Salazar',
        reviewedAt: new Date('2026-08-30'),
        reviewNotes: 'En operación con operador Efraín Moreira',
      },
      {
        code: 'SOL-MAT-008',
        projectId: project3.id,
        type: 'MATERIAL',
        materialItemId: p3Materials[7].id,
        materialName: 'Postes de Delineación Reflectivos Flexibles H=1.20m',
        requestedQty: 120,
        unit: 'unidad',
        neededDate: new Date('2026-09-15'),
        targetLocation: 'Curvas peligrosas Km 7+000',
        priority: 'NORMAL',
        status: 'PENDIENTE',
        justification: 'Seguridad vial preventiva en tramos sinuosos con bermas estrechas',
        requestedById: resident1.id,
        requestedByName: 'Ing. Carlos Mendoza',
        requestedByRole: 'RESIDENTE_OBRA',
      },

      // Obra 4 (Recta de Daule - Pavimento Rígido)
      {
        code: 'SOL-MAT-009',
        projectId: project4.id,
        type: 'MATERIAL',
        materialItemId: p4Materials[1].id,
        materialName: 'Barras de Acero Lisas Pasa-Juntas 32mm x 45cm con Capuchón',
        requestedQty: 300,
        unit: 'unidad',
        neededDate: new Date('2026-09-02'),
        targetLocation: 'Carril Derecho Km 1+500 a 2+200',
        priority: 'ALTA',
        status: 'APROBADA',
        justification: 'Armado de canastillas pasa-juntas transversales para losa de hormigón MR-45',
        requestedById: resident2.id,
        requestedByName: 'Ing. Elena Velasco',
        requestedByRole: 'RESIDENTE_OBRA',
        reviewedById: adminUser.id,
        reviewedByName: 'Ing. Fernando Salazar',
        reviewedAt: new Date('2026-08-31'),
        reviewNotes: 'Aprobado. Despacho programado para primera jornada de fundición',
      },
      {
        code: 'SOL-MAT-010',
        projectId: project4.id,
        type: 'MATERIAL',
        materialItemId: p4Materials[5].id,
        materialName: 'Membrana Líquida Curadora Base Solvente Blanca',
        requestedQty: 25,
        unit: 'caneca',
        neededDate: new Date('2026-08-28'),
        targetLocation: 'Frente de Pavimentadora Slipform',
        priority: 'URGENTE',
        status: 'DESPACHADA',
        justification: 'Riego inmediato anti-evaporación sobre losa recién texturizada',
        requestedById: resident2.id,
        requestedByName: 'Ing. Elena Velasco',
        requestedByRole: 'RESIDENTE_OBRA',
        reviewedById: adminUser.id,
        reviewedByName: 'Ing. Fernando Salazar',
        reviewedAt: new Date('2026-08-27'),
        reviewNotes: 'Entregado en obra para cuadrilla de acabado',
      },
      {
        code: 'SOL-MAQ-005',
        projectId: project4.id,
        type: 'MAQUINARIA',
        machineryId: machineryCreated[10].id,
        machineryName: 'Pavimentadora de Asfalto/Concreto Vögele Super 1800-2',
        estimatedHours: 32,
        startDate: new Date('2026-09-08'),
        endDate: new Date('2026-09-12'),
        withOperator: true,
        targetLocation: 'Ampliación 4 carriles Recta Daule',
        priority: 'ALTA',
        status: 'PENDIENTE',
        justification: 'Tendido continuo de subbase asfáltica bajo losa de hormigón hidráulico',
        requestedById: resident2.id,
        requestedByName: 'Ing. Elena Velasco',
        requestedByRole: 'RESIDENTE_OBRA',
      },
      {
        code: 'SOL-MAT-011',
        projectId: project4.id,
        type: 'MATERIAL',
        materialItemId: p4Materials[3].id,
        materialName: 'Sellador Elástico Silicona Autonivelante para Juntas',
        requestedQty: 40,
        unit: 'caja',
        neededDate: new Date('2026-09-14'),
        targetLocation: 'Juntas de contracción cortadas a 24 horas',
        priority: 'NORMAL',
        status: 'PENDIENTE',
        justification: 'Sellado impermeable de juntas para evitar penetración de agua a la subbase',
        requestedById: resident2.id,
        requestedByName: 'Ing. Elena Velasco',
        requestedByRole: 'RESIDENTE_OBRA',
      },
    ],
  });

  console.log('✔ Solicitudes de obra registradas para las 4 obras (Pendientes, Aprobadas, Despachadas, En Uso, Rechazadas).');

  // 11. REGISTROS DE AUDITORÍA Y TRAZABILIDAD
  console.log('\n11. Generando pista de auditoría...');
  await prisma.auditLog.createMany({
    data: [
      { action: 'SISTEMA_REINICIO', entityType: 'System', entityId: 'sys-01', description: 'Reinicio y encerado de base de datos para inicio de producción oficial', userName: 'Ing. Fernando Salazar', userEmail: 'admin@licosa.com', userRole: 'ADMIN' },
      { action: 'PROYECTO_CREADO', entityType: 'Project', entityId: project1.id, description: 'Registro de obra vial: OBRA-VALLE-VIRGEN-01 ($5,939,620.30)', userName: 'Ing. Fernando Salazar', userEmail: 'admin@licosa.com', userRole: 'ADMIN' },
      { action: 'PROYECTO_CREADO', entityType: 'Project', entityId: project2.id, description: 'Registro de obra vial: OBRA-COLIMES-02 ($3,840,000.00)', userName: 'Ing. Fernando Salazar', userEmail: 'admin@licosa.com', userRole: 'ADMIN' },
      { action: 'PERSONAL_ASIGNADO', entityType: 'WorkerAssignment', entityId: 'asg-01', description: 'Asignación de Ing. Carlos Mendoza como Residente de Obra en OBRA-VALLE-VIRGEN-01', userName: 'Ing. Fernando Salazar', userEmail: 'admin@licosa.com', userRole: 'ADMIN' },
      { action: 'CONTRATISTA_VINCULADO', entityType: 'Contractor', entityId: contractorsCreated[1].id, description: 'Subcontrato asignado a ASFALTOS & PAVIMENTOS DEL LITORAL CÍA. LTDA. ($1,850,000)', userName: 'Ing. Fernando Salazar', userEmail: 'admin@licosa.com', userRole: 'ADMIN' },
      { action: 'REPORTE_EMITIDO', entityType: 'DailyReport', entityId: 'rep-24', description: 'Emisión y firma electrónica del Reporte Diario Oficial N° 24 en OBRA-VALLE-VIRGEN-01', userName: 'Ing. Carlos Mendoza', userEmail: 'residente.valle@licosa.com', userRole: 'RESIDENTE_OBRA' },
      { action: 'BODEGA_DESPACHO', entityType: 'StorageReceipt', entityId: receipt2.id, description: 'Despacho de 120 sacos de cemento a frente de drenajes con vale VALE-DESP-2026-014', userName: 'Lcdo. Jorge Alarcón', userEmail: 'bodeguero@licosa.com', userRole: 'BODEGUERO' },
      { action: 'SOLICITUD_APROBADA', entityType: 'WorkRequest', entityId: 'req-02', description: 'Aprobación de solicitud de tubería corrugada para paso de agua urgente', userName: 'Ing. Fernando Salazar', userEmail: 'admin@licosa.com', userRole: 'ADMIN' },
    ],
  });

  console.log('\n================================================================');
  console.log('✔ ¡SUPER DEMO CARGADA CON ÉXITO!');
  console.log('  - 4 Proyectos viales con rubros detallados');
  console.log('  - 17 Trabajadores en padrón y cuadrillas con control de traslado');
  console.log('  - 5 Empresas contratistas y consorcios con subcontratos');
  console.log('  - 12 Equipos pesados en flota (Excavadoras, Tractores, Volquetas)');
  console.log('  - 8 Reportes diarios secuenciales con curvas de avance acumulado');
  console.log('  - Bodegas por obra con stock de cemento, asfalto, acero y combustible');
  console.log('  - 5 Solicitudes de obra (Pendientes, Aprobadas, Despachadas)');
  console.log('  - Pista de auditoría completa');
  console.log('  - Credenciales de acceso: admin@licosa.com / admin123');
  console.log('================================================================\n');
}

main()
  .catch((e) => {
    console.error('Error durante la carga de demo:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
