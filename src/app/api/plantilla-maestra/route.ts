import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'plantillas', 'Plantilla_Maestra_Licosa.xlsx');

  if (!fs.existsSync(filePath)) {
    return new NextResponse('Archivo de plantilla unificada no encontrado', { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Plantilla_Maestra_Licosa.xlsx"',
      'Content-Length': fileBuffer.length.toString(),
    },
  });
}
