import express from 'express';
import cors from 'cors';

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
