// services/mission.service.ts - COMPLETELY CORRECTED VERSION
import { PrismaClient, Prisma, LeadStatus, Mission } from '@prisma/client';
import { CreateMissionInput } from '@/lib/validation';
import { AppError } from '@/lib/error-handler';

const prisma = new PrismaClient();

class MissionService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Fetches a paginated and filtered list of missions.
   */
  public async getMissions(where: Prisma.MissionWhereInput, page: number, limit: number, sortBy: string, sortOrder: 'asc' | 'desc') {
    const [missions, totalCount] = await this.prisma.$transaction([
      this.prisma.mission.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, address: true } },
          teamLeader: { select: { id: true, name: true, email: true, image: true } },
          team: {
            include: {
              members: {
                include: {
                  user: { select: { id: true, name: true, email: true } }
                }
              }
            }
          },
          _count: { select: { tasks: true, qualityChecks: true } }
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
            lead: true
          }
        },
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
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        expenses: true,
        fieldReport: true,
        inventoryUsed: {
          include: {
            inventory: true
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

    return this.prisma.$transaction(async (tx) => {
      const [lead, teamLeader, quote, taskTemplate] = await Promise.all([
        tx.lead.findUnique({ where: { id: leadId }, select: { id: true, firstName: true, lastName: true } }),
        tx.user.findUnique({ where: { id: teamLeaderId }, select: { id: true } }),
        quoteId ? tx.quote.findUnique({ where: { id: quoteId }, select: { id: true } }) : Promise.resolve(null),
        taskTemplateId && taskTemplateId !== 'none' ? 
          tx.taskTemplate.findUnique({ where: { id: taskTemplateId } }) : 
          Promise.resolve(null)
      ]);

      if (!lead) throw new AppError(404, `Lead with ID ${leadId} not found.`, true);
      if (!teamLeader) throw new AppError(404, `Team leader with ID ${teamLeaderId} not found.`, true);
      if (quoteId && !quote) throw new AppError(404, `Quote with ID ${quoteId} not found.`, true);

      // Extract tasks from template - tasks are stored as JSON in the schema
      const tasksToCreate = taskTemplate?.tasks ? 
        (Array.isArray(taskTemplate.tasks) ? taskTemplate.tasks : []).map((task: any) => ({
          title: task.title,
          category: task.category || 'GENERAL',
          type: task.type || 'SETUP',
          status: 'ASSIGNED' as const,
          estimatedTime: task.estimatedTime || 60,
        })) : [];

      const missionCount = await tx.mission.count();
      const missionNumber = `MS-${new Date().getFullYear()}-${String(missionCount + 1).padStart(5, '0')}`;

      const newMission = await tx.mission.create({
        data: {
          ...missionData,
          missionNumber,
          type,
          status: 'SCHEDULED',
          lead: { connect: { id: leadId } },
          teamLeader: { connect: { id: teamLeaderId } },
          ...(quoteId && { quote: { connect: { id: quoteId } } }),
          tasks: { create: tasksToCreate },
        },
        include: {
          lead: true,
          quote: true,
          teamLeader: true,
          tasks: true
        }
      });

      const statusUpdate: LeadStatus = type === 'TECHNICAL_VISIT' ? 'VISIT_PLANNED' : 'MISSION_SCHEDULED';
      await tx.lead.update({ where: { id: leadId }, data: { status: statusUpdate } });

      await tx.activity.create({
        data: {
          type: 'MISSION_SCHEDULED',
          title: `Mission ${missionNumber} programmée`,
          description: `Mission pour ${lead.firstName} ${lead.lastName} le ${newMission.scheduledDate.toLocaleDateString('fr-FR')}`,
          userId: teamLeaderId,
          leadId: leadId,
          metadata: {
            missionId: newMission.id,
            type: data.type,
          }
        }
      });

      return newMission;
    });
  }

  /**
   * Update a mission
   */
  public async updateMission(id: string, data: any) {
    const { tasks, ...updateData } = data;

    return this.prisma.$transaction(async (tx) => {
      // Update mission data
      const updatedMission = await tx.mission.update({
        where: { id },
        data: updateData,
      });

      // Handle task updates if provided
      if (tasks && Array.isArray(tasks)) {
        // Delete existing tasks
        await tx.task.deleteMany({
          where: { missionId: id },
        });

        // Create new tasks
        if (tasks.length > 0) {
          await tx.task.createMany({
            data: tasks.map((task: any) => ({
              title: task.title,
              description: task.description || '',
              category: task.category || 'GENERAL',
              type: task.type || 'SETUP',
              estimatedTime: task.estimatedDuration || 60,
              status: 'ASSIGNED',
              missionId: id,
              assignedToId: task.assignedToId,
            })),
          });
        }
      }

      // Return complete updated mission
      return this.getMissionById(id);
    });
  }

  /**
   * Partially update a mission (for status changes, etc.)
   */
  public async patchMission(id: string, data: any) {
    // Convert date strings to Date objects if they exist
    const updateData = { ...data };
    if (updateData.actualStartTime) {
      updateData.actualStartTime = new Date(updateData.actualStartTime);
    }
    if (updateData.actualEndTime) {
      updateData.actualEndTime = new Date(updateData.actualEndTime);
    }
    if (updateData.scheduledDate) {
      updateData.scheduledDate = new Date(updateData.scheduledDate);
    }

    const updatedMission = await this.prisma.mission.update({
      where: { id },
      data: updateData,
    });

    return this.getMissionById(id);
  }

  /**
   * Delete a mission
   */
  public async deleteMission(id: string) {
    // Check if mission exists
    const mission = await this.prisma.mission.findUnique({
      where: { id },
      include: {
        tasks: true,
        expenses: true,
        fieldReport: true,
        inventoryUsed: true
      }
    });

    if (!mission) {
      throw new AppError(404, 'Mission not found', true);
    }

    // Delete mission and all related data in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Delete related records first
      await tx.inventoryUsage.deleteMany({ where: { missionId: id } });
      await tx.fieldReport.deleteMany({ where: { missionId: id } });
      await tx.expense.deleteMany({ where: { missionId: id } });
      await tx.task.deleteMany({ where: { missionId: id } });
      
      // Finally delete the mission
      await tx.mission.delete({ where: { id } });
    });

    return { success: true };
  }
}

export const missionService = new MissionService(prisma);