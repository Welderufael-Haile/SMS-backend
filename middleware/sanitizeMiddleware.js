const validator = require("validator");

exports.sanitizeInput = (req, res, next) => {

  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === "string") {

        // Remove dangerous characters
        obj[key] = validator.escape(obj[key]);

      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};