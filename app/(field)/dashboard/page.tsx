// app/(field)/dashboard/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Clock, MapPin, Calendar, CheckCircle2, AlertCircle, Users, Phone, Mail, MessageSquare, Camera, FileText, Settings, Navigation, Timer, Target, Play, Square, Eye, User, ChevronDown } from 'lucide-react'
import { formatDate, formatTime, translate } from '@/lib/utils'
import { Mission, Task, User as UserType } from '@prisma/client'
import { toast } from 'sonner'
import { usePusherChannel } from '@/hooks/usePusherClient'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TaskWithAssignment extends Task {
  assignedTo?: {
    id: string
    user: UserType
  } | null
}

type FieldMission = Mission & {
  lead: {
    id: string
    firstName: string
    lastName: string
    phone: string | null
    email: string | null
    address: string
    company: string | null
  }
  tasks: TaskWithAssignment[]
  teamLeader: UserType | null
  team: {
    id: string
    name: string
    members: {
      id: string
      user: UserType
      specialties: string[]
      experience: string
      availability: string
    }[]
  } | null
}

type DashboardStats = {
  activeMissions: number
  completedToday: number
  pendingTasks: number
  teamEfficiency: number
}

const statusColors = {
  SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  QUALITY_CHECK: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  CLIENT_VALIDATION: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
}

const taskStatusColors = {
  ASSIGNED: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  VALIDATED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
}

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  NORMAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
}

