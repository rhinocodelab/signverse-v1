import { AuthResponse, LoginRequest } from '@/types/auth'
import { TrainRoute } from '@/types/train-route'
import { TrainAnnouncementRequest, TrainAnnouncementResponse } from '@/types/train-announcement'
import toast from 'react-hot-toast'

interface LiveAnnouncement {
    announcement_id: string
    train_number: string
    train_name: string
    from_station: string
    to_station: string
    platform_number: number
    announcement_category: string
    ai_avatar_model: string
    status: 'received' | 'processing' | 'generating_video' | 'completed' | 'error'
    message: string
    progress_percentage?: number
    video_url?: string
    error_message?: string
    received_at: string
    updated_at: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:5001/api/v1'

class ApiService {
    private baseURL: string

    constructor(baseURL: string = API_BASE_URL) {
        this.baseURL = baseURL
    }

    async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T | null> {
        const url = `${this.baseURL}${endpoint}`

        const config: RequestInit = {
            headers: {
                ...options.headers,
            },
            ...options,
        }

        // Only set Content-Type for JSON requests (not for FormData)
        if (!(options.body instanceof FormData)) {
            config.headers = {
                'Content-Type': 'application/json',
                ...config.headers,
            }
        }

        // Add auth token if available
        const token = localStorage.getItem('auth_token')
        if (token) {
            config.headers = {
                ...config.headers,
                Authorization: `Bearer ${token}`,
            }
        }

        try {
            const response = await fetch(url, config)

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                const errorMessage = errorData.detail || `HTTP error! status: ${response.status}`
                // Don't show toast for 404 errors (translation not found)
                if (response.status !== 404) {
                    toast.error(errorMessage)
                }
                throw new Error(errorMessage)
            }

            // Handle 204 No Content responses (like DELETE operations)
            if (response.status === 204) {
                return null
            }

            return response.json()
        } catch (error) {
            if (error instanceof TypeError && error.message.includes('fetch')) {
                toast.error('Failed to fetch - Please check your connection')
            }
            throw error
        }
    }

    // Auth endpoints
    async login(credentials: LoginRequest): Promise<AuthResponse> {
        const formData = new FormData()
        formData.append('username', credentials.username)
        formData.append('password', credentials.password)

        try {
            const response = await fetch(`${this.baseURL}/auth/token`, {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                const errorMessage = errorData.detail || 'Login failed'
                toast.error(errorMessage)
                throw new Error(errorMessage)
            }

            return response.json()
        } catch (error) {
            if (error instanceof TypeError && error.message.includes('fetch')) {
                toast.error('Failed to fetch - Please check your connection')
            }
            throw error
        }
    }


    // Health check
    async healthCheck(): Promise<{ status: string; timestamp: string; service: string }> {
        const result = await this.request<{ status: string; timestamp: string; service: string }>('/health')
        if (!result) {
            throw new Error('Health check failed - no response received')
        }
        return result
    }

    // Train routes endpoints
    async searchTrainRoutes(query: string, limit: number = 10): Promise<TrainRoute[]> {
        const result = await this.request<TrainRoute[]>(`/train-routes/search?q=${encodeURIComponent(query)}&limit=${limit}`)
        if (!result) {
            throw new Error('Failed to search train routes')
        }
        return result
    }

    // Announcement template endpoints
    async getAnnouncementCategories(): Promise<string[]> {
        const result = await this.request<{ categories: string[] }>('/announcement-templates/categories/list')
        if (!result) {
            throw new Error('Failed to fetch announcement categories')
        }
        return result.categories
    }

    // Train announcement endpoints
    async generateTrainAnnouncement(request: TrainAnnouncementRequest): Promise<TrainAnnouncementResponse> {
        const result = await this.request<TrainAnnouncementResponse>('/train-announcements/generate', {
            method: 'POST',
            body: JSON.stringify(request)
        })
        if (!result) {
            throw new Error('Failed to generate train announcement')
        }
        return result
    }

    async getTrainAnnouncementCategories(): Promise<string[]> {
        const result = await this.request<{ categories: string[] }>('/train-announcements/categories')
        if (!result) {
            throw new Error('Failed to fetch train announcement categories')
        }
        return result.categories
    }

    async getSupportedModels(): Promise<string[]> {
        const result = await this.request<{ supported_models: string[] }>('/train-announcements/supported-models')
        if (!result) {
            throw new Error('Failed to fetch supported models')
        }
        return result.supported_models
    }

    async deleteAllTempVideos(): Promise<void> {
        await this.request<void>('/isl-video-generation/cleanup-temp-videos', {
            method: 'DELETE'
        })
    }

    async getLiveAnnouncements(): Promise<LiveAnnouncement[]> {
        const result = await this.request<LiveAnnouncement[]>('/live-announcements/list')
        if (!result) {
            throw new Error('Failed to fetch live announcements')
        }
        return result
    }

    async clearLiveAnnouncements(): Promise<void> {
        await this.request<void>('/live-announcements/clear', {
            method: 'DELETE'
        })
    }
}

export const apiService = new ApiService()
