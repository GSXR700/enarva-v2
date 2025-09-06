//app/(field)/missions/[id]/execute/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  ArrowLeft, 
  Camera, 
  CheckCircle, 
  Clock, 
  Play, 
  Pause,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Send,
  AlertCircle,
  Users,
  MapPin,
  Calendar
} from 'lucide-react'
import { Mission, Lead, Task, TaskStatus, MissionStatus } from '@prisma/client'
import { formatDate, formatTime, translate } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'
import { useEdgeStore } from '@/lib/edgestore'

type TaskWithDetails = Task & {
  beforePhotos?: string[];
  afterPhotos?: string[];
  clientApproved?: boolean;
  teamLeaderValidated?: boolean;
};

type MissionWithDetails = Mission & { 
  lead: Lead; 
  tasks: TaskWithDetails[];
};

const getTaskStatusColor = (status: TaskStatus) => {
  switch (status) {
    case 'ASSIGNED': return 'bg-gray-100 text-gray-800'
    case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
    case 'COMPLETED': return 'bg-green-100 text-green-800'
    case 'VALIDATED': return 'bg-green-600 text-white'
    case 'REJECTED': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getTaskStatusIcon = (status: TaskStatus) => {
  switch (status) {
    case 'ASSIGNED': return <Clock className="w-4 h-4" />
    case 'IN_PROGRESS': return <Play className="w-4 h-4" />
    case 'COMPLETED': return <CheckCircle className="w-4 h-4" />
    case 'VALIDATED': return <ThumbsUp className="w-4 h-4" />
    case 'REJECTED': return <ThumbsDown className="w-4 h-4" />
    default: return <Clock className="w-4 h-4" />
  }
}

export default function MissionExecutePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { edgestore } = useEdgeStore()
  const missionId = params.id as string

  const [mission, setMission] = useState<MissionWithDetails | null>(null)
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Task execution states
  const [taskNotes, setTaskNotes] = useState('')
  const [beforePhotos, setBeforePhotos] = useState<File[]>([])
  const [afterPhotos, setAfterPhotos] = useState<File[]>([])
  const [clientApproval, setClientApproval] = useState(false)
  const [clientFeedback, setClientFeedback] = useState('')

  // Mission completion states
  const [finalClientRating, setFinalClientRating] = useState<number>(5)
  const [finalClientFeedback, setFinalClientFeedback] = useState('')
  const [isCompletingMission, setIsCompletingMission] = useState(false)

  const fetchMission = useCallback(async () => {
    try {
      const response = await fetch(`/api/missions/${missionId}`)
      if (!response.ok) throw new Error('Mission not found')
      const data = await response.json()
      setMission(data)
    } catch (error) {
      toast.error('Impossible de charger la mission')
      router.push('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }, [missionId, router])

  useEffect(() => {
    fetchMission()
  }, [fetchMission])

  const startMission = async () => {
    if (!mission) return
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/missions/${missionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'IN_PROGRESS',
          actualStartTime: new Date().toISOString()
        })
      })
      if (!response.ok) throw new Error('Failed to start mission')
      
      await fetchMission()
      toast.success('Mission démarrée avec succès!')
    } catch (error) {
      toast.error('Impossible de démarrer la mission')
    } finally {
      setIsUpdating(false)
    }
  }

  const startTask = async (taskId: string) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'IN_PROGRESS',
          startedAt: new Date().toISOString()
        })
      })
      if (!response.ok) throw new Error('Failed to start task')
      
      await fetchMission()
      toast.success('Tâche démarrée!')
    } catch (error) {
      toast.error('Impossible de démarrer la tâche')
    } finally {
      setIsUpdating(false)
    }
  }

  const completeTask = async (taskId: string) => {
    if (!selectedTask) return
    setIsUpdating(true)
    
    try {
      // Upload photos if any
      let beforePhotoUrls: string[] = []
      let afterPhotoUrls: string[] = []

      if (beforePhotos.length > 0) {
        const beforeUploads = await Promise.all(
          beforePhotos.map(file => edgestore.publicFiles.upload({ file }))
        )
        beforePhotoUrls = beforeUploads.map(upload => upload.url)
      }

      if (afterPhotos.length > 0) {
        const afterUploads = await Promise.all(
          afterPhotos.map(file => edgestore.publicFiles.upload({ file }))
        )
        afterPhotoUrls = afterUploads.map(upload => upload.url)
      }

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
          notes: taskNotes,
          beforePhotos: beforePhotoUrls,
          afterPhotos: afterPhotoUrls,
          clientApproved: clientApproval,
          clientFeedback
        })
      })
      if (!response.ok) throw new Error('Failed to complete task')
      
      // Reset form
      setTaskNotes('')
      setBeforePhotos([])
      setAfterPhotos([])
      setClientApproval(false)
      setClientFeedback('')
      setSelectedTask(null)
      
      await fetchMission()
      toast.success('Tâche terminée avec succès!')
    } catch (error) {
      toast.error('Impossible de terminer la tâche')
    } finally {
      setIsUpdating(false)
    }
  }

  const validateTask = async (taskId: string, approved: boolean) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: approved ? 'VALIDATED' : 'REJECTED',
          validatedBy: session?.user?.id,
          validatedAt: new Date().toISOString()
        })
      })
      if (!response.ok) throw new Error('Failed to validate task')
      
      await fetchMission()
      toast.success(approved ? 'Tâche validée!' : 'Tâche rejetée!')
    } catch (error) {
      toast.error('Impossible de valider la tâche')
    } finally {
      setIsUpdating(false)
    }
  }

  const completeMission = async () => {
    if (!mission) return
    setIsCompletingMission(true)
    
    try {
      // Check if all tasks are validated
      const incompleteJobs = mission.tasks.filter(task => 
        task.status !== 'VALIDATED'
      )
      
      if (incompleteJobs.length > 0) {
        toast.error(`${incompleteJobs.length} tâche(s) non validée(s)`)
        return
      }

      const response = await fetch(`/api/missions/${missionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'QUALITY_CHECK',
          actualEndTime: new Date().toISOString(),
          clientRating: finalClientRating,
          clientFeedback: finalClientFeedback,
          clientValidated: true
        })
      })
      if (!response.ok) throw new Error('Failed to complete mission')
      
      toast.success('Mission terminée! En attente de validation administrative.')
      router.push('/dashboard')
    } catch (error) {
      toast.error('Impossible de terminer la mission')
    } finally {
      setIsCompletingMission(false)
    }
  }

  const getProgress = () => {
    if (!mission?.tasks?.length) return 0
    const validatedTasks = mission.tasks.filter(t => t.status === 'VALIDATED').length
    return Math.round((validatedTasks / mission.tasks.length) * 100)
  }

  if (isLoading || !mission) {
    return <div className="main-content p-6">Chargement...</div>
  }

  const progress = getProgress()
  const canComplete = progress === 100 && mission.status === 'IN_PROGRESS'

  return (
    <div className="main-content space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Retour au tableau de bord
        </Link>
      </div>

      {/* Mission Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Mission {mission.missionNumber}
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                {mission.lead.firstName} {mission.lead.lastName}
              </p>
            </div>
            <Badge className={`px-3 py-1 ${
              mission.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
              mission.status === 'IN_PROGRESS' ? 'bg-orange-100 text-orange-800' :
              mission.status === 'QUALITY_CHECK' ? 'bg-purple-100 text-purple-800' :
              'bg-green-100 text-green-800'
            }`}>
              {translate('MissionStatus', mission.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{mission.address}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{formatDate(mission.scheduledDate)} à {formatTime(mission.scheduledDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Durée: {mission.estimatedDuration}h</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Progression</span>
              <span className="text-sm font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Mission Control Buttons */}
          <div className="flex gap-2 mt-4">
            {mission.status === 'SCHEDULED' && (
              <Button 
                onClick={startMission} 
                disabled={isUpdating}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Démarrer la Mission
              </Button>
            )}
            
            {canComplete && (
              <Button 
                onClick={() => setIsCompletingMission(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Terminer la Mission
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="grid grid-cols-1 gap-4">
        {mission.tasks.map((task, index) => (
          <Card key={task.id} className={`border-l-4 ${
            task.status === 'VALIDATED' ? 'border-l-green-500' :
            task.status === 'COMPLETED' ? 'border-l-blue-500' :
            task.status === 'IN_PROGRESS' ? 'border-l-orange-500' :
            task.status === 'REJECTED' ? 'border-l-red-500' :
            'border-l-gray-300'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium">
                    {index + 1}. {task.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {translate('TaskCategory', task.category)}
                  </p>
                  {task.notes && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Notes: {task.notes}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={`${getTaskStatusColor(task.status)} flex items-center gap-1`}>
                    {getTaskStatusIcon(task.status)}
                    {translate('TaskStatus', task.status)}
                  </Badge>
                  
                  {/* Task Action Buttons */}
                  {mission.status === 'IN_PROGRESS' && (
                    <div className="flex gap-1">
                      {task.status === 'ASSIGNED' && (
                        <Button 
                          size="sm" 
                          onClick={() => startTask(task.id)}
                          disabled={isUpdating}
                        >
                          <Play className="w-3 h-3" />
                        </Button>
                      )}
                      
                      {task.status === 'IN_PROGRESS' && (
                        <Button 
                          size="sm" 
                          onClick={() => setSelectedTask(task)}
                          variant="outline"
                        >
                          <CheckCircle className="w-3 h-3" />
                        </Button>
                      )}
                      
                      {task.status === 'COMPLETED' && session?.user?.role === 'TEAM_LEADER' && (
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            onClick={() => validateTask(task.id, true)}
                            disabled={isUpdating}
                            variant="outline"
                            className="text-green-600 hover:text-green-700"
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => validateTask(task.id, false)}
                            disabled={isUpdating}
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                      
                      {(task.beforePhotos?.length || task.afterPhotos?.length) && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedTask(task)}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Task Completion Dialog */}
      {selectedTask && (
        <Card className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Terminer la tâche: {selectedTask.title}
              </h3>
              <Button 
                variant="ghost" 
                onClick={() => setSelectedTask(null)}
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="task-notes">Notes de la tâche</Label>
                <Textarea
                  id="task-notes"
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="Décrivez le travail effectué..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Photos avant</Label>
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setBeforePhotos(Array.from(e.target.files || []))}
                  />
                </div>
                <div>
                  <Label>Photos après</Label>
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setAfterPhotos(Array.from(e.target.files || []))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="client-approval"
                  checked={clientApproval}
                  onCheckedChange={(checked) => setClientApproval(!!checked)}
                />
                <Label htmlFor="client-approval">
                  Client approuve cette tâche
                </Label>
              </div>

              {clientApproval && (
                <div>
                  <Label htmlFor="client-feedback">Feedback du client</Label>
                  <Textarea
                    id="client-feedback"
                    value={clientFeedback}
                    onChange={(e) => setClientFeedback(e.target.value)}
                    placeholder="Commentaires du client..."
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedTask(null)}
                >
                  Annuler
                </Button>
                <Button 
                  onClick={() => completeTask(selectedTask.id)}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Enregistrement...' : 'Terminer la tâche'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Mission Completion Dialog */}
      {isCompletingMission && (
        <Card className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              Terminer la mission
            </h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="final-rating">Note globale du client (1-5)</Label>
                <Input
                  id="final-rating"
                  type="number"
                  min="1"
                  max="5"
                  value={finalClientRating}
                  onChange={(e) => setFinalClientRating(Number(e.target.value))}
                />
              </div>

              <div>
                <Label htmlFor="final-feedback">Feedback final du client</Label>
                <Textarea
                  id="final-feedback"
                  value={finalClientFeedback}
                  onChange={(e) => setFinalClientFeedback(e.target.value)}
                  placeholder="Satisfaction générale du client..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCompletingMission(false)}
                >
                  Annuler
                </Button>
                <Button 
                  onClick={completeMission}
                  disabled={isCompletingMission}
                >
                  {isCompletingMission ? 'Finalisation...' : 'Terminer la mission'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}