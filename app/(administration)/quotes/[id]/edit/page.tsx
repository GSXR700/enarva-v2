//app/(administration)/quotes/[id]/edit/page.tsx
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, FileText, Save } from 'lucide-react'
import { formatCurrency, QuoteLineItem } from '@/lib/utils'
import { Quote, Lead, QuoteStatus, QuoteType } from '@prisma/client'
import { toast } from 'sonner'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'

type QuoteWithLead = Quote & { lead: Lead };

export default function EditQuotePage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;

  const [quote, setQuote] = useState<QuoteWithLead | null>(null);
  const [editableLineItems, setEditableLineItems] = useState<QuoteLineItem[]>([]);
  const [status, setStatus] = useState<QuoteStatus>('DRAFT');
  const [type, setType] = useState<QuoteType>('STANDARD');
  const [expiresAt, setExpiresAt] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchQuote = useCallback(async () => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}`);
      if (!response.ok) throw new Error("Devis non trouvé.");
      const data = await response.json();
      setQuote(data);

      setEditableLineItems(Array.isArray(data.lineItems) ? data.lineItems : []);
      setStatus(data.status);
      setType(data.type);
      setExpiresAt(new Date(data.expiresAt).toISOString().split('T')[0]);
    } catch (error) {
      toast.error("Impossible de charger les données du devis.");
      router.push('/quotes');
    } finally {
      setIsLoading(false);
    }
  }, [quoteId, router]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  const handleLineItemChange = (id: string, newAmount: number) => {
    setEditableLineItems(currentItems =>
        currentItems.map(item => item.id === id ? { ...item, amount: isNaN(newAmount) ? 0 : newAmount } : item)
    );
  };
  
  const finalQuote = useMemo(() => {
    if (editableLineItems.length === 0) {
      return { lineItems: [], subTotalHT: 0, vatAmount: 0, totalTTC: 0, finalPrice: 0 };
    }
    const subTotalHT = editableLineItems.reduce((acc, item) => acc + item.amount, 0);
    const vatAmount = subTotalHT * 0.20;
    let totalTTC = subTotalHT + vatAmount;
    if (totalTTC < 500) totalTTC = 500;
    const finalPrice = Math.round(totalTTC / 10) * 10;
    return { lineItems: editableLineItems, subTotalHT, vatAmount, totalTTC, finalPrice };
  }, [editableLineItems]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...finalQuote,
          status,
          type,
          expiresAt
        }),
      });

      if (!response.ok) throw new Error('Échec de la mise à jour du devis.');
      
      toast.success("Devis mis à jour avec succès !");
      router.push('/quotes');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !quote) {
    return <TableSkeleton title="Chargement du devis..." />;
  }

  return (
    <div className="main-content space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/quotes">
          <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Modifier le Devis {quote.quoteNumber}</h1>
          <p className="text-muted-foreground mt-1">Ajustez les lignes de calcul et les totaux du devis.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-1 space-y-6">
              <Card className="thread-card">
                <CardHeader>
                  <CardTitle>Métadonnées</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="status">Statut</Label>
                        <Select value={status} onValueChange={(v) => setStatus(v as QuoteStatus)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="DRAFT">Brouillon</SelectItem><SelectItem value="SENT">Envoyé</SelectItem><SelectItem value="VIEWED">Consulté</SelectItem><SelectItem value="ACCEPTED">Accepté</SelectItem><SelectItem value="REJECTED">Refusé</SelectItem><SelectItem value="EXPIRED">Expiré</SelectItem></SelectContent></Select>
                    </div>
                    <div>
                        <Label htmlFor="type">Type</Label>
                        <Select value={type} onValueChange={(v) => setType(v as QuoteType)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="EXPRESS">Express</SelectItem><SelectItem value="STANDARD">Standard</SelectItem><SelectItem value="PREMIUM">Premium</SelectItem></SelectContent></Select>
                    </div>
                    <div>
                        <Label htmlFor="expiresAt">Date d'expiration</Label>
                        <Input id="expiresAt" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                    </div>
                </CardContent>
              </Card>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <Card className="thread-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText />Aperçu & Édition du Devis</CardTitle>
                <CardDescription>Pour : {quote.lead.firstName} {quote.lead.lastName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg bg-secondary/50 space-y-2">
                  <div className="text-center">
                      <p className="text-muted-foreground">Investissement Total TTC</p>
                      <p className="text-3xl font-bold text-enarva-start">{formatCurrency(finalQuote.finalPrice)}</p>
                  </div>
                </div>
                
                <div className="space-y-2 pt-4">
                  <h4 className="font-semibold">DÉTAIL DE LA TARIFICATION (ÉDITABLE)</h4>
                  {finalQuote.lineItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-sm border-b py-2 gap-2">
                          <div>
                              <p className="font-medium text-foreground">{item.description}</p>
                              <p className="text-xs text-muted-foreground">{item.detail}</p>
                          </div>
                          <Input 
                              type="number" 
                              value={item.amount} 
                              onChange={(e) => handleLineItemChange(item.id, parseFloat(e.target.value))}
                              className="w-32 h-8 text-right font-semibold border-primary/50"
                              disabled={!item.editable || isSaving}
                          />
                      </div>
                  ))}
                  <div className="flex justify-between items-center text-sm font-semibold pt-2">
                      <p>TOTAL HORS TAXES (HT)</p>
                      <p>{formatCurrency(finalQuote.subTotalHT)}</p>
                  </div>
                   <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <p>TVA (20%)</p>
                      <p>{formatCurrency(finalQuote.vatAmount)}</p>
                  </div>
                   <div className="flex justify-between items-center font-bold text-lg pt-2 border-t mt-2">
                      <p>TOTAL TTC</p>
                      <p>{formatCurrency(finalQuote.totalTTC)} (Arrondi à {formatCurrency(finalQuote.finalPrice)})</p>
                  </div>
                </div>

              </CardContent>
            </Card>
            <div className="flex justify-end mt-6">
                <Button type="submit" className="bg-enarva-gradient rounded-lg px-8 py-6 text-base" disabled={isSaving}>
                    <Save className="w-5 h-5 mr-2" />
                    {isSaving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
                </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}