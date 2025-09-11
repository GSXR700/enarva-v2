// app/(administration)/inventory/page.tsx
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

interface InventoryItem {
  id: string
  name: string
  category: string
  unit: string
  currentStock: number
  minimumStock: number
  unitPrice: number
  supplier: string
  totalValue: number
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  usages: InventoryUsage[]
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
      const response = await fetch('/api/inventory?include=usages')
      if (!response.ok) throw new Error('Failed to fetch inventory')
      
      const data = await response.json()
      
      // Process inventory data and add calculated fields
      const processedData = data.map((item: any) => ({
        ...item,
        totalValue: item.currentStock * item.unitPrice,
        status: getStockStatus(item.currentStock, item.minimumStock)
      }))
      
      setInventory(processedData)
      
      // Generate stock alerts with correct typing
      const alerts = generateStockAlerts(processedData)
      setStockAlerts(alerts)
      
    } catch (error) {
      console.error('Failed to fetch inventory:', error)
      toast.error('Impossible de charger l\'inventaire')
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
        currentStock: item.currentStock,
        minimumStock: item.minimumStock,
        category: item.category,
        severity: item.currentStock === 0 ? 'CRITICAL' as const : 'LOW' as const
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

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.supplier.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter)
    }

    setFilteredInventory(filtered)
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'IN_STOCK':
        return 'bg-green-100 text-green-800'
      case 'LOW_STOCK':
        return 'bg-yellow-100 text-yellow-800'
      case 'OUT_OF_STOCK':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'IN_STOCK':
        return 'En stock'
      case 'LOW_STOCK':
        return 'Stock faible'
      case 'OUT_OF_STOCK':
        return 'Rupture'
      default:
        return 'Inconnu'
    }
  }

  const exportInventory = async () => {
    try {
      const response = await fetch('/api/inventory/export')
      if (!response.ok) throw new Error('Export failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inventaire_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
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

  const totalInventoryValue = inventory.reduce((sum, item) => sum + item.totalValue, 0)
  const lowStockCount = stockAlerts.filter(alert => alert.severity === 'LOW').length
  const outOfStockCount = stockAlerts.filter(alert => alert.severity === 'CRITICAL').length

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="main-content space-y-6">
      {/* Header */}
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
          <Button variant="outline" onClick={exportInventory}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <Button onClick={() => fetchInventory()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Link href="/inventory/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouvel Article
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Articles</p>
                <p className="text-2xl font-bold">{inventory.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingDown className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Stock Faible</p>
                <p className="text-2xl font-bold text-yellow-600">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Rupture</p>
                <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Valeur Totale</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalInventoryValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Alerts */}
      {stockAlerts.length > 0 && showAlerts && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <span className="font-medium">Alertes Stock:</span> {stockAlerts.length} articles nécessitent votre attention
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkRestock}
                disabled={stockAlerts.length === 0}
              >
                Réapprovisionner Tout
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAlerts(false)}
              >
                Masquer
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher par nom, fournisseur ou catégorie..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toutes les catégories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {categoryTranslations[category] || category}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="IN_STOCK">En stock</option>
              <option value="LOW_STOCK">Stock faible</option>
              <option value="OUT_OF_STOCK">Rupture</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Articles d'Inventaire ({filteredInventory.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInventory.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-500">
                {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
                  ? 'Aucun article trouvé avec ces filtres'
                  : 'Aucun article dans l\'inventaire'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Article</th>
                    <th className="text-left py-3 px-4 font-medium">Catégorie</th>
                    <th className="text-left py-3 px-4 font-medium">Stock Actuel</th>
                    <th className="text-left py-3 px-4 font-medium">Stock Minimum</th>
                    <th className="text-left py-3 px-4 font-medium">Prix Unitaire</th>
                    <th className="text-left py-3 px-4 font-medium">Valeur Totale</th>
                    <th className="text-left py-3 px-4 font-medium">Statut</th>
                    <th className="text-left py-3 px-4 font-medium">Fournisseur</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-gray-500">Unité: {item.unit}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">
                          {categoryTranslations[item.category] || item.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">
                          {item.currentStock} {item.unit}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-600">
                          {item.minimumStock} {item.unit}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">
                          {formatCurrency(item.unitPrice)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-green-600">
                          {formatCurrency(item.totalValue)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusBadgeColor(item.status)}>
                          {getStatusText(item.status)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-600">
                          {item.supplier}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
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
                          {item.status !== 'IN_STOCK' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700"
                              onClick={() => handleRestock(item.id)}
                            >
                              Réappro
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Usage */}
      {filteredInventory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Utilisations Récentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredInventory
                .filter(item => item.usages && item.usages.length > 0)
                .slice(0, 5)
                .map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-500">
                          Dernière utilisation: {item.usages[0]?.mission.missionNumber || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-red-600">
                        -{item.usages[0]?.quantity || 0} {item.unit}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.usages[0] && new Date(item.usages[0].usedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

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
}