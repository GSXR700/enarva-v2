'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, Edit, Trash2, Plus, CreditCard, Search, Calendar, Package, DollarSign, TrendingUp, MoreVertical, CheckCircle } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Subscription, Lead, SubscriptionType, SubscriptionStatus } from '@prisma/client'
import { formatDate, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'
import { motion } from 'framer-motion'

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
      case 'ACTIVE': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'PAUSED': return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
      case 'CANCELLED': return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      case 'EXPIRED': return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
    }
  }

  const getTypeColor = (type: SubscriptionType) => {
    switch (type) {
      case 'BRONZE': return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
      case 'SILVER': return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
      case 'GOLD': return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      case 'PLATINUM': return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
      case 'CUSTOM': return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
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

  if (isLoading) return <TableSkeleton title="Chargement des abonnements..." />

  const activeCount = subscriptions.filter(s => s.status === 'ACTIVE').length
  const totalRevenue = subscriptions
    .filter(s => s.status === 'ACTIVE')
    .reduce((sum, s) => sum + Number(s.monthlyPrice), 0)
  const annualRevenue = totalRevenue * 12

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-[95vw] md:max-w-[1400px] mx-auto space-y-6">
        
        {/* Header - Apple Style */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm">
              <CreditCard className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
                Abonnements
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-sm font-semibold">
                  {subscriptions.length}
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gestion des abonnements clients
              </p>
            </div>
          </div>
          <Link href="/subscriptions/new" className="hidden sm:block">
            <Button className="gap-2 h-11 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all">
              <Plus className="w-4 h-4" />
              Nouvel Abonnement
            </Button>
          </Link>
        </motion.div>

        {/* Stats Cards - Apple Style with Animations */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ duration: 0.2 }}>
            <Card className="apple-card group relative overflow-hidden border-l-4 border-l-purple-500">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-5 relative">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Total</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">{subscriptions.length}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Package className="w-3 h-3" />
                      <span>Abonnements</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 backdrop-blur-sm">
                    <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ duration: 0.2 }}>
            <Card className="apple-card group relative overflow-hidden border-l-4 border-l-green-500">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-5 relative">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Actifs</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">{activeCount}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle className="w-3 h-3" />
                      <span>En service</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 backdrop-blur-sm">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ duration: 0.2 }}>
            <Card className="apple-card group relative overflow-hidden border-l-4 border-l-blue-500">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-5 relative">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Revenu/Mois</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">{formatCurrency(totalRevenue)}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <DollarSign className="w-3 h-3" />
                      <span>Mensuel</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 backdrop-blur-sm">
                    <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ duration: 0.2 }}>
            <Card className="apple-card group relative overflow-hidden border-l-4 border-l-indigo-500">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-5 relative">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Revenu/An</p>
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">{formatCurrency(annualRevenue)}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="w-3 h-3" />
                      <span>Annuel</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 backdrop-blur-sm">
                    <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Filters Bar - Apple Style Sticky */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="sticky top-0 z-40 backdrop-blur-lg bg-background/80 -mx-4 md:-mx-6 px-4 md:px-6 py-4 border-y"
        >
          <Card className="apple-card border-border/50">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 rounded-xl border-border/50 focus-visible:ring-2"
                  />
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-11 w-[160px] rounded-xl">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous statuts</SelectItem>
                      <SelectItem value="ACTIVE">Actifs</SelectItem>
                      <SelectItem value="PAUSED">En pause</SelectItem>
                      <SelectItem value="CANCELLED">Annulés</SelectItem>
                      <SelectItem value="EXPIRED">Expirés</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Subscriptions Grid */}
        {filteredSubscriptions.length === 0 ? (
          <Card className="apple-card">
            <CardContent className="text-center py-12">
              <CreditCard className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun abonnement trouvé</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all'
                  ? 'Aucun résultat pour ces critères.'
                  : 'Créez votre premier abonnement pour commencer.'}
              </p>
              <Button onClick={() => window.location.href = '/subscriptions/new'} className="gap-2">
                <Plus className="w-4 h-4" />
                Créer un abonnement
              </Button>
            </CardContent>
          </Card>
        ) : (
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {filteredSubscriptions.map((subscription, index) => {
              const serviceUsagePercent = (subscription.usedServices / subscription.includedServices) * 100;
              
              return (
                <motion.div
                  key={subscription.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                >
                  <Card className="apple-card group cursor-pointer h-full" onClick={() => window.location.href = `/subscriptions/${subscription.id}`}>
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-semibold mb-1">
                            {subscription.lead.firstName} {subscription.lead.lastName}
                          </CardTitle>
                          {subscription.lead.email && (
                            <p className="text-xs text-muted-foreground truncate">{subscription.lead.email}</p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.location.href = `/subscriptions/${subscription.id}`; }}>
                              <Eye className="w-4 h-4 mr-2" />
                              Voir détails
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.location.href = `/subscriptions/${subscription.id}/edit`; }}>
                              <Edit className="w-4 h-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); handleDelete(subscription.id); }}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getStatusColor(subscription.status)}>
                          {translateStatus(subscription.status)}
                        </Badge>
                        <Badge className={getTypeColor(subscription.type)}>
                          {subscription.type}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 p-5 pt-0">
                      {/* Price Highlight */}
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                        <p className="text-xs text-muted-foreground mb-1">Prix mensuel</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(Number(subscription.monthlyPrice))}
                        </p>
                      </div>

                      {/* Service Usage */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground font-medium">Utilisation services</span>
                          <span className="text-xs font-semibold">
                            {subscription.usedServices}/{subscription.includedServices}
                          </span>
                        </div>
                        <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                          <motion.div 
                            className={`h-2 rounded-full ${
                              serviceUsagePercent >= 90 ? 'bg-red-500' :
                              serviceUsagePercent >= 70 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, serviceUsagePercent)}%` }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {serviceUsagePercent >= 90 && <span className="text-red-600 dark:text-red-400">⚠️ Limite proche</span>}
                          {serviceUsagePercent < 90 && serviceUsagePercent >= 70 && <span className="text-yellow-600 dark:text-yellow-400">Utilisation élevée</span>}
                          {serviceUsagePercent < 70 && <span className="text-green-600 dark:text-green-400">Disponible</span>}
                        </p>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Prochaine facture
                          </p>
                          <p className="text-sm font-medium">{formatDate(subscription.nextBilling)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Remise</p>
                          <p className="text-sm font-medium">
                            {Number(subscription.discount) > 0 ? `${subscription.discount}%` : 'Aucune'}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-3 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/subscriptions/${subscription.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full h-9 rounded-lg">
                            <Eye className="w-4 h-4 mr-2" />
                            Détails
                          </Button>
                        </Link>
                        <Link href={`/subscriptions/${subscription.id}/edit`}>
                          <Button variant="outline" size="sm" className="h-9 px-4 rounded-lg">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Floating Add Button - Mobile Only */}
        <div className="sm:hidden fixed bottom-6 right-6 z-50">
          <Link href="/subscriptions/new">
            <Button 
              size="icon"
              className="h-16 w-16 rounded-full shadow-2xl shadow-primary/30 p-0"
            >
              <Plus className="w-7 h-7" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}