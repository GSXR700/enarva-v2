// app/(administration)/missions/new/NewMissionForm.tsx
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
import { ArrowLeft, CheckSquare, User, Calendar, MapPin } from 'lucide-react'
import { Quote, User as TeamMember, Lead } from '@prisma/client'
import { toast } from 'sonner'

type QuoteWithLead = Quote & { lead: Lead };

export default function NewMissionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [quotes, setQuotes] = useState<QuoteWithLead[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<TeamMember[]>([]);

  const missionType = searchParams.get('type') as 'TECHNICAL_VISIT' | 'SERVICE' || 'SERVICE';

  const [formData, setFormData] = useState({
    quoteId: searchParams.get('quoteId') || '',
    leadId: searchParams.get('leadId') || '',
    leadName: '',
    address: '',
    scheduledDate: '',
    estimatedDuration: missionType === 'TECHNICAL_VISIT' ? '1' : '',
    teamLeaderId: '',
    accessNotes: '',
    type: missionType,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [quotesRes, usersRes, leadsRes] = await Promise.all([
          fetch('/api/quotes?status=ACCEPTED'),
          fetch('/api/users?role=TEAM_LEADER'),
          fetch('/api/leads')
        ]);

        if (!quotesRes.ok || !usersRes.ok || !leadsRes.ok) {
          throw new Error('Failed to fetch initial data.');
        }

        const quotesData = await quotesRes.json();
        const usersData = await usersRes.json();
        const leadsData = await leadsRes.json();

        setQuotes(quotesData);
        setTeamLeaders(usersData);
        setLeads(leadsData);

        const quoteId = searchParams.get('quoteId');
        const leadId = searchParams.get('leadId');

        if (missionType === 'TECHNICAL_VISIT' && leadId) {
            const selectedLead = leadsData.find((l: Lead) => l.id === leadId);
            if (selectedLead) {
                setFormData(prev => ({
                    ...prev,
                    leadName: `${selectedLead.firstName} ${selectedLead.lastName}`,
                    address: selectedLead.address || ''
                }));
            }
        } else if (quoteId) {
            const selectedQuote = quotesData.find((q: QuoteWithLead) => q.id === quoteId);
            if(selectedQuote) {
                setFormData(prev => ({
                    ...prev,
                    leadId: selectedQuote.leadId,
                    leadName: `${selectedQuote.lead.firstName} ${selectedQuote.lead.lastName}`,
                    address: selectedQuote.lead.address || ''
                }));
            }
        }
      } catch (err: any) {
        setError(err.message);
        toast.error(err.message);
      }
    };
    fetchData();
  }, [searchParams, missionType]);

  const handleSelectChange = (id: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
    if (id === 'quoteId') {
      const selectedQuote = quotes.find(q => q.id === value);
      if (selectedQuote) {
        setFormData(prev => ({
          ...prev,
          quoteId: value,
          leadId: selectedQuote.leadId,
          leadName: `${selectedQuote.lead.firstName} ${selectedQuote.lead.lastName}`,
          address: selectedQuote.lead.address || ''
        }));
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // --- THIS IS THE FULLY IMPLEMENTED SUBMIT FUNCTION ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!formData.leadId) {
        toast.error("Client non identifié. Impossible de créer la mission.");
        setIsLoading(false);
        return;
    }

    try {
        const response = await fetch('/api/missions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...formData,
                quoteId: formData.quoteId || undefined,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(errorData || "Échec de la création de la mission.");
        }
        
        toast.success(`Mission de type "${formData.type}" planifiée avec succès !`);
        router.push('/missions');
        router.refresh();

    } catch (err: any) {
        setError(err.message);
        toast.error(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="main-content space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/missions">
          <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {missionType === 'TECHNICAL_VISIT' ? "Planifier une Visite Technique" : "Planifier une Nouvelle Mission"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {missionType === 'TECHNICAL_VISIT' ? "Assignez un chef d'équipe pour une évaluation sur site." : "Sélectionnez un devis accepté et assignez une équipe."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Détails de la Mission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {missionType === 'SERVICE' && (
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
              )}
              
              <div>
                <Label>Client</Label>
                <Input value={formData.leadName} disabled placeholder="Généré automatiquement..." />
              </div>

              <div className={missionType === 'TECHNICAL_VISIT' ? 'md:col-span-2' : ''}>
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

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex justify-end mt-6">
              <Button type="submit" className="bg-enarva-gradient rounded-lg px-8" disabled={isLoading}>
                {isLoading ? 'Planification...' : (missionType === 'TECHNICAL_VISIT' ? 'Planifier la Visite' : 'Planifier la Mission')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}