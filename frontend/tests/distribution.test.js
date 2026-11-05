import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProfitDistribution } from '../src/utils/profit-distribution.js';

const investors = [
  { investor: { id: 1 }, contribute_amount: '60000.00', contribution_percentage: '60.00' },
  { investor: { id: 2 }, contribute_amount: '40000.00', contribution_percentage: '40.00' },
];

test('preview deducts sequential advisor commissions before investor shares', () => {
  const result = buildProfitDistribution([{ trade: 'trade-1', amount: '10000.00' }], [
    { advisor: { id: 3 }, com_percentage: '10.00' },
    { advisor: { id: 4 }, com_percentage: '10.00' },
  ], investors);
  assert.deepEqual(result.advisorRows.map((row) => row.amount), [1000, 900]);
  assert.deepEqual(result.investorRows.map((row) => row.amount), [4860, 3240]);
  assert.equal(result.gross, 10000);
  assert.equal(result.advisorTotal + result.investorTotal, 10000);
  assert.equal(result.recipientCount, 4);
});

test('preview keeps individual trade allocations but counts recipients once', () => {
  const result = buildProfitDistribution([
    { trade: 'trade-1', amount: '100.00' }, { trade: 'trade-2', amount: '200.00' },
  ], [], investors);
  assert.equal(result.tradeCount, 2);
  assert.equal(result.recipientCount, 2);
  assert.equal(result.investorRows.length, 4);
  assert.equal(result.investorTotal, 300);
  assert.equal(result.advisorTotal, 0);
});

test('rounding happens per trade and empty allocations cannot create recipients', () => {
  const result = buildProfitDistribution([{ trade: 'trade-1', amount: '10.01' }], [], investors);
  assert.deepEqual(result.investorRows.map((row) => row.amount), [6.01, 4]);
  const empty = buildProfitDistribution([], [], investors);
  assert.equal(empty.recipientCount, 0);
  assert.equal(empty.gross, 0);
});
