// app/(administration)/quality-checks/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Eye, Edit, Plus, Search, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { QualityCheck, Mission, Lead, QualityCheckType, QualityStatus } from '@prisma/client'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'

type QualityCheckWithDetails = QualityCheck & {
  mission: Mission & { lead: Lead };
  score: number | null;
};

export default function QualityChecksPage() {
  const [checks, setChecks] = useState<QualityCheckWithDetails[]>([])
  const [filteredChecks, setFilteredChecks] = useState<QualityCheckWithDetails[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)

  const fetchQualityChecks = async () => {
    try {
      const response = await fetch('/api/quality-checks')
      if (!response.ok) throw new Error('Failed to fetch quality checks')
      const data = await response.json()
      setChecks(data)
      setFilteredChecks(data)
    } catch (error) {
      toast.error('Impossible de charger les contrôles qualité')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchQualityChecks()
  }, [])

  useEffect(() => {
    let filtered = [...checks]
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(check => check.status === statusFilter)
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(check => check.type === typeFilter)
    }
    
    if (searchQuery) {
      filtered = filtered.filter(check =>
        check.mission.lead.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        check.mission.lead.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        check.mission.missionNumber.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    setFilteredChecks(filtered)
  }, [searchQuery, statusFilter, typeFilter, checks])

  const getStatusIcon = (status: QualityStatus) => {
    switch (status) {
      case 'PASSED': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'FAILED': return <XCircle className="w-4 h-4 text-red-600" />
      case 'NEEDS_CORRECTION': return <AlertTriangle className="w-4 h-4 text-orange-600" />
      case 'PENDING': return <Clock className="w-4 h-4 text-gray-600" />
      default: return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusVariant = (status: QualityStatus) => {
    switch (status) {
      case 'PASSED': return 'default'
      case 'FAILED': return 'destructive'
      case 'NEEDS_CORRECTION': return 'secondary'
      case 'PENDING': return 'outline'
      default: return 'outline'
    }
  }

  const getTypeLabel = (type: QualityCheckType) => {
    switch (type) {
      case 'TEAM_LEADER_CHECK': return 'Contrôle Chef d\'équipe'
      case 'FINAL_INSPECTION': return 'Inspection finale'
      case 'CLIENT_WALKTHROUGH': return 'Visite client'
      default: return type
    }
  }

  if (isLoading) return <TableSkeleton title="Chargement des contrôles qualité..." />

  return (
    <div className="main-content space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Contrôles Qualité</h1>
          <p className="text-muted-foreground mt-1">
            Gérez tous les contrôles qualité des missions
          </p>
        </div>
        <Link href="/quality-checks/new">
          <Button className="bg-enarva-gradient rounded-lg">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Contrôle
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="thread-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher par mission, client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="all">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="PASSED">Validé</option>
              <option value="FAILED">Échec</option>
              <option value="NEEDS_CORRECTION">Correction requise</option>
            </select>
            
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="all">Tous les types</option>
              <option value="TEAM_LEADER_CHECK">Contrôle Chef d'équipe</option>
              <option value="FINAL_INSPECTION">Inspection finale</option>
              <option value="CLIENT_WALKTHROUGH">Visite client</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['PENDING', 'PASSED', 'FAILED', 'NEEDS_CORRECTION'].map((status) => (
          <Card key={status} className="thread-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {status === 'PENDING' ? 'En attente' : 
                     status === 'PASSED' ? 'Validés' :
                     status === 'FAILED' ? 'Échecs' : 'Corrections'}
                  </p>
                  <p className="text-2xl font-bold">
                    {checks.filter(check => check.status === status).length}
                  </p>
                </div>
                <div className="p-2">
                  {getStatusIcon(status as QualityStatus)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quality Checks List */}
      <div className="grid gap-4">
        {filteredChecks.length === 0 ? (
          <Card className="thread-card">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' 
                  ? 'Aucun contrôle trouvé' 
                  : 'Aucun contrôle qualité disponible'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredChecks.map((check) => (
            <Card key={check.id} className="thread-card">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">
                        Mission {check.mission.missionNumber}
                      </h3>
                      <Badge variant="outline">
                        {check.mission.lead.firstName} {check.mission.lead.lastName}
                      </Badge>
                      <Badge variant={getStatusVariant(check.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(check.status)}
                          {check.status === 'PENDING' ? 'En attente' :
                           check.status === 'PASSED' ? 'Validé' :
                           check.status === 'FAILED' ? 'Échec' : 'Correction requise'}
                        </div>
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Type:</span> {getTypeLabel(check.type)}
                      </div>
                      <div>
                        <span className="font-medium">Date:</span> {formatDate(check.checkedAt)}
                      </div>
                      <div>
                        <span className="font-medium">Score:</span> 
                        {check.score ? (
                          <span className={`ml-1 font-semibold ${
                            check.score >= 4 ? 'text-green-600' :
                            check.score >= 3 ? 'text-orange-600' : 'text-red-600'
                          }`}>
                            {check.score}/5
                          </span>
                        ) : 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Validé:</span> 
                        {check.validatedAt ? formatDate(check.validatedAt) : 'Non validé'}
                      </div>
                    </div>

                    {check.notes && (
                      <div className="mt-3">
                        <p className="text-sm">
                          <span className="font-medium">Notes:</span>{' '}
                          {check.notes.substring(0, 100)}
                          {check.notes.length > 100 && '...'}
                        </p>
                      </div>
                    )}

                    {/* Issues Preview */}
                    {check.issues && typeof check.issues === 'object' && Object.keys(check.issues).length > 0 && (
                      <div className="mt-2">
                        <Badge variant="destructive" className="text-xs">
                          {Object.keys(check.issues).length} problème(s) détecté(s)
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Link href={`/quality-checks/${check.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href={`/quality-checks/${check.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
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