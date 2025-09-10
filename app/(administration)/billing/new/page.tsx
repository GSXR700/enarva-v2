'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, FilePlus } from 'lucide-react'
import { Mission, Quote, Lead } from '@prisma/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

type MissionForInvoice = Mission & { lead: Lead; quote: Quote };

export default function NewInvoicePage() {
  const router = useRouter()
  const [missions, setMissions] = useState<MissionForInvoice[]>([])
  const [selectedMission, setSelectedMission] = useState<MissionForInvoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCompletedMissions = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/missions?status=COMPLETED')
        if (!response.ok) {
          throw new Error('Failed to fetch missions')
        }
        const responseData = await response.json()
        // Expect response to be { data: MissionForInvoice[], pagination: {...} }
        setMissions(Array.isArray(responseData.data) ? responseData.data : [])
      } catch (err: any) {
        setError(`Erreur lors du chargement des missions : ${err.message}`)
        setMissions([])
        toast.error(`Erreur lors du chargement des missions : ${err.message}`)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCompletedMissions()
  }, [])

  const handleSelectMission = (missionId: string) => {
    const mission = missions.find(m => m.id === missionId)
    setSelectedMission(mission || null)
    setError(null) // Clear error when a mission is selected
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMission) {
      setError('Veuillez sélectionner une mission à facturer.')
      return
    }
    setIsLoading(true)
    try {
      // POST to /api/invoices to create the invoice
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionId: selectedMission.id,
          leadId: selectedMission.leadId,
          amount: Number(selectedMission.quote.finalPrice),
          description: `Facture pour la mission ${selectedMission.missionNumber}`,
        }),
      })
      if (!response.ok) {
        throw new Error('Failed to create invoice')
      }
      toast.success('Facture créée avec succès')
      router.push('/billing')
    } catch (err: any) {
      setError(`Erreur lors de la création de la facture : ${err.message}`)
      toast.error(`Erreur lors de la création de la facture : ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="main-content space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/billing">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Créer une Facture</h1>
          <p className="text-muted-foreground mt-1">Générez une nouvelle facture à partir d'une mission terminée.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Sélection de la Mission</CardTitle>
            <CardDescription>Choisissez la mission terminée que vous souhaitez facturer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <p className="text-muted-foreground">Chargement des missions...</p>
            ) : (
              <div>
                <Label htmlFor="mission">Mission à facturer</Label>
                <Select onValueChange={handleSelectMission} required disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={missions.length === 0 ? 'Aucune mission disponible' : 'Sélectionner une mission...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {missions.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Aucune mission terminée
                      </SelectItem>
                    ) : (
                      missions.map(mission => (
                        <SelectItem key={mission.id} value={mission.id}>
                          {mission.missionNumber} - {mission.lead.firstName} {mission.lead.lastName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedMission && (
              <Card className="bg-secondary/50">
                <CardHeader>
                  <CardTitle className="text-lg">Détails de la Facture</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Client:</span> <strong>{selectedMission.lead.firstName} {selectedMission.lead.lastName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Date de la mission:</span> <strong>{formatDate(selectedMission.scheduledDate)}</strong>
                  </div>
                  <div className="flex justify-between mt-4 pt-4 border-t">
                    <strong className="text-base">Montant Total (HT)</strong>
                    <strong className="text-base text-enarva-start">{formatCurrency(Number(selectedMission.quote.finalPrice))}</strong>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {error && <p className="mt-4 text-red-500 text-sm text-center">{error}</p>}

        <div className="flex justify-end mt-6">
          <Button
            type="submit"
            className="bg-enarva-gradient rounded-lg px-8"
            disabled={isLoading || !selectedMission}
          >
            <FilePlus className="w-4 h-4 mr-2" />
            {isLoading ? 'Génération...' : 'Générer la Facture'}
          </Button>
        </div>
      </form>
    </div>
  )
}