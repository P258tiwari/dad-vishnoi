/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { NextRequest } = require('next/server');
const cache = new Map();
let saved = 0;
let lastLead;
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} }; cache.set(file, mod);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const req = (name) => {
    if (name === 'server-only') return {};
    if (name === '@/lib/notion-leads') return { saveLeadToNotion: async (lead) => { saved++; lastLead = lead; return { leadId: lead.leadId, duplicate: false }; } };
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
    if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name) + '.ts');
    return require(name);
  };
  new Function('require', 'module', 'exports', source)(req, mod, mod.exports);
  return mod.exports;
}

(async () => {
  process.env.NODE_ENV = 'production';
  process.env.NEXT_PUBLIC_SITE_URL = 'https://vishnoi.doctorsatdoor.com';
  process.env.BOT_SESSION_SECRET = 'test-only-secret-'.repeat(4);
  process.env.TURNSTILE_SECRET_KEY = 'test-only';
  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  const request = (pathname, body, extra = {}) => new NextRequest(origin + pathname, {
    method: 'POST', headers: { origin, 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.10', ...extra }, body: JSON.stringify(body),
  });
  const security = load('lib/request-security.ts');
  assert.equal(security.isTrustedMutation(request('/api/leads', {})), true);
  assert.equal(security.isTrustedMutation(request('/api/leads', {}, { origin: 'https://evil.example', 'x-forwarded-host': 'evil.example' })), false);
  const missingOrigin = request('/api/leads', {}); missingOrigin.headers.delete('origin');
  assert.equal(security.isTrustedMutation(missingOrigin), false);
  const bot = load('lib/bot-protection.ts');
  assert.equal(bot.hasBotSession(request('/api/leads', {})), false);
  const token = bot.createBotSession(request('/api/leads', {}));
  const cookie = { cookie: `${bot.BOT_COOKIE}=${token}` };
  assert.equal(bot.hasBotSession(request('/api/leads', {}, cookie)), true);
  assert.equal(bot.hasBotSession(request('/api/leads', {}, { cookie: `${bot.BOT_COOKIE}=${token}x` })), false);
  assert.equal(bot.hasBotSession(request('/api/leads', {}, { ...cookie, 'x-forwarded-for': '192.0.2.11' })), false);
  const realNow = Date.now;
  Date.now = () => realNow() + 16 * 60_000;
  assert.equal(bot.hasBotSession(request('/api/leads', {}, cookie)), false);
  Date.now = realNow;
  const realFetch = global.fetch;
  global.fetch = async () => Response.json({ success: true, hostname: 'evil.example', action: 'ping' });
  assert.equal(await bot.verifyBotToken('fake', request('/api/bot-check', {})), false);
  global.fetch = async () => Response.json({ success: true, hostname: new URL(origin).hostname, action: 'other' });
  assert.equal(await bot.verifyBotToken('fake', request('/api/bot-check', {})), false);
  global.fetch = async () => Response.json({ success: true, hostname: new URL(origin).hostname, action: 'ping' });
  assert.equal(await bot.verifyBotToken('fake', request('/api/bot-check', {})), true);
  global.fetch = async () => { throw new Error('upstream unavailable'); };
  assert.equal(await bot.verifyBotToken('fake', request('/api/bot-check', {})), false);
  global.fetch = realFetch;
  const { boundedRequest } = load('lib/bounded-request.ts');
  await assert.rejects(() => boundedRequest(request('/api/leads', { text: 'x'.repeat(500) }), 100));
  const { isSupportedUpload } = load('lib/upload-validation.ts');
  assert.equal(await isSupportedUpload(new File(['<script>bad</script>'], 'fake.png', { type: 'image/png' })), false);
  assert.equal(await isSupportedUpload(new File(['<svg/>'], 'image.svg', { type: 'image/svg+xml' })), false);
  assert.equal(await isSupportedUpload(new File([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])], 'test.png', { type: 'image/png' })), true);
  const leads = load('app/api/leads/route.ts');
  const input = { fullName: 'Security Test', phone: '9000000001', whatsapp: '9000000001', address: 'Test address only', city: 'Kanpur', state: 'Uttar Pradesh', country: 'IN', pincode: '208012', concern: 'Test only', consent: true, website: '', startedAt: Date.now() - 10_000 };
  // Razorpay: the fee is fixed on the server, and only a signed, captured ₹1,500 payment is ever saved.
  process.env.RAZORPAY_KEY_ID = 'rzp_test_onlyforthis';
  process.env.RAZORPAY_KEY_SECRET = 'test-only-razorpay-secret';
  const { createHmac } = require('node:crypto');
  const paid = (paymentId, signature) => ({ orderId: 'order_TEST000001', paymentId,
    signature: signature || createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`order_TEST000001|${paymentId}`).digest('hex') });
  const razorpayPayment = (overrides = {}) => async (url) => Response.json({ id: String(url).split('/').pop(), order_id: 'order_TEST000001', amount: 150000, currency: 'INR', status: 'captured', ...overrides });
  const orders = load('app/api/payments/order/route.ts');
  assert.equal((await orders.POST(request('/api/payments/order', { fullName: 'Security Test', phone: '9000000001' }))).status, 403);
  let orderBody;
  global.fetch = async (url, init) => { orderBody = JSON.parse(init.body); return Response.json({ id: 'order_TEST000001', amount: 150000, currency: 'INR' }); };
  const orderResponse = await orders.POST(request('/api/payments/order', { fullName: 'Security Test', phone: '9000000001', amount: 1 }, cookie));
  assert.equal(orderResponse.status, 200);
  assert.equal(orderBody.amount, 150000);
  assert.equal((await orderResponse.json()).keyId, 'rzp_test_onlyforthis');
  assert.equal((await leads.POST(request('/api/leads', { ...input, payment: paid('pay_TEST000001') }))).status, 403);
  assert.equal((await leads.POST(request('/api/leads', input, cookie))).status, 402);
  global.fetch = async () => { throw new Error('A forged signature must not reach Razorpay'); };
  assert.equal((await leads.POST(request('/api/leads', { ...input, payment: paid('pay_TEST000002', 'a'.repeat(64)) }, cookie))).status, 402);
  global.fetch = razorpayPayment({ amount: 100 });
  assert.equal((await leads.POST(request('/api/leads', { ...input, payment: paid('pay_TEST000003') }, cookie))).status, 402);
  global.fetch = razorpayPayment({ status: 'failed' });
  assert.equal((await leads.POST(request('/api/leads', { ...input, payment: paid('pay_TEST000004') }, cookie))).status, 402);
  assert.equal(saved, 0);
  globalThis.dentalRateLimits.clear();
  assert.equal((await leads.POST(request('/api/leads', { ...input, country: 'US', payment: paid('pay_TEST000005') }, cookie))).status, 400);
  global.fetch = razorpayPayment();
  assert.equal((await leads.POST(request('/api/leads', { ...input, website: 'autofill.example', payment: paid('pay_TEST000006') }, cookie))).status, 201);
  assert.equal(saved, 1);
  assert.deepEqual(lastLead.payment, { paymentId: 'pay_TEST000006', orderId: 'order_TEST000001', amountPaise: 150000 });
  assert.equal((await leads.POST(request('/api/leads', { ...input, payment: paid('pay_TEST000006') }, cookie))).status, 409);
  assert.equal(saved, 1);
  global.fetch = realFetch;
  for (const name of ['location', 'summary', 'transcribe']) {
    assert.equal((await load(`app/api/${name}/route.ts`).POST(request(`/api/${name}`, {}))).status, 403);
  }
  const { checkRateLimit } = load('lib/rate-limit.ts');
  assert.equal(checkRateLimit('test-limit', 1), true);
  assert.equal(checkRateLimit('test-limit', 1), false);
  console.log('PASS: Razorpay signature/amount/status checks, one Ping per payment, server-fixed fee, origins, forged/expired/IP-bound sessions, hostname/action checks, upstream failure, body limits, file signatures, bot blocking, India validation, duplicate suppression and rate limits. No live records or external API calls.');
})().catch(error => { console.error(error); process.exitCode = 1; });
