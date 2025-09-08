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
          _count: { select: { tasks: true, qualityChecks: true } }
        },
        orderBy: { [sortBy]: sortOrder }
      }),
      this.prisma.mission.count({ where })
    ]);
    return { missions, totalCount };
  }

  /**
   * Creates a new mission, generates tasks from a template, and updates the related lead.
   */
  public async createMission(data: CreateMissionInput): Promise<Mission> {
    const { leadId, teamLeaderId, quoteId, type, taskTemplateId, ...missionData } = data;

    if (type === 'SERVICE' && !quoteId) {
      throw new AppError(400, 'Quote ID is required for service missions.', true);
    }

    return this.prisma.$transaction(async (tx) => {
      const [lead, teamLeader, quote, taskTemplate] = await Promise.all([
        tx.lead.findUnique({ where: { id: leadId }, select: { id: true, firstName: true, lastName: true } }),
        tx.user.findUnique({ where: { id: teamLeaderId }, select: { id: true } }),
        quoteId ? tx.quote.findUnique({ where: { id: quoteId }, select: { id: true } }) : Promise.resolve(null),
        taskTemplateId && taskTemplateId !== 'none' ? tx.taskTemplate.findUnique({ where: { id: taskTemplateId }, include: { items: true } }) : Promise.resolve(null)
      ]);

      if (!lead) throw new AppError(404, `Lead with ID ${leadId} not found.`, true);
      if (!teamLeader) throw new AppError(404, `Team leader with ID ${teamLeaderId} not found.`, true);
      if (quoteId && !quote) throw new AppError(404, `Quote with ID ${quoteId} not found.`, true);

      const tasksToCreate = taskTemplate?.items?.map(item => ({
        title: item.title,
        category: item.category,
        status: 'ASSIGNED' as const,
      })) || [];

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
      });

      const statusUpdate: LeadStatus = type === 'TECHNICAL_VISIT' ? 'VISIT_PLANNED' : 'MISSION_SCHEDULED';
      await tx.lead.update({ where: { id: leadId }, data: { status: statusUpdate } });

      await tx.activity.create({
      data: {
        type: 'MISSION_SCHEDULED',
        title: `Mission ${missionNumber} programmée`,
        description: `Mission pour ${lead.firstName} ${lead.lastName} le ${newMission.scheduledDate.toLocaleDateString('fr-FR')}`,
        userId: teamLeaderId || leadId, // Use leadId as fallback if teamLeaderId is undefined
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
}

export const missionService = new MissionService(prisma);