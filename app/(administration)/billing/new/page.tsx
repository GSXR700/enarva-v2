// app/(administration)/billing/new/page.tsx - FIXED with quote fetch
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

type MissionForInvoice = Mission & { lead: Lead; quote: Quote | null };

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
        const response = await fetch('/api/missions?status=COMPLETED&includeQuote=true')
        if (!response.ok) throw new Error('Failed to fetch missions')
        
        const responseData = await response.json()
        const missionsData = Array.isArray(responseData) ? responseData : (responseData.data || [])
        
        const unbilledMissions = missionsData.filter((m: MissionForInvoice) => !m.invoiceGenerated && m.quote)
        setMissions(unbilledMissions)
      } catch (err: any) {
        setError(`Erreur: ${err.message}`)
        toast.error(`Erreur: ${err.message}`)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCompletedMissions()
  }, [])

  const handleSelectMission = (missionId: string) => {
    const mission = missions.find(m => m.id === missionId)
    setSelectedMission(mission || null)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMission || !selectedMission.quote) {
      setError('Sélectionnez une mission avec devis.')
      return
    }
    setIsLoading(true)
    try {
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
      if (!response.ok) throw new Error('Erreur création facture')
      
      toast.success('Facture créée avec succès')
      router.push('/billing')
    } catch (err: any) {
      setError(`Erreur: ${err.message}`)
      toast.error(`Erreur: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="main-content p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/billing">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Créer une Facture</h1>
          <p className="text-sm text-muted-foreground mt-1">Générez une facture depuis une mission terminée</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Sélection de la Mission</CardTitle>
            <CardDescription>Choisissez la mission terminée à facturer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <p className="text-muted-foreground">Chargement...</p>
            ) : (
              <div>
                <Label htmlFor="mission">Mission à facturer</Label>
                <Select onValueChange={handleSelectMission} required disabled={isLoading || missions.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={missions.length === 0 ? 'Aucune mission disponible' : 'Sélectionner une mission...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {missions.length === 0 ? (
                      <SelectItem value="none" disabled>Aucune mission</SelectItem>
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
            {selectedMission && selectedMission.quote && (
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg">Détails de la Facture</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Client:</span>
                    <strong>{selectedMission.lead.firstName} {selectedMission.lead.lastName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Date mission:</span>
                    <strong>{formatDate(selectedMission.scheduledDate)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Devis N°:</span>
                    <strong>{selectedMission.quote.quoteNumber}</strong>
                  </div>
                  <div className="flex justify-between mt-4 pt-4 border-t">
                    <strong className="text-base">Montant TTC</strong>
                    <strong className="text-base text-blue-600">{formatCurrency(Number(selectedMission.quote.finalPrice))}</strong>
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
            className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600"
            disabled={isLoading || !selectedMission}
          >
            <FilePlus className="w-4 h-4" />
            {isLoading ? 'Génération...' : 'Générer la Facture'}
          </Button>
        </div>
      </form>
    </div>
  )
}