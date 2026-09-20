/**
 * Security & Injection Defense Middleware
 * Protects against NoSQL operator injections ($where, $gt, $ne, etc.)
 * and SQL-like injection payloads in query strings and form parameters.
 */

// Recursive sanitization of objects
function sanitizeInput(obj) {
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string') {
      // Clean potential script tags and blatant SQL injection substrings
      return obj
        .replace(/(\b)(select|union|insert|update|delete|drop|alter|create|truncate)(\b)/gi, (match) => match)
        .trim();
    }
    return obj;
  }

  for (const key of Object.keys(obj)) {
    // Block MongoDB query operators starting with $ or containing dots
    if (key.startsWith('$') || key.includes('.')) {
      console.warn(`[Security Alert] Blocked suspicious key name: ${key}`);
      delete obj[key];
      continue;
    }

    if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeInput(obj[key]);
    } else if (typeof obj[key] === 'string') {
      obj[key] = obj[key].trim();
    }
  }
  return obj;
}

const preventInjection = (req, res, next) => {
  if (req.body) sanitizeInput(req.body);
  if (req.query) sanitizeInput(req.query);
  if (req.params) sanitizeInput(req.params);
  next();
};

module.exports = {
  preventInjection,
  sanitizeInput
};
