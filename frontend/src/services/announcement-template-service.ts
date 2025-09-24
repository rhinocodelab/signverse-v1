export interface AnnouncementTemplate {
    id: number
    template_category: string
    template_text_english: string
    template_text_hindi?: string
    template_text_marathi?: string
    template_text_gujarati?: string
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface CreateTemplateRequest {
    template_category: string
    template_text_english: string
}

export interface UpdateTemplateRequest {
    template_category?: string
    template_text_english?: string
    template_text_hindi?: string
    template_text_marathi?: string
    template_text_gujarati?: string
    is_active?: boolean
}

export interface TemplateSearchParams {
    page?: number
    limit?: number
    search?: string
    template_category?: string
    is_active?: boolean
}

export interface TemplateListResponse {
    templates: AnnouncementTemplate[]
    total_count: number
    page: number
    limit: number
}

export interface TemplateStatistics {
    total_templates: number
    active_templates: number
    inactive_templates: number
    templates_by_category: Record<string, number>
}

class AnnouncementTemplateService {
    private baseUrl: string

    constructor() {
        this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1'
    }

    async getTemplates(params: TemplateSearchParams = {}): Promise<TemplateListResponse> {
        const searchParams = new URLSearchParams()
        
        if (params.page) searchParams.append('page', params.page.toString())
        if (params.limit) searchParams.append('limit', params.limit.toString())
        if (params.search) searchParams.append('search', params.search)
        if (params.template_category) searchParams.append('template_category', params.template_category)
        if (params.is_active !== undefined) searchParams.append('is_active', params.is_active.toString())

        const response = await fetch(`${this.baseUrl}/announcement-templates/?${searchParams}`)
        
        if (!response.ok) {
            throw new Error(`Failed to fetch templates: ${response.statusText}`)
        }

        return response.json()
    }

    async getTemplate(id: number): Promise<AnnouncementTemplate> {
        const response = await fetch(`${this.baseUrl}/announcement-templates/${id}`)
        
        if (!response.ok) {
            throw new Error(`Failed to fetch template: ${response.statusText}`)
        }

        return response.json()
    }

    async createTemplate(templateData: CreateTemplateRequest): Promise<AnnouncementTemplate> {
        const response = await fetch(`${this.baseUrl}/announcement-templates/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(templateData)
        })

        if (!response.ok) {
            throw new Error(`Failed to create template: ${response.statusText}`)
        }

        return response.json()
    }

    async updateTemplate(id: number, templateData: UpdateTemplateRequest): Promise<AnnouncementTemplate> {
        const response = await fetch(`${this.baseUrl}/announcement-templates/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(templateData)
        })

        if (!response.ok) {
            throw new Error(`Failed to update template: ${response.statusText}`)
        }

        return response.json()
    }

    async deleteTemplate(id: number): Promise<void> {
        const response = await fetch(`${this.baseUrl}/announcement-templates/${id}`, {
            method: 'DELETE'
        })

        if (!response.ok) {
            throw new Error(`Failed to delete template: ${response.statusText}`)
        }
    }

    async getStatistics(): Promise<TemplateStatistics> {
        const response = await fetch(`${this.baseUrl}/announcement-templates/statistics/overview`)
        
        if (!response.ok) {
            throw new Error(`Failed to fetch statistics: ${response.statusText}`)
        }

        return response.json()
    }

    async getCategories(): Promise<string[]> {
        const response = await fetch(`${this.baseUrl}/announcement-templates/categories/list`)
        
        if (!response.ok) {
            throw new Error(`Failed to fetch categories: ${response.statusText}`)
        }

        const data = await response.json()
        return data.categories
    }
}

export const announcementTemplateService = new AnnouncementTemplateService()