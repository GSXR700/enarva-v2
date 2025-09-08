// services/lead.service.ts - COMPLETE CORRECTED VERSION
import { PrismaClient, Prisma, Lead, LeadStatus, ActivityType } from '@prisma/client';

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

   try {
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
   } catch (activityError) {
     console.warn('Failed to log lead creation activity:', activityError);
   }

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
   return await prisma.$transaction(async (tx) => {
     await tx.activity.deleteMany({ where: { leadId: id } });
     await tx.quote.deleteMany({ where: { leadId: id } });
     await tx.mission.deleteMany({ where: { leadId: id } });
     await tx.expense.updateMany({ where: { leadId: id }, data: { leadId: null } });
     await tx.subscription.deleteMany({ where: { leadId: id } });
     
     return await tx.lead.delete({ where: { id } });
   });
 }

 async getLeadRelations(id: string) {
   const [quotes, missions, activities, expenses, subscription] = await Promise.all([
     prisma.quote.findMany({
       where: { leadId: id },
       include: { 
         lead: true,
         missions: true
       },
       orderBy: { createdAt: 'desc' }
     }),
     prisma.mission.findMany({
       where: { leadId: id },
       include: { 
         lead: true, 
         teamLeader: true,
         teamMembers: true,
         tasks: true,
         quote: true
       },
       orderBy: { scheduledDate: 'desc' }
     }),
     prisma.activity.findMany({
       where: { leadId: id },
       orderBy: { createdAt: 'desc' },
       take: 50,
       include: {
         user: {
           select: { 
             id: true,
             name: true, 
             role: true,
             image: true
           }
         }
       }
     }),
     prisma.expense.findMany({
       where: { leadId: id },
       include: { 
         user: {
           select: {
             id: true,
             name: true,
             role: true
           }
         },
         mission: {
           select: {
             id: true,
             missionNumber: true
           }
         }
       },
       orderBy: { date: 'desc' }
     }),
     prisma.subscription.findUnique({
       where: { leadId: id }
     })
   ]);

   return {
     quotes,
     missions,
     activities,
     expenses,
     subscription
   };
 }

 async logActivity(data: {
   type: ActivityType;
   title: string;
   description: string;
   leadId?: string;
   userId: string;
   metadata?: any;
 }) {
   try {
     // Verify that the user exists before creating the activity
     const userExists = await prisma.user.findUnique({
       where: { id: data.userId },
       select: { id: true }
     });

     if (!userExists) {
       console.error(`User with ID ${data.userId} does not exist, cannot create activity`);
       return null;
     }

     // Verify that the lead exists if leadId is provided
     if (data.leadId) {
       const leadExists = await prisma.lead.findUnique({
         where: { id: data.leadId },
         select: { id: true }
       });

       if (!leadExists) {
         console.error(`Lead with ID ${data.leadId} does not exist, cannot create activity`);
         return null;
       }
     }

     return await prisma.activity.create({
       data: {
         type: data.type,
         title: data.title,
         description: data.description,
         leadId: data.leadId,
         userId: data.userId,
         metadata: data.metadata || {},
         createdAt: new Date()
       }
     });
   } catch (error) {
     console.error('Error creating activity:', error);
     throw error;
   }
 }

 async bulkUpdateStatus(leadIds: string[], status: LeadStatus, userId: string) {
   const updatePromises = leadIds.map(async (id) => {
     const lead = await this.updateLead(id, { status });
     
     try {
       await this.logActivity({
         type: 'LEAD_CREATED',
         title: 'Statut modifié (masse)',
         description: `Statut changé vers ${status}`,
         leadId: id,
         userId,
         metadata: {
           newStatus: status,
           bulkUpdate: true
         }
       });
     } catch (activityError) {
       console.warn(`Failed to log status change activity for lead ${id}:`, activityError);
     }
     
     return lead;
   });

   const results = await Promise.all(updatePromises);

   try {
     await this.logActivity({
       type: 'LEAD_CREATED',
       title: 'Mise à jour en masse',
       description: `${leadIds.length} leads mis à jour vers le statut ${status}`,
       userId,
       metadata: {
         leadIds,
         newStatus: status,
         count: leadIds.length,
         bulkOperation: true
       }
     });
   } catch (activityError) {
     console.warn('Failed to log bulk status update activity:', activityError);
   }

   return results;
 }

 async bulkAssign(leadIds: string[], assignedToId: string | null, userId: string) {
   const updatePromises = leadIds.map(async (id) => {
     const lead = await this.updateLead(id, { assignedToId });
     
     try {
       await this.logActivity({
         type: 'LEAD_CREATED',
         title: 'Assignation modifiée (masse)',
         description: assignedToId ? `Assigné à ${assignedToId}` : 'Non assigné',
         leadId: id,
         userId,
         metadata: {
           assignedToId,
           bulkUpdate: true
         }
       });
     } catch (activityError) {
       console.warn(`Failed to log assignment change activity for lead ${id}:`, activityError);
     }
     
     return lead;
   });

   const results = await Promise.all(updatePromises);

   try {
     await this.logActivity({
       type: 'LEAD_CREATED',
       title: 'Assignation en masse',
       description: `${leadIds.length} leads ${assignedToId ? 'assignés' : 'désassignés'}`,
       userId,
       metadata: {
         leadIds,
         assignedToId,
         count: leadIds.length,
         bulkOperation: true
       }
     });
   } catch (activityError) {
     console.warn('Failed to log bulk assignment activity:', activityError);
   }

   return results;
 }

 async getLeadStats(filters: {
   dateFrom?: Date;
   dateTo?: Date;
   assignedToId?: string;
   status?: LeadStatus;
   leadType?: string;
   channel?: string;
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

   if (filters.leadType) {
     where.leadType = filters.leadType as any;
   }

   if (filters.channel) {
     where.channel = filters.channel as any;
   }

   const [
     totalLeads,
     newLeads,
     qualifiedLeads,
     convertedLeads,
     averageScore,
     statusDistribution,
     channelDistribution,
     typeDistribution
   ] = await Promise.all([
     prisma.lead.count({ where }),
     prisma.lead.count({ where: { ...where, status: 'NEW' } }),
     prisma.lead.count({ where: { ...where, status: 'QUALIFIED' } }),
     prisma.lead.count({ where: { ...where, status: 'COMPLETED' } }),
     prisma.lead.aggregate({
       where,
       _avg: { 
         score: true,
         estimatedSurface: true
       },
       _sum: {
         estimatedSurface: true
       }
     }),
     prisma.lead.groupBy({
       by: ['status'],
       where,
       _count: true
     }),
     prisma.lead.groupBy({
       by: ['channel'],
       where,
       _count: true
     }),
     prisma.lead.groupBy({
       by: ['leadType'],
       where,
       _count: true
     })
   ]);

   const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

   return {
     totalLeads,
     newLeads,
     qualifiedLeads,
     convertedLeads,
     conversionRate: Math.round(conversionRate * 100) / 100,
     averageScore: Math.round((averageScore._avg.score || 0) * 100) / 100,
     averageSurface: Math.round((averageScore._avg.estimatedSurface || 0) * 100) / 100,
     totalSurface: averageScore._sum.estimatedSurface || 0,
     statusDistribution,
     channelDistribution,
     typeDistribution
   };
 }

 async searchLeads(query: string, options: {
   limit?: number;
   offset?: number;
   filters?: Prisma.LeadWhereInput;
   includeArchived?: boolean;
 } = {}) {
   const { limit = 20, offset = 0, filters = {}, includeArchived = false } = options;

   const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
   
   const searchConditions: Prisma.LeadWhereInput[] = searchTerms.map(term => ({
     OR: [
       { firstName: { contains: term, mode: 'insensitive' } },
       { lastName: { contains: term, mode: 'insensitive' } },
       { phone: { contains: term } },
       { email: { contains: term, mode: 'insensitive' } },
       { company: { contains: term, mode: 'insensitive' } },
       { originalMessage: { contains: term, mode: 'insensitive' } },
       { address: { contains: term, mode: 'insensitive' } },
       { iceNumber: { contains: term } }
     ]
   }));

   const whereConditions: Prisma.LeadWhereInput[] = [
     ...searchConditions,
     filters
   ];

   if (!includeArchived) {
     whereConditions.push({ 
       status: { 
         notIn: ['CANCELLED', 'CANCELED_BY_CLIENT', 'CANCELED_BY_ENARVA', 'LEAD_LOST'] as LeadStatus[]
       } 
     });
   }

   const where: Prisma.LeadWhereInput = {
     AND: whereConditions
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
             role: true,
             image: true
           }
         },
         quotes: {
           select: {
             id: true,
             quoteNumber: true,
             status: true,
             finalPrice: true,
             createdAt: true
           },
           orderBy: { createdAt: 'desc' },
           take: 1
         },
         missions: {
           select: {
             id: true,
             missionNumber: true,
             status: true,
             scheduledDate: true
           },
           orderBy: { scheduledDate: 'desc' },
           take: 1
         },
         _count: {
           select: {
             quotes: true,
             missions: true,
             activities: true
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
       in: ['NEW', 'TO_QUALIFY', 'WAITING_INFO', 'QUOTE_SENT', 'VISIT_PLANNED']
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
           email: true,
           role: true
         }
       },
       quotes: {
         select: {
           id: true,
           status: true,
           createdAt: true
         },
         orderBy: { createdAt: 'desc' },
         take: 1
       }
     },
     orderBy: { updatedAt: 'asc' }
   });
 }

 async getLeadsByStatus(status: LeadStatus, assignedToId?: string) {
   const where: Prisma.LeadWhereInput = { status };
   
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
           email: true,
           role: true
         }
       }
     },
     orderBy: { updatedAt: 'desc' }
   });
 }

 async getLeadTimeline(id: string) {
   const [activities, quotes, missions] = await Promise.all([
     prisma.activity.findMany({
       where: { leadId: id },
       include: {
         user: {
           select: {
             id: true,
             name: true,
             role: true,
             image: true
           }
         }
       },
       orderBy: { createdAt: 'desc' }
     }),
     prisma.quote.findMany({
       where: { leadId: id },
       orderBy: { createdAt: 'desc' }
     }),
     prisma.mission.findMany({
       where: { leadId: id },
       include: {
         teamLeader: {
           select: {
             id: true,
             name: true,
             role: true
           }
         },
         tasks: {
           select: {
             id: true,
             title: true,
             status: true,
             completedAt: true
           }
         }
       },
       orderBy: { scheduledDate: 'desc' }
     })
   ]);

   const timeline = [
     ...activities.map(activity => ({
       type: 'activity',
       id: activity.id,
       date: activity.createdAt,
       title: activity.title,
       description: activity.description,
       user: activity.user,
       metadata: activity.metadata
     })),
     ...quotes.map(quote => ({
       type: 'quote',
       id: quote.id,
       date: quote.createdAt,
       title: `Devis ${quote.quoteNumber}`,
       description: `Devis créé - Statut: ${quote.status}`,
       metadata: { 
         status: quote.status,
         amount: quote.finalPrice 
       }
     })),
     ...missions.map(mission => ({
       type: 'mission',
       id: mission.id,
       date: mission.scheduledDate || mission.createdAt,
       title: `Mission ${mission.missionNumber}`,
       description: `Mission planifiée - Statut: ${mission.status}`,
       user: mission.teamLeader,
       metadata: { 
         status: mission.status,
         tasksCount: mission.tasks.length,
         completedTasks: mission.tasks.filter(t => t.status === 'COMPLETED').length
       }
     }))
   ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

   return timeline;
 }

 async updateLeadScore(id: string, score: number, userId: string) {
   const updatedLead = await this.updateLead(id, { score });

   try {
     await this.logActivity({
       type: 'LEAD_QUALIFIED',
       title: 'Score mis à jour',
       description: `Score du lead mis à jour: ${score}/100`,
       leadId: id,
       userId,
       metadata: { newScore: score }
     });
   } catch (activityError) {
     console.warn('Failed to log score update activity:', activityError);
   }

   return updatedLead;
 }

 async convertToClient(id: string, userId: string) {
   const updatedLead = await this.updateLead(id, { 
     status: 'COMPLETED'
   });

   try {
     await this.logActivity({
       type: 'LEAD_QUALIFIED',
       title: 'Lead converti',
       description: 'Lead converti en client',
       leadId: id,
       userId,
       metadata: { converted: true }
     });
   } catch (activityError) {
     console.warn('Failed to log conversion activity:', activityError);
   }

   return updatedLead;
 }

 async getDuplicateLeads(email?: string, phone?: string) {
   const where: Prisma.LeadWhereInput = {
     OR: []
   };

   if (email) {
     where.OR?.push({ email: { equals: email, mode: 'insensitive' } });
   }

   if (phone) {
     where.OR?.push({ phone });
   }

   if (!where.OR || where.OR.length === 0) {
     return [];
   }

   return await prisma.lead.findMany({
     where,
     include: {
       assignedTo: {
         select: {
           id: true,
           name: true,
           role: true
         }
       }
     },
     orderBy: { createdAt: 'desc' }
   });
 }

 async mergeLeads(primaryId: string, secondaryIds: string[], userId: string) {
   return await prisma.$transaction(async (tx) => {
     const primaryLead = await tx.lead.findUnique({ where: { id: primaryId } });
     if (!primaryLead) {
       throw new Error('Lead principal non trouvé');
     }

     for (const secondaryId of secondaryIds) {
       await Promise.all([
         tx.quote.updateMany({
           where: { leadId: secondaryId },
           data: { leadId: primaryId }
         }),
         tx.mission.updateMany({
           where: { leadId: secondaryId },
           data: { leadId: primaryId }
         }),
         tx.activity.updateMany({
           where: { leadId: secondaryId },
           data: { leadId: primaryId }
         }),
         tx.expense.updateMany({
           where: { leadId: secondaryId },
           data: { leadId: primaryId }
         })
       ]);

       await tx.lead.delete({ where: { id: secondaryId } });
     }

     try {
       await this.logActivity({
         type: 'LEAD_QUALIFIED',
         title: 'Leads fusionnés',
         description: `${secondaryIds.length} leads fusionnés avec le lead principal`,
         leadId: primaryId,
         userId,
         metadata: {
           mergedLeadIds: secondaryIds,
           mergeCount: secondaryIds.length
         }
       });
     } catch (activityError) {
       console.warn('Failed to log merge activity:', activityError);
     }

     return await tx.lead.findUnique({
       where: { id: primaryId },
       include: {
         assignedTo: true,
         quotes: true,
         missions: true,
         activities: true
       }
     });
   });
 }
}

export const leadService = new LeadService();