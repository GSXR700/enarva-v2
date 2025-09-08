// lib/validation.ts - CORRECTED FOR FLEXIBLE UPDATES
import { z } from 'zod';

export const leadValidationSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis').max(50, 'Prénom trop long').optional(),
  lastName: z.string().min(1, 'Nom requis').max(50, 'Nom trop long').optional(),
  phone: z.string().min(10, 'Téléphone requis').max(20, 'Téléphone invalide').optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  address: z.string().max(200, 'Adresse trop longue').optional(),
  gpsLocation: z.string().optional(),
  status: z.enum([
    'NEW', 'TO_QUALIFY', 'WAITING_INFO', 'QUALIFIED', 'VISIT_PLANNED', 'ON_VISIT',
    'VISIT_DONE', 'QUOTE_SENT', 'QUOTE_ACCEPTED', 'QUOTE_REFUSED', 'MISSION_SCHEDULED',
    'IN_PROGRESS', 'COMPLETED', 'INTERVENTION_PLANNED', 'INTERVENTION_IN_PROGRESS',
    'INTERVENTION_DONE', 'QUALITY_CONTROL', 'CLIENT_TO_CONFIRM_END', 'CLIENT_CONFIRMED',
    'DELIVERY_PLANNED', 'DELIVERY_DONE', 'SIGNED_DELIVERY_NOTE', 'PENDING_PAYMENT',
    'PAID_OFFICIAL', 'PAID_CASH', 'REFUNDED', 'PENDING_REFUND', 'FOLLOW_UP_SENT',
    'UPSELL_IN_PROGRESS', 'UPSELL_CONVERTED', 'REWORK_PLANNED', 'REWORK_DONE',
    'UNDER_WARRANTY', 'AFTER_SALES_SERVICE', 'CLIENT_ISSUE', 'IN_DISPUTE',
    'CLIENT_PAUSED', 'LEAD_LOST', 'CANCELLED', 'CANCELED_BY_CLIENT',
    'CANCELED_BY_ENARVA', 'INTERNAL_REVIEW', 'AWAITING_PARTS', 'CONTRACT_SIGNED',
    'UNDER_CONTRACT', 'SUBCONTRACTED', 'OUTSOURCED', 'WAITING_THIRD_PARTY',
    'PRODUCT_ONLY', 'PRODUCT_SUPPLIER', 'DELIVERY_ONLY', 'AFFILIATE_LEAD',
    'SUBCONTRACTOR_LEAD'
  ]).optional(),
  leadType: z.enum(['PARTICULIER', 'PROFESSIONNEL', 'PUBLIC', 'NGO', 'SYNDIC', 'OTHER']).optional(),
  company: z.string().max(100, 'Nom d\'entreprise trop long').optional(),
  iceNumber: z.string().max(50, 'Numéro ICE trop long').optional(),
  activitySector: z.string().max(100, 'Secteur d\'activité trop long').optional(),
  contactPosition: z.string().max(100, 'Poste de contact trop long').optional(),
  department: z.string().max(100, 'Département trop long').optional(),
  propertyType: z.enum([
    'APARTMENT_SMALL', 'APARTMENT_MEDIUM', 'APARTMENT_MULTI', 'APARTMENT_LARGE',
    'VILLA_SMALL', 'VILLA_MEDIUM', 'VILLA_LARGE', 'PENTHOUSE', 'COMMERCIAL',
    'STORE', 'HOTEL_STANDARD', 'HOTEL_LUXURY', 'OFFICE', 'RESIDENCE_B2B',
    'BUILDING', 'RESTAURANT', 'WAREHOUSE', 'OTHER'
  ]).optional().nullable(),
  estimatedSurface: z.number().min(1, 'Surface estimée doit être positive').max(10000, 'Surface trop grande').optional(),
  accessibility: z.enum(['EASY', 'MEDIUM', 'MODERATE', 'DIFFICULT', 'VERY_DIFFICULT']).optional(),
  urgencyLevel: z.enum(['LOW', 'NORMAL', 'URGENT', 'HIGH_URGENT', 'IMMEDIATE']).optional().nullable(),
  budgetRange: z.string().max(50, 'Gamme de budget trop longue').optional(),
  frequency: z.enum([
    'PONCTUEL', 'HEBDOMADAIRE', 'MENSUEL', 'BIMENSUEL', 'TRIMESTRIEL',
    'QUARTANNE', 'SEMESTRIEL', 'ANNUEL', 'CONTRAT_CADRE', 'RECURRING', 'AUTRE'
  ]).optional(),
  contractType: z.enum([
    'INTERVENTION_UNIQUE', 'MAINTENANCE', 'ABONNEMENT', 'CONTRAT_CADRE', 'RECURRING', 'AUTRE'
  ]).optional(),
  needsProducts: z.boolean().optional(),
  needsEquipment: z.boolean().optional(),
  providedBy: z.enum(['ENARVA', 'CLIENT', 'MIXTE']).optional(),
  channel: z.enum([
    'WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'GOOGLE_MAPS', 'GOOGLE_SEARCH',
    'SITE_WEB', 'FORMULAIRE_SITE', 'MARKETPLACE', 'YOUTUBE', 'EMAIL',
    'APPORTEUR_AFFAIRES', 'COMMERCIAL_TERRAIN', 'SALON_PROFESSIONNEL', 'PARTENARIAT',
    'RECOMMANDATION_CLIENT', 'VISITE_BUREAU', 'EMPLOYE_ENARVA', 'APPEL_TELEPHONIQUE',
    'SMS', 'NUMERO_SUR_PUB', 'AFFICHE', 'FLYER', 'ENSEIGNE', 'VOITURE_SIGLEE',
    'RADIO', 'ANNONCE_PRESSE', 'TELE', 'MANUEL', 'SOURCING_INTERNE', 'PORTE_A_PORTE',
    'CHANTIER_EN_COURS'
  ]).optional(),
  source: z.string().max(100, 'Source trop longue').optional(),
  hasReferrer: z.boolean().optional(),
  referrerContact: z.string().max(100, 'Contact référent trop long').optional(),
  enarvaRole: z.enum(['PRESTATAIRE_PRINCIPAL', 'SOUS_TRAITANT', 'CO_TRAITANT', 'AUTRE']).optional(),
  originalMessage: z.string().min(1, 'Message original requis').optional(),
  assignedToId: z.string().optional().nullable(),
  materials: z.any().optional().nullable(),
  score: z.number().min(0).max(100).optional(),
});

