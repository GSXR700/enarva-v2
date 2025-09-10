//app/(administration)/missions/[id]/edit/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Save, Users, ListChecks, Plus, Trash2 } from 'lucide-react'
import { Mission, User, TeamMember, Task, TaskCategory } from '@prisma/client'
import { toast } from 'sonner'

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
     console.error(error);
   } finally {
     setIsLoading(false);
   }
 }, [missionId]);

 useEffect(() => {
   fetchData();
 }, [fetchData]);

 const handleInputChange = (field: keyof Mission, value: any) => {
   setMission(prev => ({ ...prev, [field]: value }));
 };

 const handleTaskChange = (index: number, field: keyof Task, value: any) => {
   setTasks(prev => 
     prev.map((task, i) => 
       i === index ? { ...task, [field]: value } : task
     )
   );
 };

 const addTask = () => {
   setTasks(prev => [...prev, {
     title: '',
     category: 'EXTERIOR_FACADE' as TaskCategory,
     status: 'ASSIGNED' as const,
     missionId,
     clientApproved: false,
     clientFeedback: '',
     beforePhotos: [],
     afterPhotos: [],
     teamLeaderValidated: false,
   }]);
 };

 const removeTask = (index: number) => {
   setTasks(prev => prev.filter((_, i) => i !== index));
 };

 const applyTaskTemplate = (templateId: string) => {
   const template = taskTemplates.find(t => t.id === templateId);
   if (template) {
     setTasks(prev => [...prev, ...template.items.map(item => ({ ...item, missionId }))]);
   }
 };

 const handleSubmit = async (e: React.FormEvent) => {
   e.preventDefault();
   setIsSaving(true);

   try {
     const submissionData = {
       ...mission,
       tasks: tasks.filter(task => task.title?.trim()),
     };

     const response = await fetch(`/api/missions/${missionId}`, {
       method: 'PATCH',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(submissionData),
     });

     if (!response.ok) throw new Error('Échec de la mise à jour');
     
     toast.success("Mission mise à jour avec succès !");
     router.push('/missions');
   } catch (error) {
     toast.error("Erreur lors de la mise à jour.");
     console.error(error);
   } finally {
     setIsSaving(false);
   }
 };

 if (isLoading) {
   return (
     <div className="main-content space-y-6">
       <div className="text-center py-10">
         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
         <p className="mt-4 text-muted-foreground">Chargement de la mission...</p>
       </div>
     </div>
   );
 }

 return (
   <div className="main-content space-y-6">
     <div className="flex items-center gap-4">
       <Link href="/missions">
         <Button variant="outline" size="icon">
           <ArrowLeft className="w-4 h-4" />
         </Button>
       </Link>
       <div>
         <h1 className="text-2xl font-bold">Modifier Mission</h1>
         <p className="text-muted-foreground">Mission #{mission.missionNumber}</p>
       </div>
     </div>

     <form onSubmit={handleSubmit} className="space-y-6">
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Users className="w-5 h-5" />
             Détails de la Mission
           </CardTitle>
         </CardHeader>
         <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div>
             <Label htmlFor="missionNumber">Numéro de mission</Label>
             <Input
               id="missionNumber"
               value={mission.missionNumber || ''}
               onChange={(e) => handleInputChange('missionNumber', e.target.value)}
               required
             />
           </div>
           <div>
             <Label htmlFor="status">Statut</Label>
             <Select value={mission.status || ''} onValueChange={(v) => handleInputChange('status', v)}>
               <SelectTrigger>
                 <SelectValue placeholder="Sélectionner un statut" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="SCHEDULED">Planifiée</SelectItem>
                 <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                 <SelectItem value="QUALITY_CHECK">Contrôle Qualité</SelectItem>
                 <SelectItem value="CLIENT_VALIDATION">Validation Client</SelectItem>
                 <SelectItem value="COMPLETED">Terminée</SelectItem>
                 <SelectItem value="CANCELLED">Annulée</SelectItem>
               </SelectContent>
             </Select>
           </div>
           <div>
             <Label htmlFor="scheduledDate">Date prévue</Label>
             <Input
               id="scheduledDate"
               type="datetime-local"
               value={mission.scheduledDate ? new Date(mission.scheduledDate).toISOString().slice(0, 16) : ''}
               onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
             />
           </div>
           <div>
             <Label htmlFor="teamLeaderId">Chef d'équipe</Label>
             <Select value={mission.teamLeaderId || ''} onValueChange={(v) => handleInputChange('teamLeaderId', v)}>
               <SelectTrigger>
                 <SelectValue placeholder="Sélectionner un chef d'équipe" />
               </SelectTrigger>
               <SelectContent>
                 {teamLeaders.map(leader => (
                   <SelectItem key={leader.id} value={leader.id}>
                     {leader.name}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>

           {/* Admin Fields */}
           <div className="md:col-span-2 border-t pt-4">
             <h3 className="text-sm font-medium text-muted-foreground mb-3">Validation Administrative</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <Label htmlFor="qualityScore">Score Qualité (/5)</Label>
                 <Input
                   id="qualityScore"
                   type="number"
                   min="1"
                   max="5"
                   value={mission.qualityScore || ''}
                   onChange={(e) => handleInputChange('qualityScore', parseInt(e.target.value))}
                   placeholder="1-5"
                 />
               </div>
               <div>
                 <Label htmlFor="adminNotes">Notes Admin</Label>
                 <Textarea
                   id="adminNotes"
                   value={mission.adminNotes || ''}
                   onChange={(e) => handleInputChange('adminNotes', e.target.value)}
                   placeholder="Notes de validation..."
                   rows={2}
                 />
               </div>
               <div className="md:col-span-2">
                 <Label htmlFor="issuesFound">Problèmes identifiés</Label>
                 <Textarea
                   id="issuesFound"
                   value={mission.issuesFound || ''}
                   onChange={(e) => handleInputChange('issuesFound', e.target.value)}
                   placeholder="Description des problèmes..."
                   rows={2}
                 />
               </div>
             </div>
           </div>
         </CardContent>
       </Card>

       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <ListChecks className="w-5 h-5" />
             Tâches
           </CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
           {taskTemplates.length > 0 && (
             <div className="flex gap-2 flex-wrap">
               <span className="text-sm font-medium">Modèles :</span>
               {taskTemplates.map(template => (
                 <Button
                   key={template.id}
                   type="button"
                   variant="outline"
                   size="sm"
                   onClick={() => applyTaskTemplate(template.id)}
                 >
                   {template.name}
                 </Button>
               ))}
             </div>
           )}

           {tasks.map((task, index) => (
             <Card key={index} className="p-4">
               <div className="space-y-4">
                 <div className="flex items-center gap-2">
                   <Input
                     placeholder="Titre de la tâche"
                     value={task.title || ''}
                     onChange={(e) => handleTaskChange(index, 'title', e.target.value)}
                     required
                   />
                   <Select value={task.category || ''} onValueChange={(v) => handleTaskChange(index, 'category', v)}>
                     <SelectTrigger className="w-56">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       {Object.values(TaskCategory).map(cat => (
                         <SelectItem key={cat} value={cat}>
                           {translate(cat)}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                   <Button type="button" variant="ghost" size="icon" onClick={() => removeTask(index)}>
                     <Trash2 className="w-4 h-4 text-red-500" />
                   </Button>
                 </div>

                 <div>
                   <Label htmlFor={`description-${index}`}>Description</Label>
                   <Textarea
                     id={`description-${index}`}
                     value={task.description || ''}
                     onChange={(e) => handleTaskChange(index, 'description', e.target.value)}
                     rows={2}
                   />
                 </div>

                 {/* Client Validation Fields */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                   <div className="flex items-center space-x-2">
                     <Checkbox
                       id={`clientApproved-${index}`}
                       checked={task.clientApproved || false}
                       onCheckedChange={(checked) => handleTaskChange(index, 'clientApproved', !!checked)}
                     />
                     <Label htmlFor={`clientApproved-${index}`} className="text-sm">
                       Approuvé par le client
                     </Label>
                   </div>
                   
                   <div className="flex items-center space-x-2">
                     <Checkbox
                       id={`teamLeaderValidated-${index}`}
                       checked={task.teamLeaderValidated || false}
                       onCheckedChange={(checked) => handleTaskChange(index, 'teamLeaderValidated', !!checked)}
                     />
                     <Label htmlFor={`teamLeaderValidated-${index}`} className="text-sm">
                       Validé chef d'équipe
                     </Label>
                   </div>
                 </div>

                 <div className="mt-4">
                   <Label htmlFor={`clientFeedback-${index}`} className="text-sm">
                     Feedback client
                   </Label>
                   <Textarea
                     id={`clientFeedback-${index}`}
                     value={task.clientFeedback || ''}
                     onChange={(e) => handleTaskChange(index, 'clientFeedback', e.target.value)}
                     placeholder="Commentaires du client..."
                     rows={2}
                     className="mt-1"
                   />
                 </div>

                 <div className="grid grid-cols-2 gap-4 mt-4">
                   <div>
                     <Label className="text-sm">Photos avant</Label>
                     <Input
                       type="file"
                       multiple
                       accept="image/*"
                       onChange={(e) => {
                         const files = Array.from(e.target.files || []);
                         handleTaskChange(index, 'beforePhotos', files.map(f => f.name));
                       }}
                       className="mt-1"
                     />
                     {task.beforePhotos && task.beforePhotos.length > 0 && (
                       <div className="text-xs text-muted-foreground mt-1">
                         {task.beforePhotos.length} photo(s) avant
                       </div>
                     )}
                   </div>
                   
                   <div>
                     <Label className="text-sm">Photos après</Label>
                     <Input
                       type="file"
                       multiple
                       accept="image/*"
                       onChange={(e) => {
                         const files = Array.from(e.target.files || []);
                         handleTaskChange(index, 'afterPhotos', files.map(f => f.name));
                       }}
                       className="mt-1"
                     />
                     {task.afterPhotos && task.afterPhotos.length > 0 && (
                       <div className="text-xs text-muted-foreground mt-1">
                         {task.afterPhotos.length} photo(s) après
                       </div>
                     )}
                   </div>
                 </div>
               </div>
             </Card>
           ))}

           <Button type="button" variant="outline" onClick={addTask}>
             <Plus className="w-4 h-4 mr-2" />
             Ajouter une tâche
           </Button>
         </CardContent>
       </Card>

       <div className="flex gap-4">
         <Button type="submit" disabled={isSaving}>
           {isSaving ? "Sauvegarde..." : "Sauvegarder"}
           <Save className="w-4 h-4 ml-2" />
         </Button>
         <Link href="/missions">
           <Button type="button" variant="outline">
             Annuler
           </Button>
         </Link>
       </div>
     </form>
   </div>
 );
}