import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function query<T = unknown>(
  text: TemplateStringsArray | string,
  params?: unknown[]
): Promise<T[]> {
  const result = await sql(text as TemplateStringsArray, ...(params ?? []));
  return result as T[];
}