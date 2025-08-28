// app/api/leads/ingest/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import io from 'socket.io-client';

const prisma = new PrismaClient();

const splitFullName = (fullName: string) => {
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
    
    // Message enrichi avec toutes les données du formulaire
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
        // --- CORRECTION CLÉ ---
        // Utilisation de la nouvelle valeur d'enum correcte
        channel: 'SITE_WEB', 
        status: 'NEW',
        // Les autres champs obligatoires de votre nouveau schéma sont couverts par @default
        // ou sont optionnels.
      },
    });

    // --- NOTIFICATION TEMPS RÉEL (AVEC AVERTISSEMENT) ---
    // AVERTISSEMENT : L'émission d'un événement socket depuis une API Route serverless
    // peut être peu fiable. La fonction peut se terminer avant que la connexion
    // et l'émission ne soient complètes.
    try {
        // Assurez-vous que l'URL pointe vers votre serveur Next.js en cours d'exécution
        const socket = io(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'); 
        socket.emit('broadcast', {
            event: 'new_lead',
            payload: newLead
        });
        // On ne déconnecte pas manuellement pour donner une chance à l'événement de partir.
    } catch (socketError) {
        console.error("Socket emission failed:", socketError);
    }
    // --- FIN DE LA NOTIFICATION ---

    return NextResponse.json(newLead, { status: 201 });

  } catch (error) {
    console.error('Lead Ingestion Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
