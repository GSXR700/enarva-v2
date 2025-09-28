'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TaskAssignmentDialog } from './TaskAssignmentDialog'
import { 
  Save, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  User, 
  UserPlus,
  Calendar,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { TaskCategory, TaskType, Priority, MissionType, MissionStatus } from '@prisma/client'

type TeamLeader = {
  id: string
  name: string | null
  email: string | null
}

type TeamMember = {
  id: string
  user: {
    id: string
    name: string | null
    email: string | null
    role: string
    image: string | null
  }
  specialties: string[]
  experience: string
}

type Team = {
  id: string
  name: string
  members: TeamMember[]
}

type TaskTemplate = {
  id: string
  name: string
  description: string | null
  category: string
  tasks: any
}

type Task = {
  id?: string | undefined
  title: string
  description: string | null | undefined
  category: TaskCategory | undefined
  type: TaskType | undefined
  status: string | undefined
  estimatedTime: number | null | undefined
  actualTime: number | null | undefined
  assignedToId: string | null | undefined
  assignedTo?: {
    id: string
    user: {
      name: string
      image: string | null
    }
  } | null | undefined
  notes: string | null | undefined
}

type MissionData = {
  id: string
  missionNumber: string
  leadId: string
  quoteId: string | null
  teamLeaderId: string | null
  teamId: string | null
  scheduledDate: string
  estimatedDuration: number
  actualStartTime: string | null
  actualEndTime: string | null
  address: string
  coordinates: string | null
  accessNotes: string | null
  priority: Priority
  type: MissionType
  status: MissionStatus
  adminNotes: string | null
  tasks: Task[]
  lead: {
    firstName: string
    lastName: string
    company: string | null
  }
  team: Team | null
}

const TaskCard = ({ 
  task, 
  index, 
  updateTask, 
  removeTask, 
  onAssignmentClick 
}: {
  task: Task
  index: number
  updateTask: (index: number, field: keyof Task, value: any) => void
  removeTask: (index: number) => void
  onAssignmentClick: (task: Task, index: number) => void
}) => {
  return (
    <div className="p-4 border rounded-lg bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Input
            value={task.title || ''}
            onChange={(e) => updateTask(index, 'title', e.target.value)}
            placeholder="Titre de la tâche"
            className="font-medium"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => removeTask(index)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">Catégorie</Label>
          <Select
            value={task.category || 'GENERAL'}
            onValueChange={(value) => updateTask(index, 'category', value as TaskCategory)}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GENERAL">Général</SelectItem>
              <SelectItem value="EXTERIOR_FACADE">Extérieur</SelectItem>
              <SelectItem value="WALLS_BASEBOARDS">Murs</SelectItem>
              <SelectItem value="FLOORS">Sols</SelectItem>
              <SelectItem value="STAIRS">Escaliers</SelectItem>
              <SelectItem value="WINDOWS_JOINERY">Vitres</SelectItem>
              <SelectItem value="KITCHEN">Cuisine</SelectItem>
              <SelectItem value="BATHROOM_SANITARY">Salle de bain</SelectItem>
              <SelectItem value="LIVING_SPACES">Espaces de vie</SelectItem>
              <SelectItem value="LOGISTICS_ACCESS">Logistique</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Type</Label>
          <Select
            value={task.type || 'EXECUTION'}
            onValueChange={(value) => updateTask(index, 'type', value as TaskType)}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EXECUTION">Exécution</SelectItem>
              <SelectItem value="QUALITY_CHECK">Contrôle qualité</SelectItem>
              <SelectItem value="SETUP">Préparation</SelectItem>
              <SelectItem value="CLEANUP">Nettoyage final</SelectItem>
              <SelectItem value="DOCUMENTATION">Documentation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Temps estimé (min)</Label>
          <Input
            type="number"
            value={task.estimatedTime || ''}
            onChange={(e) => updateTask(index, 'estimatedTime', e.target.value ? parseInt(e.target.value) : null)}
            placeholder="0"
            min="0"
            className="h-8"
          />
        </div>

        <div>
          <Label className="text-xs">Assignée à</Label>
          <div className="flex items-center space-x-2">
            {task.assignedTo ? (
              <div className="flex items-center space-x-2 flex-1">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={task.assignedTo.user.image || ''} />
                  <AvatarFallback className="text-xs">
                    {task.assignedTo.user.name?.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm truncate">{task.assignedTo.user.name}</span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground flex-1">Non assignée</span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAssignmentClick(task, index)}
              className="h-8 px-2"
            >
              <UserPlus className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-xs">Description</Label>
        <Textarea
          value={task.description || ''}
          onChange={(e) => updateTask(index, 'description', e.target.value || null)}
          placeholder="Description de la tâche..."
          rows={2}
          className="text-sm"
        />
      </div>
    </div>
  )
}

export default function EditMissionClient() {
  const router = useRouter()
  const params = useParams()
  const missionId = params.id as string

  const [mission, setMission] = useState<MissionData | null>(null)
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [assignmentDialog, setAssignmentDialog] = useState<{
    isOpen: boolean
    task: Task | null
    taskIndex: number
  }>({
    isOpen: false,
    task: null,
    taskIndex: -1
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🔄 Loading mission data for ID:', missionId)
        const [missionRes, teamLeadersRes, teamsRes, templatesRes] = await Promise.all([
          fetch(`/api/missions/${missionId}`),
          fetch('/api/users?role=TEAM_LEADER'),
          fetch('/api/teams'),
          fetch('/api/task-templates')
        ])

        if (!missionRes.ok) throw new Error('Failed to fetch mission')
        if (!teamLeadersRes.ok) throw new Error('Failed to fetch team leaders')
        if (!teamsRes.ok) throw new Error('Failed to fetch teams')
        if (!templatesRes.ok) throw new Error('Failed to fetch templates')

        const [missionData, teamLeadersData, teamsData, templatesData] = await Promise.all([
          missionRes.json(),
          teamLeadersRes.json(),
          teamsRes.json(),
          templatesRes.json()
        ])

        console.log('✅ Mission loaded with', missionData.tasks?.length || 0, 'tasks')
        console.log('📋 Tasks data:', missionData.tasks?.map((t: any) => ({ id: t.id, title: t.title })))

        const processedMission = {
          ...missionData,
          scheduledDate: new Date(missionData.scheduledDate).toISOString().slice(0, 16),
          estimatedDuration: missionData.estimatedDuration,
          actualStartTime: missionData.actualStartTime ? new Date(missionData.actualStartTime).toISOString().slice(0, 16) : null,
          actualEndTime: missionData.actualEndTime ? new Date(missionData.actualEndTime).toISOString().slice(0, 16) : null,
        }

        setMission(processedMission)
        setTeamLeaders(teamLeadersData.users || teamLeadersData)
        setTeams(teamsData.teams || teamsData)
        setTaskTemplates(templatesData.templates || templatesData)
      } catch (error) {
        console.error('❌ Failed to load data:', error)
        toast.error('Erreur lors du chargement des données')
      } finally {
        setIsLoadingData(false)
      }
    }

    loadData()
  }, [missionId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mission) return

    setIsLoading(true)
    try {
      console.log('🔧 Submitting mission update with', mission.tasks.length, 'tasks')
      
      const payload = {
        ...mission,
        tasks: mission.tasks.map(task => ({
          id: task.id || undefined,
          title: task.title || 'Nouvelle tâche',
          description: task.description || null,
          category: task.category || 'GENERAL',
          type: task.type || 'EXECUTION',
          status: task.status || 'ASSIGNED',
          estimatedTime: task.estimatedTime || null,
          actualTime: task.actualTime || null,
          assignedToId: task.assignedToId || null,
          notes: task.notes || null
        }))
      }

      console.log('📦 Payload tasks:', payload.tasks.map(t => ({ title: t.title, category: t.category })))

      const response = await fetch(`/api/missions/${missionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update mission')
      }

      const updatedMission = await response.json()
      console.log('✅ Mission updated successfully with', updatedMission.tasks?.length || 0, 'tasks')
      
      toast.success('Mission mise à jour avec succès!')
      router.push('/administration/missions')
    } catch (error: any) {
      console.error('❌ Failed to update mission:', error)
      toast.error(error.message || 'Erreur lors de la mise à jour')
    } finally {
      setIsLoading(false)
    }
  }

  const updateTask = (index: number, field: keyof Task, value: any) => {
    if (!mission) return
    
    const updatedTasks = [...mission.tasks]
    const currentTask = updatedTasks[index] || {} as Task
    updatedTasks[index] = { 
      ...currentTask, 
      [field]: value,
      title: field === 'title' ? value : (currentTask?.title || 'Nouvelle tâche'),
      category: field === 'category' ? value : (currentTask?.category || 'GENERAL'),
      type: field === 'type' ? value : (currentTask?.type || 'EXECUTION'),
      status: field === 'status' ? value : (currentTask?.status || 'ASSIGNED')
    } as Task
    setMission({ ...mission, tasks: updatedTasks })
  }

  const addTask = () => {
    if (!mission) return
    
    const newTask: Task = {
      id: undefined,
      title: 'Nouvelle tâche',
      description: null,
      category: 'GENERAL',
      type: 'EXECUTION',
      status: 'ASSIGNED',
      estimatedTime: 60,
      actualTime: null,
      assignedToId: null,
      assignedTo: null,
      notes: null
    }
    
    setMission({ ...mission, tasks: [...mission.tasks, newTask] })
  }

  const removeTask = (index: number) => {
    if (!mission) return
    
    const updatedTasks = mission.tasks.filter((_, i) => i !== index)
    setMission({ ...mission, tasks: updatedTasks })
  }

  const loadTasksFromTemplate = async (templateId: string) => {
    if (!templateId || !mission) return

    try {
      console.log('🔧 Loading tasks from template:', templateId)
      
      const template = taskTemplates.find(t => t.id === templateId)
      if (!template) {
        console.warn('❌ Template not found:', templateId)
        toast.error('Modèle de tâches introuvable')
        return
      }

      console.log('📋 Template found:', template.name, 'with tasks:', template.tasks)

      let templateTasks: any[] = []

      // ROBUST: Handle different task template structures
      if (!template.tasks) {
        console.warn('❌ No tasks found in template')
        toast.error('Aucune tâche trouvée dans le modèle')
        return
      }

      if (Array.isArray(template.tasks)) {
        // Direct array structure
        templateTasks = template.tasks
      } else if (typeof template.tasks === 'object' && template.tasks !== null) {
        // Handle nested structures from database
        const tasksObj = template.tasks as any
        
        console.log('🔍 Analyzing nested task structure:', Object.keys(tasksObj))
        
        if (tasksObj.items?.create && Array.isArray(tasksObj.items.create)) {
          // Structure: { items: { create: [...] } }
          templateTasks = tasksObj.items.create
        } else if (tasksObj.items && Array.isArray(tasksObj.items)) {
          // Structure: { items: [...] }
          templateTasks = tasksObj.items
        } else if (tasksObj.create && Array.isArray(tasksObj.create)) {
          // Structure: { create: [...] }
          templateTasks = tasksObj.create
        } else if (Array.isArray(Object.values(tasksObj))) {
          // Try to extract array values
          const values = Object.values(tasksObj)
          if (values.length > 0 && Array.isArray(values[0])) {
            templateTasks = values[0] as any[]
          } else {
            templateTasks = values.filter(v => v && typeof v === 'object' && 'title' in (v as any)) as any[]
          }
        } else {
          console.warn('❌ Unknown task template structure:', tasksObj)
          toast.error('Structure de modèle non reconnue')
          return
        }
      }

      console.log('✅ Extracted', templateTasks.length, 'tasks from template')

      if (templateTasks.length === 0) {
        toast.warning('Le modèle sélectionné ne contient aucune tâche')
        return
      }

      const newTasks: Task[] = templateTasks.map((task: any, index: number) => {
        console.log('🔧 Processing task', index + 1, ':', task)
        
        return {
          id: undefined,
          title: task.title || task.name || `Tâche ${index + 1}`,
          description: task.description || null,
          category: (task.category as TaskCategory) || 'GENERAL',
          type: (task.type as TaskType) || 'EXECUTION',
          status: 'ASSIGNED',
          estimatedTime: task.estimatedTime || 60,
          actualTime: null,
          assignedToId: null,
          assignedTo: null,
          notes: null
        }
      })

      console.log('🔧 Created tasks:', newTasks.map(t => ({ title: t.title, category: t.category })))

      setMission({ ...mission, tasks: newTasks })
      toast.success(`${newTasks.length} tâches chargées depuis le modèle "${template.name}"`)
    } catch (error) {
      console.error('❌ Failed to load template tasks:', error)
      toast.error('Erreur lors du chargement du modèle')
    }
  }

  const handleAssignmentDialogClose = () => {
    setAssignmentDialog({ isOpen: false, task: null, taskIndex: -1 })
  }

  const handleAssignmentChange = () => {
    const reloadMission = async () => {
      try {
        const response = await fetch(`/api/missions/${missionId}`)
        if (response.ok) {
          const missionData = await response.json()
          const processedMission = {
            ...missionData,
            scheduledDate: new Date(missionData.scheduledDate).toISOString().slice(0, 16),
            estimatedDuration: missionData.estimatedDuration,
            actualStartTime: missionData.actualStartTime ? new Date(missionData.actualStartTime).toISOString().slice(0, 16) : null,
            actualEndTime: missionData.actualEndTime ? new Date(missionData.actualEndTime).toISOString().slice(0, 16) : null,
          }
          setMission(processedMission)
        }
      } catch (error) {
        console.error('Failed to reload mission:', error)
      }
    }
    reloadMission()
  }

  const openAssignmentDialog = (task: Task, index: number) => {
    setAssignmentDialog({
      isOpen: true,
      task,
      taskIndex: index
    })
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  if (!mission) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-medium mb-2">Mission non trouvée</h2>
              <p className="text-muted-foreground mb-6">
                La mission demandée n'existe pas ou vous n'avez pas les permissions pour y accéder.
              </p>
              <Button onClick={() => router.push('/missions')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour aux missions
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const selectedTeam = teams.find(t => t.id === mission.teamId)
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/administration/missions')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Modifier la mission</h1>
              <p className="text-muted-foreground">
                {mission.missionNumber} - {mission.lead.firstName} {mission.lead.lastName}
              </p>
            </div>
          </div>
          <Badge className={
            mission.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
            mission.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
            mission.status === 'SCHEDULED' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
            'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
          }>
            {mission.status}
          </Badge>
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="details" className="space-y-6">
            <TabsList>
              <TabsTrigger value="details">Détails</TabsTrigger>
              <TabsTrigger value="tasks">Tâches ({mission.tasks.length})</TabsTrigger>
              <TabsTrigger value="team">Équipe</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Informations de la mission
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="scheduledDate">Date et heure prévues *</Label>
                        <Input
                          id="scheduledDate"
                          type="datetime-local"
                          value={mission.scheduledDate}
                          onChange={(e) => setMission({ ...mission, scheduledDate: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="estimatedDuration">Durée estimée (minutes) *</Label>
                        <Input
                          id="estimatedDuration"
                          type="number"
                          value={mission.estimatedDuration}
                          onChange={(e) => setMission({ ...mission, estimatedDuration: parseInt(e.target.value) || 0 })}
                          min="1"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="priority">Priorité</Label>
                        <Select
                          value={mission.priority}
                          onValueChange={(value) => setMission({ ...mission, priority: value as Priority })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW">Faible</SelectItem>
                            <SelectItem value="NORMAL">Normale</SelectItem>
                            <SelectItem value="HIGH">Élevée</SelectItem>
                            <SelectItem value="CRITICAL">Critique</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="type">Type de mission</Label>
                        <Select
                          value={mission.type}
                          onValueChange={(value) => setMission({ ...mission, type: value as MissionType })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SERVICE">Service</SelectItem>
                            <SelectItem value="TECHNICAL_VISIT">Visite technique</SelectItem>
                            <SelectItem value="DELIVERY">Livraison</SelectItem>
                            <SelectItem value="INTERNAL">Interne</SelectItem>
                            <SelectItem value="RECURRING">Récurrente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="status">Statut</Label>
                        <Select
                          value={mission.status}
                          onValueChange={(value) => setMission({ ...mission, status: value as MissionStatus })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SCHEDULED">Planifiée</SelectItem>
                            <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                            <SelectItem value="QUALITY_CHECK">Contrôle qualité</SelectItem>
                            <SelectItem value="CLIENT_VALIDATION">Validation client</SelectItem>
                            <SelectItem value="COMPLETED">Terminée</SelectItem>
                            <SelectItem value="CANCELLED">Annulée</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="teamLeaderId">Chef d'équipe</Label>
                        <Select
                          value={mission.teamLeaderId || "none"}
                          onValueChange={(value) => setMission({ ...mission, teamLeaderId: value === "none" ? null : value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un chef d'équipe" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Aucun chef d'équipe</SelectItem>
                            {teamLeaders.map((leader) => (
                              <SelectItem key={leader.id} value={leader.id}>
                                {leader.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="teamId">Équipe assignée</Label>
                        <Select
                          value={mission.teamId || "none"}
                          onValueChange={(value) => setMission({ ...mission, teamId: value === "none" ? null : value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une équipe" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Aucune équipe</SelectItem>
                            {teams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name} ({team.members.length} membres)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {mission.status === 'IN_PROGRESS' && (
                        <div>
                          <Label htmlFor="actualStartTime">Heure de début réelle</Label>
                          <Input
                            id="actualStartTime"
                            type="datetime-local"
                            value={mission.actualStartTime || ''}
                            onChange={(e) => setMission({ ...mission, actualStartTime: e.target.value || null })}
                          />
                        </div>
                      )}

                      {(mission.status === 'COMPLETED' || mission.status === 'CLIENT_VALIDATION') && (
                        <div>
                          <Label htmlFor="actualEndTime">Heure de fin réelle</Label>
                          <Input
                            id="actualEndTime"
                            type="datetime-local"
                            value={mission.actualEndTime || ''}
                            onChange={(e) => setMission({ ...mission, actualEndTime: e.target.value || null })}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="address">Adresse *</Label>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id="address"
                          value={mission.address}
                          onChange={(e) => setMission({ ...mission, address: e.target.value })}
                          placeholder="Adresse complète de la mission"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="accessNotes">Notes d'accès</Label>
                      <Textarea
                        id="accessNotes"
                        value={mission.accessNotes || ''}
                        onChange={(e) => setMission({ ...mission, accessNotes: e.target.value || null })}
                        placeholder="Instructions spéciales pour accéder au site..."
                        rows={3}/>
                    </div>

                    <div>
                      <Label htmlFor="adminNotes">Notes administratives</Label>
                      <Textarea
                        id="adminNotes"
                        value={mission.adminNotes || ''}
                        onChange={(e) => setMission({ ...mission, adminNotes: e.target.value || null })}
                        placeholder="Notes internes pour la mission..."
                        rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tasks">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      Tâches de la mission
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Select onValueChange={loadTasksFromTemplate}>
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Charger depuis un modèle" />
                        </SelectTrigger>
                        <SelectContent>
                          {taskTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" onClick={addTask} variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter une tâche
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {mission.tasks.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Aucune tâche</h3>
                      <p className="text-muted-foreground mb-6">
                        Ajoutez des tâches à cette mission ou chargez-les depuis un modèle.
                      </p>
                      <div className="flex justify-center space-x-4">
                        <Button type="button" onClick={addTask} variant="outline">
                          <Plus className="w-4 h-4 mr-2" />
                          Ajouter une tâche
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {mission.tasks.map((task, index) => (
                        <TaskCard
                          key={index}
                          task={task}
                          index={index}
                          updateTask={updateTask}
                          removeTask={removeTask}
                          onAssignmentClick={openAssignmentDialog}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="team">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Équipe assignée
                  </CardTitle>
                  </CardHeader>
                <CardContent>
                  {selectedTeam ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div>
                          <h3 className="font-medium">{selectedTeam.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {selectedTeam.members.length} membre{selectedTeam.members.length > 1 ? 's' : ''}
                          </p>
                        </div>
                        <Badge variant="outline">
                          Équipe assignée
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedTeam.members.map((member) => (
                          <div key={member.id} className="p-4 border rounded-lg bg-card">
                            <div className="flex items-center space-x-3">
                              <Avatar>
                                <AvatarImage src={member.user.image || ''} />
                                <AvatarFallback>
                                  {member.user.name?.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">{member.user.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {member.user.role}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{member.user.email}</p>
                                {member.specialties.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {member.specialties.slice(0, 2).map((specialty) => (
                                      <Badge key={specialty} variant="outline" className="text-xs">
                                        {specialty}
                                      </Badge>
                                    ))}
                                    {member.specialties.length > 2 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{member.specialties.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <Badge className="text-xs">
                                  {member.experience}
                                </Badge>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {mission.tasks.filter(t => t.assignedTo?.user.name === member.user.name).length} tâche{mission.tasks.filter(t => t.assignedTo?.user.name === member.user.name).length > 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Aucune équipe assignée</h3>
                      <p className="text-muted-foreground mb-6">
                        Sélectionnez une équipe dans l'onglet "Détails" pour voir les membres.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/administration/missions')}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-enarva-gradient">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder
                </>
              )}
            </Button>
          </div>
        </form>

        <TaskAssignmentDialog
          isOpen={assignmentDialog.isOpen}
          onClose={handleAssignmentDialogClose}
          taskId={assignmentDialog.task?.id || ''}
          taskTitle={assignmentDialog.task?.title || ''}
          currentAssignee={assignmentDialog.task?.assignedTo || null}
          onAssignmentChange={handleAssignmentChange}
        />
      </div>
    </div>
  )
}