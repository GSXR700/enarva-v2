// app/(administration)/billing/page.tsx - COMPLETE VERSION WITH DOWNLOAD
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, FileText, Download, Eye, TrendingUp, TrendingDown, DollarSign, Search } from 'lucide-react'
import { Invoice, Lead, Mission } from '@prisma/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

type InvoiceWithRelations = Invoice & { 
  lead: Lead;
  mission: Mission | null;
};

export default function BillingPage() {
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await fetch('/api/invoices');
        if (!response.ok) throw new Error('Impossible de charger les factures.');
        const data = await response.json();
        setInvoices(data);
        setFilteredInvoices(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [invoices, searchTerm, statusFilter]);

  const filterInvoices = () => {
    let filtered = [...invoices];

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(inv => inv.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(term) ||
        inv.lead.firstName.toLowerCase().includes(term) ||
        inv.lead.lastName.toLowerCase().includes(term) ||
        inv.lead.company?.toLowerCase().includes(term)
      );
    }

    setFilteredInvoices(filtered);
  };

  const handleDownload = async (invoiceId: string, invoiceNumber: string) => {
    setDownloadingId(invoiceId)
    
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/download`)
      if (!response.ok) throw new Error('Erreur lors du téléchargement')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Facture_${invoiceNumber.replace(/\//g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('PDF téléchargé avec succès')
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Erreur lors du téléchargement du PDF')
    } finally {
      setDownloadingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      SENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      PAID: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    };
    return styles[status] || styles.DRAFT;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      DRAFT: 'Brouillon',
      SENT: 'Envoyée',
      PAID: 'Payée',
      OVERDUE: 'En retard',
      CANCELLED: 'Annulée'
    };
    return labels[status] || status;
  };
  
  if (isLoading) {
    return <TableSkeleton title="Facturation" />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="shadow-lg border-red-200 dark:border-red-800">
            <CardContent className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <FileText className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-red-600 mb-2">Erreur de chargement</h3>
              <p className="text-muted-foreground">{error}</p>
              <Button 
                onClick={() => window.location.reload()} 
                className="mt-4"
                variant="outline"
              >
                Réessayer
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const paidAmount = invoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + Number(inv.amount), 0);
  const pendingAmount = invoices.filter(inv => inv.status === 'SENT').reduce((sum, inv) => sum + Number(inv.amount), 0);
  const overdueAmount = invoices.filter(inv => inv.status === 'OVERDUE').reduce((sum, inv) => sum + Number(inv.amount), 0);

  const paidCount = invoices.filter(inv => inv.status === 'PAID').length;
  const pendingCount = invoices.filter(inv => inv.status === 'SENT').length;
  const overdueCount = invoices.filter(inv => inv.status === 'OVERDUE').length;

  const collectionRate = totalAmount > 0 ? (paidAmount / totalAmount * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Facturation
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {invoices.length} facture{invoices.length > 1 ? 's' : ''} • Taux de recouvrement: {collectionRate}%
            </p>
          </div>
          <Link href="/billing/new">
            <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all">
              <Plus className="w-4 h-4" />
              Nouvelle Facture
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase font-medium tracking-wide">Total Facturé</p>
                  <p className="text-2xl font-bold mt-1 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                    {formatCurrency(totalAmount)}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-600 font-medium">+12.5% ce mois</span>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl shadow-inner">
                  <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase font-medium tracking-wide">Payé</p>
                  <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
                    {formatCurrency(paidAmount)}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-xs text-muted-foreground font-medium">
                      {paidCount} facture{paidCount > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-xl shadow-inner">
                  <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase font-medium tracking-wide">En Attente</p>
                  <p className="text-2xl font-bold mt-1 text-orange-600 dark:text-orange-400">
                    {formatCurrency(pendingAmount)}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-xs text-muted-foreground font-medium">
                      {pendingCount} facture{pendingCount > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 rounded-xl shadow-inner">
                  <FileText className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase font-medium tracking-wide">En Retard</p>
                  <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">
                    {formatCurrency(overdueAmount)}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingDown className="w-3 h-3 text-red-500" />
                    <span className="text-xs text-red-600 font-medium">
                      {overdueCount} facture{overdueCount > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-xl shadow-inner">
                  <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg border-t-4 border-t-blue-500">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Toutes les Factures
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={statusFilter === 'ALL' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('ALL')}
                  >
                    Tous
                  </Button>
                  <Button
                    variant={statusFilter === 'SENT' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('SENT')}
                  >
                    Envoyées
                  </Button>
                  <Button
                    variant={statusFilter === 'PAID' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('PAID')}
                  >
                    Payées
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase bg-gradient-to-r from-muted/50 to-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">N° Facture</th>
                    <th className="px-4 py-3 text-left font-semibold">Client</th>
                    <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Date Émission</th>
                    <th className="px-4 py-3 text-left font-semibold hidden lg:table-cell">Date Échéance</th>
                    <th className="px-4 py-3 text-left font-semibold">Montant</th>
                    <th className="px-4 py-3 text-left font-semibold">Statut</th>
                    <th className="px-4 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice, index) => (
                    <tr 
                      key={invoice.id} 
                      className={`border-b hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-purple-50/30 dark:hover:from-blue-950/10 dark:hover:to-purple-950/10 transition-all duration-200 ${
                        index % 2 === 0 ? 'bg-gray-50/30 dark:bg-gray-800/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 text-sm">
                          {invoice.invoiceNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {invoice.lead.firstName} {invoice.lead.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.lead.company || 'Particulier'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(invoice.issueDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(invoice.dueDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(Number(invoice.amount))}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getStatusBadge(invoice.status)}>
                          {getStatusLabel(invoice.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link href={`/billing/${invoice.id}`}>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDownload(invoice.id, invoice.invoiceNumber)}
                            disabled={downloadingId === invoice.id}
                            className="hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600"
                          >
                            {downloadingId === invoice.id ? (
                              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredInvoices.length === 0 && (
              <div className="text-center py-16 px-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 mb-4">
                  <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  {searchTerm || statusFilter !== 'ALL' ? 'Aucun résultat' : 'Aucune facture'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== 'ALL' 
                    ? 'Essayez de modifier vos critères de recherche'
                    : 'Commencez par créer votre première facture'}
                </p>
                {!searchTerm && statusFilter === 'ALL' && (
                  <Link href="/billing/new">
                    <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      <Plus className="w-4 h-4" />
                      Créer une facture
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}