import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
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
    const [ranking] = await sql`
      SELECT 
        r.*,
        json_agg(ri.* ORDER BY ri.position) as items
      FROM rankings r
      LEFT JOIN ranking_items ri ON r.id = ri.ranking_id
      WHERE r.id = ${id}
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
  try {
    const { id } = await params;
    const body = await request.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
    }

    const { title, category, is_favorite } = result.data;

    const [ranking] = await sql`
      UPDATE rankings 
      SET 
        title = COALESCE(${title ?? null}, title),
        category = COALESCE(${category ?? null}, category),
        is_favorite = COALESCE(${is_favorite ?? null}, is_favorite),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (!ranking) {
      return NextResponse.json({ error: 'Ranking no encontrado' }, { status: 404 });
    }

    return NextResponse.json(ranking);
  } catch (error) {
    console.error('Error en PATCH /api/rankings/[id]:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await sql`DELETE FROM rankings WHERE id = ${id}`;
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error en DELETE /api/rankings/[id]:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}