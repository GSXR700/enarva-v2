'use client'

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

type TeamMemberWithUser = TeamMember & { user: User };

export default function TeamsPage() {
  const [allMembers, setAllMembers] = useState<TeamMemberWithUser[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMemberWithUser[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTeamMembers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/team-members');
      if (!response.ok) throw new Error('Impossible de récupérer les membres.');
      const data = await response.json();
      
      // FIX: Extract teamMembers array from the API response object
      const members = Array.isArray(data) ? data : (data.teamMembers || []);
      setAllMembers(members);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
      setAllMembers([]); // Ensure allMembers is always an array
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    // FIX: Ensure allMembers is always an array before spreading
    if (!Array.isArray(allMembers)) {
      setFilteredMembers([]);
      return;
    }

    let members = [...allMembers];
    if (roleFilter !== 'all') {
      members = members.filter(member => member.user?.role === roleFilter);
    }
    if (searchQuery) {
        const lowercasedQuery = searchQuery.toLowerCase();
        members = members.filter(member =>
            member.firstName?.toLowerCase().includes(lowercasedQuery) ||
            member.lastName?.toLowerCase().includes(lowercasedQuery) ||
            (member.email && member.email.toLowerCase().includes(lowercasedQuery))
        );
    }
    setFilteredMembers(members);
  }, [searchQuery, roleFilter, allMembers]);
  
  const handleDelete = async (memberId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce membre ? Cette action est irréversible et supprimera également son compte utilisateur.")) return;

    try {
        const response = await fetch(`/api/team-members/${memberId}`, {
            method: 'DELETE',
        });
        if (response.status !== 204) throw new Error("La suppression a échoué.");
        toast.success("Membre supprimé avec succès.");
        fetchTeamMembers(); // Refresh the list
    } catch (error: any) {
        toast.error(error.message || 'Erreur lors de la suppression');
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'TEAM_LEADER': return 'bg-purple-100 text-purple-800';
      case 'TECHNICIAN': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'TEAM_LEADER': return <Shield className="w-4 h-4" />;
      default: return <UserIcon className="w-4 h-4" />;
    }
  }
  
  if (isLoading) {
    return <CardGridSkeleton title="Gestion des Équipes" description="Chargement des membres de l'équipe..." />;
  }

  if (error) {
    return (
      <div className="main-content space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gestion des Équipes</h1>
          <p className="text-muted-foreground mt-1">Une erreur est survenue</p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-red-500 mb-4">Erreur: {error}</div>
            <Button onClick={fetchTeamMembers}>Réessayer</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="main-content space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gestion des Équipes</h1>
          <p className="text-muted-foreground mt-1">
            {allMembers.length} membre{allMembers.length !== 1 ? 's' : ''} dans votre organisation
          </p>
        </div>
        <Link href="/teams/new">
            <Button className="gap-2 bg-enarva-gradient rounded-lg">
                <Plus className="w-4 h-4" />
                Nouvel Employé
            </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Rechercher par nom ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrer par rôle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            <SelectItem value="TEAM_LEADER">Chef d'équipe</SelectItem>
            <SelectItem value="TECHNICIAN">Technicien</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Team Members Grid */}
      {filteredMembers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery || roleFilter !== 'all' ? 'Aucun membre trouvé' : 'Aucun membre dans l\'équipe'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || roleFilter !== 'all' 
                ? 'Essayez de modifier vos critères de recherche.' 
                : 'Commencez par ajouter des membres à votre équipe.'}
            </p>
            {!searchQuery && roleFilter === 'all' && (
              <Link href="/teams/new">
                <Button>Ajouter un membre</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="thread-card hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={member.user?.image || undefined} />
                      <AvatarFallback>
                        {member.firstName?.[0]}{member.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {member.firstName} {member.lastName}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {member.email}
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
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  {getRoleIcon(member.user?.role || '')}
                  <Badge className={getRoleColor(member.user?.role || '')}>
                    {member.user?.role === 'TEAM_LEADER' ? 'Chef d\'équipe' : 'Technicien'}
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
                      {member.experienceLevel === 'JUNIOR' ? 'Junior' : 
                       member.experienceLevel === 'SENIOR' ? 'Senior' : 'Expert'}
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