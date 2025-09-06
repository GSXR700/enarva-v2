// gsxr700/enarva-v2/enarva-v2-6ca61289d3a555c270f0a2db9f078e282ccd8664/app/(administration)/inventory/[id]/edit/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Inventory, ProductCategory } from '@prisma/client'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'

export default function EditInventoryItemPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;

  const [formData, setFormData] = useState<Partial<Inventory>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchItem = useCallback(async () => {
    try {
      const response = await fetch(`/api/inventory/${itemId}`);
      if (!response.ok) throw new Error("Article non trouvé.");
      const data = await response.json();
      setFormData(data);
    } catch (error) {
      toast.error("Impossible de charger les données de l'article.");
      router.push('/inventory');
    } finally {
      setIsLoading(false);
    }
  }, [itemId, router]);

  useEffect(() => {
    if (itemId) {
        fetchItem();
    }
  }, [itemId, fetchItem]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: keyof Inventory, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value as any }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch(`/api/inventory/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "La mise à jour a échoué.");
      }
      
      toast.success("Article mis à jour avec succès !");
      router.push('/inventory');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <TableSkeleton title="Chargement de l'article..." />;
  }

  return (
    <div className="main-content space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/inventory">
          <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Modifier un Article</h1>
          <p className="text-muted-foreground mt-1">Mise à jour des informations pour : {formData.name}.</p>
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
              <Input id="name" value={formData.name || ''} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="category">Catégorie</Label>
              <Select value={formData.category} onValueChange={(value) => handleSelectChange('category', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ProductCategory.CLEANING_PRODUCTS}>Produits de nettoyage</SelectItem>
                  <SelectItem value={ProductCategory.EQUIPMENT}>Équipement</SelectItem>
                  <SelectItem value={ProductCategory.CONSUMABLES}>Consommables</SelectItem>
                  <SelectItem value={ProductCategory.PROTECTIVE_GEAR}>Équipement de protection</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="unit">Unité de mesure</Label>
              <Input id="unit" value={formData.unit || ''} onChange={handleChange} placeholder="ex: Litre, Pièce, Kg" required />
            </div>
             <div>
              <Label htmlFor="supplier">Fournisseur (optionnel)</Label>
              <Input id="supplier" value={formData.supplier || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="currentStock">Stock Actuel</Label>
              <Input id="currentStock" type="number" step="0.01" value={formData.currentStock?.toString() || ''} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="minimumStock">Stock Minimum Requis</Label>
              <Input id="minimumStock" type="number" step="0.01" value={formData.minimumStock?.toString() || ''} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="unitPrice">Prix Unitaire (MAD)</Label>
              <Input id="unitPrice" type="number" step="0.01" value={formData.unitPrice?.toString() || ''} onChange={handleChange} required />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end mt-6">
          <Button type="submit" className="bg-enarva-gradient rounded-lg px-8" disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
          </Button>
        </div>
      </form>
    </div>
  )
}