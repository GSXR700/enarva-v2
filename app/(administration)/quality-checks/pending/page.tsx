// app/(administration)/quality-checks/pending/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Eye, CheckCircle, Clock, Plus, Search } from 'lucide-react'
import { Mission, Lead, User, Task } from '@prisma/client'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'

type MissionForQualityCheck = Mission & {
  lead: Lead;
  teamLeader: User | null;
  tasks: Task[];
  _count: {
    tasks: number;
  };
};

export default function PendingQualityChecksPage() {
  const [missions, setMissions] = useState<MissionForQualityCheck[]>([])
  const [filteredMissions, setFilteredMissions] = useState<MissionForQualityCheck[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const fetchPendingMissions = async () => {
    try {
      const response = await fetch('/api/missions/pending-quality-checks')
      if (!response.ok) throw new Error('Failed to fetch missions')
      const data = await response.json()
      setMissions(data)
      setFilteredMissions(data)
    } catch (error) {
      toast.error('Impossible de charger les missions en attente')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingMissions()
  }, [])

  useEffect(() => {
    if (!searchQuery) {
      setFilteredMissions(missions)
    } else {
      const filtered = missions.filter(mission =>
        mission.missionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mission.lead.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mission.lead.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mission.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredMissions(filtered)
    }
  }, [searchQuery, missions])

  const getTaskCompletionStats = (mission: MissionForQualityCheck) => {
    const total = mission.tasks.length
    const completed = mission.tasks.filter(t => t.status === 'COMPLETED').length
    const validated = mission.tasks.filter(t => t.status === 'VALIDATED').length
    return { total, completed, validated }
  }

  const getCompletionPercentage = (mission: MissionForQualityCheck) => {
    const { total, validated } = getTaskCompletionStats(mission)
    return total > 0 ? Math.round((validated / total) * 100) : 0
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-green-100 text-green-800'
      case 'NORMAL': return 'bg-blue-100 text-blue-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'CRITICAL': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="main-content space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Missions en Attente de Contrôle</h1>
          <p className="text-muted-foreground mt-1">Missions terminées nécessitant un contrôle qualité</p>
        </div>
        <TableSkeleton />
      </div>
    )
  }

  return (
    <div className="main-content space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Missions en Attente de Contrôle</h1>
          <p className="text-muted-foreground mt-1">
            {missions.length} mission{missions.length !== 1 ? 's' : ''} en attente de contrôle qualité
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Rechercher par mission, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Link href="/quality-checks/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Contrôle
            </Button>
          </Link>
        </div>
      </div>

      {filteredMissions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune mission en attente</h3>
            <p className="text-muted-foreground">
              {missions.length === 0 
                ? 'Toutes les missions ont été contrôlées!' 
                : 'Aucune mission ne correspond à votre recherche.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredMissions.map((mission) => {
            const completionStats = getTaskCompletionStats(mission)
            const completionPercentage = getCompletionPercentage(mission)
            
            return (
              <Card key={mission.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold">{mission.missionNumber}</h3>
                        <Badge className={getPriorityColor(mission.priority)}>
                          {mission.priority === 'LOW' ? 'Faible' : 
                           mission.priority === 'NORMAL' ? 'Normal' : 
                           mission.priority === 'HIGH' ? 'Élevé' : 'Critique'}
                        </Badge>
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          <Clock className="w-3 h-3 mr-1" />
                          Contrôle Requis
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Client</p>
                          <p className="font-medium">{mission.lead.firstName} {mission.lead.lastName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Adresse</p>
                          <p className="font-medium text-sm">{mission.address}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Chef d'équipe</p>
                          <p className="font-medium">{mission.teamLeader?.name || 'Non assigné'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Date programmée</p>
                          <p className="font-medium">{formatDate(mission.scheduledDate)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progression des tâches</span>
                            <span>{completionStats.validated}/{completionStats.total} validées</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${completionPercentage}%` }}
                            />
                          </div>
                        </div>
                        
                        {completionPercentage === 100 && (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            <span className="text-sm font-medium">Prêt pour contrôle</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Link href={`/missions/${mission.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          Voir
                        </Button>
                      </Link>
                      <Link href={`/quality-checks/new?missionId=${mission.id}`}>
                        <Button size="sm">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Contrôler
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}