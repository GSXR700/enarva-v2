// lib/validations/mission-validation.ts - COMPLETE FIX WITH MISSING FIELDS
import { z } from 'zod';
import { MissionStatus, Priority, MissionType, TaskCategory, TaskType, TaskStatus } from '@prisma/client';

// =============================================================================
// MISSION VALIDATION SCHEMAS
// =============================================================================

// Task validation schema for use within mission validation
const taskValidationSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Titre requis').max(200, 'Titre trop long'),
  description: z.string()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  category: z.nativeEnum(TaskCategory),
  type: z.nativeEnum(TaskType),
  status: z.nativeEnum(TaskStatus).default('ASSIGNED'),
  priority: z.nativeEnum(Priority).default('NORMAL').optional(),
  estimatedTime: z.union([
    z.number().min(0),
    z.string().transform(val => {
      const num = parseInt(val);
      return isNaN(num) ? null : num;
    })
  ]).optional().nullable(),
  actualTime: z.union([
    z.number().min(0),
    z.string().transform(val => {
      const num = parseInt(val);
      return isNaN(num) ? null : num;
    })
  ]).optional().nullable(),
  assignedToId: z.string()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  notes: z.string()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
});

// FIXED: Complete mission update validation schema with ALL missing fields
export const missionUpdateValidationSchema = z.object({
  status: z.nativeEnum(MissionStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  type: z.nativeEnum(MissionType).optional(),

  // Date handling
  scheduledDate: z.union([
    z.string().datetime(),
    z.string().refine(val => {
      if (!val) return true;
      try {
        const date = new Date(val);
        return !isNaN(date.getTime());
      } catch {
        return false;
      }
    }, { message: "Format de date invalide" }),
    z.date().transform(d => d.toISOString())
  ]).optional(),

  // FIXED: Add missing actualStartTime and actualEndTime
  actualStartTime: z.union([
    z.string().datetime(),
    z.string().refine(val => {
      if (!val) return true;
      try {
        const date = new Date(val);
        return !isNaN(date.getTime());
      } catch {
        return false;
      }
    }, { message: "Format de date invalide" }),
    z.date().transform(d => d.toISOString())
  ]).optional().nullable(),

  actualEndTime: z.union([
    z.string().datetime(),
    z.string().refine(val => {
      if (!val) return true;
      try {
        const date = new Date(val);
        return !isNaN(date.getTime());
      } catch {
        return false;
      }
    }, { message: "Format de date invalide" }),
    z.date().transform(d => d.toISOString())
  ]).optional().nullable(),

  // Duration validation
  estimatedDuration: z.union([
    z.number().min(0.5, 'Durée minimale: 30 minutes').max(1440, 'Durée maximale: 1440 minutes'),
    z.string().transform(val => {
      const num = parseFloat(val);
      if (isNaN(num) || num < 0.5) {
        throw new Error('Durée invalide');
      }
      return num;
    })
  ]).optional(),

  address: z.string()
    .min(1, 'Adresse requise')
    .max(500, 'Adresse trop longue')
    .optional(),

  coordinates: z.string()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  accessNotes: z.string()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  teamLeaderId: z.string()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  teamId: z.string()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  // FIXED: Add all missing validation fields from your Prisma schema
  clientValidated: z.boolean().optional(),
  clientFeedback: z.string()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  clientRating: z.union([
    z.number().min(1).max(5),
    z.string().transform(val => {
      const num = parseInt(val);
      return isNaN(num) ? null : num;
    })
  ]).optional().nullable(),

  adminValidated: z.boolean().optional(),
  adminValidatedBy: z.string()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  adminValidatedAt: z.union([
    z.string().datetime(),
    z.date().transform(d => d.toISOString())
  ]).optional().nullable(),
  adminNotes: z.string()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  qualityScore: z.union([
    z.number().min(0).max(100),
    z.string().transform(val => {
      const num = parseInt(val);
      return isNaN(num) ? null : num;
    })
  ]).optional().nullable(),

  issuesFound: z.string()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  correctionRequired: z.boolean().optional(),

  // Invoice fields
  invoiceGenerated: z.boolean().optional(),
  invoiceId: z.string()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  // Tasks array
  tasks: z.array(taskValidationSchema).optional(),

}).passthrough().refine((data) => {
  // Custom validation: End time should be after start time
  if (data.actualStartTime && data.actualEndTime) {
    try {
      const startTime = new Date(data.actualStartTime);
      const endTime = new Date(data.actualEndTime);
      
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return false;
      }
      
      return endTime > startTime;
    } catch {
      return false;
    }
  }
  return true;
}, {
  message: "L'heure de fin doit être après l'heure de début",
  path: ["actualEndTime"]
});

