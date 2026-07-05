import {
  buildGodex80x50LabelEzpl,
  buildGodex80x50MinimalTestEzpl,
  buildGodex80x50TestEzpl,
  ezplLines,
  isValidGodex80x50Ezpl,
} from "../../lib/admin-kiosko/printing/godex-80x50-ezpl.mjs";

const samples = [
  ["test", buildGodex80x50TestEzpl()],
  ["minimal", buildGodex80x50MinimalTestEzpl()],
  ["real-label", buildGodex80x50LabelEzpl({
    template: "prep_label_professional",
    title: "GUACAMOLE",
    line1: "GM-TEST",
    line2: "CAD 07/07/26 12:00",
    line3: "J. Bocanegra",
    line4: "Refrigerado 0-4 C",
  })],
];

for (const [name, ezpl] of samples) {
  const lines = ezplLines(ezpl);
  const assertions = [
    [lines[0] === "^Q50,3", "empieza por ^Q50,3"],
    [lines.includes("^W80"), "contiene ^W80"],
    [lines.includes("^L"), "contiene ^L"],
    [lines[lines.length - 1] === "E", "termina en E"],
    [ezpl.length > 0, "no esta vacio"],
    [/^[\x09\x0A\x0D\x20-\x7E]*$/.test(ezpl), "ASCII seguro"],
    [isValidGodex80x50Ezpl(ezpl), "validador comun OK"],
  ];

  for (const [ok, label] of assertions) {
    if (!ok) {
      throw new Error(`EZPL ${name} invalido: ${label}`);
    }
  }
}

process.stdout.write("[GODEX EZPL CHECK OK]\n");
