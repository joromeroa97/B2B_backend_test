import Joi from 'joi';

export const createOrderSchema = Joi.object({
  customer_id: Joi.number().integer().positive().required(),
  items: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.number().integer().positive().required(),
        qty: Joi.number().integer().min(1).required(),
      })
    )
    .min(1)
    .required(),
});

export const listOrdersSchema = Joi.object({
  status: Joi.string().valid('CREATED', 'CONFIRMED', 'CANCELED').optional(),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});
