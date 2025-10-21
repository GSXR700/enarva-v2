// components/settings/GeneralSettings.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DollarSign, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Settings = {
  basePrices: { [key: string]: number }
}

const propertyTypeLabels: { [key: string]: string } = {
  APARTMENT_SMALL: 'Petit Appartement',
  APARTMENT_MEDIUM: 'Appartement Moyen',
  APARTMENT_MULTI: 'Appartement Multi-pièces',
  VILLA_LARGE: 'Grande Villa',
  COMMERCIAL: 'Commercial',
  HOTEL_STANDARD: 'Hôtel Standard',
  HOTEL_LUXURY: 'Hôtel Luxe',
  OFFICE: 'Bureau',
  RESIDENCE_B2B: 'Résidence B2B'
}

export function GeneralSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings')
        if (!response.ok) throw new Error('Impossible de charger les paramètres.')
        const data = await response.json()
        setSettings(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handlePriceChange = (propertyType: string, value: string) => {
    if (!settings) return
    const numericValue = parseFloat(value) || 0
    setSettings({
      ...settings,
      basePrices: {
        ...settings.basePrices,
        [propertyType]: numericValue
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settings) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (!response.ok) throw new Error('Erreur lors de la sauvegarde')
      
      toast.success('Paramètres sauvegardés avec succès !')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="thread-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-enarva-start" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="thread-card">
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <p>Erreur: {error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="thread-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-enarva-start" />
            Tarifs de Base par m²
          </CardTitle>
          <CardDescription>
            Ajustez les prix de base utilisés par le calculateur de devis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {settings && Object.entries(settings.basePrices).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key} className="text-sm font-medium">
                  {propertyTypeLabels[key] || key.replace(/_/g, ' ')}
                </Label>
                <div className="relative">
                  <Input
                    id={key}
                    type="number"
                    step="0.01"
                    value={value}
                    onChange={(e) => handlePriceChange(key, e.target.value)}
                    className="pr-8"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    MAD
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={isSaving}
          className="bg-enarva-gradient rounded-lg px-8"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sauvegarde...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder
            </>
          )}
        </Button>
      </div>
    </form>
  )
}