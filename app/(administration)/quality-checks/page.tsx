// app/(administration)/quality-checks/page.tsx - FIXED VERSION
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
      
      // ✅ FIX: Handle both response formats (direct array or wrapped in qualityChecks property)
      const checksData = Array.isArray(data) ? data : (data.qualityChecks || [])
      
      // ✅ FIX: Ensure checksData is always an array before setting state
      if (!Array.isArray(checksData)) {
        console.error('Invalid data format received:', data)
        toast.error('Format de données invalide')
        setChecks([])
        setFilteredChecks([])
        return
      }
      
      setChecks(checksData)
      setFilteredChecks(checksData)
    } catch (error) {
      console.error('Error fetching quality checks:', error)
      toast.error('Impossible de charger les contrôles qualité')
      // ✅ FIX: Set empty arrays on error to prevent crashes
      setChecks([])
      setFilteredChecks([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchQualityChecks()
  }, [])

  useEffect(() => {
    // ✅ FIX: Ensure checks is an array before filtering
    if (!Array.isArray(checks)) {
      setFilteredChecks([])
      return
    }
    
    let filtered = [...checks]
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(check => check.status === statusFilter)
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(check => check.type === typeFilter)
    }
    
    if (searchQuery) {
      filtered = filtered.filter(check =>
        check.mission?.lead?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        check.mission?.lead?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        check.mission?.missionNumber?.toLowerCase().includes(searchQuery.toLowerCase())
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
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-background text-foreground focus:ring-2 focus:ring-enarva-blue focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="PASSED">Approuvé</option>
              <option value="FAILED">Échoué</option>
              <option value="NEEDS_CORRECTION">Corrections requises</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-background text-foreground focus:ring-2 focus:ring-enarva-blue focus:border-transparent"
            >
              <option value="all">Tous les types</option>
              <option value="TEAM_LEADER_CHECK">Contrôle Chef d'équipe</option>
              <option value="FINAL_INSPECTION">Inspection finale</option>
              <option value="CLIENT_WALKTHROUGH">Visite client</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Quality Checks Table */}
      {filteredChecks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun contrôle qualité</h3>
            <p className="text-muted-foreground">
              {checks.length === 0 
                ? 'Aucun contrôle qualité enregistré.' 
                : 'Aucun contrôle ne correspond à votre recherche.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Mission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {filteredChecks.map((check) => (
                    <tr key={check.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground">
                          {check.mission?.missionNumber || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-foreground">
                          {check.mission?.lead ? 
                            `${check.mission.lead.firstName} ${check.mission.lead.lastName}` : 
                            'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-muted-foreground">
                          {getTypeLabel(check.type)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getStatusVariant(check.status)} className="flex items-center gap-1 w-fit">
                          {getStatusIcon(check.status)}
                          {check.status === 'PASSED' ? 'Approuvé' :
                           check.status === 'FAILED' ? 'Échoué' :
                           check.status === 'NEEDS_CORRECTION' ? 'Corrections' :
                           'En attente'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-foreground">
                          {check.score ? `${check.score}/5` : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(check.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/quality-checks/${check.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Link href={`/quality-checks/${check.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}