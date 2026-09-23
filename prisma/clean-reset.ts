/**
 * SCRIPT PARA ENCERAR (RESET) LA BASE DE DATOS A CERO
 * 
 * USO:
 *   npm run db:reset-clean
 * 
 * Este script borra todas las obras, rubros, kardex de bodega, reportes diarios,
 * solicitudes de obra, asignaciones de personal y contratistas.
 * 
 * PRESERVA ÚNICAMENTE:
 *   - El usuario Administrador del sistema: admin@licosa.com (contraseña: admin123)
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('====================================================');
  console.log('  LICOSA - PROCEDIMIENTO DE ENCERADO DE BASE DE DATOS');
  console.log('====================================================');
  console.log('Iniciando limpieza total...');

  // 1. Limpieza de tablas dependientes y transaccionales
  console.log('1. Eliminando registros de reportes diarios...');
  await prisma.dailyReportMachinery.deleteMany({});
  await prisma.dailyReportPersonnel.deleteMany({});
  await prisma.dailyRubroExecution.deleteMany({});
  await prisma.dailyHourlyWeather.deleteMany({});
  await prisma.dailyReport.deleteMany({});

  console.log('2. Eliminando movimientos y comprobantes de bodega...');
  await prisma.storageMovement.deleteMany({});
  await prisma.storageReceipt.deleteMany({});
  await prisma.materialItem.deleteMany({});

  console.log('3. Eliminando solicitudes de obra (materiales y maquinaria)...');
  await prisma.workRequest.deleteMany({});

  console.log('4. Eliminando asignaciones y personal...');
  await prisma.workerAssignment.deleteMany({});
  await prisma.worker.deleteMany({});

  console.log('5. Eliminando contratistas y asignaciones...');
  await prisma.projectContractorAssignment.deleteMany({});
  await prisma.contractor.deleteMany({});

  console.log('6. Eliminando reajustes y rubros contractuales...');
  await prisma.rubroAdjustment.deleteMany({});
  await prisma.projectRubro.deleteMany({});

  console.log('7. Eliminando asignaciones de usuarios a proyectos...');
  await prisma.userProjectAssignment.deleteMany({});

  console.log('8. Eliminando bitácora de auditoría histórica...');
  await prisma.auditLog.deleteMany({});

  console.log('9. Eliminando obras viales / proyectos...');
  await prisma.project.deleteMany({});

  console.log('10. Verificando / creando usuario Administrador...');
  // Borrar usuarios secundarios (conservar o recrear solo admin)
  await prisma.user.deleteMany({
    where: { email: { not: 'admin@licosa.com' } },
  });

  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
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

  console.log('====================================================');
  console.log('✓ BASE DE DATOS ENCERADA EXITOSAMENTE A CERO.');
  console.log('  - Todas las obras y transacciones fueron eliminadas.');
  console.log('  - Puedes iniciar sesión con: admin@licosa.com / admin123');
  console.log('  - Ya puedes crear tu primera obra desde cero en /proyectos.');
  console.log('====================================================');
}

main()
  .catch((e) => {
    console.error('Error al encerar base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
