# GoDEX local printing operations

Estado validado el 2026-07-07 desde el Mac de la red local.

## Configuracion actual

- Marca: GoDEX.
- IP local actual: `<IP_DE_LA_GODEX>`.
- Puertos detectados: `80/tcp`, `515/tcp`, `9100/tcp`.
- Puertos sin respuesta en la prueba: `443/tcp`, `631/tcp`.
- Transporte operativo previsto: TCP RAW `9100`.
- Lenguaje configurado por el ERP: EZPL.
- Perfil de etiqueta ERP: 80 x 50 mm, 203 dpi, maximo 8 copias por trabajo.
- Modelo: no confirmado por CUPS; la interfaz web de la impresora exige login. El repositorio mantiene el perfil logico `kiosko_godex_g500`.

## Variables locales

Configurar en `/Users/xavibocanegra/kioskoalfresko/.env.local` o en el entorno del proceso:

```bash
ERP_API_URL=https://kioskoalfresko.es
ERP_API_TOKEN=<token_api_impresion>
PRINTER_KEY=kiosko_godex_g500
GODEX_PRINT_TRANSPORT=tcp_9100
GODEX_HOST=<IP_DE_LA_GODEX>
GODEX_PORT=9100
GODEX_TCP_TIMEOUT_MS=5000
GODEX_MAX_JOB_BYTES=24576
GODEX_MAX_COPIES=8
BRIDGE_HEALTH_HOST=127.0.0.1
BRIDGE_HEALTH_PORT=8787
LOCAL_PRINT_BRIDGE_ALLOWED_ORIGINS=http://localhost:3000,https://kioskoalfresko.es
```

No versionar tokens reales.

## Comprobaciones de red

```bash
cd /Users/xavibocanegra/kioskoalfresko
arp -an | grep '<IP_DE_LA_GODEX>' || true
ping -c 3 <IP_DE_LA_GODEX> || true
nc -G 3 -vz <IP_DE_LA_GODEX> 80 || true
nc -G 3 -vz <IP_DE_LA_GODEX> 515 || true
nc -G 3 -vz <IP_DE_LA_GODEX> 9100 || true
curl --max-time 5 http://<IP_DE_LA_GODEX> || true
```

## Arrancar el bridge local

```bash
cd /Users/xavibocanegra/kioskoalfresko
npm run printer:bridge
```

El healthcheck queda en `http://127.0.0.1:8787/health`. El bridge debe ejecutarse en un equipo de la misma red que la impresora. Vercel no debe intentar abrir `<IP_DE_LA_GODEX>`.

## Doctor

```bash
cd /Users/xavibocanegra/kioskoalfresko
npm run printer:doctor
```

Debe validar token ERP, TCP de impresora, limites de trabajo y health local.

## Prueba fisica segura

La prueba envia una unica etiqueta con `PRUEBA ERP` y `NO USAR`.

```bash
cd /Users/xavibocanegra/kioskoalfresko
npm run printer:test
```

El resultado correcto del script confirma que el transporte TCP acepto los bytes. No confirma visualmente que el papel haya salido si no hay comprobacion humana.

## Imprimir desde el ERP

1. Entrar en `/admin-kiosko/etiquetas-prep`.
2. Verificar que el bloque `Bridge local OK` esta en verde.
3. Completar producto/preparacion, lote, elaboracion, caducidad, responsable, conservacion y copias.
4. Revisar la vista previa 80 x 50 mm.
5. Pulsar `Enviar a impresora`.
6. Revisar `/admin-kiosko/impresiones`.

Estados:

- `queued`: trabajo encolado.
- `claimed`: bridge procesando.
- `printed`: transporte aceptado por el bridge; no es verificacion visual del papel.
- `error`: fallo de conexion, validacion o envio.

## Reimpresiones

Las reimpresiones desde `/admin-kiosko/impresiones` y desde ficha de lote exigen motivo. Se crea un nuevo `print_jobs` con referencia al trabajo original cuando existe.

## Si cambia la IP

1. Actualizar `GODEX_HOST` en `/Users/xavibocanegra/kioskoalfresko/.env.local`.
2. Reiniciar el bridge.
3. Ejecutar:

```bash
cd /Users/xavibocanegra/kioskoalfresko
npm run printer:doctor
```

## Si 9100 esta cerrado

- No imprimir por TCP RAW.
- Comprobar cable/Wi-Fi, IP asignada y configuracion de red de la impresora.
- Revisar si `515/tcp` esta abierto para LPR, pero no cambiar transporte sin prueba controlada.
- Usar temporalmente la alternativa de navegador/PDF desde el ERP.

## Si aparece offline

- Confirmar corriente, papel y tapa.
- Confirmar que `ping -c 3 <IP_DE_LA_GODEX>` responde.
- Confirmar `nc -G 3 -vz <IP_DE_LA_GODEX> 9100`.
- Revisar logs del bridge.

## Modo alternativo navegador

Desde `/admin-kiosko/etiquetas` se puede usar el boton `PDF` para abrir el dialogo del sistema. Esta via no registra transporte GoDEX y no debe marcarse como etiqueta fisicamente impresa.

## Detener el bridge

En la terminal donde corre el bridge, pulsar `Ctrl+C`.
