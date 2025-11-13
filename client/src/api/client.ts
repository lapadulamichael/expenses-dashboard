import type { Category } from "../types";
import type { Expense } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type ExpenseFilters = {
  month?: string;      // "YYYY-MM"
  category?: string;   // category name
};

export async function getExpenses(filters: ExpenseFilters = {}) {
  const params = new URLSearchParams();

  if (filters.month) {
    params.set('month', filters.month);
  }
  if (filters.category) {
    params.set('category', filters.category);
  }

  const query = params.toString();
  const url = query
    ? `${API_URL}/api/expenses?${query}`
    : `${API_URL}/api/expenses`;

  const res = await fetch(url);
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

export async function updateExpense(
  id: number,
  data: { amount: number; date: string; categoryName: string; description?: string }
): Promise<Expense> {
  const res = await fetch(`${API_URL}/api/expenses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update expense (${res.status})`);
  const json: Expense = await res.json();
  return json;
}

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) throw new Error(`Failed to load categories (${res.status})`);
  return res.json();
}