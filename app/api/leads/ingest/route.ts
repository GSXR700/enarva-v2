// app/api/leads/ingest/route.ts - VERSION SIMPLIFIEE QUI MARCHE
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { pusherServer } from '@/lib/pusher';

const prisma = new PrismaClient();

const splitFullName = (fullName: string) => {
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '(non spécifié)' };
  }
  const lastName = parts.pop() || '';
  const firstName = parts.join(' ');
  return { firstName, lastName };
};

const calculateScore = (data: any): number => {
  let score = 25;
  if (data.email && data.email.trim()) score += 20;
  if (data.service && data.service !== 'Non spécifié') score += 30;
  if (data.date_prestation && data.date_prestation !== 'Non spécifiée') score += 25;
  return Math.min(score, 100);
};

export async function POST(request: Request) {
  try {
    console.log('INGESTION: Request received');
    
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.WEBSITE_API_KEY) {
      console.log('INGESTION: Invalid API key');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    console.log('INGESTION: Body received:', body);
    
    const { nom_complet, telephone, email, service, date_prestation, source_url } = body;

    if (!nom_complet || !telephone) {
      console.log('INGESTION: Missing required fields');
      return new NextResponse('Nom complet et téléphone requis', { status: 400 });
    }

    const { firstName, lastName } = splitFullName(nom_complet);
    const score = calculateScore({ email, service, date_prestation });

    const message = `Nouvelle réservation depuis le site web.\n\n` +
                   `Service demandé : ${service || 'Non spécifié'}\n` +
                   `Date souhaitée : ${date_prestation || 'Non spécifiée'}\n` +
                   `Source : ${source_url || 'Non spécifiée'}`;

    // CREATION DIRECTE AVEC PRISMA (comme avant)
    const newLead = await prisma.lead.create({
      data: {
        firstName,
        lastName,
        phone: telephone,
        email: email || null,
        originalMessage: message,
        channel: 'SITE_WEB',
        status: 'NEW',
        score,
        leadType: 'PARTICULIER',
        source: source_url || 'Site Web Enarva',
        updatedAt: new Date()
      }
    });

    console.log('INGESTION: Lead created:', newLead.id);

    // Pusher notification
    try {
      await pusherServer.trigger('leads-channel', 'new-lead', {
        id: newLead.id,
        firstName: newLead.firstName,
        lastName: newLead.lastName,
        phone: newLead.phone,
        score: newLead.score,
        status: newLead.status,
        channel: newLead.channel,
        createdAt: newLead.createdAt,
        message: `Nouvelle réservation: ${firstName} ${lastName}`
      });
      console.log('INGESTION: Pusher notification sent');
    } catch (pusherError) {
      console.warn('INGESTION: Pusher failed:', pusherError);
    }

    return NextResponse.json({
      success: true,
      lead: newLead,
      message: 'Lead créé avec succès'
    }, { status: 201 });

  } catch (error) {
    console.error('INGESTION: Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error'
    }, { status: 500 });
  }
}