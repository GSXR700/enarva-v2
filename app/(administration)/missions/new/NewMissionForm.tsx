'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { useDrag, useDrop } from 'react-dnd'
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Users,
  Plus,
  Trash2,
  GripVertical,
  FileText,
  CheckSquare,
  AlertCircle
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Types
interface Lead {
  id: string
  firstName: string
  lastName: string
  phone: string
  email?: string
  address?: string
  company?: string
}

interface TaskTemplate {
  id: string
  name: string
  description?: string
  category: string
  tasks: TaskItem[]
}

interface TaskItem {
  title: string
  description?: string
  category: string
  type?: string
  priority?: string
  estimatedTime?: number
}

interface CustomTask {
  id: string
  title: string
  description?: string
  category: string
  type: string
  priority: string
  estimatedTime?: number | undefined  // Fix: Allow undefined
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'VALIDATED'
}

interface TeamLeader {
  id: string
  name: string
  email: string
  role: string
}

interface Team {
  id: string
  name: string
  description?: string
}

// Validation Schema
const missionSchema = z.object({
  leadId: z.string().min(1, 'Please select a lead'),
  scheduledDate: z.string().min(1, 'Please select a scheduled date'),
  estimatedDuration: z.number().min(0.5, 'Duration must be at least 30 minutes').max(24, 'Duration cannot exceed 24 hours'),
  address: z.string().min(1, 'Address is required'),
  coordinates: z.string().optional(),
  accessNotes: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']),
  type: z.enum(['SERVICE', 'TECHNICAL_VISIT', 'DELIVERY', 'INTERNAL', 'RECURRING']),
  teamLeaderId: z.string().optional(),
  teamId: z.string().optional(),
  adminNotes: z.string().optional(),
})

type MissionFormData = z.infer<typeof missionSchema>

