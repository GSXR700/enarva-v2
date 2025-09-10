// app/(administration)/activities/page.tsx - Activities Management Page
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { Activity, User, Lead, ActivityType } from '@prisma/client'
import { formatDate, formatTime } from '@/lib/utils'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'

type ActivityWithDetails = Activity & {
  user: User;
  lead?: Lead;
};

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<ActivityWithDetails[]>([])
  const [filteredActivities, setFilteredActivities] = useState<ActivityWithDetails[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch('/api/activities')
        if (!response.ok) throw new Error('Failed to fetch activities')
        const data = await response.json()
        setActivities(data)
        setFilteredActivities(data)
      } catch (error) {
        console.error('Error fetching activities:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchActivities()
  }, [])

  useEffect(() => {
    let filtered = [...activities]
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(activity => activity.type === typeFilter)
    }
    
    if (searchQuery) {
      filtered = filtered.filter(activity =>
        activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.user.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    setFilteredActivities(filtered)
  }, [searchQuery, typeFilter, activities])

  const getActivityIcon = (type: ActivityType) => {
    // Return appropriate icon based on activity type
    return '📋' // Default icon
  }

  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case 'LEAD_CREATED': return 'bg-blue-100 text-blue-800'
      case 'MISSION_COMPLETED': return 'bg-green-100 text-green-800'
      case 'PAYMENT_RECEIVED': return 'bg-emerald-100 text-emerald-800'
      case 'QUALITY_ISSUE': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) return <TableSkeleton title="Chargement des activités..." />

  return (
    <div className="main-content space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Journal d'Activités</h1>
          <p className="text-muted-foreground mt-1">
            Consultez toutes les activités du système
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="thread-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher dans les activités..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="all">Tous les types</option>
              <option value="LEAD_CREATED">Lead créé</option>
              <option value="MISSION_COMPLETED">Mission terminée</option>
              <option value="PAYMENT_RECEIVED">Paiement reçu</option>
              <option value="QUALITY_ISSUE">Problème qualité</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Activities Timeline */}
      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <Card className="thread-card">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">
                {searchQuery || typeFilter !== 'all' 
                  ? 'Aucune activité trouvée' 
                  : 'Aucune activité disponible'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredActivities.map((activity) => (
            <Card key={activity.id} className="thread-card">
              <CardContent className="pt-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm">{activity.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {activity.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {activity.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Par: {activity.user.name}</span>
                      <span>•</span>
                      <span>{formatDate(activity.createdAt)} à {formatTime(activity.createdAt)}</span>
                      {activity.lead && (
                        <>
                          <span>•</span>
                          <span>Client: {activity.lead.firstName} {activity.lead.lastName}</span>
                        </>
                      )}
                    </div>
                    
                    {activity.metadata && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          Détails supplémentaires
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                          {JSON.stringify(activity.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {formatTime(activity.createdAt)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}