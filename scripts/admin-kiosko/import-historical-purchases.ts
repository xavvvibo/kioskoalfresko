import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type HistoricalPurchaseFile = {
  version: number;
  source: string;
  suppliers: Array<{
    supplier: string;
    tax_id?: string | null;
    notes?: string | null;
    purchases?: Array<unknown>;
  }>;
};

const root = process.cwd();
const sourcePath = resolve(root, "supabase/seeds/historical-purchases/kiosko_initial_purchases.json");
const templatePath = resolve(root, "supabase/seeds/admin_kiosko_import_historical_purchases.sql");
const outputPath = resolve(root, "supabase/seeds/generated/admin_kiosko_initial_purchases_generated.sql");

function sqlLiteral(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function readJson() {
  const parsed = JSON.parse(readFileSync(sourcePath, "utf8")) as HistoricalPurchaseFile;
  if (!Array.isArray(parsed.suppliers)) {
    throw new Error("El JSON debe contener un array suppliers.");
  }

  for (const supplier of parsed.suppliers) {
    if (!supplier.supplier?.trim()) {
      throw new Error("Cada proveedor debe tener supplier.");
    }
    if (supplier.purchases && !Array.isArray(supplier.purchases)) {
      throw new Error(`purchases debe ser array en proveedor ${supplier.supplier}.`);
    }
  }

  return parsed;
}

const data = readJson();
const template = readFileSync(templatePath, "utf8");
const purchaseData = JSON.stringify(data.suppliers, null, 2);
const generated = template.replace(
  "purchase_data jsonb := '[]'::jsonb;",
  `purchase_data jsonb := ${sqlLiteral(purchaseData)}::jsonb;`,
);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, generated);

console.info(`SQL histórico generado: ${outputPath}`);
