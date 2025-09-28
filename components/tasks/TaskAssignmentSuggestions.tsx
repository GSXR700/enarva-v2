// components/tasks/TaskAssignmentSuggestions.tsx - NEW COMPONENT
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Users, Target, Star, Clock, User } from 'lucide-react'
import { toast } from 'sonner'

interface TeamMemberSuggestion {
  id: string
  userId: string
  specialties: string[]
  experience: string
  availability: string
  currentTaskCount: number
  eligibilityScore: number
  eligibilityReasons: string[]
  user: {
    id: string
    name: string
    email: string
    image: string | null
    role: string
  }
}

interface TaskAssignmentSuggestionsProps {
  taskId: string
  onAssign: (memberId: string) => Promise<void>
  trigger?: React.ReactNode
}

export function TaskAssignmentSuggestions({ 
  taskId, 
  onAssign, 
  trigger 
}: TaskAssignmentSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<TeamMemberSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isAssigning, setIsAssigning] = useState<string | null>(null)

  const fetchSuggestions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}/assignment-suggestions`)
      if (!response.ok) throw new Error('Failed to fetch suggestions')
      const data = await response.json()
      setSuggestions(data)
    } catch (error) {
      toast.error('Impossible de charger les suggestions')
      console.error('Error fetching suggestions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchSuggestions()
    }
  }, [isOpen, taskId])

  const handleAssign = async (memberId: string) => {
    setIsAssigning(memberId)
    try {
      await onAssign(memberId)
      toast.success('Tâche assignée avec succès')
      setIsOpen(false)
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Target className="w-4 h-4 mr-1" />
            Suggestions
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Suggestions d'Assignation
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Aucune suggestion disponible</p>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion, index) => (
              <Card key={suggestion.id} className={`border ${index === 0 ? 'border-green-200 bg-green-50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={suggestion.user.image || undefined} />
                        <AvatarFallback>
                          {suggestion.user.name?.split(' ').map(n => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{suggestion.user.name}</h4>
                          {index === 0 && (
                            <Badge variant="default" className="text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              Recommandé
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-gray-600 mb-2">{suggestion.user.email}</p>

                        <div className="flex flex-wrap gap-1 mb-3">
                          <Badge variant="outline" className={`text-xs ${getExperienceColor(suggestion.experience)}`}>
                            {suggestion.experience}
                          </Badge>
                          <Badge variant="outline" className={`text-xs ${getAvailabilityColor(suggestion.availability)}`}>
                            {suggestion.availability}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {suggestion.currentTaskCount} tâches
                          </Badge>
                        </div>

                        {suggestion.specialties.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-500 mb-1">Spécialités:</p>
                            <div className="flex flex-wrap gap-1">
                              {suggestion.specialties.slice(0, 3).map((specialty) => (
                                <Badge key={specialty} variant="secondary" className="text-xs">
                                  {specialty.replace('_', ' ')}
                                </Badge>
                              ))}
                              {suggestion.specialties.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{suggestion.specialties.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {suggestion.eligibilityReasons.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-500 mb-1">Raisons du choix:</p>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {suggestion.eligibilityReasons.slice(0, 2).map((reason, idx) => (
                                <li key={idx} className="flex items-center gap-1">
                                  <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 ml-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Score</p>
                        <p className={`text-lg font-bold ${getScoreColor(suggestion.eligibilityScore)}`}>
                          {suggestion.eligibilityScore}%
                        </p>
                      </div>

                      <Button
                        onClick={() => handleAssign(suggestion.id)}
                        disabled={isAssigning === suggestion.id || suggestion.availability !== 'AVAILABLE'}
                        size="sm"
                        variant={index === 0 ? "default" : "outline"}
                        className="min-w-[80px]"
                      >
                        {isAssigning === suggestion.id ? (
                          <div className="flex items-center gap-1">
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                            <span className="text-xs">...</span>
                          </div>
                        ) : (
                          <>
                            <User className="w-3 h-3 mr-1" />
                            <span className="text-xs">
                              {suggestion.availability === 'AVAILABLE' ? 'Assigner' : 'Indisponible'}
                            </span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}