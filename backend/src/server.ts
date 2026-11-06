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
import { PUBLIC_DIR } from './middleware/upload'

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) {
  console.error('JWT_SECRET must be set to a long random string (24+ characters).')
  process.exit(1)
}

const app = express()
const isProd = process.env.NODE_ENV === 'production'

// Behind Vercel / Hugging Face / nginx the client IP arrives in X-Forwarded-For;
// trusting one hop makes per-IP rate limiting meaningful.
app.set('trust proxy', 1)
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : isProd ? false : true }))
app.use(morgan(isProd ? 'combined' : 'dev'))
app.use(express.json({ limit: '200kb' }))

// Public media only (product images, collection images, hero video).
// Payment receipts and customer reference images live in uploads/private
// and are only served through authenticated admin routes.
app.use('/uploads', express.static(PUBLIC_DIR, { maxAge: '7d', index: false }))

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
app.use('/api', notFound)

// In production / Docker, serve the built storefront.
const clientDist = [path.resolve(__dirname, '../../frontend/dist'), path.resolve(__dirname, '../frontend/dist')].find((d) => fs.existsSync(d))

if (clientDist) {
  app.use(express.static(clientDist, { index: false }))
  app.get(/^(?!\/(api|uploads)\/).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')))
} else {
  app.get('/', (_req, res) => res.json({ name: 'SULTANÉ API', status: 'online' }))
}

app.use(notFound)
app.use(errorHandler)

const port = Number(process.env.PORT ?? 4000)
app.listen(port, () => console.log(`SULTANÉ API listening on http://localhost:${port}`))
