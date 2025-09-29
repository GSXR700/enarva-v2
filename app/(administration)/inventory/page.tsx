//app/(administration)/inventory/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Search, 
  Plus, 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  Edit, 
  Eye,
  Download,
  RefreshCw
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { InventorySkeleton } from '@/components/skeletons/InventorySkeleton'

interface InventoryItem {
  id: string
  name: string
  category: string
  unit: string
  currentStock: number | string
  minimumStock: number | string
  unitPrice: number | string
  supplier: string | null
  totalValue: number
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  usages?: InventoryUsage[]
  createdAt: string
  updatedAt: string
}

interface InventoryUsage {
  id: string
  quantity: number
  mission: {
    missionNumber: string
    lead: {
      firstName: string
      lastName: string
    }
  }
  usedAt: string
}

interface StockAlert {
  id: string
  itemName: string
  currentStock: number
  minimumStock: number
  category: string
  severity: 'LOW' | 'CRITICAL'
}

export default function EnhancedInventoryManagement() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([])
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [showAlerts, setShowAlerts] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const categories = [
    'CLEANING_PRODUCTS',
    'EQUIPMENT', 
    'CONSUMABLES',
    'PROTECTIVE_GEAR'
  ] as const

  const categoryTranslations: Record<string, string> = {
    'CLEANING_PRODUCTS': 'Produits de nettoyage',
    'EQUIPMENT': 'Équipement',
    'CONSUMABLES': 'Consommables',
    'PROTECTIVE_GEAR': 'Équipement de protection'
  }

  useEffect(() => {
    fetchInventory()
  }, [])

  useEffect(() => {
    filterInventory()
  }, [inventory, searchQuery, categoryFilter, statusFilter])

  const fetchInventory = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/inventory')
      if (!response.ok) {
        throw new Error(`Failed to fetch inventory: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('API Response:', data) // Debug log
      
      // Handle both old and new API response formats
      let inventoryItems: any[] = []
      
      if (Array.isArray(data)) {
        // Old format - direct array
        inventoryItems = data
      } else if (data.items && Array.isArray(data.items)) {
        // New format - object with items array
        inventoryItems = data.items
      } else if (data.expenses && Array.isArray(data.expenses)) {
        // Handle case where API returns expenses instead of items
        inventoryItems = data.expenses
      } else {
        // Fallback - try to extract any array from the response
        const possibleArrays = Object.values(data).filter(Array.isArray)
        if (possibleArrays.length > 0) {
          inventoryItems = possibleArrays[0] as any[]
        } else {
          inventoryItems = []
        }
      }
      
      console.log('Processed inventory items:', inventoryItems) // Debug log
      
      // Process inventory data and add calculated fields
      const processedData = inventoryItems.map((item: any) => {
        const currentStock = Number(item.currentStock) || 0
        const minimumStock = Number(item.minimumStock) || 0
        const unitPrice = Number(item.unitPrice) || 0
        
        return {
          ...item,
          currentStock,
          minimumStock,
          unitPrice,
          totalValue: currentStock * unitPrice,
          status: getStockStatus(currentStock, minimumStock),
          supplier: item.supplier || null
        }
      })
      
      console.log('Final processed data:', processedData) // Debug log
      
      setInventory(processedData)
      
      // Generate stock alerts
      const alerts = generateStockAlerts(processedData)
      setStockAlerts(alerts)
      
    } catch (error: any) {
      console.error('Failed to fetch inventory:', error)
      setError(error.message || 'Impossible de charger l\'inventaire')
      toast.error('Impossible de charger l\'inventaire')
      setInventory([])
    } finally {
      setIsLoading(false)
    }
  }

  const getStockStatus = (currentStock: number, minimumStock: number): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' => {
    if (currentStock === 0) return 'OUT_OF_STOCK'
    if (currentStock <= minimumStock) return 'LOW_STOCK'
    return 'IN_STOCK'
  }

  const generateStockAlerts = (items: InventoryItem[]): StockAlert[] => {
    return items
      .filter(item => item.status !== 'IN_STOCK')
      .map(item => ({
        id: item.id,
        itemName: item.name,
        currentStock: Number(item.currentStock),
        minimumStock: Number(item.minimumStock),
        category: item.category,
        severity: Number(item.currentStock) === 0 ? 'CRITICAL' as const : 'LOW' as const
      }))
      .sort((a, b) => {
        // Sort by severity (CRITICAL first) then by stock level
        if (a.severity !== b.severity) {
          return a.severity === 'CRITICAL' ? -1 : 1
        }
        return a.currentStock - b.currentStock
      })
  }

  const filterInventory = () => {
    let filtered = [...inventory]
    
    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter)
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter)
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        (item.supplier && item.supplier.toLowerCase().includes(query)) ||
        item.category.toLowerCase().includes(query)
      )
    }
    
    setFilteredInventory(filtered)
  }

  const exportInventory = async () => {
    try {
      const response = await fetch('/api/inventory/export')
      if (!response.ok) throw new Error('Export failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `inventaire_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast.success('Inventaire exporté avec succès')
    } catch (error) {
      toast.error('Erreur lors de l\'export')
    }
  }

  const handleBulkRestock = async () => {
    try {
      const response = await fetch('/api/inventory/bulk-restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: stockAlerts.map(alert => ({
            id: alert.id,
            restockQuantity: alert.minimumStock * 2 // Restock to 2x minimum
          }))
        })
      })

      if (!response.ok) throw new Error('Bulk restock failed')
      
      toast.success('Réapprovisionnement en masse lancé')
      fetchInventory() // Refresh data
    } catch (error) {
      toast.error('Erreur lors du réapprovisionnement')
    }
  }

  // Helper function for restock
  async function handleRestock(itemId: string) {
    try {
      const response = await fetch(`/api/inventory/${itemId}/restock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: 100, // Default restock quantity
          note: 'Réapprovisionnement rapide'
        })
      })

      if (!response.ok) throw new Error('Restock failed')
      
      toast.success('Article réapprovisionné')
      fetchInventory() // Refresh data
    } catch (error) {
      toast.error('Erreur lors du réapprovisionnement')
    }
  }

  const totalInventoryValue = inventory.reduce((sum, item) => sum + (item.totalValue || 0), 0)
  const lowStockCount = stockAlerts.filter(alert => alert.severity === 'LOW').length
  const outOfStockCount = stockAlerts.filter(alert => alert.severity === 'CRITICAL').length

  // Show skeleton while loading
  if (isLoading) {
    return <InventorySkeleton />
  }

  // Show error state
  if (error) {
    return (
      <div className="main-content">
        <Alert className="max-w-md mx-auto border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            {error}
            <Button 
              onClick={fetchInventory} 
              variant="outline" 
              size="sm" 
              className="ml-4"
            >
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="main-content space-y-6">
      {/* Header - Responsive buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Gestion d'Inventaire
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos stocks, suivez les consommations et recevez des alertes
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Mobile: Icon only, Desktop: Icon + Text */}
          <Button variant="outline" onClick={exportInventory}>
            <Download className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Exporter</span>
          </Button>
          <Button onClick={() => fetchInventory()}>
            <RefreshCw className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Actualiser</span>
          </Button>
          <Link href="/inventory/new">
            <Button>
              <Plus className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Nouvel Article</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards - Dark Mode Support */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg dark:bg-gray-800/50">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Articles</p>
                <p className="text-2xl font-bold text-foreground">{inventory.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg dark:bg-gray-800/50">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingDown className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Stock Faible</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg dark:bg-gray-800/50">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Rupture</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{outOfStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg dark:bg-gray-800/50">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-green-600 dark:text-green-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Valeur Totale</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalInventoryValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Alerts - Dark Mode Support */}
      {showAlerts && stockAlerts.length > 0 && (
        <Alert className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription className="flex items-center justify-between text-yellow-800 dark:text-yellow-200">
            <div>
              <strong>{stockAlerts.length} article(s) nécessite(nt) votre attention</strong>
              <div className="mt-1">
                {stockAlerts.slice(0, 3).map(alert => (
                  <div key={alert.id} className="text-sm">
                    {alert.itemName}: {alert.currentStock}/{alert.minimumStock}
                  </div>
                ))}
                {stockAlerts.length > 3 && (
                  <div className="text-sm">... et {stockAlerts.length - 3} autres</div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleBulkRestock}>
                Réapprovisionner tout
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAlerts(false)}>
                Masquer
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters and Search - Dark Mode Support */}
      <Card className="border-0 shadow-lg dark:bg-gray-800/50">
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, fournisseur ou catégorie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border rounded-md px-3 py-2 bg-background text-foreground border-input focus:border-ring focus:ring-2 focus:ring-ring"
            >
              <option value="all">Toutes les catégories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {categoryTranslations[category]}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-md px-3 py-2 bg-background text-foreground border-input focus:border-ring focus:ring-2 focus:ring-ring"
            >
              <option value="all">Tous les statuts</option>
              <option value="IN_STOCK">En stock</option>
              <option value="LOW_STOCK">Stock faible</option>
              <option value="OUT_OF_STOCK">Rupture</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Items */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          Articles d'Inventaire ({filteredInventory.length})
        </h2>
        
        {filteredInventory.length === 0 ? (
          <Card className="border-0 shadow-lg dark:bg-gray-800/50">
            <CardContent className="py-16 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {inventory.length === 0 ? 'Aucun article dans l\'inventaire' : 'Aucun article trouvé'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {inventory.length === 0 
                  ? 'Commencez par ajouter des articles à votre inventaire'
                  : 'Essayez de modifier vos critères de recherche'
                }
              </p>
              {inventory.length === 0 && (
                <Link href="/inventory/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un article
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredInventory.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow border-0 shadow-lg dark:bg-gray-800/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{item.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {categoryTranslations[item.category] || item.category}
                            {item.supplier && ` • ${item.supplier}`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 mt-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Stock actuel</p>
                          <p className="text-lg font-semibold text-foreground">
                            {Number(item.currentStock)} {item.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Stock minimum</p>
                          <p className="text-lg text-foreground">{Number(item.minimumStock)} {item.unit}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Prix unitaire</p>
                          <p className="text-lg text-foreground">{formatCurrency(Number(item.unitPrice))}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Valeur totale</p>
                          <p className="text-lg font-semibold text-foreground">{formatCurrency(item.totalValue)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <Badge
                        variant={
                          item.status === 'IN_STOCK' ? 'default' :
                          item.status === 'LOW_STOCK' ? 'destructive' :
                          'destructive'
                        }
                      >
                        {item.status === 'IN_STOCK' ? 'En stock' :
                         item.status === 'LOW_STOCK' ? 'Stock faible' :
                         'Rupture'}
                      </Badge>
                      
                      <div className="flex gap-2">
                        <Link href={`/inventory/${item.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link href={`/inventory/${item.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        {(item.status === 'LOW_STOCK' || item.status === 'OUT_OF_STOCK') && (
                          <Button 
                            size="sm" 
                            onClick={() => handleRestock(item.id)}
                            className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                          >
                            Réapprovisionner
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}