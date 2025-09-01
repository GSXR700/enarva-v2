'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  startOfMonth,
  isToday,
  isSameDay,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
} from 'date-fns';
import { fr } from 'date-fns/locale';

interface CustomCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  missionDates: Date[];
}

export function CustomCalendar({ selectedDate, onDateSelect, missionDates }: CustomCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const firstDayOfMonth = startOfMonth(currentMonth);
  const lastDayOfMonth = endOfMonth(currentMonth);

  const daysInMonth = eachDayOfInterval({
    start: startOfWeek(firstDayOfMonth, { locale: fr }),
    end: endOfWeek(lastDayOfMonth, { locale: fr }),
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div className="p-4 rounded-3xl bg-card border border-border">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="w-5 h-5" /></Button>
        <h2 className="font-semibold text-lg capitalize">{format(currentMonth, 'MMMM yyyy', { locale: fr })}</h2>
        <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="w-5 h-5" /></Button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-sm text-muted-foreground">
        {['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map(day => <div key={day}>{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-2 mt-2">
        {daysInMonth.map((day) => {
          const hasMission = missionDates.some(missionDate => isSameDay(day, missionDate));
          return (
            <button
              key={day.toString()}
              onClick={() => onDateSelect(day)}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center relative transition-colors",
                format(currentMonth, 'M') !== format(day, 'M') && 'text-muted-foreground/50',
                isToday(day) && 'bg-primary/20 text-primary-foreground',
                isSameDay(day, selectedDate) && 'bg-enarva-start text-white',
                !isSameDay(day, selectedDate) && 'hover:bg-secondary'
              )}
            >
              {format(day, 'd')}
              {hasMission && <div className="absolute bottom-1 w-1 h-1 bg-enarva-start rounded-full"></div>}
            </button>
          )
        })}
      </div>
    </div>
  );
}
