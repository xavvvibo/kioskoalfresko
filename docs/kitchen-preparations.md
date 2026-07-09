# Operativa de cocina

## Batch congelado FRZ-20260708

El batch `FRZ-20260708` corresponde a inventario congelado registrado el `08/07/2026`. La fecha factura/albaran / recepcion real queda pendiente de revision documental.

Para regularizaciones autorizadas por responsable, si un producto coincide de forma fiable con una compra disponible, se usa la fecha de compra mas reciente como recepcion APPCC del stock actual. Si no hay match fiable, no se usa `08/07/2026` como recepcion: el envase queda en revision por fecha documental.

En `FRZ-20260708`, `Alitas de pollo` queda vinculada a factura Makro `201-0037200` (`03/07/2026`, lote proveedor `26002377`) solo como regularizacion documental. Debe seguir en revision hasta validar cantidad/envase fisico.

Regla operativa:

- Mantener siempre a `-18 C o inferior`.
- No tratar como producto fresco ni descongelado.
- No usar productos en `cuarentena` o `revision` hasta validar lote, caducidad, peso o identificacion.
- No generar fecha de consumo 24h/48h salvo que se registre una descongelacion real en otro flujo.
- Al descongelar en el futuro, crear un movimiento/trazabilidad especifico y etiquetar como descongelado con `NO RECONGELAR`.

Pantalla:

```text
/admin-kiosko/trazabilidad/inventario-congelado-20260708
```

La pantalla imprime etiquetas GoDEX 80x50 solo bajo confirmacion manual. Las etiquetas de revision/cuarentena no habilitan consumo ni produccion; solo identifican el envase y el bloqueo operativo.
