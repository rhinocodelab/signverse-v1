'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { LogOut, User, Key, ChevronDown } from 'lucide-react'
import { ChangePasswordModal } from './change-password-modal'

export const DashboardHeader: React.FC = () => {
    const { user, logout } = useAuth()
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)


    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    return (
        <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-end">
                {/* User info and actions */}
                <div className="flex items-center space-x-4">
                    {/* User Profile with Dropdown */}
                    <div className="flex items-center space-x-3">
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center space-x-2 hover:bg-gray-50 p-2 rounded-lg transition-colors"
                            >
                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-gray-600" />
                                </div>
                                <div className="hidden sm:block">
                                    <div className="text-sm font-medium text-gray-900">{user?.username}</div>
                                    <div className="text-xs text-gray-500">
                                        {user?.is_superuser ? 'Administrator' : 'User'}
                                    </div>
                                </div>
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                            </button>

                            {/* User Dropdown Menu */}
                            {showUserMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-none shadow-2xl border border-gray-200 z-50">
                                    <div className="py-1">
                                        <button
                                            onClick={() => {
                                                setShowChangePasswordModal(true)
                                                setShowUserMenu(false)
                                            }}
                                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            <Key className="w-4 h-4 mr-3" />
                                            Change Password
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Logout Button - Outside dropdown */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={logout}
                            className="flex items-center space-x-2"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Logout</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Change Password Modal */}
            {showChangePasswordModal && (
                <ChangePasswordModal
                    isOpen={showChangePasswordModal}
                    onClose={() => setShowChangePasswordModal(false)}
                    onSuccess={() => {
                        setShowChangePasswordModal(false)
                        logout()
                    }}
                />
            )}
        </header>
    )
}
