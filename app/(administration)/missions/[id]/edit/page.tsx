'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ArrowLeft,
  Save,
  PlusCircle,
  Trash2,
} from 'lucide-react'
import {
  Lead,
  Mission,
  Task,
  User as TeamMember,
  TaskTemplate,
  TaskStatus,
  MissionStatus,
  Priority,
  MissionType,
  TaskCategory,
  TaskType,
} from '@prisma/client'
import { toast } from 'sonner'
import { DndProvider, useDrag, useDrop, DropTargetMonitor } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend } from 'react-dnd-touch-backend'

type TaskWithId = Partial<Task> & { id: string | number };
type TaskTemplateWithTasks = TaskTemplate & { tasks: Array<{title: string; category: TaskCategory; type: TaskType}> };

const TaskItem = ({
  task,
  index,
  moveTask,
  handleTaskChange,
  removeTask,
  isClientView,
}: {
  task: TaskWithId
  index: number
  moveTask: (dragIndex: number, hoverIndex: number) => void
  handleTaskChange: (
    index: number,
    field: keyof Task,
    value: string | boolean | TaskStatus | TaskType | Date | null
  ) => void
  removeTask: (index: number) => void
  isClientView?: boolean
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [{ handlerId }, drop] = useDrop({
    accept: 'task',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId() as string | symbol | null,
      }
    },
    hover(item: unknown, monitor: DropTargetMonitor) {
      if (!ref.current) {
        return
      }
      const dragIndex = (item as { index: number }).index
      const hoverIndex = index

      if (dragIndex === hoverIndex) {
        return
      }
      moveTask(dragIndex, hoverIndex)
      ;(item as { index: number }).index = hoverIndex
    },
  })

  const [{ isDragging }, drag] = useDrag({
    type: 'task',
    item: () => ({ id: task.id, index }),
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  drag(drop(ref))

  return (
    <div
      ref={ref}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="p-4 border rounded-lg bg-card"
      data-handler-id={handlerId}
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

type Props = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

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
    const fetchData = async () => {
      try {
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
        toast.error('Erreur lors de la récupération des données.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()

    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('view') === 'client') {
      setIsClientView(true)
    }
  }, [params.id])

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
      toast.error((error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div>Chargement...</div>
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container mx-auto p-4">
        <div className="flex items-center mb-4">
          <Link href="/missions">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-xl md:text-2xl font-bold ml-4">
            {isClientView
              ? `Détails de la Mission #${mission.missionNumber}`
              : `Modifier la Mission #${mission.missionNumber}`}
          </h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section Informations Générales */}
          <Card>
            <CardHeader>
              <CardTitle>Informations Générales</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ... form fields for mission details ... */}
            </CardContent>
          </Card>

          {/* Section Tâches */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Tâches à effectuer</CardTitle>
                {!isClientView && (
                  <div className="flex items-center gap-2">
                    <Select onValueChange={applyTemplate}>
                      <SelectTrigger style={{ width: 180 }}>
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTask}
                    >
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Ajouter une tâche
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {mission.tasks?.map((task, index) => (
                <TaskItem
                  key={task.id}
                  index={index}
                  task={task}
                  moveTask={moveTask}
                  handleTaskChange={handleTaskChange as any}
                  removeTask={removeTask}
                  isClientView={isClientView}
                />
              ))}
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
            </Button>
          </div>
        </form>
      </div>
    </DndProvider>
  )
}