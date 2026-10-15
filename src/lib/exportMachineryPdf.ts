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

/**
 * Generates a full chronological day-by-day timeline including 0-hour inactive days
 * so that idle days clearly show $0 earned and a flat plateau in the progression curve.
 */
function buildDailyTimeline(logs: MachineryLogExportItem[], rate: number) {
  if (logs.length === 0) return [];

  const sorted = [...logs].sort(
    (a, b) => new Date(a.dailyReport.date).getTime() - new Date(b.dailyReport.date).getTime()
  );

  const mapByDate = new Map<
    string,
    {
      dayHours: number;
      value: number;
      reportNumber?: number;
      projectName?: string;
      projectCode?: string;
      notes?: string;
    }
  >();

  sorted.forEach((l) => {
    const dStr = new Date(l.dailyReport.date).toISOString().split('T')[0];
    const existing = mapByDate.get(dStr) || { dayHours: 0, value: 0 };
    const r = l.hourlyRate ?? rate;
    existing.dayHours += l.dayHours || 0;
    existing.value += (l.dayHours || 0) * r;
    existing.reportNumber = l.dailyReport.reportNumber;
    existing.projectName = l.dailyReport.project?.name || existing.projectName;
    existing.projectCode = l.dailyReport.project?.code || existing.projectCode;
    existing.notes = l.notes || existing.notes;
    mapByDate.set(dStr, existing);
  });

  const minTime = new Date(sorted[0].dailyReport.date).getTime();
  const maxTime = new Date(sorted[sorted.length - 1].dailyReport.date).getTime();
  const daysDiff = Math.max(Math.round((maxTime - minTime) / (1000 * 60 * 60 * 24)), 1);

  const timeline: Array<{
    dateStr: string;
    formattedDate: string;
    dayHours: number;
    dayValue: number;
    accumHours: number;
    accumValue: number;
    isActive: boolean;
    reportNumber?: number;
    projectName?: string;
    notes?: string;
  }> = [];

  let runningHours = 0;
  let runningValue = 0;

  if (daysDiff <= 120) {
    const cur = new Date(minTime);
    cur.setHours(0, 0, 0, 0);
    const end = new Date(maxTime);
    end.setHours(0, 0, 0, 0);

    while (cur.getTime() <= end.getTime()) {
      const dKey = cur.toISOString().split('T')[0];
      const match = mapByDate.get(dKey);
      const dayH = match ? match.dayHours : 0;
      const dayV = match ? match.value : 0;
      runningHours += dayH;
      runningValue += dayV;

      timeline.push({
        dateStr: dKey,
        formattedDate: `${cur.getDate()}/${cur.getMonth() + 1}`,
        dayHours: dayH,
        dayValue: dayV,
        accumHours: runningHours,
        accumValue: runningValue,
        isActive: dayH > 0,
        reportNumber: match?.reportNumber,
        projectName: match?.projectName,
        notes: match?.notes,
      });

      cur.setDate(cur.getDate() + 1);
    }
  } else {
    sorted.forEach((l) => {
      const d = new Date(l.dailyReport.date);
      const dKey = d.toISOString().split('T')[0];
      const match = mapByDate.get(dKey);
      const dayH = match ? match.dayHours : 0;
      const dayV = match ? match.value : 0;
      runningHours += dayH;
      runningValue += dayV;

      timeline.push({
        dateStr: dKey,
        formattedDate: `${d.getDate()}/${d.getMonth() + 1}`,
        dayHours: dayH,
        dayValue: dayV,
        accumHours: runningHours,
        accumValue: runningValue,
        isActive: dayH > 0,
        reportNumber: match?.reportNumber,
        projectName: match?.projectName,
        notes: match?.notes,
      });
    });
  }

  return timeline;
}

/**
 * Draws a high-res vector graph in the PDF comparing daily activity ($0 on idle days)
 * and cumulative hours/value progression.
 */