// Create a strict version for creation with required fields
export const leadCreationValidationSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis').max(50, 'Prénom trop long'),
  lastName: z.string().min(1, 'Nom requis').max(50, 'Nom trop long'),
  phone: z.string().min(10, 'Téléphone requis').max(20, 'Téléphone invalide'),
  channel: z.enum([
    'WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'GOOGLE_MAPS', 'GOOGLE_SEARCH',
    'SITE_WEB', 'FORMULAIRE_SITE', 'MARKETPLACE', 'YOUTUBE', 'EMAIL',
    'APPORTEUR_AFFAIRES', 'COMMERCIAL_TERRAIN', 'SALON_PROFESSIONNEL', 'PARTENARIAT',
    'RECOMMANDATION_CLIENT', 'VISITE_BUREAU', 'EMPLOYE_ENARVA', 'APPEL_TELEPHONIQUE',
    'SMS', 'NUMERO_SUR_PUB', 'AFFICHE', 'FLYER', 'ENSEIGNE', 'VOITURE_SIGLEE',
    'RADIO', 'ANNONCE_PRESSE', 'TELE', 'MANUEL', 'SOURCING_INTERNE', 'PORTE_A_PORTE',
    'CHANTIER_EN_COURS'
  ]),
  originalMessage: z.string().min(1, 'Message original requis'),
  // All other fields from the base schema
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  address: z.string().max(200, 'Adresse trop longue').optional(),
  gpsLocation: z.string().optional(),
  status: z.enum([
    'NEW', 'TO_QUALIFY', 'WAITING_INFO', 'QUALIFIED', 'VISIT_PLANNED', 'ON_VISIT',
    'VISIT_DONE', 'QUOTE_SENT', 'QUOTE_ACCEPTED', 'QUOTE_REFUSED', 'MISSION_SCHEDULED',
    'IN_PROGRESS', 'COMPLETED', 'INTERVENTION_PLANNED', 'INTERVENTION_IN_PROGRESS',
    'INTERVENTION_DONE', 'QUALITY_CONTROL', 'CLIENT_TO_CONFIRM_END', 'CLIENT_CONFIRMED',
    'DELIVERY_PLANNED', 'DELIVERY_DONE', 'SIGNED_DELIVERY_NOTE', 'PENDING_PAYMENT',
    'PAID_OFFICIAL', 'PAID_CASH', 'REFUNDED', 'PENDING_REFUND', 'FOLLOW_UP_SENT',
    'UPSELL_IN_PROGRESS', 'UPSELL_CONVERTED', 'REWORK_PLANNED', 'REWORK_DONE',
    'UNDER_WARRANTY', 'AFTER_SALES_SERVICE', 'CLIENT_ISSUE', 'IN_DISPUTE',
    'CLIENT_PAUSED', 'LEAD_LOST', 'CANCELLED', 'CANCELED_BY_CLIENT',
    'CANCELED_BY_ENARVA', 'INTERNAL_REVIEW', 'AWAITING_PARTS', 'CONTRACT_SIGNED',
    'UNDER_CONTRACT', 'SUBCONTRACTED', 'OUTSOURCED', 'WAITING_THIRD_PARTY',
    'PRODUCT_ONLY', 'PRODUCT_SUPPLIER', 'DELIVERY_ONLY', 'AFFILIATE_LEAD',
    'SUBCONTRACTOR_LEAD'
  ]).optional(),
  leadType: z.enum(['PARTICULIER', 'PROFESSIONNEL', 'PUBLIC', 'NGO', 'SYNDIC', 'OTHER']).optional(),
  company: z.string().max(100, 'Nom d\'entreprise trop long').optional(),
  iceNumber: z.string().max(50, 'Numéro ICE trop long').optional(),
  activitySector: z.string().max(100, 'Secteur d\'activité trop long').optional(),
  contactPosition: z.string().max(100, 'Poste de contact trop long').optional(),
  department: z.string().max(100, 'Département trop long').optional(),
  propertyType: z.enum([
    'APARTMENT_SMALL', 'APARTMENT_MEDIUM', 'APARTMENT_MULTI', 'APARTMENT_LARGE',
    'VILLA_SMALL', 'VILLA_MEDIUM', 'VILLA_LARGE', 'PENTHOUSE', 'COMMERCIAL',
    'STORE', 'HOTEL_STANDARD', 'HOTEL_LUXURY', 'OFFICE', 'RESIDENCE_B2B',
    'BUILDING', 'RESTAURANT', 'WAREHOUSE', 'OTHER'
  ]).optional().nullable(),
  estimatedSurface: z.number().min(1, 'Surface estimée doit être positive').max(10000, 'Surface trop grande').optional(),
  accessibility: z.enum(['EASY', 'MEDIUM', 'MODERATE', 'DIFFICULT', 'VERY_DIFFICULT']).optional(),
  urgencyLevel: z.enum(['LOW', 'NORMAL', 'URGENT', 'HIGH_URGENT', 'IMMEDIATE']).optional().nullable(),
  budgetRange: z.string().max(50, 'Gamme de budget trop longue').optional(),
  frequency: z.enum([
    'PONCTUEL', 'HEBDOMADAIRE', 'MENSUEL', 'BIMENSUEL', 'TRIMESTRIEL',
    'QUARTANNE', 'SEMESTRIEL', 'ANNUEL', 'CONTRAT_CADRE', 'RECURRING', 'AUTRE'
  ]).optional(),
  contractType: z.enum([
    'INTERVENTION_UNIQUE', 'MAINTENANCE', 'ABONNEMENT', 'CONTRAT_CADRE', 'RECURRING', 'AUTRE'
  ]).optional(),
  needsProducts: z.boolean().optional(),
  needsEquipment: z.boolean().optional(),
  providedBy: z.enum(['ENARVA', 'CLIENT', 'MIXTE']).optional(),
  source: z.string().max(100, 'Source trop longue').optional(),
  hasReferrer: z.boolean().optional(),
  referrerContact: z.string().max(100, 'Contact référent trop long').optional(),
  enarvaRole: z.enum(['PRESTATAIRE_PRINCIPAL', 'SOUS_TRAITANT', 'CO_TRAITANT', 'AUTRE']).optional(),
  assignedToId: z.string().optional().nullable(),
  materials: z.any().optional().nullable(),
  score: z.number().min(0).max(100).optional(),
});

