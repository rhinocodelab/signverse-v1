'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Languages, Play, Volume2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { translationService, TranslationProgress } from '@/services/translation-service'
import { islVideoGenerationService } from '@/services/isl-video-generation-service'

export const TextToISL: React.FC = () => {
    const [englishText, setEnglishText] = useState('')
    const [translatedTexts, setTranslatedTexts] = useState({
        hindi: '',
        marathi: '',
        gujarati: ''
    })
    const [isTranslating, setIsTranslating] = useState(false)
    const [isGeneratingISL, setIsGeneratingISL] = useState(false)
    const [showTranslationProgress, setShowTranslationProgress] = useState(false)
    const [translationProgress, setTranslationProgress] = useState<TranslationProgress>({
        step: 'starting',
        message: '',
        progress: 0,
        error: ''
    })
    const [selectedModel, setSelectedModel] = useState<'male' | 'female'>('male')
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)
    const [videoGenerationProgress, setVideoGenerationProgress] = useState({
        step: 'starting' as 'starting' | 'generating' | 'completed' | 'error',
        message: '',
        progress: 0,
        error: ''
    })
    const [showVideoProgress, setShowVideoProgress] = useState(false)
    const [playbackSpeed, setPlaybackSpeed] = useState(1)
    const videoRef = useRef<HTMLVideoElement>(null)

    const handleTranslate = async () => {
        if (!englishText.trim()) return

        // Show progress modal and start translation process
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
                // Update the translated texts
                setTranslatedTexts({
                    hindi: result.translations.hi || '',
                    marathi: result.translations.mr || '',
                    gujarati: result.translations.gu || ''
                })

                // Close modal after a short delay
                setTimeout(() => {
                    setShowTranslationProgress(false)
                    toast.success('Translation completed successfully!')
                }, 1500)
            } else {
                // Error is already handled by the service and progress callback
                setTimeout(() => {
                    setShowTranslationProgress(false)
                    toast.error(result.error || 'Translation failed. Please try again.')
                }, 2000)
            }

            setIsTranslating(false)
        } catch (error) {
            console.error('Translation failed:', error)

            // Fallback error handling
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

    const handleClear = async () => {
        setEnglishText('')
        setTranslatedTexts({
            hindi: '',
            marathi: '',
            gujarati: ''
        })

        // Clear generated video if exists
        if (generatedVideoUrl) {
            try {
                // Extract temp video ID from the URL
                const urlParts = generatedVideoUrl.split('/')
                const tempVideoId = urlParts[urlParts.length - 1]

                // Clean up temporary video
                await islVideoGenerationService.cleanupTempVideo(tempVideoId)
                console.log('Temporary video cleaned up successfully')
            } catch (error) {
                console.error('Failed to cleanup temporary video:', error)
                // Don't show error toast as this is not critical
            }
        }

        // Clear video state
        setGeneratedVideoUrl(null)
        setPlaybackSpeed(1) // Reset playback speed
    }

    const handlePlaybackSpeedChange = (speed: number) => {
        setPlaybackSpeed(speed)
    }

    // Update video playback speed when playbackSpeed state changes
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackSpeed
        }
    }, [playbackSpeed])

    const handleGenerateISL = async () => {
        if (!englishText.trim()) return

        // Show progress modal and start video generation
        setShowVideoProgress(true)
        setIsGeneratingISL(true)

        // Initialize progress
        setVideoGenerationProgress({
            step: 'starting',
            message: 'Initializing video generation...',
            progress: 10,
            error: ''
        })

        try {
            // Update progress - preparing request
            setVideoGenerationProgress({
                step: 'generating',
                message: 'Generating ISL video...',
                progress: 30,
                error: ''
            })

            const result = await islVideoGenerationService.generateVideoForm(
                englishText,
                selectedModel,
                1 // TODO: Get actual user ID from auth context
            )

            if (result.success) {
                // Update progress - completed
                setVideoGenerationProgress({
                    step: 'completed',
                    message: 'ISL video generated successfully!',
                    progress: 100,
                    error: ''
                })

                // Set the generated video URL
                setGeneratedVideoUrl(islVideoGenerationService.getPreviewVideoUrl(result.temp_video_id))

                // Close modal after a short delay
                setTimeout(() => {
                    setShowVideoProgress(false)
                    toast.success('ISL video generated successfully!')
                }, 1500)
            } else {
                throw new Error(result.error || 'Video generation failed')
            }

            setIsGeneratingISL(false)
        } catch (error) {
            console.error('ISL generation failed:', error)

            // Update progress - error
            setVideoGenerationProgress({
                step: 'error',
                message: 'Video generation failed',
                progress: 0,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            })

            // Close modal after a delay and show error
            setTimeout(() => {
                setShowVideoProgress(false)
                toast.error('ISL video generation failed. Please try again.')
            }, 2000)

            setIsGeneratingISL(false)
        }
    }

    return (
        <div className="p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                        <Languages className="w-8 h-8 text-blue-600" />
                        Text to ISL
                    </h1>
                    <p className="text-gray-600">Convert English text to Indian Sign Language video</p>
                </div>

            <Card className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Panel - Text Input and Translation */}
                    <div className="space-y-6">
                        {/* English Text Input */}
                        <div>
                            <label htmlFor="english-text" className="block text-sm font-medium text-gray-700 mb-2">
                                English Text
                            </label>
                            <textarea
                                id="english-text"
                                value={englishText}
                                onChange={(e) => setEnglishText(e.target.value)}
                                placeholder="Enter your English text here..."
                                className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={isTranslating || isGeneratingISL}
                            />
                        </div>


                        {/* Translate and Clear Buttons */}
                        <div className="flex space-x-3">
                            <Button
                                onClick={handleTranslate}
                                disabled={!englishText.trim() || isTranslating || isGeneratingISL}
                                className="flex-1 text-white"
                                style={{ backgroundColor: 'oklch(50% 0.134 242.749)' }}
                            >
                                {isTranslating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Translating...
                                    </>
                                ) : (
                                    <>
                                        <Languages className="w-4 h-4 mr-2" />
                                        Translate
                                    </>
                                )}
                            </Button>
                            <Button
                                onClick={handleClear}
                                disabled={isTranslating || isGeneratingISL}
                                variant="outline"
                                className="px-6"
                            >
                                Clear
                            </Button>
                        </div>

                        {/* Translated Texts */}
                        {(translatedTexts.hindi || translatedTexts.marathi || translatedTexts.gujarati) && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">Translated Text</h3>

                                {/* Hindi Translation */}
                                {translatedTexts.hindi && (
                                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                        <div className="flex items-center mb-2">
                                            <span className="w-6 h-6 bg-orange-100 text-orange-800 rounded-full flex items-center justify-center text-sm font-bold mr-2">हि</span>
                                            <span className="text-sm font-medium text-orange-800">हिन्दी</span>
                                        </div>
                                        <p className="text-gray-900">{translatedTexts.hindi}</p>
                                    </div>
                                )}

                                {/* Marathi Translation */}
                                {translatedTexts.marathi && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div className="flex items-center mb-2">
                                            <span className="w-6 h-6 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-sm font-bold mr-2">म</span>
                                            <span className="text-sm font-medium text-green-800">मराठी</span>
                                        </div>
                                        <p className="text-gray-900">{translatedTexts.marathi}</p>
                                    </div>
                                )}

                                {/* Gujarati Translation */}
                                {translatedTexts.gujarati && (
                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                        <div className="flex items-center mb-2">
                                            <span className="w-6 h-6 bg-purple-100 text-purple-800 rounded-full flex items-center justify-center text-sm font-bold mr-2">ગ</span>
                                            <span className="text-sm font-medium text-purple-800">ગુજરાતી</span>
                                        </div>
                                        <p className="text-gray-900">{translatedTexts.gujarati}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Panel - ISL Video Preview */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">ISL Video Preview</h3>

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
                                        >
                                            <source src={generatedVideoUrl} type="video/mp4" />
                                            Your browser does not support the video tag.
                                        </video>
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-500">
                                        <Play className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                                        <p className="text-lg font-medium mb-2">ISL Video will appear here</p>
                                        <p className="text-sm">Enter text and click &quot;Generate ISL Video&quot; to create video</p>
                                    </div>
                                )}
                            </div>

                            {/* Playback Speed Controls */}
                            {generatedVideoUrl && (
                                <div className="mt-4">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium text-gray-700">Speed:</span>
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
                                </div>
                            )}

                            {/* AI Avatar Model Selection - Only show when translation is complete */}
                            {(translatedTexts.hindi || translatedTexts.marathi || translatedTexts.gujarati) && (
                                <div className="mt-4 mb-4">
                                    <div className="flex items-center space-x-3">
                                        <label className="text-sm font-medium text-gray-700">
                                            AI Avatar Model:
                                        </label>
                                        <div className="flex space-x-1">
                                            <Button
                                                variant={selectedModel === 'male' ? 'default' : 'outline'}
                                                onClick={() => setSelectedModel('male')}
                                                disabled={isTranslating || isGeneratingISL}
                                                className={`px-3 py-1 text-xs ${selectedModel === 'male'
                                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                                    }`}
                                            >
                                                Male
                                            </Button>
                                            <Button
                                                variant={selectedModel === 'female' ? 'default' : 'outline'}
                                                onClick={() => setSelectedModel('female')}
                                                disabled={isTranslating || isGeneratingISL}
                                                className={`px-3 py-1 text-xs ${selectedModel === 'female'
                                                    ? 'bg-pink-600 hover:bg-pink-700 text-white'
                                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                                    }`}
                                            >
                                                Female
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Generate ISL Button */}
                            <Button
                                onClick={handleGenerateISL}
                                disabled={!englishText.trim() || isGeneratingISL || isTranslating}
                                className="w-full mt-4"
                                variant="outline"
                            >
                                <Volume2 className="w-4 h-4 mr-2" />
                                {isGeneratingISL ? 'Generating ISL Video...' : 'Generate ISL Video'}
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Translation Progress Modal */}
            {showTranslationProgress && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="bg-white p-8 max-w-md w-full mx-4 shadow-2xl">
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Translating Text</h3>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${translationProgress.progress}%` }}
                                ></div>
                            </div>

                            {/* Progress Text */}
                            <p className="text-gray-600 mb-4">{translationProgress.message}</p>

                            {/* Progress Percentage */}
                            <p className="text-sm text-gray-500 mb-4">{translationProgress.progress}%</p>

                            {/* Loading Spinner */}
                            {translationProgress.step === 'translating' && (
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            )}

                            {/* Success Icon */}
                            {translationProgress.step === 'completed' && (
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}

                            {/* Error Icon */}
                            {translationProgress.step === 'error' && (
                                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                            )}

                            {/* Error Message */}
                            {translationProgress.step === 'error' && translationProgress.error && (
                                <p className="text-red-600 text-sm mb-4">{translationProgress.error}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Video Generation Progress Modal */}
            {showVideoProgress && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                {videoGenerationProgress.step === 'starting' && 'Starting Video Generation...'}
                                {videoGenerationProgress.step === 'generating' && 'Generating ISL Video...'}
                                {videoGenerationProgress.step === 'completed' && 'Video Generated!'}
                                {videoGenerationProgress.step === 'error' && 'Video Generation Failed'}
                            </h3>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                                <div
                                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${videoGenerationProgress.progress}%` }}
                                ></div>
                            </div>

                            {/* Progress Text */}
                            <p className="text-gray-600 mb-4">{videoGenerationProgress.message}</p>

                            {/* Progress Percentage */}
                            <p className="text-sm text-gray-500 mb-4">{videoGenerationProgress.progress}%</p>

                            {/* Loading Spinner */}
                            {(videoGenerationProgress.step === 'starting' || videoGenerationProgress.step === 'generating') && (
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                            )}

                            {/* Success Icon */}
                            {videoGenerationProgress.step === 'completed' && (
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}

                            {/* Error Icon */}
                            {videoGenerationProgress.step === 'error' && (
                                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                            )}

                            {/* Error Message */}
                            {videoGenerationProgress.step === 'error' && videoGenerationProgress.error && (
                                <p className="text-red-600 text-sm mb-4">{videoGenerationProgress.error}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    )
}
