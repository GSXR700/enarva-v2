// app/(administration)/billing/[id]/page.tsx - FIXED
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Download, FileText, User, Calendar, DollarSign, Building } from 'lucide-react'
import { Invoice, Lead, Mission } from '@prisma/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

type InvoiceWithRelations = Invoice & {
  lead: Lead;
  mission: Mission | null;
};

export default function InvoicePage() {
  const params = useParams()
  const [invoice, setInvoice] = useState<InvoiceWithRelations | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchInvoice()
    }
  }, [params.id])

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${params.id}`)
      if (!response.ok) throw new Error('Facture introuvable')
      const data = await response.json()
      setInvoice(data)
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!invoice) return
    setIsDownloading(true)

    try {
      const response = await fetch(`/api/invoices/${invoice.id}/download`)
      if (!response.ok) throw new Error('Erreur lors du téléchargement')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Facture_${invoice.invoiceNumber.replace(/\//g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('PDF téléchargé avec succès')
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Erreur lors du téléchargement du PDF')
    } finally {
      setIsDownloading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      DRAFT: { className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', label: 'Brouillon' },
      SENT: { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', label: 'Envoyée' },
      PAID: { className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Payée' },
      OVERDUE: { className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: 'En retard' },
      CANCELLED: { className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', label: 'Annulée' }
    }
    const statusConfig = config[status as keyof typeof config] || config.DRAFT
    return <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="grid gap-6">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
        <div className="max-w-5xl mx-auto">
          <Card className="shadow-lg border-red-200 dark:border-red-800">
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-600 mb-2">Facture introuvable</h3>
              <p className="text-muted-foreground mb-4">{error || 'Cette facture n\'existe pas'}</p>
              <Link href="/billing">
                <Button variant="outline">Retour aux factures</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Link href="/billing">
              <Button variant="outline" size="icon" className="shadow-sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Facture {invoice.invoiceNumber}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Détails de la facture
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {isDownloading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Téléchargement...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Télécharger PDF
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Invoice Status Card */}
        <Card className="shadow-lg border-t-4 border-t-blue-500">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Informations Générales
              </CardTitle>
              {getStatusBadge(invoice.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Numéro de facture</p>
                    <p className="font-mono font-semibold text-blue-600">{invoice.invoiceNumber}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date d'émission</p>
                    <p className="font-semibold">{formatDate(invoice.issueDate)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date d'échéance</p>
                    <p className="font-semibold">{formatDate(invoice.dueDate)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Montant TTC</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(Number(invoice.amount))}
                    </p>
                  </div>
                </div>

                {invoice.mission && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Mission associée</p>
                      <p className="font-semibold">{invoice.mission.missionNumber}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {invoice.description && (
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{invoice.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Information Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Informations Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Nom complet</p>
                  <p className="font-semibold text-lg">
                    {invoice.lead.firstName} {invoice.lead.lastName}
                  </p>
                </div>

                {invoice.lead.company && (
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Entreprise</p>
                      <p className="font-medium">{invoice.lead.company}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Téléphone</p>
                  <p className="font-medium">{invoice.lead.phone}</p>
                </div>

                {invoice.lead.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{invoice.lead.email}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}