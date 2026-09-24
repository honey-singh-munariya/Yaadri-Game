import jwt from 'jsonwebtoken'
import type { NextFunction, Request, Response } from 'express'
import { config } from './config'
import { HttpError } from './util'

export const COOKIE = 'yaadri_session'

export function issueSession(res: Response, userId: string, demo = false) {
  const maxAge = (demo ? 24 : 24 * 7) * 3600 * 1000
  const token = jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: Math.floor(maxAge / 1000) })
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: config.isProd && process.env.COOKIE_SECURE !== 'false', maxAge, path: '/' })
}
export const clearSession = (res: Response) => res.clearCookie(COOKIE, { path: '/' })

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE]
  if (!token) return next(new HttpError(401, 'not_signed_in', 'Please sign in to continue.'))
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { sub: string }
    req.userId = payload.sub
    next()
  } catch {
    next(new HttpError(401, 'session_expired', 'Your session has ended. Please sign in again.'))
  }
}

/** CSRF defence for cookie auth: browsers cannot attach a custom header cross-site without a CORS preflight (which we never allow). */
export function csrfGuard(req: Request, _res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  if (req.get('x-requested-with') !== 'yaadri') return next(new HttpError(403, 'csrf_blocked', 'Request blocked for your safety.'))
  next()
}
