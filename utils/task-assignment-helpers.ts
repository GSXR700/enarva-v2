import { TeamSpecialty, ExperienceLevel, TaskCategory, TaskType } from '@prisma/client'

export interface TaskRequirement {
  category: TaskCategory
  type?: TaskType
  requiredSpecialties: TeamSpecialty[]
  preferredSpecialties?: TeamSpecialty[]
  minimumExperience?: ExperienceLevel
  description: string
}

export const TASK_REQUIREMENTS: TaskRequirement[] = [
  {
    category: 'WINDOWS_JOINERY',
    requiredSpecialties: ['WINDOW_SPECIALIST'],
    minimumExperience: 'INTERMEDIATE',
    description: 'Nettoyage des vitres et menuiseries - Nécessite un spécialiste vitres'
  },
  {
    category: 'FLOORS',
    requiredSpecialties: ['FLOOR_SPECIALIST'],
    preferredSpecialties: ['LUXURY_SURFACES'],
    minimumExperience: 'INTERMEDIATE',
    description: 'Nettoyage et entretien des sols - Spécialiste sols requis'
  },
  {
    category: 'LIVING_SPACES',
    type: 'DETAIL_FINISHING',
    requiredSpecialties: ['LUXURY_SURFACES'],
    minimumExperience: 'SENIOR',
    description: 'Finitions de luxe (canapés, cristallisation) - Expertise surfaces de luxe'
  },
  {
    category: 'BATHROOM_SANITARY',
    requiredSpecialties: [], // Fixed: added required field
    preferredSpecialties: ['GENERAL_CLEANING', 'DETAIL_FINISHING'],
    minimumExperience: 'JUNIOR',
    description: 'Nettoyage des sanitaires - Nettoyage général suffisant'
  },
  {
    category: 'KITCHEN',
    requiredSpecialties: [], // Fixed: added required field
    preferredSpecialties: ['GENERAL_CLEANING', 'DETAIL_FINISHING'],
    minimumExperience: 'INTERMEDIATE',
    description: 'Nettoyage cuisine - Attention aux détails requise'
  },
  {
    category: 'LOGISTICS_ACCESS',
    requiredSpecialties: ['EQUIPMENT_HANDLING'],
    minimumExperience: 'INTERMEDIATE',
    description: 'Manipulation d\'équipement et logistique'
  },
  {
    category: 'EXTERIOR_FACADE',
    requiredSpecialties: ['WINDOW_SPECIALIST', 'EQUIPMENT_HANDLING'],
    minimumExperience: 'SENIOR',
    description: 'Nettoyage extérieur et façades - Spécialisation et expérience requises'
  }
]

export const QUALITY_CONTROL_REQUIREMENTS: TaskRequirement = {
  category: 'GENERAL',
  type: 'QUALITY_CHECK',
  requiredSpecialties: ['QUALITY_CONTROL'],
  preferredSpecialties: ['TEAM_MANAGEMENT'],
  minimumExperience: 'SENIOR',
  description: 'Contrôle qualité - Chef d\'équipe ou responsable qualité'
}

// Rest of the file remains the same...
export function getTaskRequirement(category: TaskCategory, type?: TaskType): TaskRequirement | null {
  if (type === 'QUALITY_CHECK') {
    return QUALITY_CONTROL_REQUIREMENTS
  }
  
  return TASK_REQUIREMENTS.find(req => 
    req.category === category && 
    (!req.type || req.type === type)
  ) || null
}

