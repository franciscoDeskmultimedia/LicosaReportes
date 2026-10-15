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

// Paleta de estilos corporativos oficiales LICOSA (idénticos a los reportes de obra)
const COLOR_HEADER_DARK = 'FF1B365D';     // Navy oscuro principal
const COLOR_HEADER_MID = 'FF2F5597';      // Azul corporativo intermedio
const COLOR_SUBHEADER_BG = 'FFD9E1F2';    // Azul muy suave (subtítulos)
const COLOR_INPUT_YELLOW = 'FFFFF2CC';    // Amarillo pastel suave (celdas para llenar datos)
const COLOR_BORDER_GRAY = 'FFBFBFBF';     // Bordes limpios
const COLOR_BORDER_BLUE = 'FF1F4E79';     // Borde cabecera

function styleTitleBar(ws: ExcelJS.Worksheet, rowNum: number, text: string, colSpan = 11) {
  const row = ws.getRow(rowNum);
  row.height = 28;
  ws.mergeCells(rowNum, 1, rowNum, colSpan);
  const cell = ws.getCell(rowNum, 1);
  cell.value = text;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_DARK } };
  cell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
}

function styleSubtitleBar(ws: ExcelJS.Worksheet, rowNum: number, text: string, colSpan = 11) {
  const row = ws.getRow(rowNum);
  row.height = 22;
  ws.mergeCells(rowNum, 1, rowNum, colSpan);
  const cell = ws.getCell(rowNum, 1);
  cell.value = text;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SUBHEADER_BG } };
  cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_HEADER_DARK } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
}

function styleSectionHeader(ws: ExcelJS.Worksheet, rowNum: number, text: string, colSpan = 11) {
  const row = ws.getRow(rowNum);
  row.height = 22;
  ws.mergeCells(rowNum, 1, rowNum, colSpan);
  const cell = ws.getCell(rowNum, 1);
  cell.value = text;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_MID } };
  cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
}

function styleTableHeader(cell: ExcelJS.Cell, text: string) {
  cell.value = text;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_MID } };
  cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border = {
    top: { style: 'thin', color: { argb: COLOR_BORDER_BLUE } },
    left: { style: 'thin', color: { argb: COLOR_BORDER_BLUE } },
    bottom: { style: 'thin', color: { argb: COLOR_BORDER_BLUE } },
    right: { style: 'thin', color: { argb: COLOR_BORDER_BLUE } },
  };
}

