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