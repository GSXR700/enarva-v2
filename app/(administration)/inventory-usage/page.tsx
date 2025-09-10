'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Eye, Edit, Trash2, Plus, Package, Search, TrendingDown } from 'lucide-react'
import { InventoryUsage, Inventory, Mission, Lead } from '@prisma/client'
import { formatDate, formatTime } from '@/lib/utils'
import { toast } from 'sonner'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'

type InventoryUsageWithDetails = InventoryUsage & {
  inventory: Inventory;
  mission: Mission & { lead: Lead };
};

export default function InventoryUsagePage() {
  const [usages, setUsages] = useState<InventoryUsageWithDetails[]>([])
  const [filteredUsages, setFilteredUsages] = useState<InventoryUsageWithDetails[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)

  const fetchInventoryUsages = async () => {
    try {
      const response = await fetch('/api/inventory-usage')
      if (!response.ok) throw new Error('Failed to fetch inventory usage')
      const data = await response.json()
      setUsages(data)
      setFilteredUsages(data)
    } catch (error) {
      toast.error('Impossible de charger l\'utilisation d\'inventaire')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInventoryUsages()
  }, [])

  useEffect(() => {
    let filtered = [...usages]
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(usage => usage.inventory.category === categoryFilter)
    }
    
    if (searchQuery) {
      filtered = filtered.filter(usage =>
        usage.inventory.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        usage.mission.lead.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        usage.mission.lead.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        usage.mission.missionNumber.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    setFilteredUsages(filtered)
  }, [searchQuery, categoryFilter, usages])

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'CLEANING_PRODUCTS': return 'bg-blue-100 text-blue-800'
      case 'EQUIPMENT': return 'bg-purple-100 text-purple-800'
      case 'CONSUMABLES': return 'bg-green-100 text-green-800'
      case 'PROTECTIVE_GEAR': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'CLEANING_PRODUCTS': return 'Produits nettoyage'
      case 'EQUIPMENT': return 'Équipement'
      case 'CONSUMABLES': return 'Consommables'
      case 'PROTECTIVE_GEAR': return 'EPI'
      default: return category
    }
  }

  const handleDelete = async (usageId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette utilisation ?')) return

    try {
      const response = await fetch(`/api/inventory-usage/${usageId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete usage')
      
      toast.success('Utilisation supprimée avec succès')
      fetchInventoryUsages()
    } catch (error) {
      toast.error('Impossible de supprimer l\'utilisation')
    }
  }

  if (isLoading) return <TableSkeleton title="Chargement de l'utilisation d'inventaire..." />

  return (
    <div className="main-content space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Utilisation Inventaire</h1>
          <p className="text-muted-foreground mt-1">
            Gérez l'utilisation des articles d'inventaire sur les missions
          </p>
        </div>
        <Link href="/inventory-usage/new">
          <Button className="bg-enarva-gradient rounded-lg">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle Utilisation
          </Button>
        </Link>
      </div>

      <Card className="thread-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher par article, mission, client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="all">Toutes les catégories</option>
              <option value="CLEANING_PRODUCTS">Produits nettoyage</option>
              <option value="EQUIPMENT">Équipement</option>
              <option value="CONSUMABLES">Consommables</option>
              <option value="PROTECTIVE_GEAR">EPI</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="thread-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Utilisations</p>
                <p className="text-2xl font-bold">{usages.length}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="thread-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Missions Concernées</p>
                <p className="text-2xl font-bold">
                  {new Set(usages.map(u => u.missionId)).size}
                </p>
              </div>
              <Package className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="thread-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Articles Différents</p>
                <p className="text-2xl font-bold">
                  {new Set(usages.map(u => u.inventoryId)).size}
                </p>
              </div>
              <Package className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="thread-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cette Semaine</p>
                <p className="text-2xl font-bold">
                  {usages.filter(u => {
                    const weekAgo = new Date()
                    weekAgo.setDate(weekAgo.getDate() - 7)
                    return new Date(u.usedAt) >= weekAgo
                  }).length}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {filteredUsages.length === 0 ? (
          <Card className="thread-card">
            <CardContent className="pt-6 text-center">
              <Package className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || categoryFilter !== 'all' 
                  ? 'Aucune utilisation trouvée' 
                  : 'Aucune utilisation d\'inventaire disponible'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredUsages.map((usage) => (
            <Card key={usage.id} className="thread-card">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{usage.inventory.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(usage.inventory.category)}`}>
                        {getCategoryLabel(usage.inventory.category)}
                      </span>
                      <Badge variant="outline">
                        {Number(usage.quantity)} {usage.inventory.unit}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Mission:</span> {usage.mission.missionNumber}
                      </div>
                      <div>
                        <span className="font-medium">Client:</span> 
                        {usage.mission.lead.firstName} {usage.mission.lead.lastName}
                      </div>
                      <div>
                        <span className="font-medium">Date:</span> {formatDate(usage.usedAt)}
                      </div>
                      <div>
                        <span className="font-medium">Heure:</span> {formatTime(usage.usedAt)}
                      </div>
                    </div>

                    {usage.notes && (
                      <div className="mt-3">
                        <p className="text-sm">
                          <span className="font-medium">Notes:</span>{' '}
                          {usage.notes.substring(0, 100)}
                          {usage.notes.length > 100 && '...'}
                        </p>
                      </div>
                    )}

                    <div className="mt-3 p-2 bg-muted rounded-lg">
                      <div className="flex items-center justify-between text-xs">
                        <span>Impact sur le stock:</span>
                        <span className="font-medium text-red-600">
                          -{Number(usage.quantity)} {usage.inventory.unit}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs mt-1">
                        <span>Stock actuel:</span>
                        <span className="font-medium">
                          {Number(usage.inventory.currentStock)} {usage.inventory.unit}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Link href={`/inventory-usage/${usage.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href={`/inventory-usage/${usage.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(usage.id)}
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