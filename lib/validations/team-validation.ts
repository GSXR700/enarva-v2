// lib/validations/team-validation.ts - FOCUSED TEAM VALIDATION
import { z } from 'zod';

// =============================================================================
// TEAM VALIDATION SCHEMAS
// =============================================================================

export const teamValidationSchema = z.object({
  name: z.string().min(2, 'Nom d\'équipe minimum 2 caractères').max(100, 'Nom d\'équipe trop long'),
  description: z.string().max(500, 'Description trop longue').optional().transform(val => val === '' ? null : val)
});

export const teamMemberValidationSchema = z.object({
  userId: z.string().min(1, 'User ID requis'),
  teamId: z.string().min(1, 'Team ID requis'),
  specialties: z.array(z.enum([
    'GENERAL_CLEANING', 'WINDOW_SPECIALIST', 'FLOOR_SPECIALIST',
    'LUXURY_SURFACES', 'EQUIPMENT_HANDLING', 'TEAM_MANAGEMENT',
    'QUALITY_CONTROL', 'DETAIL_FINISHING'
  ])).default([]),
  experience: z.enum(['JUNIOR', 'INTERMEDIATE', 'SENIOR', 'EXPERT']).default('JUNIOR'),
  availability: z.enum(['AVAILABLE', 'BUSY', 'OFF_DUTY', 'VACATION']).default('AVAILABLE'),
  hourlyRate: z.number().min(0, 'Taux horaire doit être positif').max(1000, 'Taux horaire trop élevé').optional(),
  isActive: z.boolean().default(true),
  joinedAt: z.date().default(() => new Date())
});

// Enhanced Team Member Validation with user creation
export const completeTeamMemberValidationSchema = z.object({
  // User information
  name: z.string()
    .min(1, 'Nom requis')
    .max(100, 'Nom trop long'),

  email: z.string()
    .email('Format email invalide')
    .max(100, 'Email trop long'),

  password: z.string()
    .min(8, 'Mot de passe minimum 8 caractères')
    .max(100, 'Mot de passe trop long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'),

  phone: z.string().min(10, 'Numéro de téléphone requis').max(20, 'Numéro de téléphone invalide').optional(),

  role: z.enum(['ADMIN', 'MANAGER', 'AGENT', 'TEAM_LEADER', 'TECHNICIAN']),

  // Team member specific information
  teamId: z.string()
    .min(1, 'ID d\'équipe requis'),

  specialties: z.array(z.enum([
    'GENERAL_CLEANING', 'WINDOW_SPECIALIST', 'FLOOR_SPECIALIST',
    'LUXURY_SURFACES', 'EQUIPMENT_HANDLING', 'TEAM_MANAGEMENT',
    'QUALITY_CONTROL', 'DETAIL_FINISHING'
  ])).default([]),

  experience: z.enum(['JUNIOR', 'INTERMEDIATE', 'SENIOR', 'EXPERT']),

  availability: z.enum(['AVAILABLE', 'BUSY', 'OFF_DUTY', 'VACATION'])
    .default('AVAILABLE'),

  hourlyRate: z.number()
    .min(0, 'Taux horaire doit être positif')
    .max(1000, 'Taux horaire trop élevé')
    .optional()
    .nullable(),

  isActive: z.boolean().default(true)
}).refine((data) => {
  // Custom validation: senior/expert roles should have hourly rate
  if (['SENIOR', 'EXPERT'].includes(data.experience) && !data.hourlyRate) {
    return false
  }
  return true
}, {
  message: "Un taux horaire est requis pour les niveaux Senior et Expert",
  path: ["hourlyRate"]
}).refine((data) => {
  // Custom validation: team leaders should have management specialty
  if (data.role === 'TEAM_LEADER' && !data.specialties.includes('TEAM_MANAGEMENT')) {
    return false
  }
  return true
}, {
  message: "Les chefs d'équipe doivent avoir la spécialité 'Gestion d'équipe'",
  path: ["specialties"]
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function cleanTeamData(data: any): any {
  const cleaned = { ...data };
  
  if (cleaned.description === '') {
    cleaned.description = null;
  }
  
  return cleaned;
}

export function cleanTeamMemberData(data: any): any {
  const cleaned = { ...data }

  if (cleaned.hourlyRate) {
    const rate = parseFloat(cleaned.hourlyRate);
    cleaned.hourlyRate = isNaN(rate) ? null : rate;
  }

  ['isActive'].forEach(field => {
    if (typeof cleaned[field] === 'string') {
      cleaned[field] = cleaned[field].toLowerCase() === 'true'
    }
  })

  if (cleaned.specialties && !Array.isArray(cleaned.specialties)) {
    cleaned.specialties = [];
  }

  return cleaned
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

export function validateCompleteTeamInput(data: any, isCreation = true) {
  if (isCreation) {
    return teamValidationSchema.safeParse(cleanTeamData(data));
  } else {
    return teamValidationSchema.partial().safeParse(cleanTeamData(data));
  }
}

export function validateTeamMemberInput(data: any, isCreation = true) {
  if (isCreation) {
    return teamMemberValidationSchema.safeParse(cleanTeamMemberData(data));
  } else {
    return teamMemberValidationSchema.partial().safeParse(cleanTeamMemberData(data));
  }
}

export function validateCompleteTeamMemberInput(data: any) {
  return completeTeamMemberValidationSchema.safeParse(cleanTeamMemberData(data));
}

export function validateTeamCreation(data: any) {
  return teamValidationSchema.safeParse(cleanTeamData(data));
}

export function validateTeamUpdate(data: any) {
  return teamValidationSchema.partial().safeParse(cleanTeamData(data));
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CompleteTeamInput = z.infer<typeof teamValidationSchema>;
export type TeamMemberInput = z.infer<typeof teamMemberValidationSchema>;
export type CompleteTeamMemberInput = z.infer<typeof completeTeamMemberValidationSchema>;
export type CreateTeamInput = CompleteTeamInput;
export type CreateTeamMemberInput = CompleteTeamMemberInput;