-- GET rankings del usuario
SELECT
  r.*,
  json_agg(
    json_build_object(
      'id',       ri.id,
      'position', ri.position,
      'name',     ri.name
    )
    ORDER BY ri.position
  ) FILTER (WHERE ri.id IS NOT NULL) AS items
FROM rankings r
LEFT JOIN ranking_items ri ON r.id = ri.ranking_id
WHERE r.uid = $1   -- ← filtro por usuario
GROUP BY r.id
ORDER BY r.created_at DESC;