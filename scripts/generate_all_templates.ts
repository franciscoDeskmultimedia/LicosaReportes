import ExcelJS from 'exceljs';
import path from 'path';

// Shared color tokens
const NAVY_DARK = 'FF0F172A';
const NAVY_HEADER = 'FF1E293B';
const NAVY_MUTED = 'FF334155';
const YELLOW_INPUT = 'FFFFFBEB'; // Soft yellow for user editable inputs
const YELLOW_BORDER = 'FFFDE68A';
const GREEN_FORMULA = 'FFECFDF5'; // Soft emerald for automatic formula results
const GREEN_BORDER = 'FFA7F3D0';
const GREEN_DEEP = 'FF047857';
const SLATE_BG = 'FFF8FAFC';
const SLATE_BORDER = 'FFE2E8F0';
const WHITE = 'FFFFFFFF';
const ACCENT_ORANGE = 'FFEA580C';

/**
 * Builds the complete, styled RDO (Reporte Diario de Obra) sheet
 */
function buildRdoWorksheet(wsRdo: ExcelJS.Worksheet) {
  wsRdo.views = [{ showGridLines: true }];

  // Column definitions:
  // A: Margin
  // B: Col 0 / Equipos / N° Rubro / Clave
  // C: Col 1 / Descripción / Valores
  // D: Col 2 / Unidad
  // E: Col 3 / P.U. / Cantidad día
  // F: Col 4 / Cantidad acum.
  // G: Col 5 / Horas día / Monto día ($)
  // H: Col 6 / Personal / Cargo / Tramo
  // I: Col 7 / Sub-tramo
  // J: Col 8 / Cantidad pers.
  // K: Col 9 / Horas-Hombre
  wsRdo.columns = [
    { width: 3 },  // A (padding)
    { width: 22 }, // B (Item / Equipment / RubroNum)
    { width: 44 }, // C (Description)
    { width: 10 }, // D (Unit)
    { width: 14 }, // E (P.U. / Cantidad día)
    { width: 15 }, // F (Cantidad acum.)
    { width: 18 }, // G (Monto día / Horas día)
    { width: 26 }, // H (Personal / Categoría / Tramo)
    { width: 14 }, // I (Detalle)
    { width: 12 }, // J (Cant. Personal)
    { width: 14 }, // K (H-H Día)
  ];

  // Helper border applicator
  function setRangeBorder(startCol: string, startR: number, endCol: string, endR: number, borderStyle: any = { style: 'thin', color: { argb: SLATE_BORDER } }) {
    const startCNum = startCol.charCodeAt(0) - 64;
    const endCNum = endCol.charCodeAt(0) - 64;
    for (let r = startR; r <= endR; r++) {
      for (let c = startCNum; c <= endCNum; c++) {
        const colLetter = String.fromCharCode(64 + c);
        const cell = wsRdo.getCell(`${colLetter}${r}`);
        cell.border = {
          top: borderStyle,
          bottom: borderStyle,
          left: borderStyle,
          right: borderStyle,
        };
      }
    }
  }

  // --- ROW 1: BANNER TITULAR ---
  wsRdo.getRow(1).height = 36;
  wsRdo.mergeCells('B1:K1');
  const rdoMainTitle = wsRdo.getCell('B1');
  rdoMainTitle.value = 'REPORTE DIARIO DE OBRA (RDO)';
  rdoMainTitle.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: WHITE } };
  rdoMainTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };
  rdoMainTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  // --- ROW 2: SUBTÍTULO DE OBRA ---
  wsRdo.getRow(2).height = 24;
  wsRdo.mergeCells('B2:K2');
  const rdoSubTitle = wsRdo.getCell('B2');
  rdoSubTitle.value = 'REHABILITACIÓN Y MEJORAMIENTO VIAL VALLE DE LA VIRGEN – LÍMITE PROVINCIAL';
  rdoSubTitle.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF94A3B8' } };
  rdoSubTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  rdoSubTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  // --- ROW 3 & 4: FICHA CABECERA ---
  wsRdo.getRow(3).height = 22;
  wsRdo.mergeCells('B3:D3');
  wsRdo.getCell('B3').value = 'CONTRATISTA: LICOSA S.A.';
  wsRdo.getCell('B3').font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: NAVY_MUTED } };

  wsRdo.mergeCells('E3:G3');
  wsRdo.getCell('E3').value = 'CONTRATANTE: GAD PROVINCIAL DEL GUAYAS';
  wsRdo.getCell('E3').font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: NAVY_MUTED } };

  wsRdo.mergeCells('H3:K3');
  wsRdo.getCell('H3').value = 'FISCALIZACIÓN: ASOCIACIÓN CONSULTORA VIAL';
  wsRdo.getCell('H3').font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: NAVY_MUTED } };

  wsRdo.getRow(4).height = 22;
  wsRdo.mergeCells('B4:D4');
  wsRdo.getCell('B4').value = 'EMPRESA EJECUTORA: LICOSA';
  wsRdo.getCell('B4').font = { name: 'Segoe UI', size: 9, color: { argb: 'FF475569' } };

  wsRdo.mergeCells('E4:G4');
  wsRdo.getCell('E4').value = 'CONTRATO N°: LIC-GADG-2024-019-OB';
  wsRdo.getCell('E4').font = { name: 'Segoe UI', size: 9, color: { argb: 'FF475569' } };

  wsRdo.mergeCells('H4:K4');
  wsRdo.getCell('H4').value = 'FINANCIAMIENTO: FONDOS FISCALES GADG';
  wsRdo.getCell('H4').font = { name: 'Segoe UI', size: 9, color: { argb: 'FF475569' } };

  setRangeBorder('B', 3, 'K', 4);

  // --- ROW 5: FECHA, NÚMERO Y TRAMO ---
  wsRdo.getRow(5).height = 26;
  const cFechaLabel = wsRdo.getCell('B5');
  cFechaLabel.value = 'FECHA:';
  cFechaLabel.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: WHITE } };
  cFechaLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  cFechaLabel.alignment = { horizontal: 'center', vertical: 'middle' };

  const cFechaVal = wsRdo.getCell('C5');
  cFechaVal.value = '2024-03-15';
  cFechaVal.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  cFechaVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };
  cFechaVal.alignment = { horizontal: 'center', vertical: 'middle' };

  const cRepNumLabel = wsRdo.getCell('D5');
  cRepNumLabel.value = 'REPORTE N°:';
  cRepNumLabel.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: WHITE } };
  cRepNumLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  cRepNumLabel.alignment = { horizontal: 'center', vertical: 'middle' };

  const cRepNumVal = wsRdo.getCell('E5');
  cRepNumVal.value = 33;
  cRepNumVal.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  cRepNumVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };
  cRepNumVal.alignment = { horizontal: 'center', vertical: 'middle' };

  const cTramoLabel = wsRdo.getCell('F5');
  cTramoLabel.value = 'TRAMO:';
  cTramoLabel.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: WHITE } };
  cTramoLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  cTramoLabel.alignment = { horizontal: 'center', vertical: 'middle' };

  wsRdo.mergeCells('G5:K5');
  const cTramoVal = wsRdo.getCell('G5');
  cTramoVal.value = 'Tramo 1: Km 0+000 al Km 14+800';
  cTramoVal.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF0F172A' } };
  cTramoVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };
  cTramoVal.alignment = { horizontal: 'left', vertical: 'middle' };

  setRangeBorder('B', 5, 'K', 5);

  // --- ROW 6: RESUMEN ECONÓMICO DEL DÍA ---
  wsRdo.getRow(6).height = 26;
  const cMontoLabel = wsRdo.getCell('B6');
  cMontoLabel.value = 'MONTO DE TRABAJOS EJECUTADOS';
  cMontoLabel.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: WHITE } };
  cMontoLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };
  cMontoLabel.alignment = { horizontal: 'left', vertical: 'middle' };

  const cMontoVal = wsRdo.getCell('C6');
  cMontoVal.value = { formula: 'G38', result: 15011.10 }; // Points to sum of rubros
  cMontoVal.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF065F46' } };
  cMontoVal.numFmt = '"$"#,##0.00';
  cMontoVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_FORMULA } };
  cMontoVal.alignment = { horizontal: 'right', vertical: 'middle' };

  const cAvanceLabel = wsRdo.getCell('D6');
  cAvanceLabel.value = '% AVANCE';
  cAvanceLabel.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: WHITE } };
  cAvanceLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };
  cAvanceLabel.alignment = { horizontal: 'center', vertical: 'middle' };

  const cAvanceVal = wsRdo.getCell('E6');
  cAvanceVal.value = 0.0025; // 0.25% del día
  cAvanceVal.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF065F46' } };
  cAvanceVal.numFmt = '0.00%';
  cAvanceVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_FORMULA } };
  cAvanceVal.alignment = { horizontal: 'right', vertical: 'middle' };

  const cPlazoLabel = wsRdo.getCell('F6');
  cPlazoLabel.value = 'DÍAS TRANSCURRIDOS / PLAZO:';
  cPlazoLabel.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: NAVY_MUTED } };
  cPlazoLabel.alignment = { horizontal: 'right', vertical: 'middle' };

  wsRdo.mergeCells('G6:K6');
  const cPlazoVal = wsRdo.getCell('G6');
  cPlazoVal.value = '33 / 180 días calendario';
  cPlazoVal.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF0F172A' } };
  cPlazoVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };
  cPlazoVal.alignment = { horizontal: 'left', vertical: 'middle' };

  setRangeBorder('B', 6, 'K', 6);

  // --- SECCIÓN 1: REPORTE DE CLIMA Y EHS ---
  wsRdo.getRow(8).height = 24;
  wsRdo.mergeCells('B8:K8');
  const s1Header = wsRdo.getCell('B8');
  s1Header.value = '1. REPORTE DE CLIMA Y EHS (SEGURIDAD, SALUD Y AMBIENTE)';
  s1Header.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: WHITE } };
  s1Header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  s1Header.alignment = { horizontal: 'left', vertical: 'middle' };

  const ehsRows = [
    { k1: 'Horas de lluvia (día)', v1: 0, k2: 'Tiempo charla diaria (min)', v2: 5 },
    { k1: 'Horas de lluvia (noche)', v1: 0, k2: 'Tiempo charla acum. (min)', v2: 165 },
    { k1: 'Horas perdidas por lluvia', v1: 0, k2: 'Incidentes (día / acum.)', v2: '0 / 0' },
    { k1: 'Horas perdidas acum. por lluvia', v1: 8.0, k2: 'Accidentes (día / acum.)', v2: '0 / 0' },
  ];

  ehsRows.forEach((r, idx) => {
    const rowNum = 9 + idx;
    wsRdo.getRow(rowNum).height = 20;

    wsRdo.mergeCells(`B${rowNum}:C${rowNum}`);
    const cK1 = wsRdo.getCell(`B${rowNum}`);
    cK1.value = r.k1;
    cK1.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF475569' } };
    cK1.alignment = { horizontal: 'left', vertical: 'middle' };

    const cV1 = wsRdo.getCell(`D${rowNum}`);
    cV1.value = r.v1;
    cV1.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF0F172A' } };
    cV1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };
    cV1.alignment = { horizontal: 'center', vertical: 'middle' };

    wsRdo.mergeCells(`E${rowNum}:G${rowNum}`);
    const cK2 = wsRdo.getCell(`E${rowNum}`);
    cK2.value = r.k2;
    cK2.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF475569' } };
    cK2.alignment = { horizontal: 'left', vertical: 'middle' };

    wsRdo.mergeCells(`H${rowNum}:K${rowNum}`);
    const cV2 = wsRdo.getCell(`H${rowNum}`);
    cV2.value = r.v2;
    cV2.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF0F172A' } };
    cV2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };
    cV2.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  setRangeBorder('B', 9, 'K', 12);

  // --- SECCIÓN 2 & 3: REPORTE DE EQUIPO Y PERSONAL ---
  wsRdo.getRow(14).height = 24;
  wsRdo.mergeCells('B14:G14');
  const eqHeader = wsRdo.getCell('B14');
  eqHeader.value = '2. REPORTE DE EQUIPO Y MAQUINARIA';
  eqHeader.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: WHITE } };
  eqHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  eqHeader.alignment = { horizontal: 'left', vertical: 'middle' };

  wsRdo.mergeCells('H14:K14');
  const persHeader = wsRdo.getCell('H14');
  persHeader.value = '3. REPORTE DE PERSONAL EN OBRA';
  persHeader.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: WHITE } };
  persHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_MUTED } };
  persHeader.alignment = { horizontal: 'left', vertical: 'middle' };

  // Subheaders Row 15
  wsRdo.getRow(15).height = 22;
  const eqSubHeaders = [
    { cell: 'B15', text: 'Descripción del equipo' },
    { cell: 'C15', text: 'Código / Serie' },
    { cell: 'D15', text: 'Unidad' },
    { cell: 'E15', text: 'Cant.' },
    { cell: 'F15', text: 'Valor/h ($)' },
    { cell: 'G15', text: 'Horas día' },
    { cell: 'H15', text: 'Categoría / Cargo' },
    { cell: 'I15', text: 'Turno' },
    { cell: 'J15', text: 'Cantidad' },
    { cell: 'K15', text: 'H-H Día' },
  ];

  eqSubHeaders.forEach((h) => {
    const c = wsRdo.getCell(h.cell);
    c.value = h.text;
    c.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const equipmentRows = [
    { desc: 'EXCAVADORA EX-09', code: 'EX09', unit: 'hora', qty: 1, rate: 45.0, hours: 8.0, role: 'Ingeniero Residente', shift: 'Diurno', pQty: 1, hh: 9.0 },
    { desc: 'RODILLO RL-15', code: 'RL15', unit: 'hora', qty: 1, rate: 38.0, hours: 9.4, role: 'Planilladora / Control', shift: 'Diurno', pQty: 1, hh: 8.5 },
    { desc: 'TRACTOR TR-09', code: 'TR09', unit: 'hora', qty: 1, rate: 55.0, hours: 4.8, role: 'Topógrafo', shift: 'Diurno', pQty: 1, hh: 8.0 },
    { desc: 'TRACTO MULAS', code: 'TM01', unit: 'unidad', qty: 9, rate: 35.0, hours: 7.0, role: 'Cadeneros', shift: 'Diurno', pQty: 2, hh: 16.0 },
    { desc: 'MULA VQ-12', code: 'VQ12', unit: 'unidad', qty: 3, rate: 28.0, hours: 8.0, role: 'Operador Excavadora', shift: 'Diurno', pQty: 2, hh: 16.0 },
    { desc: 'TRACTOR TR-08', code: 'TR08', unit: 'hora', qty: 1, rate: 55.0, hours: 5.5, role: 'Operador Rodillo', shift: 'Diurno', pQty: 1, hh: 9.4 },
    { desc: 'VOLQUETAS HINO (14m3)', code: 'VQ-FLOTA', unit: 'unidad', qty: 4, rate: 30.0, hours: 8.0, role: 'Choferes Volquetas', shift: 'Diurno', pQty: 4, hh: 32.0 },
    { desc: 'TANQUERO DE AGUA', code: 'TQ01', unit: 'hora', qty: 1, rate: 25.0, hours: 6.0, role: 'Ayudantes / Cuadrilla', shift: 'Diurno', pQty: 6, hh: 48.0 },
  ];

  equipmentRows.forEach((eq, idx) => {
    const rowNum = 16 + idx;
    wsRdo.getRow(rowNum).height = 20;

    // Equipos
    wsRdo.getCell(`B${rowNum}`).value = eq.desc;
    wsRdo.getCell(`B${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };
    wsRdo.getCell(`C${rowNum}`).value = eq.code;
    wsRdo.getCell(`C${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_BG } };
    wsRdo.getCell(`D${rowNum}`).value = eq.unit;
    wsRdo.getCell(`D${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_BG } };
    wsRdo.getCell(`E${rowNum}`).value = eq.qty;
    wsRdo.getCell(`E${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };
    wsRdo.getCell(`F${rowNum}`).value = eq.rate;
    wsRdo.getCell(`F${rowNum}`).numFmt = '"$"#,##0.00';
    wsRdo.getCell(`F${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };
    wsRdo.getCell(`G${rowNum}`).value = eq.hours;
    wsRdo.getCell(`G${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };

    // Personal
    wsRdo.getCell(`H${rowNum}`).value = eq.role;
    wsRdo.getCell(`H${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };
    wsRdo.getCell(`I${rowNum}`).value = eq.shift;
    wsRdo.getCell(`I${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_BG } };
    wsRdo.getCell(`J${rowNum}`).value = eq.pQty;
    wsRdo.getCell(`J${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };
    wsRdo.getCell(`K${rowNum}`).value = eq.hh;
    wsRdo.getCell(`K${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };

    // Formatting fonts & aligns
    ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].forEach((col) => {
      const c = wsRdo.getCell(`${col}${rowNum}`);
      c.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF0F172A' } };
      c.alignment = {
        horizontal: col === 'B' || col === 'H' ? 'left' : col === 'F' || col === 'G' || col === 'K' ? 'right' : 'center',
        vertical: 'middle',
      };
    });
  });

  setRangeBorder('B', 15, 'K', 23);

  // --- SECCIÓN 4: RUBROS PRINCIPALES DEL DÍA ---
  wsRdo.getRow(26).height = 24;
  wsRdo.mergeCells('B26:K26');
  const rHeader = wsRdo.getCell('B26');
  rHeader.value = '4. RUBROS DE OBRA EJECUTADOS EN EL DÍA';
  rHeader.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: WHITE } };
  rHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  rHeader.alignment = { horizontal: 'left', vertical: 'middle' };

  // Subheaders Rubros (Row 27)
  wsRdo.getRow(27).height = 22;
  const rubroSubHeaders = [
    { cell: 'B27', text: 'N° Rubro', align: 'center' },
    { cell: 'C27', text: 'Descripción del Rubro', align: 'left' },
    { cell: 'D27', text: 'Unid.', align: 'center' },
    { cell: 'E27', text: 'P.U. ($)', align: 'right' },
    { cell: 'F27', text: 'Cant. Día', align: 'right' },
    { cell: 'G27', text: 'Monto Día ($)', align: 'right' },
    { cell: 'H27', text: 'Tramo / Abscisado', align: 'left' },
    { cell: 'I27', text: 'Sentido', align: 'center' },
    { cell: 'J27', text: 'Desde (m)', align: 'right' },
    { cell: 'K27', text: 'Hasta (m)', align: 'right' },
  ];

  rubroSubHeaders.forEach((h) => {
    const c = wsRdo.getCell(h.cell);
    c.value = h.text;
    c.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };
    c.alignment = { horizontal: h.align as any, vertical: 'middle' };
  });

  // 9 sample daily rubros executed
  const dailyRubros = [
    { num: 4, desc: 'EXCAVACIÓN SIN CLASIFICAR CON MAQUINARIA', unit: 'm3', pu: 3.23, qty: 850.0, tramo: 'Km 2+400 al 2+900', sentido: 'L/D', desde: 2400, hasta: 2900 },
    { num: 5, desc: 'DESALOJO DE MATERIAL DE EXCAVACIÓN (HASTA 10 KM)', unit: 'm3', pu: 3.07, qty: 780.0, tramo: 'Km 2+400 al Botadero', sentido: 'L/I', desde: 2400, hasta: 3200 },
    { num: 6, desc: 'MEJORAMIENTO CON MATERIAL DE PRÉSTAMO IMPORTADO', unit: 'm3', pu: 5.28, qty: 672.3, tramo: 'Km 3+100 al 3+400', sentido: 'Eje', desde: 3100, hasta: 3400 },
    { num: 7, desc: 'TRANSPORTE DE MATERIAL DE PRÉSTAMO (ACARREO 30-65 KM)', unit: 'm3-km', pu: 0.32, qty: 15400.0, tramo: 'Ruta Mina - Obra', sentido: 'Eje', desde: 0, hasta: 45000 },
    { num: 8, desc: 'SUB-BASE CLASE 1 COMPACTADA', unit: 'm3', pu: 23.00, qty: 120.0, tramo: 'Km 1+200 al 1+450', sentido: 'L/D', desde: 1200, hasta: 1450 },
    { num: 10, desc: 'IMPRIMACIÓN ASFÁLTICA CON ASFALTO RC-250', unit: 'm2', pu: 1.85, qty: 1250.0, tramo: 'Km 0+800 al 1+200', sentido: 'Eje', desde: 800, hasta: 1200 },
    { num: 12, desc: 'ALCANTARILLAS TUBULARES DE H.A. D=1200 MM', unit: 'm', pu: 125.00, qty: 12.0, tramo: 'Abscisa Km 2+150', sentido: 'Transversal', desde: 2150, hasta: 2150 },
  ];

  dailyRubros.forEach((r, idx) => {
    const rowNum = 28 + idx;
    wsRdo.getRow(rowNum).height = 20;

    // Col B: Num
    wsRdo.getCell(`B${rowNum}`).value = r.num;
    wsRdo.getCell(`B${rowNum}`).font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: NAVY_MUTED } };
    wsRdo.getCell(`B${rowNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
    wsRdo.getCell(`B${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_BG } };

    // Col C: Desc
    wsRdo.getCell(`C${rowNum}`).value = r.desc;
    wsRdo.getCell(`C${rowNum}`).font = { name: 'Segoe UI', size: 9, color: { argb: 'FF0F172A' } };
    wsRdo.getCell(`C${rowNum}`).alignment = { horizontal: 'left', vertical: 'middle' };
    wsRdo.getCell(`C${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };

    // Col D: Unit
    wsRdo.getCell(`D${rowNum}`).value = r.unit;
    wsRdo.getCell(`D${rowNum}`).font = { name: 'Segoe UI', size: 9, color: { argb: 'FF475569' } };
    wsRdo.getCell(`D${rowNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
    wsRdo.getCell(`D${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };

    // Col E: PU
    wsRdo.getCell(`E${rowNum}`).value = r.pu;
    wsRdo.getCell(`E${rowNum}`).font = { name: 'Segoe UI', size: 9, color: { argb: 'FF0F172A' } };
    wsRdo.getCell(`E${rowNum}`).numFmt = '"$"#,##0.00';
    wsRdo.getCell(`E${rowNum}`).alignment = { horizontal: 'right', vertical: 'middle' };
    wsRdo.getCell(`E${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };

    // Col F: Qty
    wsRdo.getCell(`F${rowNum}`).value = r.qty;
    wsRdo.getCell(`F${rowNum}`).font = { name: 'Segoe UI', size: 9, color: { argb: 'FF0F172A' } };
    wsRdo.getCell(`F${rowNum}`).numFmt = '#,##0.00';
    wsRdo.getCell(`F${rowNum}`).alignment = { horizontal: 'right', vertical: 'middle' };
    wsRdo.getCell(`F${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };

    // Col G: Total (Formula: =E#*F#)
    const expectedTotal = r.pu * r.qty;
    wsRdo.getCell(`G${rowNum}`).value = { formula: `E${rowNum}*F${rowNum}`, result: expectedTotal };
    wsRdo.getCell(`G${rowNum}`).font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF065F46' } };
    wsRdo.getCell(`G${rowNum}`).numFmt = '"$"#,##0.00';
    wsRdo.getCell(`G${rowNum}`).alignment = { horizontal: 'right', vertical: 'middle' };
    wsRdo.getCell(`G${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_FORMULA } };

    // Col H: Tramo
    wsRdo.getCell(`H${rowNum}`).value = r.tramo;
    wsRdo.getCell(`H${rowNum}`).font = { name: 'Segoe UI', size: 8.5, color: { argb: 'FF334155' } };
    wsRdo.getCell(`H${rowNum}`).alignment = { horizontal: 'left', vertical: 'middle' };
    wsRdo.getCell(`H${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };

    // Col I: Sentido
    wsRdo.getCell(`I${rowNum}`).value = r.sentido;
    wsRdo.getCell(`I${rowNum}`).font = { name: 'Segoe UI', size: 8.5, color: { argb: 'FF334155' } };
    wsRdo.getCell(`I${rowNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
    wsRdo.getCell(`I${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_BG } };

    // Col J: Desde
    wsRdo.getCell(`J${rowNum}`).value = r.desde;
    wsRdo.getCell(`J${rowNum}`).font = { name: 'Segoe UI', size: 8.5, color: { argb: 'FF334155' } };
    wsRdo.getCell(`J${rowNum}`).alignment = { horizontal: 'right', vertical: 'middle' };
    wsRdo.getCell(`J${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_BG } };

    // Col K: Hasta
    wsRdo.getCell(`K${rowNum}`).value = r.hasta;
    wsRdo.getCell(`K${rowNum}`).font = { name: 'Segoe UI', size: 8.5, color: { argb: 'FF334155' } };
    wsRdo.getCell(`K${rowNum}`).alignment = { horizontal: 'right', vertical: 'middle' };
    wsRdo.getCell(`K${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_BG } };
  });

  const lastRubroRow = 27 + dailyRubros.length;
  setRangeBorder('B', 27, 'K', lastRubroRow);

  // SUBTOTAL ROW (Row 38)
  const totalRdoRow = lastRubroRow + 1;
  wsRdo.getRow(totalRdoRow).height = 28;
  wsRdo.mergeCells(`B${totalRdoRow}:F${totalRdoRow}`);
  const rdoTotalLabel = wsRdo.getCell(`B${totalRdoRow}`);
  rdoTotalLabel.value = 'SUBTOTAL MONTO DE TRABAJOS EJECUTADOS DEL DÍA:';
  rdoTotalLabel.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: WHITE } };
  rdoTotalLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };
  rdoTotalLabel.alignment = { horizontal: 'right', vertical: 'middle' };

  const rdoTotalVal = wsRdo.getCell(`G${totalRdoRow}`);
  const sumFormulaRdo = `SUM(G28:G${lastRubroRow})`;
  const expectedSumDay = dailyRubros.reduce((acc, r) => acc + (r.pu * r.qty), 0);
  rdoTotalVal.value = { formula: sumFormulaRdo, result: expectedSumDay };
  rdoTotalVal.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: WHITE } };
  rdoTotalVal.numFmt = '"$"#,##0.00';
  rdoTotalVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_DEEP } };
  rdoTotalVal.alignment = { horizontal: 'right', vertical: 'middle' };

  wsRdo.mergeCells(`H${totalRdoRow}:K${totalRdoRow}`);
  wsRdo.getCell(`H${totalRdoRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };

  // --- SECCIÓN 5: RESUMEN DE ACTIVIDADES REALIZADAS HOY ---
  const actTodayHeaderRow = totalRdoRow + 2;
  wsRdo.getRow(actTodayHeaderRow).height = 24;
  wsRdo.mergeCells(`B${actTodayHeaderRow}:K${actTodayHeaderRow}`);
  const actH = wsRdo.getCell(`B${actTodayHeaderRow}`);
  actH.value = '5. RESUMEN DE ACTIVIDADES REALIZADAS HOY';
  actH.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: WHITE } };
  actH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  actH.alignment = { horizontal: 'left', vertical: 'middle' };

  const activitiesToday = [
    { cat: 'VIAL / MOV. TIERRAS', det: 'Excavación sin clasificar, acarreo y desalojo continuo de material inadecuado hacia botadero.' },
    { cat: 'ESTRUCTURA DE PAVIMENTO', det: 'Tendido, hidratación y compactación de capa de sub-base clase 1 entre Km 1+200 y 1+450.' },
    { cat: 'DRENAJE', det: 'Instalación de tubería de hormigón armado D=1200mm y excavación para cabezal de descarga.' },
    { cat: 'TOPOGRAFÍA', det: 'Control de rasante, niveles de sub-base y replanteo de abscisas para tramo siguiente.' },
    { cat: 'AMBIENTAL Y SOCIAL', det: 'Riego con tanquero en frentes de poblados para mitigación de partículas de polvo.' },
  ];

  activitiesToday.forEach((a, idx) => {
    const rNum = actTodayHeaderRow + 1 + idx;
    wsRdo.getRow(rNum).height = 22;

    wsRdo.mergeCells(`B${rNum}:D${rNum}`);
    const cCat = wsRdo.getCell(`B${rNum}`);
    cCat.value = a.cat;
    cCat.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: NAVY_MUTED } };
    cCat.alignment = { horizontal: 'left', vertical: 'middle' };
    cCat.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_BG } };

    wsRdo.mergeCells(`E${rNum}:K${rNum}`);
    const cDet = wsRdo.getCell(`E${rNum}`);
    cDet.value = a.det;
    cDet.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF0F172A' } };
    cDet.alignment = { horizontal: 'left', vertical: 'middle' };
    cDet.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };
  });

  const lastActRow = actTodayHeaderRow + activitiesToday.length;
  setRangeBorder('B', actTodayHeaderRow + 1, 'K', lastActRow);

  // --- SECCIÓN 6: ACTIVIDADES A REALIZAR MAÑANA ---
  const actTomHeaderRow = lastActRow + 2;
  wsRdo.getRow(actTomHeaderRow).height = 24;
  wsRdo.mergeCells(`B${actTomHeaderRow}:K${actTomHeaderRow}`);
  const tomH = wsRdo.getCell(`B${actTomHeaderRow}`);
  tomH.value = '6. ACTIVIDADES PLANIFICADAS PARA MAÑANA';
  tomH.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: WHITE } };
  tomH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  tomH.alignment = { horizontal: 'left', vertical: 'middle' };

  wsRdo.getRow(actTomHeaderRow + 1).height = 28;
  wsRdo.mergeCells(`B${actTomHeaderRow + 1}:K${actTomHeaderRow + 1}`);
  const tomDet = wsRdo.getCell(`B${actTomHeaderRow + 1}`);
  tomDet.value = 'Continuación de colocación de material de préstamo importado y desalojo. Imprimación asfáltica en tramo preparado.';
  tomDet.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF0F172A' } };
  tomDet.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };
  tomDet.alignment = { horizontal: 'left', vertical: 'middle' };
  setRangeBorder('B', actTomHeaderRow + 1, 'K', actTomHeaderRow + 1);

  // --- SECCIÓN 7: NOVEDADES Y FIRMAS ---
  const signHeaderRow = actTomHeaderRow + 3;
  wsRdo.getRow(signHeaderRow).height = 45;
  wsRdo.mergeCells(`B${signHeaderRow}:E${signHeaderRow}`);
  const sign1 = wsRdo.getCell(`B${signHeaderRow}`);
  sign1.value = 'ELABORADO POR:\nIng. María Fernanda Ligua\nIngeniera de Planillas / Residente LICOSA';
  sign1.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: NAVY_MUTED } };
  sign1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  sign1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_BG } };

  wsRdo.mergeCells(`G${signHeaderRow}:K${signHeaderRow}`);
  const sign2 = wsRdo.getCell(`G${signHeaderRow}`);
  sign2.value = 'REVISADO Y APROBADO:\nIng. Jerson López\nFiscalizador de Obra - ASOCIACIÓN C-D';
  sign2.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: NAVY_MUTED } };
  sign2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  sign2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_BG } };

  setRangeBorder('B', signHeaderRow, 'E', signHeaderRow);
  setRangeBorder('G', signHeaderRow, 'K', signHeaderRow);
}

