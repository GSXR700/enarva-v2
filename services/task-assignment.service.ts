import { prisma } from '@/lib/prisma'
import { TeamSpecialty, ExperienceLevel, TaskCategory, TaskType } from '@prisma/client'

interface TaskAssignmentRule {
  taskCategory: TaskCategory
  taskType?: TaskType
  requiredSpecialties: TeamSpecialty[]
  minimumExperience?: ExperienceLevel
  preferredSpecialties?: TeamSpecialty[]
}

const TASK_ASSIGNMENT_RULES: TaskAssignmentRule[] = [
  // Window cleaning requires window specialist
  {
    taskCategory: 'WINDOWS_JOINERY',
    requiredSpecialties: ['WINDOW_SPECIALIST'],
    minimumExperience: 'INTERMEDIATE'
  },
  
  // Floor specialist tasks
  {
    taskCategory: 'FLOORS',
    requiredSpecialties: ['FLOOR_SPECIALIST'],
    preferredSpecialties: ['LUXURY_SURFACES']
  },
  
  // Luxury surfaces (canapés, cristallisation)
  {
    taskCategory: 'LIVING_SPACES',
    taskType: 'DETAIL_FINISHING',
    requiredSpecialties: ['LUXURY_SURFACES'],
    minimumExperience: 'SENIOR'
  },
  
  // Kitchen cleaning
  {
    taskCategory: 'KITCHEN',
    requiredSpecialties: [],
    preferredSpecialties: ['GENERAL_CLEANING', 'DETAIL_FINISHING'],
    minimumExperience: 'INTERMEDIATE'
  },
  
  // Bathroom cleaning
  {
    taskCategory: 'BATHROOM_SANITARY',
    requiredSpecialties: [],
    preferredSpecialties: ['GENERAL_CLEANING'],
    minimumExperience: 'JUNIOR'
  },
  
  // Quality control tasks
  {
    taskCategory: 'GENERAL',
    taskType: 'QUALITY_CHECK',
    requiredSpecialties: ['QUALITY_CONTROL', 'TEAM_MANAGEMENT'],
    minimumExperience: 'SENIOR'
  },
  
  // Equipment handling
  {
    taskCategory: 'LOGISTICS_ACCESS',
    requiredSpecialties: ['EQUIPMENT_HANDLING'],
    minimumExperience: 'INTERMEDIATE'
  }
]

interface TeamMemberInfo {
  id: string
  userId: string
  specialties: TeamSpecialty[]
  experience: ExperienceLevel
  availability: string
  currentTaskCount: number
  user: {
    name: string
    role: string
  }
}

interface TaskInfo {
  id?: string
  title: string
  category: TaskCategory
  type: TaskType
  estimatedTime: number
  description?: string
}

export class TaskAssignmentService {
  
  static async assignTasksToTeam(missionId: string, tasks: TaskInfo[], teamId: string): Promise<any[]> {
    try {
      // Get team members with their specialties and current workload
      const teamMembers = await prisma.teamMember.findMany({
        where: {
          teamId: teamId,
          isActive: true,
          availability: 'AVAILABLE'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true
            }
          },
          tasks: {
            where: {
              status: {
                in: ['ASSIGNED', 'IN_PROGRESS']
              }
            }
          }
        }
      })

      if (teamMembers.length === 0) {
        throw new Error('No available team members found')
      }

      // Transform team members data with explicit typing
      const memberInfo: TeamMemberInfo[] = teamMembers.map((member) => ({
        id: member.id,
        userId: member.userId,
        specialties: member.specialties as TeamSpecialty[],
        experience: member.experience as ExperienceLevel,
        availability: member.availability,
        currentTaskCount: member.tasks.length,
        user: {
          name: member.user.name || 'Unknown',
          role: member.user.role
        }
      }))

      // Assign tasks based on rules and workload balancing
      const assignments = await this.optimizeTaskAssignments(tasks, memberInfo)
      
      // Create tasks in database with assignments
      const createdTasks = await this.createTasksWithAssignments(missionId, assignments)
      
