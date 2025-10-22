// app/(administration)/planning/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mission, Lead, User } from '@prisma/client';
import { PlanningSkeleton } from '@/components/skeletons/PlanningSkeleton';
import { CustomCalendar } from '@/components/planning/CustomCalendar';
import { MissionCard } from '@/components/planning/MissionCard';
import { isSameDay, parseISO } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, TrendingUp, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

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
        const response = await fetch('/api/missions?limit=1000');
        
        if (!response.ok) {
          throw new Error('Impossible de charger les missions.');
        }
        
        const responseData = await response.json();
        console.log('Planning API Response:', responseData);
        
        const missionsData = responseData.missions || responseData.data || [];
        
        console.log('Missions data for planning:', missionsData);
        setAllMissions(missionsData);
        
        if (Array.isArray(missionsData)) {
          const missionsForDay = missionsData.filter((mission: Mission) => {
            try {
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
    if (Array.isArray(allMissions)) {
      const missionsForDay = allMissions.filter(mission => {
        try {
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

  const missionDates = Array.isArray(allMissions) 
    ? allMissions.map(mission => {
        try {
          return typeof mission.scheduledDate === 'string' 
            ? parseISO(mission.scheduledDate) 
            : new Date(mission.scheduledDate);
        } catch (error) {
          console.warn('Error parsing mission date for calendar:', mission.scheduledDate, error);
          return new Date();
        }
      }).filter(date => !isNaN(date.getTime()))
    : [];

  const statsCards = [
    {
      title: 'Total Missions',
      value: allMissions.length.toString(),
      icon: TrendingUp,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-gradient-to-br from-blue-500/10 to-blue-500/5',
      borderColor: 'border-l-blue-500',
    },
    {
      title: 'Terminées',
      value: allMissions.filter(m => m.status === 'COMPLETED').length.toString(),
      icon: CheckCircle2,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-gradient-to-br from-green-500/10 to-green-500/5',
      borderColor: 'border-l-green-500',
    },
    {
      title: 'En Cours',
      value: allMissions.filter(m => m.status === 'IN_PROGRESS').length.toString(),
      icon: Clock,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-gradient-to-br from-purple-500/10 to-purple-500/5',
      borderColor: 'border-l-purple-500',
    },
    {
      title: 'Programmées',
      value: allMissions.filter(m => m.status === 'SCHEDULED').length.toString(),
      icon: AlertCircle,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-gradient-to-br from-orange-500/10 to-orange-500/5',
      borderColor: 'border-l-orange-500',
    },
  ];

  if (isLoading) {
    return <PlanningSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <div className="max-w-[95vw] md:max-w-[1400px] mx-auto">
          <Card className="apple-card border-red-200 dark:border-red-800">
            <CardContent className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <Calendar className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-red-600 mb-2">Erreur de chargement</h3>
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-[95vw] md:max-w-[1400px] mx-auto space-y-4 md:space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Planning des Missions</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Organisez et visualisez les missions de vos équipes
            </p>
          </div>
        </motion.div>

        {allMissions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
          >
            {statsCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                >
                  <Card className={`apple-card hover:shadow-lg transition-all duration-300 border-l-4 ${stat.borderColor}`}>
                    <CardContent className={`p-4 md:p-6 ${stat.bgColor}`}>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                            {stat.title}
                          </p>
                          <p className="text-2xl sm:text-3xl font-bold">
                            {stat.value}
                          </p>
                        </div>
                        <div className={`p-2 sm:p-3 rounded-xl ${stat.bgColor}`}>
                          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="apple-card border-l-4 border-l-primary">
            <CardContent className="p-4 md:p-6">
              <CustomCalendar 
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                missionDates={missionDates}
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="space-y-4"
        >
          <Card className="apple-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Calendar className="w-5 h-5 text-primary" />
                <span>
                  Missions pour le {selectedDate.toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
                {filteredMissions.length > 0 && (
                  <Badge className="ml-2 bg-primary text-primary-foreground rounded-full">
                    {filteredMissions.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                <div className="space-y-3 md:space-y-4">
                  {filteredMissions.length > 0 ? (
                    filteredMissions.map((mission, index) => (
                      <motion.div
                        key={mission.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <MissionCard mission={mission} />
                      </motion.div>
                    ))
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="apple-card">
                        <CardContent className="p-8 md:p-12 text-center">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                            <Calendar className="h-8 w-8 text-primary" />
                          </div>
                          <h4 className="text-base sm:text-lg font-semibold mb-2">Aucune mission planifiée</h4>
                          <p className="text-sm sm:text-base text-muted-foreground">
                            Aucune mission n'est planifiée pour le {selectedDate.toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}.
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                            Sélectionnez une autre date pour voir les missions planifiées.
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}