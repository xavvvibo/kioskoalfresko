#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { analyzeInventoryZipBuffer } from "../lib/admin-kiosko/inventory-opening/zip-import.ts";

const defaultZip = "/Users/xavibocanegra/kioskoalfresko/private-imports/Inventario-congelador-8jul2026.zip";
const defaultOutDir = "/Users/xavibocanegra/kioskoalfresko/dist/inventory-imports";

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function markdownReport(report) {
  const duplicateLines = report.exactDuplicates.length
    ? report.exactDuplicates.map((duplicate) => `- ${duplicate.sha256.slice(0, 12)}: imágenes ${duplicate.imageIndexes.map((index) => index + 1).join(", ")}`).join("\n")
    : "- No se han detectado duplicados binarios exactos.";
  const groupLines = report.proposedGroups.slice(0, 80).map((group, index) => {
    return `- Grupo ${index + 1}: ${group.relation}; imágenes ${group.imageIndexes.map((imageIndex) => imageIndex + 1).join(", ")}; ${group.reason}`;
  }).join("\n");
  const skippedLines = report.skippedEntries.length
    ? report.skippedEntries.map((entry) => `- ${entry.path}: ${entry.reason}`).join("\n")
    : "- Ningún archivo omitido.";

  return `# Dry-run inventario inicial

Fuente: \`${report.sourceZip}\`

Generado: ${report.generatedAt}

## Resumen

- Entradas totales ZIP: ${report.totalEntries}
- Imágenes válidas: ${report.validImages}
- Duplicados exactos: ${report.exactDuplicates.length}
- Grupos propuestos: ${report.proposedGroups.length}
- Productos reconocidos por fallback: ${report.summary.productsRecognized}
- EAN encontrados: ${report.summary.eansFound}
- Lotes encontrados: ${report.summary.lotsFound}
- Caducidades encontradas: ${report.summary.expiriesFound}
- Productos pendientes: ${report.summary.pendingProducts}
- Incidencias críticas: ${report.summary.criticalIssues}

## Duplicados exactos

${duplicateLines}

## Grupos propuestos

${groupLines || "- Sin grupos."}

## Archivos omitidos

${skippedLines}

## Limitaciones

- No se ha ejecutado OCR ni visión artificial.
- No se han inventado cantidades, EAN, lotes, proveedores ni caducidades.
- Las agrupaciones son conservadoras y requieren revisión humana.
- Este dry-run no crea stock ni movimientos de inventario.
`;
}

const zipPath = argValue("--zip", defaultZip);
const outDir = argValue("--out", defaultOutDir);

if (!zipPath.toLowerCase().endsWith(".zip")) {
  console.error("El archivo debe tener extensión .zip");
  process.exit(1);
}

if (!fs.existsSync(zipPath)) {
  console.error(`No existe el ZIP: ${zipPath}`);
  process.exit(1);
}

const buffer = fs.readFileSync(zipPath);
const result = analyzeInventoryZipBuffer(buffer, zipPath);
if (!result.ok) {
  console.error(result.error);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const jsonPath = path.join(outDir, `inventory-opening-dry-run-${stamp}.inventory-import.json`);
const mdPath = path.join(outDir, `inventory-opening-dry-run-${stamp}.md`);
fs.writeFileSync(jsonPath, JSON.stringify(result.report, null, 2));
fs.writeFileSync(mdPath, markdownReport(result.report));

console.log(JSON.stringify({
  ok: true,
  sourceZip: zipPath,
  jsonPath,
  mdPath,
  totalEntries: result.report.totalEntries,
  validImages: result.report.validImages,
  exactDuplicates: result.report.exactDuplicates.length,
  proposedGroups: result.report.proposedGroups.length,
  pendingProducts: result.report.summary.pendingProducts,
}, null, 2));
