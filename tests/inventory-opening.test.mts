import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { analyzeInventoryZipBuffer } from "../lib/admin-kiosko/inventory-opening/zip-import.ts";
import {
  canApplyOpeningSession,
  canApproveOpeningSession,
  fieldProposal,
  isZipSlipPath,
  proposeCatalogMatches,
  proposeImageGroups,
  proposePurchaseMatches,
  safeInventoryImageName,
} from "../lib/admin-kiosko/inventory-opening/rules.ts";
import {
  buildCreateInventoryOpeningSessionRpcPayload,
  madridDateTimeLocalToUtcIso,
} from "../lib/admin-kiosko/inventory-opening/session-rpc.ts";
import type { InventoryOpeningImageMetadata } from "../lib/admin-kiosko/inventory-opening/types.ts";

const CENTRAL_SIGNATURE = Buffer.from([0x50, 0x4b, 0x01, 0x02]);
const EOCD_SIGNATURE = Buffer.from([0x50, 0x4b, 0x05, 0x06]);

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(entries: Array<{ path: string; data: Buffer }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  entries.forEach((entry) => {
    const name = Buffer.from(entry.path);
    const crc = crc32(entry.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(entry.data.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, entry.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(entry.data.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + entry.data.length;
  });

  const centralOffset = offset;
  const central = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(central.length, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  return Buffer.concat([...localParts, central, eocd]);
}

function findOrThrow(buffer: Buffer, signature: Buffer) {
  const offset = buffer.indexOf(signature);
  if (offset < 0) throw new Error("signature not found");
  return offset;
}

function mutateZip(buffer: Buffer, mutate: (copy: Buffer, centralOffset: number, eocdOffset: number) => void) {
  const copy = Buffer.from(buffer);
  mutate(copy, findOrThrow(copy, CENTRAL_SIGNATURE), findOrThrow(copy, EOCD_SIGNATURE));
  return copy;
}

function pngFixture(width = 1, height = 1, marker = "A") {
  const data = Buffer.alloc(33, 0);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(data, 0);
  data.writeUInt32BE(width, 16);
  data.writeUInt32BE(height, 20);
  data.write(marker, 32, "ascii");
  return data;
}

function jpegFixture() {
  return Buffer.from([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x01, 0x00, 0x01, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
    0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00,
    0x00,
    0xff, 0xd9,
  ]);
}

function jpegFixtureWithEmbeddedEoiLikeBytes() {
  const data = jpegFixture();
  return Buffer.concat([data.subarray(0, -2), Buffer.from([0xff, 0xd9, 0x00, 0x01]), data.subarray(-2)]);
}

test("rechaza rutas Zip Slip con barras Unix y Windows y normaliza nombres seguros", () => {
  assert.equal(isZipSlipPath("../secret.jpg"), true);
  assert.equal(isZipSlipPath("..\\secret.jpg"), true);
  assert.equal(isZipSlipPath("safe/product.jpg"), false);
  assert.equal(safeInventoryImageName("../Mi foto ñ.png", 1), "Mi-foto-n.png");
});

test("importador ZIP excluye formatos no admitidos y archivos macOS", () => {
  const zip = zipStore([
    { path: "__MACOSX/._a.jpg", data: Buffer.from("skip") },
    { path: "foto.txt", data: Buffer.from("skip") },
    { path: "foto.heic", data: Buffer.from("skip") },
    { path: "ok.png", data: pngFixture(20, 10) },
  ]);
  const result = analyzeInventoryZipBuffer(zip, "test.zip");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.report.validImages, 1);
  assert.equal(result.report.images[0].width, 20);
  assert.equal(result.report.images[0].height, 10);
  assert.equal(result.report.skippedEntries.length, 3);
});

test("rechaza ZIP truncado", () => {
  const result = analyzeInventoryZipBuffer(zipStore([{ path: "ok.png", data: pngFixture() }]).subarray(0, 20), "truncated.zip");

  assert.equal(result.ok, false);
});

test("rechaza directorio central fuera de rango", () => {
  const zip = mutateZip(zipStore([{ path: "ok.png", data: pngFixture() }]), (copy, _central, eocd) => {
    copy.writeUInt32LE(copy.length + 10, eocd + 16);
  });
  const result = analyzeInventoryZipBuffer(zip, "central-out.zip");

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /directorio central|fuera de rango/i);
});

test("rechaza cabecera local fuera de rango", () => {
  const zip = mutateZip(zipStore([{ path: "ok.png", data: pngFixture() }]), (copy, central) => {
    copy.writeUInt32LE(copy.length + 10, central + 42);
  });
  const result = analyzeInventoryZipBuffer(zip, "local-out.zip");

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /cabecera local|fuera de rango/i);
});

test("rechaza datos comprimidos fuera de rango", () => {
  const zip = mutateZip(zipStore([{ path: "ok.png", data: pngFixture() }]), (copy, central) => {
    copy.writeUInt32LE(copy.length, central + 20);
    copy.writeUInt32LE(copy.length, 18);
  });
  const result = analyzeInventoryZipBuffer(zip, "compressed-out.zip");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.report.validImages, 0);
  assert.match(result.report.skippedEntries[0].reason, /datos comprimidos|fuera de rango/i);
});

