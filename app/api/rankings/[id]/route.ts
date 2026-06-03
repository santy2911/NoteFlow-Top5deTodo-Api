import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { z } from 'zod';
import { verificarToken } from '@/lib/firebaseAdmin';

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  category: z.string().min(1).optional(),
  is_favorite: z.boolean().optional(),
  is_pinned: z.boolean().optional(),
  items: z.array(z.object({
    position: z.number().int().min(1).max(5),
    name: z.string().min(1),
  })).length(5).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const uid = await verificarToken(request);
  if (!uid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { id } = await params;
    const [ranking] = await sql`
      SELECT 
        r.*,
        json_agg(ri.* ORDER BY ri.position) as items
      FROM rankings r
      LEFT JOIN ranking_items ri ON r.id = ri.ranking_id
      WHERE r.id = ${id} AND r.uid = ${uid}
      GROUP BY r.id
    `;

    if (!ranking) {
      return NextResponse.json({ error: 'Ranking no encontrado' }, { status: 404 });
    }

    return NextResponse.json(ranking);
  } catch (error) {
    console.error('Error en GET /api/rankings/[id]:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const uid = await verificarToken(request);
  if (!uid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
    }

    const { title, category, is_favorite, is_pinned, items } = result.data;

    const [ranking] = await sql`
      UPDATE rankings 
      SET 
        title = COALESCE(${title ?? null}, title),
        category = COALESCE(${category ?? null}, category),
        is_favorite = COALESCE(${is_favorite ?? null}, is_favorite),
        is_pinned = COALESCE(${is_pinned ?? null}, is_pinned),
        updated_at = NOW()
      WHERE id = ${id} AND uid = ${uid}
      RETURNING *
    `;

    if (!ranking) {
      return NextResponse.json({ error: 'Ranking no encontrado' }, { status: 404 });
    }

    if (items && items.length > 0) {
      await sql`DELETE FROM ranking_items WHERE ranking_id = ${id}`;
      for (const item of items) {
        await sql`
          INSERT INTO ranking_items (ranking_id, position, name)
          VALUES (${id}, ${item.position}, ${item.name})
        `;
      }
    }

    const [rankingConItems] = await sql`
      SELECT 
        r.*,
        json_agg(ri.* ORDER BY ri.position) as items
      FROM rankings r
      LEFT JOIN ranking_items ri ON r.id = ri.ranking_id
      WHERE r.id = ${id}
      GROUP BY r.id
    `;

    return NextResponse.json(rankingConItems);
  } catch (error) {
    console.error('Error en PATCH /api/rankings/[id]:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const uid = await verificarToken(request);
  if (!uid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { id } = await params;
    await sql`DELETE FROM rankings WHERE id = ${id} AND uid = ${uid}`;
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error en DELETE /api/rankings/[id]:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}