// Mission creation schema (stricter validation)
export const missionCreationValidationSchema = z.object({
  leadId: z.string().min(1, 'Lead ID requis'),
  quoteId: z.string().optional().nullable(),
  teamLeaderId: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  
  scheduledDate: z.string()
    .min(1, 'Date programmée requise')
    .refine((date) => {
      try {
        const dateToValidate = date.includes('T') && !date.endsWith(':00') ?
          `${date}:00` : date;
        const parsedDate = new Date(dateToValidate);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return !isNaN(parsedDate.getTime()) && parsedDate >= now;
      } catch {
        return false;
      }
    }, {
      message: "Date programmée invalide ou dans le passé"
    }),

  estimatedDuration: z.union([
    z.number(),
    z.string().transform((val) => {
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error('Durée invalide');
      return num;
    })
  ]).refine((val) => val >= 0.5 && val <= 24, {
    message: 'La durée doit être entre 0.5 et 24 heures'
  }),

  address: z.string().min(1, 'Adresse requise').max(500, 'Adresse trop longue'),
  coordinates: z.string().optional().nullable(),
  accessNotes: z.string().optional().nullable(),
  priority: z.nativeEnum(Priority).default('NORMAL'),
  type: z.nativeEnum(MissionType).default('SERVICE'),
  taskTemplateId: z.string().optional().nullable(),
  adminNotes: z.string().optional().nullable(),
});

// Complete mission validation schema (for full creation with all fields)
export const completeMissionValidationSchema = z.object({
  missionNumber: z.string()
    .min(1, 'Numéro de mission requis')
    .max(50, 'Numéro de mission trop long')
    .optional(),

  status: z.nativeEnum(MissionStatus).default('SCHEDULED'),
  priority: z.nativeEnum(Priority).default('NORMAL'),
  type: z.nativeEnum(MissionType).default('SERVICE'),

  leadId: z.string().min(1, 'Lead ID requis'),
  
  scheduledDate: z.string()
    .min(1, 'Date programmée requise')
    .refine((date) => {
      try {
        const scheduledDate = new Date(date);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return !isNaN(scheduledDate.getTime()) && scheduledDate >= now;
      } catch (error) {
        return false;
      }
    }, {
      message: "La date programmée ne peut pas être dans le passé ou est invalide"
    }),

  estimatedDuration: z.number()
    .min(0.5, 'Durée minimale: 30 minutes')
    .max(24, 'Durée maximale: 24 heures'),

  address: z.string()
    .min(1, 'Adresse requise')
    .max(500, 'Adresse trop longue'),

  coordinates: z.string().optional().nullable().transform(val => val === '' ? null : val),
  accessNotes: z.string().optional().nullable().transform(val => val === '' ? null : val),
  quoteId: z.string().optional().nullable(),
  teamLeaderId: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  taskTemplateId: z.string().optional().nullable(),

  actualStartTime: z.string().datetime().optional().nullable(),
  actualEndTime: z.string().datetime().optional().nullable(),

  clientValidated: z.boolean().default(false),
  clientFeedback: z.string().optional().nullable().transform(val => val === '' ? null : val),
  clientRating: z.number().min(1).max(5).optional().nullable(),
  adminValidated: z.boolean().optional().nullable(),
  adminValidatedBy: z.string().optional().nullable().transform(val => val === '' ? null : val),
  adminNotes: z.string().optional().nullable().transform(val => val === '' ? null : val),
  qualityScore: z.number().min(0).max(100).optional().nullable(),
  issuesFound: z.string().optional().nullable().transform(val => val === '' ? null : val),
  correctionRequired: z.boolean().optional(),
  invoiceGenerated: z.boolean().default(false),
  invoiceId: z.string().optional().nullable().transform(val => val === '' ? null : val),

  tasks: z.array(taskValidationSchema).optional(),
});