test("rechaza tamaños inconsistentes entre cabecera local y directorio central", () => {
  const zip = mutateZip(zipStore([{ path: "ok.png", data: pngFixture() }]), (copy) => {
    copy.writeUInt32LE(1, 18);
  });
  const result = analyzeInventoryZipBuffer(zip, "inconsistent-sizes.zip");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.report.validImages, 0);
  assert.match(result.report.skippedEntries[0].reason, /tama.os inconsistentes/i);
});

test("acepta descriptor de datos cuando el directorio central es válido", () => {
  const zip = mutateZip(zipStore([{ path: "ok.png", data: pngFixture() }]), (copy) => {
    copy.writeUInt16LE(0x08, 6);
    copy.writeUInt32LE(0, 18);
    copy.writeUInt32LE(0, 22);
  });
  const result = analyzeInventoryZipBuffer(zip, "data-descriptor.zip");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.report.validImages, 1);
});

test("rechaza archivo individual por encima del límite", () => {
  const result = analyzeInventoryZipBuffer(
    zipStore([{ path: "ok.png", data: pngFixture() }]),
    "too-large-file.zip",
    { maxUncompressedFileBytes: 8 },
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.report.validImages, 0);
  assert.match(result.report.skippedEntries[0].reason, /demasiado grande/i);
});

test("rechaza total descomprimido declarado antes de inflar", () => {
  const result = analyzeInventoryZipBuffer(
    zipStore([
      { path: "a.png", data: pngFixture(1, 1, "A") },
      { path: "b.png", data: pngFixture(1, 1, "B") },
    ]),
    "too-large-total.zip",
    { maxTotalUncompressedBytes: 40 },
  );

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /total descomprimido declarado/i);
});

test("no infla la entrada ni procesa posteriores si el total declarado excede el límite", () => {
  const zip = mutateZip(
    zipStore([
      { path: "a.png", data: pngFixture(1, 1, "A") },
      { path: "b.png", data: Buffer.from([0x03, 0x00]) },
    ]),
    (copy, central) => {
      const secondCentral = central + 46 + Buffer.from("a.png").length;
      copy.writeUInt16LE(8, secondCentral + 10);
      copy.writeUInt16LE(8, 30 + Buffer.from("a.png").length + pngFixture(1, 1, "A").length + 8);
      copy.writeUInt32LE(1_000, secondCentral + 24);
    },
  );
  const result = analyzeInventoryZipBuffer(zip, "no-inflate-over-limit.zip", { maxTotalUncompressedBytes: 200 });

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /total descomprimido declarado/i);
});

test("entradas ocultas o no admitidas también cuentan para el total declarado de seguridad", () => {
  const result = analyzeInventoryZipBuffer(
    zipStore([
      { path: "__MACOSX/._a.jpg", data: Buffer.alloc(40) },
      { path: "payload.bin", data: Buffer.alloc(40) },
      { path: "ok.png", data: pngFixture() },
    ]),
    "hidden-total.zip",
    { maxTotalUncompressedBytes: 100 },
  );

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /total descomprimido declarado/i);
});

