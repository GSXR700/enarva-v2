// app/(administration)/inventory/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Package, AlertTriangle } from 'lucide-react'
import { Inventory } from '@prisma/client'
import { formatCurrency } from '@/lib/utils'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'

export default function InventoryPage() {
  const [items, setItems] = useState<Inventory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch('/api/inventory');
        if (!response.ok) throw new Error('Impossible de charger l\'inventaire.');
        const data = await response.json();
        setItems(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchItems();
  }, []);

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
        CLEANING_PRODUCTS: "Produits de nettoyage",
        EQUIPMENT: "Équipement",
        CONSUMABLES: "Consommables",
        PROTECTIVE_GEAR: "Équipement de protection",
    };
    return labels[category] || category;
  };
  
  if (isLoading) {
    return <TableSkeleton title="Gestion de l'Inventaire" />;
  }

  if (error) {
    return <div className="main-content text-center p-10 text-red-500">Erreur: {error}</div>;
  }

  return (
    <div className="main-content space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gestion de l'Inventaire</h1>
          <p className="text-muted-foreground mt-1">{items.length} articles en stock</p>
        </div>
        <Link href="/inventory/new">
            <Button className="gap-2 bg-enarva-gradient rounded-lg"><Plus className="w-4 h-4" />Produit</Button>
        </Link>
      </div>
      <Card className="thread-card">
        <CardHeader><CardTitle>Stock Actuel</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary">
                    <tr>
                        <th scope="col" className="px-6 py-3">Article</th>
                        <th scope="col" className="px-6 py-3">Catégorie</th>
                        <th scope="col" className="px-6 py-3">Stock Actuel</th>
                        <th scope="col" className="px-6 py-3">Stock Min.</th>
                        <th scope="col" className="px-6 py-3">Prix Unitaire</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map(item => {
                        const isLowStock = Number(item.currentStock) <= Number(item.minimumStock);
                        return (
                            <tr key={item.id} className="bg-card border-b">
                                <th scope="row" className="px-6 py-4 font-medium text-foreground whitespace-nowrap">{item.name}</th>
                                <td className="px-6 py-4">{getCategoryLabel(item.category)}</td>
                                <td className={`px-6 py-4 font-bold ${isLowStock ? 'text-red-500' : ''}`}>
                                    <div className="flex items-center gap-2">
                                        {isLowStock && <AlertTriangle className="w-4 h-4" />}
                                        {Number(item.currentStock)} {item.unit}
                                    </div>
                                </td>
                                <td className="px-6 py-4">{Number(item.minimumStock)} {item.unit}</td>
                                <td className="px-6 py-4">{formatCurrency(Number(item.unitPrice))}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
          </div>
          {items.length === 0 && (
            <div className="text-center py-10">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium text-foreground">Aucun article dans l'inventaire</h3>
                <p className="mt-1 text-sm text-muted-foreground">Commencez par ajouter votre premier produit.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}