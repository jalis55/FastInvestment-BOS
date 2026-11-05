import test from 'node:test';
import assert from 'node:assert/strict';
import { AxiosError } from 'axios';
import { createApiClient } from '../src/api/client.js';
import { createQueryCache } from '../src/api/query-cache.js';
import { getApiError } from '../src/api/errors.js';

const deferred = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};
const ok = (config, data = {}) => ({ config, data, status: 200, statusText: 'OK', headers: {} });
const unauthorized = (config) => new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, { status: 401, data: {} });
const tick = () => new Promise((resolve) => setImmediate(resolve));

test('concurrent 401 responses share one refresh and retry each request only once', async () => {
  const client = createApiClient();
  const gate = deferred();
  let refreshes = 0;
  const attempts = {};
  client.defaults.adapter = async (config) => {
    if (config.url.includes('/token/refresh/')) { refreshes++; await gate.promise; return ok(config); }
    attempts[config.url] = (attempts[config.url] || 0) + 1;
    if (!config._retry) throw unauthorized(config);
    return ok(config);
  };
  const requests = ['/one', '/two', '/three'].map((url) => client.get(url));
  await tick();
  assert.equal(refreshes, 1);
  gate.resolve();
  await Promise.all(requests);
  assert.deepEqual(Object.values(attempts), [2, 2, 2]);
});

test('failed refresh rejects all waiting requests and expires authentication once', async () => {
  let expired = 0;
  let refreshes = 0;
  const gate = deferred();
  const client = createApiClient({ onExpired: () => expired++ });
  client.defaults.adapter = async (config) => {
    if (config.url.includes('/token/refresh/')) { refreshes++; await gate.promise; }
    throw unauthorized(config);
  };
  const requests = Promise.allSettled([client.get('/one'), client.get('/two')]);
  await tick();gate.resolve();
  const results = await requests;
  assert.equal(refreshes, 1);
  assert.equal(expired, 1);
  assert.ok(results.every((result) => result.status === 'rejected'));
});

test('a retried 401 stops rather than refreshing indefinitely', async () => {
  const client = createApiClient();
  let refreshes = 0;
  client.defaults.adapter = async (config) => {
    if (config.url.includes('/token/refresh/')) { refreshes++; return ok(config); }
    throw unauthorized(config);
  };
  await assert.rejects(client.get('/one'));
  assert.equal(refreshes, 1);
});

test('mutations send CSRF and invalidate reads; network failures are not replayed', async () => {
  let invalidations = 0;
  const client = createApiClient({ getCsrfToken: () => 'csrf-value', onMutation: () => invalidations++ });
  client.defaults.adapter = async (config) => {
    assert.equal(config.headers.get('X-CSRFToken'), 'csrf-value');
    return ok(config);
  };
  await client.post('/api/acc/user/fund-transfer/', {});
  assert.equal(invalidations, 1);
  let attempts = 0;
  client.defaults.adapter = async (config) => { attempts++; throw new AxiosError('Network Error', 'ERR_NETWORK', config); };
  await assert.rejects(client.post('/api/acc/user/fund-transfer/', {}));
  assert.equal(attempts, 1);
});

test('query cache deduplicates concurrent reads and serves fresh data', async () => {
  const cache = createQueryCache();
  const gate = deferred();let requests = 0;
  const loader = async () => { requests++; await gate.promise; return ['record']; };
  const one = cache.load('/records', loader);
  const two = cache.load('/records', loader);
  assert.equal(one, two);
  gate.resolve();await one;
  await cache.load('/records', loader);
  assert.equal(requests, 1);
  assert.deepEqual(cache.snapshot('/records').data, ['record']);
});

test('invalidating an in-flight read prevents stale data from winning', async () => {
  const cache = createQueryCache();
  const old = deferred();let count = 0;
  const unsubscribe = cache.subscribe('/balance', () => {});
  const loader = async () => ++count === 1 ? old.promise : 'new balance';
  const first = cache.load('/balance', loader);
  await tick();cache.invalidate();await tick();
  old.resolve('old balance');await first;
  assert.equal(cache.snapshot('/balance').data, 'new balance');
  unsubscribe();
});

test('unused queries abort; immediate StrictMode resubscriptions share requests', async () => {
  const cache = createQueryCache();const gate = deferred();let signal;
  let unsubscribe = cache.subscribe('/records', () => {});
  const request = cache.load('/records', async (requestSignal) => { signal = requestSignal; return gate.promise; });
  await tick();unsubscribe();
  unsubscribe = cache.subscribe('/records', () => {});
  await tick();assert.equal(signal.aborted, false);
  unsubscribe();await tick();assert.equal(signal.aborted, true);
  gate.resolve([]);await request;
});

test('session cache clearing cannot be overwritten by old responses', async () => {
  const cache = createQueryCache();const gate = deferred();
  const request = cache.load('/private', async () => gate.promise);
  await tick();cache.clear();gate.resolve('private data');await request;
  assert.equal(cache.snapshot('/private').data, undefined);
});

test('query failures are exposed and can be retried', async () => {
  const cache = createQueryCache();const error = new Error('offline');
  await cache.load('/records', async () => { throw error; });
  assert.equal(cache.snapshot('/records').error, error);
  assert.equal(cache.snapshot('/records').loading, false);
  await cache.load('/records', async () => ['recovered'], { force: true });
  assert.equal(cache.snapshot('/records').error, null);
});

test('validation errors preserve field context and server internals stay hidden', () => {
  assert.equal(getApiError({ response: { status: 400, data: { amount: ['Must be positive.'] } } }), 'amount: Must be positive.');
  assert.ok(!getApiError({ response: { status: 500, data: { error: 'private SQL details' } } }).includes('SQL'));
});
