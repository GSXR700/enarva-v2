// app/api/missions/[id]/route.ts - FIXED DEBUGGING VERSION
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { ExtendedUser } from '@/types/next-auth';
import { missionService } from '@/services/mission.service';

const prisma = new PrismaClient();

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

    console.log('🔍 Fetching mission with ID:', id);

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
          select: {
            id: true,
            type: true,
            status: true,
            checkedBy: true,
            checkedAt: true,
            notes: true,
            photos: true,
            issues: true,
            validatedAt: true
          },
          orderBy: {
            checkedAt: 'desc'
          }
        },
        fieldReport: {
          select: {
            id: true,
            generalObservations: true,
            clientFeedback: true,
            issuesEncountered: true,
            materialsUsed: true,
            hoursWorked: true,
            beforePhotos: true,
            afterPhotos: true,
            submissionDate: true,
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
          select: {
            id: true,
            quantity: true,
            notes: true,
            usedAt: true,
            inventory: {
              select: {
                id: true,
                name: true,
                unit: true,
                unitPrice: true
              }
            }
          },
          orderBy: {
            usedAt: 'desc'
          }
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            status: true,
            description: true,
            issueDate: true,
            dueDate: true
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
      console.log('❌ Mission not found:', id);
      return new NextResponse('Mission not found', { status: 404 });
    }

    console.log('✅ Mission found with', mission.tasks.length, 'tasks');
    console.log('📋 Task details:', mission.tasks.map(t => ({ id: t.id, title: t.title, status: t.status })));

    return NextResponse.json(mission);
  } catch (error) {
    console.error('❌ Failed to fetch mission:', error);
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
    
    // ENHANCED DEBUGGING: Log the exact payload being sent
    console.log('🔍 DEBUGGING - Mission Update Request Body:');
    console.log('🔍 Full payload:', JSON.stringify(body, null, 2));
    console.log('🔍 Keys in payload:', Object.keys(body));
    console.log('🔍 actualStartTime:', body.actualStartTime);
    console.log('🔍 actualEndTime:', body.actualEndTime);
    console.log('🔍 scheduledDate:', body.scheduledDate);
    console.log('🔍 tasks array length:', body.tasks?.length || 0);
    
    // SKIP VALIDATION - Use mission service directly
    console.log('🔍 Bypassing validation and using mission service directly...');
    
    try {
      // Use mission service which handles validation internally
      const updatedMission = await missionService.updateMission(id, body);
      
      console.log('✅ Mission updated successfully via service:', updatedMission.id);
      
      // FIXED: Fetch complete mission with tasks after service update
      const completeUpdatedMission = await prisma.mission.findUnique({
        where: { id: updatedMission.id },
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

      console.log('✅ Complete mission fetched with', completeUpdatedMission?.tasks?.length || 0, 'tasks');
      return NextResponse.json(completeUpdatedMission);
      
    } catch (serviceError: any) {
      console.error('🚨 Mission service error:', serviceError);
      
      // Handle service-specific errors
      if (serviceError.statusCode === 404) {
        return NextResponse.json({ 
          error: 'Mission not found',
          details: serviceError.message 
        }, { status: 404 });
      }
      
      if (serviceError.statusCode === 400) {
        return NextResponse.json({ 
          error: 'Invalid data provided',
          details: serviceError.message 
        }, { status: 400 });
      }
      
      // Fallback to manual update if service fails
      console.log('🔄 Falling back to manual database update...');
      return await fallbackManualUpdate(id, body, user);
    }

  } catch (error) {
    console.error('🚨 Mission update error:', error);
    
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

// Fallback manual update function
async function fallbackManualUpdate(id: string, body: any, user: ExtendedUser) {
  console.log('🔄 Executing fallback manual update...');
  
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
    
    // Handle date fields with proper conversion
    if (body.scheduledDate) {
      dataToUpdate.scheduledDate = new Date(body.scheduledDate);
    }
    if (body.actualStartTime !== undefined) {
      dataToUpdate.actualStartTime = body.actualStartTime ? 
        new Date(body.actualStartTime) : null;
    }
    if (body.actualEndTime !== undefined) {
      dataToUpdate.actualEndTime = body.actualEndTime ? 
        new Date(body.actualEndTime) : null;
    }

    // Handle duration - accept any numeric value
    if (body.estimatedDuration !== undefined) {
      const duration = typeof body.estimatedDuration === 'string' 
        ? parseFloat(body.estimatedDuration) 
        : body.estimatedDuration;
      dataToUpdate.estimatedDuration = isNaN(duration) ? existingMission.estimatedDuration : duration;
    }

    // Simple field mappings - accept all values
    const simpleFields = [
      'address', 'coordinates', 'accessNotes', 'priority', 'status', 'type',
      'teamLeaderId', 'teamId', 'clientValidated', 'clientFeedback', 'clientRating',
      'adminValidated', 'adminValidatedBy', 'adminNotes', 'qualityScore', 
      'issuesFound', 'correctionRequired'
    ];

    simpleFields.forEach(field => {
      if (body[field] !== undefined) {
        dataToUpdate[field] = body[field];
      }
    });

    // CRITICAL FIX: Handle tasks properly with better error handling
    if (body.tasks !== undefined && Array.isArray(body.tasks)) {
      console.log('🔧 Updating tasks:', body.tasks.length, 'tasks provided');
      
      // Delete existing tasks
      await tx.task.deleteMany({
        where: { missionId: id }
      });

      // Create new tasks if any provided
      if (body.tasks.length > 0) {
        const tasksToCreate = body.tasks
          .filter((task: any) => task.title && task.title.trim() !== '')
          .map((task: any) => ({
            missionId: id,
            title: task.title.trim(),
            description: task.description || null,
            category: task.category || 'GENERAL',
            type: task.type || 'EXECUTION',
            status: task.status || 'ASSIGNED',
            estimatedTime: task.estimatedTime || null,
            actualTime: task.actualTime || null,
            assignedToId: task.assignedToId || null,
            notes: task.notes || null,
          }));

        if (tasksToCreate.length > 0) {
          try {
            await tx.task.createMany({
              data: tasksToCreate
            });
            console.log('✅ Successfully created', tasksToCreate.length, 'tasks');
          } catch (taskError) {
            console.error('❌ Failed to create tasks:', taskError);
            throw taskError; // Don't silently fail - this is critical
          }
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

    // Create activity log
    if (body.status && body.status !== existingMission.status) {
      try {
        await tx.activity.create({
          data: {
            type: 'MISSION_STATUS_UPDATED',
            title: 'Statut de mission mis à jour',
            description: `Mission ${existingMission.missionNumber} - statut changé de ${existingMission.status} à ${body.status}`,
            userId: user.id,
            leadId: existingMission.leadId,
            metadata: { 
              missionId: existingMission.id, 
              oldStatus: existingMission.status, 
              newStatus: body.status 
            }
          }
        });
      } catch (activityError) {
        console.warn('Failed to create activity log:', activityError);
      }
    }

    console.log('✅ Fallback update completed with', updated.tasks.length, 'tasks');
    return updated;
  });

  console.log('✅ Fallback manual update completed:', updatedMission.id);
  return NextResponse.json(updatedMission);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as ExtendedUser;
    
    if (!user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!['ADMIN', 'MANAGER'].includes(user.role)) {
      return new NextResponse('Forbidden - Admin or Manager access required', { status: 403 });
    }
    
    const { id } = await params;

    await prisma.$transaction(async (tx) => {
      const mission = await tx.mission.findUnique({
        where: { id },
        select: {
          id: true,
          missionNumber: true,
          leadId: true
        }
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

      try {
        await tx.activity.create({
          data: {
            type: 'SYSTEM_MAINTENANCE',
            title: 'Mission supprimée',
            description: `Mission ${mission.missionNumber} supprimée par ${user.name}`,
            userId: user.id,
            leadId: mission.leadId,
            metadata: {
              deletedMissionId: id,
              missionNumber: mission.missionNumber,
              deletedBy: user.name,
              deletionType: 'mission_deletion'
            }
          }
        });
      } catch (activityError) {
        console.warn('Failed to create deletion activity log:', activityError);
      }
    });

    return NextResponse.json({ 
      message: 'Mission deleted successfully',
      deletedMissionId: id 
    });

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