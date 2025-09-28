// components/tasks/TaskAssignmentDialog.tsx - ENHANCED VERSION WITH SUGGESTIONS
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Target, User, X } from 'lucide-react'
import { toast } from 'sonner'
import { TaskAssignmentSuggestions } from './TaskAssignmentSuggestions'

interface TeamMember {
  id: string
  userId: string
  specialties: string[]
  experience: string
  availability: string
  user: {
    id: string
    name: string
    email: string
    image: string | null
    role: string
  }
}

interface TaskAssignmentDialogProps {
  isOpen: boolean
  onClose: () => void
  taskId: string
  taskTitle: string
  currentAssignee: TeamMember | null
  onAssignmentChange: (taskId: string, memberId: string | null) => Promise<void>
}

export function TaskAssignmentDialog({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  currentAssignee,
  onAssignmentChange
}: TaskAssignmentDialogProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAssigning, setIsAssigning] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchTeamMembers()
    }
  }, [isOpen, taskId])

  const fetchTeamMembers = async () => {
    setIsLoading(true)
    try {
      // Get task details to find mission and team
      const taskResponse = await fetch(`/api/tasks/${taskId}`)
      if (!taskResponse.ok) throw new Error('Failed to fetch task')
      const task = await taskResponse.json()

      if (task.mission?.teamId) {
        const teamResponse = await fetch(`/api/teams/${task.mission.teamId}`)
        if (!teamResponse.ok) throw new Error('Failed to fetch team')
        const team = await teamResponse.json()
        setTeamMembers(team.members || [])
      }
    } catch (error) {
      toast.error('Impossible de charger les membres de l\'équipe')
      console.error('Error fetching team members:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssign = async (memberId: string | null) => {
    if (memberId) {
      setIsAssigning(memberId)
    }
    
    try {
      await onAssignmentChange(taskId, memberId)
      toast.success(memberId ? 'Tâche assignée avec succès' : 'Assignation supprimée')
      onClose()
    } catch (error) {
      toast.error('Erreur lors de l\'assignation')
    } finally {
      setIsAssigning(null)
    }
  }

  const getExperienceColor = (experience: string) => {
    switch (experience) {
      case 'EXPERT': return 'bg-purple-100 text-purple-800'
      case 'SENIOR': return 'bg-blue-100 text-blue-800'
      case 'INTERMEDIATE': return 'bg-green-100 text-green-800'
      case 'JUNIOR': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'AVAILABLE': return 'bg-green-100 text-green-800'
      case 'BUSY': return 'bg-orange-100 text-orange-800'
      case 'OFF_DUTY': return 'bg-red-100 text-red-800'
      case 'VACATION': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Assigner la Tâche
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{taskTitle}</p>
        </DialogHeader>

        <Tabs defaultValue="suggestions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="suggestions" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Suggestions IA
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Assignation Manuelle
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suggestions" className="mt-4">
            <TaskAssignmentSuggestions
              taskId={taskId}
              onAssign={handleAssign}
            />
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            {/* Current Assignment */}
            {currentAssignee && (
              <Card className="mb-4 border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={currentAssignee.user.image || undefined} />
                        <AvatarFallback>
                          {currentAssignee.user.name?.split(' ').map(n => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium text-sm">{currentAssignee.user.name}</h4>
                        <p className="text-xs text-gray-600">Actuellement assigné</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssign(null)}
                      disabled={isAssigning === 'remove'}
                    >
                      {isAssigning === 'remove' ? 'Suppression...' : 'Supprimer'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Team Members List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Aucun membre d'équipe disponible</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers
                  .filter(member => member.id !== currentAssignee?.id)
                  .map((member) => (
                    <Card key={member.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={member.user.image || undefined} />
                              <AvatarFallback>
                                {member.user.name?.split(' ').map(n => n[0]).join('') || 'U'}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm">{member.user.name}</h4>
                              <p className="text-xs text-gray-600 mb-2">{member.user.email}</p>

                              <div className="flex flex-wrap gap-1">
                                <Badge variant="outline" className={`text-xs ${getExperienceColor(member.experience)}`}>
                                  {member.experience}
                                </Badge>
                                <Badge variant="outline" className={`text-xs ${getAvailabilityColor(member.availability)}`}>
                                  {member.availability}
                                </Badge>
                              </div>

                              {member.specialties.length > 0 && (
                                <div className="mt-2">
                                  <div className="flex flex-wrap gap-1">
                                    {member.specialties.slice(0, 3).map((specialty) => (
                                      <Badge key={specialty} variant="secondary" className="text-xs">
                                        {specialty.replace('_', ' ')}
                                      </Badge>
                                    ))}
                                    {member.specialties.length > 3 && (
                                      <Badge variant="secondary" className="text-xs">
                                        +{member.specialties.length - 3}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <Button
                            onClick={() => handleAssign(member.id)}
                            disabled={isAssigning === member.id || member.availability !== 'AVAILABLE'}
                            size="sm"
                            className="ml-4"
                          >
                            {isAssigning === member.id ? (
                              <div className="flex items-center gap-1">
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                                <span className="text-xs">...</span>
                              </div>
                            ) : (
                              <>
                                <User className="w-3 h-3 mr-1" />
                                <span className="text-xs">
                                  {member.availability === 'AVAILABLE' ? 'Assigner' : 'Indisponible'}
                                </span>
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}