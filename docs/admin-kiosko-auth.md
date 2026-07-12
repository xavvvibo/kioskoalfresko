# Admin-kiosko: usuarios internos y retirada de contraseña global

## Estado implementado

- Login nominal con `username` o `email` y contraseña.
- Sesión en cookie `httpOnly`, `sameSite=strict`, limitada a `/admin-kiosko`.
- Roles internos: `owner` y `employee`.
- Usuario `disabled` no puede iniciar sesión ni mantener sesión válida.
- Compatibilidad temporal con `ADMIN_KIOSKO_PASSWORD` como owner legacy.

## Retirada de `ADMIN_KIOSKO_PASSWORD`

1. Ejecutar `supabase/admin_kiosko_users.sql`.
2. Entrar con la contraseña global actual.
3. Crear el owner real en `/admin-kiosko/usuarios`.
4. Salir y volver a entrar con el usuario owner nominal.
5. Crear empleados desde `/admin-kiosko/usuarios`.
6. Retirar `ADMIN_KIOSKO_PASSWORD` del entorno cuando no queden accesos legacy.

## Owner inicial sin secreto en git

Preferencia operativa: crear el owner desde panel usando la compatibilidad temporal.

Alternativa SQL: usar `supabase/seeds/admin_kiosko_users.sql` y sustituir el placeholder por un `password_hash` generado fuera del repo con el algoritmo `scrypt` de `lib/admin-kiosko/auth.ts`.
