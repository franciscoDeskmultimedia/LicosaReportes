import ExcelJS from 'exceljs';

export interface RubroItem {
  rubroNumber: number;
  description: string;
  unit: string;
  unitPrice: number;
  contractQuantity?: number;
  contractTotal?: number;
  isPrincipal?: boolean;
}

export interface ProjectTemplateInfo {
  id?: string;
  code?: string;
  name?: string;
  contractor?: string;
  client?: string;
  inspectionCompany?: string;
  contractNumber?: string;
  roadSection?: string;
  contractAmount?: number;
  totalDays?: number;
  startDate?: string;
  reportNumber?: number;
  reportDate?: string;
}

// Estilos corporativos LICOSA
const COLOR_HEADER_DARK = 'FF1B365D';     // Navy oscuro
const COLOR_HEADER_MID = 'FF2F5597';      // Azul corporativo tablas
const COLOR_SUBHEADER_BG = 'FFD9E1F2';    // Azul muy suave
const COLOR_INPUT_YELLOW = 'FFFFF2CC';    // Amarillo suave para celdas editables
const COLOR_BORDER_GRAY = 'FFD9D9D9';     // Borde suave
const COLOR_BORDER_BLUE = 'FF2F5597';     // Borde corporativo

function applyTitleHeader(
  ws: ExcelJS.Worksheet,
  title: string,
  subtitle?: string,
  colSpan = 7
) {
  // Fila 1: Título Principal
  const r1 = ws.getRow(1);
  r1.height = 28;
  ws.mergeCells(1, 1, 1, colSpan);
  const c1 = ws.getCell(1, 1);
  c1.value = title;
  c1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLOR_HEADER_DARK },
  };
  c1.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  c1.alignment = { horizontal: 'center', vertical: 'middle' };

  if (subtitle) {
    // Fila 2: Subtítulo
    const r2 = ws.getRow(2);
    r2.height = 22;
    ws.mergeCells(2, 1, 2, colSpan);
    const c2 = ws.getCell(2, 1);
    c2.value = subtitle;
    c2.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLOR_SUBHEADER_BG },
    };
    c2.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_HEADER_DARK } };
    c2.alignment = { horizontal: 'center', vertical: 'middle' };
  }
}

function styleEditableCell(cell: ExcelJS.Cell) {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLOR_INPUT_YELLOW },
  };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
    left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
    bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
    right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  };
}

function styleReadOnlyCell(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: 'thin', color: { argb: COLOR_BORDER_GRAY } },
    left: { style: 'thin', color: { argb: COLOR_BORDER_GRAY } },
    bottom: { style: 'thin', color: { argb: COLOR_BORDER_GRAY } },
    right: { style: 'thin', color: { argb: COLOR_BORDER_GRAY } },
  };
}

function styleTableHeader(cell: ExcelJS.Cell, text: string) {
  cell.value = text;
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLOR_HEADER_MID },
  };
  cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FF1F4E79' } },
    left: { style: 'thin', color: { argb: 'FF1F4E79' } },
    bottom: { style: 'thin', color: { argb: 'FF1F4E79' } },
    right: { style: 'thin', color: { argb: 'FF1F4E79' } },
  };
}

