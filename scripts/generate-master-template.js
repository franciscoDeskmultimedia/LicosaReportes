const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function createMasterTemplate() {
  const wb = XLSX.utils.book_new();

  // 1. PESTAÑA: INSTRUCCIONES
  const wsInstruccionesData = [
    ['GUÍA OFICIAL DE USO DE LA PLANTILLA MAESTRA UNIFICADA DE LICOSA'],
    ['Sistema de Gestión y Control de Obras Viales e Infraestructura'],
    [],
    ['ESTRUCTURA DE ESTA PLANTILLA UNIFICADA:'],
    ['1. Hoja "PROYECTO":', 'Contiene la ficha contractual del proyecto. Es leída automáticamente al crear un nuevo proyecto en el sistema.'],
    ['2. Hoja "Rubros":', 'Catálogo contractual de rubros presupuestados con sus precios unitarios, unidades y volúmenes.'],
    ['3. Hoja "Registro Diario":', 'Bitácora cronológica de ejecuciones diarias de rubros con sus tramos y abscisas (DESDE / HASTA).'],
    ['4. Hoja "RDO":', 'Formato oficial de Reporte Diario de Obra con control de clima, EHS, equipos (horas día), personal (H-hombre), rubros y actividades.'],
    ['   NOTA SOBRE RDO:', 'Puedes duplicar esta pestaña para cada día de trabajo (ej: "RDO_01", "RDO_02", o con fechas como "mar 08-sep").'],
    ['5. Hoja "CONTROL DE HOROMETRO":', 'Control de horómetros de maquinaria con lecturas de inicio, fin y horas totales acumuladas.'],
    [],
    ['CONSEJOS DE LLENADO:'],
    ['• Mantén los nombres de las columnas en la fila de encabezados para una sincronización automática precisa.'],
    ['• Las fechas pueden ingresarse en formato estándar (YYYY-MM-DD o DD/MM/YYYY) o número serial de Excel.'],
    ['• Para subir archivos pesados con fotos, el sistema aligera automáticamente los álbumes fotográficos conservando toda la data.'],
  ];
  const wsInstrucciones = XLSX.utils.aoa_to_sheet(wsInstruccionesData);
  XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'INSTRUCCIONES');

  // 2. PESTAÑA: PROYECTO
  const wsProyectoData = [
    ['DATOS GENERALES Y CONTRACTUALES DEL PROYECTO'],
    ['Campo / Parámetro', 'Valor Registrado', 'Descripción / Formato'],
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
  const wsProyecto = XLSX.utils.aoa_to_sheet(wsProyectoData);
  XLSX.utils.book_append_sheet(wb, wsProyecto, 'PROYECTO');

  // 3. PESTAÑA: Rubros
  const wsRubrosData = [
    ['CONTROL DE RUBROS – FRENTE LICOSA (PRESUPUESTO CONTRACTUAL)'],
    ['N°', 'DESCRIPCIÓN', 'Unid.', 'P.U. ($)', 'Cant. asignada LICOSA', 'Monto asignado LICOSA ($)', 'Tipo de Rubro'],
    [1, 'REPLANTEO Y TRAZADO', 'm2', 1.10, 68681.50, 75549.65, 'Secundario'],
    [2, 'DESBROCE, DESBOSQUE Y LIMPIEZA', 'Ha', 493.20, 1.31, 646.09, 'Secundario'],
    [3, 'DEMOLICIÓN DE ESTRUCTURAS DE H.A. EXISTENTES', 'm3', 27.94, 60.46, 1689.25, 'Secundario'],
    [4, 'DESMONTAJE Y TRASLADO DE PUENTE TIPO BAILEY', 'u', 12500.00, 1.00, 12500.00, 'Secundario'],
    [5, 'REMOCIÓN DE ALCANTARILLAS EXISTENTES', 'm', 18.50, 120.00, 2220.00, 'Secundario'],
    [6, 'EXCAVACIÓN (excavadora)', 'm3', 1.81, 45200.00, 81812.00, 'Principal'],
    [7, 'DESALOJO MATERIAL DE EXCAVACIÓN (distancia hasta 10 km)', 'm3', 3.07, 45200.00, 138764.00, 'Principal'],
    [8, 'MATERIAL DE PRÉSTAMO IMPORTADO (*)', 'm3', 5.28, 125000.00, 660000.00, 'Principal'],
    [9, 'TRANSPORTE DE MATERIAL DE PRÉSTAMO IMPORTADO (LONGITUD 30-65 KM)', 'm3-km', 0.32, 3850000.00, 1232000.00, 'Principal'],
    [10, 'MEJORAMIENTO DE SUBRASANTE CON SUELO SELECCIONADO', 'm3', 8.45, 32000.00, 270400.00, 'Principal'],
    [11, 'SUB-BASE DE AGREGADOS CLASE 3 (e=20cm)', 'm3', 14.80, 24500.00, 362600.00, 'Principal'],
    [12, 'BASE GRANULAR TRITURADA CLASE 1 (e=15cm)', 'm3', 19.50, 18400.00, 358800.00, 'Principal'],
    [13, 'IMPRIMACIÓN ASFÁLTICA CON EMULSIÓN', 'm2', 0.85, 92000.00, 78200.00, 'Secundario'],
    [14, 'CARPETA DE HORMIGÓN ASFÁLTICO EN CALIENTE (e=7.5cm)', 'm2', 12.40, 92000.00, 1140800.00, 'Principal'],
    [15, 'ALCANTARILLAS TUBULARES DE H.A. D=1200mm', 'm', 145.00, 350.00, 50750.00, 'Principal'],
    [16, 'HORMIGÓN ESTRUCTURAL f\'c=280 kg/cm2 EN CABEZALES', 'm3', 185.00, 420.00, 77700.00, 'Principal'],
    [17, 'ACERO DE REFUERZO fy=4200 kg/cm2', 'kg', 1.65, 38500.00, 63525.00, 'Principal'],
    [18, 'SEÑALIZACIÓN HORIZONTAL CON PINTURA TERMOPLÁSTICA', 'm', 3.20, 28500.00, 91200.00, 'Secundario'],
    [19, 'SEÑALIZACIÓN VERTICAL PREVENTIVA Y REGLAMENTARIA', 'u', 115.00, 160.00, 18400.00, 'Secundario'],
    [20, 'AGUA PARA CONTROL DE POLVO', 'm3', 2.49, 15000.00, 37350.00, 'Secundario'],
  ];
  const wsRubros = XLSX.utils.aoa_to_sheet(wsRubrosData);
  XLSX.utils.book_append_sheet(wb, wsRubros, 'Rubros');

  // 4. PESTAÑA: Registro Diario
  const wsRegistroData = [
    ['BITÁCORA DE REGISTRO DIARIO DE EJECUCIÓN (AVANCES VOLUMÉTRICOS DE OBRA)'],
    ['Registre diariamente los rubros ejecutados. Se sincroniza con la bitácora central y los reportes diarios.'],
    ['Fecha', 'N° Rubro', 'Descripción (auto)', 'Unid.', 'P.U. ($)', 'Cant. ejecutada', 'Monto ejec. ($)', 'SENTIDO', 'DESDE', 'HASTA', 'LONGITUD (M)', 'ANCHO (M)', 'ESPESOR (M)', 'VOLUMEN (M3)'],
    ['2026-06-29', 1, 'REPLANTEO Y TRAZADO', 'm2', 1.10, 2912.00, 3203.20, 'AMBOS', 0, 260, 260, 11.2, 0, 2912],
    ['2026-06-29', 2, 'DESBROCE, DESBOSQUE Y LIMPIEZA', 'Ha', 493.20, 0.054, 26.63, 'DER', 80, 260, 180, 3.0, 0, 540],
    ['2026-06-29', 6, 'EXCAVACIÓN (excavadora)', 'm3', 1.81, 484.61, 877.14, 'EJE', 0, 80, 80, 5.0, 1.2, 484.61],
    ['2026-06-29', 7, 'DESALOJO MATERIAL DE EXCAVACIÓN (distancia hasta 10 km)', 'm3', 3.07, 484.61, 1487.75, 'EJE', 0, 80, 80, 5.0, 1.2, 484.61],
    ['2026-06-29', 20, 'AGUA PARA CONTROL DE POLVO', 'm3', 2.49, 20.00, 49.80, 'EJE', 0, 260, 260, 0, 0, 20],
    ['2026-06-30', 1, 'REPLANTEO Y TRAZADO', 'm2', 1.10, 3136.00, 3449.60, 'AMBOS', 260, 540, 280, 11.2, 0, 3136],
    ['2026-06-30', 6, 'EXCAVACIÓN (excavadora)', 'm3', 1.81, 620.00, 1122.20, 'EJE', 80, 180, 100, 5.0, 1.24, 620],
    ['2026-06-30', 7, 'DESALOJO MATERIAL DE EXCAVACIÓN (distancia hasta 10 km)', 'm3', 3.07, 620.00, 1903.40, 'EJE', 80, 180, 100, 5.0, 1.24, 620],
    ['2026-06-30', 8, 'MATERIAL DE PRÉSTAMO IMPORTADO (*)', 'm3', 5.28, 450.00, 2376.00, 'EJE', 0, 80, 80, 6.0, 0.94, 450],
  ];
  const wsRegistro = XLSX.utils.aoa_to_sheet(wsRegistroData);
  XLSX.utils.book_append_sheet(wb, wsRegistro, 'Registro Diario');

  // 5. PESTAÑA: RDO (Formato Oficial Diario)
  const wsRdoData = [
    ['REPORTE DIARIO DE OBRA'],
    ['REHABILITACIÓN DE LA VÍA VALLE DE LA VIRGEN – LÍMITE PROVINCIAL'],
    ['CONTRATISTA: CONSORCIO VALLE DE LA VIRGEN', null, null, null, 'CONTRATANTE: GAD PROVINCIAL DEL GUAYAS', null, null, null, 'FISCALIZACIÓN: ASOCIACION C-D'],
    ['EMPRESA EJECUTORA / FRENTE: LICOSA', null, null, null, 'Contrato N°: EC-PREFGUAYAS-527225-CW-RFB', null, null, null, 'Financiamiento: BIRF 9722-EC (Banco Mundial)'],
    ['FECHA:', null, '2026-06-29', null, 'REPORTE N°:', 1, 'TRAMO / SEGMENTO:', null, 'km 0+000 al km 5+200'],
    ['MONTO DE TRABAJOS EJECUTADOS', null, 5644.52, null, '% AVANCE', 0.001, 'DÍAS TRANSCURRIDOS / PLAZO:', null, '1/240'],
    [],
    ['1. REPORTE DE CLIMA Y EHS (SEGURIDAD, SALUD Y AMBIENTE)'],
    ['Horas de lluvia (día)', null, null, 0, null, null, 'Tiempo charla diaria (min)', null, null, 5],
    ['Horas de lluvia (noche)', null, null, 0, null, null, 'Tiempo charla acum. (min)', null, null, 5],
    ['Horas perdidas por lluvia (día)', null, null, 0, null, null, 'Incidentes (día / acum.)', null, null, '0/0'],
    ['Horas perdidas acum. por lluvia', null, null, 0, null, null, 'Accidentes (día / acum.)', null, null, '0/0'],
    [],
    ['2. REPORTE DE EQUIPO', null, null, null, null, null, '3. REPORTE DE PERSONAL'],
    ['Descripción del equipo', null, null, 'Unidad', 'Cantidad', 'Horas día', 'Categoría / Cargo', null, null, null, 'N°', 'H-Hombre día'],
    ['EXCAVADORA EX09', null, null, 'hora', 1, 8.0, 'Ingeniero Residente', null, null, null, 1, 10.0],
    ['TRACTOR TR-09', null, null, 'hora', 1, 8.0, 'Planilladora', null, null, null, 1, 8.0],
    ['RODILLO RL 06', null, null, 'hora', 1, 2.0, 'Operador Excavadora', null, null, null, 1, 10.0],
    ['VOLQUETA VQ-34', null, null, 'hora', 1, 8.0, 'Operador Tractor', null, null, null, 1, 10.0],
    ['VOLQUETA VQ-32', null, null, 'hora', 1, 8.0, 'Chofer Volqueta', null, null, null, 2, 10.0],
    ['TANQUERO DE AGUA TQ-01', null, null, 'hora', 1, 4.0, 'Cadenero / Topógrafo', null, null, null, 2, 10.0],
    [],
    ['4. RUBROS PRINCIPALES DEL DÍA'],
    ['N° Rubro', 'Descripción (auto)', null, null, null, 'Unid.', 'Cant. día', 'Cant. acum.', 'Monto día ($)', null, 'Monto acum. ($)'],
    [1, 'REPLANTEO Y TRAZADO', null, null, null, 'm2', 2912.00, 2912.00, 3203.20, null, 3203.20],
    [2, 'DESBROCE, DESBOSQUE Y LIMPIEZA', null, null, null, 'Ha', 0.054, 0.054, 26.63, null, 26.63],
    [6, 'EXCAVACIÓN (excavadora)', null, null, null, 'm3', 484.61, 484.61, 877.14, null, 877.14],
    [7, 'DESALOJO MATERIAL DE EXCAVACIÓN (distancia hasta 10 km)', null, null, null, 'm3', 484.61, 484.61, 1487.75, null, 1487.75],
    [20, 'AGUA PARA CONTROL DE POLVO', null, null, null, 'm3', 20.00, 20.00, 49.80, null, 49.80],
    [],
    ['5. ACTIVIDADES REALIZADAS EN EL DÍA'],
    ['Sector / Frente', null, 'Detalle de los trabajos ejecutados'],
    ['Movimiento de Tierras (Vial)', null, 'Replanteo topográfico del km 0+000 al km 0+260 y excavación con desalojo de material inadecuado hacia escombrera autorizada.'],
    ['Control Ambiental', null, 'Riego continuo de agua mediante tanquero para mitigación de emisión de partículas de polvo en tramos poblados.'],
    [],
    ['6. ACTIVIDADES PROGRAMADAS PARA EL SIGUIENTE DÍA'],
    ['Sector / Frente', null, 'Detalle de los trabajos planificados'],
    ['Movimiento de Tierras (Vial)', null, 'Continuar excavación y conformación de subrasante entre las abscisas km 0+080 y km 0+200. Inicio de transporte de material de préstamo.'],
    [],
    ['7. NOVEDADES / RIESGOS / OBSERVACIONES Y FIRMAS'],
    ['Novedades / Riesgos:', null, 'Tráfico controlado en el frente con señalización preventiva y banderilleros en ambos extremos.'],
    [],
    ['Elaborado por:', 'Ing. María Fernanda Ligua (Ing. de Planillas LICOSA)'],
    ['Revisado y Aprobado por:', 'Ing. Jerson López (Residente de Obra LICOSA)'],
    ['Fiscalización / Supervisión:', 'Ing. Asesor Fiscalizador (ASOCIACION C-D)'],
  ];
  const wsRdo = XLSX.utils.aoa_to_sheet(wsRdoData);
  XLSX.utils.book_append_sheet(wb, wsRdo, 'RDO');

  // 6. PESTAÑA: CONTROL DE HOROMETRO
  const wsHoroData = [
    ['CONTROL DE HOROMETRO DE EQUIPO PESADO'],
    ['EQUIPO', 'FECHA', 'INICIO', 'FIN', 'TOTAL DE HORAS', 'UBICACIÓN / TRAMO', 'OBSERVACIONES'],
    ['EXC-09', '2026-06-29', 13931.9, 13939.9, 8.0, 'km 0+000 - 0+080', 'Excavación y carga a volquetas'],
    ['TRACTOR-09', '2026-06-29', 1577.7, 1585.7, 8.0, 'km 0+080 - 0+260', 'Desbroce y limpieza'],
    ['RL-06', '2026-06-29', 8479.1, 8481.1, 2.0, 'km 0+000 - 0+080', 'Sellado preliminar'],
    ['EXC-09', '2026-06-30', 13939.9, 13950.4, 10.5, 'km 0+080 - 0+180', 'Excavación profunda'],
    ['TRACTOR-09', '2026-06-30', 1585.7, 1591.3, 5.6, 'km 0+080 - 0+180', 'Conformación de plataforma'],
  ];
  const wsHoro = XLSX.utils.aoa_to_sheet(wsHoroData);
  XLSX.utils.book_append_sheet(wb, wsHoro, 'CONTROL DE HOROMETRO');

  // Guardar archivo maestro
  const outDir = path.join(process.cwd(), 'public', 'plantillas');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const pMaster = path.join(outDir, 'Plantilla_Maestra_Licosa.xlsx');
  const pCarga = path.join(outDir, 'Plantilla_Carga_Licosa.xlsx');
  const pRdo = path.join(outDir, 'Plantilla_Reporte_Diario_Licosa.xlsx');

  XLSX.writeFile(wb, pMaster);
  XLSX.writeFile(wb, pCarga);
  XLSX.writeFile(wb, pRdo);

  console.log('✅ Plantillas unificadas generadas con éxito en:');
  console.log('  -', pMaster);
  console.log('  -', pCarga);
  console.log('  -', pRdo);
}

createMasterTemplate();