test("rechaza ratio de compresión excesivo antes de inflar", () => {
  const zip = mutateZip(zipStore([{ path: "ok.png", data: pngFixture() }]), (copy, central) => {
    copy.writeUInt32LE(1, central + 20);
    copy.writeUInt32LE(1_000, central + 24);
    copy.writeUInt32LE(1, 18);
    copy.writeUInt32LE(1_000, 22);
  });
  const result = analyzeInventoryZipBuffer(zip, "ratio.zip", { maxCompressionRatio: 10 });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.report.validImages, 0);
  assert.match(result.report.skippedEntries[0].reason, /ratio de compresi/i);
});

test("rechaza demasiadas entradas", () => {
  const result = analyzeInventoryZipBuffer(zipStore([{ path: "ok.png", data: pngFixture() }]), "many.zip", { maxEntries: 0 });

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /demasiadas entradas/i);
});

test("rechaza extensión .jpg con firma inválida", () => {
  const result = analyzeInventoryZipBuffer(zipStore([{ path: "fake.jpg", data: Buffer.from("not a jpeg") }]), "fake-jpg.zip");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.report.validImages, 0);
  assert.match(result.report.skippedEntries[0].reason, /firma real/i);
});

test("rechaza extensión .png con firma inválida", () => {
  const result = analyzeInventoryZipBuffer(zipStore([{ path: "fake.png", data: Buffer.from("not a png") }]), "fake-png.zip");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.report.validImages, 0);
  assert.match(result.report.skippedEntries[0].reason, /firma real/i);
});

test("rechaza falso JPEG SOI/EOI sin segmentos", () => {
  const result = analyzeInventoryZipBuffer(zipStore([{ path: "fake.jpg", data: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }]), "fake-short-jpg.zip");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.report.validImages, 0);
  assert.match(result.report.skippedEntries[0].reason, /firma real/i);
});

test("rechaza JPEG con longitud de segmento fuera de rango", () => {
  const result = analyzeInventoryZipBuffer(zipStore([{ path: "bad.jpg", data: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x20, 0x00, 0xff, 0xd9]) }]), "bad-jpg.zip");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.report.validImages, 0);
  assert.match(result.report.skippedEntries[0].reason, /firma real/i);
});

test("acepta imagen válida por firma real", () => {
  const png = analyzeInventoryZipBuffer(zipStore([{ path: "ok.png", data: pngFixture() }]), "ok-png.zip");
  const jpg = analyzeInventoryZipBuffer(zipStore([{ path: "ok.jpg", data: jpegFixture() }]), "ok-jpg.zip");

  assert.equal(png.ok, true);
  assert.equal(jpg.ok, true);
  if (png.ok) assert.equal(png.report.validImages, 1);
  if (jpg.ok) assert.equal(jpg.report.validImages, 1);
});

test("acepta JPEG con bytes similares a EOI dentro del flujo y EOI final válido", () => {
  const result = analyzeInventoryZipBuffer(zipStore([{ path: "iphone-like.jpg", data: jpegFixtureWithEmbeddedEoiLikeBytes() }]), "iphone-like.zip");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.report.validImages, 1);
});

test("rechaza método de compresión no soportado", () => {
  const zip = mutateZip(zipStore([{ path: "ok.png", data: pngFixture() }]), (copy, central) => {
    copy.writeUInt16LE(99, central + 10);
    copy.writeUInt16LE(99, 8);
  });
  const result = analyzeInventoryZipBuffer(zip, "unsupported.zip");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.report.validImages, 0);
  assert.match(result.report.skippedEntries[0].reason, /compresi.n no soportada/i);
});

test("calcula hashes y marca duplicados exactos sin convertirlos en unidades", () => {
  const image = pngFixture(10, 10);
  const zip = zipStore([
    { path: "a.png", data: image },
    { path: "b.png", data: image },
  ]);
  const result = analyzeInventoryZipBuffer(zip, "dups.zip");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  const expectedHash = createHash("sha256").update(image).digest("hex");
  assert.equal(result.report.images[0].sha256, expectedHash);
  assert.equal(result.report.exactDuplicates.length, 1);
  assert.equal(result.report.proposedGroups[0].relation, "exact_duplicate");
  assert.equal(result.report.proposedGroups[0].suggestedUnits, null);
  assert.equal(result.report.draftLines[0].confirmed.units, null);
});

