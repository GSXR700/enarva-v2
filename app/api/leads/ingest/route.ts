// app/api/leads/ingest/route.ts - COMPLETE VERSION RESPECTING PRISMA SCHEMA
import { NextResponse } from 'next/server';
import { leadService } from '@/services/lead.service';
import { pusherServer } from '@/lib/pusher';
import { Prisma, ServiceType } from '@prisma/client';

// ============================================================================
// SPAM FILTERING FUNCTIONS
// ============================================================================

const SPAM_KEYWORDS = [
  'viagra', 'cialis', 'casino', 'porn', 'xxx', 'sex', 'lottery', 'prize',
  'bitcoin', 'crypto', 'investment', 'forex', 'trading', 'loan', 'credit',
  'free money', 'click here', 'buy now', 'limited offer', 'act now',
  'weight loss', 'male enhancement', 'enlargement', 'pharmacy', 'pills'
];

const MAX_ALLOWED_URLS = 1;

function containsSpamKeywords(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  
  const lowerText = text.toLowerCase();
  return SPAM_KEYWORDS.some(keyword => lowerText.toLowerCase().includes(keyword));
}

function countUrls(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  
  const urlPattern = /(https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*))/gi;
  const matches = text.match(urlPattern);
  return matches ? matches.length : 0;
}

function isSpam(data: any): boolean {
  const textFields = [
    data.nom_complet,
    data.email,
    data.service,
    data.telephone
  ];
  
  for (const field of textFields) {
    if (containsSpamKeywords(field)) {
      console.log('🚫 Spam detected: keyword match in field', field);
      return true;
    }
    if (countUrls(field) > MAX_ALLOWED_URLS) {
      console.log('🚫 Spam detected: too many URLs in field', field);
      return true;
    }
  }
  
  return false;
}

// ============================================================================
// INTERNATIONAL PHONE VALIDATION WITH COUNTRY CODE SUPPORT
// ============================================================================

interface PhoneValidationResult {
  valid: boolean;
  normalized?: string;
  error?: string;
  countryCode?: string;
}

function validateInternationalPhone(phone: string, countryCode: string = '+212'): PhoneValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Numéro de téléphone manquant' };
  }
  
  // Remove all spaces, dashes, dots, parentheses
  let cleaned = phone.replace(/[\s\-\.\(\)]/g, '');
  
  // Remove country code if it's already in the phone number
  if (cleaned.startsWith('+')) {
    const match = cleaned.match(/^\+(\d{1,3})/);
    if (match) {
      const extractedCode = '+' + match[1];
      cleaned = cleaned.substring(extractedCode.length);
    }
  } else if (cleaned.startsWith('00')) {
    const match = cleaned.match(/^00(\d{1,3})/);
    if (match) {
      cleaned = cleaned.substring(match[0].length);
    }
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Check minimum length (at least 8 digits for most countries)
  if (cleaned.length < 8) {
    return { 
      valid: false, 
      error: `Numéro de téléphone invalide (${cleaned.length} chiffres). Minimum 8 chiffres requis.`,
      countryCode 
    };
  }
  
  // Validate based on country code
  switch(countryCode) {
    case '+212': // Morocco
      if (!/^[5-7]\d{8}$/.test(cleaned)) {
        return {
          valid: false,
          error: 'Format de téléphone marocain invalide. Format attendu: 06XX XX XX XX',
          countryCode
        };
      }
      break;
      
    case '+1': // USA/Canada
      if (!/^\d{10}$/.test(cleaned)) {
        return {
          valid: false,
          error: 'Format de téléphone US/Canada invalide. 10 chiffres requis.',
          countryCode
        };
      }
      break;
      
    case '+33': // France
      if (!/^[1-9]\d{8}$/.test(cleaned)) {
        return {
          valid: false,
          error: 'Format de téléphone français invalide. 9 chiffres requis.',
          countryCode
        };
      }
      break;
      
    case '+44': // UK
      if (!/^\d{10}$/.test(cleaned)) {
        return {
          valid: false,
          error: 'Format de téléphone UK invalide. 10 chiffres requis.',
          countryCode
        };
      }
      break;
      
    case '+971': // UAE
      if (!/^[2-9]\d{7,8}$/.test(cleaned)) {
        return {
          valid: false,
          error: 'Format de téléphone UAE invalide. 8-9 chiffres requis.',
          countryCode
        };
      }
      break;
      
    case '+966': // Saudi Arabia
      if (!/^[1-9]\d{8}$/.test(cleaned)) {
        return {
          valid: false,
          error: 'Format de téléphone saoudien invalide. 9 chiffres requis.',
          countryCode
        };
      }
      break;
      
    default:
      // Generic international validation (8-15 digits)
      if (!/^\d{8,15}$/.test(cleaned)) {
        return {
          valid: false,
          error: 'Format de téléphone international invalide. 8-15 chiffres requis.',
          countryCode
        };
      }
  }
  
  // Construct normalized international format
  const normalized = `${countryCode}${cleaned}`;
  
  return { 
    valid: true, 
    normalized,
    countryCode 
  };
}

