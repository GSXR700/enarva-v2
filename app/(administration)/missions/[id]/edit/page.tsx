// app/(administration)/missions/[id]/edit/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import {
  Mission,
  Lead,
  Task,
  TaskCategory,
  TaskStatus,
  TaskType,
  MissionStatus,
  Priority,
  MissionType,
  TeamMember,
} from '@prisma/client'
import { toast } from 'sonner'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { useDrag, useDrop } from 'react-dnd'

type TaskWithId = Task & { id: string }
type TaskTemplateWithTasks = {
  id: string
  name: string
  description?: string
  tasks: any[]
}

const TaskItem = ({
  task,
  index,
  handleTaskChange,
  removeTask,
  moveTask,
  isClientView,
}: {
  task: TaskWithId
  index: number
  handleTaskChange: (
    index: number,
    field: keyof Task,
    value: string | boolean | TaskStatus | TaskType | Date | null
  ) => void
  removeTask: (index: number) => void
  moveTask: (dragIndex: number, hoverIndex: number) => void
  isClientView: boolean
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
    hover: (draggedItem: { index: number }) => {
      if (draggedItem.index !== index) {
        moveTask(draggedItem.index, index)
        draggedItem.index = index
      }
    },
  })

  const ref = (node: HTMLDivElement) => {
    drag(drop(node))
  }

  return (
    <div
      ref={ref}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="p-4 border rounded-lg bg-card"
    >
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-sm">Tâche #{index + 1}</h4>
        {!isClientView && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeTask(index)}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`taskTitle-${index}`}>Titre</Label>
          <Input
            id={`taskTitle-${index}`}
            value={task.title || ''}
            onChange={(e) => handleTaskChange(index, 'title', e.target.value)}
            disabled={isClientView}
          />
        </div>
        <div>
          <Label htmlFor={`taskCategory-${index}`}>Catégorie</Label>
          <Select
            value={task.category}
            onValueChange={(value) =>
              handleTaskChange(index, 'category', value as TaskCategory)
            }
            disabled={isClientView}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir une catégorie" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(TaskCategory).map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor={`taskDescription-${index}`}>Description</Label>
          <Textarea
            id={`taskDescription-${index}`}
            value={task.description || ''}
            onChange={(e) =>
              handleTaskChange(index, 'description', e.target.value)
            }
            disabled={isClientView}
          />
        </div>
        <div>
          <Label htmlFor={`taskStatus-${index}`}>Statut</Label>
          <Select
            value={task.status}
            onValueChange={(value) =>
              handleTaskChange(index, 'status', value as TaskStatus)
            }
            disabled={isClientView}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir un statut" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(TaskStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

interface Props {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function EditMissionPage({ params, searchParams }: Props) {
  const router = useRouter()
  const [mission, setMission] = useState<
    Partial<Mission & { tasks: TaskWithId[] }>
  >({})
  const [leads, setLeads] = useState<Lead[]>([])
  const [teamLeaders, setTeamLeaders] = useState<TeamMember[]>([])
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplateWithTasks[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isClientView, setIsClientView] = useState(false)