function drawTimelineGraph(
  doc: jsPDF,
  timeline: ReturnType<typeof buildDailyTimeline>,
  totalHours: number,
  totalValue: number,
  yPos: number,
  pageWidth: number,
  title: string
) {
  if (timeline.length < 2) return yPos;

  const graphBoxY = yPos;
  const graphBoxHeight = 38;
  const graphInnerWidth = pageWidth - 28;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, graphBoxY, graphInnerWidth, graphBoxHeight, 2, 2, 'FD');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 18, graphBoxY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(148, 163, 184);
  doc.text('Días planos = Sin actividad ($0 ganado) | Picos = Jornadas con horas facturadas', pageWidth - 18, graphBoxY + 5.5, {
    align: 'right',
  });

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
    const vVal = totalValue * pct;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(148, 163, 184);
    doc.text(`${val.toFixed(0)}h ($${(vVal / 1000).toFixed(1)}k)`, chartLeft - 2, y + 1.2, { align: 'right' });
  });

  const maxH = Math.max(totalHours, 1);
  const maxDayH = Math.max(...timeline.map((t) => t.dayHours), 8);

  const points = timeline.map((pt, i) => {
    const x = chartLeft + (i / Math.max(timeline.length - 1, 1)) * chartWidth;
    const y = chartBottom - (pt.accumHours / maxH) * chartHeight;
    const barHeight = (pt.dayHours / maxDayH) * (chartHeight * 0.45);
    return { x, y, barHeight, pt };
  });

  // 1. Draw daily activity bars (shows 0 on days without work)
  const barWidth = Math.min(Math.max(chartWidth / (timeline.length * 1.5), 0.6), 3.5);
  points.forEach((p) => {
    if (p.pt.isActive) {
      doc.setFillColor(16, 185, 129); // Emerald for productive day
      doc.rect(p.x - barWidth / 2, chartBottom - p.barHeight, barWidth, p.barHeight, 'F');
    } else {
      // Inactive day tick at baseline
      doc.setFillColor(226, 232, 240);
      doc.rect(p.x - 0.2, chartBottom - 0.8, 0.4, 0.8, 'F');
    }
  });

  // 2. Draw cumulative curve area
  doc.setFillColor(254, 215, 170); // Orange light
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    doc.triangle(p1.x, p1.y, p2.x, p2.y, p1.x, chartBottom, 'F');
    doc.triangle(p2.x, p2.y, p2.x, chartBottom, p1.x, chartBottom, 'F');
  }

  // 3. Draw cumulative curve line
  doc.setDrawColor(234, 88, 12);
  doc.setLineWidth(0.65);
  for (let i = 0; i < points.length - 1; i++) {
    doc.line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
  }

  // 4. Data points on active days
  points.forEach((p, idx) => {
    if (p.pt.isActive) {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(234, 88, 12);
      doc.setLineWidth(0.35);
      doc.circle(p.x, p.y, 0.7, 'FD');
    }

    // Label first, middle, last
    if (idx === 0 || idx === points.length - 1 || idx === Math.floor(points.length / 2)) {
      doc.setFontSize(5);
      doc.setTextColor(100, 116, 139);
      doc.text(p.pt.formattedDate, p.x, chartBottom + 3.2, { align: 'center' });
    }
  });

  return graphBoxY + graphBoxHeight + 5;
}

/**
 * 1. EXPORT GENERAL (TODAS LAS OBRAS)
 */
