'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Eye, Edit, Trash2, Plus, FileText, Search } from 'lucide-react'
import { FieldReport, Mission, Lead, User } from '@prisma/client'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'

type FieldReportWithDetails = FieldReport & {
  mission: Mission & { lead: Lead };
  submittedBy: User;
};

export default function FieldReportsPage() {
  const [reports, setReports] = useState<FieldReportWithDetails[]>([])
  const [filteredReports, setFilteredReports] = useState<FieldReportWithDetails[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/field-reports')
      if (!response.ok) throw new Error('Failed to fetch field reports')
      const data = await response.json()
      setReports(data)
      setFilteredReports(data)
    } catch (error) {
      toast.error('Impossible de charger les rapports de terrain')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  useEffect(() => {
    if (!searchQuery) {
      setFilteredReports(reports)
    } else {
      const filtered = reports.filter(report =>
        report.mission.lead.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.mission.lead.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.mission.missionNumber.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredReports(filtered)
    }
  }, [searchQuery, reports])

  const handleDelete = async (reportId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce rapport ?')) return

    try {
      const response = await fetch(`/api/field-reports/${reportId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete report')
      
      toast.success('Rapport supprimé avec succès')
      fetchReports()
    } catch (error) {
      toast.error('Impossible de supprimer le rapport')
    }
  }

  if (isLoading) return <TableSkeleton title="Chargement des rapports de terrain..." />

  return (
    <div className="main-content space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Rapports de Terrain</h1>
          <p className="text-muted-foreground mt-1">
            Gérez tous les rapports de mission terrain
          </p>
        </div>
        <Link href="/field-reports/new">
          <Button className="bg-enarva-gradient rounded-lg">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Rapport
          </Button>
        </Link>
      </div>

      <Card className="thread-card">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Rechercher par mission, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredReports.length === 0 ? (
          <Card className="thread-card">
            <CardContent className="pt-6 text-center">
              <FileText className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'Aucun rapport trouvé' : 'Aucun rapport de terrain disponible'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredReports.map((report) => (
            <Card key={report.id} className="thread-card">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">
                        Mission {report.mission.missionNumber}
                      </h3>
                      <Badge variant="outline">
                        {report.mission.lead.firstName} {report.mission.lead.lastName}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Soumis par:</span> {report.submittedBy.name}
                      </div>
                      <div>
                        <span className="font-medium">Date:</span> {formatDate(report.submissionDate)}
                      </div>
                      <div>
                        <span className="font-medium">Heures travaillées:</span> {Number(report.hoursWorked)}h
                      </div>
                    </div>

                    {report.generalObservations && (
                      <div className="mt-3">
                        <p className="text-sm">
                          <span className="font-medium">Observations:</span>{' '}
                          {report.generalObservations.substring(0, 100)}...
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Link href={`/field-reports/${report.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href={`/field-reports/${report.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(report.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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