// services/mission.service.ts - COMPLETE ERROR-FREE VERSION
import { PrismaClient, Mission, MissionStatus, Priority, MissionType, TaskStatus, TaskCategory } from '@prisma/client';

const prisma = new PrismaClient();

class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export interface CreateMissionInput {
  leadId: string;
  quoteId?: string | null;
  teamLeaderId?: string | null;
  teamId?: string | null;
  scheduledDate: string;
  estimatedDuration: number;
  address: string;
  coordinates?: string | null;
  accessNotes?: string | null;
  priority?: Priority;
  type?: MissionType;
  taskTemplateId?: string | null;
  adminNotes?: string | null;
}

export interface UpdateMissionInput {
  scheduledDate?: string;
  estimatedDuration?: number;
  address?: string;
  coordinates?: string | null;
  accessNotes?: string | null;
  priority?: Priority;
  status?: MissionStatus;
  type?: MissionType;
  teamLeaderId?: string | null;
  teamId?: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  clientValidated?: boolean;
  clientFeedback?: string | null;
  clientRating?: number | null;
  adminValidated?: boolean;
  adminValidatedBy?: string | null;
  adminNotes?: string | null;
  qualityScore?: number | null;
  issuesFound?: string | null;
  correctionRequired?: boolean;
  tasks?: Array<{
    id?: string;
    title: string;
    description?: string | null;
    category: TaskCategory;
    type: 'EXECUTION' | 'QUALITY_CHECK' | 'DOCUMENTATION' | 'CLIENT_INTERACTION';
    status?: TaskStatus;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
    estimatedTime?: number | null;
    actualTime?: number | null;
    assignedToId?: string | null;
    notes?: string | null;
  }>;
}