export default function FieldDashboard() {
  const { data: session } = useSession()
  const [missions, setMissions] = useState<FieldMission[]>([])
  const [stats, setStats] = useState<DashboardStats>({ activeMissions: 0, completedToday: 0, pendingTasks: 0, teamEfficiency: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMission, setSelectedMission] = useState<FieldMission | null>(null)
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskWithAssignment | null>(null)
  const [newEstimatedTime, setNewEstimatedTime] = useState(60)
  const [isUpdating, setIsUpdating] = useState(false)

  const currentUser = session?.user as any
  const isTeamLeader = currentUser?.role === 'TEAM_LEADER'
  const isTechnician = currentUser?.role === 'TECHNICIAN'

  const fetchFieldData = useCallback(async () => {
    try {
      const missionsRes = await fetch('/api/missions/field')
      if (missionsRes.ok) {
        const missionsData = await missionsRes.json()
        let filteredMissions = missionsData
        if (isTechnician && !isTeamLeader) {
          filteredMissions = missionsData.filter((m: FieldMission) => m.tasks.some(t => t.assignedTo?.user.id === currentUser?.id))
        }
        setMissions(filteredMissions)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const activeMissions = filteredMissions.filter((m: FieldMission) => ['SCHEDULED', 'IN_PROGRESS'].includes(m.status)).length
        const completedToday = filteredMissions.filter((m: FieldMission) => m.status === 'COMPLETED' && new Date(m.actualEndTime || '').toDateString() === today.toDateString()).length
        let pendingTasks = 0
        if (isTechnician && !isTeamLeader) {
          pendingTasks = filteredMissions.reduce((acc: number, m: FieldMission) => acc + m.tasks.filter(t => t.assignedTo?.user.id === currentUser?.id && ['ASSIGNED', 'IN_PROGRESS'].includes(t.status)).length, 0)
        } else {
          pendingTasks = filteredMissions.reduce((acc: number, m: FieldMission) => acc + m.tasks.filter(t => ['ASSIGNED', 'IN_PROGRESS'].includes(t.status)).length, 0)
        }
        const totalTasks = filteredMissions.reduce((acc: number, m: FieldMission) => acc + m.tasks.length, 0)
        const completedTasks = filteredMissions.reduce((acc: number, m: FieldMission) => acc + m.tasks.filter(t => ['COMPLETED', 'VALIDATED'].includes(t.status)).length, 0)
        const teamEfficiency = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        setStats({ activeMissions, completedToday, pendingTasks, teamEfficiency })
        if (filteredMissions.length > 0 && !selectedMission) {
          setSelectedMission(filteredMissions[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch field data:', error)
      toast.error('Impossible de charger les données')
    } finally {
      setIsLoading(false)
    }
  }, [currentUser?.id, isTechnician, isTeamLeader, selectedMission])

  useEffect(() => {
    fetchFieldData()
  }, [fetchFieldData])

  usePusherChannel('missions-channel', {
    'task-updated': (data: any) => {
      console.log('Task updated via Pusher:', data)
      fetchFieldData()
      toast.success('Tâche mise à jour en temps réel')
    },
    'mission-updated': (data: any) => {
      console.log('Mission updated via Pusher:', data)
      fetchFieldData()
    }
  })

  const handleAssignTask = async (taskId: string, memberId: string | null) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assignedToId: memberId }) })
      if (!response.ok) throw new Error('Failed to assign task')
      await fetchFieldData()
      toast.success(memberId ? 'Tâche assignée avec succès' : 'Assignation supprimée')
    } catch (error) {
      console.error('Assignment error:', error)
      toast.error('Erreur lors de l\'assignation')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUpdateTaskTime = async () => {
    if (!selectedTask) return
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/tasks/${selectedTask.id}/time`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estimatedTime: newEstimatedTime }) })
      if (!response.ok) throw new Error('Failed to update time')
      await fetchFieldData()
      toast.success('Durée mise à jour')
      setIsTimeDialogOpen(false)
    } catch (error) {
      console.error('Time update error:', error)
      toast.error('Erreur de mise à jour')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleToggleTaskStatus = async (task: TaskWithAssignment) => {
    const newStatus = task.status === 'ASSIGNED' ? 'IN_PROGRESS' : task.status === 'IN_PROGRESS' ? 'COMPLETED' : task.status
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
      if (!response.ok) throw new Error('Failed to update status')
      await fetchFieldData()
      toast.success(`Tâche ${newStatus === 'IN_PROGRESS' ? 'démarrée' : 'terminée'}`)
    } catch (error) {
      console.error('Status update error:', error)
      toast.error('Erreur lors de la mise à jour du statut')
    } finally {
      setIsUpdating(false)
    }
  }

  const openTimeDialog = (task: TaskWithAssignment) => {
    setSelectedTask(task)
    setNewEstimatedTime(task.estimatedTime || 60)
    setIsTimeDialogOpen(true)
  }

  const startMission = async (missionId: string) => {
    try {
      const response = await fetch(`/api/missions/${missionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'IN_PROGRESS', actualStartTime: new Date().toISOString() }) })
      if (!response.ok) throw new Error('Failed to start mission')
      toast.success('Mission démarrée')
      fetchFieldData()
    } catch (error) {
      toast.error('Erreur lors du démarrage')
    }
  }

  const getMissionProgress = (mission: FieldMission) => {
    if (!mission.tasks.length) return 0
    const completed = mission.tasks.filter(t => ['COMPLETED', 'VALIDATED'].includes(t.status)).length
    return Math.round((completed / mission.tasks.length) * 100)
  }

  const getMyTasks = (mission: FieldMission) => {
    return mission.tasks.filter(task => task.assignedTo?.user.id === currentUser?.id)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tableau de bord terrain</h1>
            <p className="text-muted-foreground">Bonjour {currentUser?.name?.split(' ')[0] || 'Équipe'}, voici vos missions du jour</p>
            {isTeamLeader && <Badge variant="outline" className="mt-2"><User className="w-3 h-3 mr-1" />Chef d'équipe</Badge>}
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"><Clock className="w-3 h-3 mr-1" />{formatTime(new Date())}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Missions actives</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.activeMissions}</p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Terminées aujourd'hui</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.completedToday}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 border-orange-200 dark:border-orange-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Tâches en attente</p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.pendingTasks}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 border-purple-200 dark:border-purple-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Efficacité équipe</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.teamEfficiency}%</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Missions du jour</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2 p-4 max-h-[600px] overflow-y-auto">
                  {missions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucune mission aujourd'hui</p>
                    </div>
                  ) : (
                    missions.map((mission) => {
                      const progress = getMissionProgress(mission)
                      const myTasks = getMyTasks(mission)
                      return (
                        <div key={mission.id} className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${selectedMission?.id === mission.id ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-muted/50'}`} onClick={() => setSelectedMission(mission)}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{mission.missionNumber}</span>
                            <Badge className={statusColors[mission.status as keyof typeof statusColors] + ' text-xs'}>{translate(mission.status)}</Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="font-medium">{mission.lead.firstName} {mission.lead.lastName}</p>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{mission.address}</span>
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span>{formatTime(new Date(mission.scheduledDate))}</span>
                            </div>
                          </div>
                          {myTasks.length > 0 && (
                            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                              <p className="text-xs text-blue-700 dark:text-blue-400">Mes tâches: {myTasks.filter(t => ['COMPLETED', 'VALIDATED'].includes(t.status)).length}/{myTasks.length}</p>
                            </div>
                          )}
                          {mission.tasks.length > 0 && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                <span>Progression</span>
                                <span>{progress}%</span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {selectedMission ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />{selectedMission.missionNumber}</CardTitle>
                      <p className="text-muted-foreground">{selectedMission.lead.firstName} {selectedMission.lead.lastName}{selectedMission.lead.company && ` - ${selectedMission.lead.company}`}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={priorityColors[selectedMission.priority as keyof typeof priorityColors]}>{translate(selectedMission.priority)}</Badge>
                      <Badge className={statusColors[selectedMission.status as keyof typeof statusColors]}>{translate(selectedMission.status)}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="tasks" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="details">Détails</TabsTrigger>
                      <TabsTrigger value="tasks">Tâches</TabsTrigger>
                      <TabsTrigger value="team">Équipe</TabsTrigger>
                      <TabsTrigger value="actions">Actions</TabsTrigger>
                    </TabsList>
                    <TabsContent value="details" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Adresse</label>
                            <div className="flex items-center mt-1">
                              <MapPin className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                              <span>{selectedMission.address}</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Heure prévue</label>
                            <div className="flex items-center mt-1">
                              <Clock className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                              <span>{formatDate(new Date(selectedMission.scheduledDate))} à {formatTime(new Date(selectedMission.scheduledDate))}</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Durée estimée</label>
                            <div className="flex items-center mt-1">
                              <Timer className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                              <span>{Math.round(selectedMission.estimatedDuration / 60)} heures</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Contact client</label>
                            <div className="space-y-1 mt-1">
                              {selectedMission.lead.phone && (
                                <div className="flex items-center">
                                  <Phone className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                                  <a href={`tel:${selectedMission.lead.phone}`} className="text-blue-600 hover:underline">{selectedMission.lead.phone}</a>
                                </div>
                              )}
                              {selectedMission.lead.email && (
                                <div className="flex items-center">
                                  <Mail className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                                  <a href={`mailto:${selectedMission.lead.email}`} className="text-blue-600 hover:underline truncate">{selectedMission.lead.email}</a>
                                </div>
                              )}
                            </div>
                          </div>
                          {selectedMission.accessNotes && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Notes d'accès</label>
                              <div className="mt-1 p-3 bg-muted/50 rounded-md">
                                <span className="text-sm">{selectedMission.accessNotes}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="tasks" className="space-y-4">
                      <div className="space-y-3">
                        {selectedMission.tasks.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Aucune tâche assignée</p>
                          </div>
                        ) : (
                          selectedMission.tasks.map((task) => (
                            <div key={task.id} className="p-4 border rounded-lg bg-card">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium">{task.title}</h4>
                                <Badge className={taskStatusColors[task.status as keyof typeof taskStatusColors]}>{translate(task.status)}</Badge>
                              </div>
                              {task.description && <p className="text-sm text-muted-foreground mb-3">{task.description}</p>}
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                  {isTeamLeader && selectedMission.team && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-8 text-xs flex items-center gap-1.5 px-2" disabled={isUpdating}>
                                          {task.assignedTo ? (
                                            <>
                                              <Avatar className="h-5 w-5">
                                                <AvatarImage src={task.assignedTo.user.image || ''} />
                                                <AvatarFallback className="text-[10px]">{task.assignedTo.user.name?.charAt(0) || '?'}</AvatarFallback>
                                              </Avatar>
                                              <span className="max-w-[80px] truncate">{task.assignedTo.user.name?.split(' ')[0] || 'Assigné'}</span>
                                            </>
                                          ) : (
                                            <>
                                              <User className="h-3.5 w-3.5" />
                                              <span>Assigner</span>
                                            </>
                                          )}
                                          <ChevronDown className="h-3 w-3 opacity-50" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start" className="w-48">
                                        {selectedMission.team.members.map((member) => (
                                          <DropdownMenuItem key={member.id} onClick={() => handleAssignTask(task.id, member.id)} className="flex items-center gap-2 cursor-pointer">
                                            <Avatar className="h-6 w-6">
                                              <AvatarImage src={member.user.image || ''} />
                                              <AvatarFallback className="text-xs">{member.user.name?.charAt(0) || '?'}</AvatarFallback>
                                            </Avatar>
                                            <span className="flex-1">{member.user.name}</span>
                                            {task.assignedTo?.user.id === member.user.id && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                          </DropdownMenuItem>
                                        ))}
                                        {task.assignedTo && (
                                          <>
                                            <div className="h-px bg-border my-1" />
                                            <DropdownMenuItem onClick={() => handleAssignTask(task.id, null)} className="text-red-600 cursor-pointer">Retirer l'assignation</DropdownMenuItem>
                                          </>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                  {!isTeamLeader && task.assignedTo && (
                                    <div className="flex items-center gap-1.5">
                                      <Avatar className="h-5 w-5">
                                        <AvatarImage src={task.assignedTo.user.image || ''} />
                                        <AvatarFallback className="text-[10px]">{task.assignedTo.user.name?.charAt(0) || '?'}</AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs">{task.assignedTo.user.name}</span>
                                    </div>
                                  )}
                                  {task.estimatedTime && (
                                    <div className="flex items-center gap-1">
                                      <Timer className="h-3.5 w-3.5" />
                                      <span className="text-xs">{task.estimatedTime} min</span>
                                      {isTeamLeader && (
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1" onClick={() => openTimeDialog(task)}>
                                          <Settings className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {(task.assignedTo?.user.id === currentUser?.id || isTeamLeader) && (
                                  <Button onClick={() => handleToggleTaskStatus(task)} disabled={isUpdating || task.status === 'COMPLETED'} className={`h-10 w-10 rounded-full p-0 shrink-0 ${task.status === 'IN_PROGRESS' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} ${task.status === 'COMPLETED' ? 'opacity-50 cursor-not-allowed' : ''}`} size="sm">
                                    {task.status === 'IN_PROGRESS' ? <Square className="h-4 w-4 text-white fill-white" /> : <Play className="h-4 w-4 text-white fill-white" />}
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="team" className="space-y-4">
                      {selectedMission.team ? (
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-3 flex items-center gap-2"><Users className="h-4 w-4" />Équipe {selectedMission.team.name}</h4>
                            <div className="space-y-3">
                              {selectedMission.teamLeader && (
                                <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                  <div className="flex items-center space-x-3">
                                    <Avatar className="h-12 w-12">
                                      <AvatarImage src={selectedMission.teamLeader.image || ''} />
                                      <AvatarFallback>{selectedMission.teamLeader.name?.charAt(0) || 'TL'}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <p className="font-medium text-lg">{selectedMission.teamLeader.name}</p>
                                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <Badge variant="outline">Chef d'équipe</Badge>
                                        <Badge variant="secondary">Expert</Badge>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {selectedMission.team.members.map((member) => (
                                <div key={member.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                  <div className="flex items-center space-x-3">
                                    <Avatar className="h-12 w-12">
                                      <AvatarImage src={member.user.image || ''} />
                                      <AvatarFallback>{member.user.name?.charAt(0) || '?'}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <p className="font-medium text-lg">{member.user.name}</p>
                                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <Badge variant="secondary" className="text-xs">{translate(member.user.role)}</Badge>
                                        <Badge variant="outline" className="text-xs">{translate(member.experience)}</Badge>
                                      </div>
                                      {member.specialties.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          {member.specialties.map((specialty, idx) => (
                                            <Badge key={idx} variant="default" className="text-xs">{specialty}</Badge>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Aucune équipe assignée</p>
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="actions" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedMission.status === 'SCHEDULED' && isTeamLeader && (
                          <Button className="w-full" onClick={() => startMission(selectedMission.id)}><Play className="h-4 w-4 mr-2" />Démarrer la mission</Button>
                        )}
                        <Button variant="outline" className="w-full" asChild>
                          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedMission.address)}`} target="_blank" rel="noopener noreferrer"><Navigation className="h-4 w-4 mr-2" />Navigation GPS</a>
                        </Button>
                        <Button variant="outline" className="w-full"><Camera className="h-4 w-4 mr-2" />Photos avant/après</Button>
                        <Button variant="outline" className="w-full"><FileText className="h-4 w-4 mr-2" />Rapport de terrain</Button>
                        <Button variant="outline" className="w-full"><Settings className="h-4 w-4 mr-2" />Matériaux utilisés</Button>
                        {selectedMission.lead.phone && (
                          <Button variant="outline" className="w-full" asChild>
                            <a href={`tel:${selectedMission.lead.phone}`}><Phone className="h-4 w-4 mr-2" />Appeler le client</a>
                          </Button>
                        )}
                        <Button variant="outline" className="w-full"><MessageSquare className="h-4 w-4 mr-2" />Chat équipe</Button>
                        <Button variant="outline" className="w-full" asChild>
                          <Link href={`/missions/${selectedMission.id}`}><Eye className="h-4 w-4 mr-2" />Voir détails complets</Link>
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-96">
                  <div className="text-center text-muted-foreground">
                    <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Sélectionnez une mission</p>
                    <p className="text-sm">Choisissez une mission dans la liste pour voir les détails</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      <Dialog open={isTimeDialogOpen} onOpenChange={setIsTimeDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier la durée estimée</DialogTitle>
            <DialogDescription>Ajustez le temps estimé pour cette tâche</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="estimatedTime" className="text-right">Durée (min)</Label>
              <Input id="estimatedTime" type="number" value={newEstimatedTime} onChange={(e) => setNewEstimatedTime(parseInt(e.target.value))} className="col-span-3" min={1} max={480} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTimeDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleUpdateTaskTime} disabled={isUpdating}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}