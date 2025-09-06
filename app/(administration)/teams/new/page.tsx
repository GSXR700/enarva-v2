// gsxr700/enarva-v2/enarva-v2-6ca61289d3a555c270f0a2db9f078e282ccd8664/app/(administration)/teams/new/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { TeamSpecialty } from '@prisma/client'

const allSpecialties = Object.values(TeamSpecialty);

export default function NewTeamMemberPage() {
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    role: 'TECHNICIAN',
    experienceLevel: 'JUNIOR',
    specialties: [] as TeamSpecialty[],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (id: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value as any }))
  }

  const handleSpecialtyChange = (specialty: TeamSpecialty) => {
    setFormData(prev => {
        const newSpecialties = prev.specialties.includes(specialty)
            ? prev.specialties.filter(s => s !== specialty)
            : [...prev.specialties, specialty];
        return { ...prev, specialties: newSpecialties };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!formData.password) {
        toast.error("Le mot de passe est obligatoire.");
        setIsLoading(false);
        return;
    }

    try {
      const response = await fetch('/api/team-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...formData,
            name: `${formData.firstName} ${formData.lastName}`,
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData || 'Une erreur est survenue.')
      }
      
      toast.success("Nouveau membre ajouté avec succès !");
      router.push('/teams')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message);
    } finally {
      setIsLoading(false)
    }
  }
  
  const translateSpecialty = (specialty: string) => {
      const translations: { [key: string]: string } = {
        GENERAL_CLEANING: "Nettoyage Général",
        WINDOW_SPECIALIST: "Spécialiste Vitres",
        FLOOR_SPECIALIST: "Spécialiste Sols",
        LUXURY_SURFACES: "Surfaces de Luxe",
        EQUIPMENT_HANDLING: "Manipulation d'Équipement",
        TEAM_MANAGEMENT: "Gestion d'Équipe",
        QUALITY_CONTROL: "Contrôle Qualité",
        DETAIL_FINISHING: "Finitions & Détails",
      };
      return translations[specialty] || specialty;
  }

  return (
    <div className="main-content space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/teams">
          <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Ajouter un Membre à l'Équipe</h1>
          <p className="text-muted-foreground mt-1">Créez un profil pour un nouveau technicien ou chef d'équipe.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Informations du Membre</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="firstName">Prénom</Label>
                <Input id="firstName" value={formData.firstName} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="lastName">Nom</Label>
                <Input id="lastName" value={formData.lastName} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <Input id="password" type="password" value={formData.password} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" type="tel" value={formData.phone} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="role">Rôle</Label>
                <Select value={formData.role} onValueChange={(value) => handleSelectChange('role', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TECHNICIAN">Technicien</SelectItem>
                    <SelectItem value="TEAM_LEADER">Chef d'équipe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="experienceLevel">Niveau d'expérience</Label>
                <Select value={formData.experienceLevel} onValueChange={(value) => handleSelectChange('experienceLevel', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JUNIOR">Junior</SelectItem>
                    <SelectItem value="INTERMEDIATE">Intermédiaire</SelectItem>
                    <SelectItem value="SENIOR">Senior</SelectItem>
                    <SelectItem value="EXPERT">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
                <Label>Spécialités</Label>
                <CardDescription className="text-xs mb-2">Sélectionnez les domaines de compétence de ce membre.</CardDescription>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                    {allSpecialties.map(specialty => (
                        <div key={specialty} className="flex items-center space-x-2">
                            <Checkbox 
                                id={specialty}
                                checked={formData.specialties.includes(specialty)}
                                onCheckedChange={() => handleSpecialtyChange(specialty)}
                            />
                            <Label htmlFor={specialty} className="font-normal">{translateSpecialty(specialty)}</Label>
                        </div>
                    ))}
                </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex justify-end pt-4">
              <Button type="submit" className="bg-enarva-gradient rounded-lg px-8" disabled={isLoading}>
                {isLoading ? 'Ajout en cours...' : 'Ajouter le Membre'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}