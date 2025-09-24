export interface User {
    id: number
    username: string
    is_active: boolean
    is_superuser: boolean
    created_at: string
    updated_at?: string
}

export interface LoginRequest {
    username: string
    password: string
}


export interface AuthResponse {
    access_token: string
    token_type: string
}

export interface AuthContextType {
    user: User | null
    token: string | null
    login: (username: string, password: string) => Promise<void>
    logout: () => void
    isLoading: boolean
}
