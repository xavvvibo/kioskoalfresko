import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import {
  analyzeInventoryImageGroupFallback,
  extensionFromPath,
  inventoryOpeningAllowedExtensions,
  inventoryOpeningMaxCompressionRatio,
  inventoryOpeningMaxEntries,
  inventoryOpeningMaxFiles,
  inventoryOpeningMaxTotalUncompressedBytes,
  inventoryOpeningMaxUncompressedFileBytes,
  inventoryOpeningMaxZipBytes,
  isHiddenMacZipEntry,
  isZipSlipPath,
  markImageRelations,
  mimeFromExtension,
  proposeImageGroups,
  safeInventoryImageName,
} from "./rules.ts";
import type { InventoryOpeningDryRunReport, InventoryOpeningImageMetadata } from "./types.ts";

type ZipCentralDirectoryEntry = {
  path: string;
  compressedSize: number;
  uncompressedSize: number;
  compressionMethod: number;
  localHeaderOffset: number;
  orderIndex: number;
};

type ZipReadResult =
  | { ok: true; report: InventoryOpeningDryRunReport }
  | { ok: false; error: string };

export type InventoryOpeningZipLimits = {
  maxZipBytes: number;
  maxEntries: number;
  maxImages: number;
  maxUncompressedFileBytes: number;
  maxTotalUncompressedBytes: number;
  maxCompressionRatio: number;
};

export const defaultInventoryOpeningZipLimits: InventoryOpeningZipLimits = {
  maxZipBytes: inventoryOpeningMaxZipBytes,
  maxEntries: inventoryOpeningMaxEntries,
  maxImages: inventoryOpeningMaxFiles,
  maxUncompressedFileBytes: inventoryOpeningMaxUncompressedFileBytes,
  maxTotalUncompressedBytes: inventoryOpeningMaxTotalUncompressedBytes,
  maxCompressionRatio: inventoryOpeningMaxCompressionRatio,
};

function resolveZipLimits(limits?: Partial<InventoryOpeningZipLimits>): InventoryOpeningZipLimits {
  return { ...defaultInventoryOpeningZipLimits, ...limits };
}

function assertRange(buffer: Buffer, offset: number, length: number, label: string) {
  if (!Number.isInteger(offset) || !Number.isInteger(length) || offset < 0 || length < 0 || offset + length > buffer.length) {
    throw new Error(`ZIP inválido: ${label} fuera de rango.`);
  }
}

function readUInt16(buffer: Buffer, offset: number) {
  assertRange(buffer, offset, 2, "lectura uint16");
  return buffer.readUInt16LE(offset);
}

function readUInt32(buffer: Buffer, offset: number) {
  assertRange(buffer, offset, 4, "lectura uint32");
  return buffer.readUInt32LE(offset);
}

function findEndOfCentralDirectory(buffer: Buffer) {
  const min = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= min; offset -= 1) {
    if (readUInt32(buffer, offset) === 0x06054b50) return offset;
  }
  return -1;
}

export function listZipEntries(buffer: Buffer, limits: InventoryOpeningZipLimits = defaultInventoryOpeningZipLimits): ZipCentralDirectoryEntry[] {
  const eocd = findEndOfCentralDirectory(buffer);
  if (eocd < 0) throw new Error("ZIP inválido: no se encontró directorio central.");

  const totalEntries = readUInt16(buffer, eocd + 10);
  if (totalEntries > limits.maxEntries) {
    throw new Error(`ZIP rechazado: demasiadas entradas (${totalEntries}).`);
  }
  const centralDirectoryOffset = readUInt32(buffer, eocd + 16);
  const centralDirectorySize = readUInt32(buffer, eocd + 12);
  assertRange(buffer, centralDirectoryOffset, centralDirectorySize, "directorio central");
  const entries: ZipCentralDirectoryEntry[] = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < totalEntries; index += 1) {
    assertRange(buffer, offset, 46, "cabecera central");
    if (readUInt32(buffer, offset) !== 0x02014b50) throw new Error("ZIP inválido: cabecera central corrupta.");
    const compressionMethod = readUInt16(buffer, offset + 10);
    const compressedSize = readUInt32(buffer, offset + 20);
    const uncompressedSize = readUInt32(buffer, offset + 24);
    const fileNameLength = readUInt16(buffer, offset + 28);
    const extraLength = readUInt16(buffer, offset + 30);
    const commentLength = readUInt16(buffer, offset + 32);
    const localHeaderOffset = readUInt32(buffer, offset + 42);
    assertRange(buffer, offset + 46, fileNameLength, "nombre de archivo en directorio central");
    assertRange(buffer, offset + 46 + fileNameLength, extraLength + commentLength, "campos extra del directorio central");
    assertRange(buffer, localHeaderOffset, 30, "offset de cabecera local");
    const path = buffer.subarray(offset + 46, offset + 46 + fileNameLength).toString("utf8");
    entries.push({ path, compressedSize, uncompressedSize, compressionMethod, localHeaderOffset, orderIndex: index });
    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  const totalDeclaredUncompressedBytes = entries
    .filter((entry) => entry.path && !entry.path.endsWith("/"))
    .reduce((total, entry) => total + entry.uncompressedSize, 0);
  if (totalDeclaredUncompressedBytes > limits.maxTotalUncompressedBytes) {
    throw new Error(`ZIP rechazado: total descomprimido declarado excesivo (${totalDeclaredUncompressedBytes} bytes).`);
  }

  return entries;
}

function readZipEntryData(buffer: Buffer, entry: ZipCentralDirectoryEntry, limits: InventoryOpeningZipLimits) {
  const offset = entry.localHeaderOffset;
  assertRange(buffer, offset, 30, `cabecera local en ${entry.path}`);
  if (readUInt32(buffer, offset) !== 0x04034b50) throw new Error(`ZIP inválido: cabecera local corrupta en ${entry.path}.`);
  const localFlags = readUInt16(buffer, offset + 6);
  const localCompressionMethod = readUInt16(buffer, offset + 8);
  const localCompressedSize = readUInt32(buffer, offset + 18);
  const localUncompressedSize = readUInt32(buffer, offset + 22);
  const fileNameLength = readUInt16(buffer, offset + 26);
  const extraLength = readUInt16(buffer, offset + 28);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  if (localCompressionMethod !== entry.compressionMethod) {
    throw new Error(`Método de compresión inconsistente en ${entry.path}.`);
  }
  if ((localFlags & 0x08) === 0 && (localCompressedSize !== entry.compressedSize || localUncompressedSize !== entry.uncompressedSize)) {
    throw new Error(`Tamaños inconsistentes entre cabeceras en ${entry.path}.`);
  }
  assertRange(buffer, offset + 30, fileNameLength + extraLength, `metadatos locales en ${entry.path}`);
  assertRange(buffer, dataStart, entry.compressedSize, `datos comprimidos en ${entry.path}`);
  if (entry.uncompressedSize > limits.maxUncompressedFileBytes) {
    throw new Error(`Archivo demasiado grande al descomprimir (${entry.uncompressedSize} bytes) en ${entry.path}.`);
  }
  if (entry.compressedSize > 0 && entry.uncompressedSize / entry.compressedSize > limits.maxCompressionRatio) {
    throw new Error(`Ratio de compresión excesivo en ${entry.path}.`);
  }
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);

  let data: Buffer;
  if (entry.compressionMethod === 0) data = Buffer.from(compressed);
  else if (entry.compressionMethod === 8) data = inflateRawSync(compressed);
  else throw new Error(`Compresión no soportada en ${entry.path}.`);

  if (data.length !== entry.uncompressedSize) {
    throw new Error(`Tamaño descomprimido inconsistente en ${entry.path}.`);
  }
  if (data.length > limits.maxUncompressedFileBytes) {
    throw new Error(`Archivo demasiado grande al descomprimir (${data.length} bytes) en ${entry.path}.`);
  }
  return data;
}

function sha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function imageDimensions(buffer: Buffer, extension: string) {
  if (extension === "png" && buffer.length >= 24 && buffer.toString("ascii", 1, 4) === "PNG") {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if ((extension === "jpg" || extension === "jpeg") && buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (length < 2) break;
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      offset += 2 + length;
    }
  }

  if (extension === "webp" && buffer.length >= 30 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buffer.toString("ascii", 12, 16);
    if (chunk === "VP8X" && buffer.length >= 30) {
      return {
        width: 1 + buffer.readUIntLE(24, 3),
        height: 1 + buffer.readUIntLE(27, 3),
      };
    }
  }

  return { width: null, height: null };
}

function isJpegMarkerWithoutLength(marker: number) {
  return marker === 0x01 || marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7);
}

function isJpegStartOfFrame(marker: number) {
  return (marker >= 0xc0 && marker <= 0xc3)
    || (marker >= 0xc5 && marker <= 0xc7)
    || (marker >= 0xc9 && marker <= 0xcb)
    || (marker >= 0xcd && marker <= 0xcf);
}

function hasValidJpegStructure(buffer: Buffer) {
  if (buffer.length < 8 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return false;
  let offset = 2;
  let sawImageSegment = false;

  while (offset < buffer.length) {
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    if (offset >= buffer.length) return false;

    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xd9) {
      return sawImageSegment && offset === buffer.length;
    }
    if (isJpegMarkerWithoutLength(marker)) continue;
    if (offset + 2 > buffer.length) return false;

    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) return false;

    if (isJpegStartOfFrame(marker)) sawImageSegment = true;
    if (marker === 0xda) {
      sawImageSegment = true;
      const scanStart = offset + length;
      const eoiOffset = buffer.lastIndexOf(Buffer.from([0xff, 0xd9]));
      return eoiOffset >= scanStart && eoiOffset + 2 === buffer.length;
    }

    offset += length;
  }

  return false;
}

function hasValidImageSignature(buffer: Buffer, extension: string) {
  if ((extension === "jpg" || extension === "jpeg")) {
    return hasValidJpegStructure(buffer);
  }
  if (extension === "png") {
    return buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (extension === "webp") {
    return buffer.length >= 20 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
}

function validateZipBuffer(buffer: Buffer, limits: InventoryOpeningZipLimits) {
  if (buffer.length > limits.maxZipBytes) {
    return `ZIP demasiado grande (${buffer.length} bytes).`;
  }
  if (buffer.length < 22) return "ZIP inválido o vacío.";
  return null;
}

export function analyzeInventoryZipBuffer(buffer: Buffer, sourceZip: string, inputLimits?: Partial<InventoryOpeningZipLimits>): ZipReadResult {
  const limits = resolveZipLimits(inputLimits);
  const validationError = validateZipBuffer(buffer, limits);
  if (validationError) return { ok: false, error: validationError };

  let entries: ZipCentralDirectoryEntry[];
  try {
    entries = listZipEntries(buffer, limits);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "ZIP inválido." };
  }

  const skippedEntries: InventoryOpeningDryRunReport["skippedEntries"] = [];
  const images: InventoryOpeningImageMetadata[] = [];
  let acceptedCount = 0;
  let totalUncompressedBytes = 0;

  for (const entry of entries) {
    const path = entry.path;
    const extension = extensionFromPath(path);

    if (!path || path.endsWith("/")) continue;
    if (isZipSlipPath(path)) {
      skippedEntries.push({ path, reason: "Ruta insegura dentro del ZIP." });
      continue;
    }
    if (isHiddenMacZipEntry(path)) {
      skippedEntries.push({ path, reason: "Archivo oculto de macOS ignorado." });
      continue;
    }
    if (!inventoryOpeningAllowedExtensions.has(extension)) {
      skippedEntries.push({ path, reason: extension === "heic" ? "HEIC pendiente de conversión segura." : "Formato no admitido." });
      continue;
    }
    if (acceptedCount >= limits.maxImages) {
      skippedEntries.push({ path, reason: "Límite máximo de imágenes superado." });
      continue;
    }

    try {
      if (totalUncompressedBytes + entry.uncompressedSize > limits.maxTotalUncompressedBytes) {
        skippedEntries.push({ path, reason: "Límite total descomprimido superado." });
        break;
      }
      const data = readZipEntryData(buffer, entry, limits);
      totalUncompressedBytes += data.length;
      if (totalUncompressedBytes > limits.maxTotalUncompressedBytes) break;
      if (!hasValidImageSignature(data, extension)) {
        skippedEntries.push({ path, reason: "Firma real de imagen inválida." });
        continue;
      }
      const dimensions = imageDimensions(data, extension);
      images.push({
        originalName: path,
        safeName: safeInventoryImageName(path, entry.orderIndex + 1),
        orderIndex: entry.orderIndex,
        sizeBytes: data.length,
        sha256: sha256(data),
        mimeType: mimeFromExtension(extension),
        extension,
        width: dimensions.width,
        height: dimensions.height,
        duplicateOfSha256: null,
        relation: "needs_review",
        warnings: dimensions.width && dimensions.height ? [] : ["No se pudieron leer dimensiones; revisar imagen."],
      });
      acceptedCount += 1;
    } catch (error) {
      skippedEntries.push({ path, reason: error instanceof Error ? error.message : "No se pudo leer la imagen." });
    }
  }

  const markedImages = markImageRelations(images);
  const exactDuplicates = Array.from(
    markedImages.reduce((map, image, index) => {
      const rows = map.get(image.sha256) || [];
      rows.push(index);
      map.set(image.sha256, rows);
      return map;
    }, new Map<string, number[]>()),
  )
    .filter(([, indexes]) => indexes.length > 1)
    .map(([hash, imageIndexes]) => ({ sha256: hash, imageIndexes }));
  const proposedGroups = proposeImageGroups(markedImages);
  const draftLines = proposedGroups.map((group) => {
    const groupImages = group.imageIndexes.map((index) => markedImages[index]).filter(Boolean);
    const line = analyzeInventoryImageGroupFallback(groupImages);
    return {
      ...line,
      imageIndexes: group.imageIndexes,
      status: group.relation === "exact_duplicate" ? "needs_review" as const : line.status,
      issues: group.relation === "exact_duplicate"
        ? ["Duplicado exacto detectado; revisar si es foto repetida o unidad física adicional.", ...line.issues]
        : line.issues,
    };
  });

  return {
    ok: true,
    report: {
      sourceZip,
      generatedAt: new Date().toISOString(),
      totalEntries: entries.length,
      validImages: markedImages.length,
      skippedEntries,
      images: markedImages,
      exactDuplicates,
      proposedGroups,
      draftLines,
      summary: {
        productsRecognized: draftLines.filter((line) => Boolean(line.proposed.productName)).length,
        eansFound: 0,
        lotsFound: 0,
        expiriesFound: 0,
        pendingProducts: draftLines.filter((line) => line.status === "pending_identification" || line.status === "needs_review").length,
        criticalIssues: draftLines.filter((line) => line.status === "conflict").length,
      },
    },
  };
}
