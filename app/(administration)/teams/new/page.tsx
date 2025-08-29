// app/(administration)/teams/new/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, UserPlus, Shield, User } from 'lucide-react'
import { toast } from 'sonner' // Import toast

export default function NewTeamMemberPage() {
  const router = useRouter()
  
  // --- MODIFICATION 1: Add password to the form state ---
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '', // <-- ADDED
    phone: '',
    role: 'TECHNICIAN',
    experienceLevel: 'JUNIOR',
    specialties: [],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (id: keyof typeof formData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [id]: value }))
  }

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
               {/* --- MODIFICATION 2: Add password input field --- */}
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