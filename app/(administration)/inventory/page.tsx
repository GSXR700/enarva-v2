//app/(administration)/inventory/page.tsx - APPLE DESIGN TEMPLATE
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
  RefreshCw,
  MoreVertical,
  TrendingUp,
  DollarSign,
  List,
  Grid3x3
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { InventorySkeleton } from '@/components/skeletons/InventorySkeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('cards')

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
      
      // Handle both old and new API response formats
      let inventoryItems: any[] = []
      
      if (Array.isArray(data)) {
        inventoryItems = data
      } else if (data.items && Array.isArray(data.items)) {
        inventoryItems = data.items
      } else if (data.expenses && Array.isArray(data.expenses)) {
        inventoryItems = data.expenses
      } else {
        const possibleArrays = Object.values(data).filter(Array.isArray)
        if (possibleArrays.length > 0) {
          inventoryItems = possibleArrays[0] as any[]
        } else {
          inventoryItems = []
        }
      }
      
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
        if (a.severity !== b.severity) {
          return a.severity === 'CRITICAL' ? -1 : 1
        }
        return a.currentStock - b.currentStock
      })
  }

  const filterInventory = () => {
    let filtered = [...inventory]
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter)
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter)
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        (item.supplier && item.supplier.toLowerCase().includes(query))
      )
    }
    
    setFilteredInventory(filtered)
  }

  const handleRestock = async (itemId: string) => {
    toast.info(`Fonction de réapprovisionnement en cours de développement pour l'article ${itemId}`)
  }

  const handleBulkRestock = () => {
    toast.info('Réapprovisionnement en masse en cours de développement')
  }

  const handleExportInventory = () => {
    toast.success('Export de l\'inventaire en cours...')
  }

  const getStatusBadgeClass = (status: string) => {
    const classes = {
      'IN_STOCK': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'LOW_STOCK': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'OUT_OF_STOCK': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    return classes[status as keyof typeof classes] || classes.IN_STOCK
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      'IN_STOCK': 'En stock',
      'LOW_STOCK': 'Stock faible',
      'OUT_OF_STOCK': 'Rupture'
    }
    return labels[status as keyof typeof labels] || status
  }

  if (isLoading) {
    return <InventorySkeleton />
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <div className="max-w-[95vw] md:max-w-[1400px] mx-auto">
          <Card className="apple-card border-red-200 dark:border-red-800">
            <CardContent className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <Package className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-red-600 mb-2">Erreur de chargement</h3>
              <p className="text-muted-foreground">{error}</p>
              <Button 
                onClick={fetchInventory} 
                className="mt-4"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const totalItems = inventory.length
  const lowStockCount = inventory.filter(item => item.status === 'LOW_STOCK').length
  const outOfStockCount = inventory.filter(item => item.status === 'OUT_OF_STOCK').length
  const totalInventoryValue = inventory.reduce((sum, item) => sum + item.totalValue, 0)

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
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-sm">
              <Package className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
                Inventaire
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-sm font-semibold">
                  {totalItems}
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gestion des stocks et alertes
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="gap-2 h-11 px-6 rounded-xl hidden sm:flex"
              onClick={handleExportInventory}
            >
              <Download className="w-4 h-4" />
              Exporter
            </Button>
            <Link href="/inventory/new" className="hidden sm:block">
              <Button className="gap-2 h-11 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all">
                <Plus className="w-4 h-4" />
                Nouvel Article
              </Button>
            </Link>
          </div>
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
                    <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Total Articles</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">{totalItems}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="w-3 h-3" />
                      <span>Articles actifs</span>
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
            <Card className="apple-card group relative overflow-hidden border-l-4 border-l-yellow-500">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-5 relative">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Stock Faible</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">{lowStockCount}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <AlertTriangle className="w-3 h-3" />
                      <span>À réapprovisionner</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 backdrop-blur-sm">
                    <TrendingDown className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ duration: 0.2 }}>
            <Card className="apple-card group relative overflow-hidden border-l-4 border-l-red-500">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-5 relative">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Rupture</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 mb-1">{outOfStockCount}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Urgent</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 backdrop-blur-sm">
                    <Package className="w-6 h-6 text-red-600 dark:text-red-400" />
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
                    <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Valeur Totale</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">{formatCurrency(totalInventoryValue)}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <DollarSign className="w-3 h-3" />
                      <span>Inventaire</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 backdrop-blur-sm">
                    <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Stock Alerts Banner - Apple Style */}
        {showAlerts && stockAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Alert className="border-yellow-200 dark:border-yellow-800 bg-gradient-to-r from-yellow-50/50 to-orange-50/50 dark:from-yellow-900/20 dark:to-orange-900/20 backdrop-blur-sm apple-card">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <AlertDescription className="flex items-center justify-between">
                <div className="flex-1">
                  <strong className="text-yellow-800 dark:text-yellow-200 text-base">
                    {stockAlerts.length} article(s) nécessite(nt) votre attention
                  </strong>
                  <div className="mt-2 space-y-1">
                    {stockAlerts.slice(0, 3).map(alert => (
                      <div key={alert.id} className="text-sm text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${alert.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                        <span className="font-medium">{alert.itemName}:</span>
                        <span>{alert.currentStock}/{alert.minimumStock} {categoryTranslations[alert.category]}</span>
                      </div>
                    ))}
                    {stockAlerts.length > 3 && (
                      <div className="text-sm text-yellow-700 dark:text-yellow-300 italic">
                        ... et {stockAlerts.length - 3} autres
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button size="sm" onClick={handleBulkRestock} className="rounded-xl">
                    Réapprovisionner tout
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAlerts(false)} className="rounded-xl">
                    Masquer
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Filters & View Toggle - Apple Style Sticky Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="sticky top-0 z-40 backdrop-blur-lg bg-background/80 -mx-4 md:-mx-6 px-4 md:px-6 py-4 border-y"
        >
          <Card className="apple-card border-border/50">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, fournisseur..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 rounded-xl border-border/50 focus-visible:ring-2"
                  />
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-11 w-[180px] rounded-xl">
                      <SelectValue placeholder="Catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes catégories</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {categoryTranslations[category]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-11 w-[150px] rounded-xl">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous statuts</SelectItem>
                      <SelectItem value="IN_STOCK">En stock</SelectItem>
                      <SelectItem value="LOW_STOCK">Stock faible</SelectItem>
                      <SelectItem value="OUT_OF_STOCK">Rupture</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="h-6 w-px bg-border" />

                  <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
                    <Button
                      variant={viewMode === 'cards' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('cards')}
                      className="rounded-md h-9 w-9 p-0"
                    >
                      <Grid3x3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="rounded-md h-9 w-9 p-0"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {viewMode === 'cards' ? (
            <motion.div
              key="cards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {filteredInventory.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                >
                  <Card className="apple-card group cursor-pointer h-full" onClick={() => window.location.href = `/inventory/${item.id}`}>
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-semibold truncate mb-1">
                            {item.name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground truncate">
                            {categoryTranslations[item.category]}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.location.href = `/inventory/${item.id}`; }}>
                              <Eye className="w-4 h-4 mr-2" />
                              Voir détails
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.location.href = `/inventory/${item.id}/edit`; }}>
                              <Edit className="w-4 h-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            {(item.status === 'LOW_STOCK' || item.status === 'OUT_OF_STOCK') && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRestock(item.id); }}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Réapprovisionner
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground truncate">
                          {item.supplier || 'Sans fournisseur'}
                        </span>
                        <Badge className={getStatusBadgeClass(item.status)} onClick={(e) => e.stopPropagation()}>
                          {getStatusLabel(item.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 p-5 pt-0">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Stock actuel</p>
                          <p className="text-lg font-bold text-foreground">
                            {Number(item.currentStock)}
                          </p>
                          <p className="text-xs text-muted-foreground">{item.unit}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Stock min.</p>
                          <p className="text-lg font-semibold text-foreground">
                            {Number(item.minimumStock)}
                          </p>
                          <p className="text-xs text-muted-foreground">{item.unit}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div>
                          <p className="text-xs text-muted-foreground">Prix unitaire</p>
                          <p className="text-sm font-semibold">{formatCurrency(Number(item.unitPrice))}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Valeur totale</p>
                          <p className="text-sm font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(item.totalValue)}
                          </p>
                        </div>
                      </div>

                      {/* Stock Level Progress Bar */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground font-medium">Niveau de stock</span>
                          <span className="text-xs font-semibold">
                            {((Number(item.currentStock) / (Number(item.minimumStock) * 2)) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                          <motion.div 
                            className={`h-2 rounded-full ${
                              item.status === 'OUT_OF_STOCK' ? 'bg-red-500' :
                              item.status === 'LOW_STOCK' ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (Number(item.currentStock) / (Number(item.minimumStock) * 2)) * 100)}%` }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs text-muted-foreground">
                          Créé {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); window.location.href = `/inventory/${item.id}`; }} 
                            className="h-8 w-8 p-0 hover:bg-accent/50"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); window.location.href = `/inventory/${item.id}/edit`; }}
                            className="h-8 w-8 p-0 hover:bg-accent/50"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
              {filteredInventory.length === 0 && (
                <div className="col-span-full">
                  <Card className="apple-card">
                    <CardContent className="text-center py-12">
                      <Package className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">Aucun article trouvé</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' 
                          ? 'Aucun résultat pour ces critères.' 
                          : 'Créez votre premier article pour commencer.'}
                      </p>
                      <Button onClick={() => window.location.href = '/inventory/new'} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Ajouter un article
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {filteredInventory.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className="apple-card group hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-foreground">{item.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {categoryTranslations[item.category] || item.category}
                                {item.supplier && ` • ${item.supplier}`}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
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
                              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                                {formatCurrency(item.totalValue)}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <Badge className={getStatusBadgeClass(item.status)}>
                            {getStatusLabel(item.status)}
                          </Badge>
                          
                          <div className="flex gap-2">
                            <Link href={`/inventory/${item.id}`}>
                              <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Link href={`/inventory/${item.id}/edit`}>
                              <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </Link>
                            {(item.status === 'LOW_STOCK' || item.status === 'OUT_OF_STOCK') && (
                              <Button 
                                size="sm" 
                                onClick={() => handleRestock(item.id)}
                                className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 h-9 px-4"
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Réapprovisionner
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
              {filteredInventory.length === 0 && (
                <Card className="apple-card">
                  <CardContent className="text-center py-12">
                    <Package className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Aucun article trouvé</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' 
                        ? 'Aucun résultat pour ces critères.' 
                        : 'Créez votre premier article pour commencer.'}
                    </p>
                    <Button onClick={() => window.location.href = '/inventory/new'} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Ajouter un article
                    </Button>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Add Button - Mobile Only */}
        <div className="sm:hidden fixed bottom-6 right-6 z-50">
          <Link href="/inventory/new">
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