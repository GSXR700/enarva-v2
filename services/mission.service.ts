// services/mission.service.ts - COMPLETELY CORRECTED VERSION WITH FULL RELATIONSHIPS
import { PrismaClient, Prisma, Mission } from '@prisma/client';
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
    const { leadId, teamLeaderId, quoteId, taskTemplateId, ...missionData } = data;

    if (!quoteId) {
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

      // Fixed: Build mission data without 'type' field and properly handle quote relation
      const missionCreateData: Prisma.MissionCreateInput = {
        missionNumber,
        status: 'SCHEDULED',
        priority: missionData.priority || 'NORMAL',
        scheduledDate: new Date(missionData.scheduledDate),
        estimatedDuration: missionData.estimatedDuration,
        address: missionData.address,
        // Fixed: Convert undefined to null for all optional fields with exactOptionalPropertyTypes
        coordinates: missionData.coordinates ?? null,
        accessNotes: missionData.accessNotes ?? null,
        adminNotes: missionData.adminNotes ?? null,
        qualityScore: missionData.qualityScore ?? null,
        issuesFound: missionData.issuesFound ?? null,
        // Fixed: Handle adminValidated - convert undefined to null explicitly
        adminValidated: missionData.adminValidated ?? null,
        // Relations
        lead: { connect: { id: leadId } },
        teamLeader: { connect: { id: teamLeaderId } },
        // Fixed: Only include quote if quoteId exists, don't use undefined
        ...(quoteId && { quote: { connect: { id: quoteId } } }),
      };

      // Create the mission
      const newMission = await tx.mission.create({
        data: missionCreateData,
      });

      // Create default tasks if template is provided
      if (taskTemplateId) {
        const template = await tx.taskTemplate.findUnique({
          where: { id: taskTemplateId },
        });

        if (template && template.tasks) {
          const templateTasks = template.tasks as any[];
          
          for (const taskData of templateTasks) {
            // Fixed: Properly handle task creation with exact optional property types
            const taskCreateData: Prisma.TaskCreateInput = {
              title: taskData.title,
              description: taskData.description ?? null,
              category: taskData.category || 'GENERAL',
              type: taskData.type || 'EXECUTION',
              estimatedTime: taskData.estimatedTime ?? null,
              status: 'ASSIGNED',
              mission: { connect: { id: newMission.id } },
              // Fixed: Only include assignedTo if taskData.assignedToId exists
              ...(taskData.assignedToId && {
                assignedTo: { connect: { id: taskData.assignedToId } }
              }),
            };

            await tx.task.create({
              data: taskCreateData,
            });
          }
        }
      }

      // Update the lead status
      await tx.lead.update({
        where: { id: leadId },
        data: { 
          status: 'MISSION_SCHEDULED',
          assignedTo: { connect: { id: teamLeaderId } }
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
          user: { connect: { id: teamLeaderId } },
          lead: { connect: { id: leadId } },
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

    // Fixed: Properly handle optional fields that could be undefined
    const updateData: any = {
      ...data,
      coordinates: data.coordinates ?? undefined,
      accessNotes: data.accessNotes ?? undefined,
      adminNotes: data.adminNotes ?? undefined,
      qualityScore: data.qualityScore ?? undefined,
      issuesFound: data.issuesFound ?? undefined,
    };

    // Handle relation updates
    if (data.teamLeaderId !== undefined) {
      if (data.teamLeaderId) {
        updateData.teamLeader = { connect: { id: data.teamLeaderId } };
      } else {
        updateData.teamLeader = { disconnect: true };
      }
      delete updateData.teamLeaderId;
    }

    if (data.leadId !== undefined) {
      if (data.leadId) {
        updateData.lead = { connect: { id: data.leadId } };
      }
      delete updateData.leadId;
    }

    if (data.quoteId !== undefined) {
      if (data.quoteId) {
        updateData.quote = { connect: { id: data.quoteId } };
      } else {
        updateData.quote = { disconnect: true };
      }
      delete updateData.quoteId;
    }

    return await this.prisma.mission.update({
      where: { id },
      data: updateData,
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

    // Fixed: Handle optional fields properly for patch operations
    const patchData: any = { ...data };
    
    // Convert undefined to null for optional fields that need explicit null values
    Object.keys(patchData).forEach(key => {
      if (patchData[key] === undefined && ['coordinates', 'accessNotes', 'adminNotes', 'qualityScore', 'issuesFound'].includes(key)) {
        patchData[key] = null;
      }
    });

    return await this.prisma.mission.update({
      where: { id },
      data: patchData,
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

  /**
   * Get mission statistics and analytics
   */
  public async getMissionStats(filters: {
    dateFrom?: Date;
    dateTo?: Date;
    teamLeaderId?: string;
    status?: string;
  } = {}) {
    const where: Prisma.MissionWhereInput = {};

    if (filters.dateFrom || filters.dateTo) {
      where.scheduledDate = {};
      if (filters.dateFrom) where.scheduledDate.gte = filters.dateFrom;
      if (filters.dateTo) where.scheduledDate.lte = filters.dateTo;
    }

    if (filters.teamLeaderId) {
      where.teamLeaderId = filters.teamLeaderId;
    }

    if (filters.status) {
      where.status = filters.status as any;
    }

    const [
      totalMissions,
      scheduledMissions,
      inProgressMissions,
      completedMissions,
      averageDuration,
      statusDistribution
    ] = await Promise.all([
      this.prisma.mission.count({ where }),
      this.prisma.mission.count({ where: { ...where, status: 'SCHEDULED' } }),
      this.prisma.mission.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      this.prisma.mission.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.mission.aggregate({
        where,
        _avg: { estimatedDuration: true }
      }),
      this.prisma.mission.groupBy({
        by: ['status'],
        where,
        _count: true
      })
    ]);

    const completionRate = totalMissions > 0 ? (completedMissions / totalMissions) * 100 : 0;

    return {
      totalMissions,
      scheduledMissions,
      inProgressMissions,
      completedMissions,
      completionRate: Math.round(completionRate * 100) / 100,
      averageDuration: Math.round((averageDuration._avg.estimatedDuration || 0) * 100) / 100,
      statusDistribution
    };
  }

  /**
   * Search missions with flexible criteria
   */
  public async searchMissions(query: string, options: {
    limit?: number;
    offset?: number;
    filters?: Prisma.MissionWhereInput;
  } = {}) {
    const { limit = 20, offset = 0, filters = {} } = options;

    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    
    const searchConditions: Prisma.MissionWhereInput[] = searchTerms.map(term => ({
      OR: [
        { missionNumber: { contains: term, mode: 'insensitive' } },
        { address: { contains: term, mode: 'insensitive' } },
        { lead: { firstName: { contains: term, mode: 'insensitive' } } },
        { lead: { lastName: { contains: term, mode: 'insensitive' } } },
        { lead: { phone: { contains: term } } },
        { teamLeader: { name: { contains: term, mode: 'insensitive' } } }
      ]
    }));

    const where: Prisma.MissionWhereInput = {
      AND: [...searchConditions, filters]
    };

    const [missions, total] = await Promise.all([
      this.prisma.mission.findMany({
        where,
        skip: offset,
        take: limit,
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true
            }
          },
          teamLeader: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          _count: {
            select: {
              tasks: true,
              expenses: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.mission.count({ where })
    ]);

    return { missions, total };
  }
}

// Export a singleton instance
export const missionService = new MissionService(prisma);