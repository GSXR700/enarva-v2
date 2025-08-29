// app/(field)/missions/[id]/report/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEdgeStore } from '@/lib/edgestore';
import { Mission, Lead } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Camera, CheckCircle, Play, Upload, MapPin, Clock, User } from 'lucide-react';
import Link from 'next/link';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { formatDate, formatTime } from '@/lib/utils';

type MissionWithLead = Mission & { lead: Lead };

export default function MissionReportPage() {
    const params = useParams();
    const router = useRouter();
    const missionId = params.id as string;
    const { edgestore } = useEdgeStore();

    const [mission, setMission] = useState<MissionWithLead | null>(null);
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
                    // Pre-fill notes if a report already exists
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
    
    const handleStatusUpdate = async (status: 'IN_PROGRESS' | 'COMPLETED') => {
        try {
            const response = await fetch(`/api/missions/${missionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (!response.ok) throw new Error('Failed to update status');
            const updatedMission = await response.json();
            setMission(updatedMission); // Update local state with new status
            toast.success(`Mission marquée comme "${status === 'IN_PROGRESS' ? 'Démarrée' : 'Terminée'}"`);
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleSubmitReport = async () => {
        if (!notes && files.length === 0) {
            toast.error("Veuillez ajouter des notes ou des photos.");
            return;
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

            toast.success("Rapport de visite soumis avec succès !");
            await handleStatusUpdate('COMPLETED');
            router.push('/dashboard');

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading || !mission) {
        return <TableSkeleton title="Chargement de la Mission..." />;
    }

    const isVisit = mission.type === 'TECHNICAL_VISIT';

    return (
        <div className="main-content space-y-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
                Retour à mes missions
            </Link>

            <Card className="thread-card">
                <CardHeader>
                    <CardTitle>{isVisit ? 'Rapport de Visite Technique' : 'Détails de la Mission'}</CardTitle>
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

            {isVisit && (
                 <Card className="thread-card">
                    <CardHeader>
                        <CardTitle className="text-base">Compte-Rendu</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <Label htmlFor="notes">Remarques et observations</Label>
                            <Textarea 
                                id="notes" 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Détaillez ici les matériaux, les mesures, les difficultés d'accès, etc."
                                rows={6}
                            />
                        </div>

                        <div>
                            <Label htmlFor="photos">Photos du site</Label>
                            <Input 
                                id="photos" 
                                type="file" 
                                multiple 
                                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                                className="h-auto"
                            />
                        </div>
                        
                        <Button onClick={handleSubmitReport} disabled={isSubmitting} className="w-full bg-enarva-gradient">
                            <Upload className="w-4 h-4 mr-2" />
                            {isSubmitting ? 'Envoi en cours...' : 'Soumettre le Rapport'}
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