export function validateLeadInput(data: any, isCreation = false) {
  if (isCreation) {
    return leadCreationValidationSchema.safeParse(data);
  }
  return leadValidationSchema.safeParse(data);
}

export const missionSchema = z.object({
  missionNumber: z.string().min(1, 'Numéro de mission requis'),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'QUALITY_CHECK', 'CLIENT_VALIDATION', 'COMPLETED', 'CANCELLED']),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']),
  type: z.enum(['SERVICE', 'TECHNICAL_VISIT', 'DELIVERY', 'INTERNAL', 'RECURRING']),
  scheduledDate: z.string().or(z.date()),
  estimatedDuration: z.number().min(1, 'Durée estimée requise'),
  address: z.string().min(1, 'Adresse requise'),
  coordinates: z.string().optional(),
  accessNotes: z.string().optional(),
  teamLeaderId: z.string().optional(),
  leadId: z.string().min(1, 'Lead ID requis'),
  quoteId: z.string().optional(),
  taskTemplateId: z.string().optional(),
});

export type CreateMissionInput = z.infer<typeof missionSchema>;

export function validateMissionInput(data: any) {
  return missionSchema.safeParse(data);
}

export const taskValidationSchema = z.object({
  title: z.string().min(1, 'Titre requis').max(100, 'Titre trop long'),
  description: z.string().max(500, 'Description trop longue').optional(),
  category: z.enum([
    'EXTERIOR_FACADE', 'WALLS_BASEBOARDS', 'FLOORS', 'STAIRS',
    'WINDOWS_JOINERY', 'KITCHEN', 'BATHROOM_SANITARY', 'LIVING_SPACES',
    'LOGISTICS_ACCESS'
  ]),
  status: z.enum(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VALIDATED', 'REJECTED']),
  missionId: z.string().min(1, 'Mission ID requis'),
  assignedToId: z.string().optional(),
  estimatedTime: z.number().min(0).optional(),
  actualTime: z.number().min(0).optional(),
  notes: z.string().max(1000, 'Notes trop longues').optional(),
});

export function validateTaskInput(data: any) {
  return taskValidationSchema.safeParse(data);
}