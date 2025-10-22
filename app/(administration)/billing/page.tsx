// app/(administration)/billing/page.tsx - APPLE DESIGN TEMPLATE - MOBILE OPTIMIZED
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, FileText, Download, Eye, TrendingUp, DollarSign, Search, CreditCard, List, Grid3x3, MoreVertical } from 'lucide-react'
import { Invoice, Lead, Mission } from '@prisma/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu'

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
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards')

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
      <div className="min-h-screen p-4 md:p-6">
        <div className="max-w-[95vw] md:max-w-[1400px] mx-auto">
          <Card className="apple-card border-red-200 dark:border-red-800">
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

  const totalAmount = invoices.reduce((sum, inv) => sum + (Number(inv.amount) * 1.20), 0);
  const paidAmount = invoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + (Number(inv.amount) * 1.20), 0);
  const pendingAmount = invoices.filter(inv => inv.status === 'SENT').reduce((sum, inv) => sum + (Number(inv.amount) * 1.20), 0);
  const overdueAmount = invoices.filter(inv => inv.status === 'OVERDUE').reduce((sum, inv) => sum + (Number(inv.amount) * 1.20), 0);

  const paidCount = invoices.filter(inv => inv.status === 'PAID').length;
  const pendingCount = invoices.filter(inv => inv.status === 'SENT').length;
  const overdueCount = invoices.filter(inv => inv.status === 'OVERDUE').length;

  const collectionRate = totalAmount > 0 ? (paidAmount / totalAmount * 100).toFixed(1) : 0;

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
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm">
              <FileText className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
                Facturation
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-sm font-semibold">
                  {invoices.length}
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Taux de recouvrement: {collectionRate}%
              </p>
            </div>
          </div>
          <Link href="/billing/new" className="hidden sm:block">
            <Button className="gap-2 h-11 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all">
              <Plus className="w-4 h-4" />
              Nouvelle Facture
            </Button>
          </Link>
        </motion.div>

        {/* Stats Cards - Mobile Optimized (Minimized on Mobile like Leads Page) */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
        >
          <motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ duration: 0.2 }}>
            <Card className="apple-card group relative overflow-hidden border-l-4 border-l-blue-500">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-3 md:p-5 relative">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-[10px] md:text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1 md:mb-2">Total Facturé</p>
                    <p className="text-lg md:text-2xl font-bold text-blue-600 dark:text-blue-400 mb-0.5 md:mb-1">{formatCurrency(totalAmount)}</p>
                    <div className="flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground">
                      <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3" />
                      <span className="hidden md:inline">{invoices.length} facture{invoices.length > 1 ? 's' : ''}</span>
                      <span className="md:hidden">{invoices.length}</span>
                    </div>
                  </div>
                  <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 backdrop-blur-sm">
                    <DollarSign className="w-4 h-4 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ duration: 0.2 }}>
            <Card className="apple-card group relative overflow-hidden border-l-4 border-l-green-500">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-3 md:p-5 relative">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-[10px] md:text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1 md:mb-2">Payées</p>
                    <p className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400 mb-0.5 md:mb-1">{formatCurrency(paidAmount)}</p>
                    <div className="flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground">
                      <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3" />
                      <span className="hidden md:inline">{paidCount} facture{paidCount > 1 ? 's' : ''}</span>
                      <span className="md:hidden">{paidCount}</span>
                    </div>
                  </div>
                  <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 backdrop-blur-sm">
                    <FileText className="w-4 h-4 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ duration: 0.2 }}>
            <Card className="apple-card group relative overflow-hidden border-l-4 border-l-yellow-500">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-3 md:p-5 relative">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-[10px] md:text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1 md:mb-2">En Attente</p>
                    <p className="text-lg md:text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-0.5 md:mb-1">{formatCurrency(pendingAmount)}</p>
                    <div className="flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground">
                      <FileText className="w-2.5 h-2.5 md:w-3 md:h-3" />
                      <span className="hidden md:inline">{pendingCount} facture{pendingCount > 1 ? 's' : ''}</span>
                      <span className="md:hidden">{pendingCount}</span>
                    </div>
                  </div>
                  <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 backdrop-blur-sm">
                    <FileText className="w-4 h-4 md:w-6 md:h-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ duration: 0.2 }}>
            <Card className="apple-card group relative overflow-hidden border-l-4 border-l-red-500">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-3 md:p-5 relative">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-[10px] md:text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1 md:mb-2">En Retard</p>
                    <p className="text-lg md:text-2xl font-bold text-red-600 dark:text-red-400 mb-0.5 md:mb-1">{formatCurrency(overdueAmount)}</p>
                    <div className="flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground">
                      <FileText className="w-2.5 h-2.5 md:w-3 md:h-3" />
                      <span className="hidden md:inline">{overdueCount} facture{overdueCount > 1 ? 's' : ''}</span>
                      <span className="md:hidden">{overdueCount}</span>
                    </div>
                  </div>
                  <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 backdrop-blur-sm">
                    <FileText className="w-4 h-4 md:w-6 md:h-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Filters & View Toggle - Better Aligned with Select Dropdown */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="sticky top-0 z-40 backdrop-blur-lg bg-background/80 -mx-4 md:-mx-6 px-4 md:px-6 py-4 border-y"
        >
          <Card className="apple-card border-border/50">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par numéro, client..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 rounded-xl border-border/50 focus-visible:ring-2"
                  />
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status Filter - Now with Select Dropdown */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-11 w-[140px] rounded-xl">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tous</SelectItem>
                      <SelectItem value="SENT">Envoyées</SelectItem>
                      <SelectItem value="PAID">Payées</SelectItem>
                      <SelectItem value="OVERDUE">En retard</SelectItem>
                      <SelectItem value="DRAFT">Brouillons</SelectItem>
                      <SelectItem value="CANCELLED">Annulées</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="h-6 w-px bg-border hidden md:block" />

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
                      variant={viewMode === 'table' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('table')}
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
          {viewMode === 'table' ? (
            <motion.div
              key="table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="apple-card overflow-hidden">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs uppercase bg-muted/50 backdrop-blur-sm sticky top-0 z-10">
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
                          <motion.tr 
                            key={invoice.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="border-b hover:bg-accent/50 transition-colors duration-200"
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
                                {formatCurrency(Number(invoice.amount) * 1.20)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={getStatusBadge(invoice.status)}>
                                {getStatusLabel(invoice.status)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                <Link href={`/billing/${invoice.id}`}>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-accent"
                                    title="Voir détails"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </Link>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDownload(invoice.id, invoice.invoiceNumber)}
                                  disabled={downloadingId === invoice.id}
                                  className="h-8 w-8 p-0 hover:bg-accent"
                                  title="Télécharger PDF"
                                >
                                  {downloadingId === invoice.id ? (
                                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Download className="w-4 h-4" />
                                  )}
                                </Button>
                                {invoice.status !== 'PAID' && (
                                  <Link href={`/billing/${invoice.id}`}>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-accent"
                                      title="Enregistrer un paiement"
                                    >
                                      <CreditCard className="w-4 h-4" />
                                    </Button>
                                  </Link>
                                )}
                              </div>
                            </td>
                          </motion.tr>
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
                          <Button className="gap-2">
                            <Plus className="w-4 h-4" />
                            Créer une facture
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="cards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {filteredInvoices.map((invoice, index) => (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                >
                  <Card className="apple-card group cursor-pointer h-full" onClick={() => window.location.href = `/billing/${invoice.id}`}>
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-semibold truncate mb-1">
                            {invoice.lead.firstName} {invoice.lead.lastName}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground truncate">{invoice.lead.company || 'Particulier'}</p>
                        </div>
                        {/* 3-Dot Menu - Always Visible on Mobile, Hover on Desktop */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.location.href = `/billing/${invoice.id}`; }}>
                              <Eye className="w-4 h-4 mr-2" />
                              Voir détails
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownload(invoice.id, invoice.invoiceNumber); }}>
                              <Download className="w-4 h-4 mr-2" />
                              Télécharger PDF
                            </DropdownMenuItem>
                            {invoice.status !== 'PAID' && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.location.href = `/billing/${invoice.id}`; }}>
                                <CreditCard className="w-4 h-4 mr-2" />
                                Enregistrer paiement
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
                          {invoice.invoiceNumber}
                        </span>
                        <Badge className={getStatusBadge(invoice.status)} onClick={(e) => e.stopPropagation()}>
                          {getStatusLabel(invoice.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 p-5 pt-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Montant</span>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(Number(invoice.amount) * 1.20)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Émission</span>
                        <span className="font-medium">{formatDate(invoice.issueDate)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Échéance</span>
                        <span className="font-medium">{formatDate(invoice.dueDate)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs text-muted-foreground">{formatDate(invoice.createdAt)}</span>
                        <div className="hidden md:flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); window.location.href = `/billing/${invoice.id}`; }} 
                            className="h-8 w-8 p-0 hover:bg-accent/50"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); handleDownload(invoice.id, invoice.invoiceNumber); }}
                            disabled={downloadingId === invoice.id}
                            className="h-8 w-8 p-0 hover:bg-accent/50"
                          >
                            {downloadingId === invoice.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
              {filteredInvoices.length === 0 && (
                <div className="col-span-full">
                  <Card className="apple-card">
                    <CardContent className="text-center py-12">
                      <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">Aucune facture trouvée</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {searchTerm || statusFilter !== 'ALL' ? 'Aucun résultat pour ces critères.' : 'Créez votre première facture pour commencer.'}
                      </p>
                      <Button onClick={() => window.location.href = '/billing/new'} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Créer une facture
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Add Button - Mobile Only */}
        <div className="sm:hidden fixed bottom-6 right-6 z-50">
          <Link href="/billing/new">
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