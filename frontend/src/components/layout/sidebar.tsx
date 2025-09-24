'use client'

import React, { useState } from 'react'
import {
    Route,
    ChevronDown,
    ChevronRight,
    Brain,
    Languages,
    Volume2,
    Hand,
    Megaphone,
    Mic,
    BookOpen,
    FileText,
    Radio,
    Zap
} from 'lucide-react'

interface SidebarProps {
    activeMenu: string
    onMenuChange: (menuId: string) => void
}

interface MenuItem {
    id: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    submenu?: MenuItem[]
}

export const Sidebar: React.FC<SidebarProps> = ({ activeMenu, onMenuChange }) => {
    const [expandedCategories, setExpandedCategories] = useState<string[]>(['ai-content-generation', 'indian-sign-language'])

    const menuItems: MenuItem[] = [
        {
            id: 'dashboard-main',
            label: 'Generate Announcement',
            icon: Zap
        },
        {
            id: 'live-announcements',
            label: 'Live Announcements',
            icon: Radio
        },
        {
            id: 'route-management',
            label: 'Route Management',
            icon: Route
        },
        {
            id: 'ai-content-generation',
            label: 'AI Content Generation',
            icon: Brain,
            submenu: [
                {
                    id: 'text-to-isl',
                    label: 'Text to ISL',
                    icon: Languages
                },
                {
                    id: 'audio-file-to-isl',
                    label: 'Audio File to ISL',
                    icon: Volume2
                },
                {
                    id: 'speech-to-isl',
                    label: 'Speech to ISL',
                    icon: Mic
                },
                {
                    id: 'general-announcement-isl',
                    label: 'General Announcement ISL',
                    icon: Megaphone
                },
                {
                    id: 'announcement-templates',
                    label: 'Announcement Templates',
                    icon: FileText
                }
            ]
        },
        {
            id: 'indian-sign-language',
            label: 'Indian Sign Language (ISL)',
            icon: Hand,
            submenu: [
                {
                    id: 'isl-dictionary',
                    label: 'ISL Dictionary',
                    icon: BookOpen
                }
            ]
        }
    ]

    const handleCategoryToggle = (categoryId: string) => {
        setExpandedCategories(prev =>
            prev.includes(categoryId)
                ? prev.filter(id => id !== categoryId)
                : [...prev, categoryId]
        )
    }

    return (
        <div className="w-72 bg-white border-r border-gray-200">
            {/* Sidebar Header */}
            <div className="p-4">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 flex items-center justify-center" style={{ backgroundColor: 'oklch(50% 0.134 242.749)' }}>
                        <div className="w-4 h-4 bg-white"></div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-lg font-semibold text-gray-900">SignVerse</span>
                        <span className="text-xs text-gray-500">Western Railway</span>
                        <span className="text-xs text-gray-500">ISL Announcement System</span>
                    </div>
                </div>
            </div>

            {/* Menu Items */}
            <nav className="p-4 space-y-2">
                {menuItems.map((item) => {
                    const Icon = item.icon
                    const isActive = activeMenu === item.id
                    const isExpanded = expandedCategories.includes(item.id)
                    const hasSubmenu = item.submenu && item.submenu.length > 0

                    return (
                        <div key={item.id}>
                            {/* Main Menu Item */}
                            <button
                                onClick={() => hasSubmenu ? handleCategoryToggle(item.id) : onMenuChange(item.id)}
                                className={`w-full flex items-center space-x-3 p-3 transition-colors ${isActive
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                                <div className="flex-1 text-left">
                                    <div className="font-medium">{item.label}</div>
                                </div>
                                {hasSubmenu && (
                                    isExpanded ?
                                        <ChevronDown className="w-4 h-4 text-gray-400" /> :
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                            </button>

                            {/* Submenu Items */}
                            {hasSubmenu && isExpanded && (
                                <div className="ml-6 mt-1 space-y-1">
                                    {item.submenu!.map((subItem) => {
                                        const SubIcon = subItem.icon
                                        const isSubActive = activeMenu === subItem.id

                                        return (
                                            <button
                                                key={subItem.id}
                                                onClick={() => onMenuChange(subItem.id)}
                                                className={`w-full flex items-center space-x-3 p-2 transition-colors ${isSubActive
                                                    ? 'bg-blue-50 text-blue-700'
                                                    : 'text-gray-600 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <SubIcon className={`w-4 h-4 ${isSubActive ? 'text-blue-600' : 'text-gray-400'}`} />
                                                <div className="flex-1 text-left">
                                                    <div className="text-sm font-medium">{subItem.label}</div>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })}
            </nav>
        </div>
    )
}
