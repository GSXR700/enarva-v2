// lib/validations/user-validation.ts - FOCUSED USER & AUTH VALIDATION
import { z } from 'zod';

// =============================================================================
// USER VALIDATION SCHEMAS
// =============================================================================

export const userValidationSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(100, 'Nom trop long').optional(),
  email: z.string().email('Format email invalide').max(100, 'Email trop long'),
  hashedPassword: z.string().min(8, 'Mot de passe minimum 8 caractères').optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'AGENT', 'TEAM_LEADER', 'TECHNICIAN']).default('TECHNICIAN'),
  onlineStatus: z.string().default('OFFLINE'),
  lastSeen: z.date().optional(),
  pushSubscription: z.any().optional(),
  phone: z.string().optional(),
  image: z.string().optional()
});

export const accountValidationSchema = z.object({
  userId: z.string().min(1, 'User ID requis'),
  type: z.string().min(1, 'Type requis'),
  provider: z.string().min(1, 'Provider requis'),
  providerAccountId: z.string().min(1, 'Provider Account ID requis'),
  refresh_token: z.string().optional(),
  access_token: z.string().optional(),
  expires_at: z.number().optional(),
  token_type: z.string().optional(),
  scope: z.string().optional(),
  id_token: z.string().optional(),
  session_state: z.string().optional()
});

export const sessionValidationSchema = z.object({
  sessionToken: z.string().min(1, 'Session token requis'),
  userId: z.string().min(1, 'User ID requis'),
  expires: z.date()
});

// Enhanced user creation schema
export const userCreationValidationSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(100, 'Nom trop long'),
  email: z.string().email('Format email invalide').max(100, 'Email trop long'),
  password: z.string()
    .min(8, 'Mot de passe minimum 8 caractères')
    .max(100, 'Mot de passe trop long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'),
  role: z.enum(['ADMIN', 'MANAGER', 'AGENT', 'TEAM_LEADER', 'TECHNICIAN']).default('TECHNICIAN'),
  phone: z.string().optional(),
  image: z.string().optional()
});

// User profile update schema
export const userUpdateValidationSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(100, 'Nom trop long').optional(),
  email: z.string().email('Format email invalide').max(100, 'Email trop long').optional(),
  phone: z.string().optional(),
  image: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'AGENT', 'TEAM_LEADER', 'TECHNICIAN']).optional(),
  onlineStatus: z.string().optional(),
  lastSeen: z.date().optional()
});

// Password change schema
export const passwordChangeValidationSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string()
    .min(8, 'Nouveau mot de passe minimum 8 caractères')
    .max(100, 'Nouveau mot de passe trop long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'),
  confirmPassword: z.string()
}).refine((data) => {
  return data.newPassword === data.confirmPassword;
}, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"]
}).refine((data) => {
  return data.currentPassword !== data.newPassword;
}, {
  message: "Le nouveau mot de passe doit être différent de l'actuel",
  path: ["newPassword"]
});

// Login validation schema
export const loginValidationSchema = z.object({
  email: z.string().email('Format email invalide'),
  password: z.string().min(1, 'Mot de passe requis')
});

// Registration validation schema
export const registrationValidationSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(100, 'Nom trop long'),
  email: z.string().email('Format email invalide').max(100, 'Email trop long'),
  password: z.string()
    .min(8, 'Mot de passe minimum 8 caractères')
    .max(100, 'Mot de passe trop long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "Vous devez accepter les conditions d'utilisation"
  })
}).refine((data) => {
  return data.password === data.confirmPassword;
}, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"]
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function cleanUserData(data: any): any {
  const cleaned = { ...data };

  // Convert empty strings to null for optional fields
  const optionalFields = ['phone', 'image', 'name'];
  optionalFields.forEach(field => {
    if (cleaned[field] === '') {
      cleaned[field] = null;
    }
  });

  // Handle dates
  if (cleaned.lastSeen && typeof cleaned.lastSeen === 'string') {
    cleaned.lastSeen = new Date(cleaned.lastSeen);
  }

  // Remove password from updates if empty (keep existing)
  if (cleaned.hashedPassword === '' || cleaned.hashedPassword === undefined) {
    delete cleaned.hashedPassword;
  }

  // Remove system fields that shouldn't be in updates
  delete cleaned.createdAt;
  delete cleaned.updatedAt;
  delete cleaned.accounts;
  delete cleaned.sessions;

  return cleaned;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une lettre minuscule');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une lettre majuscule');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

export function validateCompleteUserInput(data: any, isCreation = true) {
  if (isCreation) {
    return userCreationValidationSchema.safeParse(cleanUserData(data));
  } else {
    return userUpdateValidationSchema.safeParse(cleanUserData(data));
  }
}

export function validateUserCreation(data: any) {
  return userCreationValidationSchema.safeParse(cleanUserData(data));
}

export function validateUserUpdate(data: any) {
  return userUpdateValidationSchema.safeParse(cleanUserData(data));
}

export function validateLogin(data: any) {
  return loginValidationSchema.safeParse(data);
}

export function validateRegistration(data: any) {
  return registrationValidationSchema.safeParse(data);
}

export function validatePasswordChange(data: any) {
  return passwordChangeValidationSchema.safeParse(data);
}

export function validateCompleteAccountInput(data: any) {
  return accountValidationSchema.safeParse(data);
}

export function validateCompleteSessionInput(data: any) {
  return sessionValidationSchema.safeParse(data);
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CompleteUserInput = z.infer<typeof userValidationSchema>;
export type UserCreationInput = z.infer<typeof userCreationValidationSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateValidationSchema>;
export type LoginInput = z.infer<typeof loginValidationSchema>;
export type RegistrationInput = z.infer<typeof registrationValidationSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeValidationSchema>;
export type CompleteAccountInput = z.infer<typeof accountValidationSchema>;
export type CompleteSessionInput = z.infer<typeof sessionValidationSchema>;
export type CreateUserInput = UserCreationInput;