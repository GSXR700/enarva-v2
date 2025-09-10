'use client'

// Import required dependencies and components
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Upload } from 'lucide-react';
import { Lead, Mission, User } from '@prisma/client';
import { toast } from 'sonner';
import { useEdgeStore } from '@/lib/edgestore';

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
  // Initialize router, session, and EdgeStore
  const router = useRouter();
  const { data: session } = useSession();
  const { edgestore } = useEdgeStore();

  // State for missions, leads, form data, file, loading, and error
  const [missions, setMissions] = useState<Mission[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    category: 'OPERATIONS',
    subCategory: '',
    paymentMethod: 'CASH',
    vendor: '',
    missionId: '',
    leadId: '',
    rentalStartDate: '',
    rentalEndDate: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch missions and leads on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [missionsRes, leadsRes] = await Promise.all([
          fetch('/api/missions'),
          fetch('/api/leads'),
        ]);

        if (!missionsRes.ok) throw new Error('Échec du chargement des missions');
        if (!leadsRes.ok) throw new Error('Échec du chargement des leads');

        const missionsData = await missionsRes.json();
        const leadsData = await leadsRes.json();

        // Ensure missions and leads are arrays
        setMissions(Array.isArray(missionsData.data) ? missionsData.data : []);
        setLeads(Array.isArray(leadsData.data) ? leadsData.data : []);
      } catch (err: any) {
        setError(`Erreur lors du chargement des données : ${err.message}`);
        toast.error(`Erreur lors du chargement des données : ${err.message}`);
        setMissions([]);
        setLeads([]);
      } finally {
        setIsLoading(false);
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
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    let proofUrl: string | undefined = undefined;

    try {
      // Upload file to EdgeStore if provided
      if (file) {
        const res = await edgestore.publicFiles.upload({ file });
        proofUrl = res.url;
      }

      // Submit expense data to API
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, proofUrl }),
      });

      if (!response.ok) throw new Error('Échec de la création de la dépense.');

      toast.success('Dépense enregistrée avec succès !');
      router.push('/expenses');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if the category is LOCATIONS to show rental date fields
  const isRental = formData.category === 'LOCATIONS';

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

      {/* Expense form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Détails de la Dépense</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Date input */}
            <div>
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={formData.date} onChange={handleChange} required />
            </div>
            {/* Amount input */}
            <div>
              <Label htmlFor="amount">Montant (MAD)</Label>
              <Input id="amount" type="number" step="0.01" value={formData.amount} onChange={handleChange} required />
            </div>
            {/* Payment method select */}
            <div>
              <Label htmlFor="paymentMethod">Mode de paiement</Label>
              <Select value={formData.paymentMethod} onValueChange={(value) => handleSelectChange('paymentMethod', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="VIREMENT">Virement</SelectItem>
                  <SelectItem value="CARTE">Carte</SelectItem>
                  <SelectItem value="CHEQUE">Chèque</SelectItem>
                  <SelectItem value="MOBILE">Mobile</SelectItem>
                  <SelectItem value="AUTRE">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Category select */}
            <div>
              <Label htmlFor="category">Catégorie</Label>
              <Select value={formData.category} onValueChange={(value) => handleSelectChange('category', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(expenseStructure).map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Subcategory select */}
            <div>
              <Label htmlFor="subCategory">Sous-Catégorie</Label>
              <Select value={formData.subCategory} onValueChange={(value) => handleSelectChange('subCategory', value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {expenseStructure[formData.category as keyof typeof expenseStructure]?.map(subCat => (
                    <SelectItem key={subCat} value={subCat}>
                      {subCat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Vendor input */}
            <div>
              <Label htmlFor="vendor">Fournisseur / Payé à</Label>
              <Input id="vendor" value={formData.vendor} onChange={handleChange} />
            </div>
            {/* Description textarea */}
            <div className="md:col-span-3">
              <Label htmlFor="description">Description / Notes</Label>
              <Textarea id="description" value={formData.description} onChange={handleChange} />
            </div>
            {/* Mission select */}
            <div>
              <Label htmlFor="missionId">Lier à une mission (optionnel)</Label>
              <Select
                value={formData.missionId}
                onValueChange={(value) => handleSelectChange('missionId', value)}
                disabled={isLoading || missions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoading ? 'Chargement...' : missions.length === 0 ? 'Aucune mission disponible' : 'Sélectionner...'} />
                </SelectTrigger>
                <SelectContent>
                  {missions.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Aucune mission disponible
                    </SelectItem>
                  ) : (
                    missions.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.missionNumber}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {/* Lead select */}
            <div>
              <Label htmlFor="leadId">Lier à un lead (optionnel)</Label>
              <Select
                value={formData.leadId}
                onValueChange={(value) => handleSelectChange('leadId', value)}
                disabled={isLoading || leads.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoading ? 'Chargement...' : leads.length === 0 ? 'Aucun lead disponible' : 'Sélectionner...'} />
                </SelectTrigger>
                <SelectContent>
                  {leads.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Aucun lead disponible
                    </SelectItem>
                  ) : (
                    leads.map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.firstName} {l.lastName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {/* File upload */}
            <div>
              <Label htmlFor="proof">Justificatif (PDF, Image)</Label>
              <Input id="proof" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            {/* Rental date fields (shown only for LOCATIONS category) */}
            {isRental && (
              <>
                <div>
                  <Label htmlFor="rentalStartDate">Début location</Label>
                  <Input id="rentalStartDate" type="date" value={formData.rentalStartDate} onChange={handleChange} />
                </div>
                <div>
                  <Label htmlFor="rentalEndDate">Fin location</Label>
                  <Input id="rentalEndDate" type="date" value={formData.rentalEndDate} onChange={handleChange} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
        {/* Error message display */}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        {/* Submit button */}
        <div className="flex justify-end mt-6">
          <Button type="submit" className="bg-enarva-gradient rounded-lg px-8" disabled={isLoading}>
            <Plus className="w-4 h-4 mr-2" />
            {isLoading ? 'Enregistrement...' : 'Enregistrer la Dépense'}
          </Button>
        </div>
      </form>
    </div>
  );
}