import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';
import Pusher from 'pusher';
import { ExtendedUser } from '@/types/next-auth';

const prisma = new PrismaClient();

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    const user = session.user as ExtendedUser;
    if (!user.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!['ADMIN', 'MANAGER'].includes(user.role || '')) {
      return new NextResponse('Forbidden - Admin access required', { status: 403 });
    }

    const { id: missionId } = await params;
    const body = await request.json();
    
    console.log('🔧 Mission validation request:', { missionId, validation: body });

    const {
      approved,
      adminNotes,
      qualityScore,
      issuesFound,
      correctionNeeded,
      status
    } = body;

    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        lead: true,
        teamLeader: true,
        tasks: true
      }
    });

    if (!mission) {
      return new NextResponse('Mission not found', { status: 404 });
    }

    if (!['QUALITY_CHECK', 'CLIENT_VALIDATION'].includes(mission.status)) {
      return new NextResponse('Mission not ready for validation', { status: 400 });
    }

    let updateData: any = {
      updatedAt: new Date()
    };

    if (approved) {
      updateData = {
        ...updateData,
        status: 'COMPLETED',
        adminValidated: true,
        adminValidatedBy: user.id,
        adminValidatedAt: new Date(),
        adminNotes: adminNotes || null,
        qualityScore: qualityScore || null,
        actualEndTime: mission.actualEndTime || new Date()
      };

      console.log('✅ Mission approved by admin:', user.name);

    } else {
      updateData = {
        ...updateData,
        status: correctionNeeded ? 'IN_PROGRESS' : 'QUALITY_CHECK',
        adminValidated: false,
        adminValidatedBy: user.id,
        adminValidatedAt: new Date(),
        adminNotes: adminNotes || null,
        qualityScore: qualityScore || null,
        issuesFound: issuesFound || null,
        correctionRequired: correctionNeeded || false
      };

      if (correctionNeeded) {
        await prisma.task.updateMany({
          where: { 
            missionId: missionId,
          },
          data: {
            status: 'ASSIGNED',
            validatedBy: null,
            validatedAt: null
          }
        });
      }

      console.log('❌ Mission rejected by admin:', user.name);
    }

    const updatedMission = await prisma.mission.update({
      where: { id: missionId },
      data: updateData,
      include: {
        lead: true,
        teamLeader: true,
        tasks: true
      }
    });

    await prisma.activity.create({
      data: {
        type: approved ? 'MISSION_COMPLETED' : 'QUALITY_ISSUE',
        title: approved ? 'Mission validée par l\'administration' : 'Mission rejetée par l\'administration',
        description: approved 
          ? `Mission ${mission.missionNumber} approuvée avec score ${qualityScore}/5`
          : `Mission ${mission.missionNumber} rejetée - ${issuesFound}`,
        userId: user.id,
        leadId: mission.leadId,
      },
    });

    if (approved) {
      await prisma.lead.update({
        where: { id: mission.leadId },
        data: { 
          status: 'COMPLETED'
        }
      });
    }

    try {
      if (mission.teamLeader) {
        const notificationData = {
          type: approved ? 'mission_approved' : 'mission_rejected',
          missionId: mission.id,
          missionNumber: mission.missionNumber,
          message: approved 
            ? `Mission ${mission.missionNumber} approuvée avec succès!`
            : `Mission ${mission.missionNumber} nécessite des corrections: ${issuesFound}`,
          timestamp: new Date().toISOString(),
          approved,
          ...(issuesFound && { issuesFound }),
          ...(correctionNeeded && { correctionNeeded })
        };

        const channelName = `user-${mission.teamLeader.id}`;
        await pusher.trigger(channelName, 'mission-validation', notificationData);
        
        console.log('📨 Notification sent to team leader:', mission.teamLeader.name);
      }
    } catch (pushError) {
      console.error('Failed to send real-time notification:', pushError);
    }

    if (approved && !mission.invoiceGenerated) {
      try {
        await generateInvoiceForMission(missionId);
        console.log('📄 Invoice generated for approved mission');
      } catch (invoiceError) {
        console.error('Failed to generate invoice:', invoiceError);
      }
    }

    console.log(`✅ Mission validation completed: ${approved ? 'APPROVED' : 'REJECTED'}`);

    return NextResponse.json({
      success: true,
      mission: updatedMission,
      message: approved 
        ? 'Mission approuvée avec succès'
        : 'Mission rejetée - Équipe notifiée'
    });

  } catch (error) {
    console.error('❌ Mission validation error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function generateInvoiceForMission(missionId: string) {
  try {
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        lead: true,
        quote: true,
        tasks: true
      }
    });

    if (!mission || !mission.quote) {
      throw new Error('Mission or quote not found for invoice generation');
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
        missionId: mission.id,
        leadId: mission.leadId,
        amount: mission.quote.finalPrice,
        status: 'SENT',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        description: `Prestation de nettoyage - Mission ${mission.missionNumber}`,
        createdAt: new Date()
      }
    });

    await prisma.mission.update({
      where: { id: missionId },
      data: { 
        invoiceGenerated: true,
        invoiceId: invoice.id
      }
    });

    console.log('✅ Invoice created:', invoice.invoiceNumber);
    return invoice;

  } catch (error) {
    console.error('Failed to generate invoice:', error);
    throw error;
  }
}