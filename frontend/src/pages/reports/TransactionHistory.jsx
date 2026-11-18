import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Download, Wallet } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';

import { useAuth } from '@/auth/use-auth';
import { useApiQuery } from '@/hooks/use-api-query';
import { Button } from '@/components/ui/button';
import { PageIntro } from '@/components/ui/page-intro';
import { QueryState } from '@/components/ui/query-state';
import { SurfaceCard } from '@/components/ui/surface-card';

const PAGE_SIZE = 15;
const currency = new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', currencyDisplay: 'code' });
const formatAmount = (cents) => currency.format(cents / 100).replace('\u00a0', ' ');
const toCents = (amount) => Math.round(Number(amount) * 100);

function buildLedger(transactions) {
  let creditTotal = 0;
  let debitTotal = 0;
  const months = new Set();

  // The API sends newest first. Calculate balances across the full ledger
  // before applying filters or pagination.
  const rows = [...transactions].reverse().map((transaction) => {
    const amount = toCents(transaction.amount);
    const credit = transaction.transaction_type === 'deposit';
    if (credit) creditTotal += amount;
    else debitTotal += amount;

    const postedAt = parseISO(transaction.issued_date);
    const month = format(postedAt, 'yyyy-MM');
    months.add(month);
    return {
      ...transaction,
      postedAt,
      month,
      credit: credit ? amount : null,
      debit: credit ? null : amount,
      ledgerBalance: creditTotal - debitTotal,
    };
  }).reverse();

  return { rows, months: [...months].sort().reverse(), creditTotal, debitTotal };
}

function exportLedger(rows, showLedgerBalance) {
  const decimal = (amount) => amount === null ? '' : (amount / 100).toFixed(2);
  const csv = Papa.unparse(rows.map((row) => ({
    Reference: row.id,
    'Posted at': row.issued_date,
    Description: row.narration || (row.credit === null ? 'Wallet debit' : 'Wallet credit'),
    Status: row.status,
    'Debit (BDT)': decimal(row.debit),
    'Credit (BDT)': decimal(row.credit),
    ...(showLedgerBalance ? { 'Ledger balance (BDT)': decimal(row.ledgerBalance) } : {}),
  })), { escapeFormulae: true });
  saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'wallet-ledger.csv');
}

function BalanceSummary({ balanceQuery, creditTotal, debitTotal }) {
  const balance = balanceQuery.data.balance;

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="col-span-2 rounded-2xl bg-slate-900 p-4 text-white sm:col-span-1 sm:p-5">
        <dt className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <Wallet className="size-4" aria-hidden="true" /> Wallet balance
        </dt>
        <dd className="mt-2 break-words text-2xl font-semibold tracking-tight tabular-nums" aria-live="polite">
          {balanceQuery.error ? (
            <Button variant="link" type="button" className="h-auto p-0 text-cyan-200" onClick={balanceQuery.refetch}>
              Balance unavailable. Retry
            </Button>
          ) : balance == null ? '—' : formatAmount(toCents(balance))}
        </dd>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <dt className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <ArrowDownLeft className="size-4 text-emerald-700" aria-hidden="true" /> Total credits
        </dt>
        <dd className="mt-2 text-base font-semibold tracking-tight tabular-nums text-slate-900 sm:text-2xl">{formatAmount(creditTotal)}</dd>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <dt className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <ArrowUpRight className="size-4 text-slate-500" aria-hidden="true" /> Total debits
        </dt>
        <dd className="mt-2 text-base font-semibold tracking-tight tabular-nums text-slate-900 sm:text-2xl">{formatAmount(debitTotal)}</dd>
      </div>
    </dl>
  );
}

