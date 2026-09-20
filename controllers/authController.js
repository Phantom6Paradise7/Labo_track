const User = require('../models/User');

// Render Login
const getLogin = (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  const msg = req.query.msg || null;
  const error = req.query.error || null;
  res.render('auth/login', {
    title: 'Sign In — LaboTrack',
    msg,
    error
  });
};

// Process Login with Strict Role Enforcing
const postLogin = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.render('auth/login', {
        title: 'Sign In — LaboTrack',
        error: 'Please provide both email and password.',
        msg: null
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.render('auth/login', {
        title: 'Sign In — LaboTrack',
        error: 'Invalid email or password credentials.',
        msg: null
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('auth/login', {
        title: 'Sign In — LaboTrack',
        error: 'Invalid email or password credentials.',
        msg: null
      });
    }

    // STRICT SINGLE-ROLE ENFORCEMENT: 3 designated roles (admin, requester, lab_incharge)
    const effectiveRole = (user.role === 'supplier') ? 'admin' : user.role;
    if (role && role !== effectiveRole) {
      const roleDisplayNames = {
        admin: 'System Administrator (Full Control)',
        requester: 'Staff / Student (Requester)',
        lab_incharge: 'Lab In-charge (Issue & Inspection)'
      };

      return res.render('auth/login', {
        title: 'Sign In — LaboTrack',
        error: `Role Mismatch: Your account is authorized as "${roleDisplayNames[effectiveRole] || effectiveRole}". You cannot sign in under "${roleDisplayNames[role] || role}".`,
        msg: null
      });
    }

    // Set secure session with effectiveRole
    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: effectiveRole,
      department: user.department,
      studentOrStaffId: user.studentOrStaffId,
      supplierCompany: user.supplierCompany
    };

    // Smart role-based redirection
    if (effectiveRole === 'admin') {
      return res.redirect('/dashboard');
    } else if (effectiveRole === 'lab_incharge') {
      return res.redirect('/requests/manage');
    } else {
      return res.redirect('/assets');
    }
  } catch (err) {
    console.error('Login error:', err);
    return res.render('auth/login', {
      title: 'Sign In — LaboTrack',
      error: 'An unexpected authentication error occurred. Please try again.',
      msg: null
    });
  }
};

// Render Register
const getRegister = (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('auth/register', {
    title: 'Create Account — LaboTrack',
    error: null,
    msg: null
  });
};

// Process Register
const postRegister = async (req, res) => {
  try {
    const { name, email, password, role, department, studentOrStaffId, supplierCompany } = req.body;

    if (!name || !email || !password || !role) {
      return res.render('auth/register', {
        title: 'Create Account — LaboTrack',
        error: 'Please fill in all mandatory fields.',
        msg: null
      });
    }

    // Password format and length check
    if (password.length < 8) {
      return res.render('auth/register', {
        title: 'Create Account — LaboTrack',
        error: 'Password must be at least 8 characters long.',
        msg: null
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.render('auth/register', {
        title: 'Create Account — LaboTrack',
        error: 'An account with this email address already exists. Please sign in.',
        msg: null
      });
    }

    const validRoles = ['requester', 'lab_incharge', 'admin', 'supplier'];
    if (!validRoles.includes(role)) {
      return res.render('auth/register', {
        title: 'Create Account — LaboTrack',
        error: 'Invalid role selection.',
        msg: null
      });
    }

    const assignedRole = (role === 'supplier') ? 'admin' : role;

    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: assignedRole,
      department: department ? department.trim() : 'General Sciences',
      studentOrStaffId: studentOrStaffId ? studentOrStaffId.trim() : '',
      supplierCompany: supplierCompany ? supplierCompany.trim() : ''
    });

    await newUser.save();

    // Auto-login upon registration
    req.session.user = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      department: newUser.department,
      studentOrStaffId: newUser.studentOrStaffId,
      supplierCompany: newUser.supplierCompany
    };

    if (newUser.role === 'admin') return res.redirect('/dashboard');
    if (newUser.role === 'lab_incharge') return res.redirect('/requests/manage');
    if (newUser.role === 'supplier') return res.redirect('/supplier');
    return res.redirect('/assets');
  } catch (err) {
    console.error('Registration error:', err);
    return res.render('auth/register', {
      title: 'Create Account — LaboTrack',
      error: 'Registration failed: ' + err.message,
      msg: null
    });
  }
};

// Logout
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Session destruction error:', err);
    res.clearCookie('connect.sid');
    res.redirect('/auth/login?msg=You%20have%20successfully%20signed%20out.');
  });
};

module.exports = {
  getLogin,
  postLogin,
  getRegister,
  postRegister,
  logout
};
