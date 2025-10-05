// components/leads/LeadTimeline.tsx (lowercase 'l' in line)
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  AlertCircle,
  Clock,
  FileText,
  ClipboardList,
  User,
  Phone,
  Mail,
  Calendar,
  Circle
} from 'lucide-react'
import { Lead, Quote, Mission, Activity as ActivityType } from '@prisma/client'
import { formatDate, translate } from '@/lib/utils'
import { cn } from '@/lib/utils'

type LeadWithRelations = Lead & {
  quotes: Quote[]
  missions: Mission[]
  activities: (ActivityType & {
    user: {
      name: string | null
      role: string
    }
  })[]
}

interface TimelineEvent {
  id: string
  type: 'status' | 'activity' | 'quote' | 'mission'
  title: string
  description: string | undefined  // FIXED: Allow undefined
  timestamp: Date
  status?: 'completed' | 'in_progress' | 'pending' | 'cancelled'
  icon: React.ElementType
  metadata?: any
}

export function LeadTimeline({ lead }: { lead: LeadWithRelations }) {
  // Build timeline events from all lead data
  const buildTimelineEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = []

    // Add lead creation
    events.push({
      id: `lead-created-${lead.id}`,
      type: 'status',
      title: 'Lead créé',
      description: `${lead.firstName} ${lead.lastName} a été ajouté au système`,
      timestamp: new Date(lead.createdAt),
      status: 'completed',
      icon: User,
      metadata: { channel: lead.channel }
    })

    // Add activities
    if (lead.activities && lead.activities.length > 0) {
      lead.activities.forEach((activity) => {
        events.push({
          id: activity.id,
          type: 'activity',
          title: activity.title,
          description: activity.description || undefined,  // FIXED: Explicitly set to undefined
          timestamp: new Date(activity.createdAt),
          status: 'completed',
          icon: getActivityIcon(activity.type),
          metadata: { 
            user: activity.user.name,
            activityType: activity.type 
          }
        })
      })
    }

    // Add quotes
    if (lead.quotes && lead.quotes.length > 0) {
      lead.quotes.forEach((quote) => {
        events.push({
          id: quote.id,
          type: 'quote',
          title: `Devis ${quote.quoteNumber}`,
          description: `Statut: ${translate(quote.status)}`,
          timestamp: new Date(quote.createdAt),
          status: getQuoteEventStatus(quote.status),
          icon: FileText,
          metadata: { 
            quoteNumber: quote.quoteNumber,
            status: quote.status,
            finalPrice: quote.finalPrice
          }
        })
      })
    }

    // Add missions
    if (lead.missions && lead.missions.length > 0) {
      lead.missions.forEach((mission) => {
        events.push({
          id: mission.id,
          type: 'mission',
          title: `Mission ${mission.missionNumber}`,
          description: `Planifiée pour le ${formatDate(mission.scheduledDate)}`,
          timestamp: new Date(mission.createdAt),
          status: getMissionEventStatus(mission.status),
          icon: ClipboardList,
          metadata: { 
            missionNumber: mission.missionNumber,
            status: mission.status,
            scheduledDate: mission.scheduledDate
          }
        })
      })
    }

    // Sort by timestamp (most recent first)
    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  const events = buildTimelineEvents()

  return (
    <Card className="thread-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-enarva-start" />
          Chronologie
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />

          {/* Timeline events */}
          <div className="space-y-6">
            {events.map((event) => {
              const Icon = event.icon

              return (
                <div key={event.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div className="relative z-10 flex-shrink-0">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center border-2',
                        event.status === 'completed' && 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:border-green-600 dark:text-green-400',
                        event.status === 'in_progress' && 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-400',
                        event.status === 'pending' && 'bg-gray-100 border-gray-300 text-gray-500 dark:bg-gray-900/30 dark:border-gray-600 dark:text-gray-400',
                        event.status === 'cancelled' && 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/30 dark:border-red-600 dark:text-red-400'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{event.title}</h4>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimeAgo(event.timestamp)}
                      </span>
                    </div>

                    {event.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {event.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(event.timestamp)}
                      </span>
                      {event.metadata?.user && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {event.metadata.user}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Additional metadata badges */}
                    {event.type === 'quote' && event.metadata && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          {translate(event.metadata.status)}
                        </Badge>
                      </div>
                    )}

                    {event.type === 'mission' && event.metadata && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          {translate(event.metadata.status)}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {events.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun événement pour le moment</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Helper functions
function getActivityIcon(type: string) {
  const icons: Record<string, React.ElementType> = {
    CALL: Phone,
    EMAIL: Mail,
    MEETING: Calendar,
    NOTE: FileText,
    TASK: ClipboardList,
    STATUS_CHANGE: AlertCircle,
  }
  return icons[type] || Circle
}

function getQuoteEventStatus(status: string): 'completed' | 'in_progress' | 'pending' | 'cancelled' {
  if (status === 'ACCEPTED') return 'completed'
  if (status === 'REJECTED' || status === 'EXPIRED' || status === 'CANCELLED') return 'cancelled'
  if (status === 'SENT' || status === 'VIEWED') return 'in_progress'
  return 'pending'
}

function getMissionEventStatus(status: string): 'completed' | 'in_progress' | 'pending' | 'cancelled' {
  if (status === 'COMPLETED') return 'completed'
  if (status === 'CANCELLED') return 'cancelled'
  if (status === 'IN_PROGRESS' || status === 'QUALITY_CHECK' || status === 'CLIENT_VALIDATION') return 'in_progress'
  return 'pending'
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'À l\'instant'
  if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)}min`
  if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)}h`
  if (diffInSeconds < 604800) return `Il y a ${Math.floor(diffInSeconds / 86400)}j`
  
  return formatDate(date)
}