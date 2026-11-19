import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { OFFICIAL_PLANILLA_01 } from '@/data/planillas/default-planillas';

export async function GET() {
  try {
    const wb = XLSX.utils.book_new();

    // Hoja 1: SABANA PLANILLA
    const headers = [
      'ITEM',
      'CODIGO',
      'DESCRIPCION DEL RUBRO',
      'UNIDAD',
      'CANTIDAD CONTRATO',
      'PRECIO UNITARIO ($)',
      'TOTAL CONTRATO ($)',
      'CANTIDAD ESTE PERIODO',
      'VALOR ESTE PERIODO ($)',
      'CANTIDAD ACUMULADA',
      'VALOR ACUMULADO ($)',
      '% AVANCE',
    ];

    const dataRows = OFFICIAL_PLANILLA_01.items.map((it) => [
      it.itemNumber,
      it.code || '',
      it.description,
      it.unit,
      it.contractQuantity,
      it.unitPrice,
      it.contractTotal,
      it.periodQuantity,
      it.periodAmount,
      it.accumQuantity,
      it.accumAmount,
      it.progressPercent,
    ]);

    const wsData = [
      ['PREFECTURA DEL GUAYAS - SABANA DE PLANILLA DE AVANCE DE OBRA'],
      ['CONTRATO: EC-PREFGUAYAS-527225-CW-RFB', '', '', '', 'CONTRATISTA: CONSORCIO VALLE DE LA VIRGEN'],
      ['PERIODO: DEL 28 DE AGOSTO AL 26 DE SEPTIEMBRE', '', '', '', 'MONTO CONTRATO: $12,104,252.06'],
      [],
      headers,
      ...dataRows,
      [],
      ['', '', 'SUBTOTAL PLANILLA:', '', '', '', '', '', OFFICIAL_PLANILLA_01.subtotal],
      ['', '', 'IVA 15%:', '', '', '', '', '', OFFICIAL_PLANILLA_01.ivaAmount],
      ['', '', 'AMORTIZACION ANTICIPO 20%:', '', '', '', '', '', -OFFICIAL_PLANILLA_01.advanceDeductionAmount],
      ['', '', 'TOTAL A COBRAR:', '', '', '', '', '', OFFICIAL_PLANILLA_01.netToPay],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Ajustar anchos de columnas
    ws['!cols'] = [
      { wch: 8 },  // ITEM
      { wch: 14 }, // CODIGO
      { wch: 45 }, // DESCRIPCION
      { wch: 8 },  // UNIDAD
      { wch: 18 }, // CANT CONTRATO
      { wch: 18 }, // P.U.
      { wch: 20 }, // TOTAL CONTRATO
      { wch: 22 }, // CANT ESTE PERIODO
      { wch: 22 }, // VALOR ESTE PERIODO
      { wch: 20 }, // CANT ACUMULADA
      { wch: 20 }, // VALOR ACUMULADO
      { wch: 12 }, // % AVANCE
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'SABANA');

    const fileBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Plantilla_Sabana_Avance_Licosa.xlsx"',
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    return new NextResponse(`Error generando plantilla: ${err.message}`, { status: 500 });
  }
}

