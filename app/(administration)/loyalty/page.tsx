// app/(administration)/loyalty/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Star } from 'lucide-react'
import { Subscription, Lead } from '@prisma/client'
import { formatDate, formatCurrency } from '@/lib/utils'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'

type SubscriptionWithLead = Subscription & { lead: Lead };

export default function LoyaltyPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithLead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const response = await fetch('/api/subscriptions');
        if (!response.ok) throw new Error('Impossible de charger les abonnements.');
        const data = await response.json();
        setSubscriptions(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubscriptions();
  }, []);
  
  const getStatusColor = (status: string) => {
    switch (status) {
        case 'ACTIVE': return 'bg-green-100 text-green-800';
        case 'PAUSED': return 'bg-yellow-100 text-yellow-800';
        case 'CANCELLED': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
  }
  
  if (isLoading) {
    return <TableSkeleton title="Programme de Fidélité" />;
  }

  if (error) {
    return <div className="main-content text-center p-10 text-red-500">Erreur: {error}</div>;
  }

  return (
    <div className="main-content space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Programme de Fidélité Enarva+</h1>
          <p className="text-muted-foreground mt-1">{subscriptions.length} clients abonnés</p>
        </div>
        <Link href="/loyalty/new">
            <Button className="gap-2 bg-enarva-gradient rounded-lg"><Plus className="w-4 h-4" />Nouvel Abonnement</Button>
        </Link>
      </div>
      <Card className="thread-card">
        <CardHeader><CardTitle>Clients Abonnés</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary">
                    <tr>
                        <th scope="col" className="px-6 py-3">Client</th>
                        <th scope="col" className="px-6 py-3">Formule</th>
                        <th scope="col" className="px-6 py-3">Prix Mensuel</th>
                        <th scope="col" className="px-6 py-3">Prochaine Facturation</th>
                        <th scope="col" className="px-6 py-3">Statut</th>
                    </tr>
                </thead>
                <tbody>
                    {subscriptions.map(sub => (
                        <tr key={sub.id} className="bg-card border-b">
                            <th scope="row" className="px-6 py-4 font-medium text-foreground whitespace-nowrap">{sub.lead.firstName} {sub.lead.lastName}</th>
                            <td className="px-6 py-4"><Badge variant="outline">{sub.type}</Badge></td>
                            <td className="px-6 py-4 font-bold text-enarva-start">{formatCurrency(Number(sub.monthlyPrice))}</td>
                            <td className="px-6 py-4">{formatDate(sub.nextBilling)}</td>
                             <td className="px-6 py-4"><Badge className={getStatusColor(sub.status)}>{sub.status}</Badge></td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
          {subscriptions.length === 0 && (
            <div className="text-center py-10">
                <Star className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium text-foreground">Aucun client abonné</h3>
                <p className="mt-1 text-sm text-muted-foreground">Commencez par ajouter un abonnement pour un client.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}