import { z } from 'zod';

export const authSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: 'Email inválido' })
    .max(255, { message: 'Email muito longo' }),
  password: z
    .string()
    .min(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
    .max(100, { message: 'Senha muito longa' }),
  fullName: z
    .string()
    .trim()
    .min(1, { message: 'Nome não pode estar vazio' })
    .max(100, { message: 'Nome muito longo' })
    .optional(),
});

export const clientInfoSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'Nome do cliente é obrigatório' })
    .max(200, { message: 'Nome muito longo' }),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data inválida' }),
  boletoValue: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, { message: 'Valor inválido' }),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data inválida' }),
});

export const eventSchema = z.object({
  icon: z
    .string()
    .trim()
    .min(1, { message: 'Ícone é obrigatório' })
    .max(10, { message: 'Ícone muito longo' }),
  iconSize: z
    .string()
    .trim()
    .min(1, { message: 'Tamanho do ícone é obrigatório' }),
  date: z
    .string()
    .trim()
    .min(1, { message: 'Data é obrigatória' })
    .max(20, { message: 'Data muito longa' }),
  description: z
    .string()
    .trim()
    .max(1000, { message: 'Descrição muito longa' }),
  position: z.enum(['top', 'bottom']),
  status: z.enum(['created', 'resolved', 'no_response']),
});

export const organizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'Nome da organização é obrigatório' })
    .max(100, { message: 'Nome muito longo (máximo 100 caracteres)' }),
});
