import type { Category } from "../types";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function getExpenses() {
  const res = await fetch(`${API_URL}/api/expenses`);
  if (!res.ok) throw new Error(`Failed to load expenses (${res.status})`);
  return res.json();
}

export async function createExpense(data: {
    amount: number;
    date: string;
    description?: string;
    categoryName: string;
}) {
    const res = await fetch(`${API_URL}/api/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    
    if (!res.ok) throw new Error(`Failed to create expense ($res.status})`);
    return res.json();
}

export async function deleteExpense(id: number) {
    const res = await fetch(`${API_URL}/api/expenses/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status != 204) {
        throw new Error(`Failed to delete expense (${res.status})`);
    }
}