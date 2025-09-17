// app/(administration)/missions/validation/page.tsx - ADMIN VALIDATION INTERFACE
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Star, 
   
  MapPin, 
  User,
  Camera,
  MessageSquare,
  Calendar,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react'
import { Mission, Lead, Task, User as PrismaUser } from '@prisma/client'
import { formatDate, formatTime, formatCurrency, translate } from '@/lib/utils'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type TaskWithDetails = Task & {
  beforePhotos?: string[];
  afterPhotos?: string[];
  clientApproved?: boolean;
  clientFeedback?: string;
};

type MissionForValidation = Mission & {
  lead: Lead;
  teamLeader: PrismaUser;
  tasks: TaskWithDetails[];
  quote?: { finalPrice: number };
};

export default function MissionValidationPage() {
  const [missions, setMissions] = useState<MissionForValidation[]>([])
  const [selectedMission, setSelectedMission] = useState<MissionForValidation | null>(null)
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isValidating, setIsValidating] = useState(false)
  
  // Validation form data
  const [adminNotes, setAdminNotes] = useState('')
  const [qualityScore, setQualityScore] = useState<number>(5)
  const [issuesFound, setIssuesFound] = useState('')
  const [correctionNeeded, setCorrectionNeeded] = useState(false)

  const fetchPendingMissions = useCallback(async () => {
    try {
      const response = await fetch('/api/missions?status=QUALITY_CHECK,CLIENT_VALIDATION')
      if (!response.ok) throw new Error('Failed to fetch missions')
      const data = await response.json()
      setMissions(data)
    } catch (error) {
      toast.error('Impossible de charger les missions en attente')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPendingMissions()
  }, [fetchPendingMissions])

  const approveMission = async (missionId: string) => {
    setIsValidating(true)
    try {
      const response = await fetch(`/api/missions/${missionId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: true,
          adminNotes,
          qualityScore,
          status: 'COMPLETED'
        })
      })

      if (!response.ok) throw new Error('Failed to approve mission')
      
      toast.success('Mission approuvée avec succès!')
      setSelectedMission(null)
      setAdminNotes('')
      setQualityScore(5)
      await fetchPendingMissions()
    } catch (error) {
      toast.error('Impossible d\'approuver la mission')
    } finally {
      setIsValidating(false)
    }
  }

  const rejectMission = async (missionId: string) => {
    if (!issuesFound.trim()) {
      toast.error('Veuillez spécifier les problèmes identifiés')
      return
    }

    setIsValidating(true)
    try {
      const response = await fetch(`/api/missions/${missionId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: false,
          adminNotes,
          qualityScore,
          issuesFound,
          correctionNeeded,
          status: correctionNeeded ? 'IN_PROGRESS' : 'QUALITY_CHECK'
        })
      })

      if (!response.ok) throw new Error('Failed to reject mission')
      
      toast.success('Mission rejetée. Équipe notifiée.')
      setSelectedMission(null)
      setAdminNotes('')
      setIssuesFound('')
      setCorrectionNeeded(false)
      await fetchPendingMissions()
    } catch (error) {
      toast.error('Impossible de rejeter la mission')
    } finally {
      setIsValidating(false)
    }
  }

  const getTaskCompletionStats = (mission: MissionForValidation) => {
    const total = mission.tasks.length
    const validated = mission.tasks.filter(t => t.status === 'VALIDATED').length
    const withPhotos = mission.tasks.filter(t => 
      (t.beforePhotos && t.beforePhotos.length > 0) || 
      (t.afterPhotos && t.afterPhotos.length > 0)
    ).length
    const clientApproved = mission.tasks.filter(t => t.clientApproved).length

    return { total, validated, withPhotos, clientApproved }
  }

  if (isLoading) {
    return <div className="main-content p-6">Chargement des missions en attente...</div>
  }

  return (
    <div className="main-content space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Validation des Missions</h1>
        <p className="text-muted-foreground mt-1">
          Missions en attente de validation administrative
        </p>
      </div>

      {missions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune mission en attente</h3>
            <p className="text-muted-foreground">
              Toutes les missions ont été validées!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {missions.map((mission) => {
            const stats = getTaskCompletionStats(mission)
            const completionRate = Math.round((stats.validated / stats.total) * 100)
            
            return (
              <Card key={mission.id} className="thread-card hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{mission.missionNumber}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {mission.lead.firstName} {mission.lead.lastName}
                      </p>
                    </div>
                    <Badge className={`px-2 py-1 ${
                      mission.status === 'QUALITY_CHECK' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {translate(mission.status)}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Mission Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>Chef: {mission.teamLeader.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">{mission.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{formatDate(mission.scheduledDate)}</span>
                    </div>
                    {mission.quote && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-enarva-start">
                          {formatCurrency(Number(mission.quote.finalPrice))}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Completion Stats */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Tâches validées</span>
                      <span className="font-medium">{stats.validated}/{stats.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all" 
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Quality Indicators */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      <span>{stats.withPhotos} photos</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      <span>{stats.clientApproved} approuvées</span>
                    </div>
                  </div>

                  {/* Client Feedback */}
                  {(mission as any).clientRating && (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium">{(mission as any).clientRating}/5</span>
                      {(mission as any).clientFeedback && (
                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  )}

                  <Button 
                    onClick={() => setSelectedMission(mission)}
                    className="w-full"
                    variant="outline"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Examiner & Valider
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Mission Validation Dialog */}
      {selectedMission && (
        <Dialog open={!!selectedMission} onOpenChange={() => setSelectedMission(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                Validation: {selectedMission.missionNumber}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Mission Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Aperçu de la Mission
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Client:</strong> {selectedMission.lead.firstName} {selectedMission.lead.lastName}</div>
                  <div><strong>Chef d'équipe:</strong> {selectedMission.teamLeader.name}</div>
                  <div><strong>Date:</strong> {formatDate(selectedMission.scheduledDate)}</div>
                  <div><strong>Adresse:</strong> {selectedMission.address}</div>
                  {selectedMission.quote && (
                    <div><strong>Montant:</strong> {formatCurrency(Number(selectedMission.quote.finalPrice))}</div>
                  )}
                </CardContent>
              </Card>

              {/* Tasks Review */}
              <Card>
                <CardHeader>
                  <CardTitle>Tâches Réalisées ({selectedMission.tasks.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedMission.tasks.map((task, index) => (
                    <div key={task.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">
                          {index + 1}. {task.title}
                        </h4>
                        <Badge className={`text-xs ${
                          task.status === 'VALIDATED' ? 'bg-green-100 text-green-800' :
                          task.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {translate(task.status)}
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-2">
                        {translate(task.category)}
                      </p>

                      {task.notes && (
                        <p className="text-sm mb-2">
                          <strong>Notes:</strong> {task.notes}
                        </p>
                      )}

                      {task.clientApproved && (
                        <div className="flex items-center gap-2 text-sm text-green-600 mb-2">
                          <ThumbsUp className="w-4 h-4" />
                          <span>Approuvé par le client</span>
                        </div>
                      )}

                      {task.clientFeedback && (
                        <p className="text-sm mb-2">
                          <strong>Feedback client:</strong> {task.clientFeedback}
                        </p>
                      )}

                      <div className="flex gap-2">
                        {(task.beforePhotos && task.beforePhotos.length > 0) && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedTask(task)}
                          >
                            <Camera className="w-3 h-3 mr-1" />
                            Photos avant ({task.beforePhotos.length})
                          </Button>
                        )}
                        {(task.afterPhotos && task.afterPhotos.length > 0) && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedTask(task)}
                          >
                            <Camera className="w-3 h-3 mr-1" />
                            Photos après ({task.afterPhotos.length})
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Validation Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Validation Administrative</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="qualityScore">Score Qualité (1-10)</Label>
                    <Input
                      id="qualityScore"
                      type="number"
                      min="1"
                      max="10"
                      value={qualityScore}
                      onChange={(e) => setQualityScore(Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="adminNotes">Notes Administratives</Label>
                    <Textarea
                      id="adminNotes"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Commentaires sur la qualité, points d'amélioration..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="issuesFound">Problèmes Identifiés (pour rejet)</Label>
                    <Textarea
                      id="issuesFound"
                      value={issuesFound}
                      onChange={(e) => setIssuesFound(e.target.value)}
                      placeholder="Détaillez les problèmes qui nécessitent un rejet..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="correctionNeeded"
                      checked={correctionNeeded}
                      onChange={(e) => setCorrectionNeeded(e.target.checked)}
                    />
                    <Label htmlFor="correctionNeeded">Correction requise (retourner en cours)</Label>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button
                      onClick={() => approveMission(selectedMission.id)}
                      disabled={isValidating}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {isValidating ? 'Validation...' : 'Approuver'}
                    </Button>
                    <Button
                      onClick={() => rejectMission(selectedMission.id)}
                      disabled={isValidating || !issuesFound.trim()}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {isValidating ? 'Rejet...' : 'Rejeter'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Task Photos Dialog */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Photos: {selectedTask.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedTask.beforePhotos && selectedTask.beforePhotos.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Photos Avant</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTask.beforePhotos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Avant ${index + 1}`}
                        className="w-full h-40 object-cover rounded"
                      />
                    ))}
                  </div>
                </div>
              )}
              {selectedTask.afterPhotos && selectedTask.afterPhotos.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Photos Après</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTask.afterPhotos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Après ${index + 1}`}
                        className="w-full h-40 object-cover rounded"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}