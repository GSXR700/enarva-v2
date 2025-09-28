'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Star, Clock, User, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { TeamSpecialty, ExperienceLevel } from '@prisma/client'

interface TeamMemberSuggestion {
  id: string
  userId: string
  specialties: TeamSpecialty[]
  experience: ExperienceLevel
  availability: string
  currentTaskCount: number
  eligibilityScore: number
  eligibilityReasons: string[]
  user: {
    name: string
    image: string | null
    role: string
  }
}

interface TaskAssignmentDialogProps {
  isOpen: boolean
  onClose: () => void
  taskId: string
  taskTitle: string
  currentAssignee?: {
    id: string
    user: {
      name: string
      image: string | null
    }
  } | null
  onAssignmentChange: () => void
}

const specialtyLabels: { [key in TeamSpecialty]: string } = {
  GENERAL_CLEANING: 'Nettoyage général',
  WINDOW_SPECIALIST: 'Spécialiste vitres',
  FLOOR_SPECIALIST: 'Spécialiste sols',
  LUXURY_SURFACES: 'Surfaces de luxe',
  EQUIPMENT_HANDLING: 'Manipulation équipement',
  TEAM_MANAGEMENT: 'Gestion équipe',
  QUALITY_CONTROL: 'Contrôle qualité',
  DETAIL_FINISHING: 'Finitions détaillées'
}

const experienceLabels: { [key in ExperienceLevel]: string } = {
  JUNIOR: 'Junior',
  INTERMEDIATE: 'Intermédiaire',
  SENIOR: 'Senior',
  EXPERT: 'Expert'
}

const experienceColors: { [key in ExperienceLevel]: string } = {
  JUNIOR: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  INTERMEDIATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  SENIOR: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  EXPERT: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
}

export function TaskAssignmentDialog({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  currentAssignee,
  onAssignmentChange
}: TaskAssignmentDialogProps) {
  const [suggestions, setSuggestions] = useState<TeamMemberSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchSuggestions()
    }
  }, [isOpen, taskId])

  const fetchSuggestions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}/assignment-suggestions`)
      if (!response.ok) throw new Error('Failed to fetch suggestions')
      
      const data = await response.json()
      setSuggestions(data)
    } catch (error) {
      console.error('Failed to fetch assignment suggestions:', error)
      toast.error('Erreur lors du chargement des suggestions')
    } finally {
      setIsLoading(false)
    }
  }

  const assignTask = async (memberId: string) => {
    setIsAssigning(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId })
      })

      if (!response.ok) throw new Error('Failed to assign task')

      toast.success('Tâche assignée avec succès')
      onAssignmentChange()
      onClose()
    } catch (error) {
      console.error('Failed to assign task:', error)
      toast.error('Erreur lors de l\'assignation')
    } finally {
      setIsAssigning(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 50) return 'text-green-600 dark:text-green-400'
    if (score >= 20) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBackground = (score: number) => {
    if (score >= 50) return 'bg-green-100 dark:bg-green-900/30'
    if (score >= 20) return 'bg-yellow-100 dark:bg-yellow-900/30'
    return 'bg-red-100 dark:bg-red-900/30'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assigner la tâche: {taskTitle}</DialogTitle>
          {currentAssignee && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>Actuellement assignée à:</span>
              <Avatar className="h-5 w-5">
                <AvatarImage src={currentAssignee.user.image || ''} />
                <AvatarFallback>{currentAssignee.user.name?.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <span>{currentAssignee.user.name}</span>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun membre d'équipe disponible</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Suggestions d'assignation</h3>
                <Badge variant="outline" className="text-xs">
                  {suggestions.length} membre{suggestions.length > 1 ? 's' : ''} disponible{suggestions.length > 1 ? 's' : ''}
                </Badge>
              </div>
              
              {suggestions.map((member) => (
                <Card 
                  key={member.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    member.eligibilityScore >= 50 ? 'ring-2 ring-green-200 dark:ring-green-800' : ''
                  }`}
                  onClick={() => assignTask(member.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <Avatar>
                          <AvatarImage src={member.user.image || ''} />
                          <AvatarFallback>
                            {member.user.name?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium">{member.user.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {member.user.role}
                            </Badge>
                            <Badge className={experienceColors[member.experience]}>
                              {experienceLabels[member.experience]}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>{member.currentTaskCount} tâche{member.currentTaskCount > 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex items-center">
                              <Star className="h-3 w-3 mr-1" />
                              <span>Disponibilité: {member.availability}</span>
                            </div>
                          </div>

                          {member.specialties.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {member.specialties.slice(0, 3).map((specialty) => (
                                <Badge key={specialty} variant="outline" className="text-xs">
                                  {specialtyLabels[specialty]}
                                </Badge>
                              ))}
                              {member.specialties.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{member.specialties.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}

                          {member.eligibilityReasons.length > 0 && (
                            <div className="mt-2">
                              <div className="flex flex-wrap gap-1">
                                {member.eligibilityReasons.slice(0, 2).map((reason, index) => (
                                  <span key={index} className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                    {reason}
                                  </span>
                                ))}
                                {member.eligibilityReasons.length > 2 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{member.eligibilityReasons.length - 2} autres
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-2">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreBackground(member.eligibilityScore)}`}>
                          <span className={getScoreColor(member.eligibilityScore)}>
                            {member.eligibilityScore}%
                          </span>
                        </div>
                        
                        {member.eligibilityScore >= 50 && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Recommandé
                          </Badge>
                        )}

                        <Button 
                          size="sm" 
                          disabled={isAssigning}
                          className="bg-enarva-gradient"
                        >
                          {isAssigning ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Assigner'
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}