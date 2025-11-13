import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(cors());            // allow requests from Vite (http://localhost:5173) during dev
app.use(express.json());    // parse JSON bodies

const PORT = 3000;

/** Health check */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok from API' });
});

/** DEV ONLY: Seed demo data (idempotent) */
app.get('/api/seed', async (_req, res) => {
  try {
    // 1) Ensure demo user exists
    const user = await prisma.user.upsert({
      where: { email: 'demo@budget.app' }, // email must be unique in your schema
      update: {},
      create: {
        email: 'demo@budget.app',
        password: 'demo123', // dev-only; fine for demo
      },
    });

    // 2) Ensure default categories exist for this user
    const defaultCats = ['Food', 'Rent', 'Transport', 'Subscriptions', 'Entertainment', 'Other'];
    for (const name of defaultCats) {
      const exists = await prisma.category.findFirst({ where: { name, userId: user.id } });
      if (!exists) {
        await prisma.category.create({ data: { name, userId: user.id } });
      }
    }

    // 3) Seed a few expenses only if none exist
    const count = await prisma.expense.count({ where: { userId: user.id } });
    if (count === 0) {
      const [food, rent, transport] = await Promise.all([
        prisma.category.findFirst({ where: { name: 'Food', userId: user.id } }),
        prisma.category.findFirst({ where: { name: 'Rent', userId: user.id } }),
        prisma.category.findFirst({ where: { name: 'Transport', userId: user.id } }),
      ]);

      if (food && rent && transport) {
        await prisma.expense.createMany({
          data: [
            {
              amount: 12.5,
              date: new Date('2025-01-05'),
              description: 'Coffee & croissant',
              userId: user.id,
              categoryId: food.id,
            },
            {
              amount: 800,
              date: new Date('2025-01-01'),
              description: 'January rent',
              userId: user.id,
              categoryId: rent.id,
            },
            {
              amount: 65,
              date: new Date('2025-01-03'),
              description: 'Monthly transit pass',
              userId: user.id,
              categoryId: transport.id,
            },
          ],
        });
      }
    }

    res.json({ ok: true, message: 'Seed complete (or already seeded)' });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ ok: false, error: 'Seed failed' });
  }
});

app.get('/api/expenses', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: 'demo@budget.app' } });
    if (!user) return res.json([]);
    
    const { month, category } = req.query as {
      month?: string;
      category?: string;
    };

    const where: any = {
      userId: user.id,
    };

    if (month) {
      const [yearStr, monthStr] = month.split('-');
      const year = Number(yearStr);
      const monthIndex = Number(monthStr) - 1;

      if (!Number.isNaN(year) && !Number.isNaN(monthIndex)) {
        const start = new Date(year, monthIndex, 1);
        const end = new Date(year, monthIndex + 1, 1);

        where.date = {
          gte: start,
          lt: end,
        };
      }
    }

    if (category) {
      where.category = {
        name: category,
      };
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'asc' },
    });

    res.json(expenses);
  } catch (err) {
    console.error('Get expenses error:', err);
    res.status(500).json({ error: 'Failed to load expenses' });
  }
});

/** Create a new expense for the demo user */
app.post('/api/expenses', async (req, res) => {
  try {
    const { amount, date, categoryName, description } = req.body;

    if (amount == null || !date || !categoryName) {
      return res.status(400).json({ error: 'amount, date, and categoryName are required' });
    }

    const user = await prisma.user.findUnique({ where: { email: 'demo@budget.app' } });
    if (!user) return res.status(400).json({ error: 'Demo user not found. Run /api/seed first.' });

    // Find or create the category for this user
    let category = await prisma.category.findFirst({ where: { name: categoryName, userId: user.id } });
    if (!category) {
      category = await prisma.category.create({ data: { name: categoryName, userId: user.id } });
    }

    const newExpense = await prisma.expense.create({
      data: {
        amount: Number(amount),
        date: new Date(date),
        description,
        userId: user.id,
        categoryId: category.id,
      },
      include: { category: true },
    });

    res.status(201).json(newExpense);
  } catch (err) {
    console.error('Create expense error:', err);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid expense id' });
    }

    const user = await prisma.user.findUnique({ where : { email: 'demo@budget.app' } });
    if (!user) return res.status(400).json({ error: 'Demo user not found.' });

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing || existing.userId != user.id) {
      return res.status(400).json({ error : 'Expense not found' });
    }
    await prisma.expense.delete({ where: { id }});
    return res.status(204).send();


  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

app.put('/api/expenses/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { amount, date, categoryName, description } = req.body;

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid expense id' });
    }

    const user = await prisma.user.findUnique({ where : { email: 'demo@budget.app' } });
    if (!user) return res.status(400).json({ error: 'Demo user not found.' });

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing || existing.userId != user.id) {
      return res.status(400).json({ error : 'Expense not found' });
    }
    
    // Find or create the category for this user
    let category = await prisma.category.findFirst({ where: { name: categoryName, userId: user.id } });
    if (!category) {
      category = await prisma.category.create({ data: { name: categoryName, userId: user.id } });
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        amount: Number(amount),
        date: new Date(date),
        description,
        categoryId: category.id,
      },
      include: { category: true },
    });
    res.json(updated);
  } catch (err) {
    console.error('Update expense error:', err);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
