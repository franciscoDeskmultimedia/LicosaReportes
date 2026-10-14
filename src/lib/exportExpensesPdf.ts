import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportExpensesPdfParams {
  projectName: string;
  projectCode: string;
  contractAmount: number;
  expenses: any[];
  filters: {
    searchTerm?: string;
    selectedCategory?: string;
    selectedDocType?: string;
    totalUnfiltered?: number;
  };
}

export function exportExpensesToPdf({
  projectName,
  projectCode,
  contractAmount,
  expenses,
  filters,
}: ExportExpensesPdfParams) {
  // Landscape A4 orientation
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Color Palette
  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const emeraldColor: [number, number, number] = [5, 150, 105]; // Emerald 600
  const lightGray: [number, number, number] = [248, 250, 252]; // Slate 50
  const darkTextColor: [number, number, number] = [30, 41, 59]; // Slate 800

  // 1. Header Top Bar
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 16, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('LICOSA S.A.  •  CONTROL FINANCIERO Y DE COSTOS DE OBRA', 14, 10.5);

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Fecha de emisión: ${dateStr} ${timeStr}`, pageWidth - 14, 10.5, { align: 'right' });

  // 2. Project Information
  doc.setTextColor(...darkTextColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`REPORTE DE COSTOS Y COMPROBANTES: ${projectCode.toUpperCase()}`, 14, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Proyecto: ${projectName}`, 14, 29);
  doc.text(
    `Presupuesto Contractual: $${contractAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    pageWidth - 14,
    29,
    { align: 'right' }
  );

  // 3. Search & Filter Criteria Banner
  const filterTokens: string[] = [];
  if (filters.selectedCategory && filters.selectedCategory !== 'ALL') {
    filterTokens.push(`Categoría: "${filters.selectedCategory}"`);
  }
  if (filters.selectedDocType && filters.selectedDocType !== 'ALL') {
    filterTokens.push(`Tipo Doc: "${filters.selectedDocType}"`);
  }
  if (filters.searchTerm && filters.searchTerm.trim()) {
    filterTokens.push(`Término: "${filters.searchTerm.trim()}"`);
  }

  const isFiltered = filterTokens.length > 0;
  const criteriaText = isFiltered
    ? `Filtros activos: ${filterTokens.join('  |  ')}  (${expenses.length} de ${filters.totalUnfiltered ?? expenses.length} comprobantes)`
    : `Criterio: Todos los comprobantes de la obra (${expenses.length} registros)`;

  doc.setFillColor(...lightGray);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 33, pageWidth - 28, 8, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(isFiltered ? emeraldColor[0] : 71, isFiltered ? emeraldColor[1] : 85, isFiltered ? emeraldColor[2] : 105);
  doc.text(criteriaText, 18, 38.5);

  // 4. Financial Totals of the current set
  const totalSubtotal = expenses.reduce((acc, e) => acc + ((e.subtotalIva || 0) + (e.subtotalZero || 0)), 0);
  const totalIva = expenses.reduce((acc, e) => acc + (e.iva || 0), 0);
  const totalRetentions = expenses.reduce((acc, e) => acc + (e.retentions || 0), 0);
  const totalCost = expenses.reduce((acc, e) => acc + (e.total || 0), 0);
  const totalBalance = expenses.reduce((acc, e) => acc + (e.balance || 0), 0);

  // Mini KPI Cards
  const kpiY = 44;
  const kpiHeight = 13;
  const kpiCount = 4;
  const kpiGap = 4;
  const kpiWidth = (pageWidth - 28 - (kpiCount - 1) * kpiGap) / kpiCount;

  const kpis = [
    {
      title: 'TOTAL COSTOS FILTRADOS',
      value: `$${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      color: emeraldColor,
    },
    {
      title: 'BASE IMPONIBLE (SUBTOTAL)',
      value: `$${totalSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      color: primaryColor,
    },
    {
      title: 'IVA PAGADO',
      value: `$${totalIva.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      color: [79, 70, 229] as [number, number, number],
    },
    {
      title: 'RETENCIONES & SALDO PENDIENTE',
      value: `Ret: $${totalRetentions.toLocaleString('en-US', { maximumFractionDigits: 0 })} | Saldo: $${totalBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      color: [180, 83, 9] as [number, number, number],
    },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (kpiWidth + kpiGap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, kpiY, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title, x + 3.5, kpiY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, x + 3.5, kpiY + 10);
  });

  // 5. Build Expenses Table
  const tableData = expenses.map((e, index) => {
    const rawDate = e.date ? (typeof e.date === 'string' ? e.date : e.date.toISOString().split('T')[0]) : '---';
    const subtotal = (e.subtotalIva || 0) + (e.subtotalZero || 0);

    return [
      String(index + 1),
      rawDate,
      e.documentType || 'FAC',
      e.documentNumber || '---',
      e.supplier || '---',
      e.category || 'Otros',
      (e.description || '').replace(/\s+/g, ' ').substring(0, 45),
      `$${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `$${(e.iva || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `$${(e.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `$${(e.retentions || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `$${(e.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    ];
  });

  autoTable(doc, {
    startY: kpiY + kpiHeight + 4,
    head: [
      [
        '#',
        'Fecha',
        'Tipo',
        'N° Comprobante',
        'Proveedor / Razón Social',
        'Categoría',
        'Detalle / Concepto',
        'Subtotal',
        'IVA',
        'Total ($)',
        'Ret.',
        'Saldo ($)',
      ],
    ],
    body: tableData,
    foot: [
      [
        '',
        '',
        '',
        'TOTALES',
        `${expenses.length} registros`,
        '',
        '',
        `$${totalSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `$${totalIva.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `$${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `$${totalRetentions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `$${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ],
    ],
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      valign: 'middle',
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
      halign: 'left',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' }, // #
      1: { cellWidth: 18, halign: 'center' }, // Fecha
      2: { cellWidth: 12, halign: 'center' }, // Tipo
      3: { cellWidth: 26 }, // N° Comp
      4: { cellWidth: 42 }, // Proveedor
      5: { cellWidth: 26 }, // Categoría
      6: { cellWidth: 'auto' }, // Detalle
      7: { cellWidth: 20, halign: 'right' }, // Subtotal
      8: { cellWidth: 16, halign: 'right' }, // IVA
      9: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: emeraldColor }, // Total
      10: { cellWidth: 16, halign: 'right' }, // Ret
      11: { cellWidth: 18, halign: 'right' }, // Saldo
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14, bottom: 20 },
    didDrawPage: (data) => {
      // Footer on every page
      const pageNumber = data.pageNumber;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);

      // Left footer
      doc.text(
        `LICOSA S.A.  •  Sistema de Gestión y Control de Obras  •  ${projectCode}`,
        14,
        pageHeight - 8
      );

      // Right footer
      doc.text(`Página ${pageNumber}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
    },
  });

  // Save the PDF directly to user's downloads
  const sanitizedCode = projectCode.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Costos_${sanitizedCode}_${dateStr.replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}
