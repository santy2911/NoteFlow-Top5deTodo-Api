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

const notaUpdateSchema = z.object({
  titulo: z.string().min(1).optional(),
  contenido: z.string().optional(),
  tiene_checklist: z.boolean().optional(),
  is_pinned: z.boolean().optional(),
  imagen_uri: z.string().nullable().optional(),
  checklist: z.array(z.object({
    id: z.string().optional(),
    texto: z.string().min(1),
    completado: z.boolean().default(false),
  })).optional(),
  bloques: z.array(bloqueSchema).optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await verificarToken(request);
  if (!uid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  try {
    const [nota] = await sql`
      SELECT
        n.*,
        COALESCE(json_agg(ci.* ORDER BY ci.id) FILTER (WHERE ci.id IS NOT NULL), '[]') as checklist
      FROM notas n
      LEFT JOIN checklist_items ci ON n.id = ci.nota_id
      WHERE n.id = ${id} AND n.uid = ${uid}
      GROUP BY n.id
    `;
    if (!nota) {
      return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 });
    }
    return NextResponse.json(nota);
  } catch (error) {
    console.error('Error en GET /api/notas/[id]:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await verificarToken(request);
  if (!uid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  try {
    const body = await request.json();
    const result = notaUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
    }

    const { titulo, contenido, tiene_checklist, is_pinned, imagen_uri, checklist, bloques } = result.data;
    const bloquesJson = bloques !== undefined ? JSON.stringify(bloques) : undefined;

    const [nota] = await sql`
      UPDATE notas SET
        titulo = COALESCE(${titulo ?? null}, titulo),
        contenido = COALESCE(${contenido ?? null}, contenido),
        tiene_checklist = COALESCE(${tiene_checklist ?? null}, tiene_checklist),
        is_pinned = COALESCE(${is_pinned ?? null}, is_pinned),
        imagen_uri = COALESCE(${imagen_uri ?? null}, imagen_uri),
        bloques = COALESCE(${bloquesJson ?? null}::jsonb, bloques),
        updated_at = NOW()
      WHERE id = ${id} AND uid = ${uid}
      RETURNING *
    `;

    if (!nota) {
      return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 });
    }

    if (checklist !== undefined) {
      await sql`DELETE FROM checklist_items WHERE nota_id = ${id}`;
      for (const item of checklist) {
        await sql`
          INSERT INTO checklist_items (nota_id, texto, completado)
          VALUES (${id}, ${item.texto}, ${item.completado})
        `;
      }
    }

    const [notaActualizada] = await sql`
      SELECT
        n.*,
        COALESCE(json_agg(ci.* ORDER BY ci.id) FILTER (WHERE ci.id IS NOT NULL), '[]') as checklist
      FROM notas n
      LEFT JOIN checklist_items ci ON n.id = ci.nota_id
      WHERE n.id = ${id}
      GROUP BY n.id
    `;

    return NextResponse.json(notaActualizada);
  } catch (error) {
    console.error('Error en PUT /api/notas/[id]:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await verificarToken(request);
  if (!uid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  try {
    const [nota] = await sql`
      DELETE FROM notas WHERE id = ${id} AND uid = ${uid} RETURNING id
    `;
    if (!nota) {
      return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Nota eliminada' });
  } catch (error) {
    console.error('Error en DELETE /api/notas/[id]:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}