'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Eye, Edit, Trash2, Plus, CreditCard, Search } from 'lucide-react'
import { Subscription, Lead, SubscriptionType, SubscriptionStatus } from '@prisma/client'
import { formatDate, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'

type SubscriptionWithLead = Subscription & { lead: Lead };

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithLead[]>([])
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<SubscriptionWithLead[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/subscriptions')
      if (!response.ok) throw new Error('Failed to fetch subscriptions')
      const data = await response.json()
      setSubscriptions(data)
      setFilteredSubscriptions(data)
    } catch (error) {
      toast.error('Impossible de charger les abonnements')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  useEffect(() => {
    let filtered = [...subscriptions]
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter)
    }
    
    if (searchQuery) {
      filtered = filtered.filter(sub =>
        sub.lead.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.lead.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.lead.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    setFilteredSubscriptions(filtered)
  }, [searchQuery, statusFilter, subscriptions])

  const getStatusVariant = (status: SubscriptionStatus) => {
    switch (status) {
      case 'ACTIVE': return 'default'
      case 'PAUSED': return 'secondary'
      case 'CANCELLED': return 'destructive'
      case 'EXPIRED': return 'outline'
      default: return 'outline'
    }
  }

  const getTypeColor = (type: SubscriptionType) => {
    switch (type) {
      case 'BRONZE': return 'bg-orange-100 text-orange-800'
      case 'SILVER': return 'bg-gray-100 text-gray-800'
      case 'GOLD': return 'bg-yellow-100 text-yellow-800'
      case 'PLATINUM': return 'bg-purple-100 text-purple-800'
      case 'CUSTOM': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleDelete = async (subscriptionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet abonnement ?')) return

    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete subscription')
      
      toast.success('Abonnement supprimé avec succès')
      fetchSubscriptions()
    } catch (error) {
      toast.error('Impossible de supprimer l\'abonnement')
    }
  }

  if (isLoading) return <TableSkeleton title="Chargement des abonnements..." />

  return (
    <div className="main-content space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Abonnements</h1>
          <p className="text-muted-foreground mt-1">
            Gérez tous les abonnements clients
          </p>
        </div>
        <Link href="/subscriptions/new">
          <Button className="bg-enarva-gradient rounded-lg">
            <Plus className="w-4 h-4 mr-2" />
            Nouvel Abonnement
          </Button>
        </Link>
      </div>

      <Card className="thread-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher par client..."
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
              <option value="ACTIVE">Actif</option>
              <option value="PAUSED">En pause</option>
              <option value="CANCELLED">Annulé</option>
              <option value="EXPIRED">Expiré</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredSubscriptions.length === 0 ? (
          <Card className="thread-card">
            <CardContent className="pt-6 text-center">
              <CreditCard className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' ? 'Aucun abonnement trouvé' : 'Aucun abonnement disponible'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSubscriptions.map((subscription) => (
            <Card key={subscription.id} className="thread-card">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-semibold">
                        {subscription.lead.firstName} {subscription.lead.lastName}
                      </h3>
                      <Badge 
                        variant={getStatusVariant(subscription.status)}
                        className="capitalize"
                      >
                        {subscription.status}
                      </Badge>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(subscription.type)}`}>
                        {subscription.type}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-muted-foreground">Prix mensuel:</span>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(Number(subscription.monthlyPrice))} MAD/mois
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Prochaine facture:</span>
                        <p>{formatDate(subscription.nextBilling)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Services:</span>
                        <p>{subscription.usedServices}/{subscription.includedServices}</p>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Remise:</span>
                        <p>{Number(subscription.discount) > 0 ? `${subscription.discount}%` : 'Aucune'}</p>
                      </div>
                    </div>

                    {subscription.lead.email && (
                      <div className="mt-2">
                        <span className="text-sm text-muted-foreground">Email: {subscription.lead.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Link href={`/subscriptions/${subscription.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href={`/subscriptions/${subscription.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(subscription.id)}
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