// Draggable Task Component
const DraggableTask = ({ 
  task, 
  index, 
  moveTask, 
  updateTask, 
  removeTask 
}: {
  task: CustomTask
  index: number
  moveTask: (dragIndex: number, hoverIndex: number) => void
  updateTask: (index: number, updates: Partial<CustomTask>) => void
  removeTask: (index: number) => void
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'task',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const [, drop] = useDrop({
    accept: 'task',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveTask(item.index, index)
        item.index = index
      }
    },
  })

  const ref = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      drag(drop(node))
    }
  }, [drag, drop])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
      case 'VALIDATED': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'NORMAL': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div
      ref={ref}
      className={`bg-white p-4 rounded-lg border-2 transition-all ${
        isDragging ? 'opacity-50 border-dashed' : 'border-solid hover:border-blue-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1 cursor-move">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
        
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between">
            <Input
              value={task.title}
              onChange={(e) => updateTask(index, { title: e.target.value })}
              placeholder="Titre de la tâche"
              className="font-medium"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeTask(index)}
              className="text-red-500 hover:text-red-700 ml-2"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <Textarea
            value={task.description || ''}
            onChange={(e) => updateTask(index, { description: e.target.value })}
            placeholder="Description (optionnelle)"
            className="min-h-[60px]"
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Select
              value={task.category}
              onValueChange={(value) => updateTask(index, { category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GENERAL">Général</SelectItem>
                <SelectItem value="BATHROOM_SANITARY">Salle de bain</SelectItem>
                <SelectItem value="KITCHEN">Cuisine</SelectItem>
                <SelectItem value="WINDOWS_JOINERY">Fenêtres</SelectItem>
                <SelectItem value="FLOORS">Sols</SelectItem>
                <SelectItem value="WALLS_BASEBOARDS">Murs</SelectItem>
                <SelectItem value="LIVING_SPACES">Espaces de vie</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={task.type}
              onValueChange={(value) => updateTask(index, { type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EXECUTION">Exécution</SelectItem>
                <SelectItem value="QUALITY_CHECK">Contrôle qualité</SelectItem>
                <SelectItem value="DOCUMENTATION">Documentation</SelectItem>
                <SelectItem value="CLIENT_INTERACTION">Interaction client</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={task.priority}
              onValueChange={(value) => updateTask(index, { priority: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Priorité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Basse</SelectItem>
                <SelectItem value="NORMAL">Normale</SelectItem>
                <SelectItem value="HIGH">Haute</SelectItem>
                <SelectItem value="CRITICAL">Critique</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="number"
              value={task.estimatedTime || ''}
              onChange={(e) => {
                const value = parseInt(e.target.value) || undefined;
                updateTask(index, { estimatedTime: value });
              }}
              placeholder="Temps (min)"
              min="1"
              max="480"
            />
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getStatusColor(task.status)}>
              {task.status}
            </Badge>
            <Badge variant="outline" className={getPriorityColor(task.priority)}>
              {task.priority}
            </Badge>
            {task.estimatedTime && (
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {task.estimatedTime} min
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NewMissionForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([])
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')

  const {
    register,
    handleSubmit,
    control,
    formState: { errors }
  } = useForm<MissionFormData>({
    resolver: zodResolver(missionSchema),
    defaultValues: {
      priority: 'NORMAL',
      type: 'SERVICE',
      estimatedDuration: 2
    }
  })

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leadsRes, teamLeadersRes, teamsRes, templatesRes] = await Promise.all([
          fetch('/api/leads'),
          fetch('/api/users/available?role=TEAM_LEADER'),
          fetch('/api/teams'),
          fetch('/api/task-templates')
        ])

        if (leadsRes.ok) {
          const leadsData = await leadsRes.json()
          setLeads(leadsData.leads || leadsData)
        }

        if (teamLeadersRes.ok) {
          const teamLeadersData = await teamLeadersRes.json()
          setTeamLeaders(teamLeadersData.teamLeaders || teamLeadersData.users || [])
        }

        if (teamsRes.ok) {
          const teamsData = await teamsRes.json()
          setTeams(teamsData.teams || teamsData)
        }

        if (templatesRes.ok) {
          const templatesData = await templatesRes.json()
          setTaskTemplates(templatesData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Erreur lors du chargement des données')
      }
    }

    fetchData()
  }, [])

  // Calculate task progress
  const taskProgress = customTasks.length > 0 
    ? (customTasks.filter(task => task.status === 'COMPLETED' || task.status === 'VALIDATED').length / customTasks.length) * 100
    : 0

  const totalEstimatedTime = customTasks.reduce((total, task) => total + (task.estimatedTime || 0), 0)

  // Task management functions
  const addCustomTask = () => {
    const newTask: CustomTask = {
      id: `temp-${Date.now()}`,
      title: 'Nouvelle tâche',
      description: '',
      category: 'GENERAL',
      type: 'EXECUTION',
      priority: 'NORMAL',
      status: 'ASSIGNED'
    }
    setCustomTasks(prev => [...prev, newTask])
  }

  const removeTask = (index: number) => {
    setCustomTasks(prev => prev.filter((_, i) => i !== index))
  }

  const updateTask = (index: number, updates: Partial<CustomTask>) => {
    setCustomTasks(prev => 
      prev.map((task, i) => i === index ? { ...task, ...updates } : task)
    )
  }

  const moveTask = useCallback((dragIndex: number, hoverIndex: number) => {
    setCustomTasks(prev => {
      const newTasks = [...prev]
      const dragTask = newTasks[dragIndex]
      if (!dragTask) return prev  // Fix: Add safety check
      newTasks.splice(dragIndex, 1)
      newTasks.splice(hoverIndex, 0, dragTask)
      return newTasks
    })
  }, [])

  // Apply task template
  const applyTemplate = (templateId: string) => {
    const template = taskTemplates.find(t => t.id === templateId)
    if (!template || !Array.isArray(template.tasks)) return

    const newTasks: CustomTask[] = template.tasks.map((item: TaskItem, index: number) => ({
      id: `template-${templateId}-${index}`,
      title: item.title,
      description: item.description || '',
      category: item.category,
      type: item.type || 'EXECUTION',
      priority: item.priority || 'NORMAL',
      status: 'ASSIGNED' as const,
      estimatedTime: item.estimatedTime || undefined  // Fix: Explicit undefined
    }))

    setCustomTasks(prev => [...prev, ...newTasks])
    setSelectedTemplate('')
    toast.success(`Modèle "${template.name}" appliqué avec succès`)
  }

  // Form submission
  const onSubmit = async (data: MissionFormData) => {
    setIsLoading(true)
    
    try {
      // Prepare mission data
      const missionData = {
        ...data,
        tasks: customTasks.map(task => ({
          title: task.title,
          description: task.description,
          category: task.category,
          type: task.type,
          priority: task.priority,
          estimatedTime: task.estimatedTime,
          status: 'ASSIGNED'
        }))
      }

      const response = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(missionData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || 'Failed to create mission')
      }

      const mission = await response.json()
      toast.success('Mission créée avec succès!')
      router.push(`/missions/${mission.id}`)
    } catch (error: any) {
      console.error('Error creating mission:', error)
      toast.error(error.message || 'Erreur lors de la création de la mission')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="main-content space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Nouvelle Mission
            </h1>
            <p className="text-muted-foreground mt-1">
              Créez une nouvelle mission avec des tâches personnalisées
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Informations de Base
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="leadId">Client *</Label>
                      <Controller
                        name="leadId"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un client" />
                            </SelectTrigger>
                            <SelectContent>
                              {leads.map(lead => (
                                <SelectItem key={lead.id} value={lead.id}>
                                  <div>
                                    <div className="font-medium">
                                      {lead.firstName} {lead.lastName}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {lead.phone} • {lead.company || 'Particulier'}
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.leadId && (
                        <p className="text-sm text-red-500 mt-1">{errors.leadId.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="scheduledDate">Date et Heure *</Label>
                      <Input
                        id="scheduledDate"
                        type="datetime-local"
                        {...register('scheduledDate')}
                      />
                      {errors.scheduledDate && (
                        <p className="text-sm text-red-500 mt-1">{errors.scheduledDate.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="estimatedDuration">Durée Estimée (heures) *</Label>
                      <Input
                        id="estimatedDuration"
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="24"
                        {...register('estimatedDuration', { valueAsNumber: true })}
                      />
                      {errors.estimatedDuration && (
                        <p className="text-sm text-red-500 mt-1">{errors.estimatedDuration.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="priority">Priorité</Label>
                      <Controller
                        name="priority"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="LOW">Basse</SelectItem>
                              <SelectItem value="NORMAL">Normale</SelectItem>
                              <SelectItem value="HIGH">Haute</SelectItem>
                              <SelectItem value="CRITICAL">Critique</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Adresse *</Label>
                    <Input
                      id="address"
                      placeholder="Adresse complète du lieu d'intervention"
                      {...register('address')}
                    />
                    {errors.address && (
                      <p className="text-sm text-red-500 mt-1">{errors.address.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="accessNotes">Notes d'Accès</Label>
                    <Textarea
                      id="accessNotes"
                      placeholder="Instructions spéciales, codes d'accès, etc."
                      {...register('accessNotes')}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Team Assignment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Attribution d'Équipe
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="teamLeaderId">Chef d'Équipe</Label>
                      <Controller
                        name="teamLeaderId"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <SelectTrigger>
                              <SelectValue placeholder="Attribution automatique" />
                            </SelectTrigger>
                            <SelectContent>
                              {teamLeaders.map(leader => (
                                <SelectItem key={leader.id} value={leader.id}>
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    <div>
                                      <div className="font-medium">{leader.name}</div>
                                      <div className="text-sm text-muted-foreground">{leader.email}</div>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div>
                      <Label htmlFor="teamId">Équipe</Label>
                      <Controller
                        name="teamId"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une équipe" />
                            </SelectTrigger>
                            <SelectContent>
                              {teams.map(team => (
                                <SelectItem key={team.id} value={team.id}>
                                  <div>
                                    <div className="font-medium">{team.name}</div>
                                    {team.description && (
                                      <div className="text-sm text-muted-foreground">{team.description}</div>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Progress Card */}
              {customTasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckSquare className="h-5 w-5" />
                      Progression
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Tâches terminées</span>
                        <span>{Math.round(taskProgress)}%</span>
                      </div>
                      <Progress value={taskProgress} className="h-2" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total tâches</span>
                        <div className="font-medium">{customTasks.length}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Temps estimé</span>
                        <div className="font-medium">{totalEstimatedTime} min</div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Assignées</span>
                        <Badge variant="outline">
                          {customTasks.filter(t => t.status === 'ASSIGNED').length}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>En cours</span>
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">
                          {customTasks.filter(t => t.status === 'IN_PROGRESS').length}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Terminées</span>
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          {customTasks.filter(t => t.status === 'COMPLETED').length}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Actions Rapides</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={addCustomTask}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une tâche
                  </Button>
                  
                  <div>
                    <Select 
                      value={selectedTemplate} 
                      onValueChange={setSelectedTemplate}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Modèles de tâches" />
                      </SelectTrigger>
                      <SelectContent>
                        {taskTemplates.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            <div>
                              <div className="font-medium">{template.name}</div>
                              {template.description && (
                                <div className="text-sm text-muted-foreground">
                                  {template.description}
                                </div>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedTemplate && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => applyTemplate(selectedTemplate)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Appliquer le modèle
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Tasks Management */}
          {customTasks.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5" />
                    Tâches de la Mission ({customTasks.length})
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCustomTask}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customTasks.map((task, index) => (
                    <DraggableTask
                      key={task.id}
                      task={task}
                      index={index}
                      moveTask={moveTask}
                      updateTask={updateTask}
                      removeTask={removeTask}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Admin Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes Administratives</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Notes internes pour l'équipe administrative..."
                {...register('adminNotes')}
              />
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Annuler
            </Button>
            
            <div className="flex items-center gap-3">
              {customTasks.length === 0 && (
                <Alert className="max-w-md">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <AlertDescription>
                    Aucune tâche ajoutée. Ajoutez des tâches ou un modèle pour suivre le progrès.
                  </AlertDescription>
                </Alert>
              )}
              
              <Button
                type="submit"
                disabled={isLoading}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Création...
                  </div>
                ) : (
                  'Créer la Mission'
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </DndProvider>
  )
}