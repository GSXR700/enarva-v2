//app/(administration)/missions/new/NewMissionForm.tsx
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
import { ArrowLeft } from 'lucide-react'
import { Quote, User as TeamMember, Lead, Priority } from '@prisma/client'
import { toast } from 'sonner'

type QuoteWithLead = Quote & { lead: Lead };
type TaskTemplate = { id: string; name: string; };

export default function NewMissionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get URL parameters
  const missionType = searchParams.get('type') as 'TECHNICAL_VISIT' | 'SERVICE' || 'SERVICE';
  const quoteIdFromParams = searchParams.get('quoteId');
  const leadIdFromParams = searchParams.get('leadId');

  // State for form data
  const [formData, setFormData] = useState({
    quoteId: quoteIdFromParams || '',
    leadId: leadIdFromParams || '',
    leadName: '',
    address: '',
    coordinates: '',
    scheduledDate: '',
    estimatedDuration: missionType === 'TECHNICAL_VISIT' ? '1' : '',
    priority: Priority.NORMAL,
    teamLeaderId: '',
    accessNotes: '',
    type: missionType,
    taskTemplateId: '',
    adminNotes: '',
    qualityScore: '',
    issuesFound: '',
  });

  // State for dropdown options
  const [teamLeaders, setTeamLeaders] = useState<TeamMember[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [quotes, setQuotes] = useState<QuoteWithLead[]>([]);
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch specific lead data directly
  const fetchSpecificLead = async (leadId: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`);
      if (!response.ok) {
        throw new Error('Lead not found');
      }
      const lead = await response.json();
      
      // Update form data with lead information
      setFormData(prev => ({
        ...prev,
        leadId: lead.id,
        leadName: `${lead.firstName} ${lead.lastName}`,
        address: lead.address || '',
        coordinates: lead.gpsLocation || ''
      }));
      
      return lead;
    } catch (error) {
      console.error('❌ Error fetching lead:', error);
      throw error;
    }
  };

  // Fetch specific quote data directly
  const fetchSpecificQuote = async (quoteId: string) => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}`);
      if (!response.ok) {
        throw new Error('Quote not found');
      }
      const quote = await response.json();
      
      // Update form data with quote/lead information
      setFormData(prev => ({
        ...prev,
        quoteId: quote.id,
        leadId: quote.leadId,
        leadName: `${quote.lead.firstName} ${quote.lead.lastName}`,
        address: quote.lead.address || '',
        coordinates: quote.lead.gpsLocation || ''
      }));
      
      return quote;
    } catch (error) {
      console.error('❌ Error fetching quote:', error);
      throw error;
    }
  };

  // Initialize form data based on URL parameters
  useEffect(() => {
    const initializeForm = async () => {
      setIsInitializing(true);
      setError(null);

      try {
        // Always fetch team leaders and templates (these are needed for dropdowns)
        const [usersRes, templatesRes] = await Promise.all([
          fetch('/api/users?role=TEAM_LEADER'),
          fetch('/api/task-templates')
        ]);

        if (!usersRes.ok || !templatesRes.ok) {
          throw new Error('Failed to fetch required data');
        }

        const [usersData, templatesData] = await Promise.all([
          usersRes.json(),
          templatesRes.json()
        ]);

        setTeamLeaders(usersData);
        setTaskTemplates(templatesData);

        // Handle different initialization scenarios
        if (missionType === 'TECHNICAL_VISIT' && leadIdFromParams) {
          // For technical visits, fetch the specific lead
          await fetchSpecificLead(leadIdFromParams);
          
        } else if (missionType === 'SERVICE') {
          // For service missions, we need quotes
          const quotesRes = await fetch('/api/quotes?status=ACCEPTED');
          if (quotesRes.ok) {
            const quotesData = await quotesRes.json();
            setQuotes(quotesData);
            
            // If a specific quote is provided, fetch it
            if (quoteIdFromParams) {
              await fetchSpecificQuote(quoteIdFromParams);
            }
          }
        }
        
      } catch (err: any) {
        setError(`Failed to load form data: ${err.message}`);
        toast.error(`Failed to load form data: ${err.message}`);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeForm();
  }, [missionType, leadIdFromParams, quoteIdFromParams]);

  const handleSelectChange = (id: keyof typeof formData, value: string) => {
    const finalValue = value === 'none' ? '' : value;
    setFormData(prev => ({ ...prev, [id]: finalValue as any }));

    // Handle quote selection for service missions
    if (id === 'quoteId' && value !== 'none') {
      const selectedQuote = quotes.find(q => q.id === value);
      if (selectedQuote) {
        setFormData(prev => ({
          ...prev,
          quoteId: value,
          leadId: selectedQuote.leadId,
          leadName: `${selectedQuote.lead.firstName} ${selectedQuote.lead.lastName}`,
          address: selectedQuote.lead.address || '',
          coordinates: selectedQuote.lead.gpsLocation || ''
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

    // Comprehensive client-side validation
    const validationErrors = [];
    if (!formData.leadId) validationErrors.push('Client non identifié');
    if (!formData.teamLeaderId) validationErrors.push('Chef d\'équipe non sélectionné');
    if (!formData.address) validationErrors.push('Adresse manquante');
    if (!formData.scheduledDate) validationErrors.push('Date/heure manquante');
    if (!formData.estimatedDuration) validationErrors.push('Durée estimée manquante');

    // For service missions, quote is required
    if (missionType === 'SERVICE' && !formData.quoteId) {
      validationErrors.push('Devis non sélectionné');
    }

    if (validationErrors.length > 0) {
      const errorMsg = `Champs requis manquants: ${validationErrors.join(', ')}`;
      toast.error(errorMsg);
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

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || "Échec de la création de la mission.");
      }
      
      toast.success(`Mission de type "${missionType === 'TECHNICAL_VISIT' ? 'Visite Technique' : 'Service'}" planifiée avec succès !`);
      router.push('/missions');
      router.refresh();

    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state during initialization
  if (isInitializing) {
    return (
      <div className="main-content flex items-center justify-center p-10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Chargement des données de la mission...</p>
        </div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (error && !formData.leadId) {
    return (
      <div className="main-content space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/missions">
            <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Erreur de Chargement</h1>
            <p className="text-red-500">{error}</p>
          </div>
        </div>
        <div className="flex justify-center">
          <Button onClick={() => window.location.reload()}>Réessayer</Button>
        </div>
      </div>
    );
  }

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
                  <Label htmlFor="quoteId">Devis Accepté *</Label>
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
                <Input 
                  value={formData.leadName} 
                  disabled 
                  placeholder="Client sera automatiquement identifié..." 
                  className={formData.leadName ? "text-foreground" : "text-muted-foreground"}
                />
              </div>

              <div>
                <Label htmlFor="address">Adresse d'intervention *</Label>
                <Input 
                  id="address" 
                  value={formData.address} 
                  onChange={handleChange} 
                  required 
                  placeholder="Adresse sera automatiquement remplie..."
                  className={formData.address ? "text-foreground" : "text-muted-foreground"}
                />
              </div>
              
              <div>
                <Label htmlFor="coordinates">Coordonnées GPS</Label>
                <Input 
                  id="coordinates" 
                  value={formData.coordinates} 
                  onChange={handleChange} 
                  placeholder="Lien Google Maps, Lat/Lon..."
                />
              </div>

              <div>
                <Label htmlFor="scheduledDate">Date et Heure Planifiées *</Label>
                <Input id="scheduledDate" type="datetime-local" value={formData.scheduledDate} onChange={handleChange} required />
              </div>
              
              <div>
                <Label htmlFor="estimatedDuration">Durée Estimée (heures) *</Label>
                <Input id="estimatedDuration" type="number" min="0.5" step="0.5" value={formData.estimatedDuration} onChange={handleChange} required />
              </div>
              
              <div>
                <Label htmlFor="priority">Priorité *</Label>
                <Select value={formData.priority} onValueChange={(value) => handleSelectChange('priority', value)} required>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Priority.LOW}>Faible</SelectItem>
                    <SelectItem value={Priority.NORMAL}>Normale</SelectItem>
                    <SelectItem value={Priority.HIGH}>Élevée</SelectItem>
                    <SelectItem value={Priority.CRITICAL}>Critique</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="teamLeaderId">Chef d'Équipe *</Label>
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
                <Label htmlFor="taskTemplateId">Modèle de Checklist</Label>
                <Select value={formData.taskTemplateId || 'none'} onValueChange={(value) => handleSelectChange('taskTemplateId', value)}>
                  <SelectTrigger><SelectValue placeholder="Choisir une checklist..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune (Tâches manuelles)</SelectItem>
                    {taskTemplates.map(template => (
                      <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="accessNotes">Notes d'accès</Label>
                <Textarea 
                  id="accessNotes" 
                  value={formData.accessNotes} 
                  onChange={handleChange} 
                  placeholder="Code d'entrée, contact sur place, instructions spéciales..." 
                />
              </div>

              {/* Admin Fields - Only show for admin users */}
              <div className="md:col-span-2 border-t pt-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Validation Administrative</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="qualityScore">Score Qualité (/5)</Label>
                    <Input
                      id="qualityScore"
                      type="number"
                      min="1"
                      max="5"
                      value={formData.qualityScore || ''}
                      onChange={handleChange}
                      placeholder="1-5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="adminNotes">Notes Admin</Label>
                    <Textarea
                      id="adminNotes"
                      value={formData.adminNotes || ''}
                      onChange={handleChange}
                      placeholder="Notes de validation..."
                      rows={2}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="issuesFound">Problèmes identifiés</Label>
                    <Textarea
                      id="issuesFound"
                      value={formData.issuesFound || ''}
                      onChange={handleChange}
                      placeholder="Description des problèmes..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-md border border-red-200">{error}</p>}

            <div className="flex justify-end mt-6">
              <Button 
                type="submit" 
                className="bg-enarva-gradient rounded-lg px-8" 
                disabled={isLoading || !formData.leadName || !formData.address}
              >
                {isLoading ? 'Planification...' : (missionType === 'TECHNICAL_VISIT' ? 'Planifier la Visite' : 'Planifier la Mission')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}