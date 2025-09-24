import { apiService } from './api'

export interface VideoGenerationRequest {
    text: string
    model: string
    user_id: number
}

export interface VideoGenerationResponse {
    success: boolean
    temp_video_id: string
    preview_url: string
    video_duration?: number
    signs_used: string[]
    signs_skipped: string[]
    error?: string
}

export interface VideoSaveRequest {
    temp_video_id: string
    user_id: number
}

export interface VideoSaveResponse {
    success: boolean
    final_video_url: string
    video_id: string
    filename: string
    error?: string
}

export interface SupportedModelsResponse {
    supported_models: string[]
    total_count: number
    description: string
}

export interface HealthCheckResponse {
    status: string
    service: string
    ffmpeg_available: boolean
    directories_ok: boolean
    supported_models: number
    frontend_videos_dir: string
    temp_videos_dir: string
    final_videos_dir: string
    message?: string
}

class ISLVideoGenerationService {
    private baseEndpoint = '/isl-video-generation'

    /**
     * Generate ISL video from text using JSON request
     */
    async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
        const result = await apiService.request<VideoGenerationResponse>(
            `${this.baseEndpoint}/generate`,
            {
                method: 'POST',
                body: JSON.stringify(request)
            }
        )

        if (!result) {
            throw new Error('No response received from video generation service')
        }

        return result
    }

    /**
     * Generate ISL video from text using FormData (for file uploads)
     */
    async generateVideoForm(
        text: string,
        modelType: string,
        userId: number
    ): Promise<VideoGenerationResponse> {
        const formData = new FormData()
        formData.append('text', text)
        formData.append('model_type', modelType)
        formData.append('user_id', userId.toString())

        const result = await apiService.request<VideoGenerationResponse>(
            `${this.baseEndpoint}/generate-form`,
            {
                method: 'POST',
                body: formData
            }
        )

        if (!result) {
            throw new Error('No response received from video generation service')
        }

        return result
    }

    /**
     * Get preview video URL
     */
    getPreviewVideoUrl(tempVideoId: string): string {
        return `${process.env.NEXT_PUBLIC_API_URL}${this.baseEndpoint}/preview/${tempVideoId}`
    }

    /**
     * Save temporary video to permanent location
     */
    async saveVideo(request: VideoSaveRequest): Promise<VideoSaveResponse> {
        const result = await apiService.request<VideoSaveResponse>(
            `${this.baseEndpoint}/save`,
            {
                method: 'POST',
                body: JSON.stringify(request)
            }
        )

        if (!result) {
            throw new Error('No response received from video save service')
        }

        return result
    }

    /**
     * Get supported AI models
     */
    async getSupportedModels(): Promise<SupportedModelsResponse> {
        const result = await apiService.request<SupportedModelsResponse>(
            `${this.baseEndpoint}/supported-models`
        )

        if (!result) {
            throw new Error('No response received from supported models service')
        }

        return result
    }

    /**
     * Clean up temporary video
     */
    async cleanupTempVideo(tempVideoId: string): Promise<{ success: boolean; message: string }> {
        const result = await apiService.request<{ success: boolean; message: string }>(
            `${this.baseEndpoint}/cleanup/${tempVideoId}`,
            {
                method: 'DELETE'
            }
        )

        if (!result) {
            throw new Error('No response received from cleanup service')
        }

        return result
    }

    /**
     * Health check for ISL video generation service
     */
    async healthCheck(): Promise<HealthCheckResponse> {
        const result = await apiService.request<HealthCheckResponse>(
            `${this.baseEndpoint}/health`
        )

        if (!result) {
            throw new Error('No response received from health check service')
        }

        return result
    }
}

// Export singleton instance
export const islVideoGenerationService = new ISLVideoGenerationService()
