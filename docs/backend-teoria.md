# Teoría del Backend

## 1. Arquitectura cliente-servidor

En una aplicación web o móvil hay tres capas bien diferenciadas. El cliente es la app que usa el usuario, en nuestro caso la app móvil de Top 5 de Todo. El servidor es la API, que recibe las peticiones del cliente, las procesa y devuelve una respuesta. La base de datos es donde se almacenan los datos de forma persistente, en nuestro caso PostgreSQL en Neon.

La app móvil nunca se conecta directamente a la base de datos. Si el connection string estuviera en el código de la app, cualquiera que la descompilara tendría acceso completo a todos los datos. La API actúa como intermediario y guardián: valida que los datos son correctos y que el cliente tiene permiso para hacer lo que pide.

## 2. API REST y métodos HTTP

Una API REST es una forma de estructurar la comunicación entre cliente y servidor usando el protocolo HTTP. Cada operación sobre los datos se representa con un método HTTP:

- GET: leer datos. Obtener todos los rankings o uno en concreto.
- POST: crear datos. Crear un ranking nuevo con sus 5 ítems.
- PATCH: modificar datos parcialmente. Cambiar el título o marcar como favorito.
- DELETE: eliminar datos. Borrar un ranking.

Los códigos de estado indican el resultado de la operación. Los más importantes son 200 OK, 201 Created, 400 Bad Request, 404 Not Found y 500 Internal Server Error. Nunca se devuelve el error real de la base de datos al cliente porque contiene información interna que un atacante podría aprovechar.

## 3. Bases de datos relacionales y SQL

Las bases de datos relacionales organizan los datos en tablas con filas y columnas. En este proyecto hay dos tablas: `rankings` y `ranking_items`.

Cada tabla tiene una **primary key**, que es un identificador único e irrepetible. Usamos UUID en lugar de números autoincrementales porque el cliente puede generar el ID antes de conectarse a la red.

La tabla `ranking_items` tiene una **foreign key** que referencia la primary key de `rankings`. Gracias a `ON DELETE CASCADE`, cuando se elimina un ranking sus ítems se eliminan automáticamente.

SQL se divide en dos tipos de operaciones. DDL define la estructura con `CREATE`, `ALTER` y `DROP`. DML manipula los datos con `SELECT`, `INSERT`, `UPDATE` y `DELETE`.

## 4. JOINs

Los JOINs permiten combinar datos de varias tablas en una sola consulta. En este proyecto los usamos para obtener un ranking junto con todos sus ítems en una sola petición.

Un **INNER JOIN** devuelve solo las filas que tienen coincidencia en ambas tablas. Si un ranking no tuviera ítems, no aparecería en el resultado.

Un **LEFT JOIN** devuelve todas las filas de la tabla izquierda aunque no tengan coincidencia en la derecha. Usamos LEFT JOIN para los rankings porque queremos que aparezcan aunque no tengan ítems asociados.

```sql
SELECT 
  r.*,
  json_agg(ri.* ORDER BY ri.position) as items
FROM rankings r
LEFT JOIN ranking_items ri ON r.id = ri.ranking_id
GROUP BY r.id
ORDER BY r.created_at DESC;
```

Esta consulta devuelve todos los rankings con sus ítems agrupados en un array JSON, ordenados por posición.