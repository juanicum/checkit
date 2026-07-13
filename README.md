# ChecKit — Redactor IA para verificaciones

Versión 3 para probar en Vercel.

Incluye:

- Logo y nombre de la herramienta: **ChecKit**.
- Chat guiado con agente editorial.
- Ficha estructurada ajustada a la nueva metodología.
- Hallazgos dinámicos: 1 a N hallazgos.
- Evidencias dinámicas: cada hallazgo puede tener 1 a N evidencias.
- Cada evidencia tiene una sola fuente o enlace asociado.
- Sin campo independiente de “Fuentes consultadas”.
- Campo de notas editoriales.
- Generación de dos borradores editables:
  - Borrador con números y títulos de la ficha.
  - Redacción limpia sin números ni títulos de ficha.
- Guardado opcional en Supabase.
- Aprobación de versión final como ejemplo editorial.
- Exportación local a HTML desde la redacción limpia editada.

## Nueva ficha estructurada

1. **Subtítulo**  
   Pregunta guía: ¿Por qué estamos verificando?

2. **Explicación del contexto**  
   Pregunta guía: ¿Qué está pasando o qué pasó para que esté circulando esta verificación?

3. **Qué circula**  
   Describe el contenido difundido, formato, plataforma y autor o cuenta si se conoce.

4. **Hallazgos con evidencia**  
   Pregunta guía: ¿Qué estoy verificando?  
   Estructura: 1 a N hallazgos. Cada hallazgo puede tener 1 a N evidencias. Cada evidencia tiene una sola fuente.

5. **Conclusión con categoría y evidencia**  
   Cierra con la categoría asignada y la evidencia principal.

6. **Titular con conclusión**  
   Se ubica al final de la ficha para redactarlo cuando ya está clara la conclusión.

## Variables de entorno en Vercel

Obligatoria:

```bash
OPENAI_API_KEY=tu_api_key_aqui
```

Opcional:

```bash
OPENAI_MODEL=gpt-4.1-mini
```

Para guardar en base de datos:

```bash
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

Sin Supabase configurado, la herramienta funciona para conversar y generar borradores, pero no guardará casos ni ejemplos editoriales.

## Crear o actualizar la base de datos en Supabase

1. Crea un proyecto en Supabase.
2. Entra a **SQL Editor**.
3. Copia y ejecuta el contenido de `supabase/schema.sql`.
4. En **Project Settings > API** copia:
   - Project URL → `SUPABASE_URL`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
5. Pega esas variables en **Vercel > Settings > Environment Variables**.
6. Haz redeploy.

## Probar localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

Luego abre:

```bash
http://localhost:3000
```

## Subir a Vercel

1. Sube esta carpeta a GitHub.
2. En Vercel, importa el repositorio o haz redeploy del proyecto conectado.
3. Agrega las variables de entorno.
4. Deploy.

## Sobre el aprendizaje

ChecKit no entrena un modelo propio. Guarda versiones finales aprobadas por el editor en `style_examples`. Luego usa esos ejemplos como referencia de estilo para casos futuros de la misma categoría, sin copiar datos.
