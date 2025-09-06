// gsxr700/enarva-v2/enarva-v2-6ca61289d3a555c270f0a2db9f078e282ccd8664/app/(administration)/teams/page.tsx
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
      const response = await fetch('/api/team-members');
      if (!response.ok) throw new Error('Impossible de récupérer les membres.');
      const data = await response.json();
      setAllMembers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    let members = [...allMembers];
    if (roleFilter !== 'all') {
      members = members.filter(member => member.user.role === roleFilter);
    }
    if (searchQuery) {
        const lowercasedQuery = searchQuery.toLowerCase();
        members = members.filter(member =>
            member.firstName.toLowerCase().includes(lowercasedQuery) ||
            member.lastName.toLowerCase().includes(lowercasedQuery) ||
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
        toast.error(error.message);
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
    return <div className="main-content text-center p-10 text-red-500">Erreur: {error}</div>;
  }

  return (
    <div className="main-content space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2-xl md:text-3xl font-bold text-foreground">Gestion des Équipes</h1>
          <p className="text-muted-foreground mt-1">
            {allMembers.length} membres dans votre organisation
          </p>
        </div>
        <Link href="/teams/new">
            <Button className="gap-2 bg-enarva-gradient rounded-lg">
                <Plus className="w-4 h-4" />
                Employé
            </Button>
        </Link>
      </div>

      <Card className="thread-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-full sm:min-w-64">
              <Input
                placeholder="Rechercher par nom, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-background"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="TEAM_LEADER">Chef d'équipe</SelectItem>
                <SelectItem value="TECHNICIAN">Technicien</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredMembers.map((member) => (
          <Card key={member.id} className="thread-card flex flex-col justify-between">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={member.user.image || undefined} />
                      <AvatarFallback>{member.firstName[0]}{member.lastName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{member.firstName} {member.lastName}</h3>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4"/></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <Link href={`/teams/${member.id}/edit`}><DropdownMenuItem><Edit className="w-4 h-4 mr-2"/>Modifier</DropdownMenuItem></Link>
                        <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(member.id)}><Trash2 className="w-4 h-4 mr-2"/>Supprimer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              </div>

              <div className="flex flex-wrap gap-2">
                 <Badge className={`text-xs ${getRoleColor(member.user.role)} flex items-center gap-1`}>
                    {getRoleIcon(member.user.role)}
                    {member.user.role === 'TEAM_LEADER' ? "Chef d'équipe" : "Technicien"}
                 </Badge>
                 <Badge variant="outline" className="flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    {member.experienceLevel}
                 </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}