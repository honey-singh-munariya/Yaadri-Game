import crypto from 'node:crypto'
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { ZodError, type ZodTypeAny, type z } from 'zod'

export const uid = () => crypto.randomUUID()

export class HttpError extends Error {
  constructor(public status: number, public code: string, message?: string) {
    super(message ?? code)
  }
}

export const wrap =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next)
  }

export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const r = schema.safeParse(data)
  if (!r.success) throw r.error
  return r.data
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'invalid_input', message: 'Some fields need attention.', fields: err.flatten().fieldErrors })
  }
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.code, message: err.message })
  const anyErr = err as { type?: string; status?: number }
  if (anyErr?.type === 'entity.too.large') return res.status(413).json({ error: 'too_large', message: 'That upload is too large.' })
  if (anyErr?.type === 'entity.parse.failed') return res.status(400).json({ error: 'bad_json', message: 'Request body was not valid JSON.' })
  console.error('[server error]', err)
  res.status(500).json({ error: 'server_error', message: 'Something went wrong on our side. Please try again.' })
}
