import * as XLSX from 'xlsx';

export interface ProjectImportSuggestion {
  id: string;
  type: 'info' | 'warning' | 'success';
  title: string;
  message: string;
  actionLabel?: string;
  actionType?: 'FIX_AMOUNT' | 'RENUMBER_RUBROS' | 'AUTO_CLASSIFY_PRINCIPALS';
  targetValue?: any;
}

export interface ParsedProjectExcelResult {
  success: boolean;
  error?: string;
  projectData: {
    code: string;
    name: string;
    contractor: string;
    client: string;
    inspectionCompany: string;
    executingCompany: string;
    contractNumber: string;
    financingSource: string;
    roadSection: string;
    contractAmount: number;
    durationDays: number;
    startDate: string;
    status: string;
  };
  rubros: Array<{
    rubroNumber: number;
    description: string;
    unit: string;
    unitPrice: number;
    initialQuantity: number;
    isPrincipal: boolean;
  }>;
  sheetNames: string[];
  detectedRubrosSheet?: string;
  suggestions: ProjectImportSuggestion[];
  metrics: {
    rubrosCount: number;
    rubrosSum: number;
    declaredAmount: number;
    difference: number;
    principalCount: number;
    duplicateCount: number;
    zeroPriceCount: number;
  };
}

export function parseProjectWorkbook(wb: XLSX.WorkBook, fileName: string): ParsedProjectExcelResult {
  const sheetNames = wb.SheetNames;

  const projectData = {
    code: '',
    name: '',
    contractor: 'LICOSA, Licitaciones y Contratos S.A.',
    client: 'GAD PROVINCIAL DEL GUAYAS',
    inspectionCompany: '',
    executingCompany: 'LICOSA',
    contractNumber: '',
    financingSource: '',
    roadSection: '',
    contractAmount: 0,
    durationDays: 180,
    startDate: new Date().toISOString().split('T')[0],
    status: 'EN_EJECUCION',
  };

  // 1. Extraer metadatos de la hoja PROYECTO si existe
  const projSheetName = sheetNames.find((s) => s.trim().toUpperCase() === 'PROYECTO');
  if (projSheetName) {
    const wsProj = wb.Sheets[projSheetName];
    const rows = XLSX.utils.sheet_to_json(wsProj, { header: 1 }) as any[][];
    for (const row of rows) {
      if (!row || !row[0]) continue;
      const key = String(row[0]).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      const val = row[1];
      if (val === undefined || val === null || val === '') continue;

      if (key.includes('codigo') || key.includes('code')) projectData.code = String(val).trim().toUpperCase();
      else if (key.includes('nombre') || key.includes('proyecto')) projectData.name = String(val).trim();
      else if (key.includes('contratista')) projectData.contractor = String(val).trim();
      else if (key.includes('cliente') || key.includes('contratante')) projectData.client = String(val).trim();
      else if (key.includes('fiscaliza')) projectData.inspectionCompany = String(val).trim();
      else if (key.includes('ejecutora') || key.includes('empresa')) projectData.executingCompany = String(val).trim();
      else if (key.includes('numero_contrato') || key.includes('contrato')) projectData.contractNumber = String(val).trim();
      else if (key.includes('financiamiento') || key.includes('fuente')) projectData.financingSource = String(val).trim();
      else if (key.includes('tramo') || key.includes('segmento')) projectData.roadSection = String(val).trim();
      else if (key.includes('monto') || key.includes('presupuesto')) {
        const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '').trim());
        if (!isNaN(num)) projectData.contractAmount = num;
      } else if (key.includes('plazo') || key.includes('dias')) {
        const num = typeof val === 'number' ? val : parseInt(String(val).replace(/,/g, '').trim());
        if (!isNaN(num)) projectData.durationDays = num;
      } else if (key.includes('fecha_inicio') || key.includes('inicio')) {
        if (val instanceof Date) {
          projectData.startDate = val.toISOString().split('T')[0];
        } else if (typeof val === 'number') {
          const epoch = new Date(Date.UTC(1899, 11, 30));
          projectData.startDate = new Date(epoch.getTime() + val * 86400000).toISOString().split('T')[0];
        } else {
          const parsed = new Date(String(val));
          if (!isNaN(parsed.getTime())) projectData.startDate = parsed.toISOString().split('T')[0];
        }
      }
    }
  }

  // 2. Extraer catálogo de rubros
  const rubrosSheetName =
    sheetNames.find((s) => s.trim().toUpperCase() === 'RUBROS' || s.trim().toUpperCase() === 'PRESUPUESTO') ||
    sheetNames.find((s) => s.toLowerCase().includes('rubro')) ||
    sheetNames.find((s) => s.trim().toUpperCase() !== 'INSTRUCCIONES' && s.trim().toUpperCase() !== 'PROYECTO');

  const rubros: ParsedProjectExcelResult['rubros'] = [];

  if (rubrosSheetName) {
    const wsRubros = wb.Sheets[rubrosSheetName];
    const rows = XLSX.utils.sheet_to_json(wsRubros, { header: 1 }) as any[][];

    // Extraer título / nombre de obra si está en la fila 0 o 1
    if (!projectData.name && rows[0]?.[0]) {
      const title = String(rows[0][0]);
      if (title.toUpperCase().includes('OBRA') || title.toUpperCase().includes('PROYECTO') || title.toUpperCase().includes('VALLE') || title.toUpperCase().includes('METROPOLIS')) {
        const cleanedTitle = title
          .replace(/^CONTROL DE RUBROS\s*[-–—]\s*/i, '')
          .replace(/\s*[-–—]\s*LICOSA$/i, '')
          .trim();
        if (cleanedTitle.length > 3) projectData.name = cleanedTitle;
      }
    }

    let headerIdx = -1;
    let colNum = 0;
    let colDesc = 1;
    let colUnit = 2;
    let colPrice = 3;
    let colQty = 4;
    let colType = 6;

    // Buscar fila de encabezados
    for (let i = 0; i < Math.min(20, rows.length); i++) {
      const row = rows[i];
      if (!row) continue;
      const rowStr = row.map((c) => String(c || '').toUpperCase()).join(' | ');
      if (rowStr.includes('DESCRIP') || (rowStr.includes('RUBRO') && rowStr.includes('UNID'))) {
        headerIdx = i;
        // Asignar columnas encontradas
        row.forEach((cell: any, cIdx: number) => {
          const text = String(cell || '').trim().toUpperCase();
          if (text.includes('N°') || text === 'ITEM' || text === 'RUBRO' || text === 'NUM') colNum = cIdx;
          else if (text.includes('DESCRIP') || text.includes('DETALLE') || text.includes('CONCEPTO')) colDesc = cIdx;
          else if (text.includes('UNID') || text.includes('MEDIDA') || text === 'U.') colUnit = cIdx;
          else if (text.includes('P.U') || text.includes('PRECIO') || text.includes('UNITARIO')) colPrice = cIdx;
          else if ((text.includes('CANT') || text.includes('VOLUMEN')) && !text.includes('ACUM') && !text.includes('%') && !text.includes('EJEC')) colQty = cIdx;
          else if (text.includes('TIPO') || text.includes('CLASIF')) colType = cIdx;
        });
        break;
      }
    }

    const startRow = headerIdx >= 0 ? headerIdx + 1 : 0;
    let autoNum = 1;

    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const rawDesc = row[colDesc];
      if (!rawDesc || typeof rawDesc !== 'string' || rawDesc.trim().length < 2) continue;
      const description = rawDesc.trim();

      // Evitar procesar filas que sean subtotales o encabezados
      if (description.toUpperCase().includes('PRESUPUESTO TOTAL') || description.toUpperCase().includes('SUMA TOTAL')) {
        continue;
      }

      const rawPrice = row[colPrice];
      let unitPrice = 0;
      if (typeof rawPrice === 'number') unitPrice = rawPrice;
      else if (rawPrice) {
        unitPrice = parseFloat(String(rawPrice).replace(/,/g, '').trim()) || 0;
      }

      const rawQty = row[colQty];
      let initialQuantity = 0;
      if (typeof rawQty === 'number') initialQuantity = rawQty;
      else if (rawQty) {
        initialQuantity = parseFloat(String(rawQty).replace(/,/g, '').trim()) || 0;
      }

      const rawNum = row[colNum];
      // Si no tiene número explícito ni precio ni cantidad, es un encabezado de sección/capítulo (ej: OBRAS PRELIMINARES)
      if ((rawNum === undefined || rawNum === null || rawNum === '') && unitPrice === 0 && initialQuantity === 0) {
        continue;
      }

      let rubroNumber = typeof rawNum === 'number' ? rawNum : parseInt(String(rawNum || '').trim());
      if (isNaN(rubroNumber) || rubroNumber <= 0) {
        rubroNumber = autoNum;
      }
      autoNum = Math.max(autoNum, rubroNumber + 1);

      const unit = String(row[colUnit] || 'u').trim();
      const rawType = row[colType];
      const isPrincipalExplicit = rawType && String(rawType).toLowerCase().includes('prin');

      if (unitPrice > 0 || initialQuantity > 0 || (rawNum !== undefined && rawNum !== null && rawNum !== '')) {
        const totalVal = unitPrice * initialQuantity;
        rubros.push({
          rubroNumber,
          description,
          unit,
          unitPrice,
          initialQuantity,
          isPrincipal: Boolean(isPrincipalExplicit || totalVal > 15000),
        });
      }
    }
  }

  // 3. Cálculos de métricas y validaciones de relaciones
  const rubrosSum = rubros.reduce((acc, r) => acc + (r.unitPrice * r.initialQuantity), 0);
  const declaredAmount = projectData.contractAmount;

  // Detectar números duplicados
  const numCounts = new Map<number, number>();
  rubros.forEach((r) => numCounts.set(r.rubroNumber, (numCounts.get(r.rubroNumber) || 0) + 1));
  const duplicateNumbers = Array.from(numCounts.entries()).filter(([_, count]) => count > 1);

  // Detectar rubros con precio o cantidad en 0
  const zeroPrices = rubros.filter((r) => r.unitPrice <= 0 || r.initialQuantity <= 0);

  // Conteo de principales
  const principalCount = rubros.filter((r) => r.isPrincipal).length;

  // Sugerencias inteligentes
  const suggestions: ProjectImportSuggestion[] = [];

  // Relación A: Monto Contractual vs Suma de Rubros
  if (declaredAmount === 0 && rubrosSum > 0) {
    projectData.contractAmount = rubrosSum;
    suggestions.push({
      id: 'auto-amount',
      type: 'info',
      title: 'Presupuesto Calculado Automáticamente',
      message: `El monto contractual se calculó como la suma de los ${rubros.length} rubros detectados ($${rubrosSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).`,
    });
  } else if (rubrosSum > 0 && Math.abs(declaredAmount - rubrosSum) > 0.50) {
    const diff = declaredAmount - rubrosSum;
    suggestions.push({
      id: 'diff-amount',
      type: 'warning',
      title: 'Discrepancia en Presupuesto Contractual',
      message: `El monto contractual declarado en la ficha ($${declaredAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}) difiere de la suma de rubros ($${rubrosSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}). Diferencia: ${diff > 0 ? '+' : ''}$${diff.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`,
      actionLabel: `Ajustar a $${rubrosSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      actionType: 'FIX_AMOUNT',
      targetValue: rubrosSum,
    });
  } else if (rubrosSum > 0) {
    suggestions.push({
      id: 'amount-ok',
      type: 'success',
      title: 'Presupuesto Consistente',
      message: `El monto contractual declarado coincide exactamente con la sumatoria de rubros ($${rubrosSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}).`,
    });
  }

  // Relación B: Numeración de Rubros Duplicados
  if (duplicateNumbers.length > 0) {
    const dupSample = duplicateNumbers.slice(0, 3).map(([n]) => `N° ${n}`).join(', ');
    suggestions.push({
      id: 'dup-numbers',
      type: 'warning',
      title: 'Números de Rubro Duplicados',
      message: `Se detectaron ${duplicateNumbers.length} números repetidos (${dupSample}${duplicateNumbers.length > 3 ? '...' : ''}). Para evitar conflictos en reportes diarios, se recomienda re-enumerarlos correlativamente.`,
      actionLabel: 'Re-enumerar del 1 al N',
      actionType: 'RENUMBER_RUBROS',
    });
  }

  // Relación C: Precios o Volúmenes en Cero
  if (zeroPrices.length > 0) {
    suggestions.push({
      id: 'zero-prices',
      type: 'info',
      title: 'Rubros con Precio o Cantidad en Cero',
      message: `Hay ${zeroPrices.length} rubro(s) con precio unitario o cantidad contractual en $0.00. Podrán registrarse avances una vez definidos sus valores.`,
    });
  }

  // Relación D: Sugerencia de Clasificación Pareto (80/20)
  if (rubros.length >= 5) {
    if (principalCount === 0 || principalCount > rubros.length * 0.7) {
      suggestions.push({
        id: 'pareto-rubros',
        type: 'info',
        title: 'Optimización de Rubros Principales (Ley de Pareto)',
        message: `El sistema puede clasificar automáticamente como "Principales" los rubros que representan el 80% del valor económico de la obra para el seguimiento en reportes diarios.`,
        actionLabel: 'Auto-clasificar Principales (80/20)',
        actionType: 'AUTO_CLASSIFY_PRINCIPALS',
      });
    }
  }

  // Si el código no vino, generar uno tentativo
  if (!projectData.code) {
    projectData.code = `OBRA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;
  }
  if (!projectData.name) {
    projectData.name = fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
  }

  return {
    success: true,
    projectData,
    rubros,
    sheetNames,
    detectedRubrosSheet: rubrosSheetName,
    suggestions,
    metrics: {
      rubrosCount: rubros.length,
      rubrosSum,
      declaredAmount: projectData.contractAmount,
      difference: projectData.contractAmount - rubrosSum,
      principalCount,
      duplicateCount: duplicateNumbers.length,
      zeroPriceCount: zeroPrices.length,
    },
  };
}

/**
 * Parsea el archivo Excel directamente en el navegador del cliente.
 * Evita subir archivos pesados (ej. 66MB con fotos) a través de la red a Vercel.
 */
export async function parseProjectFileClient(file: File): Promise<ParsedProjectExcelResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    return parseProjectWorkbook(wb, file.name);
  } catch (err: any) {
    console.error('Error parseando Excel en cliente:', err);
    return {
      success: false,
      error: err?.message || 'Error al procesar el archivo Excel en el navegador.',
      projectData: {} as any,
      rubros: [],
      sheetNames: [],
      suggestions: [],
      metrics: {
        rubrosCount: 0,
        rubrosSum: 0,
        declaredAmount: 0,
        difference: 0,
        principalCount: 0,
        duplicateCount: 0,
        zeroPriceCount: 0,
      },
    };
  }
}

/**
 * Remueve pestañas pesadas (fotos, imágenes) de un archivo Excel grande antes de enviarlo
 * para que no exceda el límite de carga de Vercel (4.5MB).
 */
export async function stripHeavySheets(file: File): Promise<File> {
  // Si el archivo ya es ligero (< 3MB), enviarlo tal cual
  if (file.size < 3 * 1024 * 1024) {
    return file;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const cleanWb = XLSX.utils.book_new();

    let hasCleanSheets = false;
    for (const name of wb.SheetNames) {
      const lower = name.toLowerCase();
      // Filtrar álbumes fotográficos e imágenes
      if (lower.includes('foto') || lower.includes('imagen') || lower.includes('picture')) {
        continue;
      }
      XLSX.utils.book_append_sheet(cleanWb, wb.Sheets[name], name);
      hasCleanSheets = true;
    }

    if (!hasCleanSheets) {
      return file;
    }

    const cleanBuffer = XLSX.write(cleanWb, { type: 'array', bookType: 'xlsx' });
    return new File([cleanBuffer], file.name, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  } catch (err) {
    console.warn('No se pudo aligerar el Excel, enviando original:', err);
    return file;
  }
}
