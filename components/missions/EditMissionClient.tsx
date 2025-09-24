// components/missions/EditMissionClient.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Plus, Trash2, GripVertical } from 'lucide-react'
import { MissionStatus, Priority, MissionType, TaskStatus, TaskCategory, TaskType } from '@prisma/client'
import { toast } from 'sonner'
import Link from 'next/link'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

// Types
interface TaskWithId {
  id?: string;
  title: string;
  description?: string | null;
  category: TaskCategory;
  type: TaskType;
  status: TaskStatus;
  //priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  estimatedTime?: number | null;
  actualTime?: number | null;
  assignedToId?: string | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  missionId?: string;
  completedAt?: Date | null;
  validatedAt?: Date | null;
}

interface MissionData {
  id: string;
  missionNumber: string;
  status: MissionStatus;
  priority: Priority;
  type: MissionType;
  scheduledDate: string;
  estimatedDuration: number;
  address: string;
  coordinates?: string | null;
  accessNotes?: string | null;
  teamLeaderId?: string | null;
  teamId?: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  clientValidated: boolean;
  clientFeedback?: string | null;
  clientRating?: number | null;
  adminNotes?: string | null;
  tasks?: TaskWithId[];
  lead: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    address?: string;
    company?: string;
  };
  teamLeader?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  team?: {
    id: string;
    name: string;
    members: Array<{
      id: string;
      user: {
        id: string;
        name: string;
        email: string;
        image?: string;
      };
    }>;
  };
}

interface TaskTemplate {
  id: string;
  name: string;
  tasks: any;
}

