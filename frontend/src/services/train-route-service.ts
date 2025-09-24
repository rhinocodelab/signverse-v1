import { apiService } from './api'

export interface TrainRoute {
    id: number
    train_number: string
    train_name: string
    from_station_name: string
    from_station_code: string
    to_station_name: string
    to_station_code: string
    created_at: string
    updated_at?: string
}

export interface CreateTrainRouteRequest {
    train_number: string
    train_name: string
    from_station_name: string
    from_station_code: string
    to_station_name: string
    to_station_code: string
}

export interface UpdateTrainRouteRequest {
    train_name?: string
    from_station_name?: string
    from_station_code?: string
    to_station_name?: string
    to_station_code?: string
}

export interface TrainRouteListResponse {
    data: TrainRoute[]
    total: number
    page: number
    limit: number
}

class TrainRouteService {
    private baseEndpoint = '/train-routes'

    async getTrainRoutes(
        page: number = 0,
        limit: number = 10,
        trainNumber?: string
    ): Promise<TrainRoute[]> {
        const params = new URLSearchParams({
            skip: (page * limit).toString(),
            limit: limit.toString(),
        })

        if (trainNumber) {
            params.append('train_number', trainNumber)
        }

        const result = await apiService.request<TrainRoute[]>(`${this.baseEndpoint}/?${params.toString()}`)
        return result || []
    }

    async getTrainRouteById(id: number): Promise<TrainRoute> {
        const result = await apiService.request<TrainRoute>(`${this.baseEndpoint}/${id}`)
        if (!result) {
            throw new Error('Train route not found')
        }
        return result
    }

    async getTrainRouteByNumber(trainNumber: string): Promise<TrainRoute> {
        const result = await apiService.request<TrainRoute>(`${this.baseEndpoint}/train/${trainNumber}`)
        if (!result) {
            throw new Error('Train route not found')
        }
        return result
    }

    async createTrainRoute(data: CreateTrainRouteRequest): Promise<TrainRoute> {
        const result = await apiService.request<TrainRoute>(`${this.baseEndpoint}/`, {
            method: 'POST',
            body: JSON.stringify(data),
        })
        if (!result) {
            throw new Error('Failed to create train route')
        }
        return result
    }

    async updateTrainRoute(id: number, data: UpdateTrainRouteRequest): Promise<TrainRoute> {
        const result = await apiService.request<TrainRoute>(`${this.baseEndpoint}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        })
        if (!result) {
            throw new Error('Failed to update train route')
        }
        return result
    }

    async deleteTrainRoute(id: number): Promise<void> {
        await apiService.request(`${this.baseEndpoint}/${id}`, {
            method: 'DELETE',
        })
    }
}

export const trainRouteService = new TrainRouteService()