async function generateAllTemplates() {
  console.log('Iniciando generación de plantillas...');

  // ==========================================
  // 1. PLANTILLA COMPLETA DE PROYECTO + RDO EJEMPLO
  // ==========================================
  const wbProject = new ExcelJS.Workbook();
  wbProject.creator = 'LICOSA S.A.';
  wbProject.lastModifiedBy = 'Sistema Integral LICOSA';
  wbProject.created = new Date();

  // Tab 1: INSTRUCCIONES
  const wsInst = wbProject.addWorksheet('INSTRUCCIONES', { views: [{ showGridLines: true }] });
  wsInst.columns = [{ width: 4 }, { width: 28 }, { width: 55 }, { width: 30 }];

  wsInst.mergeCells('B2:D2');
  const t1 = wsInst.getCell('B2');
  t1.value = 'GUÍA DE LLENADO DE LA PLANTILLA OFICIAL LICOSA';
  t1.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: WHITE } };
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };
  t1.alignment = { horizontal: 'center', vertical: 'middle' };
  wsInst.getRow(2).height = 36;

  wsInst.mergeCells('B3:D3');
  const t2 = wsInst.getCell('B3');
  t2.value = 'Esta plantilla contiene la ficha contractual, el catálogo de rubros y un ejemplo completo de Reporte Diario (RDO).';
  t2.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF64748B' } };
  t2.alignment = { horizontal: 'center', vertical: 'middle' };
  wsInst.getRow(3).height = 22;

  // Leyenda de colores
  wsInst.mergeCells('B5:D5');
  wsInst.getCell('B5').value = '1. CÓDIGO DE COLORES ESTANDARIZADO';
  wsInst.getCell('B5').font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: NAVY_HEADER } };
  wsInst.getRow(5).height = 24;

  const legendItems = [
    { label: '🟡 CELDAS AMARILLAS', desc: 'Celdas editables. Ingrese los datos de su proyecto, precios, cantidades y avance del día.', fill: YELLOW_INPUT, bColor: YELLOW_BORDER, fColor: 'FF92400E' },
    { label: '🟢 CELDAS VERDES', desc: 'Fórmulas automáticas (Totales, Multiplicaciones, Porcentajes). Se calculan solas.', fill: GREEN_FORMULA, bColor: GREEN_BORDER, fColor: 'FF065F46' },
    { label: '🔵 ENCABEZADOS AZULES', desc: 'Títulos oficiales reconocidos por el importador automatizado.', fill: NAVY_HEADER, bColor: NAVY_DARK, fColor: WHITE },
  ];

  legendItems.forEach((item, idx) => {
    const rowNum = 6 + idx;
    wsInst.getRow(rowNum).height = 28;
    const c = wsInst.getCell(`B${rowNum}`);
    c.value = item.label;
    c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: item.fColor } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.fill } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = { top: { style: 'thin', color: { argb: item.bColor } }, bottom: { style: 'thin', color: { argb: item.bColor } }, left: { style: 'thin', color: { argb: item.bColor } }, right: { style: 'thin', color: { argb: item.bColor } } };

    wsInst.mergeCells(`C${rowNum}:D${rowNum}`);
    const dCell = wsInst.getCell(`C${rowNum}`);
    dCell.value = item.desc;
    dCell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF334155' } };
    dCell.alignment = { horizontal: 'left', vertical: 'middle' };
  });

  // Estructura de pestañas
  wsInst.mergeCells('B10:D10');
  wsInst.getCell('B10').value = '2. PESTAÑAS INCLUIDAS EN ESTE LIBRO';
  wsInst.getCell('B10').font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: NAVY_HEADER } };
  wsInst.getRow(10).height = 24;

  const tabDesc = [
    '• Pestaña "PROYECTO": Ficha técnica general de la obra (código, nombre, contrato, cliente y presupuesto).',
    '• Pestaña "Rubros": Catálogo maestro contractual con los 15 rubros viales típicos, P.U., volúmenes y totales.',
    '• Pestaña "RDO_Ejemplo": Formato oficial de Reporte Diario de Obra con control de equipo, personal, rubros del día y firmas.',
  ];

  tabDesc.forEach((t, i) => {
    const r = 11 + i;
    wsInst.getRow(r).height = 22;
    wsInst.mergeCells(`B${r}:D${r}`);
    wsInst.getCell(`B${r}`).value = t;
    wsInst.getCell(`B${r}`).font = { name: 'Segoe UI', size: 10, color: { argb: 'FF1E293B' } };
    wsInst.getCell(`B${r}`).alignment = { horizontal: 'left', vertical: 'middle' };
  });

  // Tab 2: PROYECTO
  const wsProj = wbProject.addWorksheet('PROYECTO', { views: [{ showGridLines: true }] });
  wsProj.columns = [{ width: 4 }, { width: 28 }, { width: 45 }, { width: 40 }];

  wsProj.mergeCells('B2:D2');
  const pTitle = wsProj.getCell('B2');
  pTitle.value = 'DATOS GENERALES Y CONTRACTUALES DEL PROYECTO';
  pTitle.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: WHITE } };
  pTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };
  pTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  wsProj.getRow(2).height = 34;

  wsProj.getRow(4).height = 26;
  ['CAMPO DEL SISTEMA', 'VALOR DEL PROYECTO', 'DESCRIPCIÓN / RECOMENDACIÓN'].forEach((h, idx) => {
    const col = String.fromCharCode(66 + idx);
    const cell = wsProj.getCell(`${col}4`);
    cell.value = h;
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
  });

  const projectFields = [
    { campo: 'Codigo', valor: 'OBRA-VALLE-VIRGEN-01', desc: 'Código único de la obra (ej: OBRA-2024-001)', isF: false },
    { campo: 'Nombre', valor: 'Rehabilitación y Mejoramiento Vial Valle de la Virgen', desc: 'Nombre descriptivo completo', isF: false },
    { campo: 'Contratista', valor: 'LICOSA, Licitaciones y Contratos S.A.', desc: 'Razón social del contratista', isF: false },
    { campo: 'Cliente', valor: 'GAD PROVINCIAL DEL GUAYAS', desc: 'Entidad contratante o fiscalizadora', isF: false },
    { campo: 'Fiscalizacion', valor: 'ASOCIACIÓN CONSULTORA VIAL DEL GUAYAS', desc: 'Fiscalización de obra', isF: false },
    { campo: 'Empresa Ejecutora', valor: 'LICOSA S.A.', desc: 'Empresa ejecutora', isF: false },
    { campo: 'Numero de Contrato', valor: 'LIC-GADG-2024-019-OB', desc: 'Número contractual oficial', isF: false },
    { campo: 'Financiamiento', valor: 'FONDOS FISCALES GAD GUAYAS', desc: 'Fuente de recursos', isF: false },
    { campo: 'Tramo', valor: 'Tramo 1: Km 0+000 al Km 14+800', desc: 'Segmento vial de ejecución', isF: false },
    { campo: 'Monto Contractual', valor: { formula: 'Rubros!G20', result: 2463509.20 }, desc: 'Total contractual (=Suma de Rubros)', isF: true, fmt: '"$"#,##0.00' },
    { campo: 'Plazo (dias)', valor: 180, desc: 'Plazo en días calendario', isF: false, fmt: '#,##0' },
    { campo: 'Fecha de Inicio', valor: '2024-03-01', desc: 'Fecha orden de inicio (AAAA-MM-DD)', isF: false },
  ];

  projectFields.forEach((item, idx) => {
    const rowNum = 5 + idx;
    wsProj.getRow(rowNum).height = 24;

    const c1 = wsProj.getCell(`B${rowNum}`);
    c1.value = item.campo;
    c1.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: NAVY_MUTED } };
    c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_BG } };

    const c2 = wsProj.getCell(`C${rowNum}`);
    c2.value = item.valor;
    c2.font = { name: 'Segoe UI', size: 10, bold: item.isF, color: { argb: item.isF ? 'FF065F46' : 'FF0F172A' } };
    c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.isF ? GREEN_FORMULA : YELLOW_INPUT } };
    if (item.fmt) c2.numFmt = item.fmt;

    const c3 = wsProj.getCell(`D${rowNum}`);
    c3.value = item.desc;
    c3.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };

    ['B', 'C', 'D'].forEach((col) => {
      wsProj.getCell(`${col}${rowNum}`).border = {
        top: { style: 'thin', color: { argb: SLATE_BORDER } },
        bottom: { style: 'thin', color: { argb: SLATE_BORDER } },
        left: { style: 'thin', color: { argb: SLATE_BORDER } },
        right: { style: 'thin', color: { argb: SLATE_BORDER } },
      };
    });
  });

  // Tab 3: Rubros
  const wsRubros = wbProject.addWorksheet('Rubros', { views: [{ showGridLines: true }] });
  wsRubros.columns = [
    { width: 4 }, { width: 8 }, { width: 55 }, { width: 12 }, { width: 18 }, { width: 20 }, { width: 22 }, { width: 16 }
  ];

  wsRubros.mergeCells('B2:H2');
  const rTitle = wsRubros.getCell('B2');
  rTitle.value = 'PRESUPUESTO CONTRACTUAL Y CATÁLOGO DE RUBROS DE OBRA';
  rTitle.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: WHITE } };
  rTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };
  rTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  wsRubros.getRow(2).height = 34;

  const rHeaders = [
    { col: 'B', text: 'N°', align: 'center' },
    { col: 'C', text: 'DESCRIPCIÓN DEL RUBRO', align: 'left' },
    { col: 'D', text: 'UNIDAD', align: 'center' },
    { col: 'E', text: 'P.U. ($)', align: 'right' },
    { col: 'F', text: 'CANTIDAD', align: 'right' },
    { col: 'G', text: 'TOTAL ($)', align: 'right' },
    { col: 'H', text: 'TIPO', align: 'center' },
  ];

  wsRubros.getRow(4).height = 26;
  rHeaders.forEach((h) => {
    const c = wsRubros.getCell(`${h.col}4`);
    c.value = h.text;
    c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
    c.alignment = { horizontal: h.align as any, vertical: 'middle' };
  });

  const sampleRubros = [
    { num: 1, desc: 'REPLANTEO Y TRAZADO VIAL', unit: 'm2', pu: 1.10, qty: 68680.00, principal: false },
    { num: 2, desc: 'DESBROCE, DESBOSQUE Y LIMPIEZA DE TERRENO', unit: 'Ha', pu: 493.20, qty: 15.50, principal: false },
    { num: 3, desc: 'DEMOLICIÓN DE ESTRUCTURAS DE HORMIGÓN EXISTENTES', unit: 'm3', pu: 27.94, qty: 240.00, principal: false },
    { num: 4, desc: 'EXCAVACIÓN SIN CLASIFICAR CON MAQUINARIA', unit: 'm3', pu: 3.23, qty: 25400.00, principal: true },
    { num: 5, desc: 'DESALOJO DE MATERIAL DE EXCAVACIÓN (HASTA 10 KM)', unit: 'm3', pu: 3.07, qty: 22900.00, principal: true },
    { num: 6, desc: 'MEJORAMIENTO CON MATERIAL DE PRÉSTAMO IMPORTADO', unit: 'm3', pu: 5.28, qty: 56700.00, principal: true },
    { num: 7, desc: 'TRANSPORTE DE MATERIAL DE PRÉSTAMO (ACARREO 30-65 KM)', unit: 'm3-km', pu: 0.32, qty: 1850000.00, principal: true },
    { num: 8, desc: 'SUB-BASE CLASE 1 COMPACTADA', unit: 'm3', pu: 23.00, qty: 10250.00, principal: true },
    { num: 9, desc: 'BASE GRANULAR TRITURADA CLASE 1', unit: 'm3', pu: 27.50, qty: 8900.00, principal: true },
    { num: 10, desc: 'IMPRIMACIÓN ASFÁLTICA CON ASFALTO RC-250', unit: 'm2', pu: 1.85, qty: 45000.00, principal: true },
    { num: 11, desc: 'CARPETA DE HORMIGÓN ASFÁLTICO EN CALIENTE E=3"', unit: 'm2', pu: 14.80, qty: 45000.00, principal: true },
    { num: 12, desc: 'ALCANTARILLAS TUBULARES DE H.A. D=1200 MM', unit: 'm', pu: 125.00, qty: 180.00, principal: true },
    { num: 13, desc: 'CABEZALES DE ENTRADA Y SALIDA PARA ALCANTARILLAS', unit: 'u', pu: 850.00, qty: 12.00, principal: false },
    { num: 14, desc: 'SEÑALIZACIÓN HORIZONTAL CON PINTURA TERMOPLÁSTICA', unit: 'm', pu: 4.20, qty: 14800.00, principal: true },
    { num: 15, desc: 'SEÑALIZACIÓN VERTICAL REGLAMENTARIA Y PREVENTIVA', unit: 'u', pu: 110.00, qty: 48.00, principal: false },
  ];

  sampleRubros.forEach((r, idx) => {
    const rowNum = 5 + idx;
    wsRubros.getRow(rowNum).height = 22;

    wsRubros.getCell(`B${rowNum}`).value = r.num;
    wsRubros.getCell(`B${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_BG } };
    wsRubros.getCell(`B${rowNum}`).alignment = { horizontal: 'center', vertical: 'middle' };

    wsRubros.getCell(`C${rowNum}`).value = r.desc;
    wsRubros.getCell(`C${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };

    wsRubros.getCell(`D${rowNum}`).value = r.unit;
    wsRubros.getCell(`D${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };
    wsRubros.getCell(`D${rowNum}`).alignment = { horizontal: 'center', vertical: 'middle' };

    wsRubros.getCell(`E${rowNum}`).value = r.pu;
    wsRubros.getCell(`E${rowNum}`).numFmt = '"$"#,##0.00';
    wsRubros.getCell(`E${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };
    wsRubros.getCell(`E${rowNum}`).alignment = { horizontal: 'right', vertical: 'middle' };

    wsRubros.getCell(`F${rowNum}`).value = r.qty;
    wsRubros.getCell(`F${rowNum}`).numFmt = '#,##0.00';
    wsRubros.getCell(`F${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };
    wsRubros.getCell(`F${rowNum}`).alignment = { horizontal: 'right', vertical: 'middle' };

    wsRubros.getCell(`G${rowNum}`).value = { formula: `E${rowNum}*F${rowNum}`, result: r.pu * r.qty };
    wsRubros.getCell(`G${rowNum}`).numFmt = '"$"#,##0.00';
    wsRubros.getCell(`G${rowNum}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF065F46' } };
    wsRubros.getCell(`G${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_FORMULA } };
    wsRubros.getCell(`G${rowNum}`).alignment = { horizontal: 'right', vertical: 'middle' };

    wsRubros.getCell(`H${rowNum}`).value = r.principal ? 'Principal' : 'Normal';
    wsRubros.getCell(`H${rowNum}`).font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: r.principal ? ACCENT_ORANGE : 'FF64748B' } };
    wsRubros.getCell(`H${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_BG } };
    wsRubros.getCell(`H${rowNum}`).alignment = { horizontal: 'center', vertical: 'middle' };

    ['B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach((col) => {
      wsRubros.getCell(`${col}${rowNum}`).border = {
        top: { style: 'thin', color: { argb: SLATE_BORDER } },
        bottom: { style: 'thin', color: { argb: SLATE_BORDER } },
        left: { style: 'thin', color: { argb: SLATE_BORDER } },
        right: { style: 'thin', color: { argb: SLATE_BORDER } },
      };
    });
  });

  // Total Presupuesto
  const lastItemRow = 4 + sampleRubros.length;
  const totalRow = lastItemRow + 1;
  wsRubros.getRow(totalRow).height = 30;

  wsRubros.mergeCells(`B${totalRow}:F${totalRow}`);
  const totalLabel = wsRubros.getCell(`B${totalRow}`);
  totalLabel.value = 'PRESUPUESTO TOTAL ESTIMADO DE LA OBRA:';
  totalLabel.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: WHITE } };
  totalLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };
  totalLabel.alignment = { horizontal: 'right', vertical: 'middle' };

  const totalVal = wsRubros.getCell(`G${totalRow}`);
  const expectedSum = sampleRubros.reduce((acc, r) => acc + (r.pu * r.qty), 0);
  totalVal.value = { formula: `SUM(G5:G${lastItemRow})`, result: expectedSum };
  totalVal.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: WHITE } };
  totalVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_DEEP } };
  totalVal.numFmt = '"$"#,##0.00';
  totalVal.alignment = { horizontal: 'right', vertical: 'middle' };

  wsRubros.getCell(`H${totalRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };

  // Tab 4: RDO_Ejemplo (inside project template)
  const wsRdoEjemplo = wbProject.addWorksheet('RDO_Ejemplo');
  buildRdoWorksheet(wsRdoEjemplo);

  const projectTemplatePath = path.join(process.cwd(), 'public', 'plantillas', 'Plantilla_Carga_Licosa.xlsx');
  await wbProject.xlsx.writeFile(projectTemplatePath);
  console.log('✅ Plantilla de Proyecto (con pestaña RDO_Ejemplo) guardada en:', projectTemplatePath);

  // ==========================================
  // 2. PLANTILLA INDIVIDUAL DEDICADA DE REPORTE DIARIO (RDO)
  // ==========================================
  const wbRdo = new ExcelJS.Workbook();
  wbRdo.creator = 'LICOSA S.A.';
  wbRdo.lastModifiedBy = 'Sistema Integral LICOSA';
  wbRdo.created = new Date();

  // Tab 1: INSTRUCCIONES RDO
  const wsRdoInst = wbRdo.addWorksheet('INSTRUCCIONES_RDO', { views: [{ showGridLines: true }] });
  wsRdoInst.columns = [{ width: 4 }, { width: 30 }, { width: 55 }, { width: 30 }];

  wsRdoInst.mergeCells('B2:D2');
  const rdoInstTitle = wsRdoInst.getCell('B2');
  rdoInstTitle.value = 'GUÍA DE LLENADO DE REPORTE DIARIO DE OBRA (RDO)';
  rdoInstTitle.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: WHITE } };
  rdoInstTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };
  rdoInstTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  wsRdoInst.getRow(2).height = 36;

  wsRdoInst.mergeCells('B4:D4');
  wsRdoInst.getCell('B4').value = '1. CÓDIGO DE COLORES';
  wsRdoInst.getCell('B4').font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: NAVY_HEADER } };

  const rdoLegend = [
    { label: '🟡 CELDAS AMARILLAS', desc: 'Edite aquí la fecha, horas de maquinaria, personal y volúmenes ejecutados en el día.', fill: YELLOW_INPUT, bColor: YELLOW_BORDER, fColor: 'FF92400E' },
    { label: '🟢 CELDAS VERDES', desc: 'Fórmulas automáticas de totales y montos calculados. No modificarlas.', fill: GREEN_FORMULA, bColor: GREEN_BORDER, fColor: 'FF065F46' },
    { label: '🔵 ENCABEZADOS AZULES', desc: 'Estructura oficial LICOSA compatible con la sincronización por Excel.', fill: NAVY_HEADER, bColor: NAVY_DARK, fColor: WHITE },
  ];

  rdoLegend.forEach((item, idx) => {
    const rowNum = 5 + idx;
    wsRdoInst.getRow(rowNum).height = 28;
    const c = wsRdoInst.getCell(`B${rowNum}`);
    c.value = item.label;
    c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: item.fColor } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.fill } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };

    wsRdoInst.mergeCells(`C${rowNum}:D${rowNum}`);
    const dCell = wsRdoInst.getCell(`C${rowNum}`);
    dCell.value = item.desc;
    dCell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF334155' } };
    dCell.alignment = { horizontal: 'left', vertical: 'middle' };
  });

  // Tab 2: RDO (Official format)
  const wsRdoOfficial = wbRdo.addWorksheet('RDO');
  buildRdoWorksheet(wsRdoOfficial);

  const rdoTemplatePath = path.join(process.cwd(), 'public', 'plantillas', 'Plantilla_Reporte_Diario_Licosa.xlsx');
  await wbRdo.xlsx.writeFile(rdoTemplatePath);
  console.log('✅ Plantilla dedicada de Reporte Diario guardada en:', rdoTemplatePath);
}

generateAllTemplates().catch(console.error);
