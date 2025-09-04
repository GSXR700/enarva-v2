// app/(administration)/billing/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, FileText } from 'lucide-react'
import { Mission, Lead, Quote } from '@prisma/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'

type BillableMission = Mission & { lead: Lead, quote: Quote | null };

export default function BillingPage() {
  const [missions, setMissions] = useState<BillableMission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBillableMissions = async () => {
      try {
        const response = await fetch('/api/invoices');
        if (!response.ok) throw new Error('Impossible de charger les données de facturation.');
        const data = await response.json();
        setMissions(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBillableMissions();
  }, []);
  
  if (isLoading) {
    return <TableSkeleton title="Facturation" />;
  }

  if (error) {
    return <div className="main-content text-center p-10 text-red-500">Erreur: {error}</div>;
  }

  return (
    <div className="main-content space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Facturation</h1>
          <p className="text-muted-foreground mt-1">{missions.length} missions terminées à facturer.</p>
        </div>
        <Link href="/billing/new">
            <Button className="gap-2 bg-enarva-gradient rounded-lg"><Plus className="w-4 h-4" />Facture</Button>
        </Link>
      </div>
      <Card className="thread-card">
        <CardHeader><CardTitle>Missions à Facturer</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary">
                    <tr>
                        <th scope="col" className="px-6 py-3">N° Mission</th>
                        <th scope="col" className="px-6 py-3">Client</th>
                        <th scope="col" className="px-6 py-3">Date Fin</th>
                        <th scope="col" className="px-6 py-3">Montant</th>
                        <th scope="col" className="px-6 py-3">Statut Facture</th>
                    </tr>
                </thead>
                <tbody>
                    {missions.map(mission => (
                        <tr key={mission.id} className="bg-card border-b">
                            <th scope="row" className="px-6 py-4 font-medium text-foreground whitespace-nowrap">{mission.missionNumber}</th>
                            <td className="px-6 py-4">{mission.lead.firstName} {mission.lead.lastName}</td>
                            <td className="px-6 py-4">{formatDate(mission.actualEndTime || mission.scheduledDate)}</td>
                            <td className="px-6 py-4 font-bold text-enarva-start">
                                {mission.quote ? formatCurrency(Number(mission.quote.finalPrice)) : 'N/A'}
                            </td>
                            <td className="px-6 py-4">
                                {mission.invoiceGenerated ? (
                                    <Badge variant="outline" className="text-green-600 border-green-600">Facturée</Badge>
                                ) : (
                                    <Badge variant="outline" className="text-orange-500 border-orange-500">En attente</Badge>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
          {missions.length === 0 && (
            <div className="text-center py-10">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium text-foreground">Aucune mission à facturer</h3>
                <p className="mt-1 text-sm text-muted-foreground">Les missions terminées apparaîtront ici.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}