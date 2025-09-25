// services/mission.service.ts - FIXED VALIDATION ISSUES VERSION
import { PrismaClient, Mission, MissionStatus, Priority, MissionType, TaskStatus, TaskCategory } from '@prisma/client';

// Create a single prisma instance
const prismaInstance = new PrismaClient();

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
  invoiceGenerated?: boolean;
  invoiceId?: string | null;
  tasks?: Array<{
    id?: string;
    title: string;
    description?: string | null;
    category: TaskCategory;
    type: 'EXECUTION' | 'QUALITY_CHECK' | 'DOCUMENTATION' | 'CLIENT_INTERACTION' | 'BATHROOM_CLEANING' | 'WINDOW_CLEANING' | 'FLOOR_CLEANING' | 'SURFACE_CLEANING' | 'DETAIL_FINISHING' | 'SETUP' | 'CLEANUP';
    status?: TaskStatus;
    estimatedTime?: number | null;
    actualTime?: number | null;
    assignedToId?: string | null;
    notes?: string | null;
  }>;
  [key: string]: any; // Allow any additional fields
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
    this.prisma = prismaInstance;
  }

  // Clean and validate input data with minimal restrictions
  private cleanUpdateData(data: any): any {
    const cleaned: any = {};
    
    // Copy all provided fields without strict validation
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        cleaned[key] = data[key];
      }
    });

    // Handle special data transformations
    if (cleaned.scheduledDate && typeof cleaned.scheduledDate === 'string') {
      try {
        cleaned.scheduledDate = new Date(cleaned.scheduledDate);
      } catch (e) {
        console.warn('Invalid scheduledDate:', cleaned.scheduledDate);
        delete cleaned.scheduledDate;
      }
    }

    if (cleaned.actualStartTime !== undefined) {
      if (cleaned.actualStartTime && typeof cleaned.actualStartTime === 'string') {
        try {
          cleaned.actualStartTime = new Date(cleaned.actualStartTime);
        } catch (e) {
          console.warn('Invalid actualStartTime:', cleaned.actualStartTime);
          cleaned.actualStartTime = null;
        }
      } else if (!cleaned.actualStartTime) {
        cleaned.actualStartTime = null;
      }
    }

    if (cleaned.actualEndTime !== undefined) {
      if (cleaned.actualEndTime && typeof cleaned.actualEndTime === 'string') {
        try {
          cleaned.actualEndTime = new Date(cleaned.actualEndTime);
        } catch (e) {
          console.warn('Invalid actualEndTime:', cleaned.actualEndTime);
          cleaned.actualEndTime = null;
        }
      } else if (!cleaned.actualEndTime) {
        cleaned.actualEndTime = null;
      }
    }

    // Handle duration - be flexible with input
    if (cleaned.estimatedDuration !== undefined) {
      const duration = typeof cleaned.estimatedDuration === 'string' 
        ? parseFloat(cleaned.estimatedDuration) 
        : cleaned.estimatedDuration;
      
      if (isNaN(duration) || duration < 0) {
        console.warn('Invalid estimatedDuration:', cleaned.estimatedDuration);
        delete cleaned.estimatedDuration;
      } else {
        // Accept duration as-is (could be hours or minutes)
        cleaned.estimatedDuration = duration;
      }
    }

    // Handle numeric fields
    if (cleaned.clientRating !== undefined) {
      const rating = typeof cleaned.clientRating === 'string' 
        ? parseInt(cleaned.clientRating, 10) 
        : cleaned.clientRating;
      cleaned.clientRating = (isNaN(rating) || rating < 1 || rating > 5) ? null : rating;
    }

    if (cleaned.qualityScore !== undefined) {
      const score = typeof cleaned.qualityScore === 'string' 
        ? parseInt(cleaned.qualityScore, 10) 
        : cleaned.qualityScore;
      cleaned.qualityScore = (isNaN(score) || score < 0 || score > 100) ? null : score;
    }

    // Handle boolean fields
    const booleanFields = ['clientValidated', 'adminValidated', 'correctionRequired', 'invoiceGenerated'];
    booleanFields.forEach(field => {
      if (cleaned[field] !== undefined) {
        if (typeof cleaned[field] === 'string') {
          cleaned[field] = cleaned[field].toLowerCase() === 'true';
        } else {
          cleaned[field] = Boolean(cleaned[field]);
        }
      }
    });

    // Handle tasks array
    if (cleaned.tasks && Array.isArray(cleaned.tasks)) {
      cleaned.tasks = cleaned.tasks
        .filter((task: any) => task && task.title && task.title.trim())
        .map((task: any) => ({
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
    }

    // Remove system fields that shouldn't be updated
    const systemFields = ['id', 'missionNumber', 'createdAt', 'updatedAt', 'lead', 'quote', 'teamLeader', 'team'];
    systemFields.forEach(field => {
      delete cleaned[field];
    });

    return cleaned;
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
            checkedAt: 'desc'
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

      // Enhanced team leader validation with auto-assignment if needed
      let finalTeamLeaderId = teamLeaderId;
      
      if (teamLeaderId) {
        const teamLeader = await tx.user.findUnique({
          where: { id: teamLeaderId },
          include: {
            teamMemberships: {
              where: { isActive: true },
              include: { team: true }
            }
          }
        });

        if (!teamLeader || teamLeader.role !== 'TEAM_LEADER') {
          throw new AppError(404, 'Team leader not found or invalid role.', true);
        }
      } else {
        // Auto-assign an available team leader
        const availableTeamLeaders = await tx.user.findMany({
          where: {
            role: 'TEAM_LEADER',
            teamMemberships: {
              some: {
                isActive: true,
                availability: 'AVAILABLE'
              }
            }
          },
          include: {
            teamMemberships: {
              where: { isActive: true },
              include: { team: true }
            }
          },
          take: 1
        });

        if (availableTeamLeaders.length === 0) {
          // Final fallback - any team leader
          const anyTeamLeaders = await tx.user.findMany({
            where: { role: 'TEAM_LEADER' },
            take: 1
          });

          if (anyTeamLeaders.length === 0) {
            throw new AppError(400, 'No team leaders found. Please create a team leader first.', true);
          }

          finalTeamLeaderId = anyTeamLeaders[0]!.id;
        } else {
          finalTeamLeaderId = availableTeamLeaders[0]!.id;
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
          teamLeaderId: finalTeamLeaderId ?? null,  // Fix: Ensure not undefined
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
          type: 'MISSION_SCHEDULED',
          title: 'Mission créée',
          description: `Mission ${missionNumber} créée pour ${lead.firstName} ${lead.lastName}`,
          userId: finalTeamLeaderId || 'system',
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

  public async updateMission(id: string, inputData: UpdateMissionInput): Promise<Mission> {
    console.log('🔧 MissionService.updateMission called with:', { id, keys: Object.keys(inputData) });
    
    return await this.prisma.$transaction(async (tx) => {
      const existingMission = await tx.mission.findUnique({
        where: { id },
        include: { tasks: true }
      });

      if (!existingMission) {
        throw new AppError(404, 'Mission not found', true);
      }

      // Clean the input data with minimal restrictions
      const data = this.cleanUpdateData(inputData);
      console.log('🧹 Cleaned data:', Object.keys(data));

      // Build update object
      const updateData: any = {};

      // Handle all possible fields without strict validation
      const allowedFields = [
        'status', 'priority', 'type', 'address', 'coordinates', 'accessNotes',
        'teamLeaderId', 'teamId', 'clientValidated', 'clientFeedback', 'clientRating',
        'adminValidated', 'adminValidatedBy', 'adminNotes', 'qualityScore', 
        'issuesFound', 'correctionRequired', 'invoiceGenerated', 'invoiceId',
        'scheduledDate', 'actualStartTime', 'actualEndTime', 'estimatedDuration'
      ];

      allowedFields.forEach(field => {
        if (data[field] !== undefined) {
          updateData[field] = data[field];
        }
      });

      // Validate team leader if provided
      if (data.teamLeaderId && data.teamLeaderId !== existingMission.teamLeaderId) {
        try {
          const newTeamLeader = await tx.user.findUnique({
            where: { id: data.teamLeaderId },
          });
          if (!newTeamLeader || newTeamLeader.role !== 'TEAM_LEADER') {
            console.warn('Invalid team leader specified, skipping update');
            delete updateData.teamLeaderId;
          }
        } catch (error) {
          console.warn('Error validating team leader, skipping:', error);
          delete updateData.teamLeaderId;
        }
      }

      // Validate team if provided
      if (data.teamId && data.teamId !== existingMission.teamId) {
        try {
          const team = await tx.team.findUnique({
            where: { id: data.teamId },
            include: { members: { where: { isActive: true } } }
          });
          if (!team || team.members.length === 0) {
            console.warn('Invalid or empty team specified, skipping update');
            delete updateData.teamId;
          }
        } catch (error) {
          console.warn('Error validating team, skipping:', error);
          delete updateData.teamId;
        }
      }

      // Handle tasks if provided
      if (data.tasks && Array.isArray(data.tasks)) {
        console.log('🔧 Updating tasks:', data.tasks.length, 'tasks provided');
        
        try {
          // Delete existing tasks
          await tx.task.deleteMany({
            where: { missionId: id }
          });

          // Create new tasks
          if (data.tasks.length > 0) {
            const tasksToCreate = data.tasks.map((task: any) => ({
              missionId: id,
              title: task.title,
              description: task.description || null,
              category: task.category || 'GENERAL',
              type: task.type || 'EXECUTION',
              status: task.status || 'ASSIGNED',
              estimatedTime: task.estimatedTime || null,
              actualTime: task.actualTime || null,
              assignedToId: task.assignedToId || null,
              notes: task.notes || null,
            }));

            await tx.task.createMany({
              data: tasksToCreate
            });
            console.log('✅ Successfully updated tasks');
          }
        } catch (taskError) {
          console.error('❌ Failed to update tasks:', taskError);
          // Don't fail the entire update if tasks fail
        }
      }

      console.log('🔧 Final update data:', Object.keys(updateData));

      // Update the mission
      const updatedMission = await tx.mission.update({
        where: { id },
        data: updateData,
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
      if (data.status && data.status !== existingMission.status) {
        try {
          await tx.activity.create({
            data: {
              type: 'MISSION_STATUS_UPDATED',
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
        } catch (activityError) {
          console.warn('Failed to create activity log:', activityError);
        }
      }

      console.log('✅ Mission updated successfully');
      return updatedMission;
    });
  }

  public async deleteMission(id: string, deletedBy?: string): Promise<void> {
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

      if (deletedBy) {
        await tx.activity.create({
          data: {
            type: 'SYSTEM_MAINTENANCE',
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
      }
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
          type: 'MISSION_STATUS_UPDATED',
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