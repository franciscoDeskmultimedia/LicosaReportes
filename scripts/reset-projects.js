const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetProjects() {
  console.log('🚀 Iniciando proceso de encerado de proyectos...');

  // 1. Contar registros actuales
  const projectCount = await prisma.project.count();
  const reportsCount = await prisma.dailyReport.count();

  console.log(`📊 Se encontraron ${projectCount} obras y ${reportsCount} reportes diarios.`);

  // 2. Eliminar todas las obras (Cascade borra automáticamente rubros, reportes, despachos y bitácoras de obra)
  const deletedProjects = await prisma.project.deleteMany({});
  console.log(`✅ ${deletedProjects.count} proyectos eliminados en cascada.`);

  // 3. Encerar las horas trabajadas acumuladas de toda la maquinaria a 0
  const updatedMachinery = await prisma.machinery.updateMany({
    data: {
      totalHoursWorked: 0,
    },
  });
  console.log(`🚜 ${updatedMachinery.count} maquinarias reseteadas a 0 horas trabajadas.`);

  // 4. Limpiar solicitudes de obra si quedara alguna huerfana
  await prisma.workRequest.deleteMany({});

  // 5. Verificar usuarios
  const userCount = await prisma.user.count();
  console.log(`👤 Usuarios del sistema preservados: ${userCount} usuarios activos.`);

  console.log('\n✨ ¡La aplicación ha quedado encerada con éxito! Puedes comenzar a cargar tus obras desde cero.');
}

resetProjects()
  .catch((err) => {
    console.error('❌ Error durante el encerado:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