// =============================================================================
// DATA CLEANING FUNCTION
// =============================================================================

export function cleanMissionData(data: any) {
  const cleaned = { ...data };

  // Handle duration conversion
  if (cleaned.estimatedDuration !== undefined) {
    const duration = typeof cleaned.estimatedDuration === 'string' 
      ? parseFloat(cleaned.estimatedDuration) 
      : cleaned.estimatedDuration;
    cleaned.estimatedDuration = isNaN(duration) ? null : duration;
  }

  if (cleaned.qualityScore !== undefined) {
    const score = typeof cleaned.qualityScore === 'string' 
      ? parseInt(cleaned.qualityScore, 10) 
      : cleaned.qualityScore;
    cleaned.qualityScore = isNaN(score) ? null : score;
  }

  if (cleaned.clientRating !== undefined) {
    const rating = typeof cleaned.clientRating === 'string' 
      ? parseInt(cleaned.clientRating, 10) 
      : cleaned.clientRating;
    cleaned.clientRating = isNaN(rating) ? null : rating;
  }

  // Handle boolean fields
  ['clientValidated', 'adminValidated', 'correctionRequired', 'invoiceGenerated'].forEach(field => {
    if (cleaned[field] !== undefined) {
      if (typeof cleaned[field] === 'string') {
        cleaned[field] = cleaned[field].toLowerCase() === 'true';
      }
    }
  });

  // Convert empty strings to null for optional fields
  const optionalStringFields = [
    'coordinates', 'accessNotes', 'quoteId', 'taskTemplateId',
    'adminNotes', 'issuesFound', 'clientFeedback', 'teamLeaderId', 
    'teamId', 'adminValidatedBy', 'invoiceId'
  ];

  optionalStringFields.forEach(field => {
    if (cleaned[field] === '') {
      cleaned[field] = null;
    }
  });

  // Handle datetime fields
  const datetimeFields = ['scheduledDate', 'actualStartTime', 'actualEndTime', 'adminValidatedAt'];
  datetimeFields.forEach(field => {
    if (cleaned[field]) {
      try {
        const dateValue = cleaned[field];
        if (typeof dateValue === 'string') {
          if (dateValue.includes('T') && !dateValue.includes(':00')) {
            cleaned[field] = `${dateValue}:00`;
          }
        }
      } catch (error) {
        console.warn(`Invalid datetime for field ${field}:`, cleaned[field]);
      }
    }
  });

  // Clean tasks if provided
  if (cleaned.tasks && Array.isArray(cleaned.tasks)) {
    cleaned.tasks = cleaned.tasks.map((task: any) => {
      const cleanedTask = { ...task };
      
      if (cleanedTask.estimatedTime !== undefined) {
        const time = parseFloat(cleanedTask.estimatedTime);
        cleanedTask.estimatedTime = isNaN(time) ? null : time;
      }
      
      if (cleanedTask.actualTime !== undefined) {
        const time = parseFloat(cleanedTask.actualTime);
        cleanedTask.actualTime = isNaN(time) ? null : time;
      }
      
      ['description', 'notes', 'assignedToId'].forEach(field => {
        if (cleanedTask[field] === '') {
          cleanedTask[field] = null;
        }
      });
      
      return cleanedTask;
    });
  }

  // Remove system fields that shouldn't be in updates
  delete cleaned.createdAt;
  delete cleaned.updatedAt;
  delete cleaned.missionNumber;
  delete cleaned.lead;
  delete cleaned.quote;
  delete cleaned.teamLeader;
  delete cleaned.team;

  return cleaned;
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

export function validateMissionUpdate(data: any) {
  return missionUpdateValidationSchema.safeParse(cleanMissionData(data));
}

export function validateMissionCreation(data: any) {
  return missionCreationValidationSchema.safeParse(cleanMissionData(data));
}

export function validateCompleteMission(data: any) {
  return completeMissionValidationSchema.safeParse(cleanMissionData(data));
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type MissionUpdateInput = z.infer<typeof missionUpdateValidationSchema>;
export type MissionCreationInput = z.infer<typeof missionCreationValidationSchema>;
export type CompleteMissionInput = z.infer<typeof completeMissionValidationSchema>;
export type TaskInput = z.infer<typeof taskValidationSchema>;

// Convenience exports
export type CreateMissionInput = MissionCreationInput;