export function exportMachineryToPdf(machine: MachineryExportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const primaryColor: [number, number, number] = [15, 23, 42];
  const orangeAccent: [number, number, number] = [234, 88, 12];
  const emeraldColor: [number, number, number] = [5, 150, 105];
  const lightBg: [number, number, number] = [248, 250, 252];

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

  const logs = [...machine.dailyLogs].sort((a, b) => {
    return new Date(a.dailyReport.date).getTime() - new Date(b.dailyReport.date).getTime();
  });

  const rate = machine.hourlyRate || 0;
  const totalHours = logs.reduce((acc, l) => acc + (l.dayHours || 0), 0) || machine.totalHoursWorked || 0;
  const totalValue = logs.reduce((acc, l) => {
    const logRate = l.hourlyRate ?? rate;
    return acc + ((l.dayHours || 0) * logRate);
  }, 0) || (totalHours * rate);

  // Group by Project
  const projectMap = new Map<string, { code: string; name: string; hours: number; value: number; reportsCount: number }>();
  logs.forEach((log) => {
    const proj = log.dailyReport.project;
    const key = proj?.id || 'SIN_OBRA';
    const projCode = proj?.code || 'OBRA GENERAL';
    const projName = proj?.name || 'Obra no especificada';
    const logRate = log.hourlyRate ?? rate;
    const val = (log.dayHours || 0) * logRate;

    const current = projectMap.get(key) || { code: projCode, name: projName, hours: 0, value: 0, reportsCount: 0 };
    current.hours += log.dayHours || 0;
    current.value += val;
    current.reportsCount += 1;
    projectMap.set(key, current);
  });
  const projectsSummary = Array.from(projectMap.values()).sort((a, b) => b.hours - a.hours);

  // Timeline with inactive days
  const timeline = buildDailyTimeline(logs, rate);
  const activeDaysCount = timeline.filter((t) => t.isActive).length;
  const inactiveDaysCount = timeline.filter((t) => !t.isActive).length;

  // Header Bar
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 16, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('LICOSA S.A.  •  REPORTE INTEGRAL CONSOLIDADO DE MAQUINARIA', 14, 10.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Emisión: ${dateStr} ${timeStr}`, pageWidth - 14, 10.5, { align: 'right' });

  // Title
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`FICHA TÉCNICA GENERAL: [${machine.code}] ${machine.name}`, 14, 23.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Categoría: ${machine.category}  |  Estado: ${machine.status}  |  ${projectsSummary.length} obras atendidas`, 14, 28);
  if (machine.plateOrSerial) {
    doc.text(`Placa / Serie: ${machine.plateOrSerial}`, pageWidth - 14, 28, { align: 'right' });
  }

  // 4 Top KPI Cards
  const kpiY = 32;
  const kpiHeight = 14;
  const kpiCount = 4;
  const kpiGap = 3.5;
  const kpiWidth = (pageWidth - 28 - (kpiCount - 1) * kpiGap) / kpiCount;

  const kpis = [
    { title: 'HORAS TOTALES', value: `${totalHours.toFixed(1)} ${machine.unit || 'h'}`, color: orangeAccent },
    { title: 'TARIFA ($/h)', value: `$${rate.toFixed(2)}/h`, color: primaryColor },
    { title: 'VALOR TOTAL GENERADO', value: `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: emeraldColor },
    { title: 'DÍAS TRABAJADOS / INACTIVOS', value: `${activeDaysCount} act. | ${inactiveDaysCount} inact.`, color: [79, 70, 229] as [number, number, number] },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (kpiWidth + kpiGap);
    doc.setFillColor(...lightBg);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, kpiY, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title, x + 3, kpiY + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, x + 3, kpiY + 11);
  });

  // Vector Timeline Graph with $0 idle days
  let currentY = drawTimelineGraph(
    doc,
    timeline,
    totalHours,
    totalValue,
    kpiY + kpiHeight + 5,
    pageWidth,
    'CURVA DE RENDIMIENTO Y VALOR GENERADO EN EL TIEMPO'
  );

  // Table 1: Summary by Project
  const projectTableData = projectsSummary.map((p) => {
    const pct = totalHours > 0 ? (p.hours / totalHours) * 100 : 0;
    return [
      p.code,
      p.name,
      String(p.reportsCount),
      `${p.hours.toFixed(1)} h`,
      `$${rate.toFixed(2)}`,
      `$${p.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${pct.toFixed(1)}%`,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Código', 'Obra / Proyecto', 'Jornadas', 'Horas Acum.', 'Tarifa', 'Valor Generado ($)', '% Total']],
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
    styles: { fontSize: 7.2, cellPadding: 1.6, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.15 },
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.2 },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.2 },
    columnStyles: {
      0: { cellWidth: 24, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: emeraldColor },
      6: { cellWidth: 16, halign: 'center' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  // Table 2: Detailed logs
  const descLogs = [...logs].reverse();
  const detailTableData = descLogs.map((log) => {
    const rawDate = new Date(log.dailyReport.date);
    const dateFormatted = rawDate.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
    const logRate = log.hourlyRate ?? rate;
    const dayValue = (log.dayHours || 0) * logRate;
    const projName = log.dailyReport.project?.name || log.dailyReport.project?.code || 'Obra';

    return [
      dateFormatted,
      `Rep. N° ${String(log.dailyReport.reportNumber).padStart(3, '0')}`,
      projName,
      `${log.dayHours.toFixed(1)} h`,
      `$${dayValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      log.notes || 'Operativo en obra',
    ];
  });

  const finalY = (doc as any).lastAutoTable?.finalY || currentY + 40;

  autoTable(doc, {
    startY: finalY + 6,
    head: [['Fecha', 'N° Reporte', 'Obra / Proyecto', 'Horas Día', 'Valor Día ($)', 'Observaciones']],
    body: detailTableData,
    foot: [['TOTAL', `${descLogs.length} reportes`, '', `${totalHours.toFixed(1)} h`, `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, '']],
    theme: 'grid',
    styles: { fontSize: 6.8, cellPadding: 1.5, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.15 },
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.2 },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 40 },
      3: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 22, halign: 'right', textColor: emeraldColor, fontStyle: 'bold' },
      5: { cellWidth: 'auto' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14, bottom: 18 },
    didDrawPage: (data) => {
      const pageNumber = data.pageNumber;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(148, 163, 184);
      doc.text(`LICOSA S.A.  •  Consolidado General  •  [${machine.code}] ${machine.name}`, 14, pageHeight - 8);
      doc.text(`Página ${pageNumber}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
    },
  });

  const sanitizedCode = machine.code.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Maquinaria_${sanitizedCode}_TODAS_OBRAS_${dateStr.replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}

/**
 * 2. EXPORT ESPECÍFICO POR OBRA INDIVIDUAL
 */
export function exportMachineryProjectPdf(
  machine: MachineryExportData,
  project: { id: string; code: string; name: string }
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const primaryColor: [number, number, number] = [15, 23, 42];
  const orangeAccent: [number, number, number] = [234, 88, 12];
  const emeraldColor: [number, number, number] = [5, 150, 105];
  const lightBg: [number, number, number] = [248, 250, 252];

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

  // Filter logs for this project only
  const projLogs = machine.dailyLogs
    .filter((l) => l.dailyReport.project?.id === project.id || l.dailyReport.project?.code === project.code)
    .sort((a, b) => new Date(a.dailyReport.date).getTime() - new Date(b.dailyReport.date).getTime());

  const rate = machine.hourlyRate || 0;
  const projHours = projLogs.reduce((acc, l) => acc + (l.dayHours || 0), 0);
  const projValue = projLogs.reduce((acc, l) => {
    const logRate = l.hourlyRate ?? rate;
    return acc + ((l.dayHours || 0) * logRate);
  }, 0);

  const totalMachineHours = machine.dailyLogs.reduce((acc, l) => acc + (l.dayHours || 0), 0) || machine.totalHoursWorked || 1;
  const pctParticipation = (projHours / totalMachineHours) * 100;

  // Build timeline for this project
  const timeline = buildDailyTimeline(projLogs, rate);
  const activeDays = timeline.filter((t) => t.isActive).length;
  const inactiveDays = timeline.filter((t) => !t.isActive).length;

  // 1. Header Bar
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 16, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`LICOSA S.A.  •  CONTROL DE MAQUINARIA EN OBRA: ${project.code}`, 14, 10.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Emisión: ${dateStr} ${timeStr}`, pageWidth - 14, 10.5, { align: 'right' });

  // 2. Title & Project Header
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`FICHA DE RENDIMIENTO: [${machine.code}] ${machine.name}`, 14, 23.5);

  // Project highlight bar
  doc.setFillColor(254, 243, 199); // Amber 100
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(14, 26.5, pageWidth - 28, 7.5, 1.2, 1.2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(180, 83, 9);
  doc.text(`OBRA ESPECÍFICA: [${project.code}] ${project.name}`, 18, 31.5);

  // 3. Top Metrics KPI Cards (4 cards)
  const kpiY = 37;
  const kpiHeight = 14;
  const kpiCount = 4;
  const kpiGap = 3.5;
  const kpiWidth = (pageWidth - 28 - (kpiCount - 1) * kpiGap) / kpiCount;

  const kpis = [
    { title: 'HORAS EN ESTA OBRA', value: `${projHours.toFixed(1)} ${machine.unit || 'h'}`, color: orangeAccent },
    { title: 'VALOR GENERADO ($)', value: `$${projValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: emeraldColor },
    { title: 'TARIFA APLICADA', value: `$${rate.toFixed(2)}/h`, color: primaryColor },
    { title: 'DÍAS TRABAJO / INACTIVOS', value: `${activeDays} act. | ${inactiveDays} inact.`, color: [79, 70, 229] as [number, number, number] },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (kpiWidth + kpiGap);
    doc.setFillColor(...lightBg);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, kpiY, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title, x + 3, kpiY + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, x + 3, kpiY + 11);
  });

  // Vector Timeline Graph for this Project
  let currentY = drawTimelineGraph(
    doc,
    timeline,
    projHours,
    projValue,
    kpiY + kpiHeight + 5,
    pageWidth,
    `EVOLUCIÓN DE HORAS Y VALOR EN LA OBRA: ${project.code}`
  );

  // Table: Detailed Daily Logs for this project
  const descLogs = [...projLogs].reverse();
  const detailTableData = descLogs.map((log) => {
    const rawDate = new Date(log.dailyReport.date);
    const dateFormatted = rawDate.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
    const logRate = log.hourlyRate ?? rate;
    const dayValue = (log.dayHours || 0) * logRate;

    return [
      dateFormatted,
      `Rep. N° ${String(log.dailyReport.reportNumber).padStart(3, '0')}`,
      `${log.dayHours.toFixed(1)} h`,
      `$${logRate.toFixed(2)}`,
      `$${dayValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      log.notes || 'Operativo en frente de trabajo',
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Fecha', 'N° Reporte', 'Horas Jornada', 'Tarifa ($/h)', 'Valor Generado ($)', 'Observaciones / Actividad']],
    body: detailTableData,
    foot: [
      [
        'TOTAL OBRA',
        `${descLogs.length} reportes`,
        `${projHours.toFixed(1)} h`,
        `$${rate.toFixed(2)}/h`,
        `$${projValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `${pctParticipation.toFixed(1)}% del total del equipo`,
      ],
    ],
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.6, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.15 },
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.2 },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center' },
      1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: emeraldColor },
      5: { cellWidth: 'auto' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14, bottom: 20 },
    didDrawPage: (data) => {
      const pageNumber = data.pageNumber;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(148, 163, 184);
      doc.text(`LICOSA S.A.  •  [${machine.code}] en Obra: ${project.code} - ${project.name}`, 14, pageHeight - 8);
      doc.text(`Página ${pageNumber}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
    },
  });

  const sanitizedCode = machine.code.replace(/[^a-zA-Z0-9_-]/g, '_');
  const sanitizedProjCode = project.code.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Maquinaria_${sanitizedCode}_OBRA_${sanitizedProjCode}_${dateStr.replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}
