// app/inventory/new/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, PackagePlus } from 'lucide-react'

export default function NewInventoryItemPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    category: 'CLEANING_PRODUCTS',
    unit: '',
    currentStock: '',
    minimumStock: '',
    unitPrice: '',
    supplier: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }
  
  const handleSelectChange = (id: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Échec de l\'ajout de l\'article.')
      }

      router.push('/inventory')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="main-content space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/inventory">
          <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Ajouter un Article à l'Inventaire</h1>
          <p className="text-muted-foreground mt-1">Renseignez les détails du nouveau produit ou équipement.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Détails de l'Article</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">Nom de l'article</Label>
              <Input id="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="category">Catégorie</Label>
              <Select value={formData.category} onValueChange={(value) => handleSelectChange('category', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLEANING_PRODUCTS">Produits de nettoyage</SelectItem>
                  <SelectItem value="EQUIPMENT">Équipement</SelectItem>
                  <SelectItem value="CONSUMABLES">Consommables</SelectItem>
                  <SelectItem value="PROTECTIVE_GEAR">Équipement de protection</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="unit">Unité de mesure</Label>
              <Input id="unit" value={formData.unit} onChange={handleChange} placeholder="ex: Litre, Pièce, Kg" required />
            </div>
             <div>
              <Label htmlFor="supplier">Fournisseur (optionnel)</Label>
              <Input id="supplier" value={formData.supplier} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="currentStock">Stock Actuel</Label>
              <Input id="currentStock" type="number" step="0.01" value={formData.currentStock} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="minimumStock">Stock Minimum Requis</Label>
              <Input id="minimumStock" type="number" step="0.01" value={formData.minimumStock} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="unitPrice">Prix Unitaire (MAD)</Label>
              <Input id="unitPrice" type="number" step="0.01" value={formData.unitPrice} onChange={handleChange} required />
            </div>
          </CardContent>
        </Card>

        {error && <p className="mt-4 text-red-500 text-sm text-center">{error}</p>}

        <div className="flex justify-end mt-6">
          <Button type="submit" className="bg-enarva-gradient rounded-lg px-8" disabled={isLoading}>
            <PackagePlus className="w-4 h-4 mr-2" />
            {isLoading ? 'Ajout en cours...' : 'Ajouter à l\'Inventaire'}
          </Button>
        </div>
      </form>
    </div>
  )
}