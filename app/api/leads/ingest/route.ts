// app/api/leads/ingest/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Pusher from 'pusher';

const prisma = new PrismaClient();

// Initialize Pusher with your server credentials
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true
});


const splitFullName = (fullName: string) => {
    // ... (your existing splitFullName function)
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) {
        return { firstName: parts[0], lastName: '(non spécifié)' };
    }
    const lastName = parts.pop() || '';
    const firstName = parts.join(' ');
    return { firstName, lastName };
}

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.WEBSITE_API_KEY) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { nom_complet, telephone, email, service, date_prestation, source_url } = body;

    if (!nom_complet || !telephone) {
      return new NextResponse('Nom complet et téléphone sont requis', { status: 400 });
    }

    const { firstName, lastName } = splitFullName(nom_complet);

    let message = `Nouveau lead depuis le site web.\n\n` +
                  `Service demandé : ${service || 'Non spécifié'}\n` +
                  `Date de prestation souhaitée : ${date_prestation || 'Non spécifiée'}\n` +
                  `Source URL : ${source_url || 'Non spécifiée'}`;

    const newLead = await prisma.lead.create({
      data: {
        firstName: firstName,
        lastName: lastName,
        phone: telephone,
        email: email || null,
        originalMessage: message,
        channel: 'SITE_WEB',
        status: 'NEW',
      },
    });

    // --- REAL-TIME NOTIFICATION WITH PUSHER ---
    // Trigger an event on the 'leads' channel named 'new-lead'
    await pusher.trigger('leads-channel', 'new-lead', newLead);
    // --- END OF NOTIFICATION ---

    return NextResponse.json(newLead, { status: 201 });

  } catch (error) {
    console.error('Lead Ingestion Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}