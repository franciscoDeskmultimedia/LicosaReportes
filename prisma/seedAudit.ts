import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany();
  const valleProject = projects.find(p => p.code === 'OBRA-VALLE-VIRGEN-01') || projects[0];
  const colimesProject = projects.find(p => p.code === 'OBRA-COLIMES-02') || projects[1];

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const residente = await prisma.user.findFirst({ where: { email: 'jerson.lopez@licosa.com' } });
  const bodeguero = await prisma.user.findFirst({ where: { email: 'segundo.plua@licosa.com' } });
  const mixto = await prisma.user.findFirst({ where: { email: 'roberto.mixto@licosa.com' } });

  const initialLogs = [
    {
      action: 'PROYECTO_CREADO',
      entityType: 'Project',
      entityId: valleProject?.id,
      description: `Creación y configuración inicial de obra vial: [${valleProject?.code}] ${valleProject?.name}`,
      userId: admin?.id,
      userName: admin?.name || 'Ing. Carlos Mendoza',
      userEmail: admin?.email || 'admin@licosa.com',
      userRole: 'ADMIN',
      projectId: valleProject?.id,
      metadata: JSON.stringify({ code: valleProject?.code, contractAmount: valleProject?.contractAmount }),
      createdAt: new Date('2026-09-01T08:30:00Z'),
    },
    {
      action: 'PROYECTO_CREADO',
      entityType: 'Project',
      entityId: colimesProject?.id,
      description: `Creación y configuración inicial de obra vial: [${colimesProject?.code}] ${colimesProject?.name}`,
      userId: admin?.id,
      userName: admin?.name || 'Ing. Carlos Mendoza',
      userEmail: admin?.email || 'admin@licosa.com',
      userRole: 'ADMIN',
      projectId: colimesProject?.id,
      metadata: JSON.stringify({ code: colimesProject?.code, contractAmount: colimesProject?.contractAmount }),
      createdAt: new Date('2026-09-05T09:15:00Z'),
    },
    {
      action: 'INGRESO_BODEGA',
      entityType: 'StorageReceipt',
      description: 'Ingreso de materiales según comprobante N° CMP-2026-001 (PETROECUADOR - Refinería La Libertad), recibido por Segundo Plúa (1 ítem: 10,000 gl Cemento Asfáltico AC-20)',
      userId: bodeguero?.id,
      userName: bodeguero?.name || 'Segundo Plúa',
      userEmail: bodeguero?.email || 'segundo.plua@licosa.com',
      userRole: 'BODEGUERO',
      projectId: valleProject?.id,
      metadata: JSON.stringify({ receiptNumber: 'CMP-2026-001', supplier: 'PETROECUADOR', invoiceTotal: 28500.00 }),
      createdAt: new Date('2026-09-15T10:14:00Z'),
    },
    {
      action: 'INGRESO_BODEGA',
      entityType: 'StorageReceipt',
      description: 'Ingreso de materiales según comprobante N° CMP-2026-002 (HOLCIM ECUADOR S.A.), recibido por Segundo Plúa (1 ítem: 600 sacos Cemento Pórtland Tipo IP)',
      userId: bodeguero?.id,
      userName: bodeguero?.name || 'Segundo Plúa',
      userEmail: bodeguero?.email || 'segundo.plua@licosa.com',
      userRole: 'BODEGUERO',
      projectId: valleProject?.id,
      metadata: JSON.stringify({ receiptNumber: 'CMP-2026-002', supplier: 'HOLCIM ECUADOR S.A.', invoiceTotal: 5100.00 }),
      createdAt: new Date('2026-09-18T14:30:00Z'),
    },
    {
      action: 'DESPACHO_BODEGA',
      entityType: 'StorageMovement',
      description: 'Despacho de 1,200 gl de "Cemento Asfáltico AC-20" hacia frente: Tramo 1 - Imprimación asfáltica Abscisa 0+800 a 1+400. Entregado a: Chofer Distribuidor Asfalto',
      userId: bodeguero?.id,
      userName: bodeguero?.name || 'Segundo Plúa',
      userEmail: bodeguero?.email || 'segundo.plua@licosa.com',
      userRole: 'BODEGUERO',
      projectId: valleProject?.id,
      metadata: JSON.stringify({ quantity: 1200, unit: 'galones', targetWorkFront: 'Tramo 1 - Imprimación asfáltica' }),
      createdAt: new Date('2026-09-20T08:45:00Z'),
    },
    {
      action: 'REAJUSTE_RUBRO',
      entityType: 'RubroAdjustment',
      description: 'Reajuste de rubro N° 8 (COMPLEMENTARY_CONTRACT): cambio de +12000.00 m3. Motivo: Incremento por ampliación de paquete estructural de sub-base granular tramo La Primavera. Ref: OFICIO-MTOP-044-2026. Aprobado por: Fiscalización Ing. Fernando Viteri',
      userId: admin?.id,
      userName: admin?.name || 'Ing. Carlos Mendoza',
      userEmail: admin?.email || 'admin@licosa.com',
      userRole: 'ADMIN',
      projectId: valleProject?.id,
      metadata: JSON.stringify({ rubroNumber: 8, quantityChange: 12000, documentRef: 'OFICIO-MTOP-044-2026' }),
      createdAt: new Date('2026-09-21T09:00:00Z'),
    },
    {
      action: 'REPORTE_DIARIO_CREADO',
      entityType: 'DailyReport',
      description: 'Emisión de Reporte Diario N° 24 (Fecha: 2026-09-21, Tramo: Valle de la Virgen - San Pedro) - Avance día: $21,388.51 (11.11% acum.)',
      userId: residente?.id,
      userName: residente?.name || 'Ing. Jerson López',
      userEmail: residente?.email || 'jerson.lopez@licosa.com',
      userRole: 'RESIDENTE_OBRA',
      projectId: valleProject?.id,
      metadata: JSON.stringify({ reportNumber: 24, totalExecutedDay: 21388.51, totalExecutedAccum: 660032.12, progressPercentAccum: 11.11 }),
      createdAt: new Date('2026-09-21T18:30:00Z'),
    },
    {
      action: 'USUARIO_MODIFICADO',
      entityType: 'User',
      entityId: mixto?.id,
      description: 'Modificación de perfil y permisos del usuario: Ing. Roberto Mixto (roberto.mixto@licosa.com). Configuración de rol granular por obra: Bodeguero en Valle de la Virgen, Residente en Colimes',
      userId: admin?.id,
      userName: admin?.name || 'Ing. Carlos Mendoza',
      userEmail: admin?.email || 'admin@licosa.com',
      userRole: 'ADMIN',
      projectId: null,
      metadata: JSON.stringify({
        userId: mixto?.id,
        assignments: [
          { project: valleProject?.code, role: 'BODEGUERO' },
          { project: colimesProject?.code, role: 'RESIDENTE_OBRA' },
        ],
      }),
      createdAt: new Date('2026-09-22T17:40:00Z'),
    },
    {
      action: 'INICIO_SESION',
      entityType: 'User',
      entityId: admin?.id,
      description: 'Inicio de sesión exitoso en la plataforma: Ing. Carlos Mendoza (ADMIN)',
      userId: admin?.id,
      userName: admin?.name || 'Ing. Carlos Mendoza',
      userEmail: admin?.email || 'admin@licosa.com',
      userRole: 'ADMIN',
      projectId: null,
      metadata: JSON.stringify({ role: 'ADMIN' }),
      createdAt: new Date('2026-09-22T20:10:00Z'),
    },
  ];

  for (const log of initialLogs) {
    await prisma.auditLog.create({
      data: log,
    });
  }

  console.log(`Se insertaron ${initialLogs.length} registros de auditoría iniciales.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
