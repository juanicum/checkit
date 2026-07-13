# ChecKit AI Redactor v3 - Fixed deploy

Esta versión elimina `package-lock.json` para evitar errores de instalación en Vercel causados por lockfiles generados fuera de GitHub/Vercel.

Variables necesarias en Vercel:

- `OPENAI_API_KEY`

Variables opcionales para Supabase:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Para base de datos, ejecutar `supabase/schema.sql` en Supabase.
