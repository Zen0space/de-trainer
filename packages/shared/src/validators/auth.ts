import { z } from 'zod';

// Validation schemas for auth inputs

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerBaseSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(1, 'Full name is required'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      'Username can only contain letters, numbers, dots, hyphens, and underscores'
    ),
});

export const registerTrainerSchema = registerBaseSchema.extend({
  role: z.literal('trainer'),
  trainer_code: z
    .string()
    .regex(/^TR\d{3}$/, 'Trainer code must be in format TR### (e.g., TR001)'),
  certification_id: z.string().optional(),
  specialization: z.string().optional(),
});

export const registerAthleteSchema = registerBaseSchema.extend({
  role: z.literal('athlete'),
  sport: z.string().min(1, 'Sport is required'),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'elite']).default('beginner'),
});

export const registerSchema = z.discriminatedUnion('role', [
  registerTrainerSchema,
  registerAthleteSchema,
]);

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Type exports from schemas
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterTrainerInput = z.infer<typeof registerTrainerSchema>;
export type RegisterAthleteInput = z.infer<typeof registerAthleteSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
