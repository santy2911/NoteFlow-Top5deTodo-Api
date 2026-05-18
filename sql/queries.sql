-- Consulta para obtener todos los rankings con sus ítems anidados
SELECT
  r.*,
  -- json_agg agrupa múltiples filas hijas en un array JSON.
  -- FILTER evita que se cree un array con un [null] si el ranking no tiene ítems.
  json_agg(
    json_build_object(
      'id',          ri.id,
      'position',    ri.position,
      'title',       ri.title,
      'description', ri.description
    )
    ORDER BY ri.position
  ) FILTER (WHERE ri.id IS NOT NULL) AS items
FROM rankings r
-- Se usa LEFT JOIN para que el ranking se devuelva incluso si no tiene ítems todavía.
LEFT JOIN ranking_items ri ON r.id = ri.ranking_id
-- Se agrupa por el ID del ranking para que la base de datos sepa qué filas comprimir juntas.
GROUP BY r.id
ORDER BY r.created_at DESC;