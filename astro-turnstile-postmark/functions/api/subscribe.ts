export interface Env {
  TURNSTILE_SECRET: string;         // Cloudflare Turnstile secret key
  POSTMARK_SERVER_TOKEN: string;    // Postmark Server API token
  SUBMISSION_KV?: KVNamespace;      // Optional KV binding for rate limit/idempotency
}

async function verifyTurnstile(secret: string, responseToken: string, ip: string | null) {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: responseToken, remoteip: ip ?? '' })
  });
  return res.json();
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const form = await request.formData();
    const email = String(form.get('email') || '').trim().toLowerCase();
    const phone = String(form.get('phone') || '').trim();
    const honeypot = String(form.get('company') || '');
    const cfToken = String(form.get('cf-turnstile-response') || '');

    if (!email || honeypot) return new Response('Bad Request', { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return new Response('Invalid email', { status: 400 });

    const ip = request.headers.get('cf-connecting-ip');
    const verify = await verifyTurnstile(env.TURNSTILE_SECRET, cfToken, ip);
    if (!verify?.success) return new Response('Failed challenge', { status: 403 });

    if (env.SUBMISSION_KV) {
      const key = `submitted:${email}`;
      const exists = await env.SUBMISSION_KV.get(key);
      if (exists) return new Response('Already submitted', { status: 200 });
      await env.SUBMISSION_KV.put(key, '1', { expirationTtl: 3600 });
    }

    // Simple email confirmation token (consider HMAC for production)
    const token = btoa(JSON.stringify({ e: email, t: Date.now() }));
    const origin = new URL(request.url).origin;
    const confirmUrl = `${origin}/thank-you?e=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

    // Send with Postmark
    const payload = {
      From: 'No Reply <noreply@yourdomain.com>',
      To: email,
      Subject: 'Confirm your subscription',
      HtmlBody: `<p>Thanks for signing up!</p><p>Confirm here: <a href="${confirmUrl}">${confirmUrl}</a></p>`,
      TextBody: `Thanks for signing up!\nConfirm here: ${confirmUrl}`,
      MessageStream: 'outbound',
      Metadata: { phone }
    };

    const pm = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': env.POSTMARK_SERVER_TOKEN
      },
      body: JSON.stringify(payload)
    });

    if (!pm.ok) {
      const text = await pm.text();
      return new Response(`Email send failed: ${text}`, { status: 502 });
    }

    return new Response('OK', { status: 200 });
  } catch (err: any) {
    return new Response(`Server error: ${err?.message ?? 'unknown'}`, { status: 500 });
  }
};
