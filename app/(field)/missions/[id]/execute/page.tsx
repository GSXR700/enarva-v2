// app/(field)/missions/[id]/execute/page.tsx - ENHANCED & CORRECTED VERSION
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  Play, 
  Eye,
  ThumbsUp,
  ThumbsDown,
  MapPin,
  Calendar,
  Users,
  Settings,
  Timer,
  User,
  Phone,
  Star
} from 'lucide-react'
import { Mission, Lead, Task, TaskStatus, User as UserType } from '@prisma/client'
import { formatDate, formatTime, translate } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'
import { useFieldLanguage } from '@/contexts/FieldLanguageContext'
import { LanguageSwitcher } from '@/components/field/LanguageSwitcher'

// Enhanced type definitions
interface TaskWithAssignment extends Task {
  beforePhotos?: string[]
  afterPhotos?: string[]
  clientApproved?: boolean
  teamLeaderValidated?: boolean
  assignedTo?: {
    id: string
    user: UserType
  } | null
}

interface TeamMember {
  id: string
  user: UserType
  specialties: string[]
  experience: string
  availability: string
}

type MissionWithDetails = Mission & { 
  lead: Lead
  teamLeader: UserType | null
  team: {
    members: TeamMember[]
  } | null
  tasks: TaskWithAssignment[]
}

// Status color and icon helpers
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

const getMissionStatusIcon = (status: string) => {
  switch (status) {
    case 'IN_PROGRESS': return <Clock className="w-4 h-4" />
    case 'COMPLETED': return <CheckCircle className="w-4 h-4" />
    default: return <Calendar className="w-4 h-4" />
  }
}

const getMissionStatusText = (status: string, t: any) => {
  const statusKey = status as keyof typeof t.missions.status
  if (t.missions.status[statusKey]) {
    return t.missions.status[statusKey]
  }
  // Fallback to original translation function
  return translate(status)
}

