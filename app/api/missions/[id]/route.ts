// app/api/missions/[id]/route.ts - CORRECTED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, MissionStatus, Priority, MissionType, TaskCategory, TaskType, TaskStatus } from '@prisma/client';
import { ExtendedUser } from '@/types/next-auth';
import { z } from 'zod';

const prisma = new PrismaClient();

// FIXED: More flexible validation schema to handle various input formats
const missionUpdateSchema = z.object({
  scheduledDate: z.string().optional(),
  estimatedDuration: z.number().min(0).optional(),
  address: z.string().min(1).optional(),
  coordinates: z.string().optional().nullable(),
  accessNotes: z.string().optional().nullable(),
  priority: z.nativeEnum(Priority).optional(),
  status: z.nativeEnum(MissionStatus).optional(),
  type: z.nativeEnum(MissionType).optional(),
  teamLeaderId: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  actualStartTime: z.string().optional().nullable(),
  actualEndTime: z.string().optional().nullable(),
  clientValidated: z.boolean().optional(),
  clientFeedback: z.string().optional().nullable(),
  clientRating: z.number().min(1).max(5).optional().nullable(),
  adminValidated: z.boolean().optional(),
  adminValidatedBy: z.string().optional().nullable(),
  adminNotes: z.string().optional().nullable(),
  qualityScore: z.number().min(1).max(5).optional().nullable(),
  issuesFound: z.string().optional().nullable(),
  correctionRequired: z.boolean().optional(),
  tasks: z.array(z.object({
    id: z.string().optional(),
    title: z.string().min(1),
    description: z.string().optional().nullable(),
    category: z.nativeEnum(TaskCategory),
    type: z.nativeEnum(TaskType),
    status: z.nativeEnum(TaskStatus).default('ASSIGNED'),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).optional(),
    estimatedTime: z.number().min(0).optional().nullable(),
    actualTime: z.number().min(0).optional().nullable(),
    assignedToId: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })).optional(),
}).passthrough(); // FIXED: Allow additional fields

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    const { id } = await params;

    const mission = await prisma.mission.findUnique({
      where: { id },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            address: true,
            company: true,
            leadType: true,
          }
        },
        quote: {
          select: {
            id: true,
            quoteNumber: true,
            finalPrice: true,
            status: true,
            businessType: true,
          }
        },
        teamLeader: { 
          select: { 
            id: true, 
            name: true, 
            email: true, 
            image: true,
            role: true 
          } 
        },
        team: { 
          include: { 
            members: { 
              where: { isActive: true },
              include: { 
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    role: true
                  }
                }
              } 
            } 
          } 
        },
        tasks: {
          include: {
            assignedTo: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        expenses: {
          select: {
            id: true,
            amount: true,
            category: true,
            subCategory: true,
            description: true,
            date: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            date: 'desc'
          }
        },
        qualityChecks: {
          include: {
            mission: {
              select: {
                id: true,
                missionNumber: true
              }
            }
          }
        },
        fieldReport: {
          include: {
            submittedBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        inventoryUsed: {
          include: {
            inventory: {
              select: {
                id: true,
                name: true,
                unit: true,
                unitPrice: true
              }
            }
          }
        },
        conversation: {
          include: {
            participants: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            },
            messages: {
              include: {
                sender: {
                  select: {
                    id: true,
                    name: true,
                    image: true
                  }
                }
              },
              orderBy: {
                createdAt: 'desc'
              },
              take: 10
            }
          }
        }
      },
    });

    if (!mission) {
      return new NextResponse('Mission not found', { status: 404 });
    }

    return NextResponse.json(mission);
  } catch (error) {
    console.error('Failed to fetch mission:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleMissionUpdate(request, { params });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleMissionUpdate(request, { params });
}

async function handleMissionUpdate(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as ExtendedUser;
    if (!user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!['ADMIN', 'MANAGER', 'TEAM_LEADER', 'AGENT'].includes(user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    
    const { id } = await params;
    const body = await request.json();
    
    // FIXED: Enhanced logging for debugging
    console.log('Mission Update Request Body:', JSON.stringify(body, null, 2));
    
    const validationResult = missionUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.errors);
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      }, { status: 400 });
    }

    const validatedData = validationResult.data;

    const updatedMission = await prisma.$transaction(async (tx) => {
      const existingMission = await tx.mission.findUnique({
        where: { id },
        include: { tasks: true }
      });

      if (!existingMission) {
        throw new Error('Mission not found');
      }

      if (user.role === 'TEAM_LEADER' && existingMission.teamLeaderId !== user.id) {
        throw new Error('Not authorized to update this mission');
      }

      const dataToUpdate: any = {};
      
      if (validatedData.scheduledDate) {
        // FIXED: Handle different date formats more flexibly
        try {
          dataToUpdate.scheduledDate = new Date(validatedData.scheduledDate);
        } catch (e) {
          throw new Error('Invalid scheduledDate format');
        }
      }
      if (validatedData.estimatedDuration !== undefined) {
        // FIXED: Handle duration conversion more carefully
        if (validatedData.estimatedDuration > 24) {
          // Already in minutes
          dataToUpdate.estimatedDuration = validatedData.estimatedDuration;
        } else {
          // Convert hours to minutes
          dataToUpdate.estimatedDuration = Math.round(validatedData.estimatedDuration * 60);
        }
      }
      if (validatedData.address) dataToUpdate.address = validatedData.address;
      if (validatedData.coordinates !== undefined) dataToUpdate.coordinates = validatedData.coordinates;
      if (validatedData.accessNotes !== undefined) dataToUpdate.accessNotes = validatedData.accessNotes;
      if (validatedData.priority) dataToUpdate.priority = validatedData.priority;
      if (validatedData.status) dataToUpdate.status = validatedData.status;
      if (validatedData.type) dataToUpdate.type = validatedData.type;
      if (validatedData.teamLeaderId !== undefined) dataToUpdate.teamLeaderId = validatedData.teamLeaderId;
      if (validatedData.teamId !== undefined) dataToUpdate.teamId = validatedData.teamId;
      if (validatedData.actualStartTime !== undefined) {
        dataToUpdate.actualStartTime = validatedData.actualStartTime ? new Date(validatedData.actualStartTime) : null;
      }
      if (validatedData.actualEndTime !== undefined) {
        dataToUpdate.actualEndTime = validatedData.actualEndTime ? new Date(validatedData.actualEndTime) : null;
      }
      if (validatedData.clientValidated !== undefined) dataToUpdate.clientValidated = validatedData.clientValidated;
      if (validatedData.clientFeedback !== undefined) dataToUpdate.clientFeedback = validatedData.clientFeedback;
      if (validatedData.clientRating !== undefined) dataToUpdate.clientRating = validatedData.clientRating;
      if (validatedData.adminValidated !== undefined) dataToUpdate.adminValidated = validatedData.adminValidated;
      if (validatedData.adminValidatedBy !== undefined) dataToUpdate.adminValidatedBy = validatedData.adminValidatedBy;
      if (validatedData.adminNotes !== undefined) dataToUpdate.adminNotes = validatedData.adminNotes;
      if (validatedData.qualityScore !== undefined) dataToUpdate.qualityScore = validatedData.qualityScore;
      if (validatedData.issuesFound !== undefined) dataToUpdate.issuesFound = validatedData.issuesFound;
      if (validatedData.correctionRequired !== undefined) dataToUpdate.correctionRequired = validatedData.correctionRequired;

      // FIXED: Better task handling with error checking
      if (validatedData.tasks !== undefined) {
        console.log('Updating tasks:', validatedData.tasks.length, 'tasks provided');
        
        // Delete existing tasks first
        await tx.task.deleteMany({
          where: { missionId: id }
        });

        // Only create new tasks if any are provided
        if (validatedData.tasks.length > 0) {
          const tasksToCreate = validatedData.tasks.map((task, index) => {
            // FIXED: Better validation and defaults for task data
            if (!task.title || task.title.trim() === '') {
              throw new Error(`Task at index ${index} must have a title`);
            }
            
            return {
              missionId: id,
              title: task.title.trim(),
              description: task.description || null,
              category: task.category,
              type: task.type,
              status: task.status || 'ASSIGNED',
              priority: task.priority || 'NORMAL',
              estimatedTime: task.estimatedTime || null,
              actualTime: task.actualTime || null,
              assignedToId: task.assignedToId || null,
              notes: task.notes || null,
            };
          });

          try {
            await tx.task.createMany({
              data: tasksToCreate
            });
            console.log('Successfully created', tasksToCreate.length, 'tasks');
          } catch (taskError) {
            console.error('Failed to create tasks:', taskError);
            throw new Error(`Failed to create tasks: ${taskError instanceof Error ? taskError.message : 'Unknown error'}`);
          }
        }
      }

      // Update the mission
      const updated = await tx.mission.update({
        where: { id },
        data: dataToUpdate,
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              address: true,
              company: true
            }
          },
          quote: {
            select: {
              id: true,
              quoteNumber: true,
              finalPrice: true,
              status: true
            }
          },
          teamLeader: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true
            }
          },
          team: { 
            include: { 
              members: { 
                where: { isActive: true },
                include: { 
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      image: true,
                      role: true
                    }
                  }
                } 
              } 
            } 
          },
          tasks: {
            include: {
              assignedTo: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      image: true
                    }
                  }
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      });

      // Create activity log for status changes
      if (validatedData.status && validatedData.status !== existingMission.status) {
        try {
          await tx.activity.create({
            data: {
              type: 'MISSION_STATUS_UPDATED',
              title: 'Statut de mission mis à jour',
              description: `Mission ${existingMission.missionNumber} - statut changé de ${existingMission.status} à ${validatedData.status}`,
              userId: user.id,
              leadId: existingMission.leadId,
              metadata: { 
                missionId: existingMission.id, 
                oldStatus: existingMission.status, 
                newStatus: validatedData.status 
              }
            }
          });
        } catch (activityError) {
          // Log activity error but don't fail the update
          console.warn('Failed to create activity log:', activityError);
        }
      }

      return updated;
    });

    console.log('Mission updated successfully:', updatedMission.id);
    return NextResponse.json(updatedMission);

  } catch (error) {
    // FIXED: Better error handling and response formatting
    console.error('Mission update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      }, { status: 400 });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (errorMessage.includes('not found')) {
      return NextResponse.json({ 
        error: 'Mission not found',
        details: errorMessage 
      }, { status: 404 });
    }
    
    if (errorMessage.includes('Not authorized')) {
      return NextResponse.json({ 
        error: 'Unauthorized access',
        details: errorMessage 
      }, { status: 403 });
    }
    
    if (errorMessage.includes('Invalid') || errorMessage.includes('must have')) {
      return NextResponse.json({ 
        error: 'Invalid data provided',
        details: errorMessage 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to update mission', 
      details: errorMessage 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as ExtendedUser;
    if (!user?.id || user.role !== 'ADMIN') {
      return new NextResponse('Forbidden - Admin access required', { status: 403 });
    }
    const { id } = await params;

    await prisma.$transaction(async (tx) => {
      const mission = await tx.mission.findUnique({
        where: { id },
      });

      if (!mission) {
        throw new Error('Mission not found');
      }

      await tx.task.deleteMany({ where: { missionId: id } });
      await tx.qualityCheck.deleteMany({ where: { missionId: id } });
      await tx.inventoryUsage.deleteMany({ where: { missionId: id } });
      await tx.expense.deleteMany({ where: { missionId: id } });
      
      const conversation = await tx.conversation.findUnique({ 
        where: { missionId: id } 
      });
      if (conversation) {
        await tx.message.deleteMany({ 
          where: { conversationId: conversation.id } 
        });
        await tx.conversation.delete({ 
          where: { missionId: id } 
        });
      }
      
      await tx.fieldReport.deleteMany({ where: { missionId: id } });
      await tx.invoice.deleteMany({ where: { missionId: id } });
      
      await tx.mission.delete({ where: { id } });

      await tx.activity.create({
        data: {
          type: 'SYSTEM_MAINTENANCE',
          title: 'Mission supprimée',
          description: `Mission ${mission.missionNumber} supprimée`,
          userId: user.id,
          leadId: mission.leadId,
          metadata: {
            deletedMissionId: id,
            missionNumber: mission.missionNumber,
            deletedBy: user.name
          }
        }
      });
    });

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Failed to delete mission:', error);
    
    if (errorMessage.includes('not found')) {
      return NextResponse.json({ 
        error: 'Mission not found',
        details: errorMessage 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to delete mission', 
      details: errorMessage 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}