interface TeamLeader {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Drag and Drop Task Component
const DraggableTask = ({ 
  task, 
  index, 
  moveTask, 
  updateTask, 
  removeTask,
  teamMembers 
}: {
  task: TaskWithId;
  index: number;
  moveTask: (dragIndex: number, hoverIndex: number) => void;
  updateTask: (index: number, field: keyof TaskWithId, value: any) => void;
  removeTask: (index: number) => void;
  teamMembers: Array<{ id: string; user: { id: string; name: string } }>;
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'task',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'task',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveTask(item.index, index);
        item.index = index;
      }
    },
  });

  const ref = useCallback((node: HTMLDivElement | null) => {
    if (node) {
        drag(drop(node));
    }
  }, [drag, drop]);

  return (
    <div
      ref={ref}
      className={`bg-gray-50 p-4 rounded-lg border ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
        <Input
          value={task.title}
          onChange={(e) => updateTask(index, 'title', e.target.value)}
          placeholder="Titre de la tâche"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => removeTask(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <Label className="text-xs">Catégorie</Label>
          <Select
            value={task.category}
            onValueChange={(value) => updateTask(index, 'category', value)}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GENERAL">Général</SelectItem>
              <SelectItem value="EXTERIOR_FACADE">Façade Extérieure</SelectItem>
              <SelectItem value="WALLS_BASEBOARDS">Murs et Plinthes</SelectItem>
              <SelectItem value="FLOORS">Sols</SelectItem>
              <SelectItem value="STAIRS">Escaliers</SelectItem>
              <SelectItem value="WINDOWS_JOINERY">Fenêtres</SelectItem>
              <SelectItem value="KITCHEN">Cuisine</SelectItem>
              <SelectItem value="BATHROOM_SANITARY">Salle de Bain</SelectItem>
              <SelectItem value="LIVING_SPACES">Espaces de Vie</SelectItem>
              <SelectItem value="LOGISTICS_ACCESS">Logistique</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Type</Label>
          <Select
            value={task.type}
            onValueChange={(value) => updateTask(index, 'type', value)}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EXECUTION">Exécution</SelectItem>
              <SelectItem value="QUALITY_CHECK">Contrôle Qualité</SelectItem>
              <SelectItem value="DOCUMENTATION">Documentation</SelectItem>
              <SelectItem value="CLIENT_INTERACTION">Interaction Client</SelectItem>
            </SelectContent>
          </Select>
        </div>

        

        <div>
          <Label className="text-xs">Statut</Label>
          <Select
            value={task.status}
            onValueChange={(value) => updateTask(index, 'status', value)}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ASSIGNED">Assignée</SelectItem>
              <SelectItem value="IN_PROGRESS">En Cours</SelectItem>
              <SelectItem value="COMPLETED">Terminée</SelectItem>
              <SelectItem value="VALIDATED">Validée</SelectItem>
              <SelectItem value="REJECTED">Rejetée</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
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
          <Select
            value={task.assignedToId || 'unassigned'}
            onValueChange={(value) => updateTask(index, 'assignedToId', value === 'unassigned' ? null : value)}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Non assignée" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Non assignée</SelectItem>
              {teamMembers.map((member) => (
                <SelectItem key={member.id} value={member.user.id}>
                  {member.user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
  );
};

export default function EditMissionClient() {
  const router = useRouter();
  const params = useParams();
  const missionId = params.id as string;

  const [mission, setMission] = useState<MissionData | null>(null);
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [missionRes, teamLeadersRes, templatesRes] = await Promise.all([
          fetch(`/api/missions/${missionId}`),
          fetch('/api/users?role=TEAM_LEADER'),
          fetch('/api/task-templates')
        ]);

        if (!missionRes.ok) throw new Error('Failed to fetch mission');
        if (!teamLeadersRes.ok) throw new Error('Failed to fetch team leaders');
        if (!templatesRes.ok) throw new Error('Failed to fetch templates');

        const [missionData, teamLeadersData, templatesData] = await Promise.all([
          missionRes.json(),
          teamLeadersRes.json(),
          templatesRes.json()
        ]);

        // Process mission data
        const processedMission = {
          ...missionData,
          scheduledDate: new Date(missionData.scheduledDate).toISOString().slice(0, 16),
          estimatedDuration: missionData.estimatedDuration, // Keep original value
          actualStartTime: missionData.actualStartTime ? new Date(missionData.actualStartTime).toISOString().slice(0, 16) : null,
          actualEndTime: missionData.actualEndTime ? new Date(missionData.actualEndTime).toISOString().slice(0, 16) : null,
          tasks: missionData.tasks || []
        };

        setMission(processedMission);
        setTeamLeaders(teamLeadersData);
        setTaskTemplates(templatesData);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Erreur lors du chargement des données');
      } finally {
        setIsLoadingData(false);
      }
    };

    if (missionId) {
      loadData();
    }
  }, [missionId]);

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setMission(prev => {
      if (!prev) return prev;
      
      let processedValue: any = value;
      
      // Handle numeric fields
      if (name === 'estimatedDuration') {
        processedValue = parseFloat(value) || 0;
      } else if (name === 'clientRating') {
        processedValue = value ? parseInt(value) : null;
      } else if (type === 'checkbox') {
        processedValue = (e.target as HTMLInputElement).checked;
      }
      
      return { ...prev, [name]: processedValue };
    });
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setMission(prev => {
      if (!prev) return prev;
      
      let processedValue: any = value;
      
      // Handle null values
      if (value === '' || value === 'null') {
        processedValue = null;
      }
      
      return { ...prev, [name]: processedValue };
    });
  };

  // Task management functions
  const addTask = () => {
    setMission(prev => {
      if (!prev) return prev;
      
      const newTask: TaskWithId = {
        title: 'Nouvelle tâche',
        description: '',
        category: 'GENERAL',
        type: 'EXECUTION',
        status: 'ASSIGNED',
        //priority: 'NORMAL',
        estimatedTime: null,
        actualTime: null,
        assignedToId: null,
        notes: null,
      };
      
      return {
        ...prev,
        tasks: [...(prev.tasks || []), newTask]
      };
    });
  };

  const removeTask = (index: number) => {
    setMission(prev => {
      if (!prev || !prev.tasks) return prev;
      
      const newTasks = [...prev.tasks];
      newTasks.splice(index, 1);
      
      return { ...prev, tasks: newTasks };
    });
  };

  const updateTask = (index: number, field: keyof TaskWithId, value: any) => {
    setMission(prev => {
      if (!prev || !prev.tasks) return prev;
      
      const newTasks = [...prev.tasks];
      const taskToUpdate = newTasks[index];
      if (taskToUpdate) {
        newTasks[index] = { ...taskToUpdate, [field]: value };
      }
      
      return { ...prev, tasks: newTasks };
    });
  };

  const moveTask = useCallback((dragIndex: number, hoverIndex: number) => {
    setMission(prev => {
      if (!prev || !prev.tasks) return prev;
      
      const dragTask = prev.tasks[dragIndex];
      if (!dragTask) return prev;
      
      const newTasks = [...prev.tasks];
      newTasks.splice(dragIndex, 1);
      newTasks.splice(hoverIndex, 0, dragTask);
      
      return { ...prev, tasks: newTasks };
    });
  }, []);

  const applyTemplate = (templateId: string) => {
    const template = taskTemplates.find(t => t.id === templateId);
    if (!template || !Array.isArray(template.tasks)) return;

    const newTasks: TaskWithId[] = template.tasks.map((item: any) => ({
      title: item.title || item.name || 'Task',
      description: item.description || '',
      category: item.category || 'GENERAL',
      type: item.type || 'EXECUTION',
      status: 'ASSIGNED',
      priority: item.priority || 'NORMAL',
      estimatedTime: item.estimatedTime || null,
      actualTime: null,
      assignedToId: null,
      notes: null,
    }));

    setMission(prev => prev ? { ...prev, tasks: newTasks } : prev);
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mission) return;

    setIsLoading(true);
    
    try {
      // Prepare data for submission
      const submissionData = {
        ...mission,
        // Send duration in minutes
        estimatedDuration: mission.estimatedDuration,
        // Ensure datetime fields are properly formatted
        scheduledDate: mission.scheduledDate ? new Date(mission.scheduledDate).toISOString() : undefined,
        actualStartTime: mission.actualStartTime ? new Date(mission.actualStartTime).toISOString() : null,
        actualEndTime: mission.actualEndTime ? new Date(mission.actualEndTime).toISOString() : null,
        // Clean up tasks data
        tasks: mission.tasks?.map(task => ({
          title: task.title,
          description: task.description,
          category: task.category,
          type: task.type,
          status: task.status,
          //priority: task.priority,
          estimatedTime: task.estimatedTime,
          actualTime: task.actualTime,
          assignedToId: task.assignedToId,
          notes: task.notes,
        })) || []
      };

      // Remove fields that shouldn't be sent to API
      delete (submissionData as any).lead;
      delete (submissionData as any).teamLeader;
      delete (submissionData as any).team;
      delete (submissionData as any).id;
      delete (submissionData as any).missionNumber;
      delete (submissionData as any).createdAt;
      delete (submissionData as any).updatedAt;

      console.log('Submitting mission data:', submissionData);

      const response = await fetch(`/api/missions/${missionId}`, {
        method: 'PUT', // Use PUT for full update
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
      }

      const updatedMission = await response.json();
      console.log('Mission updated successfully:', updatedMission);

      toast.success('Mission mise à jour avec succès!');
      router.push('/missions');
    } catch (error: any) {
      console.error('Error updating mission:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement de la mission...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Mission non trouvée</h1>
          <p className="text-gray-600 mt-2">La mission demandée n'existe pas ou a été supprimée.</p>
          <Link href="/missions">
            <Button className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux missions
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const teamMembers = mission.team?.members || [];

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/missions">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Modifier la Mission</h1>
              <p className="text-gray-600">{mission.missionNumber}</p>
            </div>
          </div>
          <Badge variant={
            mission.status === 'COMPLETED' ? 'default' :
            mission.status === 'IN_PROGRESS' ? 'secondary' :
            mission.status === 'CANCELLED' ? 'destructive' : 'outline'
          }>
            {mission.status}
          </Badge>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informations Générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Statut</Label>
                  <Select
                    value={mission.status}
                    onValueChange={(value) => handleSelectChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SCHEDULED">Planifiée</SelectItem>
                      <SelectItem value="IN_PROGRESS">En Cours</SelectItem>
                      <SelectItem value="QUALITY_CHECK">Contrôle Qualité</SelectItem>
                      <SelectItem value="CLIENT_VALIDATION">Validation Client</SelectItem>
                      <SelectItem value="COMPLETED">Terminée</SelectItem>
                      <SelectItem value="CANCELLED">Annulée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priorité</Label>
                  <Select
                    value={mission.priority}
                    onValueChange={(value) => handleSelectChange('priority', value)}
                  >
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
                </div>

                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={mission.type}
                    onValueChange={(value) => handleSelectChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SERVICE">Service</SelectItem>
                      <SelectItem value="TECHNICAL_VISIT">Visite Technique</SelectItem>
                      <SelectItem value="DELIVERY">Livraison</SelectItem>
                      <SelectItem value="INTERNAL">Interne</SelectItem>
                      <SelectItem value="RECURRING">Récurrent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="teamLeaderId">Chef d'Équipe</Label>
                  <Select
                    value={mission.teamLeaderId || 'null'}
                    onValueChange={(value) => handleSelectChange('teamLeaderId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un chef d'équipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">Aucun</SelectItem>
                      {teamLeaders.map((leader) => (
                        <SelectItem key={leader.id} value={leader.id}>
                          {leader.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheduledDate">Date et Heure Programmées</Label>
                  <Input
                    id="scheduledDate"
                    name="scheduledDate"
                    type="datetime-local"
                    value={mission.scheduledDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="estimatedDuration">Durée Estimée (minutes)</Label>
                  <Input
                    id="estimatedDuration"
                    name="estimatedDuration"
                    type="number"
                    step="30"
                    min="30"
                    value={mission.estimatedDuration}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Adresse</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={mission.address}
                  onChange={handleChange}
                  rows={2}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="coordinates">Coordonnées GPS</Label>
                  <Input
                    id="coordinates"
                    name="coordinates"
                    value={mission.coordinates || ''}
                    onChange={handleChange}
                    placeholder="Latitude, Longitude"
                  />
                </div>

                <div>
                  <Label htmlFor="accessNotes">Notes d'Accès</Label>
                  <Textarea
                    id="accessNotes"
                    name="accessNotes"
                    value={mission.accessNotes || ''}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Instructions d'accès au site..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informations Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Client</Label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="font-medium">
                      {mission.lead.firstName} {mission.lead.lastName}
                    </p>
                    {mission.lead.company && (
                      <p className="text-sm text-gray-600">{mission.lead.company}</p>
                    )}
                    <p className="text-sm text-gray-600">{mission.lead.phone}</p>
                    {mission.lead.email && (
                      <p className="text-sm text-gray-600">{mission.lead.email}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="clientValidated">Client Validé</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <input
                        type="checkbox"
                        id="clientValidated"
                        name="clientValidated"
                        checked={mission.clientValidated}
                        onChange={handleChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">Mission validée par le client</span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="clientRating">Note Client</Label>
                    <Select
                      value={mission.clientRating?.toString() || 'null'}
                      onValueChange={(value) => handleSelectChange('clientRating', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une note" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">Aucune note</SelectItem>
                        <SelectItem value="1">1 - Très insatisfait</SelectItem>
                        <SelectItem value="2">2 - Insatisfait</SelectItem>
                        <SelectItem value="3">3 - Neutre</SelectItem>
                        <SelectItem value="4">4 - Satisfait</SelectItem>
                        <SelectItem value="5">5 - Très satisfait</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="clientFeedback">Retour Client</Label>
                <Textarea
                  id="clientFeedback"
                  name="clientFeedback"
                  value={mission.clientFeedback || ''}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Commentaires et retour du client..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Time Tracking */}
          <Card>
            <CardHeader>
              <CardTitle>Suivi du Temps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="actualStartTime">Heure de Début Réelle</Label>
                  <Input
                    id="actualStartTime"
                    name="actualStartTime"
                    type="datetime-local"
                    value={mission.actualStartTime || ''}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <Label htmlFor="actualEndTime">Heure de Fin Réelle</Label>
                  <Input
                    id="actualEndTime"
                    name="actualEndTime"
                    type="datetime-local"
                    value={mission.actualEndTime || ''}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tasks Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tâches ({mission.tasks?.length || 0})</CardTitle>
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
                  <Button type="button" variant="outline" onClick={addTask}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {mission.tasks && mission.tasks.length > 0 ? (
                mission.tasks.map((task, index) => (
                  <DraggableTask
                    key={task.id || `task-${index}`}
                    task={task}
                    index={index}
                    moveTask={moveTask}
                    updateTask={updateTask}
                    removeTask={removeTask}
                    teamMembers={teamMembers}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Aucune tâche définie</p>
                  <p className="text-sm">Utilisez le bouton "Ajouter" ou appliquez un modèle</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes Administratives</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="adminNotes">Notes</Label>
                <Textarea
                  id="adminNotes"
                  name="adminNotes"
                  value={mission.adminNotes || ''}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Notes internes, observations, remarques..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <Link href="/missions">
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DndProvider>
  );
}