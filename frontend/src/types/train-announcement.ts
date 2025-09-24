export interface TrainAnnouncementRequest {
    train_number: string
    train_name: string
    from_station_name: string
    to_station_name: string
    platform: number
    announcement_category: string
    model: string
    user_id: number
}

export interface TrainAnnouncementResponse {
    success: boolean
    announcement_id?: number
    announcement_name?: string
    generated_text?: string
    generated_text_hindi?: string
    generated_text_marathi?: string
    generated_text_gujarati?: string
    video_url?: string
    temp_video_id?: string
    preview_url?: string
    error?: string
    signs_used?: string[]
    signs_skipped?: string[]
}