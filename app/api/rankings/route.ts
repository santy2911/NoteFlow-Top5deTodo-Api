import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { z } from 'zod';

const rankingSchema = z.object({
  title: z.string().min(3),
  category: z.string().min(1),
  is_favorite: z.boolean().optional().default(false),
  items: z.array(z.object({
    position: z.number().int().min(1).max(5),
    name: z.string().min(1),
  })).length(5),
});

export async function GET() {
  try {
    const rankings = await sql`
      SELECT 
        r.*,
        json_agg(ri.* ORDER BY ri.position) as items
      FROM rankings r
      LEFT JOIN ranking_items ri ON r.id = ri.ranking_id
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `;
    return NextResponse.json(rankings);
  } catch (error) {
    console.error('Error en GET /api/rankings:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = rankingSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
    }

    const { title, category, is_favorite, items } = result.data;

    const [ranking] = await sql`
      INSERT INTO rankings (title, category, is_favorite) 
      VALUES (${title}, ${category}, ${is_favorite}) 
      RETURNING *
    `;

    for (const item of items) {
      await sql`
        INSERT INTO ranking_items (ranking_id, position, name) 
        VALUES (${ranking.id}, ${item.position}, ${item.name})
      `;
    }

    return NextResponse.json(ranking, { status: 201 });
  } catch (error) {
    console.error('Error en POST /api/rankings:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}