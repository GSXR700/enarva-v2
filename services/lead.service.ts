// services/lead.service.ts - FINAL FIXED VERSION
import { PrismaClient, Prisma, Lead, LeadStatus } from '@prisma/client';

const prisma = new PrismaClient();

export class LeadService {
  async getLeads(options: {
    where?: Prisma.LeadWhereInput;
    skip?: number;
    take?: number;
    include?: Prisma.LeadInclude;
    orderBy?: Prisma.LeadOrderByWithRelationInput;
  } = {}) {
    return await prisma.lead.findMany(options);
  }

  async countLeads(options: { where?: Prisma.LeadWhereInput } = {}) {
    return await prisma.lead.count(options);
  }

  async getLeadById(id: string, include?: Prisma.LeadInclude) {
    return await prisma.lead.findUnique({
      where: { id },
      include
    });
  }

  async createLead(data: Prisma.LeadCreateInput, creatorId: string) {
    const leadData = {
      ...data,
      updatedAt: new Date()
    };

    const lead = await prisma.lead.create({
      data: leadData,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    await this.logActivity({
      type: 'LEAD_CREATED',
      title: 'Lead créé',
      description: `Nouveau lead créé: ${lead.firstName} ${lead.lastName}`,
      leadId: lead.id,
      userId: creatorId,
      metadata: {
        leadType: lead.leadType,
        channel: lead.channel,
        score: lead.score
      }
    });

    return lead;
  }

  async updateLead(id: string, data: any) {
    const updateData: any = {
      ...data,
      updatedAt: new Date()
    };

    if (data.assignedToId !== undefined) {
      if (data.assignedToId) {
        updateData.assignedTo = { connect: { id: data.assignedToId } };
      } else {
        updateData.assignedTo = { disconnect: true };
      }
      delete updateData.assignedToId;
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return updatedLead;
  }

  async deleteLead(id: string) {
    await prisma.activity.deleteMany({
      where: { leadId: id }
    });

    return await prisma.lead.delete({
      where: { id }
    });
  }

  async getLeadRelations(id: string) {
    const [quotes, missions, activities, expenses] = await Promise.all([
      prisma.quote.findMany({
        where: { leadId: id },
        include: { lead: true }
      }),
      prisma.mission.findMany({
        where: { leadId: id },
        include: { lead: true, teamLeader: true }
      }),
      prisma.activity.findMany({
        where: { leadId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          user: {
            select: { name: true, role: true }
          }
        }
      }),
      prisma.expense.findMany({
        where: { leadId: id },
        include: { user: true }
      })
    ]);

    return {
      quotes,
      missions,
      activities,
      expenses
    };
  }

  async logActivity(data: {
    type: string;
    title: string;
    description: string;
    leadId?: string;
    userId: string;
    metadata?: any;
  }) {
    return await prisma.activity.create({
      data: {
        type: data.type as any,
        title: data.title,
        description: data.description,
        leadId: data.leadId,
        userId: data.userId,
        metadata: data.metadata || {},
        createdAt: new Date()
      }
    });
  }

  async bulkUpdateStatus(leadIds: string[], status: LeadStatus, userId: string) {
    const updatePromises = leadIds.map(id => 
      this.updateLead(id, { status })
    );

    const results = await Promise.all(updatePromises);

    await this.logActivity({
      type: 'BULK_STATUS_UPDATE',
      title: 'Mise à jour en masse',
      description: `${leadIds.length} leads mis à jour vers le statut ${status}`,
      userId,
      metadata: {
        leadIds,
        newStatus: status,
        count: leadIds.length
      }
    });

    return results;
  }

  async bulkAssign(leadIds: string[], assignedToId: string | null, userId: string) {
    const updatePromises = leadIds.map(id => 
      this.updateLead(id, { assignedToId })
    );

    const results = await Promise.all(updatePromises);

    await this.logActivity({
      type: 'BULK_ASSIGNMENT',
      title: 'Assignation en masse',
      description: `${leadIds.length} leads assignés`,
      userId,
      metadata: {
        leadIds,
        assignedToId,
        count: leadIds.length
      }
    });

    return results;
  }

  async getLeadStats(filters: {
    dateFrom?: Date;
    dateTo?: Date;
    assignedToId?: string;
    status?: LeadStatus;
  } = {}) {
    const where: Prisma.LeadWhereInput = {};

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const [
      totalLeads,
      newLeads,
      qualifiedLeads,
      convertedLeads,
      averageScore
    ] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.count({ where: { ...where, status: 'NEW' } }),
      prisma.lead.count({ where: { ...where, status: 'QUALIFIED' } }),
      prisma.lead.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.lead.aggregate({
        where,
        _avg: { score: true }
      })
    ]);

    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    return {
      totalLeads,
      newLeads,
      qualifiedLeads,
      convertedLeads,
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageScore: Math.round((averageScore._avg.score || 0) * 100) / 100
    };
  }

  async searchLeads(query: string, options: {
    limit?: number;
    offset?: number;
    filters?: Prisma.LeadWhereInput;
  } = {}) {
    const { limit = 20, offset = 0, filters = {} } = options;

    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    
    const searchConditions: Prisma.LeadWhereInput[] = searchTerms.map(term => ({
      OR: [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term } },
        { email: { contains: term, mode: 'insensitive' } },
        { company: { contains: term, mode: 'insensitive' } },
        { originalMessage: { contains: term, mode: 'insensitive' } }
      ]
    }));

    const where: Prisma.LeadWhereInput = {
      AND: [
        ...searchConditions,
        filters
      ]
    };

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip: offset,
        take: limit,
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.lead.count({ where })
    ]);

    return { leads, total };
  }

  async getFollowUpLeads(assignedToId?: string) {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const where: Prisma.LeadWhereInput = {
      status: {
        in: ['NEW', 'TO_QUALIFY', 'WAITING_INFO', 'QUOTE_SENT']
      },
      updatedAt: {
        lte: threeDaysAgo
      }
    };

    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    return await prisma.lead.findMany({
      where,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { updatedAt: 'asc' }
    });
  }
}

export const leadService = new LeadService();