export interface MissionFilters {
  status?: MissionStatus | MissionStatus[];
  priority?: Priority | Priority[];
  teamLeaderId?: string;
  teamId?: string;
  leadId?: string;
  type?: MissionType;
  scheduledDateFrom?: Date;
  scheduledDateTo?: Date;
  search?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class MissionService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  public async getAllMissions(
    filters: MissionFilters = {},
    pagination: PaginationOptions = {}
  ) {
    const {
      status,
      priority,
      teamLeaderId,
      teamId,
      leadId,
      type,
      scheduledDateFrom,
      scheduledDateTo,
      search
    } = filters;

    const {
      page = 1,
      limit = 10,
      sortBy = 'scheduledDate',
      sortOrder = 'asc'
    } = pagination;

    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (status) {
      if (Array.isArray(status)) {
        whereClause.status = { in: status };
      } else {
        whereClause.status = status;
      }
    }

    if (priority) {
      if (Array.isArray(priority)) {
        whereClause.priority = { in: priority };
      } else {
        whereClause.priority = priority;
      }
    }

    if (teamLeaderId) {
      whereClause.teamLeaderId = teamLeaderId;
    }

    if (teamId) {
      whereClause.teamId = teamId;
    }

    if (leadId) {
      whereClause.leadId = leadId;
    }

    if (type) {
      whereClause.type = type;
    }

    if (scheduledDateFrom || scheduledDateTo) {
      whereClause.scheduledDate = {};
      if (scheduledDateFrom) {
        whereClause.scheduledDate.gte = scheduledDateFrom;
      }
      if (scheduledDateTo) {
        whereClause.scheduledDate.lte = scheduledDateTo;
      }
    }

    if (search) {
      whereClause.OR = [
        { missionNumber: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { lead: { firstName: { contains: search, mode: 'insensitive' } } },
        { lead: { lastName: { contains: search, mode: 'insensitive' } } },
        { lead: { company: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const orderByClause: any = {};
    if (sortBy === 'lead') {
      orderByClause.lead = { firstName: sortOrder };
    } else if (sortBy === 'teamLeader') {
      orderByClause.teamLeader = { name: sortOrder };
    } else {
      orderByClause[sortBy] = sortOrder;
    }

    const [missions, total] = await Promise.all([
      this.prisma.mission.findMany({
        where: whereClause,
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
            select: {
              id: true,
              title: true,
              status: true,
              category: true,
              type: true,
              estimatedTime: true,
              actualTime: true,
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
        orderBy: [orderByClause],
        skip,
        take: limit,
      }),
      this.prisma.mission.count({ where: whereClause })
    ]);

    return {
      missions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  public async getMissionById(id: string) {
    const mission = await this.prisma.mission.findUnique({
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
            gpsLocation: true,
          }
        },
        quote: {
          select: {
            id: true,
            quoteNumber: true,
            finalPrice: true,
            status: true,
            businessType: true,
            lineItems: true,
            subTotalHT: true,
            vatAmount: true,
            totalTTC: true,
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
        qualityChecks: {
          orderBy: {
            checkedAt: 'desc' // ✅ CORRECT - checkedAt exists in QualityCheck model
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
      }
    });

    if (!mission) {
      throw new AppError(404, 'Mission not found', true);
    }

    return mission;
  }

  public async createMission(data: CreateMissionInput): Promise<Mission> {
    const { leadId, teamLeaderId, quoteId, taskTemplateId } = data;

    return await this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({
        where: { id: leadId },
      });

      if (!lead) {
        throw new AppError(404, 'Lead not found.', true);
      }

      if (teamLeaderId) {
        const teamLeader = await tx.user.findUnique({
          where: { id: teamLeaderId },
        });

        if (!teamLeader || teamLeader.role !== 'TEAM_LEADER') {
          throw new AppError(404, 'Team leader not found or invalid role.', true);
        }
      }

      if (quoteId) {
        const quote = await tx.quote.findUnique({
          where: { id: quoteId },
        });

        if (!quote) {
          throw new AppError(404, 'Quote not found.', true);
        }

        if (quote.leadId !== leadId) {
          throw new AppError(400, 'Quote does not belong to the specified lead.', true);
        }
      }

      const today = new Date();
      const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
      const existingMissionsToday = await tx.mission.count({
        where: {
          createdAt: {
            gte: new Date(today.setHours(0, 0, 0, 0)),
            lt: new Date(today.setHours(23, 59, 59, 999))
          }
        }
      });
      const missionNumber = `M${datePrefix}-${(existingMissionsToday + 1).toString().padStart(3, '0')}`;

      const estimatedDurationMinutes = Math.round(data.estimatedDuration * 60);

      const mission = await tx.mission.create({
        data: {
          missionNumber,
          leadId,
          quoteId: quoteId ?? null,
          teamLeaderId: teamLeaderId ?? null,
          teamId: data.teamId ?? null,
          scheduledDate: new Date(data.scheduledDate),
          estimatedDuration: estimatedDurationMinutes,
          address: data.address,
          coordinates: data.coordinates ?? null,
          accessNotes: data.accessNotes ?? null,
          priority: data.priority ?? 'NORMAL',
          type: data.type ?? 'SERVICE',
          status: 'SCHEDULED',
          adminNotes: data.adminNotes ?? null,
        },
        include: {
          lead: true,
          quote: true,
          teamLeader: true,
          team: true,
        }
      });

      if (taskTemplateId) {
        const taskTemplate = await tx.taskTemplate.findUnique({
          where: { id: taskTemplateId },
        });

        if (taskTemplate && taskTemplate.tasks) {
          const templateTasks = Array.isArray(taskTemplate.tasks) 
            ? taskTemplate.tasks 
            : typeof taskTemplate.tasks === 'object' 
              ? Object.values(taskTemplate.tasks)
              : [];

          if (templateTasks.length > 0) {
            const tasksToCreate = templateTasks.map((task: any) => ({
              missionId: mission.id,
              title: task.title || task.name || 'Task',
              description: task.description ?? null,
              category: (task.category as TaskCategory) ?? 'GENERAL',
              type: task.type ?? 'EXECUTION',
              status: 'ASSIGNED' as TaskStatus,
              priority: task.priority ?? 'NORMAL',
              estimatedTime: task.estimatedTime ?? null,
            }));

            await tx.task.createMany({
              data: tasksToCreate,
            });
          }
        }
      }

      await tx.lead.update({
        where: { id: leadId },
        data: { status: 'MISSION_SCHEDULED' }
      });

      await tx.activity.create({
        data: {
          type: 'MISSION_STARTED',
          title: 'Mission créée',
          description: `Mission ${missionNumber} créée pour ${lead.firstName} ${lead.lastName}`,
          userId: teamLeaderId || 'system',
          leadId,
          metadata: {
            missionId: mission.id,
            missionNumber,
            scheduledDate: mission.scheduledDate,
            estimatedDuration: mission.estimatedDuration
          }
        }
      });

      return mission;
    });
  }

  public async updateMission(id: string, data: UpdateMissionInput): Promise<Mission> {
    return await this.prisma.$transaction(async (tx) => {
      const existingMission = await tx.mission.findUnique({
        where: { id },
        include: { tasks: true }
      });

      if (!existingMission) {
        throw new AppError(404, 'Mission not found', true);
      }

      if (data.teamLeaderId && data.teamLeaderId !== existingMission.teamLeaderId) {
        const newTeamLeader = await tx.user.findUnique({
          where: { id: data.teamLeaderId },
        });
        if (!newTeamLeader || newTeamLeader.role !== 'TEAM_LEADER') {
          throw new AppError(400, 'Invalid team leader specified', true);
        }
      }

      if (data.teamId && data.teamId !== existingMission.teamId) {
        const team = await tx.team.findUnique({
          where: { id: data.teamId },
          include: { members: { where: { isActive: true } } }
        });
        if (!team || team.members.length === 0) {
          throw new AppError(400, 'Invalid or empty team specified', true);
        }
      }

      const updateData: any = {};
      
      if (data.scheduledDate) {
        updateData.scheduledDate = new Date(data.scheduledDate);
      }
      if (data.estimatedDuration !== undefined) {
        updateData.estimatedDuration = Math.round(data.estimatedDuration * 60);
      }
      if (data.address) updateData.address = data.address;
      if (data.coordinates !== undefined) updateData.coordinates = data.coordinates;
      if (data.accessNotes !== undefined) updateData.accessNotes = data.accessNotes;
      if (data.priority) updateData.priority = data.priority;
      if (data.status) updateData.status = data.status;
      if (data.type) updateData.type = data.type;
      if (data.teamLeaderId !== undefined) updateData.teamLeaderId = data.teamLeaderId;
      if (data.teamId !== undefined) updateData.teamId = data.teamId;
      if (data.actualStartTime !== undefined) {
        updateData.actualStartTime = data.actualStartTime ? new Date(data.actualStartTime) : null;
      }
      if (data.actualEndTime !== undefined) {
        updateData.actualEndTime = data.actualEndTime ? new Date(data.actualEndTime) : null;
      }
      if (data.clientValidated !== undefined) updateData.clientValidated = data.clientValidated;
      if (data.clientFeedback !== undefined) updateData.clientFeedback = data.clientFeedback;
      if (data.clientRating !== undefined) updateData.clientRating = data.clientRating;
      if (data.adminValidated !== undefined) updateData.adminValidated = data.adminValidated;
      if (data.adminValidatedBy !== undefined) updateData.adminValidatedBy = data.adminValidatedBy;
      if (data.adminNotes !== undefined) updateData.adminNotes = data.adminNotes;
      if (data.qualityScore !== undefined) updateData.qualityScore = data.qualityScore;
      if (data.issuesFound !== undefined) updateData.issuesFound = data.issuesFound;
      if (data.correctionRequired !== undefined) updateData.correctionRequired = data.correctionRequired;

      if (data.tasks && data.tasks.length > 0) {
        await tx.task.deleteMany({
          where: { missionId: id }
        });

        await tx.task.createMany({
          data: data.tasks.map(task => ({
            missionId: id,
            title: task.title,
            description: task.description ?? null,
            category: task.category,
            type: task.type,
            status: task.status ?? 'ASSIGNED',
            priority: task.priority ?? 'NORMAL',
            estimatedTime: task.estimatedTime ?? null,
            actualTime: task.actualTime ?? null,
            assignedToId: task.assignedToId ?? null,
            notes: task.notes ?? null,
          }))
        });
      }

      const updatedMission = await tx.mission.update({
        where: { id },
        data: updateData,
        include: {
          lead: true,
          quote: true,
          teamLeader: true,
          team: {
            include: {
              members: {
                where: { isActive: true },
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
          }
        }
      });

      if (data.status && data.status !== existingMission.status) {
        await tx.activity.create({
          data: {
            type: 'MISSION_STARTED',
            title: 'Statut de mission mis à jour',
            description: `Mission ${existingMission.missionNumber} - statut changé de ${existingMission.status} à ${data.status}`,
            userId: data.adminValidatedBy || 'system',
            leadId: existingMission.leadId,
            metadata: {
              missionId: id,
              oldStatus: existingMission.status,
              newStatus: data.status
            }
          }
        });
      }

      return updatedMission;
    });
  }

  public async deleteMission(id: string, deletedBy: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const mission = await tx.mission.findUnique({
        where: { id },
      });

      if (!mission) {
        throw new AppError(404, 'Mission not found', true);
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
          type: 'MISSION_COMPLETED',
          title: 'Mission supprimée',
          description: `Mission ${mission.missionNumber} supprimée`,
          userId: deletedBy,
          leadId: mission.leadId,
          metadata: {
            deletedMissionId: id,
            missionNumber: mission.missionNumber,
            deletedBy
          }
        }
      });
    });
  }

  public async getMissionStatistics(filters: MissionFilters = {}) {
    const whereClause: any = {};

    if (filters.teamLeaderId) {
      whereClause.teamLeaderId = filters.teamLeaderId;
    }
    if (filters.teamId) {
      whereClause.teamId = filters.teamId;
    }
    if (filters.scheduledDateFrom || filters.scheduledDateTo) {
      whereClause.scheduledDate = {};
      if (filters.scheduledDateFrom) {
        whereClause.scheduledDate.gte = filters.scheduledDateFrom;
      }
      if (filters.scheduledDateTo) {
        whereClause.scheduledDate.lte = filters.scheduledDateTo;
      }
    }

    const [
      totalMissions,
      scheduledMissions,
      inProgressMissions,
      completedMissions,
      cancelledMissions,
      averageRating
    ] = await Promise.all([
      this.prisma.mission.count({ where: whereClause }),
      this.prisma.mission.count({ 
        where: { ...whereClause, status: 'SCHEDULED' } 
      }),
      this.prisma.mission.count({ 
        where: { ...whereClause, status: 'IN_PROGRESS' } 
      }),
      this.prisma.mission.count({ 
        where: { ...whereClause, status: 'COMPLETED' } 
      }),
      this.prisma.mission.count({ 
        where: { ...whereClause, status: 'CANCELLED' } 
      }),
      this.prisma.mission.aggregate({
        where: { 
          ...whereClause, 
          clientRating: { not: null } 
        },
        _avg: { clientRating: true }
      })
    ]);

    return {
      totalMissions,
      scheduledMissions,
      inProgressMissions,
      completedMissions,
      cancelledMissions,
      averageRating: averageRating._avg.clientRating || 0,
      completionRate: totalMissions > 0 ? (completedMissions / totalMissions) * 100 : 0
    };
  }

  public async getMissionsByStatus() {
    const statusCounts = await this.prisma.mission.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    return statusCounts.map(item => ({
      status: item.status,
      count: item._count.status
    }));
  }

  public async getUpcomingMissions(teamLeaderId: string, days: number = 7) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return await this.prisma.mission.findMany({
      where: {
        teamLeaderId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        scheduledDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            address: true
          }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      },
      orderBy: {
        scheduledDate: 'asc'
      }
    });
  }

  public async updateMissionStatus(
    id: string, 
    status: MissionStatus, 
    updatedBy: string,
    notes?: string
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const existingMission = await tx.mission.findUnique({
        where: { id }
      });

      if (!existingMission) {
        throw new AppError(404, 'Mission not found', true);
      }

      const validTransitions: Record<MissionStatus, MissionStatus[]> = {
        'SCHEDULED': ['IN_PROGRESS', 'CANCELLED'],
        'IN_PROGRESS': ['QUALITY_CHECK', 'CLIENT_VALIDATION', 'COMPLETED', 'CANCELLED'],
        'QUALITY_CHECK': ['IN_PROGRESS', 'CLIENT_VALIDATION', 'COMPLETED'],
        'CLIENT_VALIDATION': ['COMPLETED', 'IN_PROGRESS'],
        'COMPLETED': [],
        'CANCELLED': [],
      };

      if (!validTransitions[existingMission.status].includes(status)) {
        throw new AppError(400, 
          `Invalid status transition from ${existingMission.status} to ${status}`, 
          true
        );
      }

      const updatedMission = await tx.mission.update({
        where: { id },
        data: {
          status,
          ...(status === 'IN_PROGRESS' && !existingMission.actualStartTime && {
            actualStartTime: new Date()
          }),
          ...(status === 'COMPLETED' && !existingMission.actualEndTime && {
            actualEndTime: new Date()
          }),
          ...(notes && { adminNotes: notes })
        }
      });

      await tx.activity.create({
        data: {
          type: 'MISSION_STARTED',
          title: 'Statut de mission mis à jour',
          description: `Mission ${existingMission.missionNumber} - statut changé de ${existingMission.status} à ${status}`,
          userId: updatedBy,
          leadId: existingMission.leadId,
          metadata: {
            missionId: id,
            oldStatus: existingMission.status,
            newStatus: status,
            notes
          }
        }
      });

      return updatedMission;
    });
  }
}

export const missionService = new MissionService();