      return createdTasks

    } catch (error) {
      console.error('Task assignment failed:', error)
      throw error
    }
  }

  private static async optimizeTaskAssignments(
    tasks: TaskInfo[], 
    teamMembers: TeamMemberInfo[]
  ): Promise<Array<TaskInfo & { assignedToId: string | null }>> {
    const assignments: Array<TaskInfo & { assignedToId: string | null }> = []
    
    // Sort tasks by priority (specialized tasks first)
    const sortedTasks = this.prioritizeTasks(tasks)
    
    // Track current workload for load balancing
    const workloadTracker = new Map<string, number>()
    teamMembers.forEach((member: TeamMemberInfo) => {
      workloadTracker.set(member.id, member.currentTaskCount)
    })

    for (const task of sortedTasks) {
      const assignedMember = this.findBestMemberForTask(task, teamMembers, workloadTracker)
      
      assignments.push({
        ...task,
        assignedToId: assignedMember?.id || null
      })

      // Update workload tracker
      if (assignedMember) {
        const currentLoad = workloadTracker.get(assignedMember.id) || 0
        workloadTracker.set(assignedMember.id, currentLoad + 1)
      }
    }

    return assignments
  }

  private static prioritizeTasks(tasks: TaskInfo[]): TaskInfo[] {
    return tasks.sort((a, b) => {
      // Find matching rules for priority scoring
      const aRule = TASK_ASSIGNMENT_RULES.find(rule => 
        rule.taskCategory === a.category && 
        (!rule.taskType || rule.taskType === a.type)
      )
      const bRule = TASK_ASSIGNMENT_RULES.find(rule => 
        rule.taskCategory === b.category && 
        (!rule.taskType || rule.taskType === b.type)
      )

      // Tasks with specific requirements get higher priority
      const aPriority = aRule?.requiredSpecialties.length || 0
      const bPriority = bRule?.requiredSpecialties.length || 0

      return bPriority - aPriority
    })
  }

  private static findBestMemberForTask(
    task: TaskInfo,
    teamMembers: TeamMemberInfo[],
    workloadTracker: Map<string, number>
  ): TeamMemberInfo | null {
    // Find matching assignment rule
    const rule = TASK_ASSIGNMENT_RULES.find(rule => 
      rule.taskCategory === task.category && 
      (!rule.taskType || rule.taskType === task.type)
    )

    // Filter members based on requirements
    let eligibleMembers = teamMembers.filter((member: TeamMemberInfo) => {
      // Check required specialties
      if (rule?.requiredSpecialties.length) {
        const hasRequired = rule.requiredSpecialties.some(specialty => 
          member.specialties.includes(specialty)
        )
        if (!hasRequired) return false
      }

      // Check minimum experience
      if (rule?.minimumExperience) {
        const experienceLevels = ['JUNIOR', 'INTERMEDIATE', 'SENIOR', 'EXPERT']
        const memberLevel = experienceLevels.indexOf(member.experience)
        const requiredLevel = experienceLevels.indexOf(rule.minimumExperience)
        if (memberLevel < requiredLevel) return false
      }

      return true
    })

    // If no members meet strict requirements, try with general cleaning
    if (eligibleMembers.length === 0) {
      eligibleMembers = teamMembers.filter((member: TeamMemberInfo) => 
        member.specialties.includes('GENERAL_CLEANING') ||
        member.user.role === 'AGENT'
      )
    }

    // If still no members, assign to any available member
    if (eligibleMembers.length === 0) {
      eligibleMembers = teamMembers
    }

    if (eligibleMembers.length === 0) return null

    // Score members based on preferences and workload
    const scoredMembers = eligibleMembers.map((member: TeamMemberInfo) => {
      let score = 0
      
      // Preferred specialties bonus
      if (rule?.preferredSpecialties) {
        const matchingPreferred = rule.preferredSpecialties.filter(specialty =>
          member.specialties.includes(specialty)
        ).length
        score += matchingPreferred * 10
      }

      // Experience bonus
      const experienceLevels = ['JUNIOR', 'INTERMEDIATE', 'SENIOR', 'EXPERT']
      score += experienceLevels.indexOf(member.experience) * 5

      // Workload penalty (prefer less loaded members)
      const currentLoad = workloadTracker.get(member.id) || 0
      score -= currentLoad * 20

      return { member, score }
    })

    // Return member with highest score
    scoredMembers.sort((a, b) => b.score - a.score)
    return scoredMembers[0]?.member || null
  }

  private static async createTasksWithAssignments(
    missionId: string,
    assignments: Array<TaskInfo & { assignedToId: string | null }>
  ): Promise<any[]> {
    const tasksToCreate = assignments.map(task => ({
      missionId,
      title: task.title,
      description: task.description || null,
      category: task.category,
      type: task.type,
      status: 'ASSIGNED' as const,
      estimatedTime: task.estimatedTime,
      assignedToId: task.assignedToId,
      notes: task.assignedToId ? 
        `Assigné automatiquement basé sur les spécialités` : 
        `Non assigné - aucun membre qualifié trouvé`
    }))

    return await prisma.task.createManyAndReturn({
      data: tasksToCreate
    })
  }

  static async reassignTask(taskId: string, newMemberId: string): Promise<any> {
    // Verify the new member exists and is qualified
    const member = await prisma.teamMember.findUnique({
      where: { id: newMemberId },
      include: { user: true }
    })

    if (!member || !member.isActive) {
      throw new Error('Team member not found or inactive')
    }

    return await prisma.task.update({
      where: { id: taskId },
      data: { 
        assignedToId: newMemberId,
        notes: `Réassigné manuellement à ${member.user.name}`
      }
    })
  }

  static async getTaskAssignmentSuggestions(taskId: string): Promise<TeamMemberInfo[]> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        mission: {
          include: {
            team: {
              include: {
                members: {
                  where: { isActive: true },
                  include: {
                    user: true,
                    tasks: {
                      where: {
                        status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!task?.mission.team) {
      return []
    }

    const taskInfo: TaskInfo = {
      title: task.title,
      category: task.category as TaskCategory,
      type: task.type as TaskType,
      estimatedTime: task.estimatedTime || 60
    }

    const teamMembers: TeamMemberInfo[] = task.mission.team.members.map((member: any) => ({
      id: member.id,
      userId: member.userId,
      specialties: member.specialties as TeamSpecialty[],
      experience: member.experience,
      availability: member.availability,
      currentTaskCount: member.tasks.length,
      user: member.user
    }))

    // Get workload tracker
    const workloadTracker = new Map<string, number>()
    teamMembers.forEach((member: TeamMemberInfo) => {
      workloadTracker.set(member.id, member.currentTaskCount)
    })

    // Find and rank suggestions
    const suggestions = teamMembers
      .map((member: TeamMemberInfo) => {
        const eligibility = this.checkMemberEligibility(taskInfo, member)
        return {
          ...member,
          eligibilityScore: eligibility.score,
          eligibilityReasons: eligibility.reasons
        }
      })
      .sort((a, b) => b.eligibilityScore - a.eligibilityScore)

    return suggestions
  }

  private static checkMemberEligibility(task: TaskInfo, member: TeamMemberInfo) {
    let score = 0
    const reasons: string[] = []

    // Find matching rule
    const rule = TASK_ASSIGNMENT_RULES.find(rule => 
      rule.taskCategory === task.category && 
      (!rule.taskType || rule.taskType === task.type)
    )

    if (rule) {
      // Check required specialties
      if (rule.requiredSpecialties.length > 0) {
        const hasRequired = rule.requiredSpecialties.some(specialty => 
          member.specialties.includes(specialty)
        )
        if (hasRequired) {
          score += 50
          reasons.push('Possède les spécialités requises')
        } else {
          score -= 30
          reasons.push('Manque les spécialités requises')
        }
      }

      // Check minimum experience
      if (rule.minimumExperience) {
        const experienceLevels = ['JUNIOR', 'INTERMEDIATE', 'SENIOR', 'EXPERT']
        const memberLevel = experienceLevels.indexOf(member.experience)
        const requiredLevel = experienceLevels.indexOf(rule.minimumExperience)
        
        if (memberLevel >= requiredLevel) {
          score += 20
          reasons.push('Expérience suffisante')
        } else {
          score -= 40
          reasons.push('Expérience insuffisante')
        }
      }

      // Check preferred specialties
      if (rule.preferredSpecialties) {
        const matchingPreferred = rule.preferredSpecialties.filter(specialty =>
          member.specialties.includes(specialty)
        ).length
        if (matchingPreferred > 0) {
          score += matchingPreferred * 10
          reasons.push('Spécialités préférées')
        }
      }
    } else {
      // No specific rule, check for general cleaning
      if (member.specialties.includes('GENERAL_CLEANING')) {
        score += 10
        reasons.push('Nettoyage général')
      }
    }

    // Workload consideration
    if (member.currentTaskCount === 0) {
      score += 15
      reasons.push('Disponible')
    } else if (member.currentTaskCount < 3) {
      score += 5
      reasons.push('Charge de travail modérée')
    } else {
      score -= 10
      reasons.push('Charge de travail élevée')
    }

    return { score, reasons }
  }
}