test("agrupación distingue revisión de varias vistas y varias unidades", () => {
  const images: InventoryOpeningImageMetadata[] = [
    { originalName: "pollo-1.png", safeName: "pollo-1.png", orderIndex: 0, sizeBytes: 10, sha256: "a", mimeType: "image/png", extension: "png", width: 1, height: 1, relation: "needs_review", warnings: [] },
    { originalName: "pollo-2.png", safeName: "pollo-2.png", orderIndex: 1, sizeBytes: 11, sha256: "b", mimeType: "image/png", extension: "png", width: 1, height: 1, relation: "needs_review", warnings: [] },
  ];
  const groups = proposeImageGroups(images);

  assert.equal(groups[0].relation, "probable_same_product");
  assert.equal(groups[0].reviewRequired, true);
  assert.equal(groups[0].suggestedUnits, null);
});

test("IMG_#### y nombres genéricos no se reconocen como producto", () => {
  const result = analyzeInventoryZipBuffer(
    zipStore([
      { path: "IMG_8528.png", data: pngFixture(1, 1, "A") },
      { path: "PXL_20260708_121212.png", data: pngFixture(1, 1, "B") },
      { path: "20260708.png", data: pngFixture(1, 1, "C") },
    ]),
    "camera.zip",
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.report.summary.productsRecognized, 0);
  assert.equal(result.report.summary.pendingProducts, 3);
  assert.equal(result.report.proposedGroups.length, 3);
  assert.equal(result.report.draftLines.every((line) => line.identificationMethod === "fallback"), true);
  assert.equal(JSON.stringify(result.report).includes("IMG 8528"), false);
});

test("nombre semántico real queda como propuesta filename de baja confianza", () => {
  const result = analyzeInventoryZipBuffer(zipStore([{ path: "pico-de-gallo.png", data: pngFixture() }]), "semantic.zip");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  const line = result.report.draftLines[0];
  assert.equal(line.identificationMethod, "filename");
  assert.equal(line.proposed.productName?.method, "filename");
  assert.equal(line.proposed.productName?.value, "PICO DE GALLO");
  assert.equal(line.proposed.productName?.confidence, 0.25);
  assert.equal(line.status, "needs_review");
});

test("línea fallback no inventa datos críticos", () => {
  const result = analyzeInventoryZipBuffer(zipStore([{ path: "IMG_9999.png", data: pngFixture() }]), "one.zip");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const line = result.report.draftLines[0];
  assert.equal(line.confirmed.units, null);
  assert.equal(line.confirmed.totalQuantity, null);
  assert.equal(line.traceabilityStatus, "unavailable");
  assert.equal(line.detected.productName, undefined);
  assert.equal(line.issues.some((issue) => issue.includes("No se inventan")), true);
});

test("cruce por EAN y por nombre/formato prioriza confianza", () => {
  const eanMatch = proposeCatalogMatches({
    ean: "8412345678901",
    catalog: [{ id: "p1", name: "Alitas", ean: "8412345678901" }],
  });
  const nameMatch = proposeCatalogMatches({
    productName: "Alitas",
    catalog: [{ id: "p2", name: "Alitas de pollo congeladas 1 kg" }],
  });

  assert.equal(eanMatch[0].method, "ean");
  assert.equal(eanMatch[0].requiresReview, false);
  assert.equal(nameMatch[0].requiresReview, true);
});

test("cruce con compras anteriores respeta fecha de corte y baja confianza requiere revisión", () => {
  const matches = proposePurchaseMatches({
    productName: "pollo",
    beforeDate: "2026-07-08",
    purchases: [
      { id: "old", productName: "Pollo", documentDate: "2026-07-06" },
      { id: "future", productName: "Pollo", documentDate: "2026-07-09" },
    ],
  });

  assert.equal(matches.length, 1);
  assert.equal(matches[0].targetId, "old");
  assert.equal(matches[0].requiresReview, true);
});

test("aprobación se bloquea con incidencias críticas y aplicación es idempotente", () => {
  const approval = canApproveOpeningSession([
    { status: "confirmed" },
    { status: "pending_identification", issues: ["sin producto"] },
  ]);
  const firstApply = canApplyOpeningSession({ status: "approved" });
  const secondApply = canApplyOpeningSession({ status: "applied", appliedAt: "2026-07-08T23:59:00Z" });

  assert.equal(approval.ok, false);
  assert.equal(firstApply.ok, true);
  assert.equal(secondApply.ok, false);
});