export default function MissionExecutePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { t, isRTL } = useFieldLanguage()
  const missionId = params.id as string

  const currentUser = session?.user as any

  // State management
  const [mission, setMission] = useState<MissionWithDetails | null>(null)
  const [selectedTask, setSelectedTask] = useState<TaskWithAssignment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Task assignment states
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false)
  const [taskToAssign, setTaskToAssign] = useState<TaskWithAssignment | null>(null)
  
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

  // Team leader time management
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false)
  const [selectedTaskForTime, setSelectedTaskForTime] = useState<TaskWithAssignment | null>(null)
  const [newEstimatedTime, setNewEstimatedTime] = useState(60)

  const isTeamLeader = currentUser?.role === 'TEAM_LEADER' || currentUser?.id === mission?.teamLeaderId

  const fetchMission = useCallback(async () => {
    try {
      const response = await fetch(`/api/missions/${missionId}`)
      if (!response.ok) throw new Error('Mission not found')
      const data = await response.json()
      setMission(data)
    } catch (error) {
      toast.error(t.notifications.error)
      router.push('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }, [missionId, router, t.notifications.error])

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
      toast.success(t.notifications.missionStarted)
    } catch (error) {
      toast.error(t.notifications.error)
    } finally {
      setIsUpdating(false)
    }
  }

  const startTask = async (taskId: string) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' })
      })
      if (!response.ok) throw new Error('Failed to start task')
      
      await fetchMission()
      toast.success(t.notifications.taskStarted)
    } catch (error) {
      toast.error(t.notifications.error)
    } finally {
      setIsUpdating(false)
    }
  }

  const completeTask = async (taskId: string) => {
    if (!selectedTask) return
    setIsUpdating(true)
    
    try {
      // Convert photos to base64 strings
      const beforePhotoBase64 = await Promise.all(
        beforePhotos.map(async (file) => {
          const reader = new FileReader()
          return new Promise((resolve) => {
            reader.onload = () => resolve(reader.result)
            reader.readAsDataURL(file)
          })
        })
      )
      
      const afterPhotoBase64 = await Promise.all(
        afterPhotos.map(async (file) => {
          const reader = new FileReader()
          return new Promise((resolve) => {
            reader.onload = () => resolve(reader.result)
            reader.readAsDataURL(file)
          })
        })
      )

      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'COMPLETED',
          beforePhotos: beforePhotoBase64,
          afterPhotos: afterPhotoBase64
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
      toast.success(t.notifications.taskCompleted)
    } catch (error) {
      toast.error(t.notifications.error)
    } finally {
      setIsUpdating(false)
    }
  }

  const validateTask = async (taskId: string, approved: boolean) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: approved ? 'VALIDATED' : 'REJECTED'
        })
      })
      if (!response.ok) throw new Error('Failed to validate task')
      
      await fetchMission()
      toast.success(approved ? 'Tâche validée!' : 'Tâche rejetée!')
    } catch (error) {
      toast.error(t.notifications.error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleTaskAssignment = async (taskId: string, memberId: string | null) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: memberId })
      })

      if (!response.ok) throw new Error('Failed to assign task')

      await fetchMission()
      toast.success(memberId ? 'Tâche assignée avec succès' : 'Assignation supprimée')
    } catch (error) {
      toast.error(t.notifications.error)
    }
  }

  const updateTaskTime = async (taskId: string, estimatedTime: number) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/time`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimatedTime })
      })

      if (!response.ok) throw new Error('Failed to update time')

      await fetchMission()
      toast.success(t.notifications.timeUpdated)
    } catch (error) {
      toast.error(t.notifications.error)
    }
  }

  const openAssignmentDialog = (task: TaskWithAssignment) => {
    setTaskToAssign(task)
    setIsAssignmentDialogOpen(true)
  }

  const openTimeDialog = (task: TaskWithAssignment) => {
    setSelectedTaskForTime(task)
    setNewEstimatedTime(task.estimatedTime || 60)
    setIsTimeDialogOpen(true)
  }

  const completeMission = async () => {
    if (!mission) return
    setIsCompletingMission(true)
    
    try {
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
      toast.error(t.notifications.error)
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const progress = getProgress()
  const canComplete = progress === 100 && mission.status === 'IN_PROGRESS'

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Mobile Header - ENHANCED LAYOUT */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex-1 text-center">
            <div className="space-y-1">
              <h1 className="text-lg font-semibold">{mission.missionNumber}</h1>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600">{mission.lead.firstName} {mission.lead.lastName}</span>
                <Badge variant="outline" className="text-xs px-2 py-1">
                  {t.missions.priority[mission.priority as keyof typeof t.missions.priority] || translate(mission.priority)}
                </Badge>
                <div className="flex items-center gap-1">
                  {getMissionStatusIcon(mission.status)}
                  <span className="text-xs text-gray-600">{getMissionStatusText(mission.status, t)}</span>
                </div>
              </div>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Mission Overview Card */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="truncate">{mission.address}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>{formatDate(mission.scheduledDate)} à {formatTime(mission.scheduledDate)}</span>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{t.missions.progress}</span>
                <span className="text-sm font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-gray-500">
                {mission.tasks.filter(t => t.status === 'COMPLETED' || t.status === 'VALIDATED').length} sur {mission.tasks.length} {t.tasks.title} terminées
              </p>
            </div>

            {/* Mission Control Buttons */}
            <div className="flex gap-2">
              {mission.status === 'SCHEDULED' && (
                <Button 
                  onClick={startMission} 
                  disabled={isUpdating}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {t.missions.startMission}
                </Button>
              )}
              
              {canComplete && (
                <Button 
                  onClick={() => setIsCompletingMission(true)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Terminer la Mission
                </Button>
              )}

              {/* Contact Buttons */}
              {mission.lead.phone && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`tel:${mission.lead.phone}`}>
                    <Phone className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team Leader Controls */}
        {isTeamLeader && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Contrôles Chef d'Équipe
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  Gérer Équipe
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <Timer className="w-3 h-3 mr-1" />
                  {t.tasks.updateTime}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tasks List */}
        <div className="space-y-3">
          {mission.tasks.map((task, index) => (
            <Card key={task.id} className={`border-l-4 ${
              task.status === 'VALIDATED' ? 'border-l-green-500' :
              task.status === 'COMPLETED' ? 'border-l-blue-500' :
              task.status === 'IN_PROGRESS' ? 'border-l-orange-500' :
              task.status === 'REJECTED' ? 'border-l-red-500' :
              'border-l-gray-300'
            }`}>
              <CardContent className="p-3">
                <div className="space-y-3">
                  {/* Task Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-2">
                      <h3 className="font-medium text-sm leading-tight">
                        {index + 1}. {task.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {t.tasks.category[task.category as keyof typeof t.tasks.category] || translate(task.category)}
                      </p>
                      {task.notes && (
                        <p className="text-xs text-gray-500 mt-1">
                          {t.tasks.notes}: {task.notes}
                        </p>
                      )}
                    </div>
                    <Badge className={`${getTaskStatusColor(task.status)} text-xs flex items-center gap-1 shrink-0`}>
                      {getTaskStatusIcon(task.status)}
                      <span className="hidden sm:inline">{t.tasks.status[task.status as keyof typeof t.tasks.status] || translate(task.status)}</span>
                    </Badge>
                  </div>

                  {/* Assignment Info */}
                  {task.assignedTo && (
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={task.assignedTo.user.image || undefined} />
                        <AvatarFallback className="text-xs">
                          {task.assignedTo.user.name?.split(' ').map(n => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-gray-600">{task.assignedTo.user.name}</span>
                    </div>
                  )}

                  {/* Estimated Time */}
                  <div className="flex items-center gap-2">
                    <Timer className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-600">
                      {task.estimatedTime ? `${task.estimatedTime} ${t.common.minutes}` : 'Temps non défini'}
                    </span>
                    {isTeamLeader && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openTimeDialog(task)}
                        className="text-xs h-auto p-1"
                      >
                        <Settings className="w-3 h-3" />
                      </Button>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {/* Start Task Button */}
                    {task.status === 'ASSIGNED' && (
                      <Button 
                        size="sm" 
                        onClick={() => startTask(task.id)}
                        disabled={isUpdating}
                        className="flex-1 text-xs min-w-0"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        {t.tasks.startTask}
                      </Button>
                    )}
                    
                    {/* Complete Task Button */}
                    {task.status === 'IN_PROGRESS' && (
                      <Button 
                        size="sm" 
                        onClick={() => setSelectedTask(task)}
                        disabled={isUpdating}
                        className="flex-1 text-xs bg-green-600 hover:bg-green-700 min-w-0"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {t.tasks.completeTask}
                      </Button>
                    )}

                    {/* Team Leader Controls */}
                    {isTeamLeader && (
                      <>
                        {/* Assignment Button */}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openAssignmentDialog(task)}
                          className="text-xs"
                        >
                          <User className="w-3 h-3 mr-1" />
                          {task.assignedTo ? 'Réassigner' : 'Assigner'}
                        </Button>

                        {/* Validate Button for completed tasks */}
                        {task.status === 'COMPLETED' && (
                          <>
                            <Button 
                              size="sm" 
                              onClick={() => validateTask(task.id, true)}
                              disabled={isUpdating}
                              className="text-xs bg-purple-600 hover:bg-purple-700"
                            >
                              <ThumbsUp className="w-3 h-3 mr-1" />
                              Valider
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => validateTask(task.id, false)}
                              disabled={isUpdating}
                              variant="outline"
                              className="text-xs text-red-600"
                            >
                              <ThumbsDown className="w-3 h-3 mr-1" />
                              Rejeter
                            </Button>
                          </>
                        )}
                      </>
                    )}

                    {/* View Photos Button */}
                    {(task.beforePhotos?.length || task.afterPhotos?.length) && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedTask(task)}
                        className="text-xs"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Photos
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Task Completion Dialog */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">
                Terminer: {selectedTask.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="task-notes" className="text-sm">{t.tasks.notes}</Label>
                <Textarea
                  id="task-notes"
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="Décrivez le travail effectué..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Photos avant</Label>
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setBeforePhotos(Array.from(e.target.files || []))}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Label className="text-sm">Photos après</Label>
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setAfterPhotos(Array.from(e.target.files || []))}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="client-approval"
                  checked={clientApproval}
                  onCheckedChange={(checked) => setClientApproval(!!checked)}
                />
                <Label htmlFor="client-approval" className="text-sm">
                  Client approuve cette tâche
                </Label>
              </div>

              {clientApproval && (
                <div>
                  <Label htmlFor="client-feedback" className="text-sm">Feedback du client</Label>
                  <Textarea
                    id="client-feedback"
                    value={clientFeedback}
                    onChange={(e) => setClientFeedback(e.target.value)}
                    placeholder="Commentaires du client..."
                    rows={3}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedTask(null)}
                  size="sm"
                >
                  {t.common.cancel}
                </Button>
                <Button 
                  onClick={() => completeTask(selectedTask.id)}
                  disabled={isUpdating}
                  size="sm"
                >
                  {isUpdating ? 'Enregistrement...' : 'Terminer'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Time Management Dialog */}
      {isTimeDialogOpen && selectedTaskForTime && (
        <Dialog open={isTimeDialogOpen} onOpenChange={setIsTimeDialogOpen}>
          <DialogContent className="max-w-sm mx-4">
            <DialogHeader>
              <DialogTitle className="text-base">
                {t.tasks.updateTime}: {selectedTaskForTime.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="estimated-time" className="text-sm">
                  {t.tasks.estimatedTime} ({t.common.minutes})
                </Label>
                <Input
                  id="estimated-time"
                  type="number"
                  min="1"
                  max="1440"
                  value={newEstimatedTime}
                  onChange={(e) => setNewEstimatedTime(Number(e.target.value))}
                />
              </div>

              <div>
                <Label className="text-sm mb-2 block">Temps Prédéfinis</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[30, 60, 90, 120, 180, 240].map((time) => (
                    <Button
                      key={time}
                      variant={newEstimatedTime === time ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewEstimatedTime(time)}
                      className="text-xs"
                    >
                      {time}min
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => {
                    updateTaskTime(selectedTaskForTime.id, newEstimatedTime)
                    setIsTimeDialogOpen(false)
                  }}
                  className="flex-1"
                  size="sm"
                >
                  {t.common.save}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsTimeDialogOpen(false)}
                  size="sm"
                >
                  {t.common.cancel}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Task Assignment Dialog */}
      {isAssignmentDialogOpen && taskToAssign && (
        <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
          <DialogContent className="max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">
                Assigner: {taskToAssign.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {mission.team?.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={member.user.image || undefined} />
                      <AvatarFallback className="text-xs">
                        {member.user.name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium text-sm">{member.user.name}</h4>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {member.experience}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {member.availability === 'AVAILABLE' ? 'Disponible' : 'Occupé'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      handleTaskAssignment(taskToAssign.id, member.id)
                      setIsAssignmentDialogOpen(false)
                    }}
                    disabled={member.availability !== 'AVAILABLE'}
                    size="sm"
                    className="text-xs"
                  >
                    {member.availability === 'AVAILABLE' ? 'Assigner' : 'Indispo'}
                  </Button>
                </div>
              )) || (
                <p className="text-sm text-gray-500 text-center py-4">
                  Aucun membre d'équipe disponible
                </p>
              )}

              {/* Remove assignment option */}
              {taskToAssign.assignedTo && (
                <div className="p-3 border rounded-lg bg-red-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-red-600">Supprimer l'assignation</span>
                    <Button
                      onClick={() => {
                        handleTaskAssignment(taskToAssign.id, null)
                        setIsAssignmentDialogOpen(false)
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs text-red-600"
                    >
                      {t.common.delete}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsAssignmentDialogOpen(false)}
                size="sm"
              >
                {t.common.close}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Mission Completion Dialog */}
      {isCompletingMission && (
        <Dialog open={isCompletingMission} onOpenChange={setIsCompletingMission}>
          <DialogContent className="max-w-md mx-4">
            <DialogHeader>
              <DialogTitle className="text-base">
                Terminer la mission
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="final-rating" className="text-sm">Note globale du client (1-5)</Label>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Button
                      key={rating}
                      variant={finalClientRating === rating ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFinalClientRating(rating)}
                      className="w-10 h-10 p-0"
                    >
                      <Star className={`w-4 h-4 ${rating <= finalClientRating ? 'fill-current' : ''}`} />
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="final-feedback" className="text-sm">Feedback final du client</Label>
                <Textarea
                  id="final-feedback"
                  value={finalClientFeedback}
                  onChange={(e) => setFinalClientFeedback(e.target.value)}
                  placeholder="Satisfaction générale du client..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCompletingMission(false)}
                  size="sm"
                >
                  {t.common.cancel}
                </Button>
                <Button 
                  onClick={completeMission}
                  disabled={isCompletingMission}
                  size="sm"
                >
                  {isCompletingMission ? 'Finalisation...' : 'Terminer'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}