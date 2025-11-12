export type Category = {
  id: number;
  name: string;
  userId: number;
};

export type Expense = {
  id: number;
  amount: number;
  date: string;
  description?: string | null;
  categoryId: number;
  userId: number;
  category: Category;
};
