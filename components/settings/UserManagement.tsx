'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Plus, Edit, Trash2, Users, Loader2, Save, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { UserRole, TeamSpecialty, ExperienceLevel, TeamAvailability } from '@prisma/client'
import { toast } from 'sonner'
import { useDebounce } from '@/hooks/use-debounce'

type User = {
  id: string
  name: string | null
  email: string | null
  role: UserRole
  image: string | null
  createdAt: string
  lastSeen: string | null
  onlineStatus: string
  specialties: TeamSpecialty[]
  experience: ExperienceLevel
  availability: TeamAvailability
  hourlyRate: number | null
  currentTeam: { id: string; name: string } | null
}

const roleLabels: { [key in UserRole]: string } = {
  ADMIN: 'Administrateur',
  MANAGER: 'Manager',
  AGENT: 'Agent',
  TEAM_LEADER: 'Chef d\'équipe',
  TECHNICIAN: 'Technicien'
}

const roleColors: { [key in UserRole]: string } = {
  ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  MANAGER: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  AGENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  TEAM_LEADER: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  TECHNICIAN: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
}

const specialtyLabels: { [key in TeamSpecialty]: string } = {
  GENERAL_CLEANING: 'Nettoyage général',
  WINDOW_SPECIALIST: 'Spécialiste vitres',
  FLOOR_SPECIALIST: 'Spécialiste sols',
  LUXURY_SURFACES: 'Surfaces de luxe',
  EQUIPMENT_HANDLING: 'Manipulation équipement',
  TEAM_MANAGEMENT: 'Gestion équipe',
  QUALITY_CONTROL: 'Contrôle qualité',
  DETAIL_FINISHING: 'Finitions détaillées'
}

const experienceLabels: { [key in ExperienceLevel]: string } = {
  JUNIOR: 'Junior',
  INTERMEDIATE: 'Intermédiaire',
  SENIOR: 'Senior',
  EXPERT: 'Expert'
}

const experienceColors: { [key in ExperienceLevel]: string } = {
  JUNIOR: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  INTERMEDIATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  SENIOR: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  EXPERT: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
}

const availabilityLabels: { [key in TeamAvailability]: string } = {
  AVAILABLE: 'Disponible',
  BUSY: 'Occupé',
  OFF_DUTY: 'En repos',
  VACATION: 'En congé'
}

