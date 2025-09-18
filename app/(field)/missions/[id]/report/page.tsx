// app/(field)/missions/[id]/report/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEdgeStore } from '@/lib/edgestore';
import { Mission, Lead, Task, TaskStatus, LeadStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, Play, Upload, MapPin, Clock, User, ListChecks } from 'lucide-react';
import Link from 'next/link';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { formatDate, formatTime } from '@/lib/utils';

type TaskWithDetails = Task & {
    assignedTo?: { firstName: string; lastName: string } | null;
};

type MissionWithDetails = Mission & { 
    lead: Lead; 
    tasks: TaskWithDetails[];
};

export default function MissionReportPage() {
    const params = useParams();
    const router = useRouter();
    const missionId = params.id as string;
    const { edgestore } = useEdgeStore();

    const [mission, setMission] = useState<MissionWithDetails | null>(null);
    const [notes, setNotes] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (missionId) {
            fetch(`/api/missions/${missionId}`)
                .then(res => {
                    if (!res.ok) throw new Error('Mission not found');
                    return res.json();
                })
                .then(data => {
                    setMission(data);
                    if (data.technicalVisitReport?.notes) {
                        setNotes(data.technicalVisitReport.notes);
                    }
                })
                .catch(err => {
                    toast.error(err.message);
                    router.push('/dashboard');
                })
                .finally(() => setIsLoading(false));
        }
    }, [missionId, router]);
    
    const updateLeadStatus = async (status: LeadStatus) => {
        if (!mission?.leadId) return;
        try {
            await fetch(`/api/leads/${mission.leadId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
        } catch (error) {
            console.error("Failed to update lead status:", error);
            toast.error("Échec de la mise à jour du statut du lead.");
        }
    };
    
    const handleStatusUpdate = async (status: 'IN_PROGRESS' | 'COMPLETED') => {
        try {
            const response = await fetch(`/api/missions/${missionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (!response.ok) throw new Error('Failed to update status');
            const updatedMission = await response.json();
            setMission(updatedMission);
            toast.success(`Mission marquée comme "${status === 'IN_PROGRESS' ? 'Démarrée' : 'Terminée'}"`);

            if (status === 'IN_PROGRESS') {
                await updateLeadStatus('ON_VISIT');
            }

        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!response.ok) throw new Error('Failed to update task');
            
            setMission(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    tasks: prev.tasks.map(task => 
                        task.id === taskId ? { ...task, status: newStatus } : task
                    )
                };
            });
            
            toast.success('Tâche mise à jour');
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleSubmitReport = async () => {
        if (!notes && files.length === 0) {
            toast.error("Veuillez ajouter des notes ou des photos.");
            return;
        }

        if (mission?.type === 'TECHNICAL_VISIT') {
            const incompleteTasks = mission.tasks.filter(task => 
                task.status !== 'COMPLETED' && task.status !== 'VALIDATED'
            );
            if (incompleteTasks.length > 0) {
                toast.error(`${incompleteTasks.length} tâche(s) non terminée(s). Veuillez compléter toutes les tâches avant de soumettre le rapport.`);
                return;
            }
        }

        setIsSubmitting(true);

        try {
            let uploadedUrls: string[] = [];
            if (files.length > 0) {
                const uploadPromises = files.map(file => 
                    edgestore.publicFiles.upload({ file })
                );
                const results = await Promise.all(uploadPromises);
                uploadedUrls = results.map(res => res.url);
            }
            
            const reportData = {
                technicalVisitReport: {
                    notes,
                    photos: uploadedUrls,
                    submittedAt: new Date().toISOString()
                }
            };
            
            const response = await fetch(`/api/missions/${missionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportData),
            });
            if (!response.ok) throw new Error("Échec de la soumission du rapport.");

            await handleStatusUpdate('COMPLETED');
            await updateLeadStatus('VISIT_DONE');
            toast.success("Rapport de visite soumis avec succès !");
            router.push('/dashboard');

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getTaskStatusColor = (status: TaskStatus) => {
        switch (status) {
            case 'ASSIGNED': return 'bg-gray-100 text-gray-800';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
            case 'COMPLETED': return 'bg-green-100 text-green-800';
            case 'VALIDATED': return 'bg-green-600 text-white';
            case 'REJECTED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getTaskProgress = () => {
        if (!mission || !mission.tasks || mission.tasks.length === 0) return 0;
        const completedTasks = mission.tasks.filter(t => 
            t.status === 'COMPLETED' || t.status === 'VALIDATED'
        ).length;
        return Math.round((completedTasks / mission.tasks.length) * 100);
    };

    if (isLoading || !mission || !mission.lead) {
        return <TableSkeleton title="Chargement de la Mission..." />;
    }

    const isVisit = mission.type === 'TECHNICAL_VISIT';
    const progress = getTaskProgress();

    return (
        <div className="main-content space-y-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
                Retour à mes missions
            </Link>

            <Card className="thread-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {isVisit ? <ListChecks className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                        {isVisit ? 'Rapport de Visite Technique' : 'Détails de la Mission'}
                    </CardTitle>
                    <p className="text-muted-foreground">{mission.lead.firstName} {mission.lead.lastName}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-secondary rounded-lg space-y-2 text-sm">
                        <div className="flex items-center gap-3"><User className="w-4 h-4 text-muted-foreground"/><span>{mission.lead.phone}</span></div>
                        <div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-muted-foreground"/><span>{mission.address}</span></div>
                        <div className="flex items-center gap-3"><Clock className="w-4 h-4 text-muted-foreground"/><span>{formatDate(mission.scheduledDate)} à {formatTime(mission.scheduledDate)}</span></div>
                    </div>

                    <div className="flex gap-2">
                         <Button onClick={() => handleStatusUpdate('IN_PROGRESS')} className="flex-1 gap-2" disabled={mission.status === 'IN_PROGRESS' || mission.status === 'COMPLETED'}><Play /> Démarrer</Button>
                         <Button onClick={() => handleStatusUpdate('COMPLETED')} variant="outline" className="flex-1 gap-2" disabled={mission.status === 'COMPLETED'}><CheckCircle /> Terminer</Button>
                    </div>
                </CardContent>
            </Card>

            {isVisit && mission.tasks.length > 0 && (
                <Card className="thread-card">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <ListChecks className="w-5 h-5" />
                                Checklist des Tâches
                            </CardTitle>
                            <div className="text-sm text-muted-foreground">
                                {progress}% terminé
                            </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                            <div className="bg-enarva-start h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {mission.tasks.map((task) => (
                            <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <Checkbox 
                                        checked={task.status === 'COMPLETED' || task.status === 'VALIDATED'}
                                        onCheckedChange={(checked) => {
                                            handleTaskStatusChange(
                                                task.id, 
                                                checked ? 'COMPLETED' : 'ASSIGNED'
                                            );
                                        }}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-sm font-medium ${task.status === 'COMPLETED' || task.status === 'VALIDATED' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                            {task.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{task.category.replace(/_/g, ' ')}</p>
                                    </div>
                                </div>
                                <Badge className={`text-xs ${getTaskStatusColor(task.status)}`}>
                                    {task.status}
                                </Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {isVisit && (
                 <Card className="thread-card">
                    <CardHeader>
                        <CardTitle className="text-base">Compte-Rendu de Visite</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <Label htmlFor="notes">Remarques et observations</Label>
                            <Textarea 
                                id="notes" 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Détaillez ici les matériaux, les mesures, les difficultés d'accès, l'état des surfaces, etc."
                                rows={8}
                            />
                        </div>

                        <div>
                            <Label htmlFor="photos">Photos du site</Label>
                            <Input 
                                id="photos" 
                                type="file" 
                                multiple 
                                accept="image/*"
                                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                                className="h-auto"
                            />
                            {files.length > 0 && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    {files.length} fichier(s) sélectionné(s)
                                </p>
                            )}
                        </div>
                        
                        <Button 
                            onClick={handleSubmitReport} 
                            disabled={isSubmitting || (mission.tasks.length > 0 && progress < 100)} 
                            className="w-full bg-enarva-gradient"
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            {isSubmitting ? 'Envoi en cours...' : 'Soumettre le Rapport'}
                        </Button>
                        
                        {mission.tasks.length > 0 && progress < 100 && (
                            <p className="text-sm text-orange-600 text-center">
                                Complétez toutes les tâches avant de soumettre le rapport
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