// ============================================================================
// NAME PARSING
// ============================================================================

const splitFullName = (fullName: string) => {
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '(non spécifié)' };
  }
  const lastName = parts.pop() || '';
  const firstName = parts.join(' ');
  return { firstName, lastName };
};

// ============================================================================
// SERVICE TYPE MAPPING - RESPECTING PRISMA SCHEMA
// ============================================================================

function mapServiceToServiceType(service: string): ServiceType | null {
  if (!service || service === 'Non spécifié') return null;
  
  const serviceLower = service.toLowerCase().trim();
  
  // Map website service names to ACTUAL Prisma ServiceType enum values
  const serviceMap: Record<string, ServiceType> = {
    // Grand Ménage
    'grand ménage': ServiceType.GRAND_MENAGE,
    'grand menage': ServiceType.GRAND_MENAGE,
    'menage': ServiceType.GRAND_MENAGE,
    'ménage': ServiceType.GRAND_MENAGE,
    
    // Nettoyage Fin de Chantier / Après Travaux
    'nettoyage de fin de chantier': ServiceType.NETTOYAGE_FIN_CHANTIER,
    'fin de chantier': ServiceType.NETTOYAGE_FIN_CHANTIER,
    'nettoyage après travaux': ServiceType.NETTOYAGE_FIN_CHANTIER,
    'nettoyage apres travaux': ServiceType.NETTOYAGE_FIN_CHANTIER,
    'après travaux': ServiceType.NETTOYAGE_FIN_CHANTIER,
    'apres travaux': ServiceType.NETTOYAGE_FIN_CHANTIER,
    
    // Canapés & Matelas
    'nettoyage de canapé': ServiceType.NETTOYAGE_CANAPES_MATELAS,
    'nettoyage de canape': ServiceType.NETTOYAGE_CANAPES_MATELAS,
    'nettoyage canapé': ServiceType.NETTOYAGE_CANAPES_MATELAS,
    'nettoyage canape': ServiceType.NETTOYAGE_CANAPES_MATELAS,
    'canapé': ServiceType.NETTOYAGE_CANAPES_MATELAS,
    'canape': ServiceType.NETTOYAGE_CANAPES_MATELAS,
    'canapés': ServiceType.NETTOYAGE_CANAPES_MATELAS,
    'canapes': ServiceType.NETTOYAGE_CANAPES_MATELAS,
    'nettoyage de matelas': ServiceType.NETTOYAGE_CANAPES_MATELAS,
    'matelas': ServiceType.NETTOYAGE_CANAPES_MATELAS,
    'canapés et matelas': ServiceType.NETTOYAGE_CANAPES_MATELAS,
    'canapes et matelas': ServiceType.NETTOYAGE_CANAPES_MATELAS,
    
    // Tapis & Moquettes
    'nettoyage de tapis': ServiceType.NETTOYAGE_TAPIS_MOQUETTES,
    'tapis': ServiceType.NETTOYAGE_TAPIS_MOQUETTES,
    'nettoyage de moquette': ServiceType.NETTOYAGE_TAPIS_MOQUETTES,
    'moquette': ServiceType.NETTOYAGE_TAPIS_MOQUETTES,
    'moquettes': ServiceType.NETTOYAGE_TAPIS_MOQUETTES,
    'tapis et moquettes': ServiceType.NETTOYAGE_TAPIS_MOQUETTES,
    'nettoyage moquette vapeur': ServiceType.NETTOYAGE_MOQUETTE_VAPEUR,
    
    // Vitres
    'nettoyage de vitres': ServiceType.NETTOYAGE_VITRES,
    'nettoyage vitres': ServiceType.NETTOYAGE_VITRES,
    'vitres': ServiceType.NETTOYAGE_VITRES,
    'vitre': ServiceType.NETTOYAGE_VITRES,
    'lavage de vitres': ServiceType.NETTOYAGE_VITRES,
    
    // Traitement de Sol
    'traitement de sol': ServiceType.TRAITEMENT_SOL,
    'traitement sol': ServiceType.TRAITEMENT_SOL,
    
    // Nettoyage Fours
    'nettoyage de fours': ServiceType.NETTOYAGE_FOURS,
    'nettoyage fours': ServiceType.NETTOYAGE_FOURS,
    'fours': ServiceType.NETTOYAGE_FOURS,
    'four': ServiceType.NETTOYAGE_FOURS,
    
    // Entretien Jardin
    'entretien de jardin': ServiceType.ENTRETIEN_JARDIN,
    'entretien jardin': ServiceType.ENTRETIEN_JARDIN,
    'jardin': ServiceType.ENTRETIEN_JARDIN,
    
    // Entretien Piscine
    'entretien de piscine': ServiceType.ENTRETIEN_PISCINE,
    'entretien piscine': ServiceType.ENTRETIEN_PISCINE,
    'piscine': ServiceType.ENTRETIEN_PISCINE,
    
    // Nettoyage Façade
    'nettoyage de façade': ServiceType.NETTOYAGE_FACADE,
    'nettoyage de facade': ServiceType.NETTOYAGE_FACADE,
    'nettoyage façade': ServiceType.NETTOYAGE_FACADE,
    'nettoyage facade': ServiceType.NETTOYAGE_FACADE,
    'façade': ServiceType.NETTOYAGE_FACADE,
    'facade': ServiceType.NETTOYAGE_FACADE,
    
    // Désinfection Sanitaire
    'désinfection sanitaire': ServiceType.DESINFECTION_SANITAIRE,
    'desinfection sanitaire': ServiceType.DESINFECTION_SANITAIRE,
    'désinfection': ServiceType.DESINFECTION_SANITAIRE,
    'desinfection': ServiceType.DESINFECTION_SANITAIRE,
    'désinfection covid': ServiceType.DESINFECTION_SANITAIRE,
    'desinfection covid': ServiceType.DESINFECTION_SANITAIRE,
    'covid': ServiceType.DESINFECTION_SANITAIRE,
    
    // Nettoyage Bureaux
    'nettoyage de bureaux': ServiceType.NETTOYAGE_BUREAUX,
    'nettoyage bureaux': ServiceType.NETTOYAGE_BUREAUX,
    'bureaux': ServiceType.NETTOYAGE_BUREAUX,
    'bureau': ServiceType.NETTOYAGE_BUREAUX,
    
    // Entretien Régulier
    'entretien régulier': ServiceType.ENTRETIEN_REGULIER,
    'entretien regulier': ServiceType.ENTRETIEN_REGULIER,
    'entretien': ServiceType.ENTRETIEN_REGULIER,
    
    // Cristallisation Marbre
    'cristallisation de marbre': ServiceType.CRISTALLISATION_MARBRE,
    'cristallisation marbre': ServiceType.CRISTALLISATION_MARBRE,
    'cristallisation': ServiceType.CRISTALLISATION_MARBRE,
    
    // Vitrification Parquet
    'vitrification de parquet': ServiceType.VITRIFICATION_PARQUET,
    'vitrification parquet': ServiceType.VITRIFICATION_PARQUET,
    'vitrification': ServiceType.VITRIFICATION_PARQUET,
    'parquet': ServiceType.VITRIFICATION_PARQUET,
    
    // Décapage Sol
    'décapage de sol': ServiceType.DECAPAGE_SOL,
    'decapage de sol': ServiceType.DECAPAGE_SOL,
    'décapage sol': ServiceType.DECAPAGE_SOL,
    'decapage sol': ServiceType.DECAPAGE_SOL,
    'décapage': ServiceType.DECAPAGE_SOL,
    'decapage': ServiceType.DECAPAGE_SOL,
    'décapage et cristallisation': ServiceType.DECAPAGE_SOL,
    'decapage et cristallisation': ServiceType.DECAPAGE_SOL,
    
    // Lustrage Marbre
    'lustrage de marbre': ServiceType.LUSTRAGE_MARBRE,
    'lustrage marbre': ServiceType.LUSTRAGE_MARBRE,
    'lustrage': ServiceType.LUSTRAGE_MARBRE,
    'traitement marbre': ServiceType.LUSTRAGE_MARBRE,
    'marbre': ServiceType.LUSTRAGE_MARBRE,
    
    // Polissage Béton
    'polissage de béton': ServiceType.POLISSAGE_BETON,
    'polissage de beton': ServiceType.POLISSAGE_BETON,
    'polissage béton': ServiceType.POLISSAGE_BETON,
    'polissage beton': ServiceType.POLISSAGE_BETON,
    'polissage': ServiceType.POLISSAGE_BETON,
    'béton': ServiceType.POLISSAGE_BETON,
    'beton': ServiceType.POLISSAGE_BETON,
    
    // Autres
    'autre': ServiceType.AUTRES,
    'autres': ServiceType.AUTRES,
    'other': ServiceType.AUTRES,
    'autres services': ServiceType.AUTRES,
  };
  
  return serviceMap[serviceLower] || null;
}

