# Asistente de Inventario Inicial

## Alcance

Primera fase para preparar inventarios físicos de apertura en `admin-kiosko`.

El asistente permite:

- crear sesiones de inventario físico;
- importar evidencias fotográficas desde ZIP en modo dry-run;
- calcular hashes, dimensiones y duplicados exactos;
- proponer agrupaciones conservadoras;
- mantener líneas de borrador con datos detectados, propuestos y confirmados;
- preparar aprobación y ajustes auditables.

No permite en esta fase:

- aplicar stock automáticamente;
- crear movimientos de inventario;
- borrar movimientos históricos;
- cerrar lotes anteriores sin aprobación;
- inventar EAN, proveedor, lote, caducidad o cantidad;
- subir fotografías a Storage;
- crear URLs firmadas;
- ejecutar OCR o visión artificial;
- publicar fotografías en URLs públicas.

## Modelo

Tablas nuevas:

- `admin_inventory_opening_sessions`
- `admin_inventory_opening_images`
- `admin_inventory_opening_groups`
- `admin_inventory_opening_lines`
- `admin_inventory_opening_match_proposals`
- `admin_inventory_opening_adjustments`
- `admin_inventory_opening_audit_log`

Tablas reutilizadas:

- `admin_inventory_products`
- `admin_inventory_lots`
- `admin_inventory_lot_movements`
- `admin_accounting_documents`
- `admin_accounting_document_items`
- `admin_goods_reception_records`
- `admin_production_batches`
- `admin_production_movements`

La creación de sesión se realiza con la RPC `admin_create_inventory_opening_session`. Esa función inserta la sesión y el evento `session_created` en `admin_inventory_opening_audit_log` dentro de la misma transacción de PostgreSQL. La aplicación la invoca con `service_role` desde servidor; `anon` y `authenticated` no tienen permiso de ejecución.

La fecha de corte del formulario se recibe como `datetime-local` sin zona horaria y se interpreta siempre como hora local `Europe/Madrid`. Se convierte a UTC antes de llamar a la RPC. Las horas inexistentes por el salto horario de primavera se rechazan; las horas ambiguas del cambio de otoño se resuelven de forma determinista usando la primera ocurrencia UTC.

## Dry-run del ZIP

Comando:

```bash
cd /Users/xavibocanegra/kioskoalfresko
node --experimental-strip-types scripts/inventory-opening-dry-run.mjs \
  --zip "/Users/xavibocanegra/kioskoalfresko/private-imports/Inventario congelador 8jul2026.zip" \
  --out /Users/xavibocanegra/kioskoalfresko/dist/inventory-imports
```

El comando genera:

- JSON `*.inventory-import.json`;
- Markdown de revisión;
- ningún movimiento de stock;
- ningún ajuste de stock;
- ninguna subida a Supabase;
- ninguna subida a Git.

El dry-run analiza el ZIP localmente. En esta fase los metadatos de evidencia quedan preparados para almacenamiento privado futuro, pero todavía no se suben imágenes a un bucket ni se generan URLs firmadas.

## Límites de seguridad ZIP

El parser no extrae archivos al sistema de archivos. Lee el ZIP desde memoria y valida directorio central, cabeceras locales, offsets, tamaños y métodos de compresión antes de inflar datos.

Límites actuales:

- ZIP comprimido máximo: 750 MB.
- entradas máximas: 1.000.
- imágenes aceptadas máximas: 500.
- tamaño descomprimido máximo por archivo: 75 MB.
- tamaño descomprimido acumulado: 1 GB.
- ratio máximo de compresión: 120:1.

Estas cifras cubren el ZIP real del congelador, que contiene unas 90 fotos útiles, y dejan margen operativo para futuros inventarios sin aceptar bombas ZIP ni cargas desproporcionadas para un endpoint web.

Se rechazan rutas Zip Slip, cabeceras truncadas, directorios centrales fuera de rango, datos comprimidos fuera de rango, métodos de compresión no soportados y extensiones de imagen con firma real inválida. En esta fase se admiten JPEG, PNG y WebP. HEIC queda pendiente de conversión segura.

El límite total descomprimido se valida contra el tamaño declarado de todas las entradas no directorio del ZIP, incluyendo archivos ocultos de macOS y formatos que luego se omitan. Esto evita que entradas descartadas eludan el límite de seguridad. Si el total declarado supera el límite, no se infla ninguna entrada.

## Reconocimiento

No hay OCR ni visión artificial configurados. El fallback no interpreta nombres genéricos de cámara como `IMG_8528`, `DSC_0001`, `PXL_...` o nombres puramente numéricos como productos. Un nombre de archivo semántico puede generar una propuesta `filename` de baja confianza, siempre pendiente de revisión.

## Revisión humana

Las fotos duplicadas se marcan como evidencia a revisar. Un duplicado exacto puede ser:

- foto repetida;
- varias vistas de la misma unidad;
- varias unidades iguales;
- una captura accidental.

El número de unidades debe confirmarse manualmente.

## Aplicación futura del corte

Para aplicar una sesión en una fase posterior:

1. confirmar líneas críticas;
2. congelar el borrador;
3. guardar snapshot del stock teórico;
4. generar ajustes propuestos;
5. revisar impacto;
6. aprobar con motivo y responsable;
7. aplicar de forma idempotente.

Los lotes de apertura sin trazabilidad completa deben quedar marcados como `inventory_opening` y `partial` o `unavailable`.
