// app/(administration)/expenses/new/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus } from 'lucide-react';
import { Lead, Mission } from '@prisma/client';
import { toast } from 'sonner';

// Basic data cleaning function (in case validation imports are not available)
const cleanExpenseData = (data: any) => {
  const cleaned = { ...data };
  
  // Convert amount to number
  if (cleaned.amount && typeof cleaned.amount === 'string') {
    const amount = parseFloat(cleaned.amount);
    cleaned.amount = isNaN(amount) ? 0 : amount;
  }

  // Handle date fields
  ['date', 'rentalStartDate', 'rentalEndDate'].forEach(field => {
    if (cleaned[field] && typeof cleaned[field] === 'string') {
      cleaned[field] = new Date(cleaned[field]);
    }
  });

  // Convert empty strings to null for optional fields
  const optionalFields = ['vendor', 'description', 'proofUrl', 'missionId', 'leadId'];
  optionalFields.forEach(field => {
    if (cleaned[field] === '' || cleaned[field] === 'none') {
      cleaned[field] = null;
    }
  });

  return cleaned;
};

// Define expense structure for categories and subcategories
const expenseStructure = {
  OPERATIONS: ["Produits de nettoyage", "Consommables", "Matériel & outils", "Produits jardinage", "Produits piscine", "Produits antinuisible", "Sous-traitance", "Énergie & fluides"],
  REVENTE_NEGOCE: ["Achats pour revente", "Transport & logistique", "Stockage & emballage", "Commissions"],
  RESSOURCES_HUMAINES: ["Main-d'œuvre journalière", "Salaires mensuels", "Primes et commissions", "Frais de mission", "Formations", "Uniformes & EPI"],
  ADMINISTRATIF_FINANCIER: ["Honoraires", "Frais bancaires", "Impôts et taxes", "Assurances", "Licences & abonnements"],
  MARKETING_COMMERCIAL: ["Publicité en ligne", "Supports physiques", "Événements & réseautage", "Site web & maintenance"],
  LOGISTIQUE_MOBILITE: ["Carburant", "Maintenance véhicules", "Location ou achat véhicules", "Frais de déplacement"],
  INFRASTRUCTURES_LOCAUX: ["Loyer", "Charges locales", "Aménagement & entretien"],
  LOCATIONS: ["Location de matériel", "Caution", "Frais de livraison", "Assurance matériel"],
  EXCEPTIONNELLES_DIVERSES: ["Investissements lourds", "Petits achats quotidiens", "Cadeaux clients", "Amendes", "Donations"],
};

