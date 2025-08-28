// app/missions/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, CheckSquare, User, Calendar } from 'lucide-react'
import { Quote, User as TeamMember, Lead } from '@prisma/client'

type QuoteWithLead = Quote & { lead: Lead };

export default function NewMissionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [quotes, setQuotes] = useState<QuoteWithLead[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<TeamMember[]>([]);
  
  const [formData, setFormData] = useState({
    quoteId: searchParams.get('quoteId') || '',
    leadName: '',
    address: '',
    scheduledDate: '',
    estimatedDuration: '',
    teamLeaderId: '',
    accessNotes: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch accepted quotes and team leaders to populate the form
    const fetchData = async () => {
      try {
        const [quotesRes, usersRes] = await Promise.all([
          fetch('/api/quotes?status=ACCEPTED'),
          fetch('/api/users?role=TEAM_LEADER')
        ]);

        if (!quotesRes.ok || !usersRes.ok) {
          throw new Error('Failed to fetch initial data.');
        }

        const quotesData = await quotesRes.json();
        const usersData = await usersRes.json();
        
        setQuotes(quotesData);
        setTeamLeaders(usersData);

        // Pre-fill form if quoteId is in URL
        const quoteId = searchParams.get('quoteId');
        if (quoteId) {
            const selectedQuote = quotesData.find((q: QuoteWithLead) => q.id === quoteId);
            if(selectedQuote) {
                setFormData(prev => ({
                    ...prev,
                    leadName: `${selectedQuote.lead.firstName} ${selectedQuote.lead.lastName}`,
                }));
            }
        }
      } catch (err: any) {
        setError(err.message);
      }
    };
    fetchData();
  }, [searchParams]);

  const handleSelectChange = (id: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
    if (id === 'quoteId') {
      const selectedQuote = quotes.find(q => q.id === value);
      if (selectedQuote) {
        setFormData(prev => ({
          ...prev,
          quoteId: value,
          leadName: `${selectedQuote.lead.firstName} ${selectedQuote.lead.lastName}`,
        }));
      }
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    // ... submit logic will be added here
    console.log("Form Data:", formData);
    // After successful submission:
    // router.push('/missions');
    setIsLoading(false);
  };

  return (
    <div className="main-content space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/missions">
          <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Planifier une Nouvelle Mission</h1>
          <p className="text-muted-foreground mt-1">Sélectionnez un devis accepté et assignez une équipe.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Détails de la Mission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="quoteId">Devis Accepté</Label>
                <Select value={formData.quoteId} onValueChange={(value) => handleSelectChange('quoteId', value)} required>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un devis..." /></SelectTrigger>
                  <SelectContent>
                    {quotes.map(quote => (
                      <SelectItem key={quote.id} value={quote.id}>
                        {quote.quoteNumber} - {quote.lead.firstName} {quote.lead.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Client</Label>
                <Input value={formData.leadName} disabled />
              </div>
              <div>
                <Label htmlFor="address">Adresse d'intervention</Label>
                <Input id="address" value={formData.address} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="scheduledDate">Date et Heure Planifiées</Label>
                <Input id="scheduledDate" type="datetime-local" value={formData.scheduledDate} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="estimatedDuration">Durée Estimée (heures)</Label>
                <Input id="estimatedDuration" type="number" value={formData.estimatedDuration} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="teamLeaderId">Chef d'Équipe</Label>
                <Select value={formData.teamLeaderId} onValueChange={(value) => handleSelectChange('teamLeaderId', value)} required>
                  <SelectTrigger><SelectValue placeholder="Assigner un chef d'équipe..." /></SelectTrigger>
                  <SelectContent>
                    {teamLeaders.map(leader => (
                      <SelectItem key={leader.id} value={leader.id}>{leader.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="accessNotes">Notes d'accès (optionnel)</Label>
                <Textarea id="accessNotes" value={formData.accessNotes} onChange={handleChange} placeholder="Code d'entrée, contact sur place, etc." />
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <Button type="submit" className="bg-enarva-gradient rounded-lg px-8" disabled={isLoading}>
                {isLoading ? 'Planification en cours...' : 'Planifier la Mission'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}