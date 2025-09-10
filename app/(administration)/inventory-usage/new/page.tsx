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
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react'
import { Inventory, Mission, Lead } from '@prisma/client'
import { toast } from 'sonner'

type MissionWithLead = Mission & { lead: Lead };

export default function NewInventoryUsagePage() {
  const router = useRouter()
  const [inventoryItems, setInventoryItems] = useState<Inventory[]>([])
  const [missions, setMissions] = useState<MissionWithLead[]>([])
  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    inventoryId: '',
    missionId: '',
    quantity: '',
    notes: ''
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [inventoryRes, missionsRes] = await Promise.all([
          fetch('/api/inventory'),
          fetch('/api/missions?status=IN_PROGRESS,SCHEDULED')
        ])

        if (!inventoryRes.ok || !missionsRes.ok) {
          throw new Error('Failed to fetch data')
        }

        const [inventoryData, missionsData] = await Promise.all([
          inventoryRes.json(),
          missionsRes.json()
        ])

        setInventoryItems(inventoryData.filter((item: Inventory) => Number(item.currentStock) > 0))
        setMissions(missionsData)
      } catch (error) {
        toast.error('Impossible de charger les données')
      }
    }

    fetchData()
  }, [])

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
  }

  const isStockSufficient = () => {
    if (!selectedInventory || !formData.quantity) return true
    return Number(formData.quantity) <= Number(selectedInventory.currentStock)
  }

  const willStockBeLow = () => {
    if (!selectedInventory || !formData.quantity) return false
    const remaining = Number(selectedInventory.currentStock) - Number(formData.quantity)
    return remaining <= Number(selectedInventory.minimumStock)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.inventoryId || !formData.missionId || !formData.quantity) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    if (!isStockSufficient()) {
      toast.error('Quantité insuffisante en stock')
      return
    }

    setIsLoading(true)

    try {
      const usageData = {
        inventoryId: formData.inventoryId,
        missionId: formData.missionId,
        quantity: parseFloat(formData.quantity),
        notes: formData.notes || null
      }

      const response = await fetch('/api/inventory-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usageData)
      })

      if (!response.ok) throw new Error('Failed to create inventory usage')

      toast.success('Utilisation d\'inventaire enregistrée avec succès!')
      router.push('/inventory-usage')
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="main-content space-y-6">
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selection */}
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Sélections</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="inventory">Article d'inventaire *</Label>
              <Select onValueChange={(value) => handleSelectChange('inventoryId', value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un article..." />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} - Stock: {Number(item.currentStock)} {item.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="mission">Mission *</Label>
              <Select onValueChange={(value) => handleSelectChange('missionId', value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une mission..." />
                </SelectTrigger>
                <SelectContent>
                  {missions.map((mission) => (
                    <SelectItem key={mission.id} value={mission.id}>
                      {mission.missionNumber} - {mission.lead.firstName} {mission.lead.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Quantity and Details */}
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Détails de l'utilisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="quantity">
                Quantité utilisée *
                {selectedInventory && (
                  <span className="text-sm text-muted-foreground ml-2">
                    (en {selectedInventory.unit})
                  </span>
                )}
              </Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0.01"
                max={selectedInventory ? Number(selectedInventory.currentStock) : undefined}
                value={formData.quantity}
                onChange={handleChange}
                required
              />
              
              {/* Stock Information */}
              {selectedInventory && (
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Stock actuel:</span>
                    <span className="font-medium">
                      {Number(selectedInventory.currentStock)} {selectedInventory.unit}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Stock minimum:</span>
                    <span className="font-medium">
                      {Number(selectedInventory.minimumStock)} {selectedInventory.unit}
                    </span>
                  </div>
                  
                  {formData.quantity && (
                    <div className="flex justify-between text-sm">
                      <span>Stock restant:</span>
                      <span className={`font-medium ${
                        Number(selectedInventory.currentStock) - Number(formData.quantity) <= Number(selectedInventory.minimumStock)
                          ? 'text-orange-600'
                          : 'text-green-600'
                      }`}>
                        {Number(selectedInventory.currentStock) - Number(formData.quantity)} {selectedInventory.unit}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Warnings */}
              {!isStockSufficient() && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 border border-red-200 rounded">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-600">Stock insuffisant</span>
                </div>
              )}
              
              {isStockSufficient() && willStockBeLow() && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span className="text-sm text-orange-600">
                    Attention: Le stock sera en dessous du minimum après cette utilisation
                  </span>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Notes sur cette utilisation d'inventaire..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {selectedInventory && formData.quantity && (
          <Card className="thread-card">
            <CardHeader>
              <CardTitle>Résumé</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Article:</span>
                  <span className="font-medium">{selectedInventory.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quantité utilisée:</span>
                  <span className="font-medium">{formData.quantity} {selectedInventory.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span>Coût unitaire:</span>
                  <span className="font-medium">{Number(selectedInventory.unitPrice)} MAD</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span>Coût total:</span>
                  <span className="font-bold text-lg">
                    {(Number(formData.quantity) * Number(selectedInventory.unitPrice)).toFixed(2)} MAD
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={isLoading || !isStockSufficient()}
            className="bg-enarva-gradient rounded-lg px-8"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Enregistrement...' : 'Enregistrer l\'Utilisation'}
          </Button>
        </div>
      </form>
    </div>
  )
}