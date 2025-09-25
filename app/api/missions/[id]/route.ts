// app/api/missions/[id]/route.ts - FIXED WITH CORRECT QUALITYCHECK FIELDS
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { ExtendedUser } from '@/types/next-auth';
import { validateMissionUpdate } from '@/lib/validations';

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
            type: true, // FIXED: Use 'type' instead of 'checkType'
            status: true,
            checkedBy: true, // FIXED: This is a string field, not a relation
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
    
    console.log('Mission Update Request Body:', JSON.stringify(body, null, 2));
    
    // Use modular validation from centralized index
    const validationResult = validateMissionUpdate(body);
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

      // Build update data more cleanly using validated data
      const dataToUpdate: any = {};
      
      // Handle date fields with proper conversion
      if (validatedData.scheduledDate) {
        dataToUpdate.scheduledDate = new Date(validatedData.scheduledDate);
      }
      if (validatedData.actualStartTime !== undefined) {
        dataToUpdate.actualStartTime = validatedData.actualStartTime ? 
          new Date(validatedData.actualStartTime) : null;
      }
      if (validatedData.actualEndTime !== undefined) {
        dataToUpdate.actualEndTime = validatedData.actualEndTime ? 
          new Date(validatedData.actualEndTime) : null;
      }

      // Handle duration - the validation already handles conversion
      if (validatedData.estimatedDuration !== undefined) {
        // If it's already in minutes (> 24), keep as is. Otherwise convert hours to minutes
        dataToUpdate.estimatedDuration = validatedData.estimatedDuration > 24 
          ? validatedData.estimatedDuration 
          : Math.round(validatedData.estimatedDuration * 60);
      }

      // Simple field mappings - these are already validated
      const simpleFields = [
        'address', 'coordinates', 'accessNotes', 'priority', 'status', 'type',
        'teamLeaderId', 'teamId', 'clientValidated', 'clientFeedback', 'clientRating',
        'adminValidated', 'adminValidatedBy', 'adminNotes', 'qualityScore', 
        'issuesFound', 'correctionRequired'
      ];

      simpleFields.forEach(field => {
        if (validatedData[field] !== undefined) {
          dataToUpdate[field] = validatedData[field];
        }
      });

      // Handle tasks with proper field filtering for Prisma schema
      if (validatedData.tasks !== undefined) {
        console.log('Updating tasks:', validatedData.tasks.length, 'tasks provided');
        
        // Delete existing tasks first
        await tx.task.deleteMany({
          where: { missionId: id }
        });

        // Create new tasks if any are provided
        if (validatedData.tasks.length > 0) {
          const tasksToCreate = validatedData.tasks.map((task, index) => {
            if (!task.title || task.title.trim() === '') {
              throw new Error(`Task at index ${index} must have a title`);
            }
            
            // Map to exact Prisma schema fields
            return {
              missionId: id,
              title: task.title.trim(),
              description: task.description || null,
              category: task.category,
              type: task.type,
              status: task.status || 'ASSIGNED',
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
            throw new Error(`Failed to create tasks: ${taskError instanceof Error ? 
              taskError.message : 'Unknown error'}`);
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

      // Create activity log for status changes with valid activity type
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
          console.warn('Failed to create activity log:', activityError);
        }
      }

      return updated;
    });

    console.log('Mission updated successfully:', updatedMission.id);
    return NextResponse.json(updatedMission);

  } catch (error) {
    console.error('Mission update error:', error);
    
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

      // Clean up related records in correct order
      
      // Delete tasks first
      await tx.task.deleteMany({ where: { missionId: id } });

      // Delete quality checks
      await tx.qualityCheck.deleteMany({ where: { missionId: id } });

      // Delete inventory usage
      await tx.inventoryUsage.deleteMany({ where: { missionId: id } });

      // Delete expenses
      await tx.expense.deleteMany({ where: { missionId: id } });
      
      // Handle conversation and messages
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
      
      // Delete field report
      await tx.fieldReport.deleteMany({ where: { missionId: id } });

      // Delete invoice
      await tx.invoice.deleteMany({ where: { missionId: id } });
      
      // Delete the mission itself
      await tx.mission.delete({ where: { id } });

      // Create activity log with valid activity type
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