export async function generateStyledRdoWorkbook(
  projectInfo: ProjectTemplateInfo,
  rubrosList: RubroItem[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LICOSA Sistema de Reportes';
  wb.lastModifiedBy = 'LICOSA Automatización';
  wb.created = new Date();
  wb.modified = new Date();

  const projName = projectInfo.name || 'CONSTRUCCIÓN DE INFRAESTRUCTURA Y VIALIDAD - LICOSA';
  const contractor = projectInfo.contractor || 'LICOSA, LICITACIONES Y CONTRATOS S.A.';
  const client = projectInfo.client || 'CLIENTE CONTRATANTE';
  const inspection = projectInfo.inspectionCompany || 'ING. FISCALIZADOR';
  const roadSection = projectInfo.roadSection || 'km 0+000 al km 5+000';
  const reportNumber = projectInfo.reportNumber || 1;
  const reportDate = projectInfo.reportDate || new Date().toISOString().split('T')[0];
  const contractAmount = projectInfo.contractAmount || 0;
  const totalDays = projectInfo.totalDays || 240;

  // =========================================================================
  // PESTAÑA 0: DATOS GENERALES
  // =========================================================================
  const ws0 = wb.addWorksheet('0. GENERAL', { views: [{ showGridLines: true }] });
  applyTitleHeader(ws0, 'REPORTE DIARIO DE OBRA', projName.toUpperCase(), 6);

  ws0.columns = [
    { width: 28 }, // A
    { width: 22 }, // B
    { width: 24 }, // C
    { width: 18 }, // D
    { width: 26 }, // E
    { width: 35 }, // F
  ];

  // Fila 3: Ficha
  ws0.getRow(4).values = ['CONTRATISTA:', contractor, 'CONTRATANTE:', client, 'FISCALIZACION:', inspection];
  ws0.getRow(4).font = { name: 'Calibri', size: 9, bold: true };
  ws0.getRow(5).values = ['FECHA (YYYY-MM-DD):', reportDate, 'REPORTE N°:', reportNumber, 'TRAMO / SEGMENTO:', roadSection];
  ws0.getRow(5).font = { name: 'Calibri', size: 9, bold: true };
  ws0.getRow(6).values = ['MONTO TRABAJOS DÍA ($):', 0, '% AVANCE:', 0, 'DÍAS TRANSCURRIDOS / PLAZO:', `1 / ${totalDays}`];
  ws0.getRow(6).font = { name: 'Calibri', size: 9, bold: true };

  // Bordes y estilo de celdas clave
  for (let r = 4; r <= 6; r++) {
    ws0.getRow(r).height = 20;
    for (let c = 1; c <= 6; c++) {
      const cell = ws0.getCell(r, c);
      styleReadOnlyCell(cell);
      if ([1, 3, 5].includes(c)) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      }
    }
  }
  styleEditableCell(ws0.getCell(5, 2)); // Fecha
  styleEditableCell(ws0.getCell(5, 4)); // Reporte N°
  styleEditableCell(ws0.getCell(5, 6)); // Tramo
  styleEditableCell(ws0.getCell(6, 2)); // Monto día
  styleEditableCell(ws0.getCell(6, 4)); // % avance

  ws0.getCell(6, 2).numFmt = '"$"#,##0.00';
  ws0.getCell(6, 4).numFmt = '0.00%';

  // Guía rápida en hoja 0
  ws0.getCell(8, 1).value = 'ESTRUCTURA DE PESTAÑAS DEL REPORTE DIARIO:';
  ws0.getCell(8, 1).font = { bold: true, size: 10, color: { argb: COLOR_HEADER_DARK } };
  const guia = [
    ['Pestaña 1. CLIMA Y EHS', 'Ingrese horas de lluvia, tiempo de charlas EHS y registro de incidentes'],
    ['Pestaña 2. EQUIPO', 'Detalle de maquinaria operativa, unidad, cantidad y horas trabajadas en el día'],
    ['Pestaña 3. PERSONAL', 'Personal desplegado por categoría y horas-hombre laboradas en la jornada'],
    ['Pestaña 4. RUBROS DEL DÍA', 'Catálogo pre-llenado con los rubros de la obra. Ingrese solo la Cantidad del Día'],
    ['Pestaña 5. AVANCE ECONÓMICO', 'Resumen consolidado de avance económico contractual y financiero'],
    ['Pestaña 6. ACTIVIDADES HOY', 'Detalle descriptivo de actividades por frente (Vial, Drenaje, Estructuras, etc.)'],
    ['Pestaña 7. ACTIVIDADES MAÑANA', 'Planificación y trabajos programados para el siguiente día laboral'],
    ['Pestaña 8. NOVEDADES Y RIESGOS', 'Novedades, paralizaciones por causas externas o riesgos de seguridad GDO'],
    ['Pestaña 9. COMENTARIOS', 'Observaciones del Contratista y de la Fiscalización'],
    ['Pestaña 10. CLIMA HORARIO', 'Registro de condiciones meteorológicas en franjas de 2 horas (códigos 1 a 4)'],
    ['Pestaña 11. FIRMAS', 'Nombres y cargos del elaborador, revisor y fiscalizador'],
    ['Pestaña CATÁLOGO RUBROS', 'Referencia técnica de rubros contratados con precios unitarios oficiales'],
  ];
  let gRow = 9;
  for (const [tab, desc] of guia) {
    ws0.getCell(gRow, 1).value = tab;
    ws0.getCell(gRow, 1).font = { bold: true, size: 9 };
    ws0.getCell(gRow, 2).value = desc;
    ws0.getCell(gRow, 2).font = { size: 9 };
    gRow++;
  }

  // =========================================================================
  // PESTAÑA 1: 1. CLIMA Y EHS
  // =========================================================================
  const ws1 = wb.addWorksheet('1. CLIMA Y EHS', { views: [{ showGridLines: true }] });
  applyTitleHeader(ws1, '1. REPORTE DE CLIMA Y EHS (SEGURIDAD, SALUD Y AMBIENTE)', undefined, 4);
  ws1.columns = [{ width: 34 }, { width: 16 }, { width: 34 }, { width: 16 }];

  const ehsData = [
    ['Horas de lluvia (dia)', 0, 'Tiempo charla diaria (min)', 5],
    ['Horas de lluvia (noche)', 0, 'Tiempo charla acum. (min)', 10],
    ['Horas perdidas por lluvia', 0, 'Incidentes (dia / acum.)', '0/0'],
    ['Horas perdidas acum. por lluvia', 0, 'Accidentes (dia / acum.)', '0/0'],
  ];

  ehsData.forEach((row, i) => {
    const rIdx = i + 2;
    const r = ws1.getRow(rIdx);
    r.height = 20;
    r.values = row;
    for (let c = 1; c <= 4; c++) {
      const cell = ws1.getCell(rIdx, c);
      if (c === 1 || c === 3) {
        cell.font = { name: 'Calibri', size: 9.5 };
        styleReadOnlyCell(cell);
      } else {
        cell.font = { name: 'Calibri', size: 10, bold: true };
        cell.alignment = { horizontal: 'center' };
        styleEditableCell(cell);
      }
    }
  });

  // =========================================================================
  // PESTAÑA 2: 2. EQUIPO
  // =========================================================================
  const ws2 = wb.addWorksheet('2. EQUIPO', { views: [{ showGridLines: true }] });
  applyTitleHeader(ws2, '2. REPORTE DE EQUIPO', undefined, 4);
  ws2.columns = [
    { width: 44 }, // Descripción
    { width: 14 }, // Unidad
    { width: 16 }, // Cantidad
    { width: 16 }, // Horas día
  ];

  ws2.getRow(2).height = 22;
  styleTableHeader(ws2.getCell(2, 1), 'Descripción del equipo');
  styleTableHeader(ws2.getCell(2, 2), 'Unidad');
  styleTableHeader(ws2.getCell(2, 3), 'Cantidad');
  styleTableHeader(ws2.getCell(2, 4), 'Horas dia');

  const defaultEquipment = [
    ['EXCAVADORA (CONSBER)', 'hr', 1, 8],
    ['EXCAVADORA VOLVO EX06', 'hr', 1, 6],
    ['VOLQUETA VQ-32', 'hr', 1, 8],
    ['TRACTOR TR-08', 'hr', 0, 0],
    ['RODILLO RL-16', 'hr', 0, 0],
    ['TANQUERO DE AGUA TQ-01', 'hr', 0, 0],
  ];

  let eqRow = 3;
  for (const [desc, un, qty, hrs] of defaultEquipment) {
    ws2.getRow(eqRow).height = 19;
    ws2.getCell(eqRow, 1).value = desc;
    ws2.getCell(eqRow, 2).value = un;
    ws2.getCell(eqRow, 3).value = qty;
    ws2.getCell(eqRow, 4).value = hrs;

    styleReadOnlyCell(ws2.getCell(eqRow, 1));
    styleReadOnlyCell(ws2.getCell(eqRow, 2));
    ws2.getCell(eqRow, 2).alignment = { horizontal: 'center' };

    styleEditableCell(ws2.getCell(eqRow, 3));
    ws2.getCell(eqRow, 3).alignment = { horizontal: 'center' };
    styleEditableCell(ws2.getCell(eqRow, 4));
    ws2.getCell(eqRow, 4).alignment = { horizontal: 'center' };
    eqRow++;
  }

  // 10 filas libres listas para escribir equipos adicionales
  for (let i = 0; i < 10; i++) {
    ws2.getRow(eqRow).height = 19;
    styleReadOnlyCell(ws2.getCell(eqRow, 1));
    styleReadOnlyCell(ws2.getCell(eqRow, 2));
    ws2.getCell(eqRow, 2).value = 'hr';
    ws2.getCell(eqRow, 2).alignment = { horizontal: 'center' };
    styleEditableCell(ws2.getCell(eqRow, 3));
    ws2.getCell(eqRow, 3).alignment = { horizontal: 'center' };
    styleEditableCell(ws2.getCell(eqRow, 4));
    ws2.getCell(eqRow, 4).alignment = { horizontal: 'center' };
    eqRow++;
  }

  // =========================================================================
  // PESTAÑA 3: 3. PERSONAL
  // =========================================================================
  const ws3 = wb.addWorksheet('3. PERSONAL', { views: [{ showGridLines: true }] });
  applyTitleHeader(ws3, '3. REPORTE DE PERSONAL', undefined, 3);
  ws3.columns = [
    { width: 44 }, // Categoría / Cargo
    { width: 14 }, // N°
    { width: 18 }, // H-Hombre dia
  ];

  ws3.getRow(2).height = 22;
  styleTableHeader(ws3.getCell(2, 1), 'Categoria / Cargo');
  styleTableHeader(ws3.getCell(2, 2), 'N°');
  styleTableHeader(ws3.getCell(2, 3), 'H-Hombre dia');

  const defaultPersonnel = [
    ['Residente - Ing. Gustavo Berrezueta', 1, 8],
    ['Topografo -', 1, 8],
    ['Cadenero -', 1, 8],
    ['Ayudante Geotextil -', 1, 8],
    ['Operador de Excavadora -', 1, 8],
    ['Chofer de Volqueta -', 1, 8],
  ];

  let pRow = 3;
  for (const [cargo, qty, hrs] of defaultPersonnel) {
    ws3.getRow(pRow).height = 19;
    ws3.getCell(pRow, 1).value = cargo;
    ws3.getCell(pRow, 2).value = qty;
    ws3.getCell(pRow, 3).value = hrs;

    styleReadOnlyCell(ws3.getCell(pRow, 1));
    styleEditableCell(ws3.getCell(pRow, 2));
    ws3.getCell(pRow, 2).alignment = { horizontal: 'center' };
    styleEditableCell(ws3.getCell(pRow, 3));
    ws3.getCell(pRow, 3).alignment = { horizontal: 'center' };
    pRow++;
  }

  // 10 filas libres
  for (let i = 0; i < 10; i++) {
    ws3.getRow(pRow).height = 19;
    styleReadOnlyCell(ws3.getCell(pRow, 1));
    styleEditableCell(ws3.getCell(pRow, 2));
    ws3.getCell(pRow, 2).alignment = { horizontal: 'center' };
    styleEditableCell(ws3.getCell(pRow, 3));
    ws3.getCell(pRow, 3).alignment = { horizontal: 'center' };
    pRow++;
  }

  // =========================================================================
  // PESTAÑA 4: 4. RUBROS DEL DÍA (PRE-LLENADA CON LOS RUBROS CONTRACTUALES)
  // =========================================================================
  const ws4 = wb.addWorksheet('4. RUBROS DEL DÍA', { views: [{ showGridLines: true }] });
  applyTitleHeader(ws4, '4. RUBROS PRINCIPALES DEL DÍA', undefined, 7);
  ws4.columns = [
    { width: 12 }, // N° Rubro
    { width: 48 }, // Descripción (auto)
    { width: 10 }, // Unid.
    { width: 14 }, // Cant. día
    { width: 14 }, // Cant. acum.
    { width: 16 }, // Monto día ($)
    { width: 16 }, // Monto acum. ($)
  ];

  ws4.getRow(2).height = 22;
  styleTableHeader(ws4.getCell(2, 1), 'N° Rubro');
  styleTableHeader(ws4.getCell(2, 2), 'Descripción (auto)');
  styleTableHeader(ws4.getCell(2, 3), 'Unid.');
  styleTableHeader(ws4.getCell(2, 4), 'Cant. día');
  styleTableHeader(ws4.getCell(2, 5), 'Cant. acum.');
  styleTableHeader(ws4.getCell(2, 6), 'Monto día ($)');
  styleTableHeader(ws4.getCell(2, 7), 'Monto acum. ($)');

  const rubrosToPrint: RubroItem[] =
    rubrosList && rubrosList.length > 0
      ? rubrosList
      : [
          { rubroNumber: 10, description: '[NC_19] Excavacion en fango e=0.40m', unit: 'm3', unitPrice: 4.67, isPrincipal: true },
          { rubroNumber: 30, description: '[R-30] Relleno con material de sitio (incl. cargada y transporte)', unit: 'm3', unitPrice: 7.81, isPrincipal: true },
          { rubroNumber: 33, description: '[R-33] Bombeo', unit: 'dia', unitPrice: 69.62, isPrincipal: true },
        ];

  let rRow = 3;
  const startRubroRow = 3;
  for (const item of rubrosToPrint) {
    ws4.getRow(rRow).height = 19;
    ws4.getCell(rRow, 1).value = item.rubroNumber;
    ws4.getCell(rRow, 1).alignment = { horizontal: 'center' };
    ws4.getCell(rRow, 2).value = item.description;
    ws4.getCell(rRow, 3).value = item.unit;
    ws4.getCell(rRow, 3).alignment = { horizontal: 'center' };

    // Cant. día editable (AMARILLO)
    const cDay = ws4.getCell(rRow, 4);
    cDay.value = 0;
    cDay.numFmt = '#,##0.00';
    cDay.alignment = { horizontal: 'right' };
    styleEditableCell(cDay);

    // Cant. acum editable o calculada
    const cAcum = ws4.getCell(rRow, 5);
    cAcum.value = 0;
    cAcum.numFmt = '#,##0.00';
    cAcum.alignment = { horizontal: 'right' };
    styleReadOnlyCell(cAcum);

    // Monto día ($) = Cant. día * P.U.
    const mDay = ws4.getCell(rRow, 6);
    if (item.unitPrice && item.unitPrice > 0) {
      mDay.value = { formula: `D${rRow}*${item.unitPrice}`, result: 0 };
    } else {
      mDay.value = 0;
    }
    mDay.numFmt = '"$"#,##0.00';
    mDay.alignment = { horizontal: 'right' };
    styleReadOnlyCell(mDay);

    // Monto acum ($)
    const mAcum = ws4.getCell(rRow, 7);
    if (item.unitPrice && item.unitPrice > 0) {
      mAcum.value = { formula: `E${rRow}*${item.unitPrice}`, result: 0 };
    } else {
      mAcum.value = 0;
    }
    mAcum.numFmt = '"$"#,##0.00';
    mAcum.alignment = { horizontal: 'right' };
    styleReadOnlyCell(mAcum);

    styleReadOnlyCell(ws4.getCell(rRow, 1));
    styleReadOnlyCell(ws4.getCell(rRow, 2));
    styleReadOnlyCell(ws4.getCell(rRow, 3));

    rRow++;
  }

  // Fila de Subtotal
  const endRubroRow = rRow - 1;
  ws4.getRow(rRow).height = 22;
  ws4.mergeCells(rRow, 1, rRow, 5);
  const subLabel = ws4.getCell(rRow, 1);
  subLabel.value = 'SUBTOTAL RUBROS PRINCIPALES ($)';
  subLabel.font = { name: 'Calibri', size: 10, bold: true };
  subLabel.alignment = { horizontal: 'right', vertical: 'middle' };
  styleReadOnlyCell(subLabel);

  const subTotalDay = ws4.getCell(rRow, 6);
  subTotalDay.value = { formula: `SUM(F${startRubroRow}:F${endRubroRow})`, result: 0 };
  subTotalDay.font = { name: 'Calibri', size: 10, bold: true };
  subTotalDay.numFmt = '"$"#,##0.00';
  subTotalDay.alignment = { horizontal: 'right', vertical: 'middle' };
  styleReadOnlyCell(subTotalDay);

  const subTotalAcum = ws4.getCell(rRow, 7);
  subTotalAcum.value = { formula: `SUM(G${startRubroRow}:G${endRubroRow})`, result: 0 };
  subTotalAcum.font = { name: 'Calibri', size: 10, bold: true };
  subTotalAcum.numFmt = '"$"#,##0.00';
  subTotalAcum.alignment = { horizontal: 'right', vertical: 'middle' };
  styleReadOnlyCell(subTotalAcum);

  // =========================================================================
  // PESTAÑA 5: 5. AVANCE ECONÓMICO
  // =========================================================================
  const ws5 = wb.addWorksheet('5. AVANCE ECONÓMICO', { views: [{ showGridLines: true }] });
  applyTitleHeader(ws5, '5. AVANCE ECONÓMICO EJECUTADO ($)', undefined, 3);
  ws5.columns = [{ width: 36 }, { width: 20 }, { width: 20 }];

  ws5.getRow(2).height = 22;
  styleTableHeader(ws5.getCell(2, 1), 'CONCEPTO');
  styleTableHeader(ws5.getCell(2, 2), 'DÍA ($)');
  styleTableHeader(ws5.getCell(2, 3), 'ACUMULADO ($)');

  const econData = [
    ['Rubros Principales', 0, 0],
    ['Rubros NO Principales', 0, 0],
    ['AVANCE EJECUTADO TOTAL', 0, 0],
  ];

  econData.forEach((row, i) => {
    const rIdx = i + 3;
    const r = ws5.getRow(rIdx);
    r.height = 20;
    r.values = row;
    styleReadOnlyCell(ws5.getCell(rIdx, 1));
    ws5.getCell(rIdx, 1).font = { bold: i === 2 };

    const cDay = ws5.getCell(rIdx, 2);
    styleEditableCell(cDay);
    cDay.numFmt = '"$"#,##0.00';
    cDay.alignment = { horizontal: 'right' };
    cDay.font = { bold: i === 2 };

    const cAcum = ws5.getCell(rIdx, 3);
    styleEditableCell(cAcum);
    cAcum.numFmt = '"$"#,##0.00';
    cAcum.alignment = { horizontal: 'right' };
    cAcum.font = { bold: i === 2 };
  });

  ws5.getCell(7, 1).value = 'Monto Contractual Asignado ($):';
  ws5.getCell(7, 1).font = { bold: true };
  ws5.getCell(7, 2).value = contractAmount;
  ws5.getCell(7, 2).numFmt = '"$"#,##0.00';
  ws5.getCell(7, 2).font = { bold: true };

  ws5.getCell(8, 1).value = '% Avance Acumulado de la Obra:';
  ws5.getCell(8, 1).font = { bold: true };
  ws5.getCell(8, 2).value = 0;
  ws5.getCell(8, 2).numFmt = '0.00%';
  ws5.getCell(8, 2).font = { bold: true };
  styleEditableCell(ws5.getCell(8, 2));

  // =========================================================================
  // PESTAÑA 6: 6. ACTIVIDADES HOY
  // =========================================================================
  const ws6 = wb.addWorksheet('6. ACTIVIDADES HOY', { views: [{ showGridLines: true }] });
  applyTitleHeader(ws6, '6. RESUMEN DE ACTIVIDADES REALIZADAS HOY', undefined, 2);
  ws6.columns = [{ width: 32 }, { width: 68 }];

  ws6.getRow(2).height = 22;
  styleTableHeader(ws6.getCell(2, 1), 'FRENTE / SECTOR');
  styleTableHeader(ws6.getCell(2, 2), 'DETALLE DE TRABAJOS EJECUTADOS');

  const frentes = [
    ['VIAL', 'Excavación en fango e=0.40m y transporte interno de material de desecho.'],
    ['ESTRUCTURA DE PAVIMENTO', 'Sin actividad en esta jornada.'],
    ['DRENAJE', 'Bombeo continuo y achique de agua en sector bajo de la excavación.'],
    ['ESTRUCTURAS / PUENTES', 'Sin actividad en esta jornada.'],
    ['TOPOGRAFÍA', 'Control de niveles de fondo de excavación y replanteo de bermas.'],
    ['SEÑALIZACIÓN', 'Mantenimiento de señalización preventiva y cinta perimetral.'],
    ['AMBIENTAL / SOCIAL / SEGURIDAD', 'Charla de 5 minutos sobre prevención de caídas y uso de botas de caucho.'],
  ];

  frentes.forEach((item, i) => {
    const rIdx = i + 3;
    ws6.getRow(rIdx).height = 28;
    ws6.getCell(rIdx, 1).value = item[0];
    ws6.getCell(rIdx, 1).font = { bold: true, size: 9.5 };
    styleReadOnlyCell(ws6.getCell(rIdx, 1));

    const cDesc = ws6.getCell(rIdx, 2);
    cDesc.value = item[1];
    cDesc.alignment = { wrapText: true, vertical: 'middle' };
    styleEditableCell(cDesc);
  });

  // =========================================================================
  // PESTAÑA 7: 7. ACTIVIDADES MAÑANA
  // =========================================================================
  const ws7 = wb.addWorksheet('7. ACTIVIDADES MAÑANA', { views: [{ showGridLines: true }] });
  applyTitleHeader(ws7, '7. ACTIVIDADES A REALIZAR MAÑANA', undefined, 2);
  ws7.columns = [{ width: 32 }, { width: 68 }];

  ws7.getRow(2).height = 22;
  styleTableHeader(ws7.getCell(2, 1), 'FRENTE / SECTOR');
  styleTableHeader(ws7.getCell(2, 2), 'DETALLE DE TRABAJOS PLANIFICADOS');

  const frentesManana = [
    ['VIAL', 'Continuar excavación en fango y colocación de material de relleno filtrante.'],
    ['DRENAJE', 'Continuación del bombeo y nivelación de zanjas.'],
    ['TOPOGRAFÍA', 'Replanteo de abscisas siguientes y verificación de pendientes.'],
  ];

  frentesManana.forEach((item, i) => {
    const rIdx = i + 3;
    ws7.getRow(rIdx).height = 28;
    ws7.getCell(rIdx, 1).value = item[0];
    ws7.getCell(rIdx, 1).font = { bold: true, size: 9.5 };
    styleReadOnlyCell(ws7.getCell(rIdx, 1));

    const cDesc = ws7.getCell(rIdx, 2);
    cDesc.value = item[1];
    cDesc.alignment = { wrapText: true, vertical: 'middle' };
    styleEditableCell(cDesc);
  });

  // =========================================================================
  // PESTAÑA 8: 8. NOVEDADES Y RIESGOS
  // =========================================================================
  const ws8 = wb.addWorksheet('8. NOVEDADES Y RIESGOS', { views: [{ showGridLines: true }] });
  applyTitleHeader(ws8, '8. NOVEDADES / PARALIZACIONES / RIESGOS DE SEGURIDAD (GDO)', undefined, 2);
  ws8.columns = [{ width: 28 }, { width: 72 }];

  ws8.getRow(2).height = 22;
  styleTableHeader(ws8.getCell(2, 1), 'CONCEPTO');
  styleTableHeader(ws8.getCell(2, 2), 'DETALLE');

  const novs = [
    ['Novedades Generales', 'Jornada transcurrida sin paralizaciones ni interferencias de terceros.'],
    ['Riesgos Identificados', 'Presencia de nivel freático alto en fondo de canal, se requiere bombeo permanente.'],
    ['Paralizaciones de Obra', 'Ninguna paralización en el frente de trabajo.'],
  ];

  novs.forEach((item, i) => {
    const rIdx = i + 3;
    ws8.getRow(rIdx).height = 32;
    ws8.getCell(rIdx, 1).value = item[0];
    ws8.getCell(rIdx, 1).font = { bold: true, size: 9.5 };
    styleReadOnlyCell(ws8.getCell(rIdx, 1));

    const cDesc = ws8.getCell(rIdx, 2);
    cDesc.value = item[1];
    cDesc.alignment = { wrapText: true, vertical: 'middle' };
    styleEditableCell(cDesc);
  });

  // =========================================================================
  // PESTAÑA 9: 9. COMENTARIOS
  // =========================================================================
  const ws9 = wb.addWorksheet('9. COMENTARIOS', { views: [{ showGridLines: true }] });
  applyTitleHeader(ws9, '9. COMENTARIOS Y OBSERVACIONES', undefined, 2);
  ws9.columns = [{ width: 32 }, { width: 68 }];

  ws9.getRow(2).height = 22;
  styleTableHeader(ws9.getCell(2, 1), 'ACTOR');
  styleTableHeader(ws9.getCell(2, 2), 'COMENTARIOS / OBSERVACIONES');

  const coms = [
    ['COMENTARIOS DEL CONTRATISTA:', 'Se avanza de acuerdo a la programación acordada en obra.'],
    ['COMENTARIOS DE FISCALIZACIÓN:', 'Trabajos ejecutados conforme a las especificaciones técnicas requeridas.'],
  ];

  coms.forEach((item, i) => {
    const rIdx = i + 3;
    ws9.getRow(rIdx).height = 36;
    ws9.getCell(rIdx, 1).value = item[0];
    ws9.getCell(rIdx, 1).font = { bold: true, size: 9.5 };
    styleReadOnlyCell(ws9.getCell(rIdx, 1));

    const cDesc = ws9.getCell(rIdx, 2);
    cDesc.value = item[1];
    cDesc.alignment = { wrapText: true, vertical: 'middle' };
    styleEditableCell(cDesc);
  });

  // =========================================================================
  // PESTAÑA 10: 10. CLIMA HORARIO
  // =========================================================================
  const ws10 = wb.addWorksheet('10. CLIMA HORARIO', { views: [{ showGridLines: true }] });
  applyTitleHeader(ws10, '10. CONDICIONES CLIMÁTICAS POR FRANJA HORARIA', undefined, 9);
  ws10.columns = [
    { width: 18 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
  ];

  ws10.getRow(2).height = 22;
  styleTableHeader(ws10.getCell(2, 1), 'Horario');
  const slots = ['0-6', '6-8', '8-10', '10-12', '12-14', '14-16', '16-18', '18-24'];
  slots.forEach((s, i) => {
    styleTableHeader(ws10.getCell(2, i + 2), s);
  });

  ws10.getRow(3).height = 24;
  ws10.getCell(3, 1).value = 'Condición (1-4)';
  ws10.getCell(3, 1).font = { bold: true, size: 9.5 };
  styleReadOnlyCell(ws10.getCell(3, 1));

  slots.forEach((_, i) => {
    const c = ws10.getCell(3, i + 2);
    c.value = 1; // 1 = Despejado
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.font = { bold: true };
    styleEditableCell(c);
  });

  ws10.getCell(5, 1).value = 'Códigos de Clima:';
  ws10.getCell(5, 1).font = { bold: true, size: 9 };
  ws10.getCell(6, 1).value = '1 = Despejado / Soleado';
  ws10.getCell(7, 1).value = '2 = Nublado';
  ws10.getCell(8, 1).value = '3 = Llovizna ligera';
  ws10.getCell(9, 1).value = '4 = Lluvia fuerte / Temporal';

  // =========================================================================
  // PESTAÑA 11: 11. FIRMAS
  // =========================================================================
  const ws11 = wb.addWorksheet('11. FIRMAS', { views: [{ showGridLines: true }] });
  applyTitleHeader(ws11, '11. FIRMAS Y RESPONSABLES DEL REPORTE', undefined, 4);
  ws11.columns = [{ width: 24 }, { width: 32 }, { width: 24 }, { width: 32 }];

  ws11.getRow(3).height = 22;
  ws11.getCell(3, 1).value = 'ELABORADO POR:';
  ws11.getCell(3, 1).font = { bold: true };
  ws11.getCell(3, 2).value = 'Ing. María Fernanda Ligua';
  styleEditableCell(ws11.getCell(3, 2));

  ws11.getCell(3, 3).value = 'CARGO:';
  ws11.getCell(3, 3).font = { bold: true };
  ws11.getCell(3, 4).value = 'Ing. de Planillas';
  styleEditableCell(ws11.getCell(3, 4));

  ws11.getRow(4).height = 22;
  ws11.getCell(4, 1).value = 'REVISADO POR:';
  ws11.getCell(4, 1).font = { bold: true };
  ws11.getCell(4, 2).value = 'Ing. Jerson López';
  styleEditableCell(ws11.getCell(4, 2));

  ws11.getCell(4, 3).value = 'CARGO:';
  ws11.getCell(4, 3).font = { bold: true };
  ws11.getCell(4, 4).value = 'Residente de Obra';
  styleEditableCell(ws11.getCell(4, 4));

  ws11.getRow(5).height = 22;
  ws11.getCell(5, 1).value = 'FISCALIZADO POR:';
  ws11.getCell(5, 1).font = { bold: true };
  ws11.getCell(5, 2).value = inspection;
  styleEditableCell(ws11.getCell(5, 2));

  ws11.getCell(5, 3).value = 'CARGO:';
  ws11.getCell(5, 3).font = { bold: true };
  ws11.getCell(5, 4).value = 'Fiscalizador de Obra';
  styleEditableCell(ws11.getCell(5, 4));

  // =========================================================================
  // PESTAÑA CATÁLOGO: CATÁLOGO RUBROS (REFERENCIA CONTRACTUAL COMPLETA)
  // =========================================================================
  const wsCat = wb.addWorksheet('CATÁLOGO RUBROS', { views: [{ showGridLines: true }] });
  applyTitleHeader(wsCat, 'CATÁLOGO CONTRACTUAL DE RUBROS DEL PROYECTO', projName.toUpperCase(), 7);
  wsCat.columns = [
    { width: 12 }, // N°
    { width: 50 }, // Descripción
    { width: 10 }, // Unid.
    { width: 14 }, // P.U. ($)
    { width: 16 }, // Cant. Asignada
    { width: 18 }, // Monto Total ($)
    { width: 14 }, // Es Principal
  ];

  wsCat.getRow(2).height = 22;
  styleTableHeader(wsCat.getCell(2, 1), 'N° Rubro');
  styleTableHeader(wsCat.getCell(2, 2), 'Descripción');
  styleTableHeader(wsCat.getCell(2, 3), 'Unid.');
  styleTableHeader(wsCat.getCell(2, 4), 'P.U. ($)');
  styleTableHeader(wsCat.getCell(2, 5), 'Cant. Asignada');
  styleTableHeader(wsCat.getCell(2, 6), 'Monto Total ($)');
  styleTableHeader(wsCat.getCell(2, 7), 'Tipo Rubro');

  let cRow = 3;
  for (const item of rubrosToPrint) {
    wsCat.getRow(cRow).height = 19;
    wsCat.getCell(cRow, 1).value = item.rubroNumber;
    wsCat.getCell(cRow, 1).alignment = { horizontal: 'center' };
    wsCat.getCell(cRow, 2).value = item.description;
    wsCat.getCell(cRow, 3).value = item.unit;
    wsCat.getCell(cRow, 3).alignment = { horizontal: 'center' };

    const puCell = wsCat.getCell(cRow, 4);
    puCell.value = item.unitPrice || 0;
    puCell.numFmt = '"$"#,##0.00';
    puCell.alignment = { horizontal: 'right' };

    const qtyCell = wsCat.getCell(cRow, 5);
    qtyCell.value = item.contractQuantity || 0;
    qtyCell.numFmt = '#,##0.00';
    qtyCell.alignment = { horizontal: 'right' };

    const totCell = wsCat.getCell(cRow, 6);
    totCell.value = item.contractTotal || (item.contractQuantity ? (item.contractQuantity * (item.unitPrice || 0)) : 0);
    totCell.numFmt = '"$"#,##0.00';
    totCell.alignment = { horizontal: 'right' };

    const priCell = wsCat.getCell(cRow, 7);
    priCell.value = item.isPrincipal === false ? 'Secundario' : 'Principal';
    priCell.alignment = { horizontal: 'center' };

    for (let col = 1; col <= 7; col++) {
      styleReadOnlyCell(wsCat.getCell(cRow, col));
    }
    cRow++;
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
