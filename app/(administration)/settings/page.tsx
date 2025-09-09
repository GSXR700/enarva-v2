// app/(administration)/settings/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { SettingsTabs } from '@/components/settings/SettingsTabs'
import { GeneralSettings } from '@/components/settings/GeneralSettings'
import { TemplatesSettings } from '@/components/settings/TemplatesSettings'
import { UserManagement } from '@/components/settings/UserManagement'

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['general', 'templates', 'users'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    const newUrl = `/settings${tab !== 'general' ? `?tab=${tab}` : ''}`
    router.replace(newUrl, { scroll: false })
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings />
      case 'templates':
        return <TemplatesSettings />
      case 'users':
        return <UserManagement />
      default:
        return <GeneralSettings />
    }
  }

  return (
    <div className="main-content space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Paramètres</h1>
          <p className="text-muted-foreground mt-1">Gérez les configurations globales de l'application.</p>
        </div>
      </div>

      <SettingsTabs activeTab={activeTab} onTabChange={handleTabChange} />
      
      <div className="mt-6">
        {renderTabContent()}
      </div>
    </div>
  )
}