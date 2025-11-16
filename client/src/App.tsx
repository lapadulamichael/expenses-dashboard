import { useEffect, useState } from 'react';
import { getExpenses } from './api/client';
import { createExpense } from './api/client';
import { deleteExpense } from './api/client';
import { updateExpense } from './api/client';
import { getCategories } from './api/client';
import type { Expense } from './types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    date: '',
    description: '',
    categoryName: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);

  const categoryStats = expenses.reduce((acc, e) => {
    const name = e.category?.name ?? 'Uncategorized';

    if (!acc[name]) {
      acc[name] = { total: 0, count: 0 };
    }

    acc[name].total += e.amount;
    acc[name].count += 1;

    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  const chartData = Object.entries(categoryStats).map(([name, stats]) => ({
    name,
    total: stats.total,
  }));

  function toServerDate(dateStr: string) {
    // dateStr is "YYYY-MM-DD" from <input type="date">
    // Store as noon UTC to avoid timezone shifts changing the day
    return `${dateStr}T12:00:00.000Z`;
  }

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
        date: toServerDate(form.date),
        description: form.description,
        categoryName: form.categoryName,
      });

      // refresh list
      const updated = await getExpenses();
      setExpenses(updated);
      const cats = await getCategories();
      setCategories(cats.map((c) => c.name));

      // clear form
      setForm({ amount: '', date: '', description: '', categoryName: '' });
    } catch (err) {
      console.error(err);
      alert('Failed to create expense.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    try {
      await deleteExpense(id);
      const cats = await getCategories();
      setCategories(cats.map((c) => c.name));
    } catch (err) {
      console.error(err);
      alert('Failed to delete expense1');
      setExpenses(await getExpenses());
    }
  }

  function startEdit(e: Expense) {
    setEditingId(e.id);
    setEditForm({
      amount: String(e.amount),
      date: e.date.slice(0, 10), // convert ISO to yyyy-mm-dd
      description: e.description ?? '',
      categoryName: e.category?.name ?? '',
    });
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    try {
      const updated = await updateExpense(editingId, {
        amount: parseFloat(editForm.amount),
        date: toServerDate(form.date),
        categoryName: editForm.categoryName,
        description: editForm.description,
      });
      // update local list
      setExpenses(prev =>
        prev.map(exp => (exp.id === editingId ? updated : exp))
      );
      setEditingId(null);
      const cats = await getCategories();
      setCategories(cats.map((c) => c.name));
    } catch (err) {
      console.error(err);
      alert('Update failed');
    }
  }

  function handleEditChange(ev: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = ev.target;
    setEditForm(f => ({ ...f, [name]: value }));
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data: Expense[] = await getExpenses({
          month: filterMonth || undefined,
          category: filterCategory || undefined,
        });
        setExpenses(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to load expenses');
      } finally {
        setLoading(false);
      }
    })();
  }, [filterMonth, filterCategory]);

  useEffect(() => {
    (async () => {
      try {
        const cats = await getCategories();
        setCategories(cats.map((c) => c.name));
      } catch (err) {
        console.error('Failed to load categories', err);
        // you could set some error state if you want
      }
    })();
  }, []);

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const count = expenses.length;
  const averageAmount = count > 0 ? totalAmount / count : 0;

  return (
    <div style={{ fontFamily: 'system-ui', paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '0.5rem', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.5rem', margin: '1rem'}}>Expense Tracker (Demo)</h1>

      {loading && <p>Loading… (Render's free tier takes a moment on cold start)</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {/* Summary bar */}
        {!loading && !error && (
          <div
            style={{
              display: 'flex',
              gap: '1.5rem',
              marginTop: '1rem',
              marginBottom: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid #eee',
              background: '#242424',
              fontSize: 14,
            }}
          >
            <div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#eee' }}>Total</div>
              <div style={{ fontWeight: 600 }}>{formatCurrency(totalAmount)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#eee' }}>Count</div>
              <div style={{ fontWeight: 600 }}>{count}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#eee' }}>Average</div>
              <div style={{ fontWeight: 600 }}>
                {count > 0 ? formatCurrency(averageAmount) : '—'}
              </div>
            </div>
          </div>
        )}
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', marginTop: '1rem', justifyContent: 'center' }}>
        {!loading && !error && expenses.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ margin: '0 0 0.5rem' }}>Spending by Category (Chart)</h3>

            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{ color: '#000', fontWeight: 'bold' }}
                    labelStyle={{ color: '#000' }}
                    formatter={(v) => formatCurrency(v as number)}
                  />
                  <Bar dataKey="total" fill="#0fe460ff" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        
        {/* Category breakdown for current filters */}
        {!loading && !error && expenses.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ margin: '0 0 0.5rem' }}>Spending by category (current view)</h3>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: '1rem',
                maxWidth: 400,
              }}
            >
              <thead>
                <tr>
                  <th style={th}>Category</th>
                  <th style={{ ...th, textAlign: 'right' }}>Count</th>
                  <th style={{ ...th, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(categoryStats).map(([name, stats]) => (
                  <tr key={name}>
                    <td style={td}>{name}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{stats.count}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      {formatCurrency(stats.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', marginBottom: '0rem' }}>
        {/* Month filter */}
        <div>
          <label style={{ display: 'block', fontSize: 14, marginBottom: 4 }}>Month</label>
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          />
        </div>
        {/* Category filter */}
        <div>
          <label style={{ display: 'block', fontSize: 14, marginBottom: 4 }}>Category</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All</option>
            {categories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <hr
        style={{
          border: 'none',
          borderTop: '1px solid #555',
          margin: '1rem 0',
        }}
      />
      <div style={{
        display: 'flex',
        gap: '2rem',
        alignItems: 'flex-start',
        marginTop: '0.5rem',
      }}>
        <div style={{ flex: 1 }}>
          {!loading && !error && (
            <>
              {expenses.length === 0 ? (
                <p>No expenses yet.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0rem' }}>
                  <thead>
                    <tr>
                      <th style={th}>Date</th>
                      <th style={th}>Category</th>
                      <th style={th}>Description</th>
                      <th style={{ ...th, textAlign: 'right' }}>Amount</th>
                      <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e) => (
                      <tr key={e.id}>
                        {editingId === e.id ? (
                          <>
                            <td style={td}>
                              <input type="date" name="date" value={editForm.date}
                                    onChange={handleEditChange} />
                            </td>
                            <td style={td}>
                              <input name="categoryName" value={editForm.categoryName}
                                    onChange={handleEditChange} />
                            </td>
                            <td style={td}>
                              <input name="description" value={editForm.description}
                                    onChange={handleEditChange} />
                            </td>
                            <td style={{ ...td, textAlign: 'right' }}>
                              <input type="number" name="amount" value={editForm.amount}
                                    onChange={handleEditChange} />
                            </td>
                            <td style={{ ...td, textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                <button onClick={handleUpdate}>Save</button>
                                <button onClick={() => setEditingId(null)}>Cancel</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={td}>{formatDate(e.date)}</td>
                            <td style={td}>{e.category?.name ?? '—'}</td>
                            <td style={td}>{e.description ?? '—'}</td>
                            <td style={{ ...td, textAlign: 'right' }}>{formatCurrency(e.amount)}</td>
                            <td style={{ ...td, textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                <button onClick={() => startEdit(e)}>Edit</button>
                                <button onClick={() => handleDelete(e.id)}>Delete</button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
        <div style={{ flex: 2 }}>
          {editingId === null && (
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
          )}
        </div>
      </div>
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
