const Joi = require("joi");

exports.loginSchema = Joi.object({

  email: Joi.string()
    .email()
    .required(),

  password: Joi.string()
    .min(8)
    .max(100)
    .required()

});


exports.registerSchema = Joi.object({

  full_name: Joi.string()
    .min(3)
    .max(100)
    .required(),

  email: Joi.string()
    .email()
    .required(),

  password: Joi.string()
    .min(8)
    .required(),

  role: Joi.string()
    .required(),

  status: Joi.string()
    .valid("active", "inactive", "suspended")
});