export default function NewExpensePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;

  // State for missions, leads, form data, file, loading, and error
  const [missions, setMissions] = useState<Mission[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: '',
    subCategory: '',
    paymentMethod: '',
    vendor: '',
    description: '',
    rentalStartDate: '',
    rentalEndDate: '',
    missionId: 'none',
    leadId: 'none',
  });
  
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Fetch missions and leads on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsDataLoading(true);
        const [missionsRes, leadsRes] = await Promise.all([
          fetch('/api/missions'),
          fetch('/api/leads'),
        ]);

        let missionsData, leadsData;
        
        if (missionsRes.ok) {
          missionsData = await missionsRes.json();
        } else {
          console.warn('Failed to fetch missions:', await missionsRes.text());
          missionsData = [];
        }
        
        if (leadsRes.ok) {
          leadsData = await leadsRes.json();
        } else {
          console.warn('Failed to fetch leads:', await leadsRes.text());
          leadsData = [];
        }

        // Handle different response formats
        setMissions(Array.isArray(missionsData) ? missionsData : (missionsData.missions || missionsData.data || []));
        setLeads(Array.isArray(leadsData) ? leadsData : (leadsData.data || []));
      } catch (err: any) {
        setError(`Erreur lors du chargement des données : ${err.message}`);
        toast.error(`Erreur lors du chargement des données : ${err.message}`);
        setMissions([]);
        setLeads([]);
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchData();
  }, []);

  // Handle input changes for text inputs and textareas
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  // Handle select dropdown changes
  const handleSelectChange = (id: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
    
    // Reset subcategory when category changes
    if (id === 'category') {
      setFormData(prev => ({ ...prev, subCategory: '' }));
    }
  };

  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Basic file upload function (since EdgeStore might not be available)
  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      // This is a placeholder for file upload functionality
      // In a real app, you would upload to your file storage service
      console.log('File upload would happen here:', file.name);
      
      // For now, we'll skip file upload and return null
      // You can integrate with your preferred file upload service here
      return null;
    } catch (error) {
      console.error('File upload failed:', error);
      return null;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that user is authenticated
    if (!currentUserId) {
      toast.error('Vous devez être connecté pour créer une dépense');
      return;
    }

    // Basic validation
    if (!formData.category || !formData.subCategory || !formData.paymentMethod || !formData.amount) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsLoading(true);
    let proofUrl: string | null = null;

    try {
      // Upload file if provided
      if (file) {
        proofUrl = await uploadFile(file);
      }

      // Prepare the data
      const expenseData = {
        ...formData,
        proofUrl,
        userId: currentUserId,
        // Convert 'none' to empty string for validation processing
        missionId: formData.missionId === 'none' ? '' : formData.missionId,
        leadId: formData.leadId === 'none' ? '' : formData.leadId,
      };

      // Apply the validation/cleaning function
      const cleanedData = cleanExpenseData(expenseData);

      // Submit expense data to API
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Échec de la création de la dépense');
      }

      toast.success('Dépense enregistrée avec succès !');
      router.push('/(administration)/expenses');
      router.refresh();
    } catch (err: any) {
      console.error('Error creating expense:', err);
      toast.error(err.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if the category is LOCATIONS to show rental date fields
  const isRental = formData.category === 'LOCATIONS';

  // Show loading state while fetching initial data
  if (isDataLoading) {
    return (
      <div className="main-content">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content space-y-6">
      {/* Header with navigation */}
      <div className="flex items-center gap-4">
        <Link href="/expenses">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Nouvelle Dépense</h1>
          <p className="text-muted-foreground mt-1">Enregistrez une nouvelle sortie de caisse.</p>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Informations Générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <Label htmlFor="date">Date de la dépense *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Amount */}
              <div>
                <Label htmlFor="amount">Montant (MAD) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <Label>Catégorie *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => handleSelectChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPERATIONS">Opérations</SelectItem>
                    <SelectItem value="REVENTE_NEGOCE">Revente & Négoce</SelectItem>
                    <SelectItem value="RESSOURCES_HUMAINES">Ressources Humaines</SelectItem>
                    <SelectItem value="ADMINISTRATIF_FINANCIER">Administratif & Financier</SelectItem>
                    <SelectItem value="MARKETING_COMMERCIAL">Marketing & Commercial</SelectItem>
                    <SelectItem value="LOGISTIQUE_MOBILITE">Logistique & Mobilité</SelectItem>
                    <SelectItem value="INFRASTRUCTURES_LOCAUX">Infrastructures & Locaux</SelectItem>
                    <SelectItem value="LOCATIONS">Locations</SelectItem>
                    <SelectItem value="EXCEPTIONNELLES_DIVERSES">Exceptionnelles & Diverses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Subcategory */}
              <div>
                <Label>Sous-catégorie *</Label>
                <Select 
                  value={formData.subCategory} 
                  onValueChange={(value) => handleSelectChange('subCategory', value)}
                  disabled={!formData.category}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez d'abord une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.category && expenseStructure[formData.category as keyof typeof expenseStructure]?.map((subCat) => (
                      <SelectItem key={subCat} value={subCat}>
                        {subCat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method */}
              <div>
                <Label>Mode de paiement *</Label>
                <Select 
                  value={formData.paymentMethod} 
                  onValueChange={(value) => handleSelectChange('paymentMethod', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un mode de paiement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Espèces</SelectItem>
                    <SelectItem value="VIREMENT">Virement</SelectItem>
                    <SelectItem value="CARTE">Carte</SelectItem>
                    <SelectItem value="CHEQUE">Chèque</SelectItem>
                    <SelectItem value="MOBILE">Mobile</SelectItem>
                    <SelectItem value="AUTRE">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Vendor */}
              <div>
                <Label htmlFor="vendor">Fournisseur</Label>
                <Input
                  id="vendor"
                  type="text"
                  value={formData.vendor}
                  onChange={handleChange}
                  placeholder="Nom du fournisseur"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Description détaillée de la dépense"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Justificatif</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="proofFile">Fichier justificatif (PDF, Image)</Label>
              <Input
                id="proofFile"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="mt-1"
              />
              {file && (
                <p className="text-sm text-muted-foreground mt-1">
                  Fichier sélectionné: {file.name}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rental dates for LOCATIONS category */}
        {isRental && (
          <Card className="thread-card">
            <CardHeader>
              <CardTitle>Dates de Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rentalStartDate">Date de début</Label>
                  <Input
                    id="rentalStartDate"
                    type="date"
                    value={formData.rentalStartDate}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Label htmlFor="rentalEndDate">Date de fin</Label>
                  <Input
                    id="rentalEndDate"
                    type="date"
                    value={formData.rentalEndDate}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mission and Lead associations */}
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Associations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mission */}
              <div>
                <Label>Mission associée</Label>
                <Select 
                  value={formData.missionId} 
                  onValueChange={(value) => handleSelectChange('missionId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aucune mission" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune mission</SelectItem>
                    {missions.map(mission => (
                      <SelectItem key={mission.id} value={mission.id}>
                        {mission.missionNumber} - {new Date(mission.scheduledDate).toLocaleDateString('fr-FR')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lead */}
              <div>
                <Label>Prospect associé</Label>
                <Select 
                  value={formData.leadId} 
                  onValueChange={(value) => handleSelectChange('leadId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun prospect" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun prospect</SelectItem>
                    {leads.map(lead => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.firstName} {lead.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/(administration)/expenses">
            <Button type="button" variant="outline">
              Annuler
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading} className="gap-2">
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Création...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Créer la dépense
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}