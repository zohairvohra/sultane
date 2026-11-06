import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pool } from './pool'

// Drops EVERYTHING in the public schema and re-applies schema.sql.
// Use for development or the first deployment of the v2 schema only —
// this deletes all orders, customers and article records.
async function reset() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_RESET !== 'yes') {
    throw new Error('Refusing to reset a production database. Set ALLOW_RESET=yes if you really mean it.')
  }
  console.log('Dropping public schema ...')
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')
  console.log('Applying schema.sql ...')
  await pool.query(sql)
  console.log('Done. Run `npm run seed` next.')
  await pool.end()
}

reset().catch((err) => {
  console.error(err)
  process.exit(1)
})
