import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db';
import consentRoutes from './routes/consent.routes'
import arcoRoutes from './routes/arco.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: 'http://localhost:4321', // El puerto nativo de tu frontend Astro
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.use('/api/consent', consentRoutes);
app.use('/api/arco', arcoRoutes);

app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const dbCheck = await pool.query('SELECT NOW()');
    res.json({
      status: 'active',
      message: 'DataShield Backend [TS] operando con TypeScript correctamente',
      database: 'Conectada',
      timestamp: dbCheck.rows[0].now
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Error de conexión con la base de datos',
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(` DataShield Backend [TS] - Servidor Iniciado`);
  console.log(` Puerto: http://localhost:${PORT}`);
  console.log(`=================================================`);
});