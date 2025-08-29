// app/(field)/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Mission, Lead, User } from '@prisma/client';
import { formatDate, formatTime } from '@/lib/utils';
import { MapPin, Clock, ListChecks, Wrench, AlertTriangle } from 'lucide-react';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { Badge } from '@/components/ui/badge';
import Pusher from 'pusher-js';
import { toast } from 'sonner';

type MissionWithLead = Mission & { lead: Lead };

export default function FieldDashboardPage() {
    const { data: session } = useSession();
    const [myMissions, setMyMissions] = useState<MissionWithLead[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchMissions = async () => {
            if (session?.user?.id) {
                try {
                    const response = await fetch('/api/missions');
                    if (!response.ok) throw new Error("Failed to fetch missions");
                    const allMissions: MissionWithLead[] = await response.json();
                    
                    // Filter missions where the user is the team leader and status is not COMPLETED
                    const assignedMissions = allMissions.filter(
                        mission => mission.teamLeaderId === session.user.id && mission.status !== 'COMPLETED'
                    );
                    
                    setMyMissions(assignedMissions);
                } catch (error) {
                    console.error("Failed to fetch missions", error);
                    toast.error("Impossible de charger les missions.");
                } finally {
                    setIsLoading(false);
                }
            }
        };

        if (session) {
            fetchMissions();
        }
    }, [session]);

    // useEffect for real-time updates with Pusher
    useEffect(() => {
        if (!session?.user?.id) return;

        const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        });

        const channelName = `user-${session.user.id}`;
        const channel = pusher.subscribe(channelName);

        channel.bind('mission-new', (newMission: MissionWithLead) => {
            toast.success(`Nouvelle mission assignée : ${newMission.missionNumber}`);
            setMyMissions(prevMissions => [newMission, ...prevMissions]);
        });

        // Cleanup on component unmount
        return () => {
            pusher.unsubscribe(channelName);
            pusher.disconnect();
        };
    }, [session?.user?.id]);

    const getMissionIcon = (type: string) => {
        switch(type) {
            case 'TECHNICAL_VISIT': return <ListChecks className="w-5 h-5 text-blue-500" />;
            default: return <Wrench className="w-5 h-5 text-green-500" />;
        }
    }
    
    const getPriorityColor = (priority: string) => {
        if (priority === 'HIGH' || priority === 'CRITICAL') return 'border-red-500/50 bg-red-500/10';
        return 'border-border';
    }

    if (isLoading) {
        return <TableSkeleton title="Mes Missions" />;
    }

    return (
        <div className="main-content space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">Mes Missions</h1>
                <p className="text-sm text-muted-foreground">{myMissions.length} en cours</p>
            </div>

            {myMissions.length > 0 ? (
                myMissions.map(mission => (
                    <Link href={`/missions/${mission.id}/report`} key={mission.id}>
                        <Card className={`thread-card hover:shadow-lg transition-all ${getPriorityColor(mission.priority)}`}>
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 bg-background rounded-lg">
                                    {getMissionIcon(mission.type)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-foreground">
                                            {mission.type === 'TECHNICAL_VISIT' ? 'Visite Technique' : 'Mission de Service'}
                                        </p>
                                        {(mission.priority === 'HIGH' || mission.priority === 'CRITICAL') && (
                                            <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1"/>Prioritaire</Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{mission.lead.firstName} {mission.lead.lastName}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <MapPin className="w-3 h-3"/> {mission.address}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium">{formatDate(mission.scheduledDate)}</p>
                                    <p className="text-xs text-muted-foreground">{formatTime(mission.scheduledDate)}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))
            ) : (
                <Card className="thread-card">
                    <CardContent className="p-8 text-center">
                         <p className="text-muted-foreground">Aucune mission ne vous est assignée pour le moment.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}