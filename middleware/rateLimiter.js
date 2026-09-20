const rateLimit = require('express-rate-limit');

// Rate limiter for authentication routes (login and register) to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 20, // Limit each IP to 20 auth attempts per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => process.env.NODE_ENV === 'test', // Skip in automated testing
  handler: (req, res) => {
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(429).json({
        success: false,
        error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
      });
    }

    res.status(429).render('auth/login', {
      title: 'Sign In — LaboTrack',
      error: 'Too many authentication attempts. Please try again in 15 minutes.',
      msg: null,
      showDemoCreds: process.env.NODE_ENV !== 'production' || process.env.SHOW_DEMO_CREDS === 'true'
    });
  }
});

module.exports = { authLimiter };
