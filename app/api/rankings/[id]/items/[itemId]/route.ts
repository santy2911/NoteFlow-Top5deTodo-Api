import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

const itemSchema = z.object({
  name: z.string().min(1),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const body = await request.json();
    const result = itemSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
    }

    const [item] = await query(
      'UPDATE ranking_items SET name = $1 WHERE id = $2 RETURNING *',
      [result.data.name, itemId]
    );

    if (!item) {
      return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}