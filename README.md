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
- `NEXT_PUBLIC_QAMARERO_MODE`
- `NEXT_PUBLIC_QAMARERO_PUBLIC_URL`
- `NEXT_PUBLIC_QAMARERO_IFRAME_URL`
- `QAMARERO_API_BASE_URL`
- `QAMARERO_VENUE_ID`
- `QAMARERO_API_KEY`

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
