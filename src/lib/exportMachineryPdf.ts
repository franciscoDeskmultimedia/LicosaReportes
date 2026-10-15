import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface MachineryLogExportItem {
  id: string;
  dayHours: number;
  hourlyRate?: number | null;
  notes: string | null;
  dailyReport: {
    id: string;
    reportNumber: number;
    date: Date | string;
    roadSection?: string;
    project?: {
      id: string;
      code: string;
      name: string;
    };
  };
}

export interface MachineryExportData {
  id: string;
  code: string;
  name: string;
  category: string;
  plateOrSerial: string | null;
  unit: string;
  status: string;
  hourlyRate: number;
  totalHoursWorked: number;
  dailyLogs: MachineryLogExportItem[];
}

export function exportMachineryToPdf(machine: MachineryExportData) {
  // A4 Portrait
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colors
  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const orangeAccent: [number, number, number] = [234, 88, 12]; // Orange 600
  const emeraldColor: [number, number, number] = [5, 150, 105]; // Emerald 600
  const lightBg: [number, number, number] = [248, 250, 252]; // Slate 50

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

  // Calculate totals
  const logs = [...machine.dailyLogs].sort((a, b) => {
    const da = new Date(a.dailyReport.date).getTime();
    const db = new Date(b.dailyReport.date).getTime();
    return da - db; // chronological order for progression
  });

  const totalHours = logs.reduce((acc, l) => acc + (l.dayHours || 0), 0) || machine.totalHoursWorked || 0;
  const rate = machine.hourlyRate || 0;
  const totalValue = logs.reduce((acc, l) => {
    const logRate = l.hourlyRate ?? rate;
    return acc + ((l.dayHours || 0) * logRate);
  }, 0) || (totalHours * rate);

  // Group by Project
  const projectMap = new Map<
    string,
    {
      code: string;
      name: string;
      hours: number;
      value: number;
      reportsCount: number;
    }
  >();

  logs.forEach((log) => {
    const proj = log.dailyReport.project;
    const key = proj?.id || 'SIN_OBRA';
    const projCode = proj?.code || 'OBRA GENERAL';
    const projName = proj?.name || 'Obra no especificada';
    const logRate = log.hourlyRate ?? rate;
    const val = (log.dayHours || 0) * logRate;

    const current = projectMap.get(key) || {
      code: projCode,
      name: projName,
      hours: 0,
      value: 0,
      reportsCount: 0,
    };

    current.hours += log.dayHours || 0;
    current.value += val;
    current.reportsCount += 1;
    projectMap.set(key, current);
  });

  const projectsSummary = Array.from(projectMap.values()).sort((a, b) => b.hours - a.hours);

  // 1. Header Bar
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 16, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('LICOSA S.A.  •  CONTROL DE MAQUINARIA Y RENDIMIENTO OPERATIVO', 14, 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Emisión: ${dateStr} ${timeStr}`, pageWidth - 14, 10.5, { align: 'right' });

  // 2. Equipment Title & Metadata Box
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`FICHA TÉCNICA Y RESUMEN DE HORAS: [${machine.code}]`, 14, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Equipo: ${machine.name}  |  Categoría: ${machine.category}  |  Estado: ${machine.status}`, 14, 29);

  if (machine.plateOrSerial) {
    doc.text(`Placa / Serie: ${machine.plateOrSerial}`, pageWidth - 14, 29, { align: 'right' });
  }

  // 3. Top Metrics KPI Cards (4 cards)
  const kpiY = 33;
  const kpiHeight = 15;
  const kpiCount = 4;
  const kpiGap = 3.5;
  const kpiWidth = (pageWidth - 28 - (kpiCount - 1) * kpiGap) / kpiCount;

  const kpis = [
    {
      title: 'HORAS TOTALES',
      value: `${totalHours.toFixed(1)} ${machine.unit || 'h'}`,
      color: orangeAccent,
    },
    {
      title: 'VALOR HORA ($/h)',
      value: `$${rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      color: primaryColor,
    },
    {
      title: 'VALOR TOTAL GENERADO',
      value: `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      color: emeraldColor,
    },
    {
      title: 'OBRAS / REPORTES',
      value: `${projectsSummary.length} obras  |  ${logs.length} rep.`,
      color: [79, 70, 229] as [number, number, number],
    },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (kpiWidth + kpiGap);
    doc.setFillColor(...lightBg);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, kpiY, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title, x + 3, kpiY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, x + 3, kpiY + 11.5);
  });

  // 4. Vector Graphic: S-Curve / Progression of Hours over Time
  let currentY = kpiY + kpiHeight + 6;

  if (logs.length > 1) {
    const graphBoxY = currentY;
    const graphBoxHeight = 36;
    const graphInnerWidth = pageWidth - 28;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, graphBoxY, graphInnerWidth, graphBoxHeight, 2, 2, 'FD');

    // Graph Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('CURVA DE HORAS ACUMULADAS TRABAJADAS EN EL TIEMPO', 18, graphBoxY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Evolución cronológica de horas reportadas por jornada', pageWidth - 18, graphBoxY + 5.5, {
      align: 'right',
    });

    // Chart Area coordinates
    const chartLeft = 24;
    const chartRight = pageWidth - 20;
    const chartTop = graphBoxY + 8;
    const chartBottom = graphBoxY + graphBoxHeight - 6;
    const chartWidth = chartRight - chartLeft;
    const chartHeight = chartBottom - chartTop;

    // Gridlines
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    [0, 0.5, 1].forEach((pct) => {
      const y = chartBottom - chartHeight * pct;
      doc.line(chartLeft, y, chartRight, y);

      const val = totalHours * pct;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`${val.toFixed(0)}h`, chartLeft - 2, y + 1.5, { align: 'right' });
    });

    // Calculate progression points
    let accum = 0;
    const points = logs.map((log, i) => {
      accum += log.dayHours || 0;
      const x = chartLeft + (i / Math.max(logs.length - 1, 1)) * chartWidth;
      const y = chartBottom - (accum / Math.max(totalHours, 1)) * chartHeight;
      return { x, y, accum, log };
    });

    // Draw shaded area
    doc.setFillColor(254, 215, 170); // Orange 200 light
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      doc.triangle(p1.x, p1.y, p2.x, p2.y, p1.x, chartBottom, 'F');
      doc.triangle(p2.x, p2.y, p2.x, chartBottom, p1.x, chartBottom, 'F');
    }

    // Draw line
    doc.setDrawColor(...orangeAccent);
    doc.setLineWidth(0.7);
    for (let i = 0; i < points.length - 1; i++) {
      doc.line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
    }

    // Draw data points & labels for first and last
    points.forEach((p, idx) => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...orangeAccent);
      doc.setLineWidth(0.4);
      doc.circle(p.x, p.y, 0.8, 'FD');

      // Labels on first, middle, last
      if (idx === 0 || idx === points.length - 1 || idx === Math.floor(points.length / 2)) {
        const d = new Date(p.log.dailyReport.date);
        const label = `${d.getDate()}/${d.getMonth() + 1}`;
        doc.setFontSize(5.5);
        doc.setTextColor(100, 116, 139);
        doc.text(label, p.x, chartBottom + 3.5, { align: 'center' });
      }
    });

    currentY = graphBoxY + graphBoxHeight + 5;
  }

  // 5. Table 1: Summary by Project (Obra)
  const projectTableData = projectsSummary.map((p) => {
    const pct = totalHours > 0 ? (p.hours / totalHours) * 100 : 0;
    return [
      p.code,
      p.name,
      String(p.reportsCount),
      `${p.hours.toFixed(1)} h`,
      `$${rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `$${p.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${pct.toFixed(1)}%`,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        'Código Obra',
        'Nombre del Proyecto / Frente de Trabajo',
        'Jornadas',
        'Horas Acum.',
        'Tarifa ($/h)',
        'Valor Generado ($)',
        '% Total',
      ],
    ],
    body: projectTableData,
    foot: [
      [
        'TOTALES',
        `${projectsSummary.length} Obras atendidas`,
        `${logs.length} rep.`,
        `${totalHours.toFixed(1)} h`,
        '',
        `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        '100%',
      ],
    ],
    theme: 'grid',
    styles: {
      fontSize: 7.5,
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
      fontSize: 7.5,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 26, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: emeraldColor },
      6: { cellWidth: 16, halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  // 6. Table 2: Detailed Breakdown by Daily Report
  // Sorted most recent first
  const descLogs = [...logs].reverse();
  const detailTableData = descLogs.map((log) => {
    const rawDate = new Date(log.dailyReport.date);
    const dateFormatted = rawDate.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const logRate = log.hourlyRate ?? rate;
    const dayValue = (log.dayHours || 0) * logRate;
    const projName = log.dailyReport.project?.name || log.dailyReport.project?.code || 'Obra';

    return [
      dateFormatted,
      `Rep. N° ${String(log.dailyReport.reportNumber).padStart(3, '0')}`,
      projName,
      `${log.dayHours.toFixed(1)} h`,
      `$${dayValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      log.notes || 'Operativo en frente',
    ];
  });

  const finalY = (doc as any).lastAutoTable?.finalY || currentY + 40;

  // Header for Table 2
  autoTable(doc, {
    startY: finalY + 7,
    head: [
      [
        'Fecha',
        'N° Reporte',
        'Obra / Proyecto',
        'Horas Día',
        'Valor Día ($)',
        'Observaciones / Actividad Realizada',
      ],
    ],
    body: detailTableData,
    foot: [
      [
        'TOTAL',
        `${descLogs.length} reportes`,
        '',
        `${totalHours.toFixed(1)} h`,
        `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        '',
      ],
    ],
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.6,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [51, 65, 85], // Slate 700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },
      1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 38 },
      3: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 24, halign: 'right', textColor: emeraldColor, fontStyle: 'bold' },
      5: { cellWidth: 'auto' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14, bottom: 20 },
    didDrawPage: (data) => {
      // Footer on all pages
      const pageNumber = data.pageNumber;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);

      doc.text(
        `LICOSA S.A.  •  Control y Gestión de Maquinaria  •  [${machine.code}] ${machine.name}`,
        14,
        pageHeight - 8
      );

      doc.text(`Página ${pageNumber}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
    },
  });

  // Download PDF
  const sanitizedCode = machine.code.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Maquinaria_${sanitizedCode}_${dateStr.replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}
