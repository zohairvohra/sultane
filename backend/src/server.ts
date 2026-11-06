import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import fs from 'node:fs'
import path from 'node:path'

import { authRouter } from './routes/auth'
import { collectionsRouter } from './routes/collections'
import { productsRouter } from './routes/products'
import { ordersRouter } from './routes/orders'
import { enquiriesRouter } from './routes/enquiries'
import { articlesRouter } from './routes/articles'
import { promosRouter } from './routes/promos'
import { settingsRouter } from './routes/settings'
import { reportsRouter } from './routes/reports'
import { notFound, errorHandler } from './middleware/errorHandler'

const app = express()

app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? '*' }))
app.use(morgan('dev'))
app.use(express.json())

// Uploaded payment proofs and enquiry reference images. In production,
// swap this for an authenticated route (admin-only for payment proofs)
// or object storage with signed URLs — see README for notes.
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/api/auth', authRouter)
app.use('/api/collections', collectionsRouter)
app.use('/api/products', productsRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/enquiries', enquiriesRouter)
app.use('/api/articles', articlesRouter)
app.use('/api/promos', promosRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/reports', reportsRouter)

// In production / Docker deployment, serve the frontend build if present
const clientDistCandidates = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../frontend/dist'),
]
const clientDist = clientDistCandidates.find((dir) => fs.existsSync(dir))

if (clientDist) {
  app.use(express.static(clientDist))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path === '/health') {
      return next()
    }
    res.sendFile(path.join(clientDist, 'index.html'))
  })
} else {
  app.get('/', (_req, res) => {
    res.json({
      name: 'SULTANÉ API',
      status: 'online',
      storefront: 'http://localhost:5173',
      admin: 'http://localhost:5173/admin/login',
    })
  })
}

app.use(notFound)
app.use(errorHandler)

const port = Number(process.env.PORT ?? 4000)
app.listen(port, () => console.log(`SULTANÉ API listening on http://localhost:${port}`))
