'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Train, MapPin, Clock, X, Info } from 'lucide-react'
import { apiService } from '@/services/api'
import { islVideoGenerationService } from '@/services/isl-video-generation-service'
import { TrainRoute } from '@/types/train-route'
import { TrainAnnouncementRequest, TrainAnnouncementResponse } from '@/types/train-announcement'
import toast from 'react-hot-toast'

interface TrainInfo extends TrainRoute {
    platform?: number
    announcementCategory?: string
    model?: string
    generatedAnnouncement?: TrainAnnouncementResponse
    isGenerating?: boolean
}



export const Dashboard: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<TrainInfo[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [showSearchResults, setShowSearchResults] = useState(false)
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
    const searchContainerRef = useRef<HTMLDivElement>(null)
    const [announcementCategories, setAnnouncementCategories] = useState<string[]>([])
    const [isLoadingCategories, setIsLoadingCategories] = useState(true)
    const [supportedModels, setSupportedModels] = useState<string[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedTrainForGeneration, setSelectedTrainForGeneration] = useState<TrainInfo | null>(null)
    const [selectedModel, setSelectedModel] = useState<string>('male')
    const [isGeneratingInModal, setIsGeneratingInModal] = useState(false)
    const [isSignsInfoModalOpen, setIsSignsInfoModalOpen] = useState(false)
    const [selectedTrainForSignsInfo, setSelectedTrainForSignsInfo] = useState<TrainInfo | null>(null)
    const [playbackSpeeds, setPlaybackSpeeds] = useState<Record<number, number>>({})
    
    // Publish announcement modal state
    const [showPublishModal, setShowPublishModal] = useState(false)
    const [publishingAnnouncement, setPublishingAnnouncement] = useState<TrainInfo | null>(null)
    const [publishStatus, setPublishStatus] = useState<'idle' | 'saving' | 'generating' | 'success' | 'error'>('idle')
    const [publishMessage, setPublishMessage] = useState('')

    // Fetch announcement categories and supported models on component mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch categories
                const categories = await apiService.getAnnouncementCategories()
                setAnnouncementCategories(categories)
            } catch (error) {
                console.error('Error fetching announcement categories:', error)
                // Fallback to default categories if API fails
                setAnnouncementCategories([
                    'Arrival',
                    'Departure',
                    'Delay',
                    'Cancellation',
                    'Platform Change',
                    'General Announcement'
                ])
            } finally {
                setIsLoadingCategories(false)
            }

            try {
                // Fetch supported models
                const models = await apiService.getSupportedModels()
                setSupportedModels(models)
            } catch (error) {
                console.error('Error fetching supported models:', error)
                // Fallback to default models
                setSupportedModels(['male', 'female'])
            } finally {
                // Models loaded
            }
        }

        fetchData()
    }, [])

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeout) {
                clearTimeout(searchTimeout)
            }
        }
    }, [searchTimeout])

    // Handle click outside to hide search results
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setShowSearchResults(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const performSearch = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([])
            setShowSearchResults(false)
            return
        }

        setIsSearching(true)
        
        try {
            const results = await apiService.searchTrainRoutes(query, 10)
            // Set default values for each train result
            const resultsWithDefaults = results.map(train => ({
                ...train,
                platform: 1,
                announcementCategory: 'Arriving',
                model: 'male' // Default model
            }))
            setSearchResults(resultsWithDefaults)
            setShowSearchResults(true)
        } catch (error) {
            console.error('Error searching trains:', error)
            setSearchResults([])
            setShowSearchResults(false)
        } finally {
            setIsSearching(false)
        }
    }

    const handleSearch = async () => {
        // Clear any existing timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout)
        }
        await performSearch(searchQuery)
    }

    const handleClear = async () => {
        try {
            // Clear any existing timeout
            if (searchTimeout) {
                clearTimeout(searchTimeout)
            }
            
            // Clear the search state
            setSearchQuery('')
            setSearchResults([])
            setShowSearchResults(false)
            
            // Delete all ISL videos from temp directory
            await apiService.deleteAllTempVideos()
        } catch (error) {
            console.error('Error clearing videos:', error)
            // Still clear the search even if video deletion fails
        }
    }

    const handlePlatformChangeForTrain = (train: TrainInfo, platform: number) => {
        setSearchResults(prevResults => 
            prevResults.map(t => 
                t.train_number === train.train_number 
                    ? { ...t, platform }
                    : t
            )
        )
    }

    const handleCategoryChangeForTrain = (train: TrainInfo, category: string) => {
        setSearchResults(prevResults => 
            prevResults.map(t => 
                t.train_number === train.train_number 
                    ? { ...t, announcementCategory: category }
                    : t
            )
        )
    }


    const handleOpenModal = (train: TrainInfo) => {
        setSelectedTrainForGeneration(train)
        setSelectedModel(train.model || 'male')
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setSelectedTrainForGeneration(null)
        setSelectedModel('male')
        setIsGeneratingInModal(false)
    }

    const handleOpenSignsInfoModal = (train: TrainInfo) => {
        setSelectedTrainForSignsInfo(train)
        setIsSignsInfoModalOpen(true)
    }

    const handleCloseSignsInfoModal = () => {
        setIsSignsInfoModalOpen(false)
        setSelectedTrainForSignsInfo(null)
    }

    const handlePlaybackSpeedChange = (speed: number, trainId: number) => {
        console.log(`Setting playback speed to ${speed}x for train ID: ${trainId}`)
        
        // Update state
        setPlaybackSpeeds(prev => ({
            ...prev,
            [trainId]: speed
        }))
        
        // Find and update the video element
        const videoElement = document.querySelector(`video[data-train-id="${trainId}"]`) as HTMLVideoElement
        
        if (videoElement) {
            console.log(`Found video element, setting playback rate to ${speed}`)
            
            // Store current time if video is playing
            const currentTime = videoElement.currentTime
            const wasPlaying = !videoElement.paused
            
            // Set the new playback rate
            videoElement.playbackRate = speed
            
            // If the video was playing, restart it at the current position
            if (wasPlaying) {
                videoElement.currentTime = currentTime
                videoElement.play().catch(function(error) {
                    console.log('Video play failed (user interaction may be required):', error)
                })
            }
        } else {
            console.error(`Video element not found for train ID: ${trainId}`)
            // Try alternative selector
            const allVideos = document.querySelectorAll('video')
            for (const video of allVideos) {
                if (video.getAttribute('data-train-id') === trainId.toString()) {
                    const videoElement = video as HTMLVideoElement
                    const currentTime = videoElement.currentTime
                    const wasPlaying = !videoElement.paused
                    
                    videoElement.playbackRate = speed
                    
                    if (wasPlaying) {
                        videoElement.currentTime = currentTime
                        videoElement.play().catch(function(error) {
                            console.log('Video play failed (user interaction may be required):', error)
                        })
                    }
                    
                    console.log(`Found video element with alternative method, setting playback rate to ${speed}`)
                    break
                }
            }
        }
    }

    const handleGenerateAnnouncement = async () => {
        if (!selectedTrainForGeneration || !selectedTrainForGeneration.announcementCategory) {
            console.error('Train and category are required')
            return
        }

        // Set generating state in modal
        setIsGeneratingInModal(true)

        // Set generating state in search results
        setSearchResults(prevResults => 
            prevResults.map(t => 
                t.train_number === selectedTrainForGeneration.train_number 
                    ? { ...t, isGenerating: true }
                    : t
            )
        )

        try {
            const request: TrainAnnouncementRequest = {
                train_number: selectedTrainForGeneration.train_number,
                train_name: selectedTrainForGeneration.train_name,
                from_station_name: selectedTrainForGeneration.from_station_name,
                to_station_name: selectedTrainForGeneration.to_station_name,
                platform: selectedTrainForGeneration.platform || 1,
                announcement_category: selectedTrainForGeneration.announcementCategory,
                model: selectedModel,
                user_id: 1 // TODO: Get from auth context
            }

            const response = await apiService.generateTrainAnnouncement(request)
            
            // Update train with generated announcement and remove other results
            setSearchResults(prevResults => 
                prevResults
                    .filter(t => t.train_number === selectedTrainForGeneration.train_number)
                    .map(t => ({ 
                        ...t, 
                        generatedAnnouncement: response,
                        isGenerating: false 
                    }))
            )
            
            // Ensure search results remain visible
            setShowSearchResults(true)

            // Initialize playback speed for this train
            setPlaybackSpeeds(prev => ({
                ...prev,
                [selectedTrainForGeneration.id]: 1
            }))

            // Show success message
            toast.success('Announcement generated successfully!')
            
            // Close modal after successful generation
            handleCloseModal()

        } catch (error) {
            console.error('Error generating announcement:', error)
            
            // Show error message
            toast.error('Failed to generate announcement. Please try again.')
            
            // Set error state and remove other results
            setSearchResults(prevResults => 
                prevResults
                    .filter(t => t.train_number === selectedTrainForGeneration.train_number)
                    .map(t => ({ 
                        ...t, 
                        generatedAnnouncement: {
                            success: false,
                            error: error instanceof Error ? error.message : 'Unknown error'
                        },
                        isGenerating: false 
                    }))
            )
            
            // Ensure search results remain visible even on error
            setShowSearchResults(true)

            // Close modal even on error
            handleCloseModal()
        } finally {
            setIsGeneratingInModal(false)
        }
    }

    const handlePublishAnnouncement = async (train: TrainInfo) => {
        if (!train.generatedAnnouncement?.success) {
            console.error('No successful announcement to publish')
            return
        }

        // Open modal and start publishing process
        setPublishingAnnouncement(train)
        setShowPublishModal(true)
        setPublishStatus('idle')
        setPublishMessage('')

        try {
            // First, save the video to permanent location if it's a temporary video
            let videoPath = train.generatedAnnouncement.preview_url || ''
            
            if (videoPath.startsWith('/isl-video-generation/preview/')) {
                setPublishStatus('saving')
                setPublishMessage('Saving video to permanent location...')
                
                // Extract temp video ID from preview URL
                const tempVideoId = videoPath.split('/').pop()
                
                // Save the temporary video to permanent location
                const saveResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/isl-video-generation/save`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        temp_video_id: tempVideoId,
                        user_id: 1
                    })
                })
                
                if (saveResponse.ok) {
                    const saveResult = await saveResponse.json()
                    videoPath = saveResult.final_video_url
                    console.log('Video saved to permanent location:', videoPath)
                } else {
                    console.error('Failed to save video to permanent location')
                    setPublishStatus('error')
                    setPublishMessage('Failed to save video to permanent location. Please try again.')
                    return
                }
            }

            // Convert API endpoint URL to absolute file path
            let absoluteVideoPath = videoPath
            if (videoPath.startsWith('/api/v1/isl-videos/serve/')) {
                // Extract filename from API endpoint URL
                const filename = videoPath.split('/').pop()
                absoluteVideoPath = `/home/myuser/Projects/signverse/backend/uploads/isl-videos/user_1/${filename}`
            }

            setPublishStatus('generating')
            setPublishMessage('Generating HTML page...')

            console.log('Publishing announcement for train:', train.train_number)
            console.log('Video path:', absoluteVideoPath)

            // Call the HTML generation endpoint
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/html-generation/generate-simple-html`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    video_path: absoluteVideoPath
                })
            })

            if (response.ok) {
                const result = await response.json()
                console.log('HTML page generated successfully:', result)
                setPublishStatus('success')
                setPublishMessage('Announcement published successfully!')
            } else {
                const error = await response.json()
                console.error('Failed to publish announcement:', error)
                setPublishStatus('error')
                setPublishMessage(`Failed to publish announcement: ${error.detail || 'Unknown error'}`)
            }
            
        } catch (error) {
            console.error('Error publishing announcement:', error)
            setPublishStatus('error')
            setPublishMessage(`Error publishing announcement: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    const handleClosePublishModal = () => {
        // If the publish was successful, open a new tab with localhost
        if (publishStatus === 'success') {
            window.open('http://localhost', '_blank')
        }
        
        setShowPublishModal(false)
        setPublishingAnnouncement(null)
        setPublishStatus('idle')
        setPublishMessage('')
    }

    const validateTrainNumber = (value: string) => {
        // Allow only digits and limit to 5 characters for train number search
        // But also allow text for train name search
        if (/^\d+$/.test(value)) {
            return value.slice(0, 5)
        }
        return value
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        const validatedValue = validateTrainNumber(value)
        setSearchQuery(validatedValue)
        
        // Clear existing timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout)
        }
        
        // If input is empty, clear results immediately
        if (!validatedValue.trim()) {
            setSearchResults([])
            setShowSearchResults(false)
            return
        }
        
        // Set new timeout for debounced search
        const newTimeout = setTimeout(() => {
            performSearch(validatedValue)
        }, 300) // 300ms delay
        
        setSearchTimeout(newTimeout)
    }

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch()
        }
    }

    return (
        <div className="p-6">
            <div className="max-w-7xl mx-auto">
                <div className="space-y-6">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Generate ISL Announcement</h1>
                        <p className="text-gray-600">Search for trains and generate ISL announcements</p>
                    </div>

                    {/* Train Search Section */}
                    <div ref={searchContainerRef} className="bg-white p-6 border border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Search Train</h2>
                        
                        <div className="flex gap-4 mb-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={handleInputChange}
                                        onKeyPress={handleKeyPress}
                                        onFocus={() => {
                                            if (searchResults.length > 0) {
                                                setShowSearchResults(true)
                                            }
                                        }}
                                        placeholder="Enter train number or train name"
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleSearch}
                                disabled={isSearching}
                                className="hidden px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isSearching ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Searching...
                                    </>
                                ) : (
                                    <>
                                        <Search className="w-4 h-4" />
                                        Search
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleClear}
                                disabled={isSearching}
                                className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                Clear
                            </button>
                        </div>

                        {/* Loading Indicator */}
                        {isSearching && searchQuery.trim() && (
                            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                    <span className="text-blue-700">Searching for trains...</span>
                                </div>
                            </div>
                        )}

                        {/* No Results Message */}
                        {showSearchResults && searchResults.length === 0 && !isSearching && searchQuery.trim() && (
                            <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                <div className="text-center">
                                    <div className="text-gray-500 mb-2">
                                        <Train className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                        <p className="text-gray-600">No trains found matching your search</p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Try searching with a different train number or name
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Search Results */}
                        {showSearchResults && searchResults.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-3">Search Results</h3>
                                <div className="space-y-6">
                                    {searchResults.map((train, index) => (
                                        <div key={index} className="bg-gray-50 p-6 border border-gray-200">
                                            <h4 className="text-lg font-semibold text-gray-900 mb-4">
                                                {train.train_number} - {train.train_name}
                                            </h4>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Train Details */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <Train className="w-5 h-5 text-blue-600" />
                                                        <div>
                                                            <div className="text-sm text-gray-600">Train Number</div>
                                                            <div className="font-semibold text-gray-900">{train.train_number}</div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-5 h-5 flex items-center justify-center">
                                                            <span className="text-blue-600 font-bold">T</span>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm text-gray-600">Train Name</div>
                                                            <div className="font-semibold text-gray-900">{train.train_name}</div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3">
                                                        <MapPin className="w-5 h-5 text-green-600" />
                                                        <div>
                                                            <div className="text-sm text-gray-600">Route</div>
                                                            <div className="font-semibold text-gray-900">
                                                                {train.from_station_name} → {train.to_station_name}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Configuration Options */}
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Platform
                                                        </label>
                                                        <select
                                                            value={train.platform || 1}
                                                            onChange={(e) => handlePlatformChangeForTrain(train, parseInt(e.target.value))}
                                                            className="w-full p-3 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        >
                                                            {Array.from({ length: 20 }, (_, i) => i + 1).map(platform => (
                                                                <option key={platform} value={platform}>
                                                                    Platform {platform}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Announcement Category
                                                        </label>
                                                        <select
                                                            value={train.announcementCategory || 'Arriving'}
                                                            onChange={(e) => handleCategoryChangeForTrain(train, e.target.value)}
                                                            disabled={isLoadingCategories}
                                                            className="w-full p-3 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {isLoadingCategories ? (
                                                                <option value="Arriving">Loading categories...</option>
                                                            ) : (
                                                                announcementCategories.map(category => (
                                                                    <option key={category} value={category}>
                                                                        {category}
                                                                    </option>
                                                                ))
                                                            )}
                                                        </select>
                                                    </div>

                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="mt-6 flex gap-3">
                                                <button 
                                                    onClick={() => handleOpenModal(train)}
                                                    disabled={train.isGenerating || !train.announcementCategory}
                                                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    {train.isGenerating ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                            Generating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Clock className="w-4 h-4" />
                                                            Generate Announcement
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            {/* Generated Announcement Results */}
                                            {train.generatedAnnouncement && (
                                                <div className="mt-6 p-4 border border-gray-200 bg-gray-50">
                                                    <h5 className="text-lg font-semibold text-gray-900 mb-3">Generated Announcement</h5>
                                                    
                                                    {train.generatedAnnouncement.success ? (
                                                        <>
                                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                                {/* Left Panel - Multi-language Text */}
                                                                <div className="space-y-4">
                                                                    <h6 className="text-md font-medium text-gray-800 mb-3">Announcement Text</h6>
                                                                    
                                                                    {/* English */}
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                            English
                                                                        </label>
                                                                        <p className="text-sm text-gray-900 bg-white p-3 border min-h-[60px]">
                                                                            {train.generatedAnnouncement.generated_text}
                                                                        </p>
                                                                    </div>

                                                                    {/* Hindi */}
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                            Hindi (हिंदी)
                                                                        </label>
                                                                        <p className="text-sm text-gray-900 bg-white p-3 border min-h-[60px]">
                                                                            {train.generatedAnnouncement.generated_text_hindi || train.generatedAnnouncement.generated_text}
                                                                        </p>
                                                                    </div>

                                                                    {/* Marathi */}
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                            Marathi (मराठी)
                                                                        </label>
                                                                        <p className="text-sm text-gray-900 bg-white p-3 border min-h-[60px]">
                                                                            {train.generatedAnnouncement.generated_text_marathi || train.generatedAnnouncement.generated_text}
                                                                        </p>
                                                                    </div>

                                                                    {/* Gujarati */}
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                            Gujarati (ગુજરાતી)
                                                                        </label>
                                                                        <p className="text-sm text-gray-900 bg-white p-3 border min-h-[60px]">
                                                                            {train.generatedAnnouncement.generated_text_gujarati || train.generatedAnnouncement.generated_text}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* Right Panel - ISL Video */}
                                                                <div className="space-y-4">
                                                                    {train.generatedAnnouncement.preview_url && (
                                                                        <div>
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <label className="block text-sm font-medium text-gray-700">
                                                                                    ISL Video
                                                                                </label>
                                                                                <button
                                                                                    onClick={() => handleOpenSignsInfoModal(train)}
                                                                                    className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                                                                                    title="View signs information"
                                                                                >
                                                                                    <Info className="w-4 h-4" />
                                                                                </button>
                                                                            </div>
                                                                            <div className="bg-black rounded-lg overflow-hidden">
                                                                                <video 
                                                                                    controls 
                                                                                    className="w-full h-64 object-contain"
                                                                                    data-train-id={train.id}
                                                                                    src={train.generatedAnnouncement.temp_video_id ? 
                                                                                        islVideoGenerationService.getPreviewVideoUrl(train.generatedAnnouncement.temp_video_id) : 
                                                                                        `${process.env.NEXT_PUBLIC_API_URL || 'https://localhost:5001'}${train.generatedAnnouncement.preview_url}`
                                                                                    }
                                                                                >
                                                                                    Your browser does not support the video tag.
                                                                                </video>
                                                                            </div>
                                                                            
                                                                            {/* Playback Speed Controls */}
                                                                            <div className="mt-3">
                                                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                                    Playback Speed
                                                                                </label>
                                                                                <div className="flex gap-2 flex-wrap">
                                                                                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => {
                                                                                        const currentSpeed = playbackSpeeds[train.id] || 1
                                                                                        const isActive = speed === currentSpeed
                                                                                        return (
                                                                                            <button
                                                                                                key={speed}
                                                                                                onClick={() => handlePlaybackSpeedChange(speed, train.id)}
                                                                                                className={`px-3 py-1 text-sm border rounded hover:bg-gray-50 transition-colors ${
                                                                                                    isActive
                                                                                                        ? 'bg-blue-100 border-blue-300 text-blue-700' 
                                                                                                        : 'bg-white border-gray-300 text-gray-700'
                                                                                                }`}
                                                                                            >
                                                                                                {speed}x
                                                                                            </button>
                                                                                        )
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            {/* Publish Announcement Button */}
                                                                            <div className="mt-4">
                                                                                <button
                                                                                    onClick={() => handlePublishAnnouncement(train)}
                                                                                    className="w-full px-4 py-2 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                                                                                    disabled={!train.generatedAnnouncement?.success}
                                                                                >
                                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                                                    </svg>
                                                                                    Publish Announcement
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                        </>
                                                    ) : (
                                                        <div className="text-red-600">
                                                            <p className="font-medium">Generation Failed</p>
                                                            <p className="text-sm">{train.generatedAnnouncement.error}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* No Results Message */}
                        {searchQuery && searchResults.length === 0 && !isSearching && (
                            <div className="text-center py-8">
                                <Train className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-600">No trains found matching your search</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    Try searching with a different train number or name
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Model Selection Modal */}
            {isModalOpen && selectedTrainForGeneration && (
                <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
                    <div className="bg-white p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Select AI Model for Announcement
                        </h3>
                        
                        <div className="mb-6">
                            <p className="text-sm text-gray-600 mb-2">
                                <strong>Train:</strong> {selectedTrainForGeneration.train_number} - {selectedTrainForGeneration.train_name}
                            </p>
                            <p className="text-sm text-gray-600 mb-2">
                                <strong>Route:</strong> {selectedTrainForGeneration.from_station_name} → {selectedTrainForGeneration.to_station_name}
                            </p>
                            <p className="text-sm text-gray-600 mb-2">
                                <strong>Platform:</strong> {selectedTrainForGeneration.platform}
                            </p>
                            <p className="text-sm text-gray-600">
                                <strong>Category:</strong> {selectedTrainForGeneration.announcementCategory}
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Choose AI Model
                            </label>
                            <div className="space-y-3">
                                {supportedModels.map(model => (
                                    <label key={model} className="flex items-center space-x-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="model"
                                            value={model}
                                            checked={selectedModel === model}
                                            onChange={(e) => setSelectedModel(e.target.value)}
                                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                        />
                                        <div className="flex items-center space-x-2">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                                                model === 'male' ? 'bg-blue-600' : 'bg-pink-600'
                                            }`}>
                                                {model === 'male' ? 'M' : 'F'}
                                            </div>
                                            <span className="text-sm font-medium text-gray-900">
                                                {model.charAt(0).toUpperCase() + model.slice(1)} Model
                                            </span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={handleCloseModal}
                                disabled={isGeneratingInModal}
                                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleGenerateAnnouncement}
                                disabled={isGeneratingInModal}
                                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isGeneratingInModal ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Clock className="w-4 h-4" />
                                        Generate
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Signs Information Modal */}
            {isSignsInfoModalOpen && selectedTrainForSignsInfo && selectedTrainForSignsInfo.generatedAnnouncement && (
                <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
                    <div className="bg-white p-6 max-w-lg w-full mx-4 shadow-2xl border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Signs Information
                            </h3>
                            <button
                                onClick={handleCloseSignsInfoModal}
                                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">
                                    Train: {selectedTrainForSignsInfo.train_number} - {selectedTrainForSignsInfo.train_name}
                                </h4>
                            </div>

                            {selectedTrainForSignsInfo.generatedAnnouncement.signs_used && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Signs Used ({selectedTrainForSignsInfo.generatedAnnouncement.signs_used.length})
                                    </label>
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                                        <p className="text-sm text-green-800">
                                            {selectedTrainForSignsInfo.generatedAnnouncement.signs_used.join(', ')}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {selectedTrainForSignsInfo.generatedAnnouncement.signs_skipped && selectedTrainForSignsInfo.generatedAnnouncement.signs_skipped.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Signs Skipped ({selectedTrainForSignsInfo.generatedAnnouncement.signs_skipped.length})
                                    </label>
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                                        <p className="text-sm text-yellow-800">
                                            {selectedTrainForSignsInfo.generatedAnnouncement.signs_skipped.join(', ')}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {(!selectedTrainForSignsInfo.generatedAnnouncement.signs_used && !selectedTrainForSignsInfo.generatedAnnouncement.signs_skipped) && (
                                <div className="text-center py-4">
                                    <p className="text-gray-500 text-sm">No signs information available</p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end mt-6">
                            <button
                                onClick={handleCloseSignsInfoModal}
                                className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Publish Announcement Modal */}
            {showPublishModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Transparent background with shadow */}
                    <div className="absolute inset-0 bg-transparent"></div>
                    
                    {/* Modal content with shadow */}
                    <div className="relative bg-white rounded-lg shadow-2xl border border-gray-200 p-6 max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Publish Announcement
                            </h3>
                            <button
                                onClick={handleClosePublishModal}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {publishingAnnouncement && (
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-2">
                                    <strong>Train:</strong> {publishingAnnouncement.train_number} - {publishingAnnouncement.train_name}
                                </p>
                                <p className="text-sm text-gray-600">
                                    <strong>Route:</strong> {publishingAnnouncement.from_station_name} → {publishingAnnouncement.to_station_name}
                                </p>
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Status indicator */}
                            <div className="flex items-center space-x-3">
                                {publishStatus === 'idle' && (
                                    <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                                )}
                                {publishStatus === 'saving' && (
                                    <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                                )}
                                {publishStatus === 'generating' && (
                                    <div className="w-4 h-4 bg-yellow-500 rounded-full animate-pulse"></div>
                                )}
                                {publishStatus === 'success' && (
                                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                                )}
                                {publishStatus === 'error' && (
                                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                                )}
                                
                                <span className="text-sm font-medium text-gray-700">
                                    {publishStatus === 'idle' && 'Ready to publish'}
                                    {publishStatus === 'saving' && 'Saving video...'}
                                    {publishStatus === 'generating' && 'Generating HTML...'}
                                    {publishStatus === 'success' && 'Published successfully!'}
                                    {publishStatus === 'error' && 'Publishing failed'}
                                </span>
                            </div>

                            {/* Progress message */}
                            {publishMessage && (
                                <div className={`p-3 rounded-lg text-sm ${
                                    publishStatus === 'success' 
                                        ? 'bg-green-50 text-green-800 border border-green-200'
                                        : publishStatus === 'error'
                                        ? 'bg-red-50 text-red-800 border border-red-200'
                                        : 'bg-blue-50 text-blue-800 border border-blue-200'
                                }`}>
                                    <pre className="whitespace-pre-wrap">{publishMessage}</pre>
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex justify-end space-x-3">
                                {publishStatus === 'success' && (
                                    <button
                                        onClick={handleClosePublishModal}
                                        className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors"
                                    >
                                        Done
                                    </button>
                                )}
                                {publishStatus === 'error' && (
                                    <button
                                        onClick={handleClosePublishModal}
                                        className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                        Close
                                    </button>
                                )}
                                {(publishStatus === 'idle' || publishStatus === 'saving' || publishStatus === 'generating') && (
                                    <button
                                        onClick={handleClosePublishModal}
                                        className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}