const initialFormState = {
  id: '',
  name: '',
  email: '',
  password: '',
  role: 'TECHNICIAN' as UserRole,
  specialties: [] as TeamSpecialty[],
  experience: 'JUNIOR' as ExperienceLevel,
  availability: 'AVAILABLE' as TeamAvailability,
  hourlyRate: null as number | null
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formState, setFormState] = useState(initialFormState)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 500)

  useEffect(() => {
    fetchUsers()
  }, [page, limit, debouncedSearch])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/users?page=${page}&limit=${limit}&search=${debouncedSearch}`)
      if (!response.ok) throw new Error('Impossible de charger les utilisateurs')
      
      const data = await response.json()
      setUsers(data.users || [])
      setTotalPages(data.totalPages || 1)
    } catch (error: any) {
      console.error('Failed to fetch users:', error)
      toast.error(error.message)
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const url = isEditing ? `/api/users/${formState.id}` : '/api/users'
      const method = isEditing ? 'PUT' : 'POST'
      
      const body: any = {
        name: formState.name,
        email: formState.email,
        role: formState.role,
        specialties: formState.specialties,
        experience: formState.experience,
        availability: formState.availability,
        hourlyRate: formState.hourlyRate
      }

      if (!isEditing && formState.password) {
        body.password = formState.password
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Impossible de ${isEditing ? 'mettre à jour' : 'créer'} l'utilisateur`)
      }

      toast.success(`Utilisateur ${isEditing ? 'mis à jour' : 'créé'} avec succès !`)
      setIsDialogOpen(false)
      resetForm()
      await fetchUsers()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (user: User) => {
    setFormState({
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role,
      specialties: user.specialties || [],
      experience: user.experience || 'JUNIOR',
      availability: user.availability || 'AVAILABLE',
      hourlyRate: user.hourlyRate
    })
    setIsEditing(true)
    setIsDialogOpen(true)
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.')) 
      return

    try {
      const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Impossible de supprimer l\'utilisateur');
      }
      toast.success('Utilisateur supprimé avec succès !')
      await fetchUsers()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const resetForm = () => {
    setFormState(initialFormState)
    setIsEditing(false)
  }

  const handleSpecialtyChange = (specialty: TeamSpecialty, checked: boolean) => {
    setFormState(prev => ({
      ...prev,
      specialties: checked 
        ? [...prev.specialties, specialty]
        : prev.specialties.filter(s => s !== specialty)
    }))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestion des utilisateurs
            </CardTitle>
            <CardDescription>
              Gérez les utilisateurs, leurs rôles, spécialités et expérience
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="bg-enarva-gradient">
                <Plus className="w-4 h-4 mr-2" />
                Nouvel utilisateur
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {isEditing ? 'Modifier l\'utilisateur' : 'Créer un nouvel utilisateur'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="user-name">Nom complet *</Label>
                    <Input
                      id="user-name"
                      placeholder="Jean Dupont"
                      value={formState.name}
                      onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="user-email">Email *</Label>
                    <Input
                      id="user-email"
                      type="email"
                      placeholder="jean.dupont@example.com"
                      value={formState.email}
                      onChange={(e) => setFormState(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {!isEditing && (
                  <div className="space-y-2">
                    <Label htmlFor="user-password">Mot de passe temporaire *</Label>
                    <Input
                      id="user-password"
                      type="password"
                      placeholder="••••••••"
                      value={formState.password}
                      onChange={(e) => setFormState(prev => ({ ...prev, password: e.target.value }))}
                      required={!isEditing}
                    />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="user-role">Rôle *</Label>
                    <Select
                      value={formState.role}
                      onValueChange={(value) => setFormState(prev => ({ ...prev, role: value as UserRole }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="user-experience">Expérience</Label>
                    <Select
                      value={formState.experience}
                      onValueChange={(value) => setFormState(prev => ({ ...prev, experience: value as ExperienceLevel }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(experienceLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="user-availability">Disponibilité</Label>
                    <Select
                      value={formState.availability}
                      onValueChange={(value) => setFormState(prev => ({ ...prev, availability: value as TeamAvailability }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(availabilityLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-hourly-rate">Taux horaire (MAD)</Label>
                  <Input
                    id="user-hourly-rate"
                    type="number"
                    placeholder="25"
                    value={formState.hourlyRate || ''}
                    onChange={(e) => setFormState(prev => ({ 
                      ...prev, 
                      hourlyRate: e.target.value ? parseFloat(e.target.value) : null 
                    }))}
                    min="0"
                    max="1000"
                    step="0.01"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Spécialités</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(specialtyLabels).map(([key, label]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`specialty-${key}`}
                          checked={formState.specialties.includes(key as TeamSpecialty)}
                          onCheckedChange={(checked) => 
                            handleSpecialtyChange(key as TeamSpecialty, checked as boolean)
                          }
                        />
                        <Label htmlFor={`specialty-${key}`} className="text-sm font-normal">
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isSaving}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-enarva-gradient" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sauvegarde...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {isEditing ? 'Mettre à jour' : 'Créer'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center space-x-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-medium">Utilisateur</th>
                      <th className="text-left p-4 font-medium">Rôle</th>
                      <th className="text-left p-4 font-medium">Expérience</th>
                      <th className="text-left p-4 font-medium">Spécialités</th>
                      <th className="text-left p-4 font-medium">Équipe</th>
                      <th className="text-left p-4 font-medium">Taux/h</th>
                      <th className="text-right p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.image || ''} alt={user.name || ''} />
                              <AvatarFallback>
                                {user.name?.slice(0, 2).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={roleColors[user.role]}>
                            {roleLabels[user.role]}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge className={experienceColors[user.experience]}>
                            {experienceLabels[user.experience]}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {user.specialties?.slice(0, 2).map((specialty) => (
                              <Badge key={specialty} variant="outline" className="text-xs">
                                {specialtyLabels[specialty]}
                              </Badge>
                            ))}
                            {user.specialties?.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{user.specialties.length - 2}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {user.currentTeam ? (
                            <span className="text-sm">{user.currentTeam.name}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Aucune équipe</span>
                          )}
                        </td>
                        <td className="p-4">
                          {user.hourlyRate ? (
                            <span className="text-sm font-medium">{user.hourlyRate}MAD</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(user.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 py-4">
                <div className="text-sm text-muted-foreground">
                  Page {page} sur {totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}