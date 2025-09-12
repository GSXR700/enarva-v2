// app/api/leads/ingest/route.ts - FINAL CORRECTED VERSION
import { NextResponse } from 'next/server';
import { leadService } from '@/services/lead.service';
import { pusherServer } from '@/lib/pusher';
import { Prisma } from '@prisma/client';

const splitFullName = (fullName: string) => {
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '(non spécifié)' };
  }
  const lastName = parts.pop() || '';
  const firstName = parts.join(' ');
  return { firstName, lastName };
};

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

export async function POST(request: Request) {
  try {
    console.log('🔄 Lead ingestion request received');
    
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.WEBSITE_API_KEY) {
      console.error('❌ Invalid API key provided');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    console.log('📝 Request body:', body);
    
    const { nom_complet, telephone, email, service, date_prestation, source_url } = body;

    if (!nom_complet || !telephone) {
      console.error('❌ Missing required fields:', { nom_complet, telephone });
      return new NextResponse('Nom complet et téléphone sont requis', { status: 400 });
    }

    const { firstName, lastName } = splitFullName(nom_complet);

    let message = `Nouvelle réservation depuis le site web Enarva.\n\n` +
                  `Service demandé : ${service || 'Non spécifié'}\n` +
                  `Date de prestation souhaitée : ${date_prestation || 'Non spécifiée'}\n` +
                  `Source URL : ${source_url || 'Non spécifiée'}`;

    const score = calculateWebsiteLeadScore({
      email,
      service,
      date_prestation
    });

    const leadData: Prisma.LeadCreateInput = {
      firstName: firstName,
      lastName: lastName,
      phone: telephone,
      email: email || null,
      originalMessage: message,
      channel: 'SITE_WEB',
      status: 'NEW',
      score: score,
      leadType: 'PARTICULIER',
      source: source_url || 'Site Web Enarva'
    };

    console.log('📊 Creating lead with data:', leadData);

    const newLead = await leadService.createLead(leadData, 'website-system');

    console.log('✅ Lead created successfully:', newLead.id);

    // Real-time notification with Pusher
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
        createdAt: newLead.createdAt,
        message: `Nouvelle réservation: ${firstName} ${lastName}`,
        serviceRequested: service,
        preferredDate: date_prestation
      });
      console.log('📢 Pusher notification sent successfully');
    } catch (pusherError) {
      console.error('⚠️ Pusher notification failed:', pusherError);
    }

    return NextResponse.json({
      success: true,
      lead: newLead,
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