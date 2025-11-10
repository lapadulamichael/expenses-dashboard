import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();

// Allow requests from the Vite dev server (http://localhost:5173)
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Simple test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok from API' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});

const prisma = new PrismaClient();

// GET all expenses
app.get('/api/expenses', async (req, res) => {
  const expenses = await prisma.expense.findMany({
    include: { category: true },
    orderBy: { date: 'asc' },
  });
  res.json(expenses);
});

// DEV ONLY: Seed demo data safely
app.post('/api/seed', async (req, res) => {
  try {
    // 1. Make sure demo user exists
    let user = await prisma.user.findUnique({
      where: { email: 'demo@budget.app' },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'demo@budget.app',
          password: 'demo123', // dev only, ok for now
        },
      });
    }

    // 2. Make sure a 'Food' category exists for this user
    let foodCategory = await prisma.category.findFirst({
      where: { name: 'Food', userId: user.id },
    });

    if (!foodCategory) {
      foodCategory = await prisma.category.create({
        data: {
          name: 'Food',
          userId: user.id,
        },
      });
    }

    // 3. Only add the demo expense if user has no expenses yet
    const existingCount = await prisma.expense.count({
      where: { userId: user.id },
    });

    if (existingCount === 0) {
      await prisma.expense.create({
        data: {
          amount: 25.5,
          date: new Date(),
          description: 'Coffee & pastry',
          userId: user.id,
          categoryId: foodCategory.id,
        },
      });
    }

    res.json({
      ok: true,
      userId: user.id,
      message: 'Seed completed',
      alreadyHadExpenses: existingCount > 0,
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ ok: false, error: 'Seed failed' });
  }
});