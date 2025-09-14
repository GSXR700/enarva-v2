// services/mission.service.ts - COMPLETELY CORRECTED VERSION WITH FULL RELATIONSHIPS
import { PrismaClient, Prisma, LeadStatus, Mission } from '@prisma/client';
import { CreateMissionInput } from '@/lib/validation';
import { AppError } from '@/lib/error-handler';

const prisma = new PrismaClient();

class MissionService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Fetches a paginated and filtered list of missions with all necessary relationships.
   */
  public async getMissions(where: Prisma.MissionWhereInput, page: number, limit: number, sortBy: string, sortOrder: 'asc' | 'desc') {
    const [missions, totalCount] = await this.prisma.$transaction([
      this.prisma.mission.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        include: {
          lead: { 
            select: { 
              id: true, 
              firstName: true, 
              lastName: true, 
              phone: true, 
              email: true, 
              address: true 
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
                      image: true,
                      role: true
                    }
                  }
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
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
          expenses: {
            select: {
              id: true,
              amount: true,
              category: true,
              description: true,
              date: true
            }
          },
          _count: { 
            select: { 
              tasks: true, 
              qualityChecks: true,
              expenses: true
            } 
          }
        },
        orderBy: { [sortBy]: sortOrder }
      }),
      this.prisma.mission.count({ where })
    ]);
    return { missions, totalCount };
  }

  /**
   * Get a single mission by ID with full details
   */
  public async getMissionById(id: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id },
      include: {
        lead: true,
        quote: {
          include: {
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        team: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    role: true,
                    onlineStatus: true
                  }
                }
              }
            }
          }
        },
        teamLeader: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            onlineStatus: true
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
                    image: true,
                    role: true
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
          include: {
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
        qualityChecks: true,
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
      }
    });

    if (!mission) {
      throw new AppError(404, 'Mission not found', true);
    }

    return mission;
  }

  /**
   * Creates a new mission, generates tasks from a template, and updates the related lead.
   */
  public async createMission(data: CreateMissionInput): Promise<Mission> {
    const { leadId, teamLeaderId, quoteId, type, taskTemplateId, ...missionData } = data;

    if (type === 'SERVICE' && !quoteId) {
      throw new AppError(400, 'Quote ID is required for service missions.', true);
    }

    if (!teamLeaderId) {
      throw new AppError(400, 'Team leader ID is required.', true);
    }

    return await this.prisma.$transaction(async (tx) => {
      // Verify the lead exists
      const lead = await tx.lead.findUnique({
        where: { id: leadId },
      });

      if (!lead) {
        throw new AppError(404, 'Lead not found.', true);
      }

      // Verify the team leader exists
      const teamLeader = await tx.user.findUnique({
        where: { id: teamLeaderId },
      });

      if (!teamLeader) {
        throw new AppError(404, 'Team leader not found.', true);
      }

      // Generate mission number
      const missionCount = await tx.mission.count();
      const missionNumber = `MSN-${(missionCount + 1).toString().padStart(6, '0')}`;

      // Create the mission
      const newMission = await tx.mission.create({
        data: {
          ...missionData,
          missionNumber,
          leadId,
          teamLeaderId,
          quoteId,
          status: 'SCHEDULED',
        },
      });

      // Create default tasks if template is provided
      if (taskTemplateId) {
        const template = await tx.taskTemplate.findUnique({
          where: { id: taskTemplateId },
        });

        if (template && template.tasks) {
          const templateTasks = template.tasks as any[];
          
          for (const taskData of templateTasks) {
            await tx.task.create({
              data: {
                title: taskData.title,
                description: taskData.description || null,
                category: taskData.category || 'GENERAL',
                type: taskData.type || 'EXECUTION',
                estimatedTime: taskData.estimatedTime || null,
                missionId: newMission.id,
                assignedToId: taskData.assignedToId || null,
                status: 'ASSIGNED',
              },
            });
          }
        }
      }

      // Update the lead status
      await tx.lead.update({
        where: { id: leadId },
        data: { 
          status: 'MISSION_SCHEDULED',
          assignedToId: teamLeaderId
        },
      });

      // Update quote status if linked
      if (quoteId) {
        await tx.quote.update({
          where: { id: quoteId },
          data: { status: 'ACCEPTED' },
        });
      }

      // Create activity log
      await tx.activity.create({
        data: {
          type: 'MISSION_SCHEDULED',
          title: 'Mission créée',
          description: `Mission ${missionNumber} créée pour ${lead.firstName} ${lead.lastName}`,
          userId: teamLeaderId,
          leadId: leadId,
          metadata: {
            missionId: newMission.id,
            missionNumber: missionNumber,
          },
        },
      });

      return newMission;
    });
  }

  /**
   * Updates a mission with the provided data.
   */
  public async updateMission(id: string, data: any) {
    const mission = await this.prisma.mission.findUnique({
      where: { id },
    });

    if (!mission) {
      throw new AppError(404, 'Mission not found', true);
    }

    return await this.prisma.mission.update({
      where: { id },
      data,
      include: {
        lead: true,
        teamLeader: true,
        team: {
          include: {
            members: {
              include: {
                user: true
              }
            }
          }
        },
        tasks: {
          include: {
            assignedTo: {
              include: {
                user: true
              }
            }
          }
        },
      },
    });
  }

  /**
   * Partially updates a mission (PATCH operation).
   */
  public async patchMission(id: string, data: any) {
    const mission = await this.prisma.mission.findUnique({
      where: { id },
    });

    if (!mission) {
      throw new AppError(404, 'Mission not found', true);
    }

    return await this.prisma.mission.update({
      where: { id },
      data,
      include: {
        lead: true,
        teamLeader: true,
        tasks: true,
      },
    });
  }

  /**
   * Deletes a mission and all related data.
   */
  public async deleteMission(id: string) {
    return await this.prisma.$transaction(async (tx) => {
      const mission = await tx.mission.findUnique({
        where: { id },
        include: { lead: true }
      });

      if (!mission) {
        throw new AppError(404, 'Mission not found', true);
      }

      // Delete related data
      await tx.task.deleteMany({ where: { missionId: id } });
      await tx.qualityCheck.deleteMany({ where: { missionId: id } });
      await tx.inventoryUsage.deleteMany({ where: { missionId: id } });
      await tx.expense.deleteMany({ where: { missionId: id } });
      await tx.fieldReport.deleteMany({ where: { missionId: id } });

      // Delete conversation if exists
      const conversation = await tx.conversation.findUnique({ where: { missionId: id } });
      if (conversation) {
        await tx.message.deleteMany({ where: { conversationId: conversation.id } });
        await tx.conversation.delete({ where: { missionId: id } });
      }

      // Delete invoice if exists
      await tx.invoice.deleteMany({ where: { missionId: id } });

      // Finally delete the mission
      await tx.mission.delete({ where: { id } });

      return { success: true, message: 'Mission deleted successfully' };
    });
  }
}

// Export a singleton instance
export const missionService = new MissionService(prisma);