import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
// Entire app runs with no database and synthetic local users only.
process.env.VERCEL = '1';
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = '';
process.env.MONGO_URI = '';
process.env.JWT_SECRET = 'isolated-test-signing-key-not-for-deployment';
process.env.ADMIN_NAME = 'Local Admin';
process.env.ADMIN_PHONE = '01000000001';
process.env.ADMIN_PASSWORD = 'local-fixture-only';
const { default: app } = await import('../server/index.js');
delete process.env.VERCEL;
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}/api`;
const call = async (path, token, body) => {
  const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, cache: response.headers.get('cache-control'), body: await response.json() };
};
const register = async (phone) => (await call('/auth/register', null, { name: 'Local Student', studentPhone: phone, guardianPhone: '01000000004', governorate: 'القاهرة', password: 'local-fixture', grade: 'second-secondary', term: '' })).body;
test('student recharge privacy, fresh statuses, amounts, reasons, auth and no-store', async () => {
  try {
    const first = await register('01000000002');
    const second = await register('01000000003');
    const admin = (await call('/login', null, { phone: '01000000001', password: 'local-fixture-only' })).body.token;
    const created = await call('/recharge-requests', first.token, { amount: 100, transactionReference: 'LOCAL-ONLY' });
    assert.equal(created.status, 201);
    const id = created.body.request.id;
    assert.equal((await call('/recharge-requests/my', first.token)).body.requests[0].status, 'Pending');
    assert.deepEqual((await call('/recharge-requests/my', second.token)).body.requests, []);
    assert.equal((await call('/recharge-requests/my', null)).status, 401);
    assert.equal((await call('/recharge-requests/my', admin)).status, 403);
    const approved = await call(`/admin/recharge-requests/${id}/approve`, admin, { amount: 75 });
    assert.equal(approved.status, 200);
    let history = await call('/recharge-requests/my', first.token);
    assert.equal(history.body.balance, 75);
    assert.equal(history.body.requests[0].creditedAmount, 75);
    assert.equal(history.body.requests[0].status, 'Approved');
    assert.match(history.cache, /no-store/);
    assert.equal(history.body.requests[0].senderPhone, undefined);
    const rejected = await call('/recharge-requests', first.token, { amount: 50 });
    await call(`/admin/recharge-requests/${rejected.body.request.id}/reject`, admin, { reason: 'Local test reason' });
    history = await call('/recharge-requests/my', first.token);
    assert.equal(history.body.requests[0].rejectionReason, 'Local test reason');
    assert.equal((await call(`/admin/recharge-requests/${id}/approve`, admin, { amount: 75 })).status, 409);
    const absent = jwt.sign({ id: 999999, role: 'student' }, process.env.JWT_SECRET);
    assert.equal((await call('/recharge-requests/my', absent)).status, 404);
  } finally { server.closeAllConnections(); server.close(); }
});
