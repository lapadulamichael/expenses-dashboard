import { useEffect, useState } from 'react';
import { getExpenses } from './api/client';
import { createExpense } from './api/client';
import type { Expense } from './types';

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'CAD' }); // switch to CAD later if you want
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(); // e.g., 1/5/2025; customize as you like
}

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    amount: '',
    date: '',
    description: '',
    categoryName: '',
  });
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.amount || !form.date || !form.categoryName) {
      alert('Amount, date, and category are required.');
      return;
    }

    try {
      setSubmitting(true);
      await createExpense({
        amount: parseFloat(form.amount),
        date: form.date,
        description: form.description,
        categoryName: form.categoryName,
      });

      // refresh list
      const updated = await getExpenses();
      setExpenses(updated);

      // clear form
      setForm({ amount: '', date: '', description: '', categoryName: '' });
    } catch (err) {
      console.error(err);
      alert('Failed to create expense.');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data: Expense[] = await getExpenses();
        setExpenses(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to load expenses');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Expense Tracker (Demo)</h1>
      <p style={{ color: '#666', marginTop: 0 }}>
        Backend: <code>{import.meta.env.VITE_API_URL || 'http://localhost:3000'}</code>
      </p>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'grid',
          gap: '0.6rem',
          maxWidth: 400,
          marginBottom: '2rem',
          border: '1px solid #ddd',
          padding: '1rem',
          borderRadius: '8px',
        }}
      >
        <h2 style={{ margin: 0 }}>Add Expense</h2>

        <input
          type="number"
          name="amount"
          placeholder="Amount"
          value={form.amount}
          onChange={handleChange}
          required
        />
        <input
          type="date"
          name="date"
          value={form.date}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="categoryName"
          placeholder="Category (e.g., Food)"
          value={form.categoryName}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="description"
          placeholder="Description (optional)"
          value={form.description}
          onChange={handleChange}
        />

        <button type="submit" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add Expense'}
        </button>
      </form>

      {!loading && !error && (
        <>
          {expenses.length === 0 ? (
            <p>No expenses yet. Hit <code>/api/seed</code> on your API and refresh.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th style={th}>Date</th>
                  <th style={th}>Category</th>
                  <th style={th}>Description</th>
                  <th style={{ ...th, textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td style={td}>{formatDate(e.date)}</td>
                    <td style={td}>{e.category?.name ?? '—'}</td>
                    <td style={td}>{e.description ?? '—'}</td>
                    <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(e.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: 'left',
  borderBottom: '1px solid #ddd',
  padding: '8px 6px',
  fontWeight: 600,
};

const td: React.CSSProperties = {
  borderBottom: '1px solid #eee',
  padding: '8px 6px',
};
