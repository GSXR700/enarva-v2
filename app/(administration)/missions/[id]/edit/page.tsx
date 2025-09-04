// app/(administration)/missions/[id]/edit/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, Users, ListChecks, Plus, Trash2 } from 'lucide-react'
import { Mission, User, TeamMember, Task, TaskCategory } from '@prisma/client'
import { toast } from 'sonner'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'
import { translate } from '@/lib/utils'

type MissionWithDetails = Mission & {
  tasks: Task[];
  teamMembers: TeamMember[];
};

type TaskTemplate = { id: string; name: string; items: Task[] };

export default function EditMissionPage() {
  const router = useRouter();
  const params = useParams();
  const missionId = params.id as string;

  const [mission, setMission] = useState<Partial<MissionWithDetails>>({});
  const [tasks, setTasks] = useState<Partial<Task>[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<User[]>([]);
  const [allTeamMembers, setAllTeamMembers] = useState<TeamMember[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [missionRes, leadersRes, membersRes, templatesRes] = await Promise.all([
        fetch(`/api/missions/${missionId}`),
        fetch('/api/users?role=TEAM_LEADER'),
        fetch('/api/team-members'),
        fetch('/api/task-templates'),
      ]);
      
      if (!missionRes.ok) throw new Error("Mission non trouvée.");

      const missionData = await missionRes.json();
      setMission({
        ...missionData,
        teamLeaderId: missionData.teamLeaderId || '',
        teamMemberIds: missionData.teamMembers.map((tm: TeamMember) => tm.id)
      });
      setTasks(missionData.tasks);
      setTeamLeaders(await leadersRes.json());
      setAllTeamMembers(await membersRes.json());
      setTaskTemplates(await templatesRes.json());

    } catch (error) {
      toast.error("Erreur lors du chargement des données.");
    } finally {
      setIsLoading(false);
    }
  }, [missionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMissionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setMission(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: keyof Mission, value: string) => {
    setMission(prev => ({ ...prev, [id]: value }));
  };
  
  const handleTaskChange = (index: number, field: keyof Task, value: string) => {
    const newTasks = [...tasks];
    // @ts-ignore
    newTasks[index][field] = value;
    setTasks(newTasks);
  };

  const addTask = () => {
    setTasks(prev => [...prev, { title: '', category: 'LIVING_SPACES', status: 'ASSIGNED' }]);
  };

  const removeTask = (index: number) => {
    setTasks(prev => prev.filter((_, i) => i !== index));
  };
  
  const applyTemplate = (templateId: string) => {
    const template = taskTemplates.find(t => t.id === templateId);
    if (template) {
        setTasks(template.items.map(item => ({ title: item.title, category: item.category, status: 'ASSIGNED' })));
        toast.success(`Modèle "${template.name}" appliqué !`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
        const body = {
            ...mission,
            tasks: tasks.map(({id, ...task}) => task), // Send tasks without IDs for recreation
            teamMemberIds: mission.teamMembers?.map(tm => tm.id)
        }
        
        const response = await fetch(`/api/missions/${missionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error("Échec de la mise à jour de la mission.");
        
        toast.success("Mission mise à jour avec succès !");
        router.push('/missions');
        router.refresh();
    } catch (err: any) {
        toast.error(err.message);
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) {
    return <TableSkeleton title="Chargement de la mission..." />;
  }

  return (
    <div className="main-content space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/missions"><Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Modifier la Mission</h1>
          <p className="text-muted-foreground mt-1">{mission.missionNumber}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
            <CardHeader><CardTitle>Informations Générales</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><Label>Date et Heure</Label><Input type="datetime-local" id="scheduledDate" value={mission.scheduledDate ? new Date(mission.scheduledDate).toISOString().substring(0, 16) : ''} onChange={handleMissionChange} /></div>
                <div><Label>Durée Estimée (heures)</Label><Input type="number" id="estimatedDuration" value={mission.estimatedDuration} onChange={handleMissionChange} /></div>
                <div className="md:col-span-2"><Label>Adresse</Label><Input id="address" value={mission.address} onChange={handleMissionChange} /></div>
                <div><Label>Priorité</Label><Select value={mission.priority || ''} onValueChange={(v) => handleSelectChange('priority', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="LOW">Faible</SelectItem><SelectItem value="NORMAL">Normale</SelectItem><SelectItem value="HIGH">Élevée</SelectItem><SelectItem value="CRITICAL">Critique</SelectItem></SelectContent></Select></div>
                <div><Label>Statut</Label><Select value={mission.status || ''} onValueChange={(v) => handleSelectChange('status', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="SCHEDULED">Planifiée</SelectItem><SelectItem value="IN_PROGRESS">En cours</SelectItem><SelectItem value="COMPLETED">Terminée</SelectItem><SelectItem value="CANCELLED">Annulée</SelectItem></SelectContent></Select></div>
                <div className="md:col-span-2"><Label>Notes d'accès</Label><Textarea id="accessNotes" value={mission.accessNotes || ''} onChange={handleMissionChange} /></div>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader><CardTitle>Équipe Assignée</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><Label>Chef d'équipe</Label><Select value={mission.teamLeaderId || ''} onValueChange={(v) => handleSelectChange('teamLeaderId', v)}><SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger><SelectContent>{teamLeaders.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Membres d'équipe</Label>
                    <Select value={mission.teamMembers?.map(tm => tm.id).join(',')} onValueChange={(v) => setMission(prev => ({...prev, teamMembers: v.split(',').map(id => allTeamMembers.find(m => m.id === id)).filter(Boolean) as TeamMember[]}))}>
                         <SelectTrigger><SelectValue placeholder="Ajouter des membres..." /></SelectTrigger>
                         <SelectContent>
                             {allTeamMembers.map(member => (
                                <SelectItem key={member.id} value={member.id}>{member.firstName} {member.lastName}</SelectItem>
                             ))}
                         </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {mission.teamMembers?.map(tm => <Badge key={tm.id}>{tm.firstName}</Badge>)}
                    </div>
                </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Tâches de la Mission</CardTitle>
                <Select onValueChange={applyTemplate}><SelectTrigger className="w-64"><SelectValue placeholder="Appliquer un modèle..." /></SelectTrigger><SelectContent>{taskTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
            </CardHeader>
            <CardContent className="space-y-3">
                 {tasks.map((task, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <Input placeholder="Titre de la tâche" value={task.title || ''} onChange={(e) => handleTaskChange(index, 'title', e.target.value)} required/>
                        <Select value={task.category} onValueChange={(v) => handleTaskChange(index, 'category', v)}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent>{Object.values(TaskCategory).map(cat => <SelectItem key={cat} value={cat}>{translate('TaskCategory', cat)}</SelectItem>)}</SelectContent></Select>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeTask(index)}><Trash2 className="w-4 h-4 text-red-500"/></Button>
                    </div>
                ))}
                <Button type="button" variant="outline" onClick={addTask} className="w-full mt-2"><Plus className="w-4 h-4 mr-2"/>Ajouter une tâche</Button>
            </CardContent>
        </Card>

        <div className="flex justify-end mt-6">
          <Button type="submit" className="bg-enarva-gradient rounded-lg px-8" disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
          </Button>
        </div>
      </form>
    </div>
  )
}