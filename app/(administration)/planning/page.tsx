// app/(administration)/planning/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import { EventInput } from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import { Button } from '@/components/ui/button'
import {
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Mission, Lead } from '@prisma/client'
import './calendar.css'
import { PlanningSkeleton } from '@/components/skeletons/PlanningSkeleton'

type MissionWithLead = Mission & { lead: Lead };
type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';

export default function PlanningPage() {
  const [view, setView] = useState<CalendarView>('dayGridMonth');
  const [title, setTitle] = useState('');
  const [events, setEvents] = useState<EventInput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const calendarRef = useRef<FullCalendar | null>(null);

  useEffect(() => {
    const fetchMissions = async () => {
      try {
        const response = await fetch('/api/missions');
        if (!response.ok) throw new Error('Impossible de charger les missions.');
        const data: MissionWithLead[] = await response.json();
        const formattedEvents = data.map(mission => ({
          id: mission.id,
          title: `${mission.lead.firstName} ${mission.lead.lastName}`,
          start: new Date(mission.scheduledDate),
          end: new Date(new Date(mission.scheduledDate).getTime() + mission.estimatedDuration * 60 * 60 * 1000),
          extendedProps: mission,
          backgroundColor: '#267df4',
          borderColor: '#2155c9'
        }));
        setEvents(formattedEvents);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMissions();
  }, []);

  useEffect(() => {
    if (!isLoading && calendarRef.current) {
        updateTitle();
    }
  }, [isLoading, view]);

  const updateTitle = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      setTitle(calendarApi.view.title);
    }
  };
  
  const handleToday = () => {
    calendarRef.current?.getApi().today();
    updateTitle();
  };

  const handleViewChange = (newView: CalendarView) => {
    calendarRef.current?.getApi().changeView(newView);
    setView(newView);
  };

  if (isLoading) {
    return <PlanningSkeleton />;
  }

  if (error) {
    return <div className="main-content text-center p-10 text-red-500">{error}</div>;
  }

  return (
    <div className="main-content flex flex-col h-full">
      <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleToday}>Aujourd'hui</Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => calendarRef.current?.getApi().prev()}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => calendarRef.current?.getApi().next()}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">{title}</h2>
        </div>
        <div>
            <Select value={view} onValueChange={(newView: CalendarView) => handleViewChange(newView)}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="dayGridMonth">Mois</SelectItem>
                    <SelectItem value="timeGridWeek">Semaine</SelectItem>
                    <SelectItem value="timeGridDay">Jour</SelectItem>
                    <SelectItem value="listWeek">Liste</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>
      <div className="flex-grow min-h-0">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={view}
          headerToolbar={false}
          events={events}
          height="100%"
          locale="fr"
          buttonText={{ today: "Aujourd'hui", month: 'Mois', week: 'Semaine', day: 'Jour', list: 'Liste' }}
          allDaySlot={false}
          datesSet={updateTitle}
        />
      </div>
    </div>
  );
}