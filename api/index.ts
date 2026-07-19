import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { default: app } = await import('../server');
    return (app as any)(req, res);
  } catch (err: any) {
    // Surface module-load / runtime errors instead of an opaque 500 so we can
    // diagnose the deployment. Safe to keep, or remove once things are stable.
    console.error('API handler failed:', err);
    res.status(500).json({
      error: err?.message ?? String(err),
      stack: err?.stack,
    });
  }
}
