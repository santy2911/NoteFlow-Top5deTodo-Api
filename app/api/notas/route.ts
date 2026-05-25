import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { z } from 'zod';

const notaSchema = z.object({
  titulo: z.string().min(1),
  contenido: z.string().default(''),
  tiene_checklist: z.boolean().default(false),
  imagen_uri: z.string().nullable().default(null),
  checklist: z.array(z.object({
    texto: z.string().min(1),
    completado: z.boolean().default(false),
  })).default([]),
});

export async function GET() {
  try {
    const notas = await sql`
      SELECT
        n.*,
        COALESCE(json_agg(ci.* ORDER BY ci.id) FILTER (WHERE ci.id IS NOT NULL), '[]') as checklist
      FROM notas n
      LEFT JOIN checklist_items ci ON n.id = ci.nota_id
      GROUP BY n.id
      ORDER BY n.created_at DESC
    `;
    return NextResponse.json(notas);
  } catch (error) {
    console.error('Error en GET /api/notas:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = notaSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
    }

    const { titulo, contenido, tiene_checklist, imagen_uri, checklist } = result.data;

    const [nota] = await sql`
      INSERT INTO notas (titulo, contenido, tiene_checklist, imagen_uri)
      VALUES (${titulo}, ${contenido}, ${tiene_checklist}, ${imagen_uri})
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