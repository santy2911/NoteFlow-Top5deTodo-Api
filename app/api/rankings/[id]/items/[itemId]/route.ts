import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { z } from 'zod';
import { verificarToken } from '@/lib/firebaseAdmin';

const itemSchema = z.object({
  name: z.string().min(1),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const uid = await verificarToken(request);
  if (!uid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { itemId } = await params;
    const body = await request.json();
    const result = itemSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
    }

    const [item] = await sql`
      UPDATE ranking_items 
      SET name = ${result.data.name} 
      WHERE id = ${itemId} 
      RETURNING *
    `;

    if (!item) {
      return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error en PATCH /api/items/[itemId]:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}