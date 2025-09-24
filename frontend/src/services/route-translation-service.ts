import { apiService } from './api'
import { TrainRoute, CreateTrainRouteRequest } from './train-route-service'
import { TrainRouteTranslation, CreateTrainRouteTranslationRequest } from './train-route-translation-service'

export interface TranslationProgress {
    step: 'creating_route' | 'translating' | 'saving_translations' | 'completed' | 'error'
    message: string
    progress: number
    error?: string
}

export interface TranslationResult {
    success: boolean
    route?: TrainRoute
    translations?: TrainRouteTranslation
    error?: string
}

class RouteTranslationService {
    private baseEndpoint = '/translation'

    async createRouteWithTranslations(
        routeData: CreateTrainRouteRequest,
        onProgress?: (progress: TranslationProgress) => void
    ): Promise<TranslationResult> {
        try {
            // Step 1: Create the train route
            onProgress?.({
                step: 'creating_route',
                message: 'Creating train route...',
                progress: 10
            })

            const createdRoute = await apiService.request<TrainRoute>(`/train-routes/`, {
                method: 'POST',
                body: JSON.stringify(routeData),
            })

            if (!createdRoute) {
                return {
                    success: false,
                    error: 'Failed to create train route'
                }
            }

            onProgress?.({
                step: 'creating_route',
                message: 'Train route created successfully',
                progress: 20
            })

            // Step 2: Perform translations
            onProgress?.({
                step: 'translating',
                message: 'Translating route information...',
                progress: 30
            })

            const translationResult = await this.performTranslations(routeData, onProgress)

            if (!translationResult.success) {
                // If translation fails, delete the created route
                try {
                    await apiService.request(`/train-routes/${createdRoute.id}`, {
                        method: 'DELETE',
                    })
                } catch (deleteError) {
                    console.error('Failed to cleanup route after translation failure:', deleteError)
                }

                return {
                    success: false,
                    error: translationResult.error
                }
            }

            // Step 3: Save translations to database
            onProgress?.({
                step: 'saving_translations',
                message: 'Saving translations to database...',
                progress: 80
            })

            const translationData: CreateTrainRouteTranslationRequest = {
                train_route_id: createdRoute.id,
                train_name_en: routeData.train_name,
                from_station_name_en: routeData.from_station_name,
                to_station_name_en: routeData.to_station_name,
                train_name_hi: translationResult.translations!.train_name.hi,
                from_station_name_hi: translationResult.translations!.from_station.hi,
                to_station_name_hi: translationResult.translations!.to_station.hi,
                train_name_mr: translationResult.translations!.train_name.mr,
                from_station_name_mr: translationResult.translations!.from_station.mr,
                to_station_name_mr: translationResult.translations!.to_station.mr,
                train_name_gu: translationResult.translations!.train_name.gu,
                from_station_name_gu: translationResult.translations!.from_station.gu,
                to_station_name_gu: translationResult.translations!.to_station.gu,
            }

            const savedTranslation = await apiService.request<TrainRouteTranslation>(`/train-route-translations/`, {
                method: 'POST',
                body: JSON.stringify(translationData),
            })

            if (!savedTranslation) {
                // If saving translation fails, delete the created route
                try {
                    await apiService.request(`/train-routes/${createdRoute.id}`, {
                        method: 'DELETE',
                    })
                } catch (deleteError) {
                    console.error('Failed to cleanup route after translation save failure:', deleteError)
                }

                return {
                    success: false,
                    error: 'Failed to save translations to database'
                }
            }

            onProgress?.({
                step: 'completed',
                message: 'Route and translations created successfully!',
                progress: 100
            })

            return {
                success: true,
                route: createdRoute,
                translations: savedTranslation
            }

        } catch (error) {
            onProgress?.({
                step: 'error',
                message: 'An error occurred during the process',
                progress: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
            })

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    private async performTranslations(
        routeData: CreateTrainRouteRequest,
        onProgress?: (progress: TranslationProgress) => void
    ): Promise<{
        success: boolean;
        translations?: {
            train_name: { hi: string; mr: string; gu: string }
            from_station: { hi: string; mr: string; gu: string }
            to_station: { hi: string; mr: string; gu: string }
        };
        error?: string
    }> {
        try {
            const targetLanguages = ['hi', 'mr', 'gu']
            const translations = {
                train_name: { hi: '', mr: '', gu: '' },
                from_station: { hi: '', mr: '', gu: '' },
                to_station: { hi: '', mr: '', gu: '' }
            }

            // Translate train name
            onProgress?.({
                step: 'translating',
                message: 'Translating train name...',
                progress: 40
            })

            const trainNameResponse = await apiService.request<{
                translations: {
                    hi: { translated_text: string }
                    mr: { translated_text: string }
                    gu: { translated_text: string }
                }
            }>(`${this.baseEndpoint}/translate`, {
                method: 'POST',
                body: JSON.stringify({
                    source_text: routeData.train_name,
                    source_language_code: 'en',
                    target_language_codes: targetLanguages
                }),
            })

            if (!trainNameResponse?.translations) {
                return {
                    success: false,
                    error: 'Failed to translate train name'
                }
            }

            translations.train_name = {
                hi: trainNameResponse.translations.hi.translated_text,
                mr: trainNameResponse.translations.mr.translated_text,
                gu: trainNameResponse.translations.gu.translated_text
            }

            // Translate from station
            onProgress?.({
                step: 'translating',
                message: 'Translating from station...',
                progress: 50
            })

            const fromStationResponse = await apiService.request<{
                translations: {
                    hi: { translated_text: string }
                    mr: { translated_text: string }
                    gu: { translated_text: string }
                }
            }>(`${this.baseEndpoint}/translate`, {
                method: 'POST',
                body: JSON.stringify({
                    source_text: routeData.from_station_name,
                    source_language_code: 'en',
                    target_language_codes: targetLanguages
                }),
            })

            if (!fromStationResponse?.translations) {
                return {
                    success: false,
                    error: 'Failed to translate from station'
                }
            }

            translations.from_station = {
                hi: fromStationResponse.translations.hi.translated_text,
                mr: fromStationResponse.translations.mr.translated_text,
                gu: fromStationResponse.translations.gu.translated_text
            }

            // Translate to station
            onProgress?.({
                step: 'translating',
                message: 'Translating to station...',
                progress: 60
            })

            const toStationResponse = await apiService.request<{
                translations: {
                    hi: { translated_text: string }
                    mr: { translated_text: string }
                    gu: { translated_text: string }
                }
            }>(`${this.baseEndpoint}/translate`, {
                method: 'POST',
                body: JSON.stringify({
                    source_text: routeData.to_station_name,
                    source_language_code: 'en',
                    target_language_codes: targetLanguages
                }),
            })

            if (!toStationResponse?.translations) {
                return {
                    success: false,
                    error: 'Failed to translate to station'
                }
            }

            translations.to_station = {
                hi: toStationResponse.translations.hi.translated_text,
                mr: toStationResponse.translations.mr.translated_text,
                gu: toStationResponse.translations.gu.translated_text
            }

            onProgress?.({
                step: 'translating',
                message: 'All translations completed successfully',
                progress: 70
            })

            return {
                success: true,
                translations
            }

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Translation service error'
            }
        }
    }
}

export const routeTranslationService = new RouteTranslationService()

