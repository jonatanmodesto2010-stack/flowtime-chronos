import { z } from 'zod';

export const authSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: 'Email inválido' })
    .max(255, { message: 'Email muito longo' }),
  password: z
    .string()
    .min(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
    .max(100, { message: 'Senha muito longa' })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { 
      message: 'Senha deve conter letras maiúsculas, minúsculas e números' 
    }),
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
    .max(150, { message: 'Nome muito longo (máximo 150 caracteres)' }),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data inválida' }),
  boletoValue: z
    .string()
    .refine((val) => val === '' || /^\d+(\.\d{1,2})?$/.test(val), { 
      message: 'Valor inválido' 
    })
    .refine((val) => val === '' || parseFloat(val) > 0, {
      message: 'Valor deve ser maior que zero'
    }),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data inválida' }),
});

export const boletoSchema = z.object({
  boleto_value: z
    .number()
    .positive({ message: 'Valor deve ser maior que zero' }),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data inválida' }),
  status: z.enum(['pendente', 'pago', 'vencido']),
  description: z
    .string()
    .trim()
    .max(200, { message: 'Descrição muito longa (máximo 200 caracteres)' })
    .optional()
    .or(z.literal('')),
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
    .max(150, { message: 'Descrição muito longa (máximo 150 caracteres)' })
    .optional()
    .or(z.literal('')),
  position: z.enum(['top', 'bottom']),
  status: z.enum(['created', 'resolved', 'no_response']),
});

export const organizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'Nome da organização é obrigatório' })
    .max(150, { message: 'Nome muito longo (máximo 150 caracteres)' }),
});

export const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, { message: 'Nome completo é obrigatório' })
    .max(150, { message: 'Nome muito longo (máximo 150 caracteres)' }),
  phone: z
    .string()
    .trim()
    .regex(/^[\d\s\+\-\(\)]+$/, { message: 'Formato de telefone inválido' })
    .max(20, { message: 'Telefone muito longo' })
    .optional()
    .or(z.literal('')),
});

export const tagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'Nome da tag é obrigatório' })
    .max(50, { message: 'Nome muito longo (máximo 50 caracteres)' }),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, { message: 'Cor inválida (use formato #RRGGBB)' }),
});

export const passwordChangeSchema = z.object({
  currentPassword: z
    .string()
    .min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }),
  newPassword: z
    .string()
    .min(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
    .max(100, { message: 'Senha muito longa' })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { 
      message: 'Senha deve conter letras maiúsculas, minúsculas e números' 
    }),
  confirmPassword: z
    .string()
    .min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

export const editUserSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, { message: 'Nome é obrigatório' })
    .max(100, { message: 'Nome muito longo' }),
  role: z.enum(['admin', 'member', 'viewer']),
});
