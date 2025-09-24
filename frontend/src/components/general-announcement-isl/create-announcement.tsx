'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { 
    Languages, 
    Play, 
    Volume2, 
    Save,
    Megaphone,
    RotateCcw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { translationService } from '@/services/translation-service'
import { islVideoGenerationService } from '@/services/isl-video-generation-service'

interface CreateAnnouncementProps {
    onBack: () => void
}

interface TranslationProgress {
    step: 'starting' | 'translating' | 'completed' | 'error'
    message: string
    progress: number
    error?: string
}

export const CreateAnnouncement: React.FC<CreateAnnouncementProps> = ({ onBack }) => {
    // Form state
    const [announcementName, setAnnouncementName] = useState('')
    const [category, setCategory] = useState('')
    const [englishText, setEnglishText] = useState('')
    const [selectedModel, setSelectedModel] = useState<'male' | 'female'>('male')
    
    // Translation state
    const [translatedTexts, setTranslatedTexts] = useState({
        hindi: '',
        marathi: '',
        gujarati: ''
    })
    const [isTranslating, setIsTranslating] = useState(false)
    const [showTranslationProgress, setShowTranslationProgress] = useState(false)
    const [translationProgress, setTranslationProgress] = useState<TranslationProgress>({
        step: 'starting',
        message: '',
        progress: 0
    })
    
    // Video generation state
    const [isGeneratingISL, setIsGeneratingISL] = useState(false)
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)
    const [videoGenerationProgress, setVideoGenerationProgress] = useState({
        step: 'starting' as 'starting' | 'generating' | 'completed' | 'error',
        message: '',
        progress: 0,
        error: ''
    })
    const [showVideoProgress, setShowVideoProgress] = useState(false)
    const [playbackSpeed, setPlaybackSpeed] = useState(1)
    const [isSaving, setIsSaving] = useState(false)
    const [showClearModal, setShowClearModal] = useState(false)
    const [tempVideoId, setTempVideoId] = useState<string | null>(null)
    
    const videoRef = useRef<HTMLVideoElement>(null)

    // Categories for dropdown
    const categories = [
        'Safety Announcement',
        'Schedule Information',
        'General Information',
        'Emergency Notice',
        'Service Update',
        'Platform Information',
        'Train Information',
        'Other'
    ]

    const handleTranslate = async () => {
        if (!englishText.trim()) {
            toast.error('Please enter English text first')
            return
        }

        setShowTranslationProgress(true)
        setIsTranslating(true)

        try {
            const result = await translationService.translateText(
                englishText,
                'en',
                ['hi', 'mr', 'gu'],
                (progress) => {
                    setTranslationProgress(progress)
                }
            )

            if (result.success && result.translations) {
                setTranslatedTexts({
                    hindi: result.translations.hi || '',
                    marathi: result.translations.mr || '',
                    gujarati: result.translations.gu || ''
                })

                setTimeout(() => {
                    setShowTranslationProgress(false)
                    toast.success('Translation completed successfully!')
                }, 1500)
            } else {
                setTimeout(() => {
                    setShowTranslationProgress(false)
                    toast.error(result.error || 'Translation failed. Please try again.')
                }, 2000)
            }

            setIsTranslating(false)
        } catch (error) {
            console.error('Translation failed:', error)

            setTranslationProgress({
                step: 'error',
                message: 'Translation failed',
                progress: 0,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            })

            setTimeout(() => {
                setShowTranslationProgress(false)
                toast.error('Translation failed. Please try again.')
            }, 2000)

            setIsTranslating(false)
        }
    }

    const handleGenerateISL = async () => {
        if (!englishText.trim()) {
            toast.error('Please enter English text first')
            return
        }

        setShowVideoProgress(true)
        setIsGeneratingISL(true)

        try {
            const result = await islVideoGenerationService.generateVideo({
                text: englishText,
                model: selectedModel,
                user_id: 1
            })

            if (result.success && result.temp_video_id) {
                // Use the service method to construct the correct preview URL
                const fullVideoUrl = islVideoGenerationService.getPreviewVideoUrl(result.temp_video_id)
                
                console.log('Video generation result:', result)
                console.log('Temp video ID:', result.temp_video_id)
                console.log('Constructed video URL:', fullVideoUrl)
                
                setGeneratedVideoUrl(fullVideoUrl)
                setTempVideoId(result.temp_video_id)
                setTimeout(() => {
                    setShowVideoProgress(false)
                    toast.success('ISL video generated successfully!')
                }, 1500)
            } else {
                setTimeout(() => {
                    setShowVideoProgress(false)
                    toast.error(result.error || 'Video generation failed. Please try again.')
                }, 2000)
            }

            setIsGeneratingISL(false)
        } catch (error) {
            console.error('Video generation failed:', error)

            setVideoGenerationProgress({
                step: 'error',
                message: 'Video generation failed',
                progress: 0,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            })

            setTimeout(() => {
                setShowVideoProgress(false)
                toast.error('Video generation failed. Please try again.')
            }, 2000)

            setIsGeneratingISL(false)
        }
    }

    const handlePlaybackSpeedChange = (speed: number) => {
        setPlaybackSpeed(speed)
        if (videoRef.current) {
            videoRef.current.playbackRate = speed
        }
    }

    const handleClear = () => {
        // Check if there's any content to clear
        const hasContent = announcementName.trim() || 
                          category || 
                          englishText.trim() || 
                          translatedTexts.hindi.trim() || 
                          translatedTexts.marathi.trim() || 
                          translatedTexts.gujarati.trim() || 
                          generatedVideoUrl

        if (!hasContent) {
            toast('Form is already empty', {
                icon: 'ℹ️',
                duration: 2000,
            })
            return
        }

        // Show confirmation modal
        setShowClearModal(true)
    }

    const confirmClear = () => {
        // Reset all form fields
        setAnnouncementName('')
        setCategory('')
        setEnglishText('')
        setSelectedModel('male')
        
        // Reset translation state
        setTranslatedTexts({
            hindi: '',
            marathi: '',
            gujarati: ''
        })
        setIsTranslating(false)
        setShowTranslationProgress(false)
        setTranslationProgress({
            step: 'starting',
            message: '',
            progress: 0
        })
        
        // Reset video generation state
        setIsGeneratingISL(false)
        setGeneratedVideoUrl(null)
        setTempVideoId(null)
        setVideoGenerationProgress({
            step: 'starting',
            message: '',
            progress: 0,
            error: ''
        })
        setShowVideoProgress(false)
        setPlaybackSpeed(1)
        
        // Reset video element
        if (videoRef.current) {
            videoRef.current.load()
        }
        
        // Close modal and show success message
        setShowClearModal(false)
        toast.success('Form cleared successfully!')
    }

    const cancelClear = () => {
        setShowClearModal(false)
    }

    const handleSave = async () => {
        if (!announcementName.trim()) {
            toast.error('Please enter announcement name')
            return
        }
        if (!category) {
            toast.error('Please select a category')
            return
        }
        if (!englishText.trim()) {
            toast.error('Please enter English text')
            return
        }

        setIsSaving(true)

        try {
            const announcementData = {
                announcement_name: announcementName,
                category: category,
                model: selectedModel,
                announcement_text_english: englishText,
                announcement_text_hindi: translatedTexts.hindi || null,
                announcement_text_gujarati: translatedTexts.gujarati || null,
                announcement_text_marathi: translatedTexts.marathi || null,
                user_id: 1 // TODO: Get from auth context
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/isl-announcements/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(announcementData)
            })

            if (response.ok) {
                const savedAnnouncement = await response.json()
                
                // If we have a generated video, save it to permanent location
                if (generatedVideoUrl && tempVideoId) {
                    try {
                        // Save the temporary video to permanent location
                        const saveResult = await islVideoGenerationService.saveVideo({
                            temp_video_id: tempVideoId,
                            user_id: 1
                        })

                        if (saveResult.success) {
                            // Update the announcement with the final video path
                            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/isl-announcements/${savedAnnouncement.id}/video`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ 
                                    final_video_path: saveResult.final_video_url,
                                    final_video_url: saveResult.final_video_url,
                                    is_saved: true
                                })
                            })
                            
                            toast.success('Announcement and ISL video saved successfully!')
                        } else {
                            toast.error('Failed to save ISL video, but announcement was saved.')
                        }
                    } catch (videoError) {
                        console.error('Video save error:', videoError)
                        toast.error('Failed to save ISL video, but announcement was saved.')
                    }
                } else {
                    toast.success('Announcement saved successfully!')
                }
                
                onBack() // Go back to the main page
            } else {
                const error = await response.json()
                toast.error(error.detail || 'Failed to save announcement')
            }
        } catch (error) {
            console.error('Save failed:', error)
            toast.error('Failed to save announcement. Please try again.')
        } finally {
            setIsSaving(false)
        }
    }

    const breadcrumbItems = [
        { label: 'General Announcement ISL', onClick: onBack },
        { label: 'Create Announcement' }
    ]

    return (
        <div className="p-6">
            <div className="max-w-7xl mx-auto">
                <div className="space-y-6">
                    {/* Breadcrumb Navigation */}
                    <Breadcrumb items={breadcrumbItems} />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Megaphone className="w-8 h-8 text-blue-600" />
                        Create New Announcement
                    </h1>
                    <p className="text-gray-600 mt-1">Create a new general announcement with ISL video</p>
                </div>
                <Button 
                    onClick={handleClear}
                    variant="outline"
                    className="flex items-center gap-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                >
                    <RotateCcw className="w-4 h-4" />
                    Clear All
                </Button>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Panel - Form */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Announcement Details</h3>
                    
                    <div className="space-y-4">
                        {/* Announcement Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Announcement Name *
                            </label>
                            <input
                                type="text"
                                value={announcementName}
                                onChange={(e) => setAnnouncementName(e.target.value)}
                                placeholder="Enter announcement name"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Category *
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select a category</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* English Text */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                English Text *
                            </label>
                            <textarea
                                value={englishText}
                                onChange={(e) => setEnglishText(e.target.value)}
                                placeholder="Enter the announcement text in English"
                                rows={6}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            />
                        </div>

                        {/* Translate Button */}
                        <Button
                            onClick={handleTranslate}
                            disabled={!englishText.trim() || isTranslating}
                            className="w-full"
                            variant="outline"
                        >
                            <Languages className="w-4 h-4 mr-2" />
                            {isTranslating ? 'Translating...' : 'Translate'}
                        </Button>

                        {/* Translated Texts */}
                        {(translatedTexts.hindi || translatedTexts.marathi || translatedTexts.gujarati) && (
                            <div className="space-y-3 pt-4 border-t border-gray-200">
                                <h4 className="text-sm font-medium text-gray-700">Translated Texts</h4>
                                
                                {translatedTexts.hindi && (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Hindi</label>
                                        <textarea
                                            value={translatedTexts.hindi}
                                            onChange={(e) => setTranslatedTexts(prev => ({ ...prev, hindi: e.target.value }))}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                                        />
                                    </div>
                                )}

                                {translatedTexts.marathi && (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Marathi</label>
                                        <textarea
                                            value={translatedTexts.marathi}
                                            onChange={(e) => setTranslatedTexts(prev => ({ ...prev, marathi: e.target.value }))}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                                        />
                                    </div>
                                )}

                                {translatedTexts.gujarati && (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Gujarati</label>
                                        <textarea
                                            value={translatedTexts.gujarati}
                                            onChange={(e) => setTranslatedTexts(prev => ({ ...prev, gujarati: e.target.value }))}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Card>

                {/* Right Panel - Video Preview */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">ISL Video Preview</h3>
                    
                    <div className="space-y-4">
                        {/* Video Preview Area */}
                        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg h-80 flex items-center justify-center">
                            {isGeneratingISL ? (
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                    <p className="text-gray-600">Generating ISL Video...</p>
                                </div>
                            ) : generatedVideoUrl ? (
                                <div className="w-full h-full">
                                    <video
                                        ref={videoRef}
                                        className="w-full h-full object-contain rounded-lg"
                                        controls
                                        autoPlay
                                        muted
                                        onLoadStart={() => console.log('Video load started:', generatedVideoUrl)}
                                        onCanPlay={() => console.log('Video can play:', generatedVideoUrl)}
                                        onError={(e) => console.error('Video error:', e, 'URL:', generatedVideoUrl)}
                                    >
                                        <source src={generatedVideoUrl} type="video/mp4" />
                                        Your browser does not support the video tag.
                                    </video>
                                </div>
                            ) : (
                                <div className="text-center text-gray-500">
                                    <Play className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                                    <p className="text-lg font-medium mb-2">ISL Video will appear here</p>
                                    <p className="text-sm">Click &quot;Generate ISL Video&quot; to create video</p>
                                </div>
                            )}
                        </div>

                        {/* AI Avatar Model Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                AI Avatar Model
                            </label>
                            <div className="flex space-x-2">
                                <Button
                                    variant={selectedModel === 'male' ? 'default' : 'outline'}
                                    onClick={() => setSelectedModel('male')}
                                    disabled={isGeneratingISL}
                                    className={`flex-1 ${selectedModel === 'male'
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                        }`}
                                >
                                    Male
                                </Button>
                                <Button
                                    variant={selectedModel === 'female' ? 'default' : 'outline'}
                                    onClick={() => setSelectedModel('female')}
                                    disabled={isGeneratingISL}
                                    className={`flex-1 ${selectedModel === 'female'
                                        ? 'bg-pink-600 hover:bg-pink-700 text-white'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                        }`}
                                >
                                    Female
                                </Button>
                            </div>
                        </div>

                        {/* Playback Speed Controls */}
                        {generatedVideoUrl && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Playback Speed</label>
                                <div className="flex space-x-1">
                                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                                        <Button
                                            key={speed}
                                            variant={playbackSpeed === speed ? 'default' : 'outline'}
                                            onClick={() => handlePlaybackSpeedChange(speed)}
                                            className={`px-2 py-1 text-xs ${playbackSpeed === speed
                                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                                }`}
                                        >
                                            {speed}x
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Generate ISL Video and Save Buttons */}
                        <div className="flex space-x-3">
                            <Button
                                onClick={handleGenerateISL}
                                disabled={!englishText.trim() || isGeneratingISL}
                                className="flex-1"
                                variant="outline"
                            >
                                <Volume2 className="w-4 h-4 mr-2" />
                                {isGeneratingISL ? 'Generating...' : 'Generate ISL Video'}
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={!announcementName.trim() || !category || !englishText.trim() || isSaving}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {isSaving ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Translation Progress Modal */}
            {showTranslationProgress && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-transparent">
                    <div className="bg-white p-8 max-w-md w-full mx-4 rounded-lg shadow-2xl">
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Translating Text</h3>
                            <div className="mb-4">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${translationProgress.progress}%` }}
                                    ></div>
                                </div>
                                <p className="text-sm text-gray-600 mt-2">{translationProgress.message}</p>
                            </div>
                            {translationProgress.step === 'error' && (
                                <p className="text-sm text-red-600">{translationProgress.error}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Video Generation Progress Modal */}
            {showVideoProgress && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-transparent">
                    <div className="bg-white p-8 max-w-md w-full mx-4 rounded-lg shadow-2xl">
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generating ISL Video</h3>
                            <div className="mb-4">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${videoGenerationProgress.progress}%` }}
                                    ></div>
                                </div>
                                <p className="text-sm text-gray-600 mt-2">{videoGenerationProgress.message}</p>
                            </div>
                            {videoGenerationProgress.step === 'error' && (
                                <p className="text-sm text-red-600">{videoGenerationProgress.error}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Clear Confirmation Modal */}
            {showClearModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-transparent">
                    <div className="bg-white p-8 max-w-md w-full mx-4 rounded-none shadow-xl">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 mb-4">
                                <RotateCcw className="h-6 w-6 text-orange-600" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Clear All Form Data</h3>
                            <p className="text-sm text-red-600 mb-6 font-medium">
                                This action cannot be undone.
                            </p>
                            <div className="flex space-x-3">
                                <Button
                                    onClick={cancelClear}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={confirmClear}
                                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                                >
                                    Clear All
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
                </div>
            </div>
        </div>
    )
}