// app/(administration)/billing/page.tsx - FIXED
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, FileText, Download, Eye } from 'lucide-react'
import { Invoice, Lead, Mission } from '@prisma/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'

type InvoiceWithRelations = Invoice & { 
  lead: Lead;
  mission: Mission | null;
};

export default function BillingPage() {
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await fetch('/api/invoices');
        if (!response.ok) throw new Error('Impossible de charger les factures.');
        const data = await response.json();
        setInvoices(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInvoices();
  }, []);

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
    return <div className="main-content text-center p-10 text-red-500">Erreur: {error}</div>;
  }

  const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const paidAmount = invoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + Number(inv.amount), 0);
  const pendingAmount = invoices.filter(inv => inv.status === 'SENT').reduce((sum, inv) => sum + Number(inv.amount), 0);

  return (
    <div className="main-content p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Facturation</h1>
          <p className="text-sm text-muted-foreground mt-1">{invoices.length} factures au total</p>
        </div>
        <Link href="/billing/new">
          <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Plus className="w-4 h-4" />
            Nouvelle Facture
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Payé</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</p>
              </div>
              <FileText className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(pendingAmount)}</p>
              </div>
              <FileText className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Toutes les Factures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left">N° Facture</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Date</th>
                  <th className="px-4 py-3 text-left">Montant</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(invoice => (
                  <tr key={invoice.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{invoice.invoiceNumber}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{invoice.lead.firstName} {invoice.lead.lastName}</p>
                        <p className="text-xs text-muted-foreground">{invoice.lead.company || 'Particulier'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">{formatDate(invoice.issueDate)}</td>
                    <td className="px-4 py-3 font-bold text-blue-600">{formatCurrency(Number(invoice.amount))}</td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusBadge(invoice.status)}>
                        {getStatusLabel(invoice.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {invoices.length === 0 && (
            <div className="text-center py-10">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">Aucune facture</h3>
              <p className="mt-1 text-sm text-muted-foreground">Créez votre première facture</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}