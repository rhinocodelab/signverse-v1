'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { AuthContextType, User } from '@/types/auth'
import { apiService } from '@/services/api'
import toast from 'react-hot-toast'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

interface AuthProviderProps {
    children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Check for existing token on mount
        const storedToken = localStorage.getItem('auth_token')
        if (storedToken) {
            setToken(storedToken)
            // TODO: Verify token and get user info
            // For now, we'll just set a basic user object
            setUser({
                id: 1,
                username: 'admin',
                is_active: true,
                is_superuser: true,
                created_at: new Date().toISOString(),
            })
        }
        setIsLoading(false)
    }, [])

    const login = async (username: string, password: string) => {
        try {
            const response = await apiService.login({ username, password })
            const { access_token } = response

            localStorage.setItem('auth_token', access_token)
            setToken(access_token)

            // TODO: Get user info from token or separate endpoint
            setUser({
                id: 1,
                username,
                is_active: true,
                is_superuser: true,
                created_at: new Date().toISOString(),
            })

            toast.success('Login successful!')
        } catch (error) {
            // Error toast is already shown by the API service
            throw error
        }
    }


    const logout = () => {
        localStorage.removeItem('auth_token')
        setToken(null)
        setUser(null)
        toast.success('Logged out successfully!')
    }

    const value: AuthContextType = {
        user,
        token,
        login,
        logout,
        isLoading,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
