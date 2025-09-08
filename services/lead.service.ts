import { PrismaClient, Prisma, Lead, LeadStatus } from '@prisma/client';
import { CreateLeadInput } from '@/lib/validation';
import { cache } from 'react';

// Re-usable prisma instance
const prisma = new PrismaClient();

class LeadService {
  constructor(private prisma: PrismaClient) {}

  /**
   * ============================================================================
   * WRITE OPERATIONS
   * ============================================================================
   */

  /**
   * Creates a new lead with scoring and auto-assignment.
   * @param data - Validated data for creating a new lead.
   * @param creatorId - The ID of the user creating the lead for the activity log.
   * @returns The newly created lead object with its assigned user.
   */
  public async createLead(data: CreateLeadInput, creatorId: string) {
    const score = this.calculateLeadScore(data);
    const assignedToId = data.assignedToId || await this.getOptimalAgent();

    return this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          ...data,
          score,
          assignedToId,
          email: data.email || null, // Ensure empty string becomes null
        },
        include: {
          assignedTo: true,
        },
      });

      // Create activity log
      await tx.activity.create({
        data: {
          type: 'LEAD_CREATED',
          title: 'Nouveau lead créé',
          description: `Lead ${lead.firstName} ${lead.lastName} créé via ${lead.channel}`,
          userId: creatorId,
          leadId: lead.id,
          metadata: {
            channel: lead.channel,
            score: lead.score,
            assignedTo: lead.assignedTo?.name || 'Non assigné',
          }
        },
      });

      return lead;
    });
  }

  /**
   * ============================================================================
   * READ OPERATIONS
   * ============================================================================
   */

  /**
   * Fetches a paginated and filtered list of leads.
   * @param where - Prisma where clause for filtering.
   * @param page - The current page number.
   * @param limit - The number of items per page.
   * @param sortBy - The field to sort by.
   * @param sortOrder - The sort order ('asc' or 'desc').
   * @returns A list of leads and the total count.
   */
  public async getLeads(
      where: Prisma.LeadWhereInput,
      page: number,
      limit: number,
      sortBy: string,
      sortOrder: 'asc' | 'desc'
  ) {
    const [leads, totalCount] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        include: {
          assignedTo: { select: { id: true, name: true, email: true, image: true } },
          _count: { select: { quotes: true, missions: true, activities: true } }
        },
        orderBy: { [sortBy]: sortOrder }
      }),
      this.prisma.lead.count({ where })
    ]);
    return { leads, totalCount };
  }
  
  /**
   * Retrieves a single lead by its ID, wrapped in React's cache for performance.
   */
  public getLeadById = cache(async (id: string) => {
    return this.prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: true,
        quotes: true,
        missions: true,
        activities: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  });


  /**
   * ============================================================================
   * PRIVATE BUSINESS LOGIC
   * ============================================================================
   */

  /**
   * Calculates a dynamic score for a lead based on its properties.
   * @param data - Lead data.
   * @returns A score between 0 and 100.
   */
  private calculateLeadScore(data: any): number {
    let score = 50;
    if (data.leadType === 'ENTREPRISE' || data.leadType === 'SYNDIC') score += 20;
    if (data.urgencyLevel === 'IMMEDIATE') score += 30;
    if (data.budgetRange?.includes('10000+')) score += 25;
    if (data.frequency && data.frequency !== 'PONCTUEL') score += 15;
    if (data.estimatedSurface && data.estimatedSurface > 500) score += 10;
    return Math.min(score, 100);
  }

  /**
   * Finds the most suitable agent to assign a new lead to.
   * Currently finds the active agent with the fewest active leads.
   * @returns The ID of the optimal agent, or null if none are available.
   */
  private async getOptimalAgent(): Promise<string | null> {
    try {
      const agents = await this.prisma.user.findMany({
        where: { 
          role: { in: ['AGENT', 'MANAGER'] },
          onlineStatus: { not: 'OFFLINE' }
        },
        include: {
          _count: {
            select: {
              leads: {
                where: { status: { notIn: ['COMPLETED', 'LEAD_LOST', 'CANCELLED'] } }
              }
            }
          }
        },
        orderBy: { leads: { _count: 'asc' } },
        take: 1
      });
      return agents[0]?.id || null;
    } catch (error) {
      console.error('Failed to find optimal agent:', error);
      return null;
    }
  }
}

// Export a singleton instance of the service
export const leadService = new LeadService(prisma);