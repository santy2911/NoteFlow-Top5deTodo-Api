import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  category: z.string().min(1).optional(),
  is_favorite: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [ranking] = await query(`
      SELECT 
        r.*,
        json_agg(ri.* ORDER BY ri.position) as items
      FROM rankings r
      LEFT JOIN ranking_items ri ON r.id = ri.ranking_id
      WHERE r.id = $1
      GROUP BY r.id
    `, [id]);

    if (!ranking) {
      return NextResponse.json({ error: 'Ranking no encontrado' }, { status: 404 });
    }

    return NextResponse.json(ranking);
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
    }

    const { title, category, is_favorite } = result.data;

    const [ranking] = await query(
      `UPDATE rankings 
       SET 
         title = COALESCE($1, title),
         category = COALESCE($2, category),
         is_favorite = COALESCE($3, is_favorite),
         updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [title ?? null, category ?? null, is_favorite ?? null, id]
    );

    if (!ranking) {
      return NextResponse.json({ error: 'Ranking no encontrado' }, { status: 404 });
    }

    return NextResponse.json(ranking);
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await query('DELETE FROM rankings WHERE id = $1', [id]);
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}