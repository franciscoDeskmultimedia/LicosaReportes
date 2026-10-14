import ExcelJS from 'exceljs';
import path from 'path';

async function generateTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LICOSA S.A.';
  wb.lastModifiedBy = 'Sistema Integral de Reportes LICOSA';
  wb.created = new Date();
  wb.modified = new Date();

  // Color palette
  const NAVY_DARK = 'FF0F172A';
  const NAVY_HEADER = 'FF1E293B';
  const NAVY_MUTED = 'FF334155';
  const YELLOW_INPUT = 'FFFFFBEB'; // Soft yellow for editable inputs
  const YELLOW_BORDER = 'FFFDE68A';
  const GREEN_FORMULA = 'FFECFDF5'; // Soft emerald for calculated formulas
  const GREEN_BORDER = 'FFA7F3D0';
  const SLATE_BG = 'FFF8FAFC';
  const SLATE_BORDER = 'FFE2E8F0';
  const WHITE = 'FFFFFFFF';
  const ACCENT_ORANGE = 'FFEA580C';

  // ==========================================
  // SHEET 1: INSTRUCCIONES
  // ==========================================
  const wsInst = wb.addWorksheet('INSTRUCCIONES', {
    views: [{ showGridLines: true }],
  });

  wsInst.columns = [
    { width: 4 },  // A
    { width: 28 }, // B
    { width: 55 }, // C
    { width: 30 }, // D
  ];

  // Title
  wsInst.mergeCells('B2:D2');
  const titleCell = wsInst.getCell('B2');
  titleCell.value = 'GUÍA DE LLENADO DE LA PLANTILLA DE PROYECTO (LICOSA)';
  titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: WHITE } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  wsInst.getRow(2).height = 36;

  // Subtitle
  wsInst.mergeCells('B3:D3');
  const subCell = wsInst.getCell('B3');
  subCell.value = 'Esta plantilla está diseñada para ser leída y validada automáticamente por el importador del sistema.';
  subCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF64748B' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  wsInst.getRow(3).height = 22;

  // Legend section
  wsInst.mergeCells('B5:D5');
  const legHeader = wsInst.getCell('B5');
  legHeader.value = '1. CÓDIGO DE COLORES (CONVENCIONES)';
  legHeader.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: NAVY_HEADER } };
  wsInst.getRow(5).height = 24;

  const legendRows = [
    {
      type: '🟡 CELDAS AMARILLAS',
      desc: 'Celdas editables. Ingrese aquí los datos de su proyecto, precios y volúmenes contractuales.',
      fill: YELLOW_INPUT,
      borderCol: YELLOW_BORDER,
      fontCol: 'FF92400E',
    },
    {
      type: '🟢 CELDAS VERDES',
      desc: 'Fórmulas automáticas (Total = Cantidad × P.U., Suma de Presupuesto). No es necesario modificarlas.',
      fill: GREEN_FORMULA,
      borderCol: GREEN_BORDER,
      fontCol: 'FF065F46',
    },
    {
      type: '🔵 ENCABEZADOS AZULES',
      desc: 'Títulos estandarizados del sistema. Mantenga los nombres exactos para que el importador los reconozca.',
      fill: NAVY_HEADER,
      borderCol: NAVY_DARK,
      fontCol: WHITE,
    },
  ];

  legendRows.forEach((item, idx) => {
    const rowNum = 6 + idx;
    wsInst.getRow(rowNum).height = 28;
    const c1 = wsInst.getCell(`B${rowNum}`);
    c1.value = item.type;
    c1.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: item.fontCol } };
    c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.fill } };
    c1.alignment = { horizontal: 'center', vertical: 'middle' };
    c1.border = {
      top: { style: 'thin', color: { argb: item.borderCol } },
      bottom: { style: 'thin', color: { argb: item.borderCol } },
      left: { style: 'thin', color: { argb: item.borderCol } },
      right: { style: 'thin', color: { argb: item.borderCol } },
    };

    wsInst.mergeCells(`C${rowNum}:D${rowNum}`);
    const c2 = wsInst.getCell(`C${rowNum}`);
    c2.value = item.desc;
    c2.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF334155' } };
    c2.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    c2.border = {
      top: { style: 'thin', color: { argb: SLATE_BORDER } },
      bottom: { style: 'thin', color: { argb: SLATE_BORDER } },
      left: { style: 'thin', color: { argb: SLATE_BORDER } },
      right: { style: 'thin', color: { argb: SLATE_BORDER } },
    };
  });

  // Steps
  wsInst.mergeCells('B10:D10');
  const stepsHeader = wsInst.getCell('B10');
  stepsHeader.value = '2. PASOS PARA COMPLETAR Y CARGAR LA PLANTILLA';
  stepsHeader.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: NAVY_HEADER } };
  wsInst.getRow(10).height = 24;

  const steps = [
    'Paso 1: Vaya a la hoja "PROYECTO" y complete los datos generales (Código de obra, Nombre, Contratante, Plazo y Fecha).',
    'Paso 2: Vaya a la hoja "Rubros" y pegue o escriba los rubros de su contrato con su Unidad, P.U. y Cantidad inicial.',
    'Paso 3: Verifique que la columna "Monto Total" calcule automáticamente (P.U. × Cantidad). La fila final sumará el total.',
    'Paso 4: Guarde el archivo en formato .xlsx y cárguelo en el modal "Crear Obra y Cargar Catálogo desde Excel".',
    'Paso 5: El sistema analizará las relaciones y le mostrará diagnósticos y correcciones automáticas sugeridas.',
  ];

  steps.forEach((st, idx) => {
    const rowNum = 11 + idx;
    wsInst.getRow(rowNum).height = 22;
    wsInst.mergeCells(`B${rowNum}:D${rowNum}`);
    const cell = wsInst.getCell(`B${rowNum}`);
    cell.value = st;
    cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF1E293B' } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
  });

  // ==========================================
  // SHEET 2: PROYECTO
  // ==========================================
  const wsProj = wb.addWorksheet('PROYECTO', {
    views: [{ showGridLines: true }],
  });

  wsProj.columns = [
    { width: 4 },  // A
    { width: 28 }, // B: Campo
    { width: 45 }, // C: Valor
    { width: 40 }, // D: Descripción / Recomendación
  ];

  // Header Banner
  wsProj.mergeCells('B2:D2');
  const projTitle = wsProj.getCell('B2');
  projTitle.value = 'DATOS GENERALES Y CONTRACTUALES DEL PROYECTO';
  projTitle.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: WHITE } };
  projTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };
  projTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  wsProj.getRow(2).height = 34;

  // Table header
  wsProj.getRow(4).height = 26;
  const th1 = wsProj.getCell('B4');
  th1.value = 'CAMPO DEL SISTEMA';
  th1.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: WHITE } };
  th1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  th1.alignment = { horizontal: 'left', vertical: 'middle' };

  const th2 = wsProj.getCell('C4');
  th2.value = 'VALOR DEL PROYECTO';
  th2.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: WHITE } };
  th2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  th2.alignment = { horizontal: 'left', vertical: 'middle' };

  const th3 = wsProj.getCell('D4');
  th3.value = 'DESCRIPCIÓN / FORMATO ESPERADO';
  th3.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: WHITE } };
  th3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  th3.alignment = { horizontal: 'left', vertical: 'middle' };

  const projectFields = [
    {
      campo: 'Codigo',
      valor: 'OBRA-VALLE-VIRGEN-01',
      desc: 'Código único de identificación de la obra (ej: OBRA-2024-001)',
      isFormula: false,
      numFmt: undefined,
    },
    {
      campo: 'Nombre',
      valor: 'Rehabilitación y Mejoramiento Vial Valle de la Virgen',
      desc: 'Nombre descriptivo completo de la obra civil',
      isFormula: false,
      numFmt: undefined,
    },
    {
      campo: 'Contratista',
      valor: 'LICOSA, Licitaciones y Contratos S.A.',
      desc: 'Razón social del contratista o consorcio ejecutor',
      isFormula: false,
      numFmt: undefined,
    },
    {
      campo: 'Cliente',
      valor: 'GAD PROVINCIAL DEL GUAYAS',
      desc: 'Entidad contratante o propietario de la obra',
      isFormula: false,
      numFmt: undefined,
    },
    {
      campo: 'Fiscalizacion',
      valor: 'ASOCIACIÓN CONSULTORA VIAL DEL GUAYAS',
      desc: 'Compañía o consorcio a cargo de la fiscalización',
      isFormula: false,
      numFmt: undefined,
    },
    {
      campo: 'Empresa Ejecutora',
      valor: 'LICOSA S.A.',
      desc: 'División o frente técnico a cargo',
      isFormula: false,
      numFmt: undefined,
    },
    {
      campo: 'Numero de Contrato',
      valor: 'LIC-GADG-2024-019-OB',
      desc: 'Número oficial de contrato suscrito con la entidad',
      isFormula: false,
      numFmt: undefined,
    },
    {
      campo: 'Financiamiento',
      valor: 'FONDOS FISCALES GAD GUAYAS',
      desc: 'Fuente de recursos o crédito de financiamiento',
      isFormula: false,
      numFmt: undefined,
    },
    {
      campo: 'Tramo',
      valor: 'Tramo Principal: Km 0+000 al Km 14+800',
      desc: 'Localización de tramo o abscisado vial',
      isFormula: false,
      numFmt: undefined,
    },
    {
      campo: 'Monto Contractual',
      valor: { formula: 'Rubros!F19' }, // Points to Total row in Rubros sheet
      desc: 'Presupuesto total (Fórmula ligada a la suma de rubros)',
      isFormula: true,
      numFmt: '"$"#,##0.00',
    },
    {
      campo: 'Plazo (dias)',
      valor: 180,
      desc: 'Plazo contractual en días calendario',
      isFormula: false,
      numFmt: '#,##0',
    },
    {
      campo: 'Fecha de Inicio',
      valor: '2024-03-01',
      desc: 'Fecha de orden de inicio (AAAA-MM-DD)',
      isFormula: false,
      numFmt: undefined,
    },
  ];

  projectFields.forEach((item, idx) => {
    const rowNum = 5 + idx;
    wsProj.getRow(rowNum).height = 24;

    // Col B: Campo
    const cField = wsProj.getCell(`B${rowNum}`);
    cField.value = item.campo;
    cField.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: NAVY_MUTED } };
    cField.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_BG } };
    cField.border = {
      top: { style: 'thin', color: { argb: SLATE_BORDER } },
      bottom: { style: 'thin', color: { argb: SLATE_BORDER } },
      left: { style: 'thin', color: { argb: SLATE_BORDER } },
      right: { style: 'thin', color: { argb: SLATE_BORDER } },
    };

    // Col C: Valor
    const cVal = wsProj.getCell(`C${rowNum}`);
    cVal.value = item.valor;
    cVal.font = {
      name: 'Segoe UI',
      size: 10,
      bold: item.isFormula,
      color: { argb: item.isFormula ? 'FF065F46' : 'FF0F172A' },
    };
    cVal.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: item.isFormula ? GREEN_FORMULA : YELLOW_INPUT },
    };
    if (item.numFmt) cVal.numFmt = item.numFmt;
    cVal.border = {
      top: { style: 'thin', color: { argb: item.isFormula ? GREEN_BORDER : YELLOW_BORDER } },
      bottom: { style: 'thin', color: { argb: item.isFormula ? GREEN_BORDER : YELLOW_BORDER } },
      left: { style: 'thin', color: { argb: item.isFormula ? GREEN_BORDER : YELLOW_BORDER } },
      right: { style: 'thin', color: { argb: item.isFormula ? GREEN_BORDER : YELLOW_BORDER } },
    };

    // Col D: Desc
    const cDesc = wsProj.getCell(`D${rowNum}`);
    cDesc.value = item.desc;
    cDesc.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    cDesc.border = {
      top: { style: 'thin', color: { argb: SLATE_BORDER } },
      bottom: { style: 'thin', color: { argb: SLATE_BORDER } },
      left: { style: 'thin', color: { argb: SLATE_BORDER } },
      right: { style: 'thin', color: { argb: SLATE_BORDER } },
    };
  });

  // ==========================================
  // SHEET 3: Rubros
  // ==========================================
  const wsRubros = wb.addWorksheet('Rubros', {
    views: [{ showGridLines: true }],
  });

  wsRubros.columns = [
    { width: 4 },  // A
    { width: 8 },  // B: N°
    { width: 55 }, // C: Descripción
    { width: 12 }, // D: Unidad
    { width: 18 }, // E: Precio Unitario
    { width: 20 }, // F: Cantidad
    { width: 22 }, // G: Total
    { width: 16 }, // H: Clasificación
  ];

  // Header Banner
  wsRubros.mergeCells('B2:H2');
  const rTitle = wsRubros.getCell('B2');
  rTitle.value = 'PRESUPUESTO CONTRACTUAL Y CATÁLOGO DE RUBROS DE OBRA';
  rTitle.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: WHITE } };
  rTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };
  rTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  wsRubros.getRow(2).height = 34;

  // Table Headers
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
    c.border = {
      top: { style: 'medium', color: { argb: NAVY_DARK } },
      bottom: { style: 'medium', color: { argb: NAVY_DARK } },
    };
  });

  // 14 representative roadwork rubros from Valle de la Virgen
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

    // B: N°
    const cNum = wsRubros.getCell(`B${rowNum}`);
    cNum.value = r.num;
    cNum.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF475569' } };
    cNum.alignment = { horizontal: 'center', vertical: 'middle' };
    cNum.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_BG } };

    // C: Desc
    const cDesc = wsRubros.getCell(`C${rowNum}`);
    cDesc.value = r.desc;
    cDesc.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF0F172A' } };
    cDesc.alignment = { horizontal: 'left', vertical: 'middle' };
    cDesc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };

    // D: Unit
    const cUnit = wsRubros.getCell(`D${rowNum}`);
    cUnit.value = r.unit;
    cUnit.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF334155' } };
    cUnit.alignment = { horizontal: 'center', vertical: 'middle' };
    cUnit.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };

    // E: PU
    const cPu = wsRubros.getCell(`E${rowNum}`);
    cPu.value = r.pu;
    cPu.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF0F172A' } };
    cPu.alignment = { horizontal: 'right', vertical: 'middle' };
    cPu.numFmt = '"$"#,##0.00';
    cPu.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };

    // F: Cantidad
    const cQty = wsRubros.getCell(`F${rowNum}`);
    cQty.value = r.qty;
    cQty.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF0F172A' } };
    cQty.alignment = { horizontal: 'right', vertical: 'middle' };
    cQty.numFmt = '#,##0.00';
    cQty.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_INPUT } };

    // G: Total (Formula: =E#*F#)
    const cTot = wsRubros.getCell(`G${rowNum}`);
    cTot.value = { formula: `E${rowNum}*F${rowNum}`, result: r.pu * r.qty };
    cTot.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF065F46' } };
    cTot.alignment = { horizontal: 'right', vertical: 'middle' };
    cTot.numFmt = '"$"#,##0.00';
    cTot.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_FORMULA } };

    // H: Tipo
    const cType = wsRubros.getCell(`H${rowNum}`);
    cType.value = r.principal ? 'Principal' : 'Normal';
    cType.font = {
      name: 'Segoe UI',
      size: 9,
      bold: true,
      color: { argb: r.principal ? ACCENT_ORANGE : 'FF64748B' },
    };
    cType.alignment = { horizontal: 'center', vertical: 'middle' };
    cType.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_BG } };

    // Apply borders
    ['B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach((col) => {
      const cell = wsRubros.getCell(`${col}${rowNum}`);
      cell.border = {
        top: { style: 'thin', color: { argb: SLATE_BORDER } },
        bottom: { style: 'thin', color: { argb: SLATE_BORDER } },
        left: { style: 'thin', color: { argb: SLATE_BORDER } },
        right: { style: 'thin', color: { argb: SLATE_BORDER } },
      };
    });
  });

  // TOTAL BUDGET ROW
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
  const sumFormula = `SUM(G5:G${lastItemRow})`;
  const expectedSum = sampleRubros.reduce((acc, r) => acc + (r.pu * r.qty), 0);
  totalVal.value = { formula: sumFormula, result: expectedSum };
  totalVal.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: WHITE } };
  totalVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } }; // Deep emerald
  totalVal.numFmt = '"$"#,##0.00';
  totalVal.alignment = { horizontal: 'right', vertical: 'middle' };

  const totalEmpty = wsRubros.getCell(`H${totalRow}`);
  totalEmpty.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };

  // Update formula in PROYECTO sheet to point to this exact total cell!
  const projMontoCell = wsProj.getCell('C14');
  projMontoCell.value = { formula: `Rubros!G${totalRow}`, result: expectedSum };

  // Write file
  const outputPath = path.join(process.cwd(), 'public', 'plantillas', 'Plantilla_Carga_Licosa.xlsx');
  await wb.xlsx.writeFile(outputPath);
  console.log('✅ Plantilla Excel generada exitosamente en:', outputPath);
}

generateTemplate().catch(console.error);
