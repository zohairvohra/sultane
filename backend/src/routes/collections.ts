import { Router } from 'express'
import { pool } from '../db/pool'

export const collectionsRouter = Router()

collectionsRouter.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM collections ORDER BY name`)
    res.json(rows)
  } catch (err) {
    next(err)
  }
})
