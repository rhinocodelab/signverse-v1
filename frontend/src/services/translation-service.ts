import { apiService } from './api'

export interface TranslationRequest {
    source_text: string
    source_language_code: string
    target_language_codes: string[]
}

export interface TranslationResponse {
    translated_text: string
    detected_language?: string
    confidence?: number
    error?: string
}

export interface MultilingualTranslationResponse {
    source_text: string
    source_language: string
    target_languages: string[]
    translations: {
        [key: string]: TranslationResponse
    }
    status: string
    error?: string
}

export interface TranslationProgress {
    step: 'starting' | 'translating' | 'completed' | 'error'
    message: string
    progress: number
    error?: string
}

class TranslationService {
    private baseEndpoint = '/translation'

    /**
     * Translate text to multiple languages
     */
    async translateText(
        sourceText: string,
        sourceLanguage: string = 'en',
        targetLanguages: string[] = ['hi', 'mr', 'gu'],
        onProgress?: (progress: TranslationProgress) => void
    ): Promise<{
        success: boolean
        translations?: {
            [key: string]: string
        }
        error?: string
    }> {
        try {
            // Initialize progress
            onProgress?.({
                step: 'starting',
                message: 'Initializing translation...',
                progress: 10
            })

            // Update progress - preparing request
            onProgress?.({
                step: 'translating',
                message: 'Sending translation request...',
                progress: 30
            })

            const response = await apiService.request<MultilingualTranslationResponse>(
                `${this.baseEndpoint}/translate`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        source_text: sourceText,
                        source_language_code: sourceLanguage,
                        target_language_codes: targetLanguages
                    })
                }
            )

            if (!response) {
                throw new Error('No response received from translation service')
            }

            // Update progress - processing response
            onProgress?.({
                step: 'translating',
                message: 'Processing translations...',
                progress: 70
            })

            // Extract translations
            const translations: { [key: string]: string } = {}
            for (const lang of targetLanguages) {
                translations[lang] = response.translations[lang]?.translated_text || ''
            }

            // Check if we got valid translations
            const hasTranslations = Object.values(translations).some(text => text.trim() !== '')

            if (!hasTranslations) {
                throw new Error('No translations received from the server')
            }

            // Update progress - completed
            onProgress?.({
                step: 'completed',
                message: 'Translation completed successfully!',
                progress: 100
            })

            return {
                success: true,
                translations
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

            onProgress?.({
                step: 'error',
                message: 'Translation failed',
                progress: 0,
                error: errorMessage
            })

            return {
                success: false,
                error: errorMessage
            }
        }
    }

    /**
     * Get supported languages
     */
    async getSupportedLanguages(): Promise<{
        success: boolean
        languages?: Array<{
            language_code: string
            display_name: string
            support_source: boolean
            support_target: boolean
        }>
        error?: string
    }> {
        try {
            const response = await apiService.request<{
                languages: Array<{
                    language_code: string
                    display_name: string
                    support_source: boolean
                    support_target: boolean
                }>
                total_count: number
            }>(`${this.baseEndpoint}/supported-languages`)

            if (!response) {
                throw new Error('No response received from translation service')
            }

            return {
                success: true,
                languages: response.languages
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            return {
                success: false,
                error: errorMessage
            }
        }
    }

    /**
     * Health check for translation service
     */
    async healthCheck(): Promise<{
        success: boolean
        status?: string
        message?: string
        error?: string
    }> {
        try {
            const response = await apiService.request<{
                status: string
                message: string
                supported_languages_count: number
            }>(`${this.baseEndpoint}/health`)

            if (!response) {
                throw new Error('No response received from translation service')
            }

            return {
                success: true,
                status: response.status,
                message: response.message
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            return {
                success: false,
                error: errorMessage
            }
        }
    }
}

// Export singleton instance
export const translationService = new TranslationService()
