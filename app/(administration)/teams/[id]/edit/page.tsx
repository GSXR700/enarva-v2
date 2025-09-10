'use client'

// Import required dependencies and components
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import { User, TeamMember, TeamSpecialty, ExperienceLevel, TeamAvailability, UserRole } from '@prisma/client'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'

// Define type for TeamMember with User relation
type TeamMemberWithUser = TeamMember & { user: User , specialties: TeamSpecialty[] , experience: ExperienceLevel, availability: TeamAvailability,name: User['name'],email: User['email'],role: User['role']};

// List of all specialties
const allSpecialties = Object.values(TeamSpecialty);

// Translate specialty names
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

export default function EditTeamMemberPage() {
  // Initialize router and params
  const router = useRouter()
  const params = useParams()
  const memberId = params.id as string

  // State for form data, loading, and saving
  const [formData, setFormData] = useState<Partial<TeamMemberWithUser>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch team member data
  const fetchMember = useCallback(async () => {
    try {
      const response = await fetch(`/api/team-members/${memberId}`)
      if (!response.ok) throw new Error("Membre de l'équipe non trouvé.")
      const data = await response.json()
      setFormData({
        ...data,
        // Flatten user data for easier form management
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
      })
    } catch (error) {
      toast.error("Impossible de charger les données du membre.")
      router.push('/teams')
    } finally {
      setIsLoading(false)
    }
  }, [memberId, router])

  // Load member data on mount
  useEffect(() => {
    fetchMember()
  }, [fetchMember])

  // Handle text input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  // Handle select dropdown changes
  const handleSelectChange = (id: keyof (TeamMember & User), value: string) => {
    setFormData(prev => ({ ...prev, [id]: value as any }))
  }

  // Handle specialty checkbox changes
  const handleSpecialtyChange = (specialty: TeamSpecialty) => {
    setFormData(prev => {
      const currentSpecialties = prev.specialties || []
      const newSpecialties = currentSpecialties.includes(specialty)
        ? currentSpecialties.filter(s => s !== specialty)
        : [...currentSpecialties, specialty]
      return { ...prev, specialties: newSpecialties }
    })
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const response = await fetch(`/api/team-members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData || "La mise à jour a échoué.")
      }
      
      toast.success("Membre mis à jour avec succès !")
      router.push('/teams')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Render loading skeleton if data is loading
  if (isLoading) {
    return <TableSkeleton title="Chargement des données du membre..." />
  }

  return (
    <div className="main-content space-y-6">
      {/* Header with title */}
      <div className="flex items-center gap-4">
        <Link href="/teams">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Modifier un Membre</h1>
          <p className="text-muted-foreground mt-1">Mise à jour du profil de {formData.name}.</p>
        </div>
      </div>

      {/* Form for editing team member */}
      <form onSubmit={handleSubmit}>
        <Card className="thread-card">
          <CardHeader>
            <CardTitle>Informations du Membre</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Nom</Label>
                <Input id="name" value={formData.name || ''} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email || ''} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="role">Rôle</Label>
                <Select value={formData.role} onValueChange={(v) => handleSelectChange('role', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.TECHNICIAN}>Technicien</SelectItem>
                    <SelectItem value={UserRole.TEAM_LEADER}>Chef d'équipe</SelectItem>
                    <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                    <SelectItem value={UserRole.AGENT}>Agent</SelectItem>
                    <SelectItem value={UserRole.MANAGER}>Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="experience">Niveau d'expérience</Label>
                <Select value={formData.experience} onValueChange={(v) => handleSelectChange('experience', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ExperienceLevel.JUNIOR}>Junior</SelectItem>
                    <SelectItem value={ExperienceLevel.INTERMEDIATE}>Intermédiaire</SelectItem>
                    <SelectItem value={ExperienceLevel.SENIOR}>Senior</SelectItem>
                    <SelectItem value={ExperienceLevel.EXPERT}>Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Spécialités</Label>
              <CardDescription className="text-xs mb-2">Mettez à jour les compétences de ce membre.</CardDescription>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                {allSpecialties.map(specialty => (
                  <div key={specialty} className="flex items-center space-x-2">
                    <Checkbox 
                      id={specialty}
                      checked={formData.specialties?.includes(specialty)}
                      onCheckedChange={() => handleSpecialtyChange(specialty)}
                    />
                    <Label htmlFor={specialty} className="font-normal">{translateSpecialty(specialty)}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" className="bg-enarva-gradient rounded-lg px-8" disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}