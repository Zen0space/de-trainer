// Types
export * from './types/auth';
export * from './types/database';

// Validators (schemas only, not types - to avoid duplicate exports)
export {
  loginSchema,
  registerBaseSchema,
  registerTrainerSchema,
  registerAthleteSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './validators/auth';

// Re-export Zod inferred types with different names to avoid conflicts
export type {
  LoginInput,
  RegisterTrainerInput,
  RegisterAthleteInput,
  RegisterInput,
} from './validators/auth';
