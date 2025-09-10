'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, ArrowLeft, Plus, Trash2, UserPlus } from 'lucide-react';
import { UserRole, TeamSpecialty, ExperienceLevel, TeamAvailability } from '@prisma/client';

// --- Validation Schema ---
const teamMemberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.nativeEnum(UserRole),
  specialties: z.array(z.nativeEnum(TeamSpecialty)).optional(),
  experience: z.nativeEnum(ExperienceLevel).optional(),
  availability: z.nativeEnum(TeamAvailability).optional(),
});

const teamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters'),
  description: z.string().optional(),
  members: z.array(teamMemberSchema).optional(),
});

type TeamFormValues = z.infer<typeof teamSchema>;

// --- Component ---
const EditTeamPage = () => {
  const router = useRouter();
  const params = useParams();
  const teamId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [team, setTeam] = useState<any>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'members',
  });

  useEffect(() => {
    if (teamId) {
      const fetchTeam = async () => {
        try {
          setIsLoading(true);
          const response = await fetch(`/api/teams/${teamId}`);
          if (!response.ok) throw new Error('Failed to fetch team data');
          const data = await response.json();
          setTeam(data);
          reset({
            name: data.name,
            description: data.description || '',
            // Members are handled separately
          });
        } catch (error) {
          toast.error('Could not load team details.');
          router.push('/teams');
        } finally {
          setIsLoading(false);
        }
      };
      fetchTeam();
    }
  }, [teamId, reset, router]);

  const onSubmit = async (data: TeamFormValues) => {
    setIsSaving(true);
    try {
      // First, update the team info
      const teamUpdateResponse = await fetch(`/api/teams/${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, description: data.description }),
      });

      if (!teamUpdateResponse.ok) {
        throw new Error('Failed to update team information.');
      }
      toast.success('Team information updated successfully!');

      // Then, create any new team members
      if (data.members && data.members.length > 0) {
        for (const member of data.members) {
          const memberResponse = await fetch('/api/team-members', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...member,
              teamId: teamId, // **This is the critical fix**
            }),
          });

          if (!memberResponse.ok) {
            const errorData = await memberResponse.json();
            throw new Error(`Failed to add member ${member.name}: ${errorData.message}`);
          }
          toast.success(`Team member ${member.name} added successfully!`);
        }
      }
      
      router.push('/teams');
      router.refresh();

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMember = async (memberId: string, index: number) => {
    if (!confirm('Are you sure you want to remove this member from the team?')) return;
    try {
      const response = await fetch(`/api/team-members/${memberId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to remove team member.');
      toast.success('Team member removed.');
      // Refresh team data from server
       const newTeam = { ...team, members: team.members.filter((m: any) => m.id !== memberId) };
       setTeam(newTeam);

    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Teams
      </Button>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Edit Team</CardTitle>
            <CardDescription>Update the team's details and manage its members.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Team Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" {...register('description')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Existing members of the team.</CardDescription>
          </CardHeader>
          <CardContent>
            {team?.members?.length > 0 ? (
                 <div className="space-y-4">
                 {team.members.map((member: any, index: number) => (
                   <div key={member.id} className="flex items-center justify-between p-3 border rounded-md">
                     <div>
                       <p className="font-semibold">{member.user.name}</p>
                       <p className="text-sm text-muted-foreground">{member.user.email}</p>
                     </div>
                     <Button
                       type="button"
                       variant="destructive"
                       size="sm"
                       onClick={() => handleDeleteMember(member.id, index)}
                     >
                       <Trash2 className="h-4 w-4" />
                     </Button>
                   </div>
                 ))}
               </div>
            ) : (
              <p className="text-muted-foreground">No members in this team yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Add New Members</CardTitle>
                <CardDescription>Fill out the form to add new members to this team.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-lg relative space-y-4">
                         <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => remove(index)}
                        >
                            <Trash2 className="h-4 w-4 text-red-500"/>
                        </Button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Full Name</Label>
                                <Input {...register(`members.${index}.name`)} />
                                {errors.members?.[index]?.name && <p className="text-red-500 text-sm mt-1">{errors.members[index]?.name?.message}</p>}
                            </div>
                            <div>
                                <Label>Email</Label>
                                <Input type="email" {...register(`members.${index}.email`)} />
                                {errors.members?.[index]?.email && <p className="text-red-500 text-sm mt-1">{errors.members[index]?.email?.message}</p>}
                            </div>
                             <div>
                                <Label>Password</Label>
                                <Input type="password" {...register(`members.${index}.password`)} />
                                {errors.members?.[index]?.password && <p className="text-red-500 text-sm mt-1">{errors.members[index]?.password?.message}</p>}
                            </div>
                            <div>
                                <Label>Role</Label>
                                 <Select onValueChange={(value) => {/* React Hook Form handles this via register */}} {...register(`members.${index}.role`)}>
                                    <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                                    <SelectContent>
                                        {Object.values(UserRole).map(role => (
                                            <SelectItem key={role} value={role}>{role}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.members?.[index]?.role && <p className="text-red-500 text-sm mt-1">{errors.members[index]?.role?.message}</p>}
                            </div>
                        </div>
                    </div>
                ))}
                 <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ name: '', email: '', password: '', role: UserRole.TECHNICIAN })}
                    className="mt-4"
                >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Another Member
                </Button>
            </CardContent>
        </Card>


        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.push('/teams')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditTeamPage;