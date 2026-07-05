export function cleanLabelText(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const cleaned = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\^~\r\n\t]/g, " ")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return ["", "-", "0", "0.", "0.0", "undefined", "null"].includes(cleaned.toLowerCase()) ? "" : cleaned;
}

export function prepInitials(prepName: unknown) {
  const words = cleanLabelText(prepName)
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "KA";
  if (words.length === 1) {
    const word = words[0];
    return `${word[0] || "K"}${word[word.length - 1] || "A"}`.slice(0, 2);
  }

  return `${words[0][0] || "K"}${words[1][0] || "A"}`.slice(0, 2);
}

export function generatePrepBatchCode(prepName: unknown, now = new Date()) {
  const initials = prepInitials(prepName);
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  const sequence = String(Math.abs(now.getTime()) % 10000).padStart(4, "0");

  return `${initials}-${day}${month}${year}-${sequence}`;
}
