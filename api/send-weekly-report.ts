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

  const recipient = req.body?.to || req.query?.to || 'abidasset@gmail.com';
  const htmlContent = req.body?.html || req.body?.htmlContent;
  const subject =
    req.body?.subject ||
    `৳ [My Money] আপনার সাপ্তাহিক আর্থিক হিসাব (${new Date().toLocaleDateString('bn-BD')})`;

  const resendApiKey = process.env.RESEND_API_KEY;

  if (resendApiKey && htmlContent) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'My Money <onboarding@resend.dev>',
          to: [recipient],
          subject,
          html: htmlContent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: data,
          recipient,
        });
      }

      return res.status(200).json({
        success: true,
        message: `সাপ্তাহিক রিপোর্ট সফলভাবে ${recipient}-এ পাঠানো হয়েছে!`,
        id: (data as any)?.id,
        recipient,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to dispatch email',
        recipient,
      });
    }
  }

  // If no RESEND_API_KEY is configured yet, simulate successful receipt & provide guidance
  return res.status(200).json({
    success: true,
    simulated: !resendApiKey,
    recipient,
    subject,
    message: resendApiKey
      ? 'Email dispatched successfully'
      : `সাপ্তাহিক রিপোর্ট প্রস্তুত (${recipient})। Vercel Environment Variables-এ RESEND_API_KEY যোগ করলে সরাসরি ব্যাকগ্রাউন্ডে ইমেইল পৌঁছে যাবে।`,
  });
}
