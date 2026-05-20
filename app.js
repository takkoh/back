require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const app = express();

// ── Middlewares globales ─────────────────────────────────────────
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://carpenter-front.onrender.com',   // Frontend en producción
      'http://localhost:5173',                  // Desarrollo local (Vite)
      'http://127.0.0.1:5173',                  // Alternativa localhost
      'http://localhost:3000'                   // Por si usas otro puerto
    ];

    // Permitir requests sin origin (Postman, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ Origen bloqueado por CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,           // Importante para sesiones y cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Aumentar límite para imágenes Base64
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Sesiones ────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'carpinteria_secret_dev',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8, // 8 horas
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  },
}));

// ── Rutas ────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/LoginRoute'));
app.use('/api/personal', require('./routes/personalRoute'));
app.use('/api/solicitantes', require('./routes/solicitanteRoute'));
app.use('/api/servicios', require('./routes/servicioRoute'));
app.use('/api/utensilios', require('./routes/utensilioRoute'));
app.use('/api/seguimiento', require('./routes/seguimientoRoute'));
app.use('/api/reportes', require('./routes/reportesRoute'));

// ── Cron ────────────────────────────────────────────────────────
const { iniciarCronMantenimiento } = require("./modules/mantenimientoCron");
iniciarCronMantenimiento({ ejecutarAlInicio: process.env.NODE_ENV !== "production" });

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// 404 y manejo de errores
app.use((req, res) => res.status(404).json({ message: 'Ruta no encontrada' }));

app.use((err, req, res, _next) => {
  console.error('❌ Error no capturado:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

// ── Iniciar servidor ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});

module.exports = app;
