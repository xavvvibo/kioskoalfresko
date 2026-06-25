export type TemperatureEquipmentKind = "refrigerated" | "freezer";

export type TemperatureEquipment = {
  name: string;
  zone: "Barra" | "Cocina" | "Almacén";
  kind: TemperatureEquipmentKind;
  active: boolean;
  archived?: boolean;
  note?: string;
};

export type TemperatureEvaluation = {
  status: "correcto" | "revisar" | "incidencia";
  alertLevel?: "aviso" | "incidencia";
  message: string;
  acceptableRange: string;
};

export const temperatureEquipment: TemperatureEquipment[] = [
  { zone: "Barra", name: "Botellero desayunos", kind: "refrigerated", active: true },
  { zone: "Barra", name: "Arcón hielo pequeño", kind: "freezer", active: true },
  { zone: "Cocina", name: "Arcón congelador", kind: "freezer", active: true },
  { zone: "Cocina", name: "Arcón frío", kind: "refrigerated", active: true },
  { zone: "Almacén", name: "Arcón hielo grande", kind: "freezer", active: true },
  { zone: "Almacén", name: "Botellero inoperativo", kind: "refrigerated", active: false, note: "fuera de servicio / no registrar" },
];

export const archivedTemperatureEquipment = [
  "Botellero 1 (Fantas y energéticas)",
  "Botellero 2 (Cocacola y Nestea)",
  "Botellero 3 (Cervezas)",
  "Botellero 4 (Desayunos)",
  "Congelador",
  "Refrigerador",
  "Cámara refrigeración",
  "Congelador hielo/vasos",
  "Congelador hielo/vasos — por instalar",
  "Botellero 1 almacén",
  "Botellero 1 — estropeado indefinidamente",
];

export function isActiveTemperatureEquipment(name: string) {
  return temperatureEquipment.some((equipment) => equipment.name === name && equipment.active);
}

export function isArchivedTemperatureEquipment(name: string) {
  return archivedTemperatureEquipment.includes(name);
}

export function getTemperatureEquipment(name: string) {
  return temperatureEquipment.find((equipment) => equipment.name === name);
}

export function getAcceptableRange(kind: TemperatureEquipmentKind) {
  return kind === "freezer" ? "-25 ºC a -18 ºC" : "0 ºC a 5 ºC";
}

export function evaluateTemperature(equipmentName: string, temperature: number): TemperatureEvaluation {
  const equipment = getTemperatureEquipment(equipmentName);
  const kind = equipment?.kind || "refrigerated";
  const acceptableRange = getAcceptableRange(kind);

  if (!equipment || !equipment.active) {
    return {
      status: "incidencia",
      alertLevel: "incidencia",
      acceptableRange,
      message: "Incidencia: posible fallo de equipo",
    };
  }

  if (kind === "freezer") {
    if (temperature > -15) {
      return {
        status: "incidencia",
        alertLevel: "incidencia",
        acceptableRange,
        message: "Incidencia: posible fallo de equipo",
      };
    }

    if (temperature > -18) {
      return {
        status: "revisar",
        alertLevel: "aviso",
        acceptableRange,
        message: "Revisar temperatura",
      };
    }

    return {
      status: "correcto",
      acceptableRange,
      message: "Correcto",
    };
  }

  if (temperature > 8) {
    return {
      status: "incidencia",
      alertLevel: "incidencia",
      acceptableRange,
      message: "Incidencia: posible fallo de equipo",
    };
  }

  if (temperature > 5) {
    return {
      status: "revisar",
      alertLevel: "aviso",
      acceptableRange,
      message: "Revisar temperatura",
    };
  }

  if (temperature < 0) {
    return {
      status: "revisar",
      alertLevel: "aviso",
      acceptableRange,
      message: "Revisar temperatura",
    };
  }

  return {
    status: "correcto",
    acceptableRange,
    message: "Correcto",
  };
}
