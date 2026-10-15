import { NextResponse } from 'next/server';
import { generateStyledMasterTemplate } from '@/lib/excelRdoGenerator';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const fileBuffer = await generateStyledMasterTemplate();

    // Guardar copia estática para respaldo
    try {
      const publicDir = path.join(process.cwd(), 'public', 'plantillas');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      fs.writeFileSync(path.join(publicDir, 'Plantilla_Maestra_Licosa.xlsx'), fileBuffer);
    } catch (saveErr) {
      console.warn('Advertencia guardando copia de Plantilla_Maestra_Licosa.xlsx:', saveErr);
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Plantilla_Maestra_Licosa.xlsx"',
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error generando plantilla maestra:', error);
    return new NextResponse(`Error al generar la plantilla: ${error?.message || 'Error interno'}`, {
      status: 500,
    });
  }
}