// ============================================================================
// LEAD SCORE CALCULATION
// ============================================================================

const calculateWebsiteLeadScore = (data: any): number => {
  let score = 25; // Base score for website submission
  
  if (data.email && data.email.trim() !== '') {
    score += 20;
  }
  
  if (data.service && data.service !== 'Non spécifié' && data.service.trim() !== '') {
    score += 30;
  }
  
  if (data.date_prestation && data.date_prestation !== 'Non spécifiée' && data.date_prestation.trim() !== '') {
    score += 25;
  }
  
  return Math.min(score, 100);
};

// ============================================================================
// MAIN API HANDLER
// ============================================================================

export async function POST(request: Request) {
  try {
    console.log('🔷 Lead ingestion request received');
    
    // 1. API Key Validation
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.WEBSITE_API_KEY) {
      console.error('❌ Invalid API key provided');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    console.log('📦 Request body:', JSON.stringify(body, null, 2));
    
    const { 
      nom_complet, 
      telephone, 
      country_code = '+212', // Default to Morocco if not provided
      email, 
      service, 
      date_prestation, 
      source_url 
    } = body;

    // 2. Required Fields Validation
    if (!nom_complet || !telephone) {
      console.error('❌ Missing required fields:', { nom_complet, telephone });
      return NextResponse.json({
        success: false,
        error: 'Nom complet et téléphone sont requis'
      }, { status: 400 });
    }

    // 3. SPAM FILTERING (Critical!)
    if (isSpam(body)) {
      console.warn('🚫 SPAM DETECTED - Rejecting submission silently');
      
      // Return success to fool spammers (like PHP does)
      return NextResponse.json({
        success: true,
        message: 'Lead créé avec succès'
      }, { status: 201 });
    }

    // 4. INTERNATIONAL PHONE VALIDATION
    const phoneValidation = validateInternationalPhone(telephone, country_code);
    if (!phoneValidation.valid) {
      console.error('❌ Phone validation failed:', phoneValidation.error);
      return NextResponse.json({
        success: false,
        error: phoneValidation.error
      }, { status: 400 });
    }

    // 5. Parse name
    const { firstName, lastName } = splitFullName(nom_complet);

    // 6. Map service to ServiceType enum (RESPECTING PRISMA SCHEMA)
    const serviceType = mapServiceToServiceType(service || '');

    // 7. Build original message with all details
    let message = `Nouvelle réservation depuis le site web Enarva.\n\n` +
                  `Service demandé : ${service || 'Non spécifié'}\n` +
                  `Date de prestation souhaitée : ${date_prestation || 'Non spécifiée'}\n` +
                  `Indicatif pays : ${country_code}\n` +
                  `Source URL : ${source_url || 'Non spécifiée'}`;

    // 8. Calculate score
    const score = calculateWebsiteLeadScore({
      email,
      service,
      date_prestation
    });

    // 9. Prepare Lead data
    const leadData: Prisma.LeadCreateInput = {
      firstName: firstName ?? '',
      lastName: lastName ?? '(non spécifié)',
      phone: phoneValidation.normalized || telephone,
      email: email || null,
      originalMessage: message,
      channel: 'SITE_WEB',
      status: 'NEW',
      score: score,
      leadType: 'PARTICULIER',
      serviceType: serviceType,
      source: source_url || 'Site Web Enarva',
      updatedAt: new Date()
    };

    console.log('📝 Creating lead with data:', JSON.stringify(leadData, null, 2));

    // 10. Create lead using leadService with fallback
    let newLead;
    try {
      newLead = await leadService.createLead(leadData, 'website-system');
      console.log('✅ Lead created via leadService:', newLead.id);
    } catch (leadServiceError) {
      console.error('⚠️ leadService failed, using direct Prisma:', leadServiceError);
      
      // Fallback to direct Prisma creation
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      try {
        newLead = await prisma.lead.create({
          data: leadData
        });
        console.log('✅ Lead created via direct Prisma:', newLead.id);
      } finally {
        await prisma.$disconnect();
      }
    }

    // 11. Real-time notification with Pusher
    try {
      await pusherServer.trigger('leads-channel', 'new-lead', {
        id: newLead.id,
        firstName: newLead.firstName,
        lastName: newLead.lastName,
        phone: newLead.phone,
        email: newLead.email,
        score: newLead.score,
        status: newLead.status,
        channel: newLead.channel,
        leadType: newLead.leadType,
        serviceType: newLead.serviceType,
        createdAt: newLead.createdAt,
        message: `Nouvelle réservation: ${firstName} ${lastName}`,
        serviceRequested: service,
        preferredDate: date_prestation,
        countryCode: phoneValidation.countryCode
      });
      console.log('✅ Pusher notification sent successfully');
    } catch (pusherError) {
      console.error('⚠️ Pusher notification failed:', pusherError);
      // Don't fail the request if Pusher fails
    }

    return NextResponse.json({
      success: true,
      lead: {
        id: newLead.id,
        firstName: newLead.firstName,
        lastName: newLead.lastName,
        phone: newLead.phone,
        serviceType: newLead.serviceType,
        score: newLead.score
      },
      message: 'Lead créé avec succès'
    }, { status: 201 });

  } catch (error) {
    console.error('💥 Lead Ingestion Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error',
      message: 'Erreur lors de la création du lead'
    }, { status: 500 });
  }
}
