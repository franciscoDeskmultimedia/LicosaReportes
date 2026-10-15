import { generateStyledRdoWorkbook, generateStyledMasterTemplate } from '../src/lib/excelRdoGenerator';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🏗️ Generando plantillas oficiales estilizadas de LICOSA...');

  const outDir = path.join(process.cwd(), 'public', 'plantillas');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Plantilla RDO Unificada
  const rdoBuffer = await generateStyledRdoWorkbook({}, []);
  const pRdo = path.join(outDir, 'Plantilla_Reporte_Diario_Licosa.xlsx');
  fs.writeFileSync(pRdo, rdoBuffer);
  console.log('✅ Plantilla RDO estilizada generada en:', pRdo);

  // 2. Plantilla Maestra y Carga Inicial de Proyecto
  const masterBuffer = await generateStyledMasterTemplate();
  const pCarga = path.join(outDir, 'Plantilla_Carga_Licosa.xlsx');
  const pMaestra = path.join(outDir, 'Plantilla_Maestra_Licosa.xlsx');
  fs.writeFileSync(pCarga, masterBuffer);
  fs.writeFileSync(pMaestra, masterBuffer);
  console.log('✅ Plantilla Carga generada en:', pCarga);
  console.log('✅ Plantilla Maestra generada en:', pMaestra);
}

main().catch(console.error);

