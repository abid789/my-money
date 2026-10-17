import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// In-memory deduplication cache for production serverless invocations
const sentReportsCache = new Map<string, number>();

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
    return res.status(200).end();
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const defaultTo = process.env.WEEKLY_REPORT_TO || 'abidasset@gmail.com';
  const recipient = (req.body?.to || req.query?.to || defaultTo).trim();

  if (!resendApiKey || resendApiKey.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'RESEND_API_KEY is not configured in the server environment (.env or Vercel Environment Variables).',
      recipient,
      resolution: 'Please configure RESEND_API_KEY in your hosting environment variables.',
    });
  }

  // Calculate previous Monday-to-Sunday period in Asia/Dhaka time (UTC+6)
  const nowDhaka = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  const day = nowDhaka.getDay(); // 0 = Sunday, 1 = Monday, ...
  const daysToSunday = day === 0 ? 7 : day;
  const lastSunday = new Date(nowDhaka);
  lastSunday.setDate(nowDhaka.getDate() - daysToSunday);
  const lastMonday = new Date(lastSunday);
  lastMonday.setDate(lastSunday.getDate() - 6);

  const pad = (n: number) => String(n).padStart(2, '0');
  const startDateStr = `${lastMonday.getFullYear()}-${pad(lastMonday.getMonth() + 1)}-${pad(lastMonday.getDate())}`;
  const endDateStr = `${lastSunday.getFullYear()}-${pad(lastSunday.getMonth() + 1)}-${pad(lastSunday.getDate())}`;

  // Prior week for comparison
  const priorSunday = new Date(lastMonday);
  priorSunday.setDate(lastMonday.getDate() - 1);
  const priorMonday = new Date(priorSunday);
  priorMonday.setDate(priorSunday.getDate() - 6);
  const priorStartStr = `${priorMonday.getFullYear()}-${pad(priorMonday.getMonth() + 1)}-${pad(priorMonday.getDate())}`;
  const priorEndStr = `${priorSunday.getFullYear()}-${pad(priorSunday.getMonth() + 1)}-${pad(priorSunday.getDate())}`;

  // Deduplication check: Prevent duplicate automated reports for the same period within 24 hours
  const dedupKey = `${recipient}_${startDateStr}_${endDateStr}`;
  const isForce = req.query?.force === 'true' || req.body?.force === true;
  const lastSent = sentReportsCache.get(dedupKey);
  const nowMs = Date.now();

  if (!isForce && lastSent && nowMs - lastSent < 24 * 60 * 60 * 1000) {
    return res.status(200).json({
      success: true,
      duplicatePrevented: true,
      message: `রিপোর্টটি ইতিমধ্যেই (${new Date(lastSent).toLocaleTimeString()}) পাঠানো হয়েছে। ডুপ্লিকেট রোধ করা হয়েছে।`,
      recipient,
      period: { start: startDateStr, end: endDateStr },
    });
  }

  let htmlContent = req.body?.html || req.body?.htmlContent;
  let subject =
    req.body?.subject ||
    `৳ [My Money] সাপ্তাহিক আর্থিক হিসাব (${startDateStr} থেকে ${endDateStr})`;

  // If no HTML was provided in request body (e.g. autonomous cron execution via GET),
  // fetch live data from Supabase and generate the report!
  if (!htmlContent) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      '';

    let transactions: any[] = [];
    let categories: any[] = [];
    let accounts: any[] = [];

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const [tRes, cRes, aRes] = await Promise.all([
          supabase.from('transactions').select('*, category:categories(*)'),
          supabase.from('categories').select('*'),
          supabase.from('accounts').select('*'),
        ]);

        if (tRes.data) transactions = tRes.data;
        if (cRes.data) categories = cRes.data;
        if (aRes.data) accounts = aRes.data;
      } catch (dbErr) {
        console.warn('Could not fetch Supabase data for weekly digest:', dbErr);
      }
    }

    // Filter current week
    const currentTxns = transactions.filter((t) => {
      const d = (t.date || '').split('T')[0];
      return d >= startDateStr && d <= endDateStr;
    });

    const incomeTxns = currentTxns.filter((t) => t.type === 'income' || t.type === 'refund');
    const expenseTxns = currentTxns.filter((t) => t.type === 'expense');

    const totalIncome = incomeTxns.reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalExpenses = expenseTxns.reduce((s, t) => s + Number(t.amount || 0), 0);
    const netCashFlow = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    // Filter prior week for comparison
    const priorTxns = transactions.filter((t) => {
      const d = (t.date || '').split('T')[0];
      return d >= priorStartStr && d <= priorEndStr;
    });
    const priorIncome = priorTxns
      .filter((t) => t.type === 'income' || t.type === 'refund')
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const priorExpenses = priorTxns
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const incomeChange = totalIncome - priorIncome;
    const expenseChange = totalExpenses - priorExpenses;

    // Category breakdown
    const catMap: Record<string, number> = {};
    for (const exp of expenseTxns) {
      const catName = exp.category?.name || 'General';
      catMap[catName] = (catMap[catName] || 0) + Number(exp.amount || 0);
    }
    const catRows = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => {
        const pct = totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : '0.0';
        return `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155;">${name}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 600; text-align: right; color: #0f172a;">৳${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: right; color: #64748b;">${pct}%</td>
          </tr>`;
      })
      .join('');

    // Top 5 major expenses
    const topTxns = [...expenseTxns]
      .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
      .slice(0, 5)
      .map((t) => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #1e293b; font-weight: 500;">${t.description || 'ব্যায়'}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #64748b;">${t.category?.name || 'General'}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8;">${t.date?.split('T')[0] || ''}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 600; text-align: right; color: #e11d48;">-৳${Number(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>`)
      .join('');

    // Accounts
    const accRows = accounts
      .map(
        (a) => `
        <div style="display: inline-block; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 14px; margin: 4px; font-size: 12px;">
          <span style="color: #64748b;">${a.name}:</span>
          <strong style="color: #0f172a; margin-left: 4px;">৳${Number(a.current_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
        </div>`
      )
      .join('');

    const fmt = (num: number) => `৳${Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>সাপ্তাহিক আর্থিক রিপোর্ট - My Money</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 12px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 28px 24px; color: #ffffff;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 700;">৳ My Money</h1>
        <span style="background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;">সাপ্তাহিক ডাইজেস্ট</span>
      </div>
      <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.9;">আপনার সম্পূর্ণ সোমবার-রবিবার সপ্তাহের আর্থিক হিসাব</p>
      <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.8;">সময়সীমা: ${startDateStr} থেকে ${endDateStr}</p>
    </div>

    <!-- Summary Cards -->
    <div style="padding: 24px 20px 12px;">
      <table style="width: 100%; border-collapse: separate; border-spacing: 8px;">
        <tr>
          <td style="width: 33%; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px 10px; text-align: center;">
            <div style="font-size: 11px; color: #059669; font-weight: 600; text-transform: uppercase;">মোট আয়</div>
            <div style="font-size: 17px; font-weight: 700; color: #047857; margin-top: 4px;">+${fmt(totalIncome)}</div>
            <div style="font-size: 10px; color: ${incomeChange >= 0 ? '#059669' : '#e11d48'}; margin-top: 3px;">${incomeChange >= 0 ? '▲ +' : '▼ -'}${fmt(incomeChange)} vs পূর্বের সপ্তাহ</div>
          </td>
          <td style="width: 33%; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 14px 10px; text-align: center;">
            <div style="font-size: 11px; color: #e11d48; font-weight: 600; text-transform: uppercase;">মোট ব্যয়</div>
            <div style="font-size: 17px; font-weight: 700; color: #be123c; margin-top: 4px;">-${fmt(totalExpenses)}</div>
            <div style="font-size: 10px; color: ${expenseChange <= 0 ? '#059669' : '#e11d48'}; margin-top: 3px;">${expenseChange <= 0 ? '▼ -' : '▲ +'}${fmt(expenseChange)} vs পূর্বের সপ্তাহ</div>
          </td>
          <td style="width: 33%; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px; padding: 14px 10px; text-align: center;">
            <div style="font-size: 11px; color: #0d9488; font-weight: 600; text-transform: uppercase;">নীট ক্যাশফ্লো</div>
            <div style="font-size: 17px; font-weight: 700; color: #0f766e; margin-top: 4px;">${fmt(netCashFlow)}</div>
            <div style="font-size: 10px; color: #0d9488; margin-top: 3px;">সঞ্চয় হার: ${savingsRate.toFixed(1)}%</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Category Breakdown Table -->
    <div style="padding: 12px 20px;">
      <h3 style="margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #0f172a;">📊 খাতভিত্তিক খরচের বিবরণী</h3>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #f1f5f9; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="padding: 10px 12px; text-align: left; font-size: 11px; color: #64748b;">খাত</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 11px; color: #64748b;">পরিমাণ</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 11px; color: #64748b;">শতাংশ</th>
          </tr>
        </thead>
        <tbody>
          ${catRows || '<tr><td colspan="3" style="padding: 14px; text-align: center; color: #94a3b8; font-size: 12px;">চলতি সপ্তাহে কোনো ব্যয়ের রেকর্ড নেই</td></tr>'}
        </tbody>
      </table>
    </div>

    <!-- Top 5 Major Transactions -->
    <div style="padding: 12px 20px;">
      <h3 style="margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #0f172a;">🔝 প্রধান ব্যয়সমূহ (Major Transactions)</h3>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #f1f5f9; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="padding: 10px 12px; text-align: left; font-size: 11px; color: #64748b;">বিবরণ</th>
            <th style="padding: 10px 12px; text-align: left; font-size: 11px; color: #64748b;">খাত</th>
            <th style="padding: 10px 12px; text-align: left; font-size: 11px; color: #64748b;">তারিখ</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 11px; color: #64748b;">পরিমাণ</th>
          </tr>
        </thead>
        <tbody>
          ${topTxns || '<tr><td colspan="4" style="padding: 14px; text-align: center; color: #94a3b8; font-size: 12px;">কোনো বড় লেনদেন নেই</td></tr>'}
        </tbody>
      </table>
    </div>

    <!-- Accounts -->
    <div style="padding: 12px 20px 20px;">
      <h3 style="margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #0f172a;">💳 বর্তমান অ্যাকাউন্ট ও ওয়ালেট ব্যালেন্স</h3>
      <div>
        ${accRows || '<div style="font-size: 12px; color: #94a3b8;">কোনো অ্যাকাউন্ট পাওয়া যায়নি</div>'}
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 20px; text-align: center; font-size: 12px; color: #64748b;">
      <p style="margin: 0;">এই রিপোর্টটি প্রতি সোমবার সকাল ৯:০০ টায় স্বয়ংক্রিয়ভাবে <strong>${recipient}</strong>-এ পাঠানো হয়।</p>
      <p style="margin: 6px 0 0; font-size: 11px; color: #94a3b8;">My Money — Personal Finance Tracker & Smart Money Manager</p>
    </div>

  </div>
</body>
</html>`;
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

    // Mark as sent for deduplication
    sentReportsCache.set(dedupKey, Date.now());

    return res.status(200).json({
      success: true,
      accepted: true,
      id: (data as any)?.id,
      recipient,
      from: formattedFrom,
      period: { start: startDateStr, end: endDateStr },
      message: `সাপ্তাহিক রিপোর্ট সফলভাবে Resend API দ্বারা গৃহীত হয়েছে! Email ID: ${(data as any)?.id}`,
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
