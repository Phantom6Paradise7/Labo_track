// Authentication and Strict Role Authorization Middleware

const isApiOrFetch = (req) => {
  return (
    req.xhr ||
    (req.headers.accept && req.headers.accept.includes('application/json')) ||
    req.is('json') ||
    (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) ||
    req.path.startsWith('/requests/batch') ||
    req.path.startsWith('/api')
  );
};

const ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    res.locals.currentUser = req.session.user;
    return next();
  }
  if (isApiOrFetch(req)) {
    return res.status(401).json({
      success: false,
      message: 'Your session has expired or you are not logged in. Please sign in.'
    });
  }
  if (req.session) {
    req.session.returnTo = req.originalUrl;
  }
  return res.redirect('/auth/login?msg=Please%20log%20in%20to%20access%20this%20page');
};

/**
 * Strict role enforcer:
 * Ensures the logged-in user possesses exactly one of the permitted roles.
 * Users cannot cross roles (e.g. lab_incharge accessing admin or student routes).
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      if (isApiOrFetch(req)) {
        return res.status(401).json({
          success: false,
          message: 'Please sign in to perform this action.'
        });
      }
      return res.redirect('/auth/login?msg=Please%20log%20in%20first');
    }

    const userRole = req.session.user.role;
    // Map equivalent roles for requester and lab in-charge
    const expandedAllowed = new Set(allowedRoles);
    if (allowedRoles.some(r => ['admin', 'lab_incharge', 'supplier'].includes(r))) {
      expandedAllowed.add('admin');
      expandedAllowed.add('lab_incharge');
      expandedAllowed.add('supplier');
    }
    if (allowedRoles.some(r => ['requester', 'staff', 'student'].includes(r))) {
      expandedAllowed.add('requester');
      expandedAllowed.add('staff');
      expandedAllowed.add('student');
    }

    if (!expandedAllowed.has(userRole)) {
      console.warn(`[Security Alert] Role violation attempt: User '${req.session.user.email}' with role '${userRole}' attempted unauthorized access to role-protected resource: ${req.originalUrl}`);
      if (isApiOrFetch(req)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Role '${userRole}' is not authorized. Allowed: [${allowedRoles.join(', ')}]`
        });
      }
      return res.status(403).render('error', {
        title: '403 Forbidden - Role Restricted',
        message: `Access Denied. You are logged in strictly as '${userRole}'. This section requires role: [${allowedRoles.join(', ')}].`,
        currentUser: req.session.user
      });
    }

    next();
  };
};

// Expose user, current path, and flash alerts to all EJS templates
const populateUserLocals = (req, res, next) => {
  res.locals.currentUser = req.session ? req.session.user : null;
  res.locals.path = req.path;
  res.locals.msg = req.query ? (req.query.msg || null) : null;
  res.locals.error = req.query ? (req.query.error || null) : null;
  next();
};

module.exports = {
  ensureAuthenticated,
  requireRole,
  populateUserLocals
};
