// components/settings/UserManagement.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Edit, Trash2, Users, Mail, Shield, Loader2, Save, X } from 'lucide-react'
import { UserRole } from '@prisma/client'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

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

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/users')
      if (!response.ok) throw new Error('Impossible de charger les utilisateurs')
      const data = await response.json()
      setUsers(data)
    } catch (error: any) {
      toast.error(error.message)
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
        throw new Error(`Impossible de ${isEditing ? 'mettre à jour' : 'créer'} l'utilisateur`)
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
      if (!response.ok) throw new Error('Impossible de supprimer l\'utilisateur')
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
    const colors = {
      ONLINE: 'bg-green-100 text-green-800',
      OFFLINE: 'bg-gray-100 text-gray-800',
      AWAY: 'bg-yellow-100 text-yellow-800'
    }
    return colors[status as keyof typeof colors] || colors.OFFLINE
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
                Gérez les membres de votre équipe et leurs permissions
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog} className="bg-enarva-gradient">
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvel Utilisateur
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
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
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 bg-enarva-gradient"
                    >
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
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Annuler
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-enarva-start" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucun utilisateur trouvé</p>
              <p className="text-sm">Créez votre premier utilisateur</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="p-4 border border-border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.image || undefined} />
                          <AvatarFallback>
                            {user.name?.split(' ').map(n => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge className={roleColors[user.role]}>
                        {roleLabels[user.role]}
                      </Badge>
                      <Badge className={getStatusBadge(user.onlineStatus)}>
                        {user.onlineStatus === 'ONLINE' ? 'En ligne' : 
                         user.onlineStatus === 'AWAY' ? 'Absent' : 'Hors ligne'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-foreground">Utilisateur</th>
                      <th className="text-left py-3 px-4 font-medium text-foreground">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-foreground">Rôle</th>
                      <th className="text-left py-3 px-4 font-medium text-foreground">Statut</th>
                      <th className="text-left py-3 px-4 font-medium text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-border hover:bg-muted/30">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.image || undefined} />
                              <AvatarFallback>
                                {user.name?.split(' ').map(n => n[0]).join('') || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {user.email}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={roleColors[user.role]}>
                            <Shield className="w-3 h-3 mr-1" />
                            {roleLabels[user.role]}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusBadge(user.onlineStatus)}>
                            {user.onlineStatus === 'ONLINE' ? 'En ligne' : 
                             user.onlineStatus === 'AWAY' ? 'Absent' : 'Hors ligne'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(user)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(user.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}