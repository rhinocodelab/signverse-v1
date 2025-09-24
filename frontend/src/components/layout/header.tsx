'use client'

import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { LogOut, User } from 'lucide-react'

export const Header: React.FC = () => {
    const { user, logout } = useAuth()

    return (
        <header className="border-b bg-white">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <h1 className="text-2xl font-bold text-blue-600">SignVerse</h1>
                </div>

                {user && (
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span className="text-sm font-medium">{user.username}</span>
                            {user.is_superuser && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                    Admin
                                </span>
                            )}
                        </div>
                        <Button variant="outline" size="sm" onClick={logout}>
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                )}
            </div>
        </header>
    )
}