function LedgerTable({ rows, showLedgerBalance }) {
  return (
    <div className="overflow-x-auto">
      <table role="table" className="block w-full text-left text-sm md:table md:min-w-[40rem]">
        <caption className="sr-only">Posted wallet transactions, newest first</caption>
        <thead role="rowgroup" className="sr-only border-y border-slate-200 bg-slate-50 text-xs font-medium text-slate-600 md:not-sr-only md:table-header-group">
          <tr role="row">
            <th role="columnheader" scope="col" className="whitespace-nowrap px-4 py-3 md:pl-6">Posted</th>
            <th role="columnheader" scope="col" className="px-4 py-3">Description</th>
            <th role="columnheader" scope="col" className="px-4 py-3 text-right">Debit</th>
            <th role="columnheader" scope="col" className="px-4 py-3 text-right">Credit</th>
            {showLedgerBalance && <th role="columnheader" scope="col" className="whitespace-nowrap py-3 pr-6 pl-4 text-right">Ledger balance</th>}
          </tr>
        </thead>
        <tbody role="rowgroup" className="block divide-y divide-slate-100 border-t border-slate-200 md:table-row-group md:border-t-0">
          {rows.map((row) => (
            <tr role="row" key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-4 py-3 align-top hover:bg-slate-50/70 md:table-row">
              <td role="cell" className="col-start-1 row-start-2 text-xs text-slate-500 md:p-3 md:pl-6 md:text-sm md:whitespace-nowrap">
                <time dateTime={row.issued_date}>
                  <span className="md:block md:font-medium md:text-slate-800">{format(row.postedAt, 'dd MMM yyyy')}</span>
                  <span className="ml-1 text-xs whitespace-nowrap md:mt-0.5 md:ml-0 md:block">{format(row.postedAt, 'h:mm a')}</span>
                </time>
              </td>
              <th role="rowheader" scope="row" className="col-start-1 row-start-1 min-w-0 text-left font-medium text-slate-900 md:min-w-56 md:px-4 md:py-3">
                <span className="break-words">{row.narration || (row.credit === null ? 'Wallet debit' : 'Wallet credit')}</span>
                <span className="mt-0.5 block text-xs font-normal text-slate-500">
                  <span className="font-mono">#{row.id}</span> · <span className="capitalize">{row.status}</span>
                </span>
              </th>
              <td role="cell" className={`col-start-2 row-start-1 whitespace-nowrap text-right tabular-nums text-slate-800 md:table-cell md:px-4 md:py-3 ${row.debit === null ? 'hidden' : ''}`}>
                <span className="block text-xs text-slate-500 md:hidden">Debit</span>
                {row.debit === null ? '—' : formatAmount(row.debit)}
              </td>
              <td role="cell" className={`col-start-2 row-start-1 whitespace-nowrap text-right tabular-nums text-emerald-800 md:table-cell md:px-4 md:py-3 ${row.credit === null ? 'hidden' : ''}`}>
                <span className="block text-xs text-slate-500 md:hidden">Credit</span>
                {row.credit === null ? '—' : formatAmount(row.credit)}
              </td>
              {showLedgerBalance && (
                <td role="cell" className="col-start-2 row-start-2 whitespace-nowrap text-right text-xs font-semibold tabular-nums text-slate-900 md:py-3 md:pr-6 md:pl-4 md:text-sm">
                  <span className="mr-1 font-normal text-slate-500 md:hidden">Balance</span>
                  {formatAmount(row.ledgerBalance)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TransactionHistory() {
  const { user } = useAuth();
  const [type, setType] = useState('all');
  const [month, setMonth] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { data: transactions, loading, error, refetch } = useApiQuery('/api/acc/user/transaction-details/');
  const balanceQuery = useApiQuery(user?.id ? `/api/acc/user/${user.id}/balance/` : null);

  const { rows, months, creditTotal, debitTotal } = useMemo(() => buildLedger(transactions), [transactions]);
  const walletBalance = balanceQuery.data.balance;
  const balanceAvailable = !balanceQuery.loading && !balanceQuery.error && walletBalance != null;
  const showLedgerBalance = balanceAvailable && toCents(walletBalance) === creditTotal - debitTotal;
  const filteredRows = rows.filter((row) =>
    (type === 'all' || row.transaction_type === type) && (!month || row.month === month));
  const visibleRows = filteredRows.slice(0, visibleCount);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageIntro as="h1" title="Transaction History" description="View the posted credits and debits in your wallet." />
      <QueryState loading={loading} error={error} onRetry={refetch} loadingLabel="Loading wallet ledger…">
        <div className="space-y-5">
          <BalanceSummary balanceQuery={balanceQuery} creditTotal={creditTotal} debitTotal={debitTotal} />
          <SurfaceCard className="overflow-hidden !p-0">
            <div className="grid grid-cols-2 items-end gap-3 px-4 py-4 sm:flex sm:flex-wrap sm:px-6">
              <div className="min-w-0 sm:min-w-32">
                <label htmlFor="ledger-type" className="field-label">Entry type</label>
                <select id="ledger-type" className="field-select py-2" value={type} onChange={(event) => {
                  setType(event.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}>
                  <option value="all">All entries</option>
                  <option value="deposit">Credits</option>
                  <option value="payment">Debits</option>
                </select>
              </div>
              <div className="min-w-0 sm:min-w-32">
                <label htmlFor="ledger-month" className="field-label">Month</label>
                <select id="ledger-month" className="field-select py-2" value={month} onChange={(event) => {
                  setMonth(event.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}>
                  <option value="">All months</option>
                  {months.map((value) => <option key={value} value={value}>{format(parseISO(`${value}-01`), 'MMM yyyy')}</option>)}
                </select>
              </div>
              <Button
                type="button"
                variant="outline"
                className="col-span-2 justify-self-start sm:ml-auto"
                onClick={() => exportLedger(filteredRows, showLedgerBalance)}
                disabled={!filteredRows.length}
              >
                <Download aria-hidden="true" /> Export CSV
              </Button>
            </div>

            {visibleRows.length ? (
              <LedgerTable rows={visibleRows} showLedgerBalance={showLedgerBalance} />
            ) : (
              <p className="border-t border-slate-100 px-6 py-12 text-center text-sm text-slate-600">
                {rows.length ? 'No entries match these filters.' : 'No wallet transactions have been posted yet.'}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-6">
              <p role="status" className="text-xs text-slate-600">Showing {visibleRows.length} of {filteredRows.length} entries</p>
              {visibleRows.length < filteredRows.length && (
                <Button type="button" size="sm" variant="outline" onClick={() => setVisibleCount((previous) => previous + PAGE_SIZE)}>
                  Load more
                </Button>
              )}
            </div>
            {balanceAvailable && !showLedgerBalance && rows.length > 0 && (
              <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-600 sm:px-6">
                Running balances are unavailable because the posted entries differ from the recorded wallet balance.
              </p>
            )}
          </SurfaceCard>
        </div>
      </QueryState>
    </div>
  );
}