export function calculateMemberScore(
  member: {
    specialties: TeamSpecialty[]
    experience: ExperienceLevel
    currentTaskCount: number
  },
  requirement: TaskRequirement | null
): {
  score: number
  reasons: string[]
  eligible: boolean
} {
  let score = 0
  const reasons: string[] = []
  let eligible = true

  if (!requirement) {
    // No specific requirements - general cleaning capabilities
    if (member.specialties.includes('GENERAL_CLEANING')) {
      score += 20
      reasons.push('Nettoyage général')
    } else {
      score += 5
      reasons.push('Aucune spécialité spécifique')
    }
  } else {
    // Check required specialties
    if (requirement.requiredSpecialties.length > 0) {
      const hasRequired = requirement.requiredSpecialties.some(specialty => 
        member.specialties.includes(specialty)
      )
      
      if (hasRequired) {
        score += 50
        reasons.push('Spécialités requises présentes')
      } else {
        score -= 30
        eligible = false
        reasons.push('Spécialités requises manquantes')
      }
    }

    // Check preferred specialties
    if (requirement.preferredSpecialties) {
      const matchingPreferred = requirement.preferredSpecialties.filter(specialty =>
        member.specialties.includes(specialty)
      ).length
      
      if (matchingPreferred > 0) {
        score += matchingPreferred * 15
        reasons.push(`${matchingPreferred} spécialité(s) préférée(s)`)
      }
    }

    // Check minimum experience
    if (requirement.minimumExperience) {
      const experienceLevels = ['JUNIOR', 'INTERMEDIATE', 'SENIOR', 'EXPERT']
      const memberLevel = experienceLevels.indexOf(member.experience)
      const requiredLevel = experienceLevels.indexOf(requirement.minimumExperience)
      
      if (memberLevel >= requiredLevel) {
        score += 20 + (memberLevel - requiredLevel) * 10
        reasons.push('Expérience suffisante')
      } else {
        score -= 40
        eligible = false
        reasons.push('Expérience insuffisante')
      }
    }
  }

  // Experience bonus
  const experienceLevels = ['JUNIOR', 'INTERMEDIATE', 'SENIOR', 'EXPERT']
  const experienceBonus = experienceLevels.indexOf(member.experience) * 5
  score += experienceBonus

  // Workload consideration
  if (member.currentTaskCount === 0) {
    score += 20
    reasons.push('Disponible')
  } else if (member.currentTaskCount < 3) {
    score += 10
    reasons.push('Charge modérée')
  } else if (member.currentTaskCount >= 5) {
    score -= 20
    reasons.push('Surchargé')
  }

  return {
    score: Math.max(0, score),
    reasons,
    eligible
  }
}

export function sortMembersByScore(
  members: Array<{
    id: string
    specialties: TeamSpecialty[]
    experience: ExperienceLevel
    currentTaskCount: number
    user: { name: string }
  }>,
  requirement: TaskRequirement | null
) {
  return members
    .map(member => ({
      ...member,
      ...calculateMemberScore(member, requirement)
    }))
    .sort((a, b) => {
      // First sort by eligibility
      if (a.eligible !== b.eligible) {
        return a.eligible ? -1 : 1
      }
      // Then by score
      return b.score - a.score
    })
}

export function getSpecialtyLabel(specialty: TeamSpecialty): string {
  const labels: Record<TeamSpecialty, string> = {
    GENERAL_CLEANING: 'Nettoyage général',
    WINDOW_SPECIALIST: 'Spécialiste vitres',
    FLOOR_SPECIALIST: 'Spécialiste sols', 
    LUXURY_SURFACES: 'Surfaces de luxe',
    EQUIPMENT_HANDLING: 'Manipulation équipement',
    TEAM_MANAGEMENT: 'Gestion équipe',
    QUALITY_CONTROL: 'Contrôle qualité',
    DETAIL_FINISHING: 'Finitions détaillées'
  }
  
  return labels[specialty] || specialty
}

export function getExperienceLabel(level: ExperienceLevel): string {
  const labels: Record<ExperienceLevel, string> = {
    JUNIOR: 'Junior',
    INTERMEDIATE: 'Intermédiaire', 
    SENIOR: 'Senior',
    EXPERT: 'Expert'
  }
  
  return labels[level] || level
}

export function getCategoryLabel(category: TaskCategory): string {
  const labels: Record<TaskCategory, string> = {
    GENERAL: 'Général',
    EXTERIOR_FACADE: 'Extérieur/Façade',
    WALLS_BASEBOARDS: 'Murs/Plinthes',
    FLOORS: 'Sols',
    STAIRS: 'Escaliers',
    WINDOWS_JOINERY: 'Vitres/Menuiseries',
    KITCHEN: 'Cuisine',
    BATHROOM_SANITARY: 'Salle de bain/Sanitaires',
    LIVING_SPACES: 'Espaces de vie',
    LOGISTICS_ACCESS: 'Logistique/Accès'
  }
  
  return labels[category] || category
}

export function getTypeLabel(type: TaskType): string {
  const labels: Record<TaskType, string> = {
    BATHROOM_CLEANING: 'Nettoyage salle de bain',
    WINDOW_CLEANING: 'Nettoyage vitres',
    FLOOR_CLEANING: 'Nettoyage sols',
    SURFACE_CLEANING: 'Nettoyage surfaces',
    DETAIL_FINISHING: 'Finitions détaillées',
    SETUP: 'Préparation',
    CLEANUP: 'Nettoyage final',
    EXECUTION: 'Exécution',
    QUALITY_CHECK: 'Contrôle qualité',
    DOCUMENTATION: 'Documentation',
    CLIENT_INTERACTION: 'Interaction client'
  }
  
  return labels[type] || type
}