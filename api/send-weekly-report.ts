import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const defaultTo = process.env.WEEKLY_REPORT_TO || 'abidhossain52003@gmail.com';
  const recipient = (req.body?.to || req.query?.to || defaultTo).trim();
  const htmlContent = req.body?.html || req.body?.htmlContent;
  const subject =
    req.body?.subject ||
    `৳ [My Money] আপনার সাপ্তাহিক আর্থিক হিসাব (${new Date().toLocaleDateString('bn-BD')})`;

  if (!resendApiKey) {
    return res.status(400).json({
      success: false,
      error: 'RESEND_API_KEY is not configured in the server environment (.env).',
      recipient,
    });
  }

  if (!htmlContent) {
    return res.status(400).json({
      success: false,
      error: 'Email html content is required.',
      recipient,
    });
  }

  const formattedFrom = fromEmail.includes('<') ? fromEmail : `My Money <${fromEmail}>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
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

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.message || 'Resend rejected email dispatch';
      const isRestrictedToOwner =
        response.status === 403 &&
        typeof errorMsg === 'string' &&
        errorMsg.toLowerCase().includes('only send testing emails to your own email address');

      return res.status(response.status).json({
        success: false,
        error: data,
        message: errorMsg,
        restriction: isRestrictedToOwner ? 'resend_testing_restriction' : undefined,
        reason: isRestrictedToOwner
          ? `Resend এর টেস্টিং সীমাবদ্ধতা: ${fromEmail} দিয়ে শুধুমাত্র Resend একাউন্টের মূল ইমেইলে রিপোর্ট পাঠানো যায়।`
          : errorMsg,
        recipient,
        from: formattedFrom,
      });
    }

    return res.status(200).json({
      success: true,
      message: `সাপ্তাহিক রিপোর্ট সফলভাবে ${recipient}-এ পাঠানো হয়েছে!`,
      id: (data as any)?.id,
      recipient,
      from: formattedFrom,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to dispatch email',
      recipient,
    });
  }
}
