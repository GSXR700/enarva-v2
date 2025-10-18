// app/api/missions/[id]/validate/route.ts - UPDATED WITH F-NUM/YEAR FORMAT
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
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

// Helper function to generate invoice number in F-NUM/YEAR format
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  
  // Get the count of invoices created this year
  const invoiceCount = await prisma.invoice.count({
    where: {
      invoiceNumber: {
        endsWith: `/${year}`
      }
    }
  });
  
  const nextNumber = invoiceCount + 1;
  return `F-${nextNumber}/${year}`;
}

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
    } = body;

    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        lead: true,
        teamLeader: true,
        tasks: true,
        quote: true
      }
    });

    if (!mission) {
      return new NextResponse('Mission not found', { status: 404 });
    }

    if (!['QUALITY_CHECK', 'CLIENT_VALIDATION'].includes(mission.status)) {
      return new NextResponse('Mission not ready for validation', { status: 400 });
    }

    // CRITICAL FIX: Determine proper status based on validation outcome
    let newStatus: string;
    let updateData: any = {
      updatedAt: new Date(),
      adminValidatedBy: user.id,
      adminValidatedAt: new Date(),
      adminNotes: adminNotes || null,
      qualityScore: qualityScore || null,
    };

    if (approved) {
      // ✅ APPROVED: Mission is completed
      newStatus = 'COMPLETED';
      updateData = {
        ...updateData,
        status: newStatus,
        adminValidated: true,
        actualEndTime: mission.actualEndTime || new Date(),
        issuesFound: null,
        correctionRequired: false
      };

      console.log('✅ Mission approved by admin:', user.name);

    } else {
      // ❌ REJECTED
      if (correctionNeeded) {
        // Send back to IN_PROGRESS for corrections
        newStatus = 'IN_PROGRESS';
        updateData = {
          ...updateData,
          status: newStatus,
          adminValidated: false,
          issuesFound: issuesFound || 'Corrections requises',
          correctionRequired: true
        };

        // Reset tasks that need corrections
        await prisma.task.updateMany({
          where: { 
            missionId: missionId,
          },
          data: {
            status: 'ASSIGNED',
            validatedAt: null
          }
        });

        console.log('🔄 Mission sent back for corrections:', user.name);

      } else {
        // FIXED: LITIGE - Mission stays in QUALITY_CHECK for dispute resolution
        newStatus = 'QUALITY_CHECK';
        updateData = {
          ...updateData,
          status: newStatus,
          adminValidated: false,
          issuesFound: issuesFound || 'Litige en cours de résolution',
          correctionRequired: false
        };

        console.log('⚠️ Mission marked as LITIGE (stays in quality control):', user.name);
      }
    }

    // Update mission
    const updatedMission = await prisma.mission.update({
      where: { id: missionId },
      data: updateData,
      include: {
        lead: true,
        teamLeader: true,
        tasks: true,
        quote: true
      }
    });

    // FIXED: Create activity log with correct ActivityType
    await prisma.activity.create({
      data: {
        type: approved ? 'MISSION_COMPLETED' : 'MISSION_STATUS_UPDATED', // ✅ Valid enum values
        title: approved 
          ? 'Mission validée par l\'administration' 
          : correctionNeeded 
            ? 'Mission rejetée - Corrections requises'
            : 'Mission en litige - Contrôle qualité',
        description: approved 
          ? `Mission ${mission.missionNumber} approuvée${qualityScore ? ` avec score ${qualityScore}/5` : ''}`
          : correctionNeeded
            ? `Mission ${mission.missionNumber} retournée pour corrections - ${issuesFound || 'Problèmes détectés'}`
            : `Mission ${mission.missionNumber} maintenue en contrôle qualité - Litige: ${issuesFound || 'Client non satisfait'}`,
        userId: user.id,
        leadId: mission.leadId,
        metadata: {
          missionId,
          oldStatus: mission.status,
          newStatus,
          approved,
          correctionNeeded,
          qualityScore,
          issuesFound
        }
      },
    });

    // Update lead status appropriately
    if (approved) {
      await prisma.lead.update({
        where: { id: mission.leadId },
        data: { 
          status: 'COMPLETED',
          updatedAt: new Date()
        }
      });
    } else if (!correctionNeeded) {
      // For litige cases, mark lead as in dispute
      await prisma.lead.update({
        where: { id: mission.leadId },
        data: { 
          status: 'IN_DISPUTE',
          updatedAt: new Date()
        }
      });
    }

    // Send real-time notification to team leader
    try {
      if (mission.teamLeader) {
        const notificationData = {
          type: approved ? 'mission_approved' : correctionNeeded ? 'mission_rejected' : 'mission_litige',
          missionId: mission.id,
          missionNumber: mission.missionNumber,
          message: approved 
            ? `Mission ${mission.missionNumber} approuvée avec succès!`
            : correctionNeeded
              ? `Mission ${mission.missionNumber} nécessite des corrections: ${issuesFound}`
              : `Mission ${mission.missionNumber} en litige - Contrôle qualité en cours`,
          timestamp: new Date().toISOString(),
          approved,
          correctionNeeded,
          issuesFound,
          newStatus
        };

        const channelName = `user-${mission.teamLeader.id}`;
        await pusher.trigger(channelName, 'mission-validation', notificationData);
        
        console.log('📨 Notification sent to team leader:', mission.teamLeader.name);
      }
    } catch (pushError) {
      console.error('Failed to send real-time notification:', pushError);
    }

    // Generate invoice only if approved and not already generated
    if (approved && !mission.invoiceGenerated) {
      try {
        await generateInvoiceForMission(missionId);
        console.log('📄 Invoice generated for approved mission');
      } catch (invoiceError) {
        console.error('Failed to generate invoice:', invoiceError);
        // Don't fail the whole request if invoice generation fails
      }
    }

    console.log(`✅ Mission validation completed: ${approved ? 'APPROVED' : correctionNeeded ? 'CORRECTIONS NEEDED' : 'LITIGE'}`);
    console.log(`   New status: ${newStatus}`);

    return NextResponse.json({
      success: true,
      mission: updatedMission,
      message: approved 
        ? 'Mission approuvée avec succès'
        : correctionNeeded
          ? 'Mission rejetée - Équipe notifiée pour corrections'
          : 'Mission maintenue en contrôle qualité - Litige en cours de résolution'
    });

  } catch (error) {
    console.error('❌ Mission validation error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
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

    // Generate invoice number in F-NUM/YEAR format
    const invoiceNumber = await generateInvoiceNumber();

    // FIXED: Proper TTC amount from quote
    const amount = mission.quote.finalPrice;

    // FIXED: Invoice schema doesn't have quoteId - use missionId only
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        missionId: mission.id,
        leadId: mission.leadId,
        // quoteId removed - not in schema
        amount: amount,
        status: 'SENT',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        description: `Prestation de nettoyage - Mission ${mission.missionNumber}`,
        createdAt: new Date()
      }
    });

    await prisma.mission.update({
      where: { id: missionId },
      data: { 
        invoiceGenerated: true,
        invoiceId: invoice.id,
        updatedAt: new Date()
      }
    });

    console.log('✅ Invoice created:', invoiceNumber, '- Amount:', amount);
    return invoice;

  } catch (error) {
    console.error('Failed to generate invoice:', error);
    throw error;
  }
}