test("dry-run prepara metadatos de evidencia privada y no toca impresión, stock ni movimientos", () => {
  const zip = zipStore([{ path: "freezer/IMG_1000.png", data: pngFixture() }]);
  const result = analyzeInventoryZipBuffer(zip, "dry.zip");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  const serialized = JSON.stringify(result.report);
  assert.equal(result.report.images[0].mimeType, "image/png");
  assert.equal(result.report.images[0].originalName, "freezer/IMG_1000.png");
  assert.equal(serialized.includes("print_jobs"), false);
  assert.equal(serialized.includes("raw_command"), false);
  assert.equal(serialized.includes("GoDEX"), false);
  assert.equal(serialized.includes("admin_inventory_lot_movements"), false);
  assert.equal(serialized.includes("stock"), false);
});

test("fieldProposal conserva diferencia entre detectado, propuesto y confirmado", () => {
  const detected = fieldProposal("Producto visible", 0.6, "ocr", ["pendiente confirmar"]);
  const line = {
    detected: { productName: detected },
    proposed: { productName: detected },
    confirmed: { productName: null },
  };

  assert.equal(line.detected.productName.value, "Producto visible");
  assert.equal(line.proposed.productName.confidence, 0.6);
  assert.equal(line.confirmed.productName, null);
});

test("payload RPC de sesión sanea datos y rechaza contrato inválido", () => {
  const payload = buildCreateInventoryOpeningSessionRpcPayload({
    name: "  Apertura\ncongelador  ",
    locationNames: [" Congelador ", "Congelador", "  "],
    cutoffAt: "2026-07-08T23:59",
    origin: "photo_zip",
    notes: " Nota\toperativa ",
    createdBy: null,
  });
  const invalidName = buildCreateInventoryOpeningSessionRpcPayload({
    name: " ",
    locationNames: [],
    cutoffAt: "2026-07-08T23:59",
    origin: "photo_zip",
  });
  const invalidDate = buildCreateInventoryOpeningSessionRpcPayload({
    name: "Apertura",
    locationNames: [],
    cutoffAt: "no-date",
    origin: "photo_zip",
  });

  assert.equal(payload.ok, true);
  if (payload.ok) {
    assert.equal(payload.data.p_name, "Apertura congelador");
    assert.deepEqual(payload.data.p_location_names, ["Congelador"]);
    assert.equal(payload.data.p_origin, "photo_zip");
    assert.equal(payload.data.p_notes, "Nota operativa");
    assert.equal(payload.data.p_cutoff_at, "2026-07-08T21:59:00.000Z");
  }
  assert.equal(invalidName.ok, false);
  assert.equal(invalidDate.ok, false);
});

test("datetime-local de Madrid se convierte a UTC sin depender de TZ del proceso", () => {
  const previousTz = process.env.TZ;
  process.env.TZ = "UTC";
  const utc = madridDateTimeLocalToUtcIso("2026-07-08T23:59");
  process.env.TZ = "America/New_York";
  const newYork = madridDateTimeLocalToUtcIso("2026-07-08T23:59");
  process.env.TZ = previousTz;

  assert.equal(utc.ok, true);
  assert.equal(newYork.ok, true);
  if (utc.ok && newYork.ok) {
    assert.equal(utc.data, "2026-07-08T21:59:00.000Z");
    assert.equal(newYork.data, "2026-07-08T21:59:00.000Z");
  }
});

test("datetime-local rechaza zona horaria explícita y hora inexistente DST", () => {
  const withZone = madridDateTimeLocalToUtcIso("2026-07-08T23:59Z");
  const nonexistent = madridDateTimeLocalToUtcIso("2026-03-29T02:30");

  assert.equal(withZone.ok, false);
  assert.equal(nonexistent.ok, false);
});

test("datetime-local ambiguo de otoño usa la primera ocurrencia UTC de forma determinista", () => {
  const ambiguous = madridDateTimeLocalToUtcIso("2026-10-25T02:30");

  assert.equal(ambiguous.ok, true);
  if (ambiguous.ok) assert.equal(ambiguous.data, "2026-10-25T00:30:00.000Z");
});
