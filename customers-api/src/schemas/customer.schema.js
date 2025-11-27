import Joi from 'joi';

// Para crear un customer
export const createCustomerSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  email: Joi.string().email().max(255).required(),
  phone: Joi.string().max(50).allow(null, ''),
});

// Para actualizar (parcial o total)
export const updateCustomerSchema = Joi.object({
  name: Joi.string().min(2).max(255),
  email: Joi.string().email().max(255),
  phone: Joi.string().max(50).allow(null, ''),
}).min(1); // al menos un campo
