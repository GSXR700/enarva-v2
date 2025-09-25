// lib/validations/index.ts - CLEAN CENTRAL VALIDATION EXPORTS
// This file provides a single import point for all validation modules

import { z } from 'zod';

// =============================================================================
// MISSION VALIDATIONS
// =============================================================================
export {
  missionUpdateValidationSchema,
  missionCreationValidationSchema,
  completeMissionValidationSchema,
  validateMissionUpdate,
  validateMissionCreation,
  validateCompleteMission,
  cleanMissionData,
  type MissionUpdateInput,
  type MissionCreationInput,
  type CompleteMissionInput,
  type CreateMissionInput,
  type TaskInput
} from './mission-validation';

// =============================================================================
// LEAD VALIDATIONS
// =============================================================================
export {
  completeLeadValidationSchema,
  validateCompleteLeadInput,
  validateLeadCreation,
  validateLeadUpdate,
  cleanLeadData,
  type CompleteLeadInput,
  type LeadUpdateInput,
  type CreateLeadInput
} from './lead-validation';

// =============================================================================
// QUOTE VALIDATIONS
// =============================================================================
export {
  completeQuoteValidationSchema,
  quoteUpdateValidationSchema,
  validateCompleteQuoteInput,
  validateQuoteUpdate,
  validateQuoteCreation,
  cleanQuoteData,
  type CompleteQuoteInput,
  type QuoteUpdateInput,
  type CreateQuoteInput,
  type LineItemInput,
  type ServiceInput
} from './quote-validation';

// =============================================================================
// TEAM VALIDATIONS
// =============================================================================
export {
  teamValidationSchema,
  teamMemberValidationSchema,
  completeTeamMemberValidationSchema,
  validateCompleteTeamInput,
  validateTeamMemberInput,
  validateCompleteTeamMemberInput,
  validateTeamCreation,
  validateTeamUpdate,
  cleanTeamData,
  cleanTeamMemberData,
  type CompleteTeamInput,
  type TeamMemberInput,
  type CompleteTeamMemberInput,
  type CreateTeamInput,
  type CreateTeamMemberInput
} from './team-validation';

// =============================================================================
// USER VALIDATIONS
// =============================================================================
export {
  userValidationSchema,
  userCreationValidationSchema,
  userUpdateValidationSchema,
  passwordChangeValidationSchema,
  loginValidationSchema,
  registrationValidationSchema,
  accountValidationSchema,
  sessionValidationSchema,
  validateCompleteUserInput,
  validateUserCreation,
  validateUserUpdate,
  validateLogin,
  validateRegistration,
  validatePasswordChange,
  validateCompleteAccountInput,
  validateCompleteSessionInput,
  cleanUserData,
  validateEmail,
  validatePassword,
  type CompleteUserInput,
  type UserCreationInput,
  type UserUpdateInput,
  type LoginInput,
  type RegistrationInput,
  type PasswordChangeInput,
  type CompleteAccountInput,
  type CompleteSessionInput,
  type CreateUserInput
} from './user-validation';

// =============================================================================
// TASK VALIDATIONS
// =============================================================================
export {
  taskValidationSchema,
  taskTemplateValidationSchema,
  qualityCheckValidationSchema,
  validateCompleteTaskInput,
  validateCompleteTaskTemplateInput,
  validateCompleteQualityCheckInput,
  validateTaskCreation,
  validateTaskUpdate,
  cleanTaskData,
  type CompleteTaskInput,
  type CompleteTaskTemplateInput,
  type CompleteQualityCheckInput,
  type CreateTaskInput
} from './task-validation';

// =============================================================================
// EXPENSE VALIDATIONS
// =============================================================================
export {
  expenseValidationSchema,
  validateCompleteExpenseInput,
  validateExpenseCreation,
  validateExpenseUpdate,
  cleanExpenseData,
  type CompleteExpenseInput,
  type CreateExpenseInput
} from './expense-validation';

// =============================================================================
// INVOICE VALIDATIONS
// =============================================================================
export {
  invoiceValidationSchema,
  validateCompleteInvoiceInput,
  validateInvoiceCreation,
  validateInvoiceUpdate,
  cleanInvoiceData,
  type CompleteInvoiceInput,
  type CreateInvoiceInput,
  type InvoiceLineItem
} from './invoice-validation';

// =============================================================================
// INVENTORY VALIDATIONS
// =============================================================================
export {
  inventoryValidationSchema,
  inventoryUsageValidationSchema,
  validateCompleteInventoryInput,
  validateInventoryCreation,
  validateInventoryUpdate,
  validateCompleteInventoryUsageInput,
  validateInventoryUsageCreation,
  cleanInventoryData,
  cleanInventoryUsageData,
  type CompleteInventoryInput,
  type CompleteInventoryUsageInput,
  type CreateInventoryInput,
  type CreateInventoryUsageInput
} from './inventory-validation';

// =============================================================================
// SYSTEM & ACTIVITY VALIDATIONS
// =============================================================================
export {
  activityValidationSchema,
  conversationValidationSchema,
  messageValidationSchema,
  systemLogValidationSchema,
  completeFieldReportValidationSchema,
  completeSubscriptionValidationSchema,
  validateCompleteActivityInput,
  validateCompleteConversationInput,
  validateCompleteMessageInput,
  validateCompleteSystemLogInput,
  validateCompleteFieldReportInput,
  validateCompleteSubscriptionInput,
  cleanFieldReportData,
  cleanSubscriptionData,
  type CompleteActivityInput,
  type CompleteConversationInput,
  type CompleteMessageInput,
  type CompleteSystemLogInput,
  type CompleteFieldReportInput,
  type CompleteSubscriptionInput,
  type CreateFieldReportInput,
  type CreateSubscriptionInput,
  type CreateActivityInput
} from './system-validation';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function formatValidationErrors(errors: z.ZodIssue[]): string[] {
  return errors.map(error => {
    const path = error.path.join('.')
    return `${path}: ${error.message}`
  })
}

export function validateDateNotInPast(date: string | Date): boolean {
  try {
    const inputDate = new Date(date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return !isNaN(inputDate.getTime()) && inputDate >= now;
  } catch {
    return false;
  }
}

export function validatePhoneNumber(phone: string): boolean {
  if (phone === 'À renseigner' || phone === 'Non renseigné') return true;
  const phoneRegex = /^[+]?[\d\s\-().]+$/;
  return phoneRegex.test(phone) && phone.length >= 10;
}