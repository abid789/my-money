import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Populate process.env so serverless functions and dev middleware can access server secrets
  Object.assign(process.env, env);

  return {
    plugins: [
      react(),
      {
        name: 'api-server-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url?.startsWith('/api/')) {
              return next();
            }

            // Set CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

            if (req.method === 'OPTIONS') {
              res.statusCode = 200;
              return res.end();
            }

            // Parse JSON body for POST requests
            let body: any = {};
            if (req.method === 'POST') {
              try {
                const chunks: Buffer[] = [];
                for await (const chunk of req) {
                  chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
                }
                const raw = Buffer.concat(chunks).toString('utf8');
                if (raw) body = JSON.parse(raw);
              } catch {
                body = {};
              }
            }

            const parsedUrl = new URL(req.url, 'http://localhost');
            const pathname = parsedUrl.pathname;

            // Route 1: /api/test-email
            if (pathname === '/api/test-email') {
              const resendApiKey = process.env.RESEND_API_KEY;
              const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
              const defaultTo = process.env.WEEKLY_REPORT_TO || 'abidasset@gmail.com';

              if (req.method === 'GET') {
                res.setHeader('Content-Type', 'application/json');
                return res.end(
                  JSON.stringify({
                    configured: Boolean(resendApiKey && resendApiKey.trim().length > 0),
                    fromEmail,
                    configuredRecipient: defaultTo,
                    provider: 'Resend',
                  })
                );
              }

              if (req.method === 'POST') {
                if (!resendApiKey) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(
                    JSON.stringify({
                      success: false,
                      error: 'RESEND_API_KEY is not configured in .env',
                      resolution: 'Please verify RESEND_API_KEY is in your .env file.',
                    })
                  );
                }

                const recipient = (body.to || parsedUrl.searchParams.get('to') || defaultTo).trim();
                const formattedFrom = fromEmail.includes('<') ? fromEmail : `My Money <${fromEmail}>`;
                const timestamp = new Date().toLocaleString('en-US', {
                  timeZone: 'Asia/Dhaka',
                  dateStyle: 'full',
                  timeStyle: 'medium',
                });

                const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Resend Test Email</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px 12px; color: #1e293b;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 24px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px;">৳ My Money</h1>
      <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">সার্ভার-সাইড টেস্ট ইমেইল কনফার্মেশন (Resend Verified)</p>
    </div>
    <div style="padding: 24px;">
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 4px; font-size: 14px; color: #047857;">🎉 Resend টেস্ট সফল হয়েছে!</h3>
        <p style="margin: 0; font-size: 12px; color: #065f46;">আপনার অ্যাপের সাথে Resend ইমেইল সার্ভিস সফলভাবে সংযুক্ত রয়েছে।</p>
      </div>
      <table style="width: 100%; font-size: 12px;">
        <tr><td style="color: #64748b; padding: 6px 0; width: 120px;">প্রাপক:</td><td style="font-weight: 600;">${recipient}</td></tr>
        <tr><td style="color: #64748b; padding: 6px 0;">প্রেরক:</td><td style="font-weight: 600;">${formattedFrom}</td></tr>
        <tr><td style="color: #64748b; padding: 6px 0;">প্রেরণের সময়:</td><td>${timestamp} (BST)</td></tr>
        <tr><td style="color: #64748b; padding: 6px 0;">সিকিউরিটি:</td><td style="color: #0d9488; font-weight: 600;">🔒 Server-Side Secured (API key is protected)</td></tr>
      </table>
    </div>
  </div>
</body>
</html>`;

                try {
                  const resendRes = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${resendApiKey}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      from: formattedFrom,
                      to: [recipient],
                      subject: '৳ [My Money] টেস্ট ইমেইল কনফার্মেশন — Resend Integration Verified',
                      html: htmlBody,
                    }),
                  });

                  const resendData = await resendRes.json();
                  res.statusCode = resendRes.status;
                  res.setHeader('Content-Type', 'application/json');

                  if (!resendRes.ok) {
                    const errorMsg = resendData?.message || 'Resend API rejected email';
                    const isRestrictedToOwner =
                      resendRes.status === 403 &&
                      typeof errorMsg === 'string' &&
                      errorMsg.toLowerCase().includes('only send testing emails to your own email address');

                    let allowedOwnerEmail = '';
                    if (isRestrictedToOwner) {
                      const match = errorMsg.match(/\(([^)]+)\)/);
                      if (match && match[1]) allowedOwnerEmail = match[1];
                    }

                    return res.end(
                      JSON.stringify({
                        success: false,
                        statusCode: resendRes.status,
                        error: resendData,
                        message: errorMsg,
                        restriction: isRestrictedToOwner ? 'resend_testing_restriction' : undefined,
                        allowedOwnerEmail: allowedOwnerEmail || undefined,
                        reason: isRestrictedToOwner
                          ? `Resend এর টেস্টিং সীমাবদ্ধতা: ${fromEmail} দিয়ে শুধুমাত্র Resend একাউন্টের মূল ইমেইলে (${allowedOwnerEmail || 'Account Email'}) টেস্ট পাঠানো যায়। অন্য ইমেইলে পাঠাতে হলে resend.com/domains এ ডোমেন ভেরিফাই করতে হবে।`
                          : errorMsg,
                        resolution: isRestrictedToOwner
                          ? `সমাধান ১: আপনার .env ফাইলে WEEKLY_REPORT_TO=${allowedOwnerEmail || 'আপনার-রেসেন্ড-ইমেইল'} দিন।\nসমাধান ২: resend.com/domains এ গিয়ে নিজস্ব ডোমেন ভেরিফাই করুন।`
                          : 'Resend API কি পরীক্ষা করুন।',
                        recipient,
                        from: formattedFrom,
                      })
                    );
                  }

                  return res.end(
                    JSON.stringify({
                      success: true,
                      id: resendData?.id,
                      recipient,
                      from: formattedFrom,
                      message: `টেস্ট ইমেইল সফলভাবে পাঠানো হয়েছে! Resend Email ID: ${resendData?.id}`,
                      timestamp: new Date().toISOString(),
                    })
                  );
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(
                    JSON.stringify({
                      success: false,
                      error: err?.message || 'Failed to dispatch email',
                      recipient,
                    })
                  );
                }
              }
            } else if (pathname === '/api/send-weekly-report') {
              const resendApiKey = process.env.RESEND_API_KEY;
              const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
              const defaultTo = process.env.WEEKLY_REPORT_TO || 'abidasset@gmail.com';
              const recipient = (body.to || parsedUrl.searchParams.get('to') || defaultTo).trim();
              const htmlContent = body.html || body.htmlContent;
              const subject = body.subject || `৳ [My Money] আপনার সাপ্তাহিক আর্থিক হিসাব`;

              if (!resendApiKey) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(
                  JSON.stringify({
                    success: false,
                    error: 'RESEND_API_KEY is not configured in .env',
                    recipient,
                  })
                );
              }

              if (!htmlContent) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(
                  JSON.stringify({
                    success: false,
                    error: 'htmlContent is required',
                    recipient,
                  })
                );
              }

              const formattedFrom = fromEmail.includes('<') ? fromEmail : `My Money <${fromEmail}>`;

              try {
                const resendRes = await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    from: formattedFrom,
                    to: [recipient],
                    subject,
                    html: htmlContent,
                  }),
                });

                const data = await resendRes.json();
                res.statusCode = resendRes.status;
                res.setHeader('Content-Type', 'application/json');

                if (!resendRes.ok) {
                  return res.end(
                    JSON.stringify({
                      success: false,
                      error: data,
                      message: data?.message || 'Failed to send weekly report',
                      recipient,
                      from: formattedFrom,
                    })
                  );
                }

                return res.end(
                  JSON.stringify({
                    success: true,
                    message: `সাপ্তাহিক রিপোর্ট সফলভাবে ${recipient}-এ পাঠানো হয়েছে!`,
                    id: data?.id,
                    recipient,
                    from: formattedFrom,
                    timestamp: new Date().toISOString(),
                  })
                );
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(
                  JSON.stringify({
                    success: false,
                    error: err?.message || 'Failed to dispatch email',
                    recipient,
                  })
                );
              }
            } else {
              next();
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: true,
    },
  };
});

