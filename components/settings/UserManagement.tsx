// components/settings/UserManagement.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Edit, Trash2, Users, Loader2, Save, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { UserRole } from '@prisma/client'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
}

const roleLabels: { [key in UserRole]: string } = {
  ADMIN: 'Administrateur',
  MANAGER: 'Manager',
  AGENT: 'Agent',
  TEAM_LEADER: 'Chef d\'équipe',
  TECHNICIAN: 'Technicien'
}

const roleColors: { [key in UserRole]: string } = {
  ADMIN: 'bg-red-100 text-red-800',
  MANAGER: 'bg-purple-100 text-purple-800',
  AGENT: 'bg-blue-100 text-blue-800',
  TEAM_LEADER: 'bg-orange-100 text-orange-800',
  TECHNICIAN: 'bg-green-100 text-green-800'
}

const initialFormState = {
  id: '',
  name: '',
  email: '',
  password: '',
  role: 'TECHNICIAN' as UserRole
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formState, setFormState] = useState(initialFormState)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [page, setPage] = useState(1)
  const [limit] = useState(10) // Fixed: Remove setLimit since it's not used
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
      console.log('API Response:', data) // Debug log
      
      // FIX: Handle both response formats
      // API returns users directly as array, not wrapped in {users: []}
      const usersList = Array.isArray(data) ? data : (data.users || [])
      
      setUsers(usersList)
      
      // Handle pagination headers
      const totalPagesHeader = response.headers.get('X-Total-Pages')
      if (totalPagesHeader) {
        setTotalPages(parseInt(totalPagesHeader))
      } else if (data.totalPages) {
        setTotalPages(data.totalPages)
      }
      
    } catch (error: any) {
      console.error('Failed to fetch users:', error)
      toast.error(error.message)
      setUsers([]) // Ensure users is an array on error
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
        role: formState.role
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
        throw new Error(errorData.message || `Impossible de ${isEditing ? 'mettre à jour' : 'créer'} l'utilisateur`)
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
      role: user.role
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
        throw new Error(errorData.message || 'Impossible de supprimer l\'utilisateur');
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

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'bg-green-100 text-green-800'
      case 'AWAY': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <Card className="thread-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-enarva-start" />
                Gestion des Utilisateurs
              </CardTitle>
              <CardDescription>
                Gérez les comptes utilisateurs et leurs permissions dans l'organisation.
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog} className="bg-enarva-gradient">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un utilisateur
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>
                    {isEditing ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="user-name">Nom complet</Label>
                    <Input
                      id="user-name"
                      placeholder="Ex: Jean Dupont"
                      value={formState.name}
                      onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="user-email">Email</Label>
                    <Input
                      id="user-email"
                      type="email"
                      placeholder="jean.dupont@enarva.com"
                      value={formState.email}
                      onChange={(e) => setFormState(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>

                  {!isEditing && (
                    <div className="space-y-2">
                      <Label htmlFor="user-password">Mot de passe temporaire</Label>
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

                  <div className="space-y-2">
                    <Label htmlFor="user-role">Rôle</Label>
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
                            <div className={`inline-block w-3 h-3 mr-2 rounded-full ${roleColors[key as UserRole]}`}></div>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
          <div className="mb-4 flex items-center space-x-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher par nom ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-gray-500">Aucun utilisateur trouvé.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto border-collapse">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left">Utilisateur</th>
                    <th className="px-4 py-2 text-left">Rôle</th>
                    <th className="px-4 py-2 text-left">Statut</th>
                    <th className="px-4 py-2 text-left">Dernière connexion</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
                          {user.image ? (
                            <AvatarImage src={user.image} alt={user.name || 'Avatar'} />
                          ) : (
                            <AvatarFallback>{user.name ? user.name.charAt(0) : user.email?.charAt(0)}</AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name || 'N/A'}</p>
                          <p className="text-sm text-gray-500">{user.email || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`px-2 py-1 ${roleColors[user.role]}`}>
                          {roleLabels[user.role]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`px-2 py-1 ${getStatusBadge(user.onlineStatus)}`}>
                          {user.onlineStatus === 'ONLINE' ? 'En ligne' : user.onlineStatus === 'AWAY' ? 'Absent' : 'Hors ligne'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {user.lastSeen ? new Date(user.lastSeen).toLocaleString() : 'Jamais connecté'}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(user)}
                          title="Modifier l'utilisateur"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(user.id)}
                          title="Supprimer l'utilisateur"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Page {page} sur {totalPages}
                </p>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}