import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { z } from 'zod';
import { verificarToken } from '@/lib/firebaseAdmin';

const bloqueSchema = z.object({
  id: z.string(),
  tipo: z.enum(['texto', 'checklist']),
  contenido: z.string().default(''),
  completado: z.boolean().optional(),
  subrayado: z.boolean().optional(),
  esChecklist: z.boolean().optional(),
});

const notaSchema = z.object({
  titulo: z.string().default(''),
  contenido: z.string().default(''),
  tiene_checklist: z.boolean().default(false),
  is_pinned: z.boolean().default(false),
  imagen_uri: z.string().nullable().default(null),
  checklist: z.array(z.object({
    texto: z.string().min(1),
    completado: z.boolean().default(false),
  })).default([]),
  bloques: z.array(bloqueSchema).default([]),
});

export async function GET(request: Request) {
  const uid = await verificarToken(request);
  if (!uid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const notas = await sql`
      SELECT
        n.*,
        COALESCE(json_agg(ci.* ORDER BY ci.id) FILTER (WHERE ci.id IS NOT NULL), '[]') as checklist
      FROM notas n
      LEFT JOIN checklist_items ci ON n.id = ci.nota_id
      WHERE n.uid = ${uid}
      GROUP BY n.id
      ORDER BY n.is_pinned DESC, n.created_at DESC
    `;
    return NextResponse.json(notas);
  } catch (error) {
    console.error('Error en GET /api/notas:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const uid = await verificarToken(request);
  if (!uid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const result = notaSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
    }

    const { titulo, contenido, tiene_checklist, is_pinned, imagen_uri, checklist, bloques } = result.data;
    const bloquesJson = JSON.stringify(bloques);

    const [nota] = await sql`
      INSERT INTO notas (titulo, contenido, tiene_checklist, is_pinned, imagen_uri, bloques, uid)
      VALUES (${titulo}, ${contenido}, ${tiene_checklist}, ${is_pinned}, ${imagen_uri}, ${bloquesJson}::jsonb, ${uid})
      RETURNING *
    `;

    for (const item of checklist) {
      await sql`
        INSERT INTO checklist_items (nota_id, texto, completado)
        VALUES (${nota.id}, ${item.texto}, ${item.completado})
      `;
    }

    return NextResponse.json({ ...nota, checklist: [] }, { status: 201 });
  } catch (error) {
    console.error('Error en POST /api/notas:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}