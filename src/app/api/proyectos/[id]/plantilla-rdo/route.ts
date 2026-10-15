import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateStyledRdoWorkbook, ProjectTemplateInfo, RubroItem } from '@/lib/excelRdoGenerator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        rubros: {
          orderBy: { rubroNumber: 'asc' },
        },
        dailyReports: {
          orderBy: { reportNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!project) {
      return new NextResponse('Proyecto no encontrado', { status: 404 });
    }

    const nextReportNumber = (project.dailyReports[0]?.reportNumber || 0) + 1;
    const projectInfo: ProjectTemplateInfo = {
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

    const rubrosList: RubroItem[] = project.rubros.map((r) => ({
      rubroNumber: r.rubroNumber,
      description: r.description,
      unit: r.unit,
      unitPrice: r.unitPrice,
      contractQuantity: r.currentQuantity || r.initialQuantity || 0,
      contractTotal: (r.currentQuantity || r.initialQuantity || 0) * (r.unitPrice || 0),
      isPrincipal: r.isPrincipal,
    }));

    const fileBuffer = await generateStyledRdoWorkbook(projectInfo, rubrosList);

    const safeName = (project.code || project.name || 'Proyecto')
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .slice(0, 30);
    const fileName = `RDO_Plantilla_${safeName}_R${nextReportNumber}.xlsx`;

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error generando plantilla RDO para proyecto:', error);
    return new NextResponse(`Error al generar la plantilla: ${error?.message || 'Error interno'}`, {
      status: 500,
    });
  }
}
