import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pool } from './pool'

async function migrate() {
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')
  console.log('Applying schema.sql ...')
  await pool.query(sql)
  console.log('Done.')
  await pool.end()
}

migrate().catch((err) => {
  console.error(err)
  process.exit(1)
})
