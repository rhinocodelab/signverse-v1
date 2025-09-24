import { apiService } from './api'

export interface TrainRouteTranslation {
    id: number
    train_route_id: number
    train_name_en: string
    from_station_name_en: string
    to_station_name_en: string
    train_name_hi: string
    from_station_name_hi: string
    to_station_name_hi: string
    train_name_mr: string
    from_station_name_mr: string
    to_station_name_mr: string
    train_name_gu: string
    from_station_name_gu: string
    to_station_name_gu: string
    created_at: string
    updated_at: string | null
}

export interface CreateTrainRouteTranslationRequest {
    train_route_id: number
    train_name_en: string
    from_station_name_en: string
    to_station_name_en: string
    train_name_hi: string
    from_station_name_hi: string
    to_station_name_hi: string
    train_name_mr: string
    from_station_name_mr: string
    to_station_name_mr: string
    train_name_gu: string
    from_station_name_gu: string
    to_station_name_gu: string
}

export interface UpdateTrainRouteTranslationRequest {
    train_name_en?: string
    from_station_name_en?: string
    to_station_name_en?: string
    train_name_hi?: string
    from_station_name_hi?: string
    to_station_name_hi?: string
    train_name_mr?: string
    from_station_name_mr?: string
    to_station_name_mr?: string
    train_name_gu?: string
    from_station_name_gu?: string
    to_station_name_gu?: string
}

class TrainRouteTranslationService {
    private baseEndpoint = '/train-route-translations'

    async getTrainRouteTranslations(
        page: number = 0,
        limit: number = 10,
        trainRouteId?: number
    ): Promise<TrainRouteTranslation[]> {
        const params = new URLSearchParams()
        params.append('skip', (page * limit).toString())
        params.append('limit', limit.toString())
        if (trainRouteId) {
            params.append('train_route_id', trainRouteId.toString())
        }
        const result = await apiService.request<TrainRouteTranslation[]>(`${this.baseEndpoint}/?${params.toString()}`)
        return result || []
    }

    async getTrainRouteTranslationById(id: number): Promise<TrainRouteTranslation> {
        const result = await apiService.request<TrainRouteTranslation>(`${this.baseEndpoint}/${id}`)
        if (!result) {
            throw new Error('Train route translation not found')
        }
        return result
    }

    async getTranslationByTrainRoute(trainRouteId: number): Promise<TrainRouteTranslation> {
        const result = await apiService.request<TrainRouteTranslation>(`${this.baseEndpoint}/train-route/${trainRouteId}`)
        if (!result) {
            throw new Error('Translation not found for this train route')
        }
        return result
    }

    async createTrainRouteTranslation(data: CreateTrainRouteTranslationRequest): Promise<TrainRouteTranslation> {
        const result = await apiService.request<TrainRouteTranslation>(this.baseEndpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        })
        if (!result) {
            throw new Error('Failed to create train route translation')
        }
        return result
    }

    async updateTrainRouteTranslation(id: number, data: UpdateTrainRouteTranslationRequest): Promise<TrainRouteTranslation> {
        const result = await apiService.request<TrainRouteTranslation>(`${this.baseEndpoint}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        })
        if (!result) {
            throw new Error('Failed to update train route translation')
        }
        return result
    }

    async deleteTrainRouteTranslation(id: number): Promise<void> {
        await apiService.request(`${this.baseEndpoint}/${id}`, {
            method: 'DELETE',
        })
    }

    async getTrainRoutesWithTranslations(
        page: number = 0,
        limit: number = 10
    ): Promise<TrainRouteTranslation[]> {
        const params = new URLSearchParams()
        params.append('skip', (page * limit).toString())
        params.append('limit', limit.toString())
        const result = await apiService.request<TrainRouteTranslation[]>(`${this.baseEndpoint}/train-routes/with-translations?${params.toString()}`)
        return result || []
    }
}

export const trainRouteTranslationService = new TrainRouteTranslationService()
