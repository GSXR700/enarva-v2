// app/api/missions/[id]/validate/route.ts - MISSION VALIDATION API
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth'; 
import { authOptions } from '@/lib/auth';
import Pusher from 'pusher';

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
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Check if user has admin/manager role
    if (!['ADMIN', 'MANAGER'].includes(session.user.role || '')) {
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

    // Get current mission
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

    // Validate that mission is in correct status for validation
    if (!['QUALITY_CHECK', 'CLIENT_VALIDATION'].includes(mission.status)) {
      return new NextResponse('Mission not ready for validation', { status: 400 });
    }

    let updateData: any = {
      updatedAt: new Date()
    };

    if (approved) {
      // APPROVAL WORKFLOW
      updateData = {
        ...updateData,
        status: 'COMPLETED',
        adminValidated: true,
        adminValidatedBy: session.user.id,
        adminValidatedAt: new Date(),
        adminNotes: adminNotes || null,
        qualityScore: qualityScore || null,
        actualEndTime: mission.actualEndTime || new Date() // Set end time if not already set
      };

      console.log('✅ Mission approved by admin:', session.user.name);

    } else {
      // REJECTION WORKFLOW
      updateData = {
        ...updateData,
        status: correctionNeeded ? 'IN_PROGRESS' : 'QUALITY_CHECK',
        adminValidated: false,
        adminValidatedBy: session.user.id,
        adminValidatedAt: new Date(),
        adminNotes: adminNotes || null,
        qualityScore: qualityScore || null,
        issuesFound: issuesFound || null,
        correctionRequired: correctionNeeded || false
      };

      // If correction needed, reset some task statuses
      if (correctionNeeded) {
        await prisma.task.updateMany({
          where: { 
            missionId: missionId,
            // Only reset tasks that had issues
          },
          data: {
            status: 'ASSIGNED', // Reset to assigned for re-work
            validatedBy: null,
            validatedAt: null
          }
        });
      }

      console.log('❌ Mission rejected by admin:', session.user.name);
    }

    // Update the mission
    const updatedMission = await prisma.mission.update({
      where: { id: missionId },
      data: updateData,
      include: {
        lead: true,
        teamLeader: true,
        tasks: true
      }
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        type: approved ? 'MISSION_COMPLETED' : 'QUALITY_ISSUE',
        title: approved ? 'Mission validée par l\'administration' : 'Mission rejetée par l\'administration',
        description: approved 
          ? `Mission ${mission.missionNumber} approuvée avec score ${qualityScore}/5`
          : `Mission ${mission.missionNumber} rejetée - ${issuesFound}`,
        userId: session.user.id,
        leadId: mission.leadId,
      },
    });

    // Update lead status if mission completed
    if (approved) {
      await prisma.lead.update({
        where: { id: mission.leadId },
        data: { 
          status: 'COMPLETED'
        }
      });
    }

    // Send real-time notifications
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
      // Don't fail the request if notification fails
    }

    // Generate invoice if approved and not already generated
    if (approved && !mission.invoiceGenerated) {
      try {
        await generateInvoiceForMission(missionId);
        console.log('📄 Invoice generated for approved mission');
      } catch (invoiceError) {
        console.error('Failed to generate invoice:', invoiceError);
        // Don't fail the validation if invoice generation fails
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

// Helper function to generate invoice
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

    // Create invoice record (assuming you have an Invoice model)
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
        missionId: mission.id,
        leadId: mission.leadId,
        amount: mission.quote.finalPrice,
        status: 'SENT',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        description: `Prestation de nettoyage - Mission ${mission.missionNumber}`,
        createdAt: new Date()
      }
    });

    // Update mission to mark invoice as generated
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