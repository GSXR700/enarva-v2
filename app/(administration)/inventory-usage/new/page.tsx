// app/(administration)/inventory-usage/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Save, AlertTriangle, Package, Calendar } from 'lucide-react'
import { Inventory, Mission, Lead } from '@prisma/client'
import { toast } from 'sonner'

type MissionWithLead = Mission & { lead: Lead };

export default function NewInventoryUsagePage() {
  const router = useRouter()
  const [inventoryItems, setInventoryItems] = useState<Inventory[]>([])
  const [missions, setMissions] = useState<MissionWithLead[]>([])
  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null)
  const [selectedMission, setSelectedMission] = useState<MissionWithLead | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    inventoryId: '',
    missionId: '',
    quantity: '',
    notes: ''
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsDataLoading(true)
        setError(null)

        // Fetch inventory and missions separately with better error handling
        const inventoryPromise = fetch('/api/inventory').then(async (res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch inventory: ${res.status}`)
          }
          return res.json()
        })

        // Try different approaches to get missions
        const missionsPromise = fetchMissions()

        const [inventoryData, missionsData] = await Promise.all([
          inventoryPromise,
          missionsPromise
        ])

        console.log('Inventory data:', inventoryData)
        console.log('Missions data:', missionsData)

        // Handle inventory data (could be direct array or object with items)
        let inventoryItems: Inventory[] = []
        if (Array.isArray(inventoryData)) {
          inventoryItems = inventoryData
        } else if (inventoryData.items && Array.isArray(inventoryData.items)) {
          inventoryItems = inventoryData.items
        }

        // Filter items with stock > 0
        const availableItems = inventoryItems.filter((item: Inventory) => {
          const stock = Number(item.currentStock) || 0
          return stock > 0
        })

        console.log('Available inventory items:', availableItems)

        setInventoryItems(availableItems)
        setMissions(missionsData || [])
      } catch (error: any) {
        console.error('Error fetching data:', error)
        setError(error.message || 'Impossible de charger les données')
        toast.error('Impossible de charger les données')
      } finally {
        setIsDataLoading(false)
      }
    }

    fetchData()
  }, [])

  const fetchMissions = async (): Promise<MissionWithLead[]> => {
    try {
      // Try to get all missions first
      console.log('Fetching missions...')
      const response = await fetch('/api/missions')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch missions: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Missions API response:', data)
      
      // Handle different response formats
      let allMissions: MissionWithLead[] = []
      if (Array.isArray(data)) {
        allMissions = data
      } else if (data.missions && Array.isArray(data.missions)) {
        allMissions = data.missions
      } else if (data.data && Array.isArray(data.data)) {
        allMissions = data.data
      }

      // Filter for active missions (IN_PROGRESS, SCHEDULED, or any status that makes sense)
      const activeMissions = allMissions.filter((mission: Mission) => {
        const validStatuses = ['SCHEDULED', 'IN_PROGRESS', 'PENDING', 'CONFIRMED', 'READY']
        return validStatuses.includes(mission.status)
      })

      console.log('Filtered active missions:', activeMissions)
      return activeMissions
    } catch (error) {
      console.error('Error fetching missions:', error)
      // Return empty array instead of throwing to prevent complete failure
      return []
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (id: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }))
    
    if (id === 'inventoryId') {
      const selected = inventoryItems.find(item => item.id === value)
      setSelectedInventory(selected || null)
    }

    if (id === 'missionId') {
      const selected = missions.find(mission => mission.id === value)
      setSelectedMission(selected || null)
    }
  }

  const isStockSufficient = () => {
    if (!selectedInventory || !formData.quantity) return true
    const requestedQuantity = parseFloat(formData.quantity)
    const availableStock = Number(selectedInventory.currentStock)
    return requestedQuantity <= availableStock
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.inventoryId || !formData.missionId || !formData.quantity) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    if (!isStockSufficient()) {
      toast.error('Stock insuffisant pour cette quantité')
      return
    }

    const quantity = parseFloat(formData.quantity)
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('La quantité doit être un nombre positif')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/inventory-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryId: formData.inventoryId,
          missionId: formData.missionId,
          quantity: quantity,
          notes: formData.notes.trim() || null
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData || 'Échec de l\'enregistrement de l\'utilisation')
      }

      toast.success('Utilisation d\'inventaire enregistrée avec succès !')
      router.push('/inventory-usage')
      router.refresh()
    } catch (err: any) {
      console.error('Error creating inventory usage:', err)
      toast.error(err.message || 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state
  if (isDataLoading) {
    return (
      <div className="main-content">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Chargement des données...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="main-content">
        <Alert className="max-w-md mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              onClick={() => window.location.reload()} 
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/inventory-usage">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Nouvelle Utilisation d'Inventaire
          </h1>
          <p className="text-muted-foreground mt-1">
            Enregistrez l'utilisation d'un article d'inventaire sur une mission
          </p>
        </div>
      </div>

      {/* Data Status Alerts */}
      {inventoryItems.length === 0 && (
        <Alert>
          <Package className="h-4 w-4" />
          <AlertDescription>
            Aucun article d'inventaire disponible. 
            <Link href="/inventory" className="ml-2 underline text-blue-600">
              Ajouter des articles à l'inventaire
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {missions.length === 0 && (
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertDescription>
            Aucune mission active disponible. 
            <Link href="/missions" className="ml-2 underline text-blue-600">
              Créer ou vérifier les missions
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selections */}
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Sélections</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inventory Item */}
            <div>
              <Label htmlFor="inventoryId">Article d'inventaire *</Label>
              <Select 
                value={formData.inventoryId} 
                onValueChange={(value) => handleSelectChange('inventoryId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un article..." />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{item.name}</span>
                        <span className="text-muted-foreground text-sm ml-2">
                          Stock: {Number(item.currentStock)} {item.unit}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedInventory && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                  <p><strong>Catégorie:</strong> {selectedInventory.category}</p>
                  <p><strong>Stock disponible:</strong> {Number(selectedInventory.currentStock)} {selectedInventory.unit}</p>
                  {selectedInventory.supplier && (
                    <p><strong>Fournisseur:</strong> {selectedInventory.supplier}</p>
                  )}
                </div>
              )}
            </div>

            {/* Mission */}
            <div>
              <Label htmlFor="missionId">Mission *</Label>
              <Select 
                value={formData.missionId} 
                onValueChange={(value) => handleSelectChange('missionId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une mission..." />
                </SelectTrigger>
                <SelectContent>
                  {missions.map(mission => (
                    <SelectItem key={mission.id} value={mission.id}>
                      <div className="flex flex-col">
                        <span>{mission.missionNumber}</span>
                        {mission.lead && (
                          <span className="text-muted-foreground text-sm">
                            {mission.lead.firstName} {mission.lead.lastName} - {mission.address}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedMission && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                  <p><strong>Client:</strong> {selectedMission.lead?.firstName} {selectedMission.lead?.lastName}</p>
                  <p><strong>Adresse:</strong> {selectedMission.address}</p>
                  <p><strong>Date prévue:</strong> {new Date(selectedMission.scheduledDate).toLocaleDateString('fr-FR')}</p>
                  <p><strong>Statut:</strong> {selectedMission.status}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage Details */}
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Détails de l'utilisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="quantity">Quantité utilisée *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="0.00"
                required
              />
              {selectedInventory && formData.quantity && (
                <div className="mt-1">
                  {isStockSufficient() ? (
                    <p className="text-green-600 text-sm">
                      ✓ Stock suffisant ({Number(selectedInventory.currentStock)} {selectedInventory.unit} disponibles)
                    </p>
                  ) : (
                    <p className="text-red-600 text-sm">
                      ⚠️ Stock insuffisant (seulement {Number(selectedInventory.currentStock)} {selectedInventory.unit} disponibles)
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Notes sur l'utilisation de cet article..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/inventory-usage">
            <Button type="button" variant="outline">
              Annuler
            </Button>
          </Link>
          <Button 
            type="submit" 
            disabled={isLoading || !isStockSufficient() || inventoryItems.length === 0 || missions.length === 0}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Enregistrer l'utilisation
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}