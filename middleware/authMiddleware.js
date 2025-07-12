const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET;

// Middleware to verify JWT token from cookie
exports.verifyToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    console.log('❌ No token in request cookies');
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    console.log('✅ Token verified:', decoded);
    next();
  } catch (err) {
    console.log('❌ Token verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid token.' }); // Use 401 (not 400)
  }
};

// Middleware to restrict access to specific roles
exports.requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No user in request' });
    }

    if (!roles.includes(req.user.role)) {
      console.log(`❌ Role "${req.user.role}" not allowed`);
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }

    next();
  };
};
