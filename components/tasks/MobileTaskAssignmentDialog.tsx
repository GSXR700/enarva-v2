// components/tasks/MobileTaskAssignmentDialog.tsx - MOBILE OPTIMIZED VERSION
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Users, Target, Star, User, X, Timer } from 'lucide-react'
import { toast } from 'sonner'

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
  currentEstimatedTime?: number
  onAssignmentChange: (taskId: string, memberId: string | null) => Promise<void>
  onTimeUpdate?: (taskId: string, estimatedTime: number) => Promise<void>
  isTeamLeader?: boolean
}

export function MobileTaskAssignmentDialog({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  currentAssignee,
  currentEstimatedTime = 60,
  onAssignmentChange,
  onTimeUpdate,
  isTeamLeader = false
}: TaskAssignmentDialogProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAssigning, setIsAssigning] = useState<string | null>(null)
  const [estimatedTime, setEstimatedTime] = useState(currentEstimatedTime)
  const [activeTab, setActiveTab] = useState<'assign' | 'time'>('assign')

  useEffect(() => {
    if (isOpen) {
      fetchTeamMembers()
      fetchSuggestions()
    }
  }, [isOpen, taskId])

  useEffect(() => {
    setEstimatedTime(currentEstimatedTime)
  }, [currentEstimatedTime])

  const fetchTeamMembers = async () => {
    setIsLoading(true)
    try {
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
      toast.error('Impossible de charger les membres')
      console.error('Error fetching team members:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSuggestions = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/assignment-suggestions`)
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.slice(0, 3)) // Only show top 3 suggestions on mobile
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    }
  }

  const handleAssign = async (memberId: string | null) => {
    if (memberId) {
      setIsAssigning(memberId)
    }
    
    try {
      await onAssignmentChange(taskId, memberId)
      toast.success(memberId ? 'Tâche assignée' : 'Assignation supprimée')
      onClose()
    } catch (error) {
      toast.error('Erreur d\'assignation')
    } finally {
      setIsAssigning(null)
    }
  }

  const handleTimeUpdate = async () => {
    if (!onTimeUpdate) return
    
    try {
      await onTimeUpdate(taskId, estimatedTime)
      toast.success('Temps mis à jour')
      onClose()
    } catch (error) {
      toast.error('Erreur de mise à jour')
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
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Gérer la Tâche
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <p className="text-sm text-muted-foreground truncate">{taskTitle}</p>
        </DialogHeader>

        {/* Tab Navigation */}
        {isTeamLeader && (
          <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
            <button
              onClick={() => setActiveTab('assign')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'assign' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <User className="w-4 h-4 inline mr-1" />
              Assignation
            </button>
            <button
              onClick={() => setActiveTab('time')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'time' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Timer className="w-4 h-4 inline mr-1" />
              Temps
            </button>
          </div>
        )}

        {/* Assignment Tab */}
        {activeTab === 'assign' && (
          <div className="space-y-4">
            {/* Current Assignment */}
            {currentAssignee && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={currentAssignee.user.image || undefined} />
                        <AvatarFallback className="text-xs">
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
                      className="text-xs"
                    >
                      {isAssigning === 'remove' ? '...' : 'Supprimer'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Suggestions */}
            {suggestions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  Suggestions IA
                </h3>
                <div className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <Card key={suggestion.id} className={`${index === 0 ? 'border-green-200 bg-green-50' : ''}`}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={suggestion.user.image || undefined} />
                              <AvatarFallback className="text-xs">
                                {suggestion.user.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <h4 className="font-medium text-sm truncate">{suggestion.user.name}</h4>
                                {index === 0 && (
                                  <Star className="w-3 h-3 text-green-600 flex-shrink-0" />
                                )}
                              </div>
                              <div className="flex gap-1 mt-1">
                                <Badge variant="outline" className={`text-xs ${getExperienceColor(suggestion.experience)}`}>
                                  {suggestion.experience}
                                </Badge>
                                <Badge variant="outline" className={`text-xs ${getAvailabilityColor(suggestion.availability)}`}>
                                  {suggestion.availability}
                                </Badge>
                              </div>
                              <p className="text-xs text-green-600 mt-1">
                                Score: {suggestion.eligibilityScore}%
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleAssign(suggestion.id)}
                            disabled={isAssigning === suggestion.id || suggestion.availability !== 'AVAILABLE'}
                            size="sm"
                            variant={index === 0 ? "default" : "outline"}
                            className="text-xs ml-2"
                          >
                            {isAssigning === suggestion.id ? '...' : 'Assigner'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* All Team Members */}
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                <Users className="w-4 h-4" />
                Tous les Membres
              </h3>
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                </div>
              ) : teamMembers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Aucun membre disponible</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {teamMembers
                    .filter(member => member.id !== currentAssignee?.id)
                    .map((member) => (
                      <Card key={member.id}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={member.user.image || undefined} />
                                <AvatarFallback className="text-xs">
                                  {member.user.name?.split(' ').map(n => n[0]).join('') || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate">{member.user.name}</h4>
                                <div className="flex gap-1 mt-1">
                                  <Badge variant="outline" className={`text-xs ${getExperienceColor(member.experience)}`}>
                                    {member.experience}
                                  </Badge>
                                  <Badge variant="outline" className={`text-xs ${getAvailabilityColor(member.availability)}`}>
                                    {member.availability}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleAssign(member.id)}
                              disabled={isAssigning === member.id || member.availability !== 'AVAILABLE'}
                              size="sm"
                              variant="outline"
                              className="text-xs ml-2"
                            >
                              {isAssigning === member.id ? '...' : 
                               member.availability === 'AVAILABLE' ? 'Assigner' : 'Indispo'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Time Management Tab */}
        {activeTab === 'time' && isTeamLeader && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="estimated-time" className="text-sm font-medium">
                Temps Estimé (minutes)
              </Label>
              <div className="mt-1">
                <Input
                  id="estimated-time"
                  type="number"
                  min="1"
                  max="1440"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Temps suggéré par le système: {currentEstimatedTime} minutes
              </p>
            </div>

            {/* Quick Time Buttons */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Temps Prédéfinis</Label>
              <div className="grid grid-cols-3 gap-2">
                {[30, 60, 90, 120, 180, 240].map((time) => (
                  <Button
                    key={time}
                    variant={estimatedTime === time ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEstimatedTime(time)}
                    className="text-xs"
                  >
                    {time} min
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleTimeUpdate}
                className="flex-1"
                size="sm"
                disabled={estimatedTime === currentEstimatedTime}
              >
                <Timer className="w-4 h-4 mr-1" />
                Mettre à Jour
              </Button>
              <Button
                variant="outline"
                onClick={() => setEstimatedTime(currentEstimatedTime)}
                disabled={estimatedTime === currentEstimatedTime}
                size="sm"
              >
                Réinitialiser
              </Button>
            </div>
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose} size="sm">
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}