function styleEditableCell(cell: ExcelJS.Cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_INPUT_YELLOW } };
  cell.border = {
    top: { style: 'thin', color: { argb: COLOR_BORDER_GRAY } },
    left: { style: 'thin', color: { argb: COLOR_BORDER_GRAY } },
    bottom: { style: 'thin', color: { argb: COLOR_BORDER_GRAY } },
    right: { style: 'thin', color: { argb: COLOR_BORDER_GRAY } },
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

/**
 * Genera el Reporte Diario de Obra (RDO) oficial en una sola hoja unificada,
 * tal como la empresa lo utiliza históricamente, pero con formato, estilos corporativos,
 * fórmulas automáticas y celdas amarillas para llenado rápido.
 */
export async function generateStyledRdoWorkbook(
  projectInfo: ProjectTemplateInfo,
  rubrosList: RubroItem[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LICOSA Control de Obras';
  wb.created = new Date();

  const projName = projectInfo.name || 'CONSTRUCCIÓN DE CANAL SECUNDARIO (METROPOLIS) - ALTERNATIVA VERANO';
  const contractor = projectInfo.contractor || 'LICOSA, LICITACIONES Y CONTRATOS S.A.';
  const client = projectInfo.client || 'FIDEICOMISO NARCISA PLAZA (FIDEVAL S.A.)';
  const inspection = projectInfo.inspectionCompany || 'ING. EMILIANO SORNOZA CASTILLO';
  const roadSection = projectInfo.roadSection || '0+000 - 0+943.30 (Alternativa Verano)';
  const reportNumber = projectInfo.reportNumber || 1;
  const reportDate = projectInfo.reportDate || new Date().toISOString().split('T')[0];
  const totalDays = projectInfo.totalDays || 150;

  // =========================================================================
  // HOJA 1: RDO (Formato Oficial Unificado Diario de Obra)
  // =========================================================================
  const ws = wb.addWorksheet('RDO', { views: [{ showGridLines: true }] });

  ws.columns = [
    { width: 14 }, // A: N° Rubro / Label / Equipo
    { width: 44 }, // B: Descripción / Cargo
    { width: 10 }, // C: Unidad
    { width: 14 }, // D: Cantidad equipo / Horas lluvia
    { width: 14 }, // E: Horas equipo
    { width: 12 }, // F: Separador / N° Personal
    { width: 16 }, // G: H-Hombre
    { width: 14 }, // H: Cant. día rubro
    { width: 14 }, // I: Cant. acum rubro
    { width: 16 }, // J: Monto día rubro
    { width: 16 }, // K: Monto acum rubro
  ];

  // 1. Cabecera Corporativa
  styleTitleBar(ws, 1, 'REPORTE DIARIO DE OBRA', 11);
  styleSubtitleBar(ws, 2, projName.toUpperCase(), 11);

  // Fila 3: Contratista, Contratante, Fiscalización
  ws.getRow(3).height = 20;
  ws.mergeCells(3, 1, 3, 4);
  ws.getCell(3, 1).value = `CONTRATISTA: ${contractor}`;
  ws.getCell(3, 1).font = { name: 'Calibri', size: 9, bold: true };
  styleReadOnlyCell(ws.getCell(3, 1));

  ws.mergeCells(3, 5, 3, 7);
  ws.getCell(3, 5).value = `CONTRATANTE: ${client}`;
  ws.getCell(3, 5).font = { name: 'Calibri', size: 9, bold: true };
  styleReadOnlyCell(ws.getCell(3, 5));

  ws.mergeCells(3, 8, 3, 11);
  ws.getCell(3, 8).value = `FISCALIZACION: ${inspection}`;
  ws.getCell(3, 8).font = { name: 'Calibri', size: 9, bold: true };
  styleReadOnlyCell(ws.getCell(3, 8));

  // Fila 4: Fecha, Reporte N°, Tramo
  ws.getRow(4).height = 22;
  ws.getCell(4, 1).value = 'FECHA:';
  ws.getCell(4, 1).font = { bold: true, size: 9.5 };
  styleReadOnlyCell(ws.getCell(4, 1));

  ws.mergeCells(4, 2, 4, 3);
  ws.getCell(4, 2).value = reportDate;
  ws.getCell(4, 2).alignment = { horizontal: 'center' };
  styleEditableCell(ws.getCell(4, 2));

  ws.getCell(4, 4).value = 'REPORTE N°:';
  ws.getCell(4, 4).font = { bold: true, size: 9.5 };
  styleReadOnlyCell(ws.getCell(4, 4));

  ws.getCell(4, 5).value = reportNumber;
  ws.getCell(4, 5).alignment = { horizontal: 'center' };
  styleEditableCell(ws.getCell(4, 5));

  ws.mergeCells(4, 6, 4, 7);
  ws.getCell(4, 6).value = 'TRAMO / SEGMENTO:';
  ws.getCell(4, 6).font = { bold: true, size: 9.5 };
  styleReadOnlyCell(ws.getCell(4, 6));

  ws.mergeCells(4, 8, 4, 11);
  ws.getCell(4, 8).value = roadSection;
  styleEditableCell(ws.getCell(4, 8));

  // Fila 5: Monto Trabajos, % Avance, Días/Plazo
  ws.getRow(5).height = 22;
  ws.getCell(5, 1).value = 'MONTO DE TRABAJOS EJECUTADOS:';
  ws.getCell(5, 1).font = { bold: true, size: 9 };
  styleReadOnlyCell(ws.getCell(5, 1));

  ws.mergeCells(5, 2, 5, 3);
  // Se calculará dinámicamente con la fórmula del subtotal de rubros más adelante
  ws.getCell(5, 2).font = { bold: true };
  ws.getCell(5, 2).numFmt = '"$"#,##0.00';
  ws.getCell(5, 2).alignment = { horizontal: 'center' };
  styleEditableCell(ws.getCell(5, 2));

  ws.getCell(5, 4).value = '% AVANCE:';
  ws.getCell(5, 4).font = { bold: true, size: 9.5 };
  styleReadOnlyCell(ws.getCell(5, 4));

  ws.getCell(5, 5).value = 0.2146;
  ws.getCell(5, 5).font = { bold: true };
  ws.getCell(5, 5).numFmt = '0.00%';
  ws.getCell(5, 5).alignment = { horizontal: 'center' };
  styleEditableCell(ws.getCell(5, 5));

  ws.mergeCells(5, 6, 5, 7);
  ws.getCell(5, 6).value = 'DÍAS TRANSCURRIDOS / PLAZO:';
  ws.getCell(5, 6).font = { bold: true, size: 9 };
  styleReadOnlyCell(ws.getCell(5, 6));

  ws.mergeCells(5, 8, 5, 11);
  ws.getCell(5, 8).value = `Inicio: ${reportDate} | Plazo contractual: ${totalDays} días`;
  styleReadOnlyCell(ws.getCell(5, 8));

  for (let c = 1; c <= 11; c++) {
    styleReadOnlyCell(ws.getCell(3, c));
    styleReadOnlyCell(ws.getCell(4, c));
    styleReadOnlyCell(ws.getCell(5, c));
  }
  styleEditableCell(ws.getCell(4, 2));
  styleEditableCell(ws.getCell(4, 5));
  styleEditableCell(ws.getCell(4, 8));
  styleEditableCell(ws.getCell(5, 2));
  styleEditableCell(ws.getCell(5, 5));

  // 2. SECCIÓN 1: REPORTE DE CLIMA Y EHS
  styleSectionHeader(ws, 7, '1. REPORTE DE CLIMA Y EHS (SEGURIDAD, SALUD Y AMBIENTE)', 11);

  const ehsRows = [
    ['Horas de lluvia (dia)', 0, 'Tiempo charla diaria (min)', 5],
    ['Horas de lluvia (noche)', 0, 'Tiempo charla acum. (min)', 10],
    ['Horas perdidas por lluvia', 0, 'Incidentes (dia / acum.)', '0/0'],
    ['Horas perdidas acum. por lluvia', 0, 'Accidentes (dia / acum.)', '0/0'],
  ];

  ehsRows.forEach((item, idx) => {
    const r = 8 + idx;
    ws.getRow(r).height = 19;
    ws.mergeCells(r, 1, r, 3);
    ws.getCell(r, 1).value = item[0];
    styleReadOnlyCell(ws.getCell(r, 1));

    ws.mergeCells(r, 4, r, 5);
    ws.getCell(r, 4).value = item[1];
    ws.getCell(r, 4).alignment = { horizontal: 'center' };
    ws.getCell(r, 4).font = { bold: true };
    styleEditableCell(ws.getCell(r, 4));

    ws.mergeCells(r, 6, r, 8);
    ws.getCell(r, 6).value = item[2];
    styleReadOnlyCell(ws.getCell(r, 6));

    ws.mergeCells(r, 9, r, 11);
    ws.getCell(r, 9).value = item[3];
    ws.getCell(r, 9).alignment = { horizontal: 'center' };
    ws.getCell(r, 9).font = { bold: true };
    styleEditableCell(ws.getCell(r, 9));
  });

  // 3. SECCIÓN 2 Y 3: EQUIPOS Y PERSONAL (En paralelo lado a lado)
  ws.getRow(13).height = 22;
  ws.mergeCells(13, 1, 13, 5);
  const cEqTitle = ws.getCell(13, 1);
  cEqTitle.value = '2. REPORTE DE EQUIPO';
  cEqTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_MID } };
  cEqTitle.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
  cEqTitle.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  ws.mergeCells(13, 6, 13, 11);
  const cPersTitle = ws.getCell(13, 6);
  cPersTitle.value = '3. REPORTE DE PERSONAL';
  cPersTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_MID } };
  cPersTitle.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
  cPersTitle.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  // Cabeceras de columnas para Equipos (col 1-5) y Personal (col 6-11)
  ws.getRow(14).height = 22;
  ws.mergeCells(14, 1, 14, 2);
  styleTableHeader(ws.getCell(14, 1), 'Descripción del equipo');
  styleTableHeader(ws.getCell(14, 3), 'Unidad');
  styleTableHeader(ws.getCell(14, 4), 'Cantidad');
  styleTableHeader(ws.getCell(14, 5), 'Horas dia');

  ws.mergeCells(14, 6, 14, 9);
  styleTableHeader(ws.getCell(14, 6), 'Categoria / Cargo');
  styleTableHeader(ws.getCell(14, 10), 'N°');
  styleTableHeader(ws.getCell(14, 11), 'H-Hombre dia');

  const defaultEq = [
    ['EXCAVADORA (CONSBER)', 'hr', 1, 8],
    ['EXCAVADORA VOLVO EX06', 'hr', 1, 6],
    ['VOLQUETA VQ-32', 'hr', 1, 8],
    ['TRACTOR TR-08', 'hr', 0, 0],
    ['RODILLO RL-16', 'hr', 0, 0],
    ['TANQUERO DE AGUA TQ-01', 'hr', 0, 0],
  ];

  const defaultPers = [
    ['Residente - Ing. Gustavo Berrezueta', 1, 8],
    ['Topografo -', 1, 8],
    ['Cadenero -', 1, 8],
    ['Ayudante Geotextil -', 1, 8],
    ['Operador Excavadora -', 1, 8],
    ['Chofer Volqueta -', 1, 8],
  ];

  const maxResourceRows = Math.max(defaultEq.length, defaultPers.length, 8);
  for (let i = 0; i < maxResourceRows; i++) {
    const r = 15 + i;
    ws.getRow(r).height = 19;

    // Equipos (Izq)
    const eq = defaultEq[i];
    ws.mergeCells(r, 1, r, 2);
    ws.getCell(r, 1).value = eq ? eq[0] : '';
    styleReadOnlyCell(ws.getCell(r, 1));

    ws.getCell(r, 3).value = eq ? eq[1] : 'hr';
    ws.getCell(r, 3).alignment = { horizontal: 'center' };
    styleReadOnlyCell(ws.getCell(r, 3));

    ws.getCell(r, 4).value = eq ? eq[2] : 0;
    ws.getCell(r, 4).alignment = { horizontal: 'center' };
    styleEditableCell(ws.getCell(r, 4));

    ws.getCell(r, 5).value = eq ? eq[3] : 0;
    ws.getCell(r, 5).alignment = { horizontal: 'center' };
    ws.getCell(r, 5).font = { bold: true };
    styleEditableCell(ws.getCell(r, 5));

    // Personal (Der)
    const p = defaultPers[i];
    ws.mergeCells(r, 6, r, 9);
    ws.getCell(r, 6).value = p ? p[0] : '';
    styleReadOnlyCell(ws.getCell(r, 6));

    ws.getCell(r, 10).value = p ? p[1] : 0;
    ws.getCell(r, 10).alignment = { horizontal: 'center' };
    styleEditableCell(ws.getCell(r, 10));

    ws.getCell(r, 11).value = p ? p[2] : 0;
    ws.getCell(r, 11).alignment = { horizontal: 'center' };
    ws.getCell(r, 11).font = { bold: true };
    styleEditableCell(ws.getCell(r, 11));
  }

  // 4. SECCIÓN 4: RUBROS PRINCIPALES DEL DÍA (Pre-cargada dinámicamente con los rubros)
  const rubroHeaderRowNum = 15 + maxResourceRows + 1;
  styleSectionHeader(ws, rubroHeaderRowNum, '4. RUBROS PRINCIPALES DEL DÍA', 11);

  const colRubroHeaderRow = rubroHeaderRowNum + 1;
  ws.getRow(colRubroHeaderRow).height = 22;
  styleTableHeader(ws.getCell(colRubroHeaderRow, 1), 'N° Rubro');
  ws.mergeCells(colRubroHeaderRow, 2, colRubroHeaderRow, 4);
  styleTableHeader(ws.getCell(colRubroHeaderRow, 2), 'Descripción (auto)');
  styleTableHeader(ws.getCell(colRubroHeaderRow, 5), 'Unid.');
  ws.mergeCells(colRubroHeaderRow, 6, colRubroHeaderRow, 7);
  styleTableHeader(ws.getCell(colRubroHeaderRow, 6), 'Cant. día');
  ws.mergeCells(colRubroHeaderRow, 8, colRubroHeaderRow, 9);
  styleTableHeader(ws.getCell(colRubroHeaderRow, 8), 'Cant. acum.');
  styleTableHeader(ws.getCell(colRubroHeaderRow, 10), 'Monto día ($)');
  styleTableHeader(ws.getCell(colRubroHeaderRow, 11), 'Monto acum. ($)');

  const rubrosToPrint: RubroItem[] =
    rubrosList && rubrosList.length > 0
      ? rubrosList
      : [
          { rubroNumber: 10, description: '[NC_19] Excavacion en fango e=0.40m', unit: 'm3', unitPrice: 4.67, isPrincipal: true },
          { rubroNumber: 30, description: '[R-30] Relleno con material de sitio (incl. cargada y transporte)', unit: 'm3', unitPrice: 7.81, isPrincipal: true },
          { rubroNumber: 33, description: '[R-33] Bombeo', unit: 'dia', unitPrice: 69.62, isPrincipal: true },
        ];

  let currRubroRow = colRubroHeaderRow + 1;
  const rubroStartRow = currRubroRow;

  for (const item of rubrosToPrint) {
    ws.getRow(currRubroRow).height = 20;

    ws.getCell(currRubroRow, 1).value = item.rubroNumber;
    ws.getCell(currRubroRow, 1).alignment = { horizontal: 'center' };
    ws.getCell(currRubroRow, 1).font = { bold: true };
    styleReadOnlyCell(ws.getCell(currRubroRow, 1));

    ws.mergeCells(currRubroRow, 2, currRubroRow, 4);
    ws.getCell(currRubroRow, 2).value = item.description;
    styleReadOnlyCell(ws.getCell(currRubroRow, 2));

    ws.getCell(currRubroRow, 5).value = item.unit;
    ws.getCell(currRubroRow, 5).alignment = { horizontal: 'center' };
    styleReadOnlyCell(ws.getCell(currRubroRow, 5));

    // Cant. día (CELDA AMARILLA EDITABLE)
    ws.mergeCells(currRubroRow, 6, currRubroRow, 7);
    const cDay = ws.getCell(currRubroRow, 6);
    cDay.value = 0;
    cDay.numFmt = '#,##0.00';
    cDay.alignment = { horizontal: 'right' };
    cDay.font = { bold: true };
    styleEditableCell(cDay);

    // Cant. acum
    ws.mergeCells(currRubroRow, 8, currRubroRow, 9);
    const cAcum = ws.getCell(currRubroRow, 8);
    cAcum.value = 0;
    cAcum.numFmt = '#,##0.00';
    cAcum.alignment = { horizontal: 'right' };
    styleReadOnlyCell(cAcum);

    // Monto día ($) = FÓRMULA Cant. día * P.U.
    const mDay = ws.getCell(currRubroRow, 10);
    if (item.unitPrice && item.unitPrice > 0) {
      mDay.value = { formula: `F${currRubroRow}*${item.unitPrice}`, result: 0 };
    } else {
      mDay.value = 0;
    }
    mDay.numFmt = '"$"#,##0.00';
    mDay.alignment = { horizontal: 'right' };
    mDay.font = { bold: true };
    styleReadOnlyCell(mDay);

    // Monto acum ($)
    const mAcum = ws.getCell(currRubroRow, 11);
    if (item.unitPrice && item.unitPrice > 0) {
      mAcum.value = { formula: `H${currRubroRow}*${item.unitPrice}`, result: 0 };
    } else {
      mAcum.value = 0;
    }
    mAcum.numFmt = '"$"#,##0.00';
    mAcum.alignment = { horizontal: 'right' };
    styleReadOnlyCell(mAcum);

    currRubroRow++;
  }

  // Fila de Subtotal de Rubros Principales
  const rubroEndRow = currRubroRow - 1;
  ws.getRow(currRubroRow).height = 24;
  ws.mergeCells(currRubroRow, 1, currRubroRow, 9);
  const subLabel = ws.getCell(currRubroRow, 1);
  subLabel.value = 'SUBTOTAL RUBROS PRINCIPALES ($)';
  subLabel.font = { name: 'Calibri', size: 10.5, bold: true };
  subLabel.alignment = { horizontal: 'right', vertical: 'middle' };
  styleReadOnlyCell(subLabel);

  const subTotalDay = ws.getCell(currRubroRow, 10);
  subTotalDay.value = { formula: `SUM(J${rubroStartRow}:J${rubroEndRow})`, result: 0 };
  subTotalDay.font = { name: 'Calibri', size: 11, bold: true };
  subTotalDay.numFmt = '"$"#,##0.00';
  subTotalDay.alignment = { horizontal: 'right', vertical: 'middle' };
  styleReadOnlyCell(subTotalDay);

  const subTotalAcum = ws.getCell(currRubroRow, 11);
  subTotalAcum.value = { formula: `SUM(K${rubroStartRow}:K${rubroEndRow})`, result: 0 };
  subTotalAcum.font = { name: 'Calibri', size: 11, bold: true };
  subTotalAcum.numFmt = '"$"#,##0.00';
  subTotalAcum.alignment = { horizontal: 'right', vertical: 'middle' };
  styleReadOnlyCell(subTotalAcum);

  // Vincular la celda de Monto de Trabajos Ejecutados (Fila 5, Col 2) a la celda del subtotal
  ws.getCell(5, 2).value = { formula: `J${currRubroRow}`, result: 0 };

  currRubroRow++;

  // 5. SECCIÓN 6: RESUMEN DE ACTIVIDADES REALIZADAS HOY
  const actHoyTitleRow = currRubroRow + 1;
  styleSectionHeader(ws, actHoyTitleRow, '6. RESUMEN DE ACTIVIDADES REALIZADAS HOY', 11);

  const frentes = [
    ['VIAL', 'Excavación en fango e=0.40m y transporte interno de material de desecho hacia escombrera autorizada.'],
    ['ESTRUCTURA DE PAVIMENTO', 'Sin actividad en la jornada.'],
    ['DRENAJE', 'Bombeo continuo y achique de agua en sector bajo de la excavación.'],
    ['ESTRUCTURAS / PUENTES', 'Sin actividad en la jornada.'],
    ['TOPOGRAFÍA', 'Control de niveles de fondo de excavación y replanteo de bermas.'],
    ['SEÑALIZACIÓN', 'Mantenimiento de señalización preventiva y cinta perimetral.'],
    ['AMBIENTAL / SOCIAL / SEGURIDAD', 'Charla de 5 minutos sobre prevención de caídas y uso de botas de caucho.'],
  ];

  let nextActRow = actHoyTitleRow + 1;
  for (const [tag, desc] of frentes) {
    ws.getRow(nextActRow).height = 24;
    ws.mergeCells(nextActRow, 1, nextActRow, 3);
    ws.getCell(nextActRow, 1).value = tag;
    ws.getCell(nextActRow, 1).font = { bold: true, size: 9 };
    styleReadOnlyCell(ws.getCell(nextActRow, 1));

    ws.mergeCells(nextActRow, 4, nextActRow, 11);
    ws.getCell(nextActRow, 4).value = desc;
    ws.getCell(nextActRow, 4).alignment = { wrapText: true, vertical: 'middle' };
    styleEditableCell(ws.getCell(nextActRow, 4));

    nextActRow++;
  }

  // 6. SECCIÓN 7: ACTIVIDADES A REALIZAR MAÑANA
  const actMananaTitleRow = nextActRow + 1;
  styleSectionHeader(ws, actMananaTitleRow, '7. ACTIVIDADES A REALIZAR MAÑANA', 11);

  const nextMananaRow = actMananaTitleRow + 1;
  ws.getRow(nextMananaRow).height = 36;
  ws.mergeCells(nextMananaRow, 1, nextMananaRow, 11);
  ws.getCell(nextMananaRow, 1).value = 'Continuar excavación en fango e=0.40m y desalojo. Nivelación de subrasante y control topográfico.';
  ws.getCell(nextMananaRow, 1).alignment = { wrapText: true, vertical: 'top' };
  styleEditableCell(ws.getCell(nextMananaRow, 1));

  // 7. SECCIÓN 8: NOVEDADES Y RIESGOS
  const novTitleRow = nextMananaRow + 2;
  styleSectionHeader(ws, novTitleRow, '8. NOVEDADES / PARALIZACIONES / RIESGOS DE SEGURIDAD (GDO)', 11);

  const nextNovRow = novTitleRow + 1;
  ws.getRow(nextNovRow).height = 36;
  ws.mergeCells(nextNovRow, 1, nextNovRow, 11);
  ws.getCell(nextNovRow, 1).value = 'Jornada transcurrida sin paralizaciones ni incidentes graves. Se mantiene bombeo por presencia de nivel freático.';
  ws.getCell(nextNovRow, 1).alignment = { wrapText: true, vertical: 'top' };
  styleEditableCell(ws.getCell(nextNovRow, 1));

  // 8. SECCIÓN 9: COMENTARIOS
  const comTitleRow = nextNovRow + 2;
  styleSectionHeader(ws, comTitleRow, '9. COMENTARIOS Y OBSERVACIONES', 11);

  const nextComRow = comTitleRow + 1;
  ws.getRow(nextComRow).height = 36;
  ws.mergeCells(nextComRow, 1, nextComRow, 5);
  ws.getCell(nextComRow, 1).value = 'COMENTARIOS DEL CONTRATISTA: Se avanza conforme al cronograma de verano aprobado.';
  ws.getCell(nextComRow, 1).alignment = { wrapText: true, vertical: 'top' };
  styleEditableCell(ws.getCell(nextComRow, 1));

  ws.mergeCells(nextComRow, 6, nextComRow, 11);
  ws.getCell(nextComRow, 6).value = 'COMENTARIOS DE FISCALIZACIÓN: Trabajos ejecutados de acuerdo a las especificaciones técnicas.';
  ws.getCell(nextComRow, 6).alignment = { wrapText: true, vertical: 'top' };
  styleEditableCell(ws.getCell(nextComRow, 6));

  // 9. SECCIÓN 11: FIRMAS
  const firmasTitleRow = nextComRow + 2;
  styleSectionHeader(ws, firmasTitleRow, '11. FIRMAS Y RESPONSABLES', 11);

  const nextFirmasRow = firmasTitleRow + 1;
  ws.getRow(nextFirmasRow).height = 45;

  ws.mergeCells(nextFirmasRow, 1, nextFirmasRow, 5);
  ws.getCell(nextFirmasRow, 1).value = 'ELABORADO POR: Ing. María Fernanda Ligua\nCargo: Ing. de Planillas';
  ws.getCell(nextFirmasRow, 1).alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
  ws.getCell(nextFirmasRow, 1).font = { bold: true };
  styleEditableCell(ws.getCell(nextFirmasRow, 1));

  ws.mergeCells(nextFirmasRow, 6, nextFirmasRow, 11);
  ws.getCell(nextFirmasRow, 6).value = `REVISADO POR: Ing. Jerson López\nCargo: Residente de Obra | Fiscalización: ${inspection}`;
  ws.getCell(nextFirmasRow, 6).alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
  ws.getCell(nextFirmasRow, 6).font = { bold: true };
  styleEditableCell(ws.getCell(nextFirmasRow, 6));

  // =========================================================================
  // HOJA 2: Rubros (Catálogo contractual precargado de la obra para consulta)
  // =========================================================================
  const wsRubros = wb.addWorksheet('Rubros', { views: [{ showGridLines: true }] });
  styleTitleBar(wsRubros, 1, 'CATÁLOGO CONTRACTUAL DE RUBROS - FRENTE LICOSA', 7);
  styleSubtitleBar(wsRubros, 2, projName.toUpperCase(), 7);

  wsRubros.columns = [
    { width: 12 }, // N°
    { width: 50 }, // Descripción
    { width: 10 }, // Unid.
    { width: 14 }, // P.U. ($)
    { width: 16 }, // Cant. Asignada
    { width: 18 }, // Monto Total ($)
    { width: 14 }, // Es Principal
  ];

  wsRubros.getRow(3).height = 22;
  styleTableHeader(wsRubros.getCell(3, 1), 'N°');
  styleTableHeader(wsRubros.getCell(3, 2), 'DESCRIPCIÓN');
  styleTableHeader(wsRubros.getCell(3, 3), 'Unid.');
  styleTableHeader(wsRubros.getCell(3, 4), 'P.U. ($)');
  styleTableHeader(wsRubros.getCell(3, 5), 'Cant. asignada LICOSA');
  styleTableHeader(wsRubros.getCell(3, 6), 'Monto asignado LICOSA ($)');
  styleTableHeader(wsRubros.getCell(3, 7), 'Tipo de Rubro');

  let catRow = 4;
  for (const item of rubrosToPrint) {
    wsRubros.getRow(catRow).height = 19;
    wsRubros.getCell(catRow, 1).value = item.rubroNumber;
    wsRubros.getCell(catRow, 1).alignment = { horizontal: 'center' };
    wsRubros.getCell(catRow, 2).value = item.description;
    wsRubros.getCell(catRow, 3).value = item.unit;
    wsRubros.getCell(catRow, 3).alignment = { horizontal: 'center' };

    const puCell = wsRubros.getCell(catRow, 4);
    puCell.value = item.unitPrice || 0;
    puCell.numFmt = '"$"#,##0.00';
    puCell.alignment = { horizontal: 'right' };

    const qtyCell = wsRubros.getCell(catRow, 5);
    qtyCell.value = item.contractQuantity || 0;
    qtyCell.numFmt = '#,##0.00';
    qtyCell.alignment = { horizontal: 'right' };

    const totCell = wsRubros.getCell(catRow, 6);
    totCell.value = item.contractTotal || ((item.contractQuantity || 0) * (item.unitPrice || 0));
    totCell.numFmt = '"$"#,##0.00';
    totCell.alignment = { horizontal: 'right' };

    const priCell = wsRubros.getCell(catRow, 7);
    priCell.value = item.isPrincipal === false ? 'Secundario' : 'Principal';
    priCell.alignment = { horizontal: 'center' };

    for (let c = 1; c <= 7; c++) {
      styleReadOnlyCell(wsRubros.getCell(catRow, c));
    }
    catRow++;
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/**
 * Genera la Plantilla Maestra / Plantilla de Carga General de Proyectos con estilos corporativos completos
 * (INSTRUCCIONES, PROYECTO, Rubros, Registro Diario, RDO, CONTROL DE HOROMETRO).
 */
export async function generateStyledMasterTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LICOSA Automatización';
  wb.created = new Date();

  // 1. PESTAÑA: INSTRUCCIONES
  const wsInst = wb.addWorksheet('INSTRUCCIONES', { views: [{ showGridLines: true }] });
  styleTitleBar(wsInst, 1, 'GUÍA OFICIAL DE USO DE LA PLANTILLA MAESTRA UNIFICADA DE LICOSA', 6);
  styleSubtitleBar(wsInst, 2, 'Sistema de Control de Obras Viales, Infraestructura y Maquinaria Pesada', 6);
  wsInst.columns = [{ width: 28 }, { width: 75 }];

  const instData = [
    ['1. Hoja "PROYECTO"', 'Contiene la ficha contractual del proyecto. Es leída automáticamente al crear un nuevo proyecto en el sistema.'],
    ['2. Hoja "Rubros"', 'Catálogo contractual de rubros presupuestados con sus precios unitarios, unidades y volúmenes.'],
    ['3. Hoja "Registro Diario"', 'Bitácora cronológica de avances volumétricos con tramos y abscisas (DESDE / HASTA).'],
    ['4. Hoja "RDO"', 'Formato oficial de Reporte Diario de Obra con control de clima, EHS, equipos, personal, rubros y actividades.'],
    ['5. Hoja "CONTROL DE HOROMETRO"', 'Control de horómetros de maquinaria con lecturas de inicio, fin y horas totales acumuladas.'],
  ];

  instData.forEach((item, idx) => {
    const r = 4 + idx;
    wsInst.getRow(r).height = 24;
    wsInst.getCell(r, 1).value = item[0];
    wsInst.getCell(r, 1).font = { bold: true };
    styleReadOnlyCell(wsInst.getCell(r, 1));
    wsInst.getCell(r, 2).value = item[1];
    styleReadOnlyCell(wsInst.getCell(r, 2));
  });

  // 2. PESTAÑA: PROYECTO
  const wsProj = wb.addWorksheet('PROYECTO', { views: [{ showGridLines: true }] });
  styleTitleBar(wsProj, 1, 'DATOS GENERALES Y CONTRACTUALES DEL PROYECTO', 3);
  wsProj.columns = [{ width: 32 }, { width: 45 }, { width: 40 }];

  wsProj.getRow(2).height = 22;
  styleTableHeader(wsProj.getCell(2, 1), 'Campo / Parámetro');
  styleTableHeader(wsProj.getCell(2, 2), 'Valor Registrado');
  styleTableHeader(wsProj.getCell(2, 3), 'Descripción / Formato');

  const projRows: Array<[string, any, string]> = [
    ['Codigo', 'OBRA-2026-VALLE', 'Código interno único del proyecto o número de contrato'],
    ['Nombre del Proyecto', 'REHABILITACIÓN DE LA VÍA VALLE DE LA VIRGEN – LÍMITE PROVINCIAL Y LAS MURAS', 'Nombre completo de la obra según contrato'],
    ['Contratista', 'CONSORCIO VALLE DE LA VIRGEN', 'Razón social del contratista adjudicado'],
    ['Cliente / Contratante', 'GAD PROVINCIAL DEL GUAYAS (PREFECTURA DEL GUAYAS)', 'Entidad contratante'],
    ['Fiscalizadora', 'ASOCIACION C-D', 'Empresa o consorcio fiscalizador'],
    ['Empresa Ejecutora', 'LICOSA, Licitaciones y Contratos S.A.', 'Empresa encargada de la ejecución de frente'],
    ['Numero de Contrato', 'EC-PREFGUAYAS-527225-CW-RFB', 'Número oficial del contrato de obra'],
    ['Fuente de Financiamiento', 'BIRF 9722-EC (Banco Mundial)', 'Organismo o entidad financiera'],
    ['Tramo / Ubicacion', 'Pedro Carbo - Colimes (km 0+000 al km 28+500)', 'Ubicación física y tramo del proyecto'],
    ['Monto Contractual ($)', 5939620.30, 'Monto total adjudicado sin IVA'],
    ['Plazo en Dias', 240, 'Plazo contractual de ejecución en días calendario'],
    ['Fecha de Inicio', '2026-06-29', 'Fecha de inicio oficial de la obra (YYYY-MM-DD)'],
    ['Estado', 'EN_EJECUCION', 'EN_EJECUCION | SUSPENDIDO | FINALIZADO'],
  ];

  projRows.forEach((item, idx) => {
    const r = 3 + idx;
    wsProj.getRow(r).height = 20;
    wsProj.getCell(r, 1).value = item[0];
    wsProj.getCell(r, 1).font = { bold: true };
    styleReadOnlyCell(wsProj.getCell(r, 1));

    wsProj.getCell(r, 2).value = item[1];
    if (typeof item[1] === 'number') {
      if (item[0].includes('Monto')) wsProj.getCell(r, 2).numFmt = '"$"#,##0.00';
      else wsProj.getCell(r, 2).numFmt = '#,##0';
    }
    styleEditableCell(wsProj.getCell(r, 2));

    wsProj.getCell(r, 3).value = item[2];
    styleReadOnlyCell(wsProj.getCell(r, 3));
  });

  // 3. PESTAÑA: Rubros
  const wsRubros = wb.addWorksheet('Rubros', { views: [{ showGridLines: true }] });
  styleTitleBar(wsRubros, 1, 'CONTROL DE RUBROS – FRENTE LICOSA (PRESUPUESTO CONTRACTUAL)', 7);
  wsRubros.columns = [
    { width: 10 },
    { width: 52 },
    { width: 10 },
    { width: 14 },
    { width: 16 },
    { width: 18 },
    { width: 14 },
  ];

  wsRubros.getRow(2).height = 22;
  styleTableHeader(wsRubros.getCell(2, 1), 'N°');
  styleTableHeader(wsRubros.getCell(2, 2), 'DESCRIPCIÓN');
  styleTableHeader(wsRubros.getCell(2, 3), 'Unid.');
  styleTableHeader(wsRubros.getCell(2, 4), 'P.U. ($)');
  styleTableHeader(wsRubros.getCell(2, 5), 'Cant. asignada LICOSA');
  styleTableHeader(wsRubros.getCell(2, 6), 'Monto asignado LICOSA ($)');
  styleTableHeader(wsRubros.getCell(2, 7), 'Tipo de Rubro');

  const sampleRubros = [
    [1, 'REPLANTEO Y TRAZADO', 'm2', 1.10, 68681.50, 75549.65, 'Secundario'],
    [2, 'DESBROCE, DESBOSQUE Y LIMPIEZA', 'Ha', 493.20, 1.31, 646.09, 'Secundario'],
    [6, 'EXCAVACIÓN (excavadora)', 'm3', 1.81, 45200.00, 81812.00, 'Principal'],
    [7, 'DESALOJO MATERIAL DE EXCAVACIÓN (distancia hasta 10 km)', 'm3', 3.07, 45200.00, 138764.00, 'Principal'],
    [8, 'MATERIAL DE PRÉSTAMO IMPORTADO (*)', 'm3', 5.28, 125000.00, 660000.00, 'Principal'],
    [10, 'MEJORAMIENTO DE SUBRASANTE CON SUELO SELECCIONADO', 'm3', 8.45, 32000.00, 270400.00, 'Principal'],
    [11, 'SUB-BASE DE AGREGADOS CLASE 3 (e=20cm)', 'm3', 14.80, 24500.00, 362600.00, 'Principal'],
    [12, 'BASE GRANULAR TRITURADA CLASE 1 (e=15cm)', 'm3', 19.50, 18400.00, 358800.00, 'Principal'],
    [14, 'CARPETA DE HORMIGÓN ASFÁLTICO EN CALIENTE (e=7.5cm)', 'm2', 12.40, 92000.00, 1140800.00, 'Principal'],
    [15, 'ALCANTARILLAS TUBULARES DE H.A. D=1200mm', 'm', 145.00, 350.00, 50750.00, 'Principal'],
    [20, 'AGUA PARA CONTROL DE POLVO', 'm3', 2.49, 15000.00, 37350.00, 'Secundario'],
  ];

  sampleRubros.forEach((row, idx) => {
    const r = 3 + idx;
    wsRubros.getRow(r).height = 19;
    wsRubros.getCell(r, 1).value = row[0];
    wsRubros.getCell(r, 1).alignment = { horizontal: 'center' };
    wsRubros.getCell(r, 2).value = row[1];
    wsRubros.getCell(r, 3).value = row[2];
    wsRubros.getCell(r, 3).alignment = { horizontal: 'center' };

    wsRubros.getCell(r, 4).value = row[3];
    wsRubros.getCell(r, 4).numFmt = '"$"#,##0.00';
    styleEditableCell(wsRubros.getCell(r, 4));

    wsRubros.getCell(r, 5).value = row[4];
    wsRubros.getCell(r, 5).numFmt = '#,##0.00';
    styleEditableCell(wsRubros.getCell(r, 5));

    wsRubros.getCell(r, 6).value = { formula: `D${r}*E${r}`, result: row[5] };
    wsRubros.getCell(r, 6).numFmt = '"$"#,##0.00';
    styleReadOnlyCell(wsRubros.getCell(r, 6));

    wsRubros.getCell(r, 7).value = row[6];
    wsRubros.getCell(r, 7).alignment = { horizontal: 'center' };
    styleReadOnlyCell(wsRubros.getCell(r, 7));

    styleReadOnlyCell(wsRubros.getCell(r, 1));
    styleReadOnlyCell(wsRubros.getCell(r, 2));
    styleReadOnlyCell(wsRubros.getCell(r, 3));
  });

  // 4. PESTAÑA: Registro Diario
  const wsReg = wb.addWorksheet('Registro Diario', { views: [{ showGridLines: true }] });
  styleTitleBar(wsReg, 1, 'BITÁCORA DE REGISTRO DIARIO DE EJECUCIÓN (AVANCES VOLUMÉTRICOS DE OBRA)', 12);
  wsReg.columns = [
    { width: 14 },
    { width: 10 },
    { width: 44 },
    { width: 10 },
    { width: 12 },
    { width: 14 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
  ];

  wsReg.getRow(2).height = 22;
  styleTableHeader(wsReg.getCell(2, 1), 'Fecha');
  styleTableHeader(wsReg.getCell(2, 2), 'N° Rubro');
  styleTableHeader(wsReg.getCell(2, 3), 'Descripción');
  styleTableHeader(wsReg.getCell(2, 4), 'Unid.');
  styleTableHeader(wsReg.getCell(2, 5), 'P.U. ($)');
  styleTableHeader(wsReg.getCell(2, 6), 'Cant. ejecutada');
  styleTableHeader(wsReg.getCell(2, 7), 'Monto ejec. ($)');
  styleTableHeader(wsReg.getCell(2, 8), 'SENTIDO');
  styleTableHeader(wsReg.getCell(2, 9), 'DESDE');
  styleTableHeader(wsReg.getCell(2, 10), 'HASTA');
  styleTableHeader(wsReg.getCell(2, 11), 'LONGITUD (M)');
  styleTableHeader(wsReg.getCell(2, 12), 'VOLUMEN (M3)');

  const sampleReg = [
    ['2026-06-29', 1, 'REPLANTEO Y TRAZADO', 'm2', 1.10, 2912.00, 3203.20, 'AMBOS', 0, 260, 260, 2912],
    ['2026-06-29', 2, 'DESBROCE, DESBOSQUE Y LIMPIEZA', 'Ha', 493.20, 0.054, 26.63, 'DER', 80, 260, 180, 540],
    ['2026-06-29', 6, 'EXCAVACIÓN (excavadora)', 'm3', 1.81, 484.61, 877.14, 'EJE', 0, 80, 80, 484.61],
    ['2026-06-29', 20, 'AGUA PARA CONTROL DE POLVO', 'm3', 2.49, 20.00, 49.80, 'EJE', 0, 260, 260, 20],
  ];

  sampleReg.forEach((row, idx) => {
    const r = 3 + idx;
    wsReg.getRow(r).height = 19;
    wsReg.getCell(r, 1).value = row[0];
    wsReg.getCell(r, 1).alignment = { horizontal: 'center' };
    styleEditableCell(wsReg.getCell(r, 1));

    wsReg.getCell(r, 2).value = row[1];
    wsReg.getCell(r, 2).alignment = { horizontal: 'center' };
    styleEditableCell(wsReg.getCell(r, 2));

    wsReg.getCell(r, 3).value = row[2];
    styleReadOnlyCell(wsReg.getCell(r, 3));

    wsReg.getCell(r, 4).value = row[3];
    wsReg.getCell(r, 4).alignment = { horizontal: 'center' };
    styleReadOnlyCell(wsReg.getCell(r, 4));

    wsReg.getCell(r, 5).value = row[4];
    wsReg.getCell(r, 5).numFmt = '"$"#,##0.00';
    styleReadOnlyCell(wsReg.getCell(r, 5));

    wsReg.getCell(r, 6).value = row[5];
    wsReg.getCell(r, 6).numFmt = '#,##0.00';
    styleEditableCell(wsReg.getCell(r, 6));

    wsReg.getCell(r, 7).value = { formula: `E${r}*F${r}`, result: row[6] };
    wsReg.getCell(r, 7).numFmt = '"$"#,##0.00';
    styleReadOnlyCell(wsReg.getCell(r, 7));

    for (let c = 8; c <= 12; c++) {
      wsReg.getCell(r, c).value = row[c - 1];
      wsReg.getCell(r, c).alignment = { horizontal: 'center' };
      styleEditableCell(wsReg.getCell(r, c));
    }
  });

  // 5. PESTAÑA: CONTROL DE HOROMETRO
  const wsHoro = wb.addWorksheet('CONTROL DE HOROMETRO', { views: [{ showGridLines: true }] });
  styleTitleBar(wsHoro, 1, 'CONTROL DE HORÓMETRO DE MAQUINARIA PESADA', 7);
  wsHoro.columns = [
    { width: 16 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 16 },
    { width: 24 },
    { width: 36 },
  ];

  wsHoro.getRow(2).height = 22;
  styleTableHeader(wsHoro.getCell(2, 1), 'EQUIPO');
  styleTableHeader(wsHoro.getCell(2, 2), 'FECHA');
  styleTableHeader(wsHoro.getCell(2, 3), 'INICIO');
  styleTableHeader(wsHoro.getCell(2, 4), 'FIN');
  styleTableHeader(wsHoro.getCell(2, 5), 'TOTAL DE HORAS');
  styleTableHeader(wsHoro.getCell(2, 6), 'UBICACIÓN / TRAMO');
  styleTableHeader(wsHoro.getCell(2, 7), 'OBSERVACIONES');

  const sampleHoro = [
    ['EXC-09', '2026-06-29', 13931.9, 13939.9, 8.0, 'km 0+000 - 0+080', 'Excavación y carga a volquetas'],
    ['TRACTOR-09', '2026-06-29', 1577.7, 1585.7, 8.0, 'km 0+080 - 0+260', 'Desbroce y limpieza'],
    ['RL-06', '2026-06-29', 8479.1, 8481.1, 2.0, 'km 0+000 - 0+080', 'Sellado preliminar'],
  ];

  sampleHoro.forEach((row, idx) => {
    const r = 3 + idx;
    wsHoro.getRow(r).height = 19;
    wsHoro.getCell(r, 1).value = row[0];
    wsHoro.getCell(r, 1).alignment = { horizontal: 'center' };
    styleEditableCell(wsHoro.getCell(r, 1));

    wsHoro.getCell(r, 2).value = row[1];
    wsHoro.getCell(r, 2).alignment = { horizontal: 'center' };
    styleEditableCell(wsHoro.getCell(r, 2));

    wsHoro.getCell(r, 3).value = row[2];
    wsHoro.getCell(r, 3).numFmt = '#,##0.0';
    styleEditableCell(wsHoro.getCell(r, 3));

    wsHoro.getCell(r, 4).value = row[3];
    wsHoro.getCell(r, 4).numFmt = '#,##0.0';
    styleEditableCell(wsHoro.getCell(r, 4));

    wsHoro.getCell(r, 5).value = { formula: `D${r}-C${r}`, result: row[4] };
    wsHoro.getCell(r, 5).numFmt = '#,##0.0';
    wsHoro.getCell(r, 5).alignment = { horizontal: 'center' };
    styleReadOnlyCell(wsHoro.getCell(r, 5));

    wsHoro.getCell(r, 6).value = row[5];
    styleEditableCell(wsHoro.getCell(r, 6));

    wsHoro.getCell(r, 7).value = row[6];
    styleEditableCell(wsHoro.getCell(r, 7));
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
