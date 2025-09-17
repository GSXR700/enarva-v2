// app/(administration)/profile/page.tsx - FINAL FIX

'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Loader2, Upload, LogOut } from 'lucide-react'
import { AvatarCropperModal } from '@/components/ui/AvatarCropperModal'
import { useEdgeStore } from '@/lib/edgestore'
import { SettingsSkeleton } from '@/components/skeletons/SettingsSkeleton'

const profileFormSchema = z.object({
  name: z.string().min(1, 'Le nom est requis.'),
  email: z.string().email('Adresse e-mail invalide.'),
})

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Le mot de passe actuel est requis.'),
    newPassword: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères.'),
    confirmPassword: z.string(),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas.',
    path: ['confirmPassword'],
  })


export default function ProfilePage() {
  const currentUser = useCurrentUser()
  const { data: session, update } = useSession()
  const { edgestore } = useEdgeStore()

  const [isLoading, setIsLoading] = useState(true)
  const [isAvatarCropperOpen, setAvatarCropperOpen] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | undefined>(undefined)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const profileForm = useForm({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: '', email: '' },
  })

  const passwordForm = useForm({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (currentUser) {
      profileForm.reset({
        name: currentUser.name || '',
        email: currentUser.email || '',
      })
      setIsLoading(false)
    }
  }, [currentUser, profileForm])
  
  const urlToFile = async (url: string, filename: string, mimeType: string): Promise<File> => {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    return new File([buf], filename, { type: mimeType });
  };


  const handleAvatarUpload = async (croppedImageBlobUrl: string) => {
    if (!currentUser) return
    setUploadStatus('uploading')
    try {
      const croppedFile = await urlToFile(croppedImageBlobUrl, `${currentUser.id}-avatar.jpeg`, 'image/jpeg');

      const res = await edgestore.profileImages.upload({
    file: croppedFile,
    ...(session?.user?.image && {
        options: {
            replaceTargetUrl: session.user.image,
        }
    }),
});

      await update({ image: res.url })
      
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: res.url, userId: currentUser.id }),
      })

      if (!response.ok) throw new Error('Failed to update profile picture.')

      toast.success('Avatar mis à jour avec succès.')
      setUploadStatus('success')
    } catch (error) {
      toast.error('Erreur lors de la mise à jour de l\'avatar.')
      setUploadStatus('error')
    } finally {
      setAvatarCropperOpen(false)
    }
  }

  const handleProfileSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: values.name, userId: currentUser?.id }),
    })

    if (response.ok) {
      await update({ name: values.name })
      toast.success('Profil mis à jour avec succès.')
    } else {
      toast.error('Erreur lors de la mise à jour du profil.')
    }
  }

  const handlePasswordSubmit = async (values: z.infer<typeof passwordFormSchema>) => {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, userId: currentUser?.id }),
    })
    
    if (response.ok) {
      toast.success('Mot de passe mis à jour avec succès.');
      passwordForm.reset();
    } else {
      const errorData = await response.json();
      toast.error(errorData.error || 'Erreur lors de la mise à jour du mot de passe.');
    }
  }

  if (isLoading || !currentUser) {
    return <SettingsSkeleton />
  }

  return (
    <div className="main-content space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Profil & Sécurité</h1>
        <p className="text-muted-foreground mt-1">
          Gérez vos informations personnelles et les paramètres de votre compte.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card className="thread-card">
            <CardHeader>
              <CardTitle>Photo de Profil</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <Avatar className="w-32 h-32">
                <AvatarImage src={session?.user?.image ?? undefined} />
                <AvatarFallback className="text-4xl">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : '?'}
                </AvatarFallback>
              </Avatar>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImageToCrop(URL.createObjectURL(file));
                    setAvatarCropperOpen(true);
                  }
                }}
                className="hidden"
                accept="image/*"
              />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                {uploadStatus === 'uploading' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Changer l'avatar
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-8">
          <Card className="thread-card">
            <CardHeader>
              <CardTitle>Informations Personnelles</CardTitle>
              <CardDescription>Mettez à jour votre nom et votre adresse e-mail.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="name">Nom complet</label>
                  <Input id="name" {...profileForm.register('name')} />
                  {profileForm.formState.errors.name && (
                    <p className="text-red-500 text-sm mt-1">{profileForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="email">Adresse e-mail</label>
                  <Input id="email" type="email" {...profileForm.register('email')} disabled />
                </div>
                <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                  {profileForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer les modifications
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="thread-card">
            <CardHeader>
              <CardTitle>Changer le mot de passe</CardTitle>
              <CardDescription>Il est recommandé d'utiliser un mot de passe fort.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="currentPassword">Mot de passe actuel</label>
                  <Input id="currentPassword" type="password" {...passwordForm.register('currentPassword')} />
                   {passwordForm.formState.errors.currentPassword && (
                    <p className="text-red-500 text-sm mt-1">{passwordForm.formState.errors.currentPassword.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="newPassword">Nouveau mot de passe</label>
                  <Input id="newPassword" type="password" {...passwordForm.register('newPassword')} />
                   {passwordForm.formState.errors.newPassword && (
                    <p className="text-red-500 text-sm mt-1">{passwordForm.formState.errors.newPassword.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
                  <Input id="confirmPassword" type="password" {...passwordForm.register('confirmPassword')} />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                   {passwordForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Changer le mot de passe
                </Button>
              </form>
            </CardContent>
          </Card>
           <Card className="thread-card border-red-500/50">
            <CardHeader>
              <CardTitle className="text-red-500">Zone de Danger</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-center">
                    <div>
                        <p className="font-medium">Déconnexion</p>
                        <p className="text-sm text-muted-foreground">Se déconnecter de votre session actuelle.</p>
                    </div>
                    <Button variant="destructive" onClick={() => signOut({ callbackUrl: '/login' })}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Se déconnecter
                    </Button>
                </div>
            </CardContent>
        </Card>
        </div>
      </div>

      {imageToCrop && (
        <AvatarCropperModal
          isOpen={isAvatarCropperOpen}
          onClose={() => setAvatarCropperOpen(false)}
          imageSrc={imageToCrop}
          onSave={handleAvatarUpload}
        />
      )}
    </div>
  )
}