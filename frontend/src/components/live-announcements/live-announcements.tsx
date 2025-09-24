'use client'

import { useState, useEffect } from 'react'
import { Play, AlertCircle, CheckCircle, Clock, Zap, Trash2 } from 'lucide-react'
import { io, Socket } from 'socket.io-client'
import { apiService } from '@/services/api'
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

interface SocketAnnouncementData {
    announcement_id: string
    train_number?: string
    train_name?: string
    from_station?: string
    to_station?: string
    platform_number?: number
    announcement_category?: string
    ai_avatar_model?: string
    status?: string
    message?: string
    progress_percentage?: number
    video_url?: string
    error_message?: string
    received_at?: string
    updated_at?: string
}

interface SocketUpdateData {
    announcement_id: string
    status: string
    message: string
    progress_percentage?: number
    video_url?: string
    error_message?: string
    updated_at: string
}

interface SocketErrorData {
    announcement_id: string
    error_message: string
}

export const LiveAnnouncements: React.FC = () => {
    const [announcements, setAnnouncements] = useState<LiveAnnouncement[]>([])
    const [, setSocket] = useState<Socket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [selectedVideo, setSelectedVideo] = useState<{ url: string; trainName: string } | null>(null)
    
    // Auto-select the most recent announcement (only one at a time)
    useEffect(() => {
        if (announcements.length > 0) {
            const mostRecent = announcements[0] // Most recent is first in the array
            
            // If the announcement is completed and has a video, show it
            if (mostRecent.status === 'completed' && mostRecent.video_url) {
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:5001/api/v1'
                const cleanVideoUrl = mostRecent.video_url.replace('/api/v1/api/v1/', '/api/v1/') // Fix for double /api/v1
                const fullUrl = mostRecent.video_url.startsWith('http') ? mostRecent.video_url : `${baseUrl}${cleanVideoUrl}`
                
                setSelectedVideo({
                    url: fullUrl,
                    trainName: mostRecent.train_name
                })
            } else {
                // Clear video if announcement is not completed
                setSelectedVideo(null)
            }
        } else {
            // Clear video if no announcements
            setSelectedVideo(null)
        }
    }, [announcements])

    // Initialize Socket.IO connection
    useEffect(() => {
        // Extract base URL without /api/v1 for Socket.IO
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:5001'
        const socketUrl = baseUrl.replace('/api/v1', '')
        
        const newSocket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            secure: true,
            rejectUnauthorized: false // For self-signed certificates in development
        })

        newSocket.on('connect', () => {
            console.log('Connected to live announcements')
            setIsConnected(true)
            newSocket.emit('join_live_announcements')
        })

        newSocket.on('disconnect', () => {
            console.log('Disconnected from live announcements')
            setIsConnected(false)
        })

        newSocket.on('announcement_received', (data: SocketAnnouncementData) => {
            console.log('New announcement received:', data)
            // Convert the received data to match our interface
            const announcement: LiveAnnouncement = {
                announcement_id: data.announcement_id,
                train_number: data.train_number || '',
                train_name: data.train_name || '',
                from_station: data.from_station || '',
                to_station: data.to_station || '',
                platform_number: data.platform_number || 0,
                announcement_category: data.announcement_category || '',
                ai_avatar_model: data.ai_avatar_model || '',
                status: (data.status as LiveAnnouncement['status']) || 'received',
                message: data.message || '',
                progress_percentage: data.progress_percentage,
                video_url: data.video_url,
                error_message: data.error_message,
                received_at: data.received_at || new Date().toISOString(),
                updated_at: data.updated_at || new Date().toISOString()
            }
            console.log('Processed announcement:', announcement)
            setAnnouncements([announcement]) // Replace with single announcement
        })

        newSocket.on('announcement_update', (data: SocketUpdateData) => {
            console.log('Announcement update:', data)
            setAnnouncements(prev => {
                if (prev.length === 0) return prev
                
                return prev.map(announcement => 
                    announcement.announcement_id === data.announcement_id
                        ? {
                            ...announcement,
                            status: data.status as LiveAnnouncement['status'],
                            message: data.message,
                            progress_percentage: data.progress_percentage,
                            video_url: data.video_url,
                            error_message: data.error_message,
                            updated_at: data.updated_at
                        }
                        : announcement
                )
            })
        })

        newSocket.on('announcement_error', (data: SocketErrorData) => {
            console.log('Announcement error:', data)
            setAnnouncements(prev => {
                if (prev.length === 0) return prev
                
                return prev.map(announcement => 
                    announcement.announcement_id === data.announcement_id
                        ? {
                            ...announcement,
                            status: 'error',
                            message: 'Error occurred',
                            error_message: data.error_message,
                            updated_at: new Date().toISOString()
                        }
                        : announcement
                )
            })
        })

        setSocket(newSocket)

        return () => {
            newSocket.close()
        }
    }, [])

    // Fetch initial announcements
    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                console.log('Fetching live announcements...')
                const data = await apiService.getLiveAnnouncements()
                console.log('Fetched announcements:', data)
                setAnnouncements(data)
            } catch (error) {
                console.error('Error fetching announcements:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchAnnouncements()
    }, [])

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'received':
                return <Clock className="w-5 h-5 text-blue-500" />
            case 'processing':
                return <Zap className="w-5 h-5 text-yellow-500 animate-pulse" />
            case 'generating_video':
                return <Zap className="w-5 h-5 text-orange-500 animate-pulse" />
            case 'completed':
                return <CheckCircle className="w-5 h-5 text-green-500" />
            case 'error':
                return <AlertCircle className="w-5 h-5 text-red-500" />
            default:
                return <Clock className="w-5 h-5 text-gray-500" />
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'received':
                return 'bg-blue-100 text-blue-800'
            case 'processing':
                return 'bg-yellow-100 text-yellow-800'
            case 'generating_video':
                return 'bg-orange-100 text-orange-800'
            case 'completed':
                return 'bg-green-100 text-green-800'
            case 'error':
                return 'bg-red-100 text-red-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    // Removed unused functions

    const handleDeleteAnnouncement = async () => {
        try {
            // Clear the announcements from backend
            await apiService.clearLiveAnnouncements()
            
            // Clear the frontend state
            setAnnouncements([])
            setSelectedVideo(null)
            
            // Delete all temporary ISL videos from the filesystem
            await apiService.deleteAllTempVideos()
            
            toast.success('Live announcement and temporary videos cleared successfully')
            console.log('Live announcement and temporary videos cleared')
        } catch (error) {
            console.error('Error clearing announcement and videos:', error)
            toast.error('Failed to clear live announcements')
        }
    }

    // Debug logging
    console.log('LiveAnnouncements render:', { 
        isLoading, 
        isConnected, 
        announcementsCount: announcements.length,
        announcements: announcements 
    })

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-2 text-gray-600">Loading live announcements...</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6">
            <div className="max-w-7xl mx-auto">
                <div className="space-y-6">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">Live Announcements</h1>
                                <p className="text-gray-600">Real-time ISL announcement generation</p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <span className="text-sm text-gray-600">
                                        {isConnected ? 'Connected' : 'Disconnected'}
                                    </span>
                                </div>
                                {(announcements.length > 0 || selectedVideo) && (
                                    <button
                                        onClick={handleDeleteAnnouncement}
                                        className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span>Clear</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                        {/* Two Panel Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Panel - Train Information */}
                            <div className="bg-white shadow-sm border border-gray-200 overflow-hidden">
                                <div className="p-6 border-b border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900">Live Train Announcements</h3>
                                    <p className="text-sm text-gray-600 mt-1">Real-time train information and status</p>
                                </div>
                                
                                {announcements.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements yet</h3>
                                        <p className="text-gray-600">Live announcements will appear here when received</p>
                                    </div>
                                ) : (
                                    <div className="p-6">
                                        {(() => {
                                            const announcement = announcements[0] // Show only the most recent
                                            return (
                                                <div className={`p-6 border transition-colors ${
                                                    announcement.video_url && announcement.status === 'completed' 
                                                        ? 'bg-blue-50 border-blue-200' 
                                                        : 'bg-white border-gray-200'
                                                }`}>
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex items-center">
                                                            {getStatusIcon(announcement.status)}
                                                            <span className={`ml-2 px-3 py-1 text-sm font-medium ${getStatusColor(announcement.status)}`}>
                                                                {announcement.status.replace('_', ' ').toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm text-gray-500">
                                                                {new Date(announcement.received_at).toLocaleTimeString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-lg font-semibold text-gray-900">
                                                                Train {announcement.train_number}
                                                            </span>
                                                            <span className="text-lg text-gray-600">
                                                                Platform {announcement.platform_number}
                                                            </span>
                                                        </div>
                                                        
                                                        <div className="text-xl text-gray-800 font-medium">
                                                            {announcement.train_name}
                                                        </div>
                                                        
                                                        <div className="flex items-center text-lg text-gray-600">
                                                            <span className="font-medium">{announcement.from_station}</span>
                                                            <svg className="w-6 h-6 mx-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                                            </svg>
                                                            <span className="font-medium">{announcement.to_station}</span>
                                                        </div>
                                                        
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-lg text-gray-600">
                                                                {announcement.announcement_category}
                                                            </span>
                                                            <span className="text-lg text-gray-500">
                                                                {announcement.ai_avatar_model} model
                                                            </span>
                                                        </div>
                                                        
                                                        {announcement.status !== 'completed' && announcement.status !== 'error' && (
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-sm text-gray-600">Processing...</span>
                                                                    <span className="text-sm text-gray-500">
                                                                        {announcement.progress_percentage || 0}%
                                                                    </span>
                                                                </div>
                                                                <div className="w-full bg-gray-200 h-3">
                                                                    <div
                                                                        className="bg-blue-600 h-3 transition-all duration-300"
                                                                        style={{ width: `${announcement.progress_percentage || 0}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        
                                                        {announcement.status === 'error' && announcement.error_message && (
                                                            <div className="text-sm text-red-600 bg-red-50 p-3 border border-red-200">
                                                                <strong>Error:</strong> {announcement.error_message}
                                                            </div>
                                                        )}
                                                        
                                                        {announcement.status === 'completed' && (
                                                            <div className="text-sm text-green-600 bg-green-50 p-3 border border-green-200">
                                                                <strong>✓ Completed:</strong> ISL video generated successfully
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })()}
                                    </div>
                                )}
                            </div>

                            {/* Right Panel - ISL Video Player */}
                            <div className="bg-white shadow-sm border border-gray-200 overflow-hidden">
                                <div className="p-6 border-b border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900">ISL Video Player</h3>
                                    <p className="text-sm text-gray-600 mt-1">Generated Indian Sign Language videos</p>
                                </div>
                                
                                <div className="p-6">
                                    {selectedVideo ? (
                                        <div className="space-y-4">
                                            <div className="bg-gray-100 overflow-hidden">
                                                <video 
                                                    controls 
                                                    className="w-full h-64 object-contain"
                                                    src={selectedVideo.url}
                                                    autoPlay
                                                >
                                                    Your browser does not support the video tag.
                                                </video>
                                            </div>
                                            
                                            <div className="text-center">
                                                <h4 className="text-sm font-medium text-gray-900 mb-1">
                                                    {selectedVideo.trainName}
                                                </h4>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <Play className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                            <h3 className="text-lg font-medium text-gray-900 mb-2">No video available</h3>
                                            <p className="text-gray-600">ISL videos will appear here automatically when announcements are completed</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                </div>
            </div>

        </div>
    )
}