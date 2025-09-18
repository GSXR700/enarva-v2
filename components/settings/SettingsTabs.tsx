// components/settings/SettingsTabs.tsx
'use client'

import { cn } from '@/lib/utils'
import { FileText, Users, Settings as SettingsIcon } from 'lucide-react'

interface SettingsTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const tabs = [
  {
    id: 'general',
    label: 'Général',
    icon: SettingsIcon,
    description: 'Configuration générale'
  },
  {
    id: 'templates',
    label: 'Modèles',
    icon: FileText,
    description: 'Modèles de tâches'
  },
  {
    id: 'users',
    label: 'Utilisateurs',
    icon: Users,
    description: 'Gestion des équipes'
  }
]

export function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
  return (
    <div className="w-full">
      {/* Mobile: Dropdown-style tabs */}
      <div className="sm:hidden">
        <select
          value={activeTab}
          onChange={(e) => onTabChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop: Horizontal tabs */}
      <div className="hidden sm:block">
        <div className="border-b border-border">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    'group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium transition-colors duration-200',
                    isActive
                      ? 'border-enarva-start text-enarva-start'
                      : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                  )}
                >
                  <Icon
                    className={cn(
                      'mr-2 h-5 w-5 transition-colors duration-200',
                      isActive ? 'text-enarva-start' : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  />
                  <div className="text-left">
                    <div className="font-medium">{tab.label}</div>
                    <div className="text-xs text-muted-foreground">{tab.description}</div>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Mobile: Tab indicator cards */}
      <div className="sm:hidden mt-4 grid grid-cols-3 gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex flex-col items-center p-3 rounded-lg border transition-all duration-200',
                isActive
                  ? 'border-enarva-start bg-enarva-start/5 text-enarva-start'
                  : 'border-border bg-card text-muted-foreground hover:border-enarva-start/50 hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}