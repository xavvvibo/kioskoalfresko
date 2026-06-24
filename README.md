# Kiosko Alfresko

Proyecto independiente de Kiosko Alfresko, fuera de VERIJOB.

## Stack

- Next.js 16
- App Router
- TypeScript
- Tailwind CSS

## Desarrollo local

```bash
npm install
npm run dev
```

Abrir en:

```bash
http://localhost:3000
```

## Build de producción

```bash
npm run build
npm run start
```

## Variables de entorno

Copia `.env.example` a `.env.local` y completa lo que falte:

```bash
cp .env.example .env.local
```

Variables preparadas:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_GA_ID`
- `NEXT_PUBLIC_GTM_ID`
- `NEXT_PUBLIC_CLARITY_PROJECT_ID`
- `NEXT_PUBLIC_QAMARERO_MODE`
- `NEXT_PUBLIC_QAMARERO_PUBLIC_URL`
- `NEXT_PUBLIC_QAMARERO_IFRAME_URL`
- `QAMARERO_API_BASE_URL`
- `QAMARERO_VENUE_ID`
- `QAMARERO_API_KEY`
- `ADMIN_KIOSKO_PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Panel interno

La ruta `/admin-kiosko` está preparada para uso interno y protegida con contraseña simple.

En local, añade en `.env.local`:

```bash
ADMIN_KIOSKO_PASSWORD=tu-contraseña
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` solo se usa en servidor para las acciones internas del panel. No debe exponerse en componentes cliente.

En Vercel:

1. Abre `Project Settings`
2. Entra en `Environment Variables`
3. Añade `ADMIN_KIOSKO_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`
4. Redeploy del proyecto

Para crear las tablas:

1. Abre Supabase
2. Entra en `SQL Editor`
3. Copia el contenido de `supabase/admin_kiosko_schema.sql`
4. Ejecútalo en el proyecto de producción
5. Verifica que las tablas `admin_*_records` existen con RLS activado

## Analytics

La carga de analítica es condicional y no rompe la web si no hay IDs configurados.

- `NEXT_PUBLIC_GA_ID`
  - ejemplo: `G-XXXXXXXXXX`
- `NEXT_PUBLIC_GTM_ID`
  - ejemplo: `GTM-XXXXXXX`
- `NEXT_PUBLIC_CLARITY_PROJECT_ID`
  - ejemplo: `abcd1234efgh`

En Vercel:

1. Abre `Project Settings`
2. Entra en `Environment Variables`
3. Añade `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GTM_ID` y/o `NEXT_PUBLIC_CLARITY_PROJECT_ID`
4. Redeploy del proyecto

Para Microsoft Clarity:

1. Crea o abre el proyecto en [Microsoft Clarity](https://clarity.microsoft.com/)
2. Entra en `Settings`
3. Copia el `Project ID`
4. Guárdalo en Vercel como `NEXT_PUBLIC_CLARITY_PROJECT_ID`

Con Clarity configurado podrás analizar:

- heatmaps
- scroll
- clicks
- grabaciones de sesión
- comportamiento móvil

Eventos ya preparados:

- `click_reserva_qamarero`
- `click_whatsapp`
- `click_como_llegar`
- `click_ver_carta`
- `click_instagram`
- `click_llamar`

## Estructura

- `app/`
- `components/`
- `content/`
- `lib/`
- `types/`
- `public/`

## Qamarero

La integración está preparada en `lib/integrations/qamarero.ts`.

Modos contemplados:

- URL externa
- iframe
- API

No se han inventado endpoints reales. Falta conectar credenciales o URL reales de producción.

## Owner dashboard

Ruta base:

- `/owner`

Incluye base preparada para:

- resumen de negocio
- horarios estacionales
- CTAs
- SEO local
- carta
- estados pendientes

Falta conectar auth real y persistencia de edición antes de publicar.

## Pendiente antes de publicar en kioskoalfresko.es

- teléfono real
- email real
- enlace real de Maps
- carta real
- horarios de junio, julio, agosto y septiembre
- integración real de reservas con Qamarero
- legales definitivos
- protección real del dashboard `/owner`
# kioskoalfresko
# kioskoalfresko
