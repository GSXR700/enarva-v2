// app/(administration)/settings/templates/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function TemplatesRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to settings page with templates tab
    router.replace('/settings?tab=templates')
  }, [router])

  return (
    <div className="main-content flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Loader2 className="h-6 w-6 animate-spin text-enarva-start mx-auto mb-2" />
        <p className="text-muted-foreground">Redirection vers les paramètres...</p>
      </div>
    </div>
  )
}