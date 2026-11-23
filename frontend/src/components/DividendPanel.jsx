import ButtonSpinner from '@/components/ButtonSpinner';
import { LoadingState } from '@/components/ui/loading-state';
import { useEffect, useRef, useState } from 'react';
import API from '@/api/axios';
import { getApiError } from '@/api/errors';
import { SurfaceCard } from '@/components/ui/surface-card';

export default function DividendPanel({ projectId, onRecorded }) {
  const [records, setRecords] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [form, setForm] = useState({ instrument: '', dividend_type: 'cash', value: '', received_date: new Date().toLocaleDateString('en-CA') });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    Promise.all([
      API.get('/api/stock/dividends/', { params: { project_id: projectId } }),
      API.get(`/api/stock/sellable/instruments/${encodeURIComponent(projectId)}/`),
    ]).then(([history, list]) => {
      if (active) { setRecords(history.data); setInstruments(list.data.map((holding) => ({ ...holding.instrument, qty: holding.available_quantity }))); }
    }).catch((failure) => { if (active) setError(getApiError(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId]);
  const submit = async (event) => {
    event.preventDefault();
    if (lock.current || loading || !instruments.length) return;
    lock.current = true; setBusy(true); setError('');
    try {
      await API.post('/api/stock/dividends/', {
        project: projectId, instrument: Number(form.instrument), dividend_type: form.dividend_type,
        amount: form.dividend_type === 'cash' ? form.value : '0',
        qty: form.dividend_type === 'share' ? Number(form.value) : 0,
        received_date: form.received_date,
      });
    } catch (failure) {
      setError(getApiError(failure)); setBusy(false); lock.current = false; return;
    }
    // Refresh the receipt history and available holdings after recording.
    await onRecorded();
    setBusy(false); lock.current = false;
  };
  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }), disabled: busy || loading });
  return <SurfaceCard className="mb-8">
    <h2 className="text-lg font-semibold text-slate-900">Dividends</h2>
    <p className="mt-1 text-sm text-slate-500">Cash dividends become available in Disbursement. Bonus shares increase holdings with no extra cost or commission. Holdings change when recorded; previous sales stay unchanged.</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {!loading && !error && instruments.length === 0 && <p role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">This project has no available instruments. Buy instruments for this project before recording a dividend.</p>}
    {!loading && instruments.length > 0 && <form onSubmit={submit} className="mt-5 grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <label className="field-label">Instrument<select required className="field-select mt-2" {...field('instrument')}><option value="">Select instrument</option>{instruments.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.qty} shares)</option>)}</select></label>
      <label className="field-label">Dividend type<select className="field-select mt-2" {...field('dividend_type')}><option value="cash">Cash</option><option value="share">Share (bonus)</option></select></label>
      <label className="field-label">{form.dividend_type === 'cash' ? 'Amount (BDT)' : 'Bonus shares received'}<input required type="number" min={form.dividend_type === 'cash' ? '0.01' : '1'} step={form.dividend_type === 'cash' ? '0.01' : '1'} className="field-input mt-2" {...field('value')} /></label>
      <label className="field-label">Received date<input required type="date" className="field-input mt-2" {...field('received_date')} /></label>
      <button type="submit" disabled={busy || loading} className="primary-button">{busy ? <ButtonSpinner label="Recording…" /> : 'Record dividend'}</button>
    </form>}
    {loading ? <LoadingState variant="compact" label="Loading dividends and available holdings…" className="mt-5" /> : <div className="mt-6 overflow-x-auto"><table role="table" className="responsive-table w-full text-left text-sm"><thead role="rowgroup"><tr role="row" className="border-b text-slate-500">{['Received', 'Instrument', 'Type', 'Cash (BDT)', 'Bonus shares'].map((label) => <th role="columnheader" className="p-3" key={label}>{label}</th>)}</tr></thead><tbody role="rowgroup">{records.map((d) => <tr role="row" key={d.id} className="border-b border-slate-100"><td role="cell" data-mobile-label="Received" className="p-3"><div>{d.received_date}</div></td><td role="rowheader" data-mobile-heading className="p-3">{d.instrument_details.name}</td><td role="cell" data-mobile-label="Type" className="p-3 capitalize"><div>{d.dividend_type}</div></td><td role="cell" data-mobile-label="Cash (BDT)" className="p-3"><div>{d.dividend_type === 'cash' ? d.amount : '—'}</div></td><td role="cell" data-mobile-label="Bonus shares" className="p-3"><div>{d.dividend_type === 'share' ? d.qty : '—'}</div></td></tr>)}</tbody></table>{!records.length && <p className="mt-4 text-sm text-slate-500">No dividends recorded.</p>}</div>}
  </SurfaceCard>;
}
