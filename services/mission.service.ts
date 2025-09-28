// services/mission.service.ts - COMPLETE CORRECTED VERSION WITHOUT ERRORS
import { PrismaClient, Mission, MissionStatus, TaskStatus, TaskCategory, TaskType } from '@prisma/client';
import { 
  validateMissionCreation, 
  cleanMissionData,
  type CreateMissionInput,
  type MissionUpdateInput
} from '@/lib/validations';

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

// Local interfaces for this service
interface MissionFilters {
  status?: MissionStatus | MissionStatus[];
  priority?: string | string[];
  teamLeaderId?: string;
  teamId?: string;
  leadId?: string;
  type?: string;
  scheduledDateFrom?: Date;
  scheduledDateTo?: Date;
  search?: string;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface MissionWithRelations extends Mission {
  lead: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    company: string | null;
    leadType: string;
  };
  quote?: {
    id: string;
    quoteNumber: string;
    finalPrice: number;
    status: string;
    businessType?: string;
  } | null;
  teamLeader?: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: string;
  } | null;
  team?: {
    id: string;
    name: string;
    members: Array<{
      id: string;
      user: {
        id: string;
        name: string | null;
        email: string | null;
        image: string | null;
        role: string;
      };
    }>;
  } | null;
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    category: TaskCategory;
    type: TaskType;
    status: TaskStatus;
    estimatedTime: number | null;
    actualTime: number | null;
    notes: string | null;
    assignedTo?: {
      id: string;
      user: {
        id: string;
        name: string | null;
        email: string | null;
        image: string | null;
      };
    } | null;
  }>;
}

