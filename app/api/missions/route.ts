// app/api/missions/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true
});

const prisma = new PrismaClient();

// Hardcoded templates for simplicity, mirroring the new API endpoint
const templates = [
    {
        id: 'tech-visit-villa',
        name: 'Visite Technique - Villa / Grand Ménage',
        tasks: [
            { category: 'EXTERIOR_FACADE', title: 'État général des façades (pierre, crépi, etc.)' },
            { category: 'EXTERIOR_FACADE', title: 'Présence de taches de peinture, ciment, poussière' },
            { category: 'WINDOWS_JOINERY', title: 'État des vitres extérieures et cadres' },
            { category: 'FLOORS', title: 'Inspection du Marbre (rayures, taches)' },
            { category: 'FLOORS', title: 'Inspection du Parquet (humidité, traces)' },
            { category: 'BATHROOM_SANITARY', title: 'Vérification des joints et traces de calcaire' },
            { category: 'LOGISTICS_ACCESS', title: 'Noter les points d\'accès à l\'eau et électricité' },
        ]
    },
    {
        id: 'end-of-construction-clean',
        name: 'Nettoyage Fin de Chantier - Appartement',
        tasks: [
            { category: 'WALLS_BASEBOARDS', title: 'Dépoussiérer et nettoyer les murs et plinthes' },
            { category: 'FLOORS', title: 'Laver et aspirer tous les sols' },
            { category: 'FLOORS', title: 'Retirer le voile de ciment du carrelage' },
            { category: 'WINDOWS_JOINERY', title: 'Nettoyer les vitres int/ext et les rails' },
            { category: 'KITCHEN', title: 'Dégraisser les éléments de cuisine' },
            { category: 'BATHROOM_SANITARY', title: 'Désinfecter et détartrer les sanitaires' },
            { category: 'LOGISTICS_ACCESS', title: 'Évacuation des déchets de chantier restants' },
        ]
    }
];

export async function GET() {
  try {
    const missions = await prisma.mission.findMany({
      include: {
        lead: true,
        teamLeader: true,
        teamMembers: true,
        quote: true,
        tasks: true,
      },
      orderBy: {
        scheduledDate: 'desc',
      },
    })
    return NextResponse.json(missions)
  } catch (error) {
    console.error('Failed to fetch missions:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { quoteId, leadId, teamLeaderId, type, leadName, taskTemplateId, ...missionData } = body;

        if (!leadId || !teamLeaderId || !missionData.address || !missionData.scheduledDate) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }
        if (type === 'SERVICE' && !quoteId) {
            return NextResponse.json({ message: 'Quote ID is required for a service mission.' }, { status: 400 });
        }
        
        const scheduledDateAsDate = new Date(missionData.scheduledDate);

        let tasksToCreate: { title: string; category: string; }[] = [];
        if (taskTemplateId) {
            const selectedTemplate = templates.find(t => t.id === taskTemplateId);
            if (selectedTemplate) {
                tasksToCreate = selectedTemplate.tasks.map(task => ({
                    title: task.title,
                    category: task.category,
                }));
            }
        }

        const newMission = await prisma.mission.create({
            data: {
                ...missionData,
                missionNumber: `MS-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
                estimatedDuration: parseInt(missionData.estimatedDuration),
                scheduledDate: scheduledDateAsDate,
                type: type,
                lead: { connect: { id: leadId } },
                teamLeader: { connect: { id: teamLeaderId } },
                ...(quoteId && { quote: { connect: { id: quoteId } } }),
                tasks: {
                    create: tasksToCreate,
                },
            },
            include: { lead: true }
        });
        
        if (teamLeaderId) {
            const channelName = `user-${teamLeaderId}`;
            await pusher.trigger(channelName, 'mission-new', newMission);
        }

        return NextResponse.json(newMission, { status: 201 });

    } catch (error) {
        console.error('Failed to create mission:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: String(error) }, { status: 500 });
    }
}
