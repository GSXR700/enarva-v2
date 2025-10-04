'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, Edit, Trash2, Plus, CreditCard, Search, Calendar, Package, DollarSign, TrendingUp, MoreVertical } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
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

  const getStatusColor = (status: SubscriptionStatus) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
      case 'PAUSED': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
      case 'CANCELLED': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
      case 'EXPIRED': return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200'
      default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200'
    }
  }

  const getTypeColor = (type: SubscriptionType) => {
    switch (type) {
      case 'BRONZE': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
      case 'SILVER': return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200'
      case 'GOLD': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
      case 'PLATINUM': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
      case 'CUSTOM': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
      default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200'
    }
  }

  const translateStatus = (status: SubscriptionStatus) => {
    const translations = {
      ACTIVE: 'Actif',
      PAUSED: 'En pause',
      CANCELLED: 'Annulé',
      EXPIRED: 'Expiré'
    }
    return translations[status] || status
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

  const activeCount = subscriptions.filter(s => s.status === 'ACTIVE').length
  const totalRevenue = subscriptions
    .filter(s => s.status === 'ACTIVE')
    .reduce((sum, s) => sum + Number(s.monthlyPrice), 0)

  if (isLoading) return <TableSkeleton title="Chargement des abonnements..." />

  return (
    <div className="main-content p-3 md:p-6 space-y-4 md:space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">Abonnements</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">
            Gérez tous les abonnements clients
          </p>
        </div>
        <Link href="/subscriptions/new">
          <Button className="w-full md:w-auto h-9 md:h-10 text-xs md:text-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Plus className="w-3 h-3 md:w-4 md:h-4 mr-2" />
            Nouvel Abonnement
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total</p>
                <p className="text-xl md:text-2xl font-bold">{subscriptions.length}</p>
              </div>
              <Package className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Actifs</p>
                <p className="text-xl md:text-2xl font-bold text-green-600">{activeCount}</p>
              </div>
              <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm col-span-2 md:col-span-1">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Revenu/mois</p>
                <p className="text-xl md:text-2xl font-bold text-purple-600">{formatCurrency(totalRevenue)}</p>
              </div>
              <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col gap-2 md:gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher par client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 md:h-10 text-xs md:text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="ACTIVE">Actif</SelectItem>
                <SelectItem value="PAUSED">En pause</SelectItem>
                <SelectItem value="CANCELLED">Annulé</SelectItem>
                <SelectItem value="EXPIRED">Expiré</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      <div className="space-y-3 md:space-y-4">
        {filteredSubscriptions.length === 0 ? (
          <Card className="border-none shadow-sm">
            <CardContent className="p-8 md:p-12 text-center">
              <CreditCard className="mx-auto w-10 h-10 md:w-12 md:h-12 text-muted-foreground mb-3 md:mb-4" />
              <h3 className="text-sm md:text-base font-medium mb-1 md:mb-2">Aucun abonnement trouvé</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                {searchQuery || statusFilter !== 'all' ? 'Essayez d\'ajuster vos filtres' : 'Créez votre premier abonnement'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSubscriptions.map((subscription) => (
            <Card key={subscription.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 md:p-4">
                {/* Mobile Layout */}
                <div className="md:hidden space-y-3">
                  {/* Header with name and badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate mb-1">
                        {subscription.lead.firstName} {subscription.lead.lastName}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className={`${getStatusColor(subscription.status)} text-[10px] px-1.5 py-0.5`}>
                          {translateStatus(subscription.status)}
                        </Badge>
                        <Badge className={`${getTypeColor(subscription.type)} text-[10px] px-1.5 py-0.5`}>
                          {subscription.type}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild className="text-xs">
                          <Link href={`/subscriptions/${subscription.id}`}>
                            <Eye className="w-3 h-3 mr-2" />Voir
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="text-xs">
                          <Link href={`/subscriptions/${subscription.id}/edit`}>
                            <Edit className="w-3 h-3 mr-2" />Modifier
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(subscription.id)} className="text-red-600 text-xs">
                          <Trash2 className="w-3 h-3 mr-2" />Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Price highlight */}
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2.5 border border-green-200 dark:border-green-800">
                    <p className="text-xs text-muted-foreground mb-0.5">Prix mensuel</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(Number(subscription.monthlyPrice))} MAD
                    </p>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/50 rounded-lg p-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground">Prochaine facture</p>
                      </div>
                      <p className="text-xs font-medium">{formatDate(subscription.nextBilling)}</p>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Package className="w-3 h-3 text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground">Services</p>
                      </div>
                      <p className="text-xs font-medium">
                        {subscription.usedServices}/{subscription.includedServices}
                      </p>
                    </div>
                  </div>

                  {/* Email */}
                  {subscription.lead.email && (
                    <p className="text-xs text-muted-foreground truncate">
                      {subscription.lead.email}
                    </p>
                  )}
                </div>

                {/* Desktop Layout */}
                <div className="hidden md:flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-semibold text-base">
                        {subscription.lead.firstName} {subscription.lead.lastName}
                      </h3>
                      <Badge className={`${getStatusColor(subscription.status)} text-xs`}>
                        {translateStatus(subscription.status)}
                      </Badge>
                      <Badge className={`${getTypeColor(subscription.type)} text-xs`}>
                        {subscription.type}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Prix mensuel</p>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(Number(subscription.monthlyPrice))} MAD
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Prochaine facture</p>
                        <p className="text-sm">{formatDate(subscription.nextBilling)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Services</p>
                        <p className="text-sm">{subscription.usedServices}/{subscription.includedServices}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Remise</p>
                        <p className="text-sm">{Number(subscription.discount) > 0 ? `${subscription.discount}%` : 'Aucune'}</p>
                      </div>
                    </div>

                    {subscription.lead.email && (
                      <p className="text-xs text-muted-foreground mt-2">{subscription.lead.email}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Link href={`/subscriptions/${subscription.id}`}>
                      <Button variant="outline" size="sm" className="h-8">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href={`/subscriptions/${subscription.id}/edit`}>
                      <Button variant="outline" size="sm" className="h-8">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(subscription.id)}
                      className="h-8 text-red-600 hover:text-red-700"
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