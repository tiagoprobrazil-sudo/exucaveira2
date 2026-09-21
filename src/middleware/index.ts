import { defineMiddleware } from 'astro:middleware';
import { createSessionClient } from '../lib/supabase/server';

const PROTECTED_ROUTES = ['/conta'];

export const onRequest = defineMiddleware(async (context, next) => {
  const db = createSessionClient(
    context.cookies,
    context.url.protocol === 'https:',
    context.request.headers.get('cookie') || ''
  );
  context.locals.supabase = db;
  context.locals.user = null;

  if (db) {
    const {
      data: { user },
    } = await db.auth.getUser();
    context.locals.user = user;
  }

  const isProtected = PROTECTED_ROUTES.some((route) => context.url.pathname.startsWith(route));
  if (isProtected && !context.locals.user) {
    return context.redirect(`/entrar?next=${encodeURIComponent(context.url.pathname)}`);
  }

  const response = await next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  return response;
});
