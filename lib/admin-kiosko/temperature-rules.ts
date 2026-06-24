export type TemperatureEquipmentKind = "refrigerated" | "freezer";

export type TemperatureEquipment = {
  name: string;
  zone: "Barra" | "Cocina" | "Almacén";
  kind: TemperatureEquipmentKind;
  active: boolean;
  note?: string;
};

export type TemperatureEvaluation = {
  status: "correcto" | "revisar" | "incidencia";
  alertLevel?: "aviso" | "incidencia";
  message: string;
  acceptableRange: string;
};

export const temperatureEquipment: TemperatureEquipment[] = [
  { zone: "Barra", name: "Botellero 1 (Fantas y energéticas)", kind: "refrigerated", active: true },
  { zone: "Barra", name: "Botellero 2 (Cocacola y Nestea)", kind: "refrigerated", active: true },
  { zone: "Barra", name: "Botellero 3 (Cervezas)", kind: "refrigerated", active: true },
  { zone: "Barra", name: "Botellero 4 (Desayunos)", kind: "refrigerated", active: true },
  { zone: "Barra", name: "Congelador hielo/vasos — por instalar", kind: "freezer", active: false, note: "fuera de servicio / no registrar" },
  { zone: "Cocina", name: "Congelador", kind: "freezer", active: true },
  { zone: "Cocina", name: "Refrigerador", kind: "refrigerated", active: true },
  { zone: "Almacén", name: "Botellero 1 — estropeado indefinidamente", kind: "refrigerated", active: false, note: "fuera de servicio / no registrar" },
];

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
      message: "Equipo fuera de servicio o no registrable.",
    };
  }

  if (kind === "freezer") {
    if (temperature > -15) {
      return {
        status: "incidencia",
        alertLevel: "incidencia",
        acceptableRange,
        message: "Incidencia grave: congelador por encima de -15 ºC.",
      };
    }

    if (temperature > -18) {
      return {
        status: "revisar",
        alertLevel: "aviso",
        acceptableRange,
        message: "Aviso: congelador por encima de -18 ºC.",
      };
    }

    return {
      status: "correcto",
      acceptableRange,
      message: "Temperatura correcta para congelador.",
    };
  }

  if (temperature > 8) {
    return {
      status: "incidencia",
      alertLevel: "incidencia",
      acceptableRange,
      message: "Incidencia grave: equipo refrigerado por encima de 8 ºC.",
    };
  }

  if (temperature > 5) {
    return {
      status: "revisar",
      alertLevel: "aviso",
      acceptableRange,
      message: "Aviso: equipo refrigerado por encima de 5 ºC.",
    };
  }

  if (temperature < 0) {
    return {
      status: "revisar",
      alertLevel: "aviso",
      acceptableRange,
      message: "Aviso: equipo refrigerado por debajo de 0 ºC.",
    };
  }

  return {
    status: "correcto",
    acceptableRange,
    message: "Temperatura correcta para refrigeración.",
  };
}