export class MissionService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prismaInstance;
  }

  // Enhanced data cleaning with validation integration
  private cleanAndValidateUpdateData(data: any): any {
    console.log('🧹 Cleaning update data with keys:', Object.keys(data));
    
    // Use the validation system to clean the data
    const cleaned = cleanMissionData(data);
    
    // Additional service-specific cleaning
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

    // Handle duration - accept both hours and minutes
    if (cleaned.estimatedDuration !== undefined) {
      const duration = typeof cleaned.estimatedDuration === 'string' 
        ? parseFloat(cleaned.estimatedDuration) 
        : cleaned.estimatedDuration;
      
      if (isNaN(duration) || duration < 0) {
        console.warn('Invalid estimatedDuration:', cleaned.estimatedDuration);
        delete cleaned.estimatedDuration;
      } else {
        // Store as minutes - if value is reasonable for hours, convert
        if (duration <= 24) {
          cleaned.estimatedDuration = Math.round(duration * 60); // Convert hours to minutes
        } else {
          cleaned.estimatedDuration = duration; // Already in minutes
        }
      }
    }

    // Handle tasks array with enhanced validation
    if (cleaned.tasks && Array.isArray(cleaned.tasks)) {
      cleaned.tasks = cleaned.tasks
        .filter((task: any) => task && task.title && task.title.trim())
        .map((task: any) => ({
          id: task.id || undefined,
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

    console.log('✅ Cleaned data keys:', Object.keys(cleaned));
    return cleaned;
  }

  // Get all missions with enhanced filtering and pagination
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

  // Get mission by ID with full relations
  public async getMissionById(id: string): Promise<MissionWithRelations> {
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

    return mission as MissionWithRelations;
  }

  // Create mission with validation
  public async createMission(inputData: CreateMissionInput): Promise<Mission> {
    console.log('🔧 Creating mission with validation');
    
    // Validate input data
    const validation = validateMissionCreation(inputData);
    if (!validation.success) {
      const errorMessages = validation.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
      throw new AppError(400, `Validation failed: ${errorMessages.join(', ')}`, true);
    }

    const data = validation.data;
    const { leadId, teamLeaderId, quoteId, taskTemplateId } = data;

    return await this.prisma.$transaction(async (tx) => {
      // Validate lead exists
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

      // Validate quote if provided
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

      // Generate mission number
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

      // Convert duration to minutes if needed
      const estimatedDurationMinutes = data.estimatedDuration <= 24 
        ? Math.round(data.estimatedDuration * 60) 
        : data.estimatedDuration;

      // Create the mission
      const mission = await tx.mission.create({
        data: {
          missionNumber,
          leadId,
          quoteId: quoteId ?? null,
          teamLeaderId: finalTeamLeaderId ?? null,
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

      console.log('✅ Mission created:', mission.missionNumber);

      // Handle task creation from template
      if (taskTemplateId) {
        console.log('🔧 Loading tasks from template:', taskTemplateId);
        
        const taskTemplate = await tx.taskTemplate.findUnique({
          where: { id: taskTemplateId },
        });

        if (taskTemplate && taskTemplate.tasks) {
          let templateTasks: any[] = [];

          // Robust handling of different task template structures
          if (Array.isArray(taskTemplate.tasks)) {
            templateTasks = taskTemplate.tasks;
          } else if (typeof taskTemplate.tasks === 'object' && taskTemplate.tasks !== null) {
            const tasksObj = taskTemplate.tasks as any;
            
            if (tasksObj.items?.create && Array.isArray(tasksObj.items.create)) {
              templateTasks = tasksObj.items.create;
            } else if (tasksObj.items && Array.isArray(tasksObj.items)) {
              templateTasks = tasksObj.items;
            } else if (tasksObj.create && Array.isArray(tasksObj.create)) {
              templateTasks = tasksObj.create;
            } else if (Array.isArray(Object.values(tasksObj))) {
              const values = Object.values(tasksObj);
              if (values.length > 0 && Array.isArray(values[0])) {
                templateTasks = values[0] as any[];
              } else {
                templateTasks = values.filter(v => v && typeof v === 'object' && 'title' in (v as any)) as any[];
              }
            }
          }

          console.log('🔧 Found', templateTasks.length, 'tasks in template');

          if (templateTasks.length > 0) {
            const tasksToCreate = templateTasks.map((task: any) => ({
              missionId: mission.id,
              title: task.title || task.name || 'Task',
              description: task.description ?? null,
              category: (task.category as TaskCategory) ?? 'GENERAL',
              type: (task.type as TaskType) ?? 'EXECUTION',
              status: 'ASSIGNED' as TaskStatus,
              estimatedTime: task.estimatedTime ?? 60,
              actualTime: null,
              assignedToId: null,
              notes: null,
            }));

            await tx.task.createMany({
              data: tasksToCreate,
            });

            console.log('✅ Created', tasksToCreate.length, 'tasks from template');
          }
        }
      }

      // Update lead status
      await tx.lead.update({
        where: { id: leadId },
        data: { status: 'MISSION_SCHEDULED' }
      });

      // Create activity log
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

  // Update mission with validation and enhanced task handling
  public async updateMission(id: string, inputData: MissionUpdateInput): Promise<Mission> {
    console.log('🔧 MissionService.updateMission called with:', { id, keys: Object.keys(inputData) });
    
    return await this.prisma.$transaction(async (tx) => {
      // Verify mission exists
      const existingMission = await tx.mission.findUnique({
        where: { id },
        include: { tasks: true }
      });

      if (!existingMission) {
        throw new AppError(404, 'Mission not found', true);
      }

      // Clean and validate input data
      const data = this.cleanAndValidateUpdateData(inputData);
      console.log('🧹 Cleaned data:', Object.keys(data));

      // Prepare update object
      const updateData: any = {};

      // Handle all possible fields with validation
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

      // Enhanced task handling with proper validation
      if (data.tasks && Array.isArray(data.tasks)) {
        console.log('🔧 Updating tasks:', data.tasks.length, 'tasks provided');
        
        try {
          // Delete existing tasks
          await tx.task.deleteMany({
            where: { missionId: id }
          });

          // Create new tasks if any provided
          if (data.tasks.length > 0) {
            const tasksToCreate = data.tasks.map((task: any) => {
              // Handle assignment - convert User ID to TeamMember ID if needed
              let assignedToId = task.assignedToId;
              
              if (assignedToId && assignedToId.length < 30) {
                // This looks like a User ID, need to find the corresponding TeamMember
                // We'll handle this in a separate query
                assignedToId = null; // Will be updated after creation
              }
              
              return {
                missionId: id,
                title: task.title,
                description: task.description || null,
                category: (task.category as TaskCategory) || 'GENERAL',
                type: (task.type as TaskType) || 'EXECUTION',
                status: (task.status as TaskStatus) || 'ASSIGNED',
                estimatedTime: task.estimatedTime || null,
                actualTime: task.actualTime || null,
                assignedToId: assignedToId,
                notes: task.notes || null,
              };
            });

            await tx.task.createMany({
              data: tasksToCreate
            });

            // Handle User ID to TeamMember ID conversion for assignments
            const createdTasks = await tx.task.findMany({
              where: { missionId: id }
            });

            for (let i = 0; i < data.tasks.length; i++) {
              const originalTask = data.tasks[i];
              const createdTask = createdTasks[i];
              
              if (originalTask.assignedToId && originalTask.assignedToId.length < 30) {
                // Find the TeamMember for this User ID
                const teamMember = await tx.teamMember.findFirst({
                  where: {
                    userId: originalTask.assignedToId,
                    isActive: true
                  }
                });
                
                if (teamMember && createdTask) {
                  await tx.task.update({
                    where: { id: createdTask.id },
                    data: { assignedToId: teamMember.id }
                  });
                }
              }
            }

            console.log('✅ Successfully updated tasks with proper assignments');
          }
        } catch (taskError) {
          console.error('❌ Failed to update tasks:', taskError);
          throw new AppError(400, 'Failed to update tasks', true);
        }
      }

      console.log('🔧 Final update data:', Object.keys(updateData));

      // Update the mission with full relations
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

  // Delete mission with full cleanup
  public async deleteMission(id: string, deletedBy?: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const mission = await tx.mission.findUnique({
        where: { id },
      });

      if (!mission) {
        throw new AppError(404, 'Mission not found', true);
      }

      // Delete related records in correct order
      await tx.task.deleteMany({ where: { missionId: id } });
      await tx.qualityCheck.deleteMany({ where: { missionId: id } });
      await tx.inventoryUsage.deleteMany({ where: { missionId: id } });
      await tx.expense.deleteMany({ where: { missionId: id } });
      
      // Delete conversation and messages
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
      
      // Delete field report and invoice
      await tx.fieldReport.deleteMany({ where: { missionId: id } });
      await tx.invoice.deleteMany({ where: { missionId: id } });
      
      // Finally delete the mission
      await tx.mission.delete({ where: { id } });

      // Create activity log if deletedBy is provided
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

  // Get mission statistics with enhanced filtering
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

  // Get missions grouped by status
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

  // Get upcoming missions for a team leader
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

  // Update mission status with validation
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

      // Define valid status transitions
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

      // Update mission with automatic timestamp handling
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

      // Create activity log
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

  // Get missions by lead ID
  public async getMissionsByLeadId(leadId: string) {
    return await this.prisma.mission.findMany({
      where: { leadId },
      include: {
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
            email: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true
          }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      },
      orderBy: {
        scheduledDate: 'desc'
      }
    });
  }

  // Get missions requiring quality check
  public async getMissionsForQualityCheck() {
    return await this.prisma.mission.findMany({
      where: {
        status: 'QUALITY_CHECK',
        tasks: {
          every: {
            status: 'VALIDATED'
          }
        }
      },
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
            email: true
          }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            category: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { scheduledDate: 'asc' }
      ]
    });
  }

  // Search missions with advanced filtering
  public async searchMissions(query: string, filters: MissionFilters = {}) {
    const whereClause: any = {
      OR: [
        { missionNumber: { contains: query, mode: 'insensitive' } },
        { address: { contains: query, mode: 'insensitive' } },
        { lead: { firstName: { contains: query, mode: 'insensitive' } } },
        { lead: { lastName: { contains: query, mode: 'insensitive' } } },
        { lead: { company: { contains: query, mode: 'insensitive' } } },
        { adminNotes: { contains: query, mode: 'insensitive' } },
        { accessNotes: { contains: query, mode: 'insensitive' } }
      ]
    };

    // Apply additional filters
    if (filters.status) {
      whereClause.status = filters.status;
    }
    if (filters.priority) {
      whereClause.priority = filters.priority;
    }
    if (filters.teamLeaderId) {
      whereClause.teamLeaderId = filters.teamLeaderId;
    }
    if (filters.teamId) {
      whereClause.teamId = filters.teamId;
    }

    return await this.prisma.mission.findMany({
      where: whereClause,
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            phone: true,
            email: true
          }
        },
        teamLeader: {
          select: {
            id: true,
            name: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 50
    });
  }

  // Get mission summary for dashboard
  public async getMissionSummary(userId?: string, teamId?: string) {
    const whereClause: any = {};
    
    if (userId) {
      whereClause.teamLeaderId = userId;
    }
    if (teamId) {
      whereClause.teamId = teamId;
    }

    const [
      todaysMissions,
      weekMissions,
      pendingQuality,
      overdueItems
    ] = await Promise.all([
      this.prisma.mission.count({
        where: {
          ...whereClause,
          scheduledDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
      }),
      this.prisma.mission.count({
        where: {
          ...whereClause,
          scheduledDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      this.prisma.mission.count({
        where: {
          ...whereClause,
          status: 'QUALITY_CHECK'
        }
      }),
      this.prisma.mission.count({
        where: {
          ...whereClause,
          scheduledDate: { lt: new Date() },
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
        }
      })
    ]);

    return {
      todaysMissions,
      weekMissions,
      pendingQuality,
      overdueItems
    };
  }
}

// Export service instance
export const missionService = new MissionService();
export { AppError };
export { CreateMissionInput, MissionUpdateInput };