import { generateStyledRdoWorkbook } from '../src/lib/excelRdoGenerator';
import { analyzeExcelBuffer } from '../src/lib/actions/excelSync';
import { prisma } from '../src/lib/prisma';

async function testSync() {
  console.log('🧪 Iniciando prueba de sincronización con RDO Multi-Pestaña...');

  // 1. Obtener o crear un proyecto base
  let project = await prisma.project.findFirst({
    include: { rubros: true },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        code: 'OBRA-TEST-CANAL',
        name: 'CONSTRUCCION DE CANAL SECUNDARIO (METROPOLIS) - ALTERNATIVA VERANO',
        contractor: 'LICOSA, LICITACIONES Y CONTRATOS S.A.',
        client: 'FIDEICOMISO NARCISA PLAZA (FIDEVAL S.A.)',
        inspectionCompany: 'ING. EMILIANO SORNOZA CASTILLO',
        executingCompany: 'LICOSA',
        contractNumber: 'LICOSA-CANAL-2026',
        financingSource: 'PROPIO',
        roadSection: '0+000 - 0+943.30 (Alternativa Verano)',
        contractAmount: 450000,
        durationDays: 150,
        startDate: new Date('2026-04-21'),
        rubros: {
          create: [
            { rubroNumber: 10, description: '[NC_19] Excavacion en fango e=0.40m', unit: 'm3', unitPrice: 4.67, initialQuantity: 1000, currentQuantity: 1000, isPrincipal: true },
            { rubroNumber: 30, description: '[R-30] Relleno con material de sitio (incl. cargada y transporte)', unit: 'm3', unitPrice: 7.81, initialQuantity: 500, currentQuantity: 500, isPrincipal: true },
            { rubroNumber: 33, description: '[R-33] Bombeo', unit: 'dia', unitPrice: 69.62, initialQuantity: 30, currentQuantity: 30, isPrincipal: true },
          ],
        },
      },
      include: { rubros: true },
    });
    console.log('Proyecto de prueba creado:', project.name);
  }

  // 2. Generar el buffer de la plantilla con los rubros del proyecto
  const rubrosList = project.rubros.map((r) => ({
    rubroNumber: r.rubroNumber,
    description: r.description,
    unit: r.unit,
    unitPrice: r.unitPrice,
    isPrincipal: r.isPrincipal,
  }));

  const excelBuffer = await generateStyledRdoWorkbook(
    {
      id: project.id,
      code: project.code,
      name: project.name,
      contractor: project.contractor,
      client: project.client,
      inspectionCompany: project.inspectionCompany,
      roadSection: project.roadSection,
      contractAmount: project.contractAmount,
      totalDays: project.durationDays,
      reportNumber: 1,
      reportDate: '2026-09-12',
    },
    rubrosList
  );

  console.log('📦 Buffer de RDO generado. Tamaño:', excelBuffer.length, 'bytes');

  // 3. Analizar el buffer con analyzeExcelBuffer
  const analysis = await analyzeExcelBuffer(excelBuffer, 'RDO_Test.xlsx', project.id, 'auto');

  console.log('✅ Resultado del análisis:');
  console.log('- Total fechas encontradas:', analysis.totalDatesFound);
  console.log('- Pestañas detectadas:', analysis.detectedSheets.length);
  if (analysis.items.length > 0) {
    const item = analysis.items[0];
    console.log('  * Fecha:', item.date);
    console.log('  * N° Reporte:', item.reportNumber);
    console.log('  * Estado:', item.status, item.statusLabel);
    console.log('  * Fuente:', item.sourceSheet);
    console.log('  * Maquinarias encontradas:', item.machineryCount);
  }
}

testSync()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error en test:', err);
    process.exit(1);
  });
