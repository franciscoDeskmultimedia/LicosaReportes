import { generateStyledRdoWorkbook } from '../src/lib/excelRdoGenerator';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🏗️ Generando plantilla oficial estilizada de RDO...');

  const buffer = await generateStyledRdoWorkbook({}, []);
  const outDir = path.join(process.cwd(), 'public', 'plantillas');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const pRdo = path.join(outDir, 'Plantilla_Reporte_Diario_Licosa.xlsx');
  fs.writeFileSync(pRdo, buffer);
  console.log('✅ Plantilla estilizada generada en:', pRdo);
}

main().catch(console.error);
