const crypto = require('crypto');

/**
 * CSRF Protection Middleware
 * Employs session-bound tokens and double-submit cookies for form & API requests.
 */
function csrfProtection(req, res, next) {
  // Ensure session exists
  if (!req.session) {
    return next();
  }

  // Generate or retrieve CSRF token stored in session
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  // Expose token to all view templates and cookie
  res.locals.csrfToken = req.session.csrfToken;
  res.cookie('XSRF-TOKEN', req.session.csrfToken, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.RENDER === 'true'
  });

  // Safe read-only HTTP methods do not require CSRF validation
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method.toUpperCase())) {
    return next();
  }

  // Skip in non-production environment if explicit test bypass header is present
  if (process.env.NODE_ENV !== 'production' && (req.headers['x-bypass-csrf'] === 'true' || req.session.skipCsrf)) {
    return next();
  }

  // Extract token from body or headers
  const submittedToken =
    (req.body && req.body._csrf) ||
    req.headers['x-csrf-token'] ||
    req.headers['csrf-token'] ||
    req.headers['x-xsrf-token'];

  if (!submittedToken || submittedToken !== req.session.csrfToken) {
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Invalid or missing CSRF security token.'
      });
    }

    return res.status(403).render('error', {
      title: '403 - Invalid CSRF Security Token',
      message: 'Your form submission failed CSRF security validation. Please refresh the page and try again.',
      currentUser: req.session ? req.session.user : null
    });
  }

  next();
}

module.exports = { csrfProtection };
