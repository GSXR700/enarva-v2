'use client'

// Import required dependencies and components
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Plus, Users, Shield, Award, User as UserIcon, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { User, TeamMember } from '@prisma/client'
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton'
import { toast } from 'sonner'

// Define type for TeamMember with User relation
type TeamMemberWithUser = TeamMember & { user: User };

// Main component for Teams page
export default function TeamsPage() {
  // State for team members, filtered members, and filters
  const [allMembers, setAllMembers] = useState<TeamMemberWithUser[]>([])
  const [filteredMembers, setFilteredMembers] = useState<TeamMemberWithUser[]>([])
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch team members from API
  const fetchTeamMembers = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/team-members')
      if (!response.ok) throw new Error('Impossible de récupérer les membres.')
      const data = await response.json()
      
      // Ensure data is an array
      const members = Array.isArray(data) ? data : (data.data || [])
      setAllMembers(members)
      setFilteredMembers(members)
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
      setAllMembers([])
      toast.error(err.message || 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  // Load team members on component mount
  useEffect(() => {
    fetchTeamMembers()
  }, [])

  // Filter members based on role and search query
  useEffect(() => {
    if (!Array.isArray(allMembers)) {
      setFilteredMembers([])
      return
    }

    let members = [...allMembers]
    if (roleFilter !== 'all') {
      members = members.filter(member => member.user?.role === roleFilter)
    }
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase()
      members = members.filter(member =>
        (member.user?.name?.toLowerCase().includes(lowercasedQuery)) ||
        (member.user?.email?.toLowerCase().includes(lowercasedQuery))
      )
    }
    setFilteredMembers(members)
  }, [searchQuery, roleFilter, allMembers])

  // Handle member deletion
  const handleDelete = async (memberId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce membre ? Cette action est irréversible et supprimera également son compte utilisateur.")) return

    try {
      const response = await fetch(`/api/team-members/${memberId}`, {
        method: 'DELETE',
      })
      if (response.status !== 204) throw new Error("La suppression a échoué.")
      toast.success("Membre supprimé avec succès.")
      fetchTeamMembers() // Refresh the list
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression')
    }
  }

  // Get color for role badge
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'TEAM_LEADER': return 'bg-purple-100 text-purple-800'
      case 'TECHNICIAN': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Get icon for role
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'TEAM_LEADER': return <Shield className="w-4 h-4" />
      case 'TECHNICIAN': return <Users className="w-4 h-4" />
      default: return <UserIcon className="w-4 h-4" />
    }
  }

  // Render loading skeleton if data is loading
  if (isLoading) {
    return <CardGridSkeleton title="Chargement des membres..." />
  }

  return (
    <div className="main-content space-y-6">
      {/* Header with title and new member button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Équipes</h1>
          <p className="text-muted-foreground mt-1">Gérez les membres de votre équipe</p>
        </div>
        <Link href="/teams/new">
          <Button className="bg-enarva-gradient rounded-lg">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Membre
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="thread-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Rechercher par nom ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrer par rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="TEAM_LEADER">Chef d'équipe</SelectItem>
                <SelectItem value="TECHNICIAN">Technicien</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="AGENT">Agent</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error message */}
      {error && (
        <Card className="thread-card">
          <CardContent className="pt-6 text-center text-red-500">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Team Members List */}
      {filteredMembers.length === 0 && !error ? (
        <Card className="thread-card">
          <CardContent className="pt-6 text-center">
            <Users className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || roleFilter !== 'all' 
                ? 'Aucun membre trouvé' 
                : 'Aucun membre d\'équipe disponible'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="thread-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={member.user?.image || ''} alt={member.user?.name || ''} />
                    <AvatarFallback>{member.user?.name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{member.user?.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {member.user?.email}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/teams/${member.id}/edit`} className="flex items-center gap-2">
                        <Edit className="w-4 h-4" />
                        Modifier
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(member.id)}
                      className="flex items-center gap-2 text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  {getRoleIcon(member.user?.role || '')}
                  <Badge className={getRoleColor(member.user?.role || '')}>
                    {member.user?.role === 'TEAM_LEADER' ? 'Chef d\'équipe' : 
                     member.user?.role === 'TECHNICIAN' ? 'Technicien' : 
                     member.user?.role}
                  </Badge>
                </div>
                
                {member.specialties && member.specialties.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Spécialités:</p>
                    <div className="flex flex-wrap gap-1">
                      {member.specialties.slice(0, 2).map((specialty) => (
                        <Badge key={specialty} variant="secondary" className="text-xs">
                          {specialty.replace('_', ' ')}
                        </Badge>
                      ))}
                      {member.specialties.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{member.specialties.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {member.experience === 'JUNIOR' ? 'Junior' : 
                       member.experience === 'SENIOR' ? 'Senior' : 
                       member.experience === 'EXPERT' ? 'Expert' : 
                       member.experience || 'Non défini'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      member.user?.onlineStatus === 'ONLINE' ? 'bg-green-500' : 
                      member.user?.onlineStatus === 'BUSY' ? 'bg-yellow-500' : 'bg-gray-300'
                    }`} />
                    <span className="text-xs text-muted-foreground">
                      {member.user?.onlineStatus === 'ONLINE' ? 'En ligne' : 
                       member.user?.onlineStatus === 'BUSY' ? 'Occupé' : 'Hors ligne'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}