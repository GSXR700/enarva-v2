// app/(administration)/billing/[id]/page.tsx - COMPLETE CORRECTED VERSION
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Download,
  CreditCard,
  DollarSign,
  Calendar,
  User,
  Building2,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  Banknote,
  Wallet
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  advanceAmount: number;
  remainingAmount: number;
  status: string;
  issueDate: string;
  dueDate: string;
  description: string;
  lead: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string | null;
    address: string | null;
    leadType: string;
    iceNumber: string | null;
  };
  mission: {
    id: string;
    missionNumber: string;
    status: string;
  } | null;
}

type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';

interface StatusConfig {
  bg: string;
  text: string;
  icon: React.ReactNode;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params?.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('BANK_TRANSFER');

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/invoices/${invoiceId}`);
      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();
      setInvoice(data);
      // Set default payment amount to remaining amount
      setPaymentAmount(data.remainingAmount.toString());
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Erreur lors du chargement de la facture');
      } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;

    try {
      setIsDownloading(true);
      const response = await fetch(`/api/invoices/${invoice.id}/download`);
      
      if (!response.ok) throw new Error('Erreur lors du téléchargement');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Facture_${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF téléchargé avec succès');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Erreur lors du téléchargement du PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePayment = async () => {
    if (!invoice) return;

    const amount = parseFloat(paymentAmount);
    
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    if (amount > invoice.remainingAmount) {
      toast.error('Le montant dépasse le reste à payer');
      return;
    }

    try {
      setIsProcessingPayment(true);

      const response = await fetch(`/api/invoices/${invoice.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentAmount: amount,
          paymentType
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Erreur lors du paiement');
      }

      const data = await response.json();
      
