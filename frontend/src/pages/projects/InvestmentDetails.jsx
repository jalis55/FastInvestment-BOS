import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SurfaceCard } from '@/components/ui/surface-card';

export default function InvestmentDetails({ userInfo = [], editUserData, deleteUser }) {
  const [editing, setEditing] = useState(null);
  const [amount, setAmount] = useState('');
  if (!userInfo.length) return <EmptyState title="No investments added" />;
  return <SurfaceCard><h2 className="section-heading">Investment details</h2><ul className="divide-y divide-slate-200">
    {userInfo.map((investment, index) => <li key={investment.id ?? index} className="flex flex-wrap items-center gap-3 py-4">
      <span className="mr-auto text-sm">{investment.name || investment.email || `Investor ${index + 1}`}</span>
      {editing === index ? <form className="flex gap-2" onSubmit={(event) => {
        event.preventDefault();
        if (Number(amount) > 0) { editUserData(index, Number(amount)); setEditing(null); }
      }}><input id="investmentdetails-field-1" aria-label="Investment amount" className="field-input" type="number" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} /><Button type="submit">Save</Button><Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></form> : <><span>{investment.amount}</span>{editUserData && <Button variant="outline" onClick={() => { setEditing(index); setAmount(String(investment.amount ?? '')); }}>Edit</Button>}{deleteUser && <Button variant="destructive" onClick={() => deleteUser(index)}>Remove</Button>}</>}
    </li>)}
  </ul></SurfaceCard>;
}
