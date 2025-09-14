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
import { toast } from 'sonner';

type MissionWithDetails = Mission & {
  lead: Lead;
  teamLeader: User | null;
  teamMembers: { user: User }[];
  tasks?: any[];
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
        setIsLoading(true);
        setError(null);
        const response = await fetch('/api/missions?limit=1000'); // Get all missions for calendar
        
        if (!response.ok) {
          throw new Error('Impossible de charger les missions.');
        }
        
        // FIX: Handle the correct API response structure
        const responseData = await response.json();
        console.log('Planning API Response:', responseData);
        
        // The API returns { missions: [...], total: ..., page: ... }
        const missionsData = responseData.missions || responseData.data || [];
        
        console.log('Missions data for planning:', missionsData);
        setAllMissions(missionsData);
        
        // Filter missions for the selected date
        if (Array.isArray(missionsData)) {
          const missionsForDay = missionsData.filter((mission: Mission) => {
            try {
              // Handle both string and Date formats
              const missionDate = typeof mission.scheduledDate === 'string' 
                ? parseISO(mission.scheduledDate) 
                : new Date(mission.scheduledDate);
              
              return isSameDay(missionDate, selectedDate);
            } catch (error) {
              console.warn('Error parsing mission date:', mission.scheduledDate, error);
              return false;
            }
          });
          setFilteredMissions(missionsForDay);
        }
      } catch (err: any) {
        console.error('Error fetching missions for planning:', err);
        setError(err.message);
        toast.error('Erreur lors du chargement du planning');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMissions();
  }, [selectedDate]);

  useEffect(() => {
    // Filter missions when date changes
    if (Array.isArray(allMissions)) {
      const missionsForDay = allMissions.filter(mission => {
        try {
          // Handle both string and Date formats
          const missionDate = typeof mission.scheduledDate === 'string' 
            ? parseISO(mission.scheduledDate) 
            : new Date(mission.scheduledDate);
          
          return isSameDay(missionDate, selectedDate);
        } catch (error) {
          console.warn('Error parsing mission date:', mission.scheduledDate, error);
          return false;
        }
      });
      setFilteredMissions(missionsForDay);
    }
  }, [selectedDate, allMissions]);

  // Generate mission dates for calendar highlighting
  const missionDates = Array.isArray(allMissions) 
    ? allMissions.map(mission => {
        try {
          return typeof mission.scheduledDate === 'string' 
            ? parseISO(mission.scheduledDate) 
            : new Date(mission.scheduledDate);
        } catch (error) {
          console.warn('Error parsing mission date for calendar:', mission.scheduledDate, error);
          return new Date(); // Fallback to current date
        }
      }).filter(date => !isNaN(date.getTime())) // Filter out invalid dates
    : [];

  if (isLoading) {
    return <PlanningSkeleton />;
  }

  if (error) {
    return (
      <div className="main-content text-center p-10">
        <Calendar className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2 text-red-600">Erreur de chargement</h3>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="main-content flex flex-col h-full bg-secondary md:bg-background">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Planning des Missions</h1>
          <p className="text-muted-foreground mt-1">
            Organisez et visualisez les missions de vos équipes. {allMissions.length} missions au total.
          </p>
        </div>
      </div>
      
      {/* Calendar and Mission List Container */}
      <div className="flex-grow min-h-0 space-y-6">
        {/* Custom Calendar Component */}
        <CustomCalendar 
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          missionDates={missionDates}
        />

        {/* Mission List for Selected Date */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Missions pour le {selectedDate.toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long',
              year: 'numeric'
            })}
            {filteredMissions.length > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                {filteredMissions.length}
              </span>
            )}
          </h3>
          
          <AnimatePresence mode="wait">
            <div className="space-y-4">
              {filteredMissions.length > 0 ? (
                filteredMissions.map(mission => (
                  <MissionCard key={mission.id} mission={mission} />
                ))
              ) : (
                <Card className="thread-card">
                  <CardContent className="p-8 text-center">
                    <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h4 className="text-lg font-medium mb-2">Aucune mission planifiée</h4>
                    <p className="text-muted-foreground">
                      Aucune mission n'est planifiée pour le {selectedDate.toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Sélectionnez une autre date pour voir les missions planifiées.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </AnimatePresence>
        </div>

        {/* Calendar Statistics */}
        {allMissions.length > 0 && (
          <Card className="thread-card">
            <CardContent className="p-4">
              <h4 className="font-medium mb-3">Statistiques du Planning</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{allMissions.length}</p>
                  <p className="text-muted-foreground">Total missions</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {allMissions.filter(m => m.status === 'COMPLETED').length}
                  </p>
                  <p className="text-muted-foreground">Terminées</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {allMissions.filter(m => m.status === 'IN_PROGRESS').length}
                  </p>
                  <p className="text-muted-foreground">En cours</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {allMissions.filter(m => m.status === 'SCHEDULED').length}
                  </p>
                  <p className="text-muted-foreground">Programmées</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}