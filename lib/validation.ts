import { z } from 'zod';
import {
    LeadType,
    LeadCanal,
    PropertyType,
    AccessibilityLevel,
    UrgencyLevel,
    Frequency,
    ContractType,
    ProviderType,
    EnarvaRole,
    MissionType,
    Priority,
    QuoteType,
    TaskCategory
} from '@prisma/client';

// Sanitization helper to trim strings
const trimmedString = z.string().trim();

/**
 * ============================================================================
 * LEAD SCHEMA
 * ============================================================================
 */
export const leadSchema = z.object({
  // Contact & Identity
  firstName: trimmedString.min(2, "Le prénom doit contenir au moins 2 caractères.").max(100),
  lastName: trimmedString.min(2, "Le nom de famille doit contenir au moins 2 caractères.").max(100),
  phone: trimmedString.regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, "Numéro de téléphone invalide"),
  email: z.string().email("Adresse email invalide").optional().nullable().or(z.literal('')),

  // Location
  address: trimmedString.max(500).optional().nullable(),
  gpsLocation: trimmedString.optional().nullable(),

  // Professional Details
  leadType: z.nativeEnum(LeadType).default('PARTICULIER'),
  company: trimmedString.max(200).optional().nullable(),
  iceNumber: trimmedString.max(50).optional().nullable(),
  activitySector: trimmedString.max(100).optional().nullable(),

  // Request Details
  propertyType: z.nativeEnum(PropertyType).optional().nullable(),
  estimatedSurface: z.number().int().positive("La surface doit être un nombre positif.").optional().nullable(),
  accessibility: z.nativeEnum(AccessibilityLevel).optional().nullable(),
  urgencyLevel: z.nativeEnum(UrgencyLevel).optional().nullable(),
  budgetRange: trimmedString.max(100).optional().nullable(),
  frequency: z.nativeEnum(Frequency).optional().nullable(),
  contractType: z.nativeEnum(ContractType).optional().nullable(),

  // Lead Origin
  channel: z.nativeEnum(LeadCanal),
  source: trimmedString.max(200).optional().nullable(),
  originalMessage: trimmedString.max(5000, "Le message original ne doit pas dépasser 5000 caractères."),

  // Assignment
  assignedToId: z.string().optional().nullable(),
});

export type CreateLeadInput = z.infer<typeof leadSchema>;


/**
 * ============================================================================
 * QUOTE SCHEMA
 * ============================================================================
 */
export const quoteSchema = z.object({
    leadId: z.string().min(1, "Lead ID is required."),
    type: z.nativeEnum(QuoteType).default('STANDARD'),
    propertyType: z.nativeEnum(PropertyType).optional().nullable(),
    surface: z.number().int().positive().optional().nullable(),
    levels: z.number().int().positive().default(1),
    lineItems: z.array(z.object({
        description: trimmedString.min(1, "La description est requise."),
        quantity: z.number().min(1, "La quantité doit être d'au moins 1."),
        unitPrice: z.number().min(0, "Le prix unitaire ne peut être négatif."),
        total: z.number(),
    })).min(1, "Au moins un élément de ligne est requis."),
    expiresAt: z.date().optional(),
});

export type CreateQuoteInput = z.infer<typeof quoteSchema>;

/**
 * ============================================================================
 * MISSION SCHEMA
 * ============================================================================
 */
export const missionSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  quoteId: z.string().optional().nullable(),
  teamLeaderId: z.string().min(1, "Team leader is required"),
  type: z.nativeEnum(MissionType).default('SERVICE'),
  taskTemplateId: z.string().optional().nullable(),
  address: trimmedString.min(5, "L'adresse est requise."),
  scheduledDate: z.coerce.date({ required_error: "La date de planification est requise." }),
  estimatedDuration: z.number().int().positive("La durée estimée doit être un nombre positif."),
  priority: z.nativeEnum(Priority).default('NORMAL'),
  accessNotes: trimmedString.max(1000).optional().nullable(),
});

export type CreateMissionInput = z.infer<typeof missionSchema>;