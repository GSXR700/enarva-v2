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
import { ArrowLeft, AlertCircle } from 'lucide-react'
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

  // State for form data - Fix: estimatedDuration as number, not string
  const [formData, setFormData] = useState({
    quoteId: quoteIdFromParams || '',
    leadId: leadIdFromParams || '',
    leadName: '',
    address: '',
    coordinates: '',
    scheduledDate: '',
    estimatedDuration: missionType === 'TECHNICAL_VISIT' ? 1 : 2,
    priority: Priority.NORMAL,
    teamLeaderId: '',
    accessNotes: '',
    type: missionType,
    taskTemplateId: '',
    adminNotes: '',
    qualityScore: '',
    issuesFound: '',
  });

  // State for dropdown options - ALWAYS INITIALIZE AS ARRAYS
  const [teamLeaders, setTeamLeaders] = useState<TeamMember[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [quotes, setQuotes] = useState<QuoteWithLead[]>([]);
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Safe array handler to ensure we always get arrays
  const ensureArray = (data: any): any[] => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      // Check common API response formats
      if (Array.isArray(data.data)) return data.data;
      if (Array.isArray(data.users)) return data.users;
      if (Array.isArray(data.teamLeaders)) return data.teamLeaders;
      if (Array.isArray(data.templates)) return data.templates;
      if (Array.isArray(data.quotes)) return data.quotes;
    }
    console.warn('Expected array but got:', typeof data, data);
    return []; // Always return empty array as fallback
  };

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
      console.error('Error fetching lead:', error);
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
      console.error('Error fetching quote:', error);
      throw error;
    }
  };

  // Safe fetch function that properly handles errors
  const safeFetch = async (url: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  // Initialize form data based on URL parameters
  useEffect(() => {
    const initializeForm = async () => {
      setIsInitializing(true);
      setError(null);

      try {
        console.log('Initializing form with type:', missionType);

        // Always fetch team leaders and templates (these are needed for dropdowns)
        const [usersResult, templatesResult] = await Promise.all([
          safeFetch('/api/users?role=TEAM_LEADER'),
          safeFetch('/api/task-templates')
        ]);

        // Handle team leaders response
        if (usersResult.success && usersResult.data) {
          const leaders = ensureArray(usersResult.data);
          console.log('Team leaders loaded:', leaders.length);
          setTeamLeaders(leaders);
        } else {
          console.warn('Failed to fetch team leaders:', usersResult.error);
          setTeamLeaders([]);
        }

        // Handle task templates response
        if (templatesResult.success && templatesResult.data) {
          const templates = ensureArray(templatesResult.data);
          console.log('Task templates loaded:', templates.length);
          setTaskTemplates(templates);
        } else {
          console.warn('Failed to fetch task templates:', templatesResult.error);
          setTaskTemplates([]);
        }

        // Handle different initialization scenarios
        if (missionType === 'TECHNICAL_VISIT' && leadIdFromParams) {
          // For technical visits, fetch the specific lead
          console.log('Fetching lead for technical visit:', leadIdFromParams);
          await fetchSpecificLead(leadIdFromParams);
          
        } else if (missionType === 'SERVICE') {
          // For service missions, we need quotes
          const quotesResult = await safeFetch('/api/quotes?status=ACCEPTED');
          if (quotesResult.success && quotesResult.data) {
            const quotesArray = ensureArray(quotesResult.data);
            console.log('Quotes loaded:', quotesArray.length);
            setQuotes(quotesArray);
            
            // If a specific quote is provided, fetch it
            if (quoteIdFromParams) {
              console.log('Fetching specific quote:', quoteIdFromParams);
              await fetchSpecificQuote(quoteIdFromParams);
            }
          } else {
            console.warn('Failed to fetch quotes:', quotesResult.error);
            setQuotes([]);
          }
        }
        
      } catch (err: any) {
        console.error('Failed to initialize form:', err);
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
    
    // Fix: Proper type conversion for numeric fields
    let processedValue: any = finalValue;
    
    if (id === 'estimatedDuration') {
      processedValue = parseFloat(value) || 0;
    }

    setFormData(prev => ({ ...prev, [id]: processedValue as any }));

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
    
    // Fix: Proper handling of numeric inputs
    let processedValue: any = value;
    
    if (id === 'estimatedDuration') {
      processedValue = parseFloat(value) || 0;
    }
    
    setFormData(prev => ({ ...prev, [id]: processedValue }));
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
    if (!formData.estimatedDuration || formData.estimatedDuration <= 0) {
      validationErrors.push('Durée estimée manquante ou invalide');
    }

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
      // Fix: Ensure proper datetime format with seconds
      const scheduledDateTime = formData.scheduledDate.includes(':00') 
        ? formData.scheduledDate 
        : `${formData.scheduledDate}:00`;

      const payload = {
        ...formData,
        scheduledDate: scheduledDateTime,
        estimatedDuration: Number(formData.estimatedDuration), // Ensure it's a number
        quoteId: formData.quoteId || undefined,
        taskTemplateId: formData.taskTemplateId || undefined,
      };

      console.log('Submitting payload:', payload);

      const response = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.details || responseData.error || "Échec de la création de la mission.");
      }
      
      toast.success(`Mission de type "${missionType === 'TECHNICAL_VISIT' ? 'Visite Technique' : 'Service'}" créée avec succès !`);
      router.push('/missions');
      
    } catch (err: any) {
      console.error('Mission creation error:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/missions">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux Missions
            </Button>
          </Link>
        </div>
        
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
                      {quotes.length > 0 ? (
                        quotes.map(quote => (
                          <SelectItem key={quote.id} value={quote.id}>
                            {quote.quoteNumber} - {quote.lead.firstName} {quote.lead.lastName}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-quotes" disabled>
                          Aucun devis accepté disponible
                        </SelectItem>
                      )}
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
                  placeholder="Automatique ou manuel..."
                />
              </div>

              <div>
                <Label htmlFor="scheduledDate">Date et Heure *</Label>
                <Input 
                  id="scheduledDate" 
                  type="datetime-local" 
                  value={formData.scheduledDate} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <div>
                <Label htmlFor="estimatedDuration">Durée Estimée (heures) *</Label>
                <Input 
                  id="estimatedDuration" 
                  type="number" 
                  min="0.5" 
                  step="0.5"
                  value={formData.estimatedDuration} 
                  onChange={handleChange} 
                  required 
                  placeholder="Ex: 2.5"
                />
              </div>

              <div>
                <Label htmlFor="priority">Priorité</Label>
                <Select value={formData.priority} onValueChange={(value) => handleSelectChange('priority', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Basse</SelectItem>
                    <SelectItem value="NORMAL">Normale</SelectItem>
                    <SelectItem value="HIGH">Élevée</SelectItem>
                    <SelectItem value="CRITICAL">Critique</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="teamLeaderId">Chef d'Équipe *</Label>
                <Select value={formData.teamLeaderId} onValueChange={(value) => handleSelectChange('teamLeaderId', value)} required>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un chef d'équipe..." /></SelectTrigger>
                  <SelectContent>
                    {teamLeaders.length > 0 ? (
                      teamLeaders.map(leader => (
                        <SelectItem key={leader.id} value={leader.id}>
                          {leader.name || leader.email}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-leaders" disabled>
                        Aucun chef d'équipe disponible
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="taskTemplateId">Modèle de Tâches</Label>
                <Select value={formData.taskTemplateId} onValueChange={(value) => handleSelectChange('taskTemplateId', value)}>
                  <SelectTrigger><SelectValue placeholder="Optionnel..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun modèle</SelectItem>
                    {taskTemplates.length > 0 ? (
                      taskTemplates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-templates" disabled>
                        Aucun modèle disponible
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="accessNotes">Notes d'Accès</Label>
              <Textarea 
                id="accessNotes" 
                value={formData.accessNotes} 
                onChange={handleChange}
                placeholder="Informations d'accès, codes, étage, etc..."
                rows={3}
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 font-medium">Erreur</p>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-6">
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8" 
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