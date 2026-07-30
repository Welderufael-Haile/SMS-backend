const validator = require("validator");

// Fields that contain rich text or URLs — escape would mangle them
const SKIP_ESCAPE_FIELDS = new Set([
  'description', 'subtitle', 'body', 'content', 'message', 'text', 'note', 'notes', 'remarks'
]);

exports.sanitizeInput = (req, res, next) => {

  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === "string") {
        if (SKIP_ESCAPE_FIELDS.has(key)) {
          // Strip only actual HTML tags (<script>, <img>, etc.) without encoding slashes or quotes
          obj[key] = obj[key].replace(/<[^>]*>/g, '');
        } else {
          // Escape dangerous characters for short fields (email, name, title, etc.)
          obj[key] = validator.escape(obj[key]);
        }
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};