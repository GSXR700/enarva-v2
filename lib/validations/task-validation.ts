// lib/validations/task-validation.ts - FOCUSED TASK VALIDATION
import { z } from 'zod';
import { TaskCategory, TaskType, TaskStatus, Priority } from '@prisma/client';

// =============================================================================
// TASK VALIDATION SCHEMAS
// =============================================================================

export const taskValidationSchema = z.object({
  title: z.string().min(1, 'Titre requis').max(200, 'Titre trop long'),
  description: z.string().max(1000, 'Description trop longue').optional().transform(val => val === '' ? null : val),
  category: z.nativeEnum(TaskCategory),
  type: z.nativeEnum(TaskType),
  status: z.nativeEnum(TaskStatus).default('ASSIGNED'),
  priority: z.nativeEnum(Priority).default('NORMAL'),
  estimatedDuration: z.number().min(0.1, 'Durée minimale: 0.1 heure').max(24, 'Durée maximale: 24 heures'),
  actualDuration: z.number().min(0).optional(),
  assignedToId: z.string().optional(),
  dueDate: z.date().optional(),
  completedAt: z.date().optional(),
  validatedAt: z.date().optional(),
  notes: z.string().max(1000, 'Notes trop longues').optional().transform(val => val === '' ? null : val),
  attachments: z.array(z.string().url()).default([]),
  missionId: z.string().min(1, 'Mission ID requis')
});

export const taskTemplateValidationSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(100, 'Nom trop long'),
  description: z.string().max(500, 'Description trop longue').optional().transform(val => val === '' ? null : val),
  tasks: z.any(), // JSON field containing task definitions
  category: z.nativeEnum(TaskCategory),
  isActive: z.boolean().default(true),
  estimatedDuration: z.number().min(0.1, 'Durée minimale: 0.1 heure').optional(),
  requiredSpecialties: z.array(z.string()).default([]),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT']).default('MEDIUM')
});

export const qualityCheckValidationSchema = z.object({
  missionId: z.string().min(1, 'Mission ID requis'),
  type: z.enum(['PRE_SERVICE', 'IN_PROGRESS', 'POST_SERVICE', 'CLIENT_FEEDBACK', 'INTERNAL_AUDIT', 'TEAM_LEADER_CHECK']),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'REQUIRES_REWORK']).default('PENDING'),
  checkedBy: z.string().optional(),
  checkedAt: z.date().optional(),
  notes: z.string().max(1000, 'Notes trop longues').optional().transform(val => val === '' ? null : val),
  photos: z.array(z.string().url()).default([]),
  issues: z.any().optional(),
  validatedAt: z.date().optional(),
  score: z.number().min(1, 'Score minimum: 1').max(5, 'Score maximum: 5').optional(),
  recommendations: z.string().max(1000, 'Recommandations trop longues').optional().transform(val => val === '' ? null : val)
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function cleanTaskData(data: any): any {
  const cleaned = { ...data };

  ['estimatedDuration', 'actualDuration'].forEach(field => {
    if (cleaned[field]) {
      const num = parseFloat(cleaned[field]);
      cleaned[field] = isNaN(num) ? null : num;
    }
  });

  ['dueDate', 'completedAt', 'validatedAt'].forEach(field => {
    if (cleaned[field] && typeof cleaned[field] === 'string') {
      cleaned[field] = new Date(cleaned[field]);
    }
  });

  if (cleaned.attachments && !Array.isArray(cleaned.attachments)) {
    cleaned.attachments = [];
  }

  return cleaned;
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

export function validateCompleteTaskInput(data: any, isCreation = true) {
  if (isCreation) {
    return taskValidationSchema.safeParse(cleanTaskData(data));
  } else {
    return taskValidationSchema.partial().safeParse(cleanTaskData(data));
  }
}

export function validateCompleteTaskTemplateInput(data: any, isCreation = true) {
  if (isCreation) {
    return taskTemplateValidationSchema.safeParse(data);
  } else {
    return taskTemplateValidationSchema.partial().safeParse(data);
  }
}

export function validateCompleteQualityCheckInput(data: any, isCreation = true) {
  if (isCreation) {
    return qualityCheckValidationSchema.safeParse(data);
  } else {
    return qualityCheckValidationSchema.partial().safeParse(data);
  }
}

export function validateTaskCreation(data: any) {
  return taskValidationSchema.safeParse(cleanTaskData(data));
}

export function validateTaskUpdate(data: any) {
  return taskValidationSchema.partial().safeParse(cleanTaskData(data));
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CompleteTaskInput = z.infer<typeof taskValidationSchema>;
export type CompleteTaskTemplateInput = z.infer<typeof taskTemplateValidationSchema>;
export type CompleteQualityCheckInput = z.infer<typeof qualityCheckValidationSchema>;
export type CreateTaskInput = CompleteTaskInput;