  useEffect(() => {
    const initializeData = async () => {
      try {
        if (searchParams?.view === 'client') {
          setIsClientView(true)
        }

        const [
          missionRes,
          leadsRes,
          teamLeadersRes,
          taskTemplatesRes,
        ] = await Promise.all([
          fetch(`/api/missions/${params.id}`),
          fetch('/api/leads'),
          fetch('/api/users?role=TEAM_LEADER'),
          fetch('/api/task-templates'),
        ])

        if (!missionRes.ok) {
          throw new Error('Mission introuvable')
        }

        const missionData = await missionRes.json()
        setMission({
          ...missionData,
          scheduledDate: new Date(missionData.scheduledDate)
            .toISOString()
            .slice(0, 16),
          tasks:
            missionData.tasks?.map((t: Task) => ({
              ...t,
              id: t.id || Math.random().toString(),
            })) || [],
        })
        setLeads(await leadsRes.json())
        setTeamLeaders(await teamLeadersRes.json())
        setTaskTemplates(await taskTemplatesRes.json())
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Erreur lors de la récupération des données.')
      } finally {
        setIsLoading(false)
      }
    }

    initializeData()
  }, [params.id, searchParams])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target
    setMission((prev) => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (
    field: keyof Mission,
    value: string | MissionStatus | Priority | MissionType
  ) => {
    setMission((prev) => ({ ...prev, [field]: value }))
  }

  const handleTaskChange = (
    index: number,
    field: keyof Task,
    value: string | boolean | TaskStatus | TaskType | Date | null
  ) => {
    const newTasks = [...(mission.tasks || [])]
    const taskToUpdate = newTasks[index] as any
    taskToUpdate[field] = value
    setMission((prev) => ({ ...prev, tasks: newTasks }))
  }

  const addTask = () => {
    const newTasks: TaskWithId[] = [
      ...(mission.tasks || []),
      {
        id: Date.now().toString(),
        title: '',
        description: '',
        category: TaskCategory.LIVING_SPACES,
        status: TaskStatus.ASSIGNED,
        type: TaskType.CLEANUP,
        missionId: params.id,
        estimatedTime: null,
        actualTime: null,
        notes: null,
        completedAt: null,
        validatedAt: null,
        assignedToId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ]
    setMission((prev) => ({ ...prev, tasks: newTasks }))
  }

  const removeTask = (index: number) => {
    const newTasks = [...(mission.tasks || [])]
    newTasks.splice(index, 1)
    setMission((prev) => ({ ...prev, tasks: newTasks }))
  }

  const applyTemplate = (templateId: string) => {
    const template = taskTemplates.find((t) => t.id === templateId)
    if (template && Array.isArray(template.tasks)) {
      const newTasks: TaskWithId[] = (template.tasks as any[]).map((item) => ({
        id: Math.random().toString(),
        title: item.title,
        description: '',
        category: item.category,
        type: item.type,
        status: TaskStatus.ASSIGNED,
        missionId: params.id,
        estimatedTime: null,
        actualTime: null,
        notes: null,
        completedAt: null,
        validatedAt: null,
        assignedToId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }))
      setMission((prev) => ({ ...prev, tasks: newTasks }))
    }
  }

  const moveTask = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      if (!mission.tasks) return;
      const dragTask = mission.tasks[dragIndex]
      const newTasks = [...mission.tasks]
      newTasks.splice(dragIndex, 1)
      newTasks.splice(hoverIndex, 0, dragTask)
      setMission((prev) => ({ ...prev, tasks: newTasks }))
    },
    [mission.tasks]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const response = await fetch(`/api/missions/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...mission,
          estimatedDuration: Number(mission.estimatedDuration),
          tasks: mission.tasks?.map(({ id, ...rest }) => rest), // Remove temp id
        }),
      })
      if (!response.ok) throw new Error("Erreur lors de la mise à jour.")

      toast.success('Mission mise à jour avec succès!')
      router.push('/missions')
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/missions">
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              {isClientView ? 'Détails de la Mission' : 'Modifier la Mission'}
            </h1>
            {isClientView && <Badge variant="secondary">Vue Client</Badge>}
          </div>
          {!isClientView && (
            <Button onClick={handleSubmit} disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations Générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="missionNumber">Numéro de Mission</Label>
                  <Input
                    id="missionNumber"
                    value={mission.missionNumber || ''}
                    onChange={handleInputChange}
                    disabled={true} // Usually read-only
                  />
                </div>
                <div>
                  <Label htmlFor="status">Statut</Label>
                  <Select
                    value={mission.status}
                    onValueChange={(value) => handleSelectChange('status', value as MissionStatus)}
                    disabled={isClientView}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(MissionStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheduledDate">Date Programmée</Label>
                  <Input
                    id="scheduledDate"
                    type="datetime-local"
                    value={mission.scheduledDate?.toString() || ''}
                    onChange={handleInputChange}
                    disabled={isClientView}
                  />
                </div>
                <div>
                  <Label htmlFor="estimatedDuration">Durée Estimée (minutes)</Label>
                  <Input
                    id="estimatedDuration"
                    type="number"
                    value={mission.estimatedDuration || ''}
                    onChange={handleInputChange}
                    disabled={isClientView}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Adresse</Label>
                <Textarea
                  id="address"
                  value={mission.address || ''}
                  onChange={handleInputChange}
                  disabled={isClientView}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Tâches</span>
                {!isClientView && (
                  <div className="flex gap-2">
                    <Select onValueChange={applyTemplate}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Appliquer un modèle" />
                      </SelectTrigger>
                      <SelectContent>
                        {taskTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" onClick={addTask}>
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mission.tasks?.map((task, index) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    index={index}
                    handleTaskChange={handleTaskChange}
                    removeTask={removeTask}
                    moveTask={moveTask}
                    isClientView={isClientView}
                  />
                ))}
                {(!mission.tasks || mission.tasks.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    Aucune tâche définie pour cette mission
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </DndProvider>
  )
}