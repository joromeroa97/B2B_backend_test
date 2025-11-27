import Joi from 'joi';

export const createProductSchema = Joi.object({
  sku: Joi.string().max(100).required(),
  name: Joi.string().max(255).required(),
  price_cents: Joi.number().integer().min(0).required(),
  stock: Joi.number().integer().min(0).required(),
});

export const updateProductSchema = Joi.object({
  name: Joi.string().max(255),
  price_cents: Joi.number().integer().min(0),
  stock: Joi.number().integer().min(0),
}).min(1);
