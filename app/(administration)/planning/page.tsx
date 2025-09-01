'use client'

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Mission, Lead, User } from '@prisma/client';
import { PlanningSkeleton } from '@/components/skeletons/PlanningSkeleton';
import { CustomCalendar } from '@/components/planning/CustomCalendar';
import { MissionCard } from '@/components/planning/MissionCard';
import { isSameDay, parseISO } from 'date-fns';
import { AnimatePresence } from 'framer-motion';
import { Calendar } from 'lucide-react';

type MissionWithDetails = Mission & {
  lead: Lead;
  teamLeader: User | null;
  teamMembers: { user: User }[];
};

export default function PlanningPage() {
  const [allMissions, setAllMissions] = useState<MissionWithDetails[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filteredMissions, setFilteredMissions] = useState<MissionWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMissions = async () => {
      try {
        const response = await fetch('/api/missions');
        if (!response.ok) throw new Error('Impossible de charger les missions.');
        const data: MissionWithDetails[] = await response.json();
        setAllMissions(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMissions();
  }, []);

  useEffect(() => {
    const missionsForDay = allMissions.filter(mission =>
      isSameDay(parseISO(mission.scheduledDate as unknown as string), selectedDate)
    );
    setFilteredMissions(missionsForDay);
  }, [selectedDate, allMissions]);

  const missionDates = allMissions.map(m => parseISO(m.scheduledDate as unknown as string));

  if (isLoading) {
    return <PlanningSkeleton />;
  }

  if (error) {
    return <div className="main-content text-center p-10 text-red-500">{error}</div>;
  }

  return (
    <div className="main-content flex flex-col h-full bg-secondary md:bg-background">
      <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Planning des Tâches</h1>
          <p className="text-muted-foreground mt-1">Organisez et visualisez les missions de vos équipes.</p>
        </div>
      </div>
      
      <div className="flex-grow min-h-0">
        <CustomCalendar 
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          missionDates={missionDates}
        />

        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-4">
            Missions pour le {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          <AnimatePresence>
            <div className="space-y-4">
              {filteredMissions.length > 0 ? (
                filteredMissions.map(mission => <MissionCard key={mission.id} mission={mission} />)
              ) : (
                <Card className="thread-card">
                  <CardContent className="p-8 text-center">
                    <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-muted-foreground">Aucune mission planifiée pour cette date.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}