// components/missions/EditMissionClient.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import {
  Mission,
  Task,
  TaskStatus,
  TaskType,
  TaskCategory,
  MissionStatus,
  Priority,
  MissionType,
} from '@prisma/client'
import { toast } from 'sonner'

type TaskWithId = Task & { id: string }

interface TaskTemplateWithTasks {
  id: string
  name: string
  description?: string
  tasks: any[]
}

function TaskItem({
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
}) {
  const ref = useRef<HTMLDivElement>(null)

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

  // Fixed: Properly combine drag and drop refs
  drag(drop(ref))

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
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function EditMissionClient({ params, searchParams }: Props) {
  const router = useRouter()
  const [mission, setMission] = useState<
    Partial<Mission & { tasks: TaskWithId[] }>
  >({})
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
          taskTemplatesRes,
        ] = await Promise.all([
          fetch(`/api/missions/${params.id}`),
          fetch('/api/task-templates'),
        ])

        if (!missionRes.ok) {
          throw new Error('Mission introuvable')
        }

        const missionData = await missionRes.json()
        setMission({
          ...missionData,
          // Fixed: Ensure scheduledDate is always a string for input
          scheduledDate: missionData.scheduledDate 
            ? new Date(missionData.scheduledDate).toISOString().slice(0, 16)
            : '',
          tasks:
            missionData.tasks?.map((t: Task) => ({
              ...t,
              id: t.id || Math.random().toString(),
            })) || [],
        })
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
      // Fixed: Handle potential undefined dragTask
      if (!dragTask) return;
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
      <div className="main-content flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="main-content space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {isClientView ? 'Détails de la Mission' : 'Modifier la Mission'}
              </h1>
              <p className="text-muted-foreground">
                Mission #{mission.missionNumber}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card className="thread-card">
            <CardHeader>
              <CardTitle>Informations Générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheduledDate">Date prévue</Label>
                  <Input
                    id="scheduledDate"
                    type="datetime-local"
                    value={typeof mission.scheduledDate === 'string' ? mission.scheduledDate : ''}
                    onChange={handleInputChange}
                    disabled={isClientView}
                  />
                </div>
                <div>
                  <Label htmlFor="estimatedDuration">Durée estimée (heures)</Label>
                  <Input
                    id="estimatedDuration"
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    value={mission.estimatedDuration || ''}
                    onChange={handleInputChange}
                    disabled={isClientView}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="status">Statut</Label>
                  {/* Fixed: Ensure mission.status is not undefined */}
                  <Select 
                    value={mission.status || MissionStatus.SCHEDULED} 
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
                <div>
                  <Label htmlFor="priority">Priorité</Label>
                  <Select
                    value={mission.priority || Priority.NORMAL}
                    onValueChange={(value) => handleSelectChange('priority', value as Priority)}
                    disabled={isClientView}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une priorité" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Priority).map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={mission.type || MissionType.SERVICE}
                    onValueChange={(value) => handleSelectChange('type', value as MissionType)}
                    disabled={isClientView}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(MissionType).map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={mission.address || ''}
                  onChange={handleInputChange}
                  disabled={isClientView}
                />
              </div>

              <div>
                <Label htmlFor="accessNotes">Notes d'accès</Label>
                <Textarea
                  id="accessNotes"
                  value={mission.accessNotes || ''}
                  onChange={handleInputChange}
                  disabled={isClientView}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card className="thread-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Tâches de la Mission
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

          {/* Submit */}
          {!isClientView && (
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading}>
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
          )}
        </form>
      </div>
    </DndProvider>
  )
}