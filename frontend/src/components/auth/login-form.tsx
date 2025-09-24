'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import Image from 'next/image'
import { Footer } from '@/components/layout/footer'

export const LoginForm: React.FC = () => {
    const [showPassword, setShowPassword] = useState(false)
    const [keepLoggedIn, setKeepLoggedIn] = useState(true)
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    })
    const [isLoading, setIsLoading] = useState(false)
    const { login } = useAuth()

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            await login(formData.username, formData.password)
        } catch {
            // Error is handled by toast notifications
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-white overflow-hidden flex flex-col pb-20">
            {/* Header */}
            <header className="flex justify-between items-center p-6">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 flex items-center justify-center" style={{ backgroundColor: 'oklch(50% 0.134 242.749)' }}>
                        <div className="w-4 h-4 bg-white"></div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-semibold text-gray-900">SignVerse</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex flex-1 pb-16 items-center justify-center p-4">
                {/* Centered Card with Shadow */}
                <div className="w-full max-w-4xl bg-white shadow-2xl overflow-hidden">
                    <div className="flex flex-col lg:flex-row min-h-[500px]">
                        {/* Left Panel - Branding */}
                        <div className="lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-8" style={{ background: 'linear-gradient(to bottom right, oklch(95% 0.05 242.749), oklch(90% 0.08 242.749))' }}>
                            <div className="max-w-lg mx-auto text-center flex flex-col justify-center items-center">
                                {/* Banner Image */}
                                <div className="mb-6">
                                    <div className="relative w-48 h-48 lg:w-64 lg:h-64 mx-auto flex items-center justify-center">
                                        <Image
                                            src="/images/assets/login_banner.png"
                                            alt="SignVerse Login Banner"
                                            width={500}
                                            height={500}
                                            className="max-w-full h-auto object-contain"
                                            priority
                                        />
                                    </div>
                                </div>

                                {/* Promotional Content */}
                                <h1 className="text-xl lg:text-2xl font-bold text-gray-800 mb-4">
                                    Welcome to SignVerse
                                </h1>
                                <p className="text-gray-600 mb-8 text-base lg:text-lg">
                                    Your AI-powered sign language translation platform.
                                    Connect, communicate, and bridge the gap between
                                    spoken and sign languages.
                                </p>
                            </div>
                        </div>

                        {/* Right Panel - Login Form */}
                        <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-8">
                            <div className="w-full max-w-sm flex flex-col justify-center">
                                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                                    Sign In
                                </h2>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Username Field */}
                                    <div>
                                        <label htmlFor="username" className="block text-xs font-medium text-gray-700 mb-2">
                                            Username
                                        </label>
                                        <input
                                            type="text"
                                            id="username"
                                            name="username"
                                            placeholder="Enter your username"
                                            value={formData.username}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-black text-sm"
                                            required
                                        />
                                    </div>

                                    {/* Password Field */}
                                    <div>
                                        <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-2">
                                            Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                id="password"
                                                name="password"
                                                placeholder="Enter your password"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 pr-12 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-black text-sm"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                            >
                                                {showPassword ? (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Keep Logged In Checkbox */}
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="keepLoggedIn"
                                            checked={keepLoggedIn}
                                            onChange={(e) => setKeepLoggedIn(e.target.checked)}
                                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
                                        />
                                        <label htmlFor="keepLoggedIn" className="ml-2 text-xs text-gray-700">
                                            Keep me logged in
                                        </label>
                                    </div>

                                    {/* Login Button */}
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full text-white font-semibold py-3 px-4 transition-colors duration-200 text-sm disabled:opacity-50"
                                        style={{
                                            backgroundColor: 'oklch(50% 0.134 242.749)'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isLoading) {
                                                e.currentTarget.style.backgroundColor = 'oklch(45% 0.134 242.749)'
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isLoading) {
                                                e.currentTarget.style.backgroundColor = 'oklch(50% 0.134 242.749)'
                                            }
                                        }}
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Signing in...
                                            </div>
                                        ) : (
                                            'Sign In'
                                        )}
                                    </button>
                                </form>

                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}