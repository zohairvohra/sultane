import type { PoolClient } from 'pg'
import { pool } from './pool'

type Queryable = Pick<PoolClient, 'query'>

export async function getSetting<T>(key: string, fallback: T, db: Queryable = pool): Promise<T> {
  const { rows } = await db.query(`SELECT value FROM settings WHERE key = $1`, [key])
  if (!rows[0]) return fallback
  return rows[0].value as T
}

export async function getSettings(keys: string[], db: Queryable = pool): Promise<Record<string, unknown>> {
  const { rows } = await db.query(`SELECT key, value FROM settings WHERE key = ANY($1)`, [keys])
  return Object.fromEntries(rows.map((r: { key: string; value: unknown }) => [r.key, r.value]))
}
