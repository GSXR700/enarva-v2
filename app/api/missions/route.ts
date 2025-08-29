// app/api/missions/route.ts - COMPLETE FIXED VERSION
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
        console.log('🔍 Mission creation request:', JSON.stringify(body, null, 2));

        const { quoteId, leadId, teamLeaderId, type, leadName, taskTemplateId, ...missionData } = body;

        // Enhanced validation with detailed logging
        const missingFields = [];
        if (!leadId) missingFields.push('leadId');
        if (!teamLeaderId) missingFields.push('teamLeaderId');
        if (!missionData.address) missingFields.push('address');
        if (!missionData.scheduledDate) missingFields.push('scheduledDate');
        if (!missionData.estimatedDuration) missingFields.push('estimatedDuration');

        if (missingFields.length > 0) {
            console.error('❌ Missing required fields:', missingFields);
            return NextResponse.json({ 
                message: `Missing required fields: ${missingFields.join(', ')}`,
                missingFields,
                receivedData: body
            }, { status: 400 });
        }

        // For service missions, quote is required
        if (type === 'SERVICE' && !quoteId) {
            console.error('❌ Missing quoteId for SERVICE mission');
            return NextResponse.json({ message: 'Quote ID is required for service missions.' }, { status: 400 });
        }

        console.log('✅ Basic validation passed');

        // Validate that the lead exists
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) {
            console.error('❌ Lead not found:', leadId);
            return NextResponse.json({ message: 'Lead not found' }, { status: 404 });
        }
        console.log('✅ Lead found:', lead.firstName, lead.lastName);

        // Validate that the team leader exists
        const teamLeader = await prisma.user.findUnique({ where: { id: teamLeaderId } });
        if (!teamLeader) {
            console.error('❌ Team leader not found:', teamLeaderId);
            return NextResponse.json({ message: 'Team leader not found' }, { status: 404 });
        }
        console.log('✅ Team leader found:', teamLeader.name);

        // If it's a service mission, validate quote exists
        if (type === 'SERVICE' && quoteId) {
            const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
            if (!quote) {
                console.error('❌ Quote not found:', quoteId);
                return NextResponse.json({ message: 'Quote not found' }, { status: 404 });
            }
            console.log('✅ Quote found:', quote.quoteNumber);
        }

        const scheduledDateAsDate = new Date(missionData.scheduledDate);

        let tasksToCreate: { title: string; category: string; }[] = [];
        if (taskTemplateId && taskTemplateId !== 'none') {
            const selectedTemplate = templates.find(t => t.id === taskTemplateId);
            if (selectedTemplate) {
                tasksToCreate = selectedTemplate.tasks.map(task => ({
                    title: task.title,
                    category: task.category,
                }));
                console.log('✅ Tasks prepared from template:', tasksToCreate.length, 'tasks');
            }
        }

        console.log('🔧 Creating mission...');

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

        console.log('✅ Mission created successfully:', newMission.id);
        
        // Send real-time notification
        if (teamLeaderId) {
            const channelName = `user-${teamLeaderId}`;
            await pusher.trigger(channelName, 'mission-new', newMission);
            console.log('✅ Pusher notification sent');
        }

        return NextResponse.json(newMission, { status: 201 });

    } catch (error) {
        console.error('💥 Mission creation error:', error);
        return NextResponse.json({ 
            message: 'Internal Server Error', 
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        }, { status: 500 });
    }
}