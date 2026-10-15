import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateStyledRdoWorkbook, ProjectTemplateInfo, RubroItem } from '@/lib/excelRdoGenerator';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    let projectInfo: ProjectTemplateInfo = {};
    let rubrosList: RubroItem[] = [];

    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          rubros: { orderBy: { rubroNumber: 'asc' } },
          dailyReports: { orderBy: { reportNumber: 'desc' }, take: 1 },
        },
      });

      if (project) {
        const nextReportNumber = (project.dailyReports[0]?.reportNumber || 0) + 1;
        projectInfo = {
          id: project.id,
          code: project.code,
          name: project.name,
          contractor: project.contractor || 'LICOSA, LICITACIONES Y CONTRATOS S.A.',
          client: project.client || '',
          inspectionCompany: project.inspectionCompany || '',
          contractNumber: project.contractNumber || '',
          roadSection: project.roadSection || '',
          contractAmount: project.contractAmount || 0,
          totalDays: project.durationDays || 240,
          startDate: project.startDate ? project.startDate.toISOString().split('T')[0] : '',
          reportNumber: nextReportNumber,
          reportDate: new Date().toISOString().split('T')[0],
        };

        rubrosList = project.rubros.map((r) => ({
          rubroNumber: r.rubroNumber,
          description: r.description,
          unit: r.unit,
          unitPrice: r.unitPrice,
          contractQuantity: r.currentQuantity || r.initialQuantity || 0,
          contractTotal: (r.currentQuantity || r.initialQuantity || 0) * (r.unitPrice || 0),
          isPrincipal: r.isPrincipal,
        }));
      }
    }

    const fileBuffer = await generateStyledRdoWorkbook(projectInfo, rubrosList);

    // Guardar copia en public/plantillas para persistencia estática
    try {
      const publicDir = path.join(process.cwd(), 'public', 'plantillas');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      fs.writeFileSync(path.join(publicDir, 'Plantilla_Reporte_Diario_Licosa.xlsx'), fileBuffer);
    } catch (saveErr) {
      console.warn('Advertencia guardando copia física de plantilla:', saveErr);
    }

    const filename = projectId && projectInfo.code
      ? `Plantilla_RDO_${projectInfo.code}.xlsx`
      : 'Plantilla_Reporte_Diario_Licosa.xlsx';

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error generando Plantilla Reporte Diario:', error);
    return new NextResponse(`Error al generar la plantilla: ${error?.message || 'Error interno'}`, {
      status: 500,
    });
  }
}
