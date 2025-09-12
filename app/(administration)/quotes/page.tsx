// app/(administration)/quotes/page.tsx - VERSION CORRIGÉE
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PlusCircle, Download, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'
import { formatCurrency } from '@/lib/utils'

interface Quote {
  id: string
  quoteNumber: string
  status: string
  finalPrice: any // Prisma Decimal type
  createdAt: string
  lead: {
    id: string
    firstName: string
    lastName: string
    company?: string
  }
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const response = await fetch('/api/quotes')
        if (!response.ok) {
          throw new Error('Failed to fetch quotes')
        }
        const data = await response.json()
        setQuotes(data)
      } catch (error) {
        console.error('Error fetching quotes:', error)
        toast.error('Erreur lors du chargement des devis')
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuotes()
  }, [])

  // Fonction pour convertir correctement les Decimal de Prisma
  const safeFormatCurrency = (value: any): string => {
    if (!value) return formatCurrency(0)
    
    let numericValue: number
    
    // Si c'est un objet Decimal de Prisma
    if (typeof value === 'object' && value !== null) {
      if (typeof value.toNumber === 'function') {
        numericValue = value.toNumber()
      } else if (typeof value.toString === 'function') {
        numericValue = parseFloat(value.toString())
      } else {
        numericValue = 0
      }
    } 
    // Si c'est déjà un nombre
    else if (typeof value === 'number') {
      numericValue = value
    }
    // Si c'est une string
    else if (typeof value === 'string') {
      numericValue = parseFloat(value)
    }
    // Fallback
    else {
      numericValue = 0
    }

    // Vérifier si la conversion a réussi
    if (isNaN(numericValue)) {
      console.warn('Invalid price value:', value)
      return formatCurrency(0)
    }

    return formatCurrency(numericValue)
  }

  const handleDownload = async (quoteId: string) => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}/download`)
      if (!response.ok) {
        throw new Error('Failed to download quote')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `devis-${quoteId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Devis téléchargé avec succès')
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Erreur lors du téléchargement du devis')
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'secondary'
      case 'SENT': return 'default'
      case 'ACCEPTED': return 'success'
      case 'REJECTED': return 'destructive'
      default: return 'outline'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'Brouillon'
      case 'SENT': return 'Envoyé'
      case 'VIEWED': return 'Consulté'
      case 'ACCEPTED': return 'Accepté'
      case 'REJECTED': return 'Refusé'
      case 'EXPIRED': return 'Expiré'
      case 'CANCELLED': return 'Annulé'
      default: return status
    }
  }

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Devis</h1>
          <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Nouveau Devis
          </Button>
        </div>
        <TableSkeleton title="Chargement des devis..." />
      </div>
    )
  }

  return (
    <div className="main-content">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Devis</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos devis et propositions commerciales
          </p>
        </div>
        <Link href="/quotes/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Nouveau Devis
          </Button>
        </Link>
      </div>

      <Card className="thread-card">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.length > 0 ? (
                quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {quote.lead.company ? (
                            <>
                              {quote.lead.company}
                              <div className="text-sm text-muted-foreground">
                                {quote.lead.firstName} {quote.lead.lastName}
                              </div>
                            </>
                          ) : (
                            `${quote.lead.firstName} ${quote.lead.lastName}`
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {quote.quoteNumber}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(quote.createdAt).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {safeFormatCurrency(quote.finalPrice)} MAD
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(quote.status)}>
                        {getStatusLabel(quote.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(quote.id)}
                          title="Télécharger le PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Link href={`/quotes/${quote.id}/edit`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Modifier le devis"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Supprimer le devis"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="text-muted-foreground">
                      <PlusCircle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-lg font-medium">Aucun devis trouvé</p>
                      <p className="text-sm mt-1">
                        Commencez par créer votre premier devis
                      </p>
                      <Link href="/quotes/new" className="mt-4 inline-block">
                        <Button>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Créer un devis
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}