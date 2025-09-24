'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, Play, Search, Filter, User, Users, Trash2, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'

interface ISLVideo {
    id: number
    filename: string
    display_name: string
    video_path: string
    file_size: number
    duration_seconds?: number
    model_type: 'male' | 'female'
    description?: string
    tags?: string
    created_at: string
}

interface SyncResults {
    success: boolean
    message: string
    processed: number
    errors: string[]
    total_folders?: number
}

export const ISLDictionary: React.FC = () => {
    const [selectedModel, setSelectedModel] = useState<'male' | 'female' | null>(null)
    const [uploadFile, setUploadFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterModel, setFilterModel] = useState<'all' | 'male' | 'female'>('all')
    const [videos, setVideos] = useState<ISLVideo[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isMuted] = useState(true)
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [showProgressModal, setShowProgressModal] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [uploadStatus, setUploadStatus] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalVideos, setTotalVideos] = useState(0)
    const [hoveredVideo, setHoveredVideo] = useState<number | null>(null)
    const [showVideoModal, setShowVideoModal] = useState(false)
    const [selectedVideo, setSelectedVideo] = useState<ISLVideo | null>(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [videoToDelete, setVideoToDelete] = useState<ISLVideo | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showSyncModal, setShowSyncModal] = useState(false)
    const [showSyncProgressModal, setShowSyncProgressModal] = useState(false)
    const [selectedSyncModel, setSelectedSyncModel] = useState<'male' | 'female' | null>(null)
    const [syncProgress, setSyncProgress] = useState(0)
    const [syncStatus, setSyncStatus] = useState('')
    const [syncResults, setSyncResults] = useState<SyncResults | null>(null)
    const [videoStats, setVideoStats] = useState({
        total: 0,
        male: 0,
        female: 0
    })

    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            if (file.type !== 'video/mp4') {
                alert('Please select an MP4 video file')
                return
            }
            setUploadFile(file)
        }
    }

    const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        const file = event.dataTransfer.files[0]
        if (file) {
            if (file.type !== 'video/mp4') {
                alert('Please select an MP4 video file')
                return
            }
            setUploadFile(file)
        }
    }

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
    }

    const handleUpload = async () => {
        if (!uploadFile || !selectedModel) {
            alert('Please select a model type and video file')
            return
        }

        // Close upload modal and show progress modal
        setShowUploadModal(false)
        setShowProgressModal(true)
        setIsUploading(true)
        setUploadProgress(0)
        setUploadStatus('Preparing upload...')

        try {
            // Simulate upload progress
            const progressSteps = [
                { progress: 20, status: 'Uploading file...' },
                { progress: 40, status: 'Processing video...' },
                { progress: 60, status: 'Optimizing for web...' },
                { progress: 80, status: 'Saving to database...' },
                { progress: 100, status: 'Upload completed!' }
            ]

            for (const step of progressSteps) {
                setUploadProgress(step.progress)
                setUploadStatus(step.status)
                await new Promise(resolve => setTimeout(resolve, 800))
            }

            // Implement actual upload API call
            const formData = new FormData()
            formData.append('file', uploadFile)
            formData.append('model_type', selectedModel)

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/isl-videos/upload`, {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`)
            }

            const result = await response.json()
            console.log('Upload result:', result)

            // Handle duplicate video - it will be re-processed automatically
            if (result.file_replaced) {
                console.log('Duplicate video detected, re-processing...')
                // The video is being re-processed in the background
            }

            // Close progress modal after a short delay
            setTimeout(() => {
                setShowProgressModal(false)
                setUploadFile(null)
                setSelectedModel(null)
                if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                }
                // Refresh videos list and statistics
                loadVideos()
                loadVideoStatistics()
            }, 1000)

        } catch (error) {
            console.error('Upload failed:', error)
            setUploadStatus('Upload failed!')
            setTimeout(() => {
                setShowProgressModal(false)
            }, 2000)
        } finally {
            setIsUploading(false)
        }
    }

    const handleCloseUploadModal = () => {
        setShowUploadModal(false)
        setUploadFile(null)
        setSelectedModel(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const loadVideoStatistics = useCallback(async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/isl-videos/statistics/summary`)
            if (!response.ok) {
                throw new Error(`Failed to fetch statistics: ${response.statusText}`)
            }
            const data = await response.json()
            setVideoStats({
                total: data.total_videos || 0,
                male: data.male_videos || 0,
                female: data.female_videos || 0
            })
        } catch (error) {
            console.error('Failed to load video statistics:', error)
            // Set default stats on error
            setVideoStats({ total: 0, male: 0, female: 0 })
        }
    }, [])


    const loadVideos = useCallback(async () => {
        setIsLoading(true)
        try {
            const params = new URLSearchParams()
            if (filterModel !== 'all') {
                params.append('model_type', filterModel)
            }
            if (searchTerm) {
                params.append('search', searchTerm)
            }
            params.append('page', currentPage.toString())
            params.append('limit', '60')

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/isl-videos?${params.toString()}`)

            if (!response.ok) {
                throw new Error(`Failed to load videos: ${response.statusText}`)
            }

            const data = await response.json()
            setVideos(data.videos || [])
            setTotalVideos(data.total || 0)
        } catch (error) {
            console.error('Failed to load videos:', error)
            setVideos([]) // Set empty array on error
            setTotalVideos(0)
            setVideoStats({ total: 0, male: 0, female: 0 })
        } finally {
            setIsLoading(false)
        }
    }, [filterModel, searchTerm, currentPage])

    const handleVideoPlay = (videoId: number) => {
        const video = videos.find(v => v.id === videoId)
        if (video) {
            setSelectedVideo(video)
            setShowVideoModal(true)
        }
    }

    const handleDeleteVideo = (video: ISLVideo) => {
        setVideoToDelete(video)
        setShowDeleteModal(true)
    }

    const confirmDeleteVideo = async () => {
        if (!videoToDelete) return

        setIsDeleting(true)
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/isl-videos/${videoToDelete.id}/permanent`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                throw new Error(`Failed to delete video: ${response.statusText}`)
            }

            // Close modal and refresh videos list and statistics
            setShowDeleteModal(false)
            setVideoToDelete(null)
            loadVideos()
            loadVideoStatistics()
        } catch (error) {
            console.error('Failed to delete video:', error)
            alert('Failed to delete video. Please try again.')
        } finally {
            setIsDeleting(false)
        }
    }

    const cancelDeleteVideo = () => {
        setShowDeleteModal(false)
        setVideoToDelete(null)
    }

    const handleSyncVideos = () => {
        setShowSyncModal(true)
    }

    const startSyncProcess = async () => {
        if (!selectedSyncModel) return

        // Close model selection modal and show progress modal
        setShowSyncModal(false)
        setShowSyncProgressModal(true)
        setSyncProgress(0)
        setSyncStatus('Starting sync process...')

        try {
            // Simulate progress steps
            const progressSteps = [
                { progress: 20, status: 'Scanning folders...' },
                { progress: 40, status: 'Validating video files...' },
                { progress: 60, status: 'Processing videos...' },
                { progress: 80, status: 'Updating database...' },
                { progress: 100, status: 'Sync completed!' }
            ]

            for (const step of progressSteps) {
                setSyncProgress(step.progress)
                setSyncStatus(step.status)
                await new Promise(resolve => setTimeout(resolve, 1000))
            }

            // Call the actual sync API
            const formData = new FormData()
            formData.append('model_type', selectedSyncModel)
            formData.append('force_reprocess', 'true')

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/isl-videos/sync`, {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                throw new Error(`Sync failed: ${response.statusText}`)
            }

            const result = await response.json()
            setSyncResults(result)

            // Close progress modal after a short delay
            setTimeout(() => {
                setShowSyncProgressModal(false)
                setSelectedSyncModel(null)
                // Refresh videos list and statistics
                loadVideos()
                loadVideoStatistics()
            }, 2000)

        } catch (error) {
            console.error('Sync failed:', error)
            setSyncStatus('Sync failed!')
            setTimeout(() => {
                setShowSyncProgressModal(false)
            }, 3000)
        }
    }

    const cancelSyncModal = () => {
        setShowSyncModal(false)
        setSelectedSyncModel(null)
    }

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage)
    }

    const totalPages = Math.ceil(totalVideos / 60)

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const formatDuration = (seconds?: number) => {
        if (!seconds) return 'Unknown'
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Load videos on component mount and when filters change
    useEffect(() => {
        loadVideos()
    }, [loadVideos])

    // Load statistics on component mount
    useEffect(() => {
        loadVideoStatistics()
    }, [loadVideoStatistics])

    // Reset to page 1 when search or filter changes
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, filterModel])

    return (
        <div className="p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                        <BookOpen className="w-8 h-8 text-blue-600" />
                        ISL Dictionary
                    </h1>
                    <p className="text-gray-600">Upload and manage Indian Sign Language videos</p>
                </div>

            {/* Video Statistics */}
            <div className="mb-6">
                <p className="text-gray-600">
                    <span className="font-semibold text-gray-900">Total Videos:</span> {videoStats.total} |
                    <span className="font-semibold text-blue-600 ml-2">Male Model:</span> {videoStats.male} |
                    <span className="font-semibold text-pink-600 ml-2">Female Model:</span> {videoStats.female}
                </p>
            </div>

            <div className="space-y-6">
                {/* Upload and Sync Buttons */}
                <div className="flex justify-end space-x-3">
                    <Button
                        onClick={handleSyncVideos}
                        className="flex items-center space-x-2 text-white"
                        style={{ backgroundColor: 'oklch(62.7% 0.194 149.214)' }}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Sync ISL Videos</span>
                    </Button>
                    <Button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center space-x-2 text-white"
                        style={{ backgroundColor: 'oklch(50% 0.134 242.749)' }}
                    >
                        <Upload className="w-4 h-4" />
                        <span>Upload ISL Video</span>
                    </Button>
                </div>

                {/* Videos Grid */}
                <div>
                    <Card className="p-6">
                        {/* Search and Filter */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-6">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search videos..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Filter className="w-4 h-4 text-gray-400" />
                                <select
                                    value={filterModel}
                                    onChange={(e) => setFilterModel(e.target.value as 'all' | 'male' | 'female')}
                                    className="border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="all">All Models</option>
                                    <option value="male">Male Model</option>
                                    <option value="female">Female Model</option>
                                </select>
                            </div>
                        </div>

                        {/* Videos Grid */}
                        {isLoading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-gray-600">Loading videos...</p>
                            </div>
                        ) : videos.length === 0 ? (
                            <div className="text-center py-12">
                                <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No ISL Videos Found</h3>
                                <p className="text-gray-600">
                                    Upload your first ISL video to get started
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                                    {videos.map((video) => (
                                        <div
                                            key={video.id}
                                            className="relative bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md"
                                            onMouseEnter={() => setHoveredVideo(video.id)}
                                            onMouseLeave={() => setHoveredVideo(null)}
                                        >
                                            {/* Video Thumbnail */}
                                            <div className="relative aspect-square bg-gray-100 flex items-center justify-center">
                                                <Image
                                                    src="/images/assets/isl.png"
                                                    alt={video.display_name}
                                                    width={64}
                                                    height={64}
                                                    className="max-w-full max-h-full object-contain"
                                                />

                                                {/* Hover Overlay */}
                                                {hoveredVideo === video.id && (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50">
                                                        <div className="flex space-x-2 mb-2">
                                                            <Button
                                                                onClick={() => handleVideoPlay(video.id)}
                                                                size="sm"
                                                                className="bg-white text-black hover:bg-gray-100 p-2"
                                                            >
                                                                <Play className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleDeleteVideo(video)}
                                                                size="sm"
                                                                className="bg-red-600 text-white hover:bg-red-700 p-2"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                        <div className="text-white text-sm font-medium">
                                                            {video.model_type === 'male' ? 'Male' : 'Female'}
                                                        </div>
                                                    </div>
                                                )}

                                            </div>

                                            {/* Video Info */}
                                            <div className="p-1">
                                                <h3 className="text-xs font-medium text-gray-900 truncate mb-0.5">
                                                    {video.display_name}
                                                </h3>
                                                <p className="text-xs text-gray-500">
                                                    {formatFileSize(video.file_size)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center space-x-2 mt-6">
                                        <Button
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            variant="outline"
                                            size="sm"
                                            className="flex items-center space-x-1"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                            <span>Previous</span>
                                        </Button>

                                        <div className="flex items-center space-x-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let pageNum;
                                                if (totalPages <= 5) {
                                                    pageNum = i + 1;
                                                } else if (currentPage <= 3) {
                                                    pageNum = i + 1;
                                                } else if (currentPage >= totalPages - 2) {
                                                    pageNum = totalPages - 4 + i;
                                                } else {
                                                    pageNum = currentPage - 2 + i;
                                                }

                                                return (
                                                    <Button
                                                        key={pageNum}
                                                        onClick={() => handlePageChange(pageNum)}
                                                        variant={currentPage === pageNum ? "default" : "outline"}
                                                        size="sm"
                                                        className="w-8 h-8 p-0"
                                                    >
                                                        {pageNum}
                                                    </Button>
                                                );
                                            })}
                                        </div>

                                        <Button
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            variant="outline"
                                            size="sm"
                                            className="flex items-center space-x-1"
                                        >
                                            <span>Next</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}

                                {/* Page Info */}
                                <div className="text-center text-sm text-gray-500 mt-4">
                                    Showing {((currentPage - 1) * 60) + 1} to {Math.min(currentPage * 60, totalVideos)} of {totalVideos} videos
                                </div>
                            </>
                        )}
                    </Card>
                </div>
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900">Upload ISL Video</h2>
                                <button
                                    onClick={handleCloseUploadModal}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Model Selection */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    AI Avatar Model
                                </label>
                                <div className="flex space-x-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setSelectedModel('male')}
                                        className={`flex-1 ${selectedModel === 'male'
                                            ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <User className="w-4 h-4 mr-2" />
                                        Male Model
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setSelectedModel('female')}
                                        className={`flex-1 ${selectedModel === 'female'
                                            ? 'bg-pink-600 text-white border-pink-600 hover:bg-pink-700'
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Users className="w-4 h-4 mr-2" />
                                        Female Model
                                    </Button>
                                </div>
                            </div>

                            {/* File Upload Drop Zone */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Video File (MP4)
                                </label>
                                <div
                                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                                    onDrop={handleFileDrop}
                                    onDragOver={handleDragOver}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".mp4,video/mp4"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    {uploadFile ? (
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 mb-1">
                                                {uploadFile.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-sm text-gray-600 mb-2">
                                                Drag and drop your MP4 video here
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                or click to browse files
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Upload Button */}
                            <div className="flex space-x-3">
                                <Button
                                    variant="outline"
                                    onClick={handleCloseUploadModal}
                                    className="flex-1"
                                    disabled={isUploading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleUpload}
                                    disabled={!uploadFile || !selectedModel || isUploading}
                                    className="flex-1 text-white"
                                    style={{ backgroundColor: 'oklch(50% 0.134 242.749)' }}
                                >
                                    {isUploading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4 mr-2" />
                                            Upload Video
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Progress Modal */}
            {showProgressModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="text-center">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Uploading Video</h2>

                                {/* Progress Bar */}
                                <div className="mb-4">
                                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                        <div
                                            className="h-full transition-all duration-500 ease-out"
                                            style={{
                                                width: `${uploadProgress}%`,
                                                backgroundColor: 'oklch(50% 0.134 242.749)'
                                            }}
                                        ></div>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-2">{uploadProgress}%</p>
                                </div>

                                {/* Status Message */}
                                <p className="text-gray-700 mb-6">{uploadStatus}</p>

                                {/* Loading Spinner */}
                                <div className="flex justify-center mb-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>

                                {/* File Info */}
                                {uploadFile && (
                                    <div className="text-sm text-gray-500">
                                        <p className="font-medium">{uploadFile.name}</p>
                                        <p>{(uploadFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Video Player Modal */}
            {showVideoModal && selectedVideo && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900">{selectedVideo.display_name}</h2>
                                <button
                                    onClick={() => setShowVideoModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="relative">
                                <video
                                    className="w-full h-auto rounded-lg"
                                    controls
                                    autoPlay
                                    muted={isMuted}
                                >
                                    <source src={`${process.env.NEXT_PUBLIC_API_URL}/isl-videos/${selectedVideo.id}/stream`} type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            </div>

                            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                                <div className="flex items-center space-x-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${selectedVideo.model_type === 'male'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-pink-100 text-pink-800'
                                        }`}>
                                        {selectedVideo.model_type === 'male' ? 'Male Model' : 'Female Model'}
                                    </span>
                                    <span>{formatFileSize(selectedVideo.file_size)}</span>
                                    {selectedVideo.duration_seconds && (
                                        <span>{formatDuration(selectedVideo.duration_seconds)}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && videoToDelete && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900">Delete ISL Video</h2>
                                <button
                                    onClick={cancelDeleteVideo}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                    disabled={isDeleting}
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="mb-6">
                                <p className="text-gray-700 mb-4">
                                    Are you sure you want to delete this ISL video?
                                </p>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <h3 className="font-medium text-gray-900 mb-1">
                                        {videoToDelete.display_name}
                                    </h3>
                                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${videoToDelete.model_type === 'male'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-pink-100 text-pink-800'
                                            }`}>
                                            {videoToDelete.model_type === 'male' ? 'Male Model' : 'Female Model'}
                                        </span>
                                        <span>{formatFileSize(videoToDelete.file_size)}</span>
                                    </div>
                                </div>
                                <p className="text-sm text-red-600 mt-3">
                                    This action cannot be undone.
                                </p>
                            </div>

                            <div className="flex space-x-3">
                                <Button
                                    variant="outline"
                                    onClick={cancelDeleteVideo}
                                    className="flex-1"
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={confirmDeleteVideo}
                                    disabled={isDeleting}
                                    className="flex-1 bg-red-600 text-white hover:bg-red-700"
                                >
                                    {isDeleting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete Video
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sync Model Selection Modal */}
            {showSyncModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900">Sync ISL Videos</h2>
                                <button
                                    onClick={cancelSyncModal}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="mb-6">
                                <p className="text-gray-700 mb-4">
                                    Select which AI Avatar model folder to sync:
                                </p>
                                <div className="flex space-x-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setSelectedSyncModel('male')}
                                        className={`flex-1 ${selectedSyncModel === 'male'
                                            ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        Male
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setSelectedSyncModel('female')}
                                        className={`flex-1 ${selectedSyncModel === 'female'
                                            ? 'bg-pink-600 text-white border-pink-600 hover:bg-pink-700'
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        Female
                                    </Button>
                                </div>
                                <p className="text-sm text-gray-500 mt-3">
                                    This will scan the selected folder and process any videos not in the database.
                                </p>
                            </div>

                            <div className="flex space-x-3">
                                <Button
                                    variant="outline"
                                    onClick={cancelSyncModal}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={startSyncProcess}
                                    disabled={!selectedSyncModel}
                                    className="flex-1 text-white"
                                    style={{ backgroundColor: 'oklch(50% 0.134 242.749)' }}
                                >
                                    Start Sync
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sync Progress Modal */}
            {showSyncProgressModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="text-center">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Syncing ISL Videos</h2>

                                {/* Progress Bar */}
                                <div className="mb-4">
                                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                        <div
                                            className="h-full transition-all duration-500 ease-out"
                                            style={{
                                                width: `${syncProgress}%`,
                                                backgroundColor: 'oklch(50% 0.134 242.749)'
                                            }}
                                        ></div>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-2">{syncProgress}%</p>
                                </div>

                                {/* Status Message */}
                                <p className="text-gray-700 mb-6">{syncStatus}</p>

                                {/* Loading Spinner */}
                                <div className="flex justify-center mb-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>

                                {/* Model Info */}
                                {selectedSyncModel && (
                                    <div className="text-sm text-gray-500">
                                        <p className="font-medium">
                                            Syncing {selectedSyncModel === 'male' ? 'Male' : 'Female'} Model Folder
                                        </p>
                                    </div>
                                )}

                                {/* Results */}
                                {syncResults && (
                                    <div className="mt-4 p-3 bg-gray-50 rounded-lg text-left">
                                        <h4 className="font-medium text-gray-900 mb-2">Sync Results:</h4>
                                        <p className="text-sm text-gray-600">
                                            Found: {syncResults.total_folders} folders<br />
                                            Processed: {syncResults.processed} videos<br />
                                            Errors: {syncResults.errors?.length || 0}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    )
}
