# Seguridad en la API

## 1. SQL Injection (Inyección SQL)

La inyección SQL ocurre cuando un atacante introduce código SQL como si fuera datos normales. Si la app concatena directamente la entrada del usuario en una consulta, puede manipularla para leer datos ajenos o destruir tablas enteras.

Ejemplo vulnerable:
```typescript
const categoria = req.body.category;
// Si el usuario envía: '; DROP TABLE rankings;--
const query = "SELECT * FROM rankings WHERE category = '" + categoria + "'";
// Resultado: se ejecuta el DROP TABLE y se pierden todos los rankings
```

Solución con template literals de Neon:
```typescript
// Neon envía la estructura SQL y los valores por separado
const resultado = await sql`SELECT * FROM rankings WHERE category = ${categoria}`;
// Aunque el usuario envíe código malicioso, la base de datos lo trata como texto
```

## 2. Variables de entorno

Las variables de entorno permiten guardar datos sensibles fuera del código fuente. El connection string contiene el usuario y la contraseña de la base de datos, por lo que si apareciera en el código y se subiera al repositorio, cualquiera tendría acceso completo a los datos.

Para evitarlo se usa `.env.local`, que está excluido en `.gitignore` y nunca se sube al repositorio. En su lugar se sube `.env.example` con las claves vacías como plantilla. En producción las variables se configuran directamente en el panel de Vercel.