      toast.success(data.message || 'Paiement enregistré avec succès');
      setIsPaymentDialogOpen(false);
      fetchInvoice(); // Refresh invoice data
      
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Erreur lors de l\'enregistrement du paiement');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<InvoiceStatus, StatusConfig> = {
      DRAFT: {
        bg: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
        text: 'Brouillon',
        icon: <Clock className="w-3 h-3" />
      },
      SENT: {
        bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        text: 'Envoyée',
        icon: <AlertCircle className="w-3 h-3" />
      },
      PAID: {
        bg: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        text: 'Payée',
        icon: <CheckCircle2 className="w-3 h-3" />
      },
      OVERDUE: {
        bg: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        text: 'En retard',
        icon: <AlertCircle className="w-3 h-3" />
      },
      CANCELLED: {
        bg: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
        text: 'Annulée',
        icon: <AlertCircle className="w-3 h-3" />
      }
    };

    const config = styles[status as InvoiceStatus] || styles.DRAFT;

    return (
      <Badge className={`${config.bg} gap-1.5 px-3 py-1`}>
        {config.icon}
        {config.text}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4 animate-pulse">
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-muted-foreground">Chargement de la facture...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="shadow-lg border-red-200 dark:border-red-800">
            <CardContent className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-red-600 mb-2">Facture introuvable</h3>
              <p className="text-muted-foreground mb-4">La facture demandée n&apos;existe pas.</p>
              <Button onClick={() => router.push('/billing')} variant="outline">
                Retour aux factures
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isFullyPaid = invoice.remainingAmount === 0 || invoice.status === 'PAID';
  const hasAdvance = invoice.advanceAmount > 0;
  const paymentProgress = (invoice.advanceAmount / invoice.amount) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/billing')}
              className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Facture {invoice.invoiceNumber}
              </h1>
              <p className="text-sm text-muted-foreground">
                Détails et gestion des paiements
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? 'Téléchargement...' : 'Télécharger PDF'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Status Card */}
            <Card className="shadow-lg border-2 border-blue-100 dark:border-blue-900">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Statut de la facture</CardTitle>
                  {getStatusBadge(invoice.status)}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      Date d&apos;émission
                    </div>
                    <p className="text-lg font-semibold">{formatDate(invoice.issueDate)}</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      Date d&apos;échéance
                    </div>
                    <p className="text-lg font-semibold">{formatDate(invoice.dueDate)}</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-muted-foreground mb-2">Description</p>
                  <p className="text-gray-900 dark:text-gray-100">{invoice.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Details Card */}
            <Card className="shadow-lg border-2 border-green-100 dark:border-green-900">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
                <CardTitle className="text-xl flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Détails du paiement
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Montant total */}
                  <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">Montant total HT</span>
                    <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(invoice.amount)}
                    </span>
                  </div>

                  {/* TVA */}
                  <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">TVA (20%)</span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(invoice.amount * 0.20)}
                    </span>
                  </div>

                  {/* Total TTC */}
                  <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                    <span className="text-base font-bold text-blue-900 dark:text-blue-100">Total TTC</span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(invoice.amount * 1.20)}
                    </span>
                  </div>

                  <div className="border-t-2 border-gray-200 dark:border-gray-700 my-4"></div>

                  {/* Avances payées */}
                  <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      Avances payées
                    </span>
                    <span className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(invoice.advanceAmount)}
                    </span>
                  </div>

                  {/* Reste à payer */}
                  <div className={`flex justify-between items-center p-4 rounded-lg border-2 ${
                    isFullyPaid
                      ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'
                      : 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800'
                  }`}>
                    <span className={`text-base font-bold ${
                      isFullyPaid
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-orange-700 dark:text-orange-300'
                    }`}>
                      Reste à payer
                    </span>
                    <span className={`text-2xl font-bold ${
                      isFullyPaid
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-orange-600 dark:text-orange-400'
                    }`}>
                      {formatCurrency(invoice.remainingAmount)}
                    </span>
                  </div>

                  {/* Progress bar */}
                  {hasAdvance && !isFullyPaid && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-muted-foreground mb-2">
                        <span>Progression du paiement</span>
                        <span>{paymentProgress.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${paymentProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Payment button */}
                  {!isFullyPaid && (
                    <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg mt-4">
                          <CreditCard className="w-4 h-4 mr-2" />
                          Enregistrer un paiement
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle className="text-2xl flex items-center gap-2">
                            <Wallet className="w-6 h-6 text-green-600" />
                            Enregistrer un paiement
                          </DialogTitle>
                          <DialogDescription>
                            Saisissez les détails du paiement reçu pour cette facture
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-6 py-4">
                          {/* Reste à payer info */}
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                Reste à payer
                              </span>
                              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                {formatCurrency(invoice.remainingAmount)}
                              </span>
                            </div>
                          </div>

                          {/* Montant du paiement */}
                          <div className="space-y-2">
                            <Label htmlFor="paymentAmount" className="text-base font-semibold">
                              Montant du paiement (MAD)
                            </Label>
                            <Input
                              id="paymentAmount"
                              type="number"
                              step="0.01"
                              min="0"
                              max={invoice.remainingAmount}
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              placeholder="0.00"
                              className="text-lg h-12"
                            />
                            <div className="flex gap-2 mt-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setPaymentAmount((invoice.remainingAmount / 2).toFixed(2))}
                              >
                                50%
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setPaymentAmount(invoice.remainingAmount.toString())}
                              >
                                100%
                              </Button>
                            </div>
                          </div>

                          {/* Type de paiement */}
                          <div className="space-y-2">
                            <Label htmlFor="paymentType" className="text-base font-semibold">
                              Mode de paiement
                            </Label>
                            <Select value={paymentType} onValueChange={setPaymentType}>
                              <SelectTrigger className="h-12">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="BANK_TRANSFER">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4" />
                                    Virement bancaire
                                  </div>
                                </SelectItem>
                                <SelectItem value="CASH">
                                  <div className="flex items-center gap-2">
                                    <Banknote className="w-4 h-4" />
                                    Espèces
                                  </div>
                                </SelectItem>
                                <SelectItem value="CHEQUE">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Chèque
                                  </div>
                                </SelectItem>
                                <SelectItem value="CARD">
                                  <div className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" />
                                    Carte bancaire
                                  </div>
                                </SelectItem>
                                <SelectItem value="ONLINE">
                                  <div className="flex items-center gap-2">
                                    <Wallet className="w-4 h-4" />
                                    Paiement en ligne
                                  </div>
                                </SelectItem>
                                <SelectItem value="MOBILE">
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    Mobile Money
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsPaymentDialogOpen(false)}
                            disabled={isProcessingPayment}
                          >
                            Annuler
                          </Button>
                          <Button
                            type="button"
                            onClick={handlePayment}
                            disabled={isProcessingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {isProcessingPayment ? 'Enregistrement...' : 'Valider le paiement'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}

                  {isFullyPaid && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border-2 border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-semibold">Facture payée intégralement</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Client Info */}
          <div className="space-y-6">
            {/* Client Card */}
            <Card className="shadow-lg border-2 border-purple-100 dark:border-purple-900">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
                <CardTitle className="text-xl flex items-center gap-2">
                  {invoice.lead.leadType === 'PROFESSIONNEL' ? (
                    <Building2 className="w-5 h-5" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                  Informations client
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {invoice.lead.company && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Entreprise</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {invoice.lead.company}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Contact</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {invoice.lead.firstName} {invoice.lead.lastName}
                  </p>
                </div>

                {invoice.lead.iceNumber && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">ICE</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {invoice.lead.iceNumber}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                  {invoice.lead.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a href={`mailto:${invoice.lead.email}`} className="text-blue-600 hover:underline">
                        {invoice.lead.email}
                      </a>
                    </div>
                  )}

                  {invoice.lead.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <a href={`tel:${invoice.lead.phone}`} className="text-blue-600 hover:underline">
                        {invoice.lead.phone}
                      </a>
                    </div>
                  )}

                  {invoice.lead.address && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <p className="text-gray-700 dark:text-gray-300">{invoice.lead.address}</p>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <Link href={`/leads/${invoice.lead.id}`}>
                    <Button variant="outline" className="w-full">
                      <User className="w-4 h-4 mr-2" />
                      Voir la fiche client
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Mission Card */}
            {invoice.mission && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Mission associée</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Numéro de mission</p>
                    <p className="font-mono font-semibold text-blue-600">
                      {invoice.mission.missionNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Statut</p>
                    <Badge variant="outline">{invoice.mission.status}</Badge>
                  </div>
                  <Link href={`/missions/${invoice.mission.id}`}>
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      Voir la mission
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}