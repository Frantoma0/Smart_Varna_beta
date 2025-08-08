// server.js (ИЗЧИСТЕНА ВЕРСИЯ)
import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
// import { isAdmin } from './middleware/authMiddleware.js';
import signalRoutes from './routes/signals.js';
import aiRoutes from './routes/aiRoutes.js';
import geolocationRoutes from './routes/geolocationRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import configRoutes from './routes/configRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// --- Инициализации ---
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET, // Секретен ключ от .env
  resave: false,
  saveUninitialized: false,
  cookie: {
      secure: process.env.NODE_ENV === 'production', // true само при HTTPS
      httpOnly: true, // Предотвратява достъп от JS
      maxAge: 24 * 60 * 60 * 1000 // 24 часа живот на сесията
  }
}));

// ===================================
// ## API ЕНДПОЙНТИ ##
// ===================================

// Всички рутове, започващи с /api, ще се управляват от съответния рутер
app.use('/api/admin', adminRoutes);
app.use('/api', signalRoutes);
app.use('/api', aiRoutes);
app.use('/api', geolocationRoutes);
app.use('/api', contactRoutes);
app.use('/api', configRoutes);

app.use('/admin', (req, res, next) => {
  // Ако потребителят вече е логнат като администратор, му позволяваме достъп до всичко.
  if (req.session && req.session.isAdmin) {
      return next();
  }

  // За нелогнати потребители, дефинираме списък с разрешени файлове.
  const allowedPaths = [
    '/login.html', 
    '/components/auth.js',
    '/dashboard.js',
    '/components/signalsTable.js',
    '/components/detailsModal.js'
  ];

  // Ако исканият файл е в списъка с разрешени, пропускаме заявката напред.
  if (allowedPaths.includes(req.path)) {
      return next();
  }

  // Ако нелогнат потребител се опита да достъпи друг файл в /admin (напр. dashboard.html),
  // го пренасочваме към страницата за вход.
  return res.redirect('/admin/login.html');
});
app.use(express.static('public'));
// --- Стартиране на сървъра ---
app.listen(PORT, () => {
  console.log(`🚀 Сървърът е стартиран и слуша на http://localhost:${PORT}`);
});