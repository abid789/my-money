import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const defaultTo = process.env.WEEKLY_REPORT_TO || 'abidhossain52003@gmail.com';

  // GET: Return configuration status (without exposing secret keys)
  if (req.method === 'GET') {
    return res.status(200).json({
      configured: Boolean(resendApiKey && resendApiKey.trim().length > 0),
      fromEmail,
      configuredRecipient: defaultTo,
      provider: 'Resend',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Verify API Key presence
  if (!resendApiKey || resendApiKey.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'RESEND_API_KEY is not configured in the server environment (.env).',
      resolution: 'Please ensure RESEND_API_KEY is present in your .env file and restart the dev server.',
    });
  }

  const recipient = (req.body?.to || req.query?.to || defaultTo).trim();
  if (!recipient || !recipient.includes('@')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid recipient email address.',
    });
  }

  const formattedFrom = fromEmail.includes('<') ? fromEmail : `My Money <${fromEmail}>`;
  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Dhaka',
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Resend Test Email - My Money</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 12px; color: #1e293b;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 28px 24px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700;">৳ My Money</h1>
      <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">সার্ভার-সাইড টেস্ট ইমেইল কনফার্মেশন (Resend Verified)</p>
    </div>
    <div style="padding: 24px;">
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 6px; font-size: 15px; color: #047857;">🎉 Resend ইন্টিগ্রেশন সফলভাবে কাজ করছে!</h3>
        <p style="margin: 0; font-size: 13px; color: #065f46; line-height: 1.5;">
          আপনার <strong>My Money</strong> অ্যাপের সাথে Resend ইমেইল সার্ভিস সফলভাবে সংযুক্ত হয়েছে।
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 140px;">প্রাপক (Recipient):</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${recipient}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">প্রেরক (Sender):</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${formattedFrom}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">প্রেরণের সময়:</td>
          <td style="padding: 8px 0; color: #334155;">${timestamp} (BST)</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">সিকিউরিটি স্ট্যাটাস:</td>
          <td style="padding: 8px 0; color: #0d9488; font-weight: 600;">🔒 Server-Side Secured (API key is never exposed to browser)</td>
        </tr>
      </table>

      <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 12px; color: #64748b; line-height: 1.6;">
        <p style="margin: 0;">এখন থেকে আপনার প্রতি সপ্তাহের আর্থিক সারসংক্ষেপ ও সঞ্চয় রিপোর্ট এই ইমেইল এড্রেসে স্বয়ংক্রিয়ভাবে পৌঁছাবে।</p>
      </div>
    </div>
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 12px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
      My Money — Personal Finance Tracker & Smart Money Manager
    </div>
  </div>
</body>
</html>`;

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
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

    const data = await resendResponse.json();

    if (!resendResponse.ok) {
      const errorMsg = data?.message || 'Resend API rejected the email request';
      const isRestrictedToOwner =
        resendResponse.status === 403 &&
        typeof errorMsg === 'string' &&
        errorMsg.toLowerCase().includes('only send testing emails to your own email address');

      let allowedOwnerEmail = '';
      if (isRestrictedToOwner) {
        const match = errorMsg.match(/\(([^)]+)\)/);
        if (match && match[1]) {
          allowedOwnerEmail = match[1];
        }
      }

      return res.status(resendResponse.status).json({
        success: false,
        statusCode: resendResponse.status,
        error: data,
        message: errorMsg,
        restriction: isRestrictedToOwner ? 'resend_testing_restriction' : undefined,
        allowedOwnerEmail: allowedOwnerEmail || undefined,
        reason: isRestrictedToOwner
          ? `Resend এর ফ্রি টেস্ট সেন্ডার (${fromEmail}) ব্যবহারের কারণে শুধুমাত্র Resend একাউন্ট খোলার মূল ইমেইলে (${allowedOwnerEmail || 'Account Email'}) ইমেইল পাঠানো সম্ভব। অন্য ইমেইলে পাঠাতে হলে resend.com/domains এ ডোমেন ভেরিফাই করতে হবে।`
          : errorMsg,
        resolution: isRestrictedToOwner
          ? `সমাধান ১: আপনার .env ফাইলে WEEKLY_REPORT_TO=${allowedOwnerEmail || 'আপনার-রেসেন্ড-একাউন্ট-ইমেইল'} সেট করুন।\nসমাধান ২: resend.com/domains এ গিয়ে নিজস্ব ডোমেন ভেরিফাই করে RESEND_FROM_EMAIL এ সেই ডোমেন সেট করুন।`
          : 'Resend API ড্যাশবোর্ড থেকে API কী ও ক্রেডেনশিয়াল পরীক্ষা করুন।',
        recipient,
        from: formattedFrom,
      });
    }

    return res.status(200).json({
      success: true,
      id: (data as any)?.id,
      recipient,
      from: formattedFrom,
      message: `টেস্ট ইমেইল সফলভাবে প্রেরিত হয়েছে! Resend Email ID: ${(data as any)?.id}`,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to dispatch email through Resend API',
      recipient,
      from: formattedFrom,
    });
  }
}
