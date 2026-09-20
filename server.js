require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const helmet = require('helmet');

const { connectDB } = require('./config/db');
const { initMemoryStore } = require('./models/store');
const { populateUserLocals } = require('./middleware/auth');
const { preventInjection } = require('./middleware/security');

// Route imports
const authRoutes = require('./routes/authRoutes');
const assetRoutes = require('./routes/assetRoutes');
const requestRoutes = require('./routes/requestRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers with CSP relaxed for Google Fonts and inline scripts
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*", "ws:", "wss:"]
      }
    }
  })
);

// Body and cookie parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride('_method'));

// NoSQL and SQL Injection protection
app.use(preventInjection);

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'labotrack_institutional_session_secret_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' && process.env.RENDER === 'true'
    }
  })
);

// View engine setup (EJS SSR)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// Populate session user in all templates
app.use(populateUserLocals);

// Mount application routes
app.use('/', dashboardRoutes);
app.use('/auth', authRoutes);
app.use('/assets', assetRoutes);
app.use('/requests', requestRoutes);
app.use('/supplier', supplierRoutes);

// Health check endpoint for Render / monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 - Page Not Found',
    message: `The requested URL "${req.originalUrl}" does not exist on this server.`,
    currentUser: req.session ? req.session.user : null
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err);
  res.status(err.status || 500).render('error', {
    title: '500 - Server Error',
    message: err.message || 'An unexpected internal error occurred.',
    currentUser: req.session ? req.session.user : null
  });
});

// Initialize Database & Start Server
const startServer = async () => {
  try {
    await connectDB();
    // Initialize in-memory seed dataset for standalone zero-config execution
    await initMemoryStore();

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 LaboTrack Pro running on http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

module.exports = app;
