import { pool } from './pool'

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const { rows } = await pool.query(`SELECT value FROM settings WHERE key = $1`, [key])
  if (!rows[0]) return fallback
  return rows[0].value as T
}
