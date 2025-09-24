'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Play, Volume2, Upload, AlertCircle, RotateCcw, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { translationService } from '../../services/translation-service'
import { islVideoGenerationService } from '../../services/isl-video-generation-service'

interface AudioProcessingStep {
    step: 'uploading' | 'detecting_language' | 'transcribing' | 'translating' | 'generating_isl' | 'completed' | 'error'
    message: string
    progress: number
    error?: string
}

interface TranslationResult {
    language: string
    text: string
    icon: string
    color: string
}

const AudioToISL: React.FC = () => {
    const [audioFile, setAudioFile] = useState<File | null>(null)
    const [audioUrl, setAudioUrl] = useState<string | null>(null)
    const [savedAudioFilePath, setSavedAudioFilePath] = useState<string | null>(null)
    const [detectedLanguage, setDetectedLanguage] = useState<string>('')
    const [transcribedText, setTranscribedText] = useState<string>('')
    const [translations, setTranslations] = useState<TranslationResult[]>([])
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)
    const [islVideoPath, setIslVideoPath] = useState<string | null>(null)
    const [selectedModel, setSelectedModel] = useState<'male' | 'female'>('male')
    const [isGeneratingISL, setIsGeneratingISL] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [showProgressModal, setShowProgressModal] = useState(false)
    const [processingStep, setProcessingStep] = useState<AudioProcessingStep>({
        step: 'uploading',
        message: '',
        progress: 0
    })
    const [playbackSpeed, setPlaybackSpeed] = useState(1)
    const videoRef = useRef<HTMLVideoElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Update video playback speed when playbackSpeed state changes
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackSpeed
        }
    }, [playbackSpeed])

    // Cleanup function to delete temporary files when component unmounts
    useEffect(() => {
        return () => {
            // Cleanup audio URL
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl)
            }

            // Note: We don't delete server files on unmount as the user might want to continue
            // The clear button should be used for intentional cleanup
        }
    }, [audioUrl])

    const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        const files = e.dataTransfer.files
        if (files.length > 0) {
            handleFileSelect(files[0])
        }
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
    }

    const handleFileSelect = (file: File) => {
        // Validate file type - check both MIME type and file extension
        const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac', 'audio/x-wav', 'audio/wave']
        const allowedExtensions = ['.wav', '.mp3', '.aiff', '.aac', '.ogg', '.flac']
        
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
        const isValidMimeType = allowedTypes.includes(file.type)
        const isValidExtension = allowedExtensions.includes(fileExtension)
        
        // Debug logging for file validation
        console.log('File validation debug:', {
            fileName: file.name,
            fileType: file.type,
            fileExtension: fileExtension,
            isValidMimeType: isValidMimeType,
            isValidExtension: isValidExtension,
            fileSize: file.size
        })
        
        if (!isValidMimeType && !isValidExtension) {
            console.log('File validation failed:', {
                fileName: file.name,
                fileType: file.type,
                fileExtension: fileExtension,
                allowedTypes: allowedTypes,
                allowedExtensions: allowedExtensions
            })
            toast.error('Please select a valid audio file (WAV, MP3, AIFF, AAC, OGG, FLAC)')
            return
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            toast.error('File size too large. Maximum size is 10MB.')
            return
        }

        setAudioFile(file)

        // Create URL for audio preview
        const url = URL.createObjectURL(file)
        setAudioUrl(url)

        // Start processing automatically
        handleProcessAudio(file)
    }

    const handleProcessAudio = async (file: File) => {
        setIsProcessing(true)
        setShowProgressModal(true)

        try {
            // Step 1: Upload audio file
            setProcessingStep({
                step: 'uploading',
                message: 'Uploading audio file...',
                progress: 10
            })

            // Save audio file to temp folder
            const formData = new FormData()
            formData.append('file', file)

            // Save file to backend temp directory
            const saveResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/audio-upload/save-audio`, {
                method: 'POST',
                body: formData
            })

            if (!saveResponse.ok) {
                throw new Error('Failed to save audio file')
            }

            const saveData = await saveResponse.json()
            setSavedAudioFilePath(saveData.filename) // Store filename for cleanup
            console.log(`Audio file saved to: ${saveData.file_path}`)

            // Step 2: Detect language
            setProcessingStep({
                step: 'detecting_language',
                message: 'Detecting language from audio...',
                progress: 25
            })

            const languageResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/language-detection/detect-language`, {
                method: 'POST',
                body: formData
            })

            if (!languageResponse.ok) {
                throw new Error('Language detection failed')
            }

            const languageData = await languageResponse.json()
            setDetectedLanguage(languageData.detected_language)

            // Debug: Log the detected language
            console.log('Language detection result:', languageData)

            // Map detected language to appropriate language code for transcription
            const getLanguageCode = (detectedLang: string): string => {
                const lang = detectedLang.toLowerCase()
                console.log('Processing detected language:', detectedLang, '-> lowercase:', lang)
                
                // Check for Hindi (English and Devanagari)
                if (lang.includes('hindi') || lang.includes('हिंदी')) {
                    console.log('Matched Hindi')
                    return 'hi-IN'
                }
                // Check for Marathi (English and Devanagari)
                if (lang.includes('marathi') || lang.includes('मराठी')) {
                    console.log('Matched Marathi')
                    return 'mr-IN'
                }
                // Check for Gujarati (English, Devanagari, and Gujarati script)
                if (lang.includes('gujarati') || lang.includes('ગુજરાતી') || lang.includes('गुजराती')) {
                    console.log('Matched Gujarati')
                    return 'gu-IN'
                }
                // Check for English (English and Devanagari)
                if (lang.includes('english') || lang.includes('अंग्रेजी')) {
                    console.log('Matched English')
                    return 'en-IN'
                }
                // Default to English if language not recognized
                console.log('No match found, defaulting to English')
                return 'en-IN'
            }

            // Step 3: Transcribe audio
            const languageCode = getLanguageCode(languageData.detected_language)
            
            // Debug: Log the final language code being sent
            console.log('Final language code being sent to transcription:', languageCode)
            console.log('Detected language from API:', languageData.detected_language)
            
            setProcessingStep({
                step: 'transcribing',
                message: `Transcribing audio to text in ${languageData.detected_language}...`,
                progress: 50
            })

            const transcribeFormData = new FormData()
            transcribeFormData.append('file', file)
            transcribeFormData.append('language_code', languageCode)
            
            // Debug: Log what's being sent in FormData
            console.log('FormData contents:')
            for (const [key, value] of transcribeFormData.entries()) {
                console.log(`${key}:`, value)
            }

            const transcribeResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/audio-translation/transcribe`, {
                method: 'POST',
                body: transcribeFormData
            })

            if (!transcribeResponse.ok) {
                throw new Error('Audio transcription failed')
            }

            const transcribeData = await transcribeResponse.json()
            setTranscribedText(transcribeData.transcript)

            // Step 4: Translate text
            setProcessingStep({
                step: 'translating',
                message: 'Translating text to multiple languages...',
                progress: 75
            })

            // Use actual translation service
            // Extract source language code for translation (e.g., 'mr' from 'mr-IN')
            const sourceLanguageCode = languageCode.split('-')[0]
            
            // Debug logging
            console.log('Language detection debug:', {
                detectedLanguage: languageData.detected_language,
                languageCode: languageCode,
                sourceLanguageCode: sourceLanguageCode
            })

            // Define target languages (exclude source language to avoid self-translation)
            const allTargetLanguages = ['en', 'hi', 'mr', 'gu']
            const targetLanguages = allTargetLanguages.filter(lang => lang !== sourceLanguageCode)

            // If source language is not in our supported list, default to English
            const finalSourceLanguage = allTargetLanguages.includes(sourceLanguageCode) ? sourceLanguageCode : 'en'
            
            // Debug logging for translation
            console.log('Translation debug:', {
                sourceLanguageCode,
                finalSourceLanguage,
                targetLanguages,
                allTargetLanguages
            })

            const translationResult = await translationService.translateText(
                transcribeData.transcript,
                finalSourceLanguage,
                targetLanguages,
                (progress) => {
                    setProcessingStep({
                        step: 'translating',
                        message: `Translating from ${finalSourceLanguage.toUpperCase()}... ${progress.message}`,
                        progress: 75 + (progress.progress * 0.15) // Scale to 75-90%
                    })
                }
            )

            if (!translationResult.success || !translationResult.translations) {
                throw new Error(translationResult.error || 'Translation failed')
            }

            // Debug: Log translation results
            console.log('Translation result:', translationResult)
            console.log('Translations object:', translationResult.translations)

            // Create translation results with actual translations
            const translationResults: TranslationResult[] = [
                {
                    language: 'English',
                    text: translationResult.translations.en || (finalSourceLanguage === 'en' ? transcribeData.transcript : ''),
                    icon: '',
                    color: 'bg-blue-100 border-blue-200 text-blue-800'
                },
                {
                    language: 'हिंदी',
                    text: translationResult.translations.hi || (finalSourceLanguage === 'hi' ? transcribeData.transcript : ''),
                    icon: '',
                    color: 'bg-orange-100 border-orange-200 text-orange-800'
                },
                {
                    language: 'मराठी',
                    text: translationResult.translations.mr || (finalSourceLanguage === 'mr' ? transcribeData.transcript : ''),
                    icon: '',
                    color: 'bg-green-100 border-green-200 text-green-800'
                },
                {
                    language: 'ગુજરાતી',
                    text: translationResult.translations.gu || (finalSourceLanguage === 'gu' ? transcribeData.transcript : ''),
                    icon: '',
                    color: 'bg-purple-100 border-purple-200 text-purple-800'
                }
            ]
            setTranslations(translationResults)

            // Step 5: Complete processing
            setProcessingStep({
                step: 'completed',
                message: 'Audio processing completed! Ready to generate ISL video.',
                progress: 100
            })

            toast.success('Audio processing completed successfully! You can now generate ISL video.')

        } catch (error) {
            console.error('Audio processing error:', error)
            setProcessingStep({
                step: 'error',
                message: 'Processing failed',
                progress: 0,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            })
            toast.error('Audio processing failed. Please try again.')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleRetry = () => {
        if (audioFile) {
            handleProcessAudio(audioFile)
        }
    }

    const handleCancel = () => {
        setIsProcessing(false)
        setShowProgressModal(false)
        setProcessingStep({
            step: 'uploading',
            message: '',
            progress: 0
        })
    }

    const handleClear = async () => {
        try {
            // Delete temporary audio file from server if it exists
            if (savedAudioFilePath) {
                const deleteResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/audio-upload/temp-audio/${savedAudioFilePath}`, {
                    method: 'DELETE'
                })

                if (deleteResponse.ok) {
                    console.log(`Deleted temporary audio file: ${savedAudioFilePath}`)
                } else {
                    console.warn(`Failed to delete temporary audio file: ${savedAudioFilePath}`)
                }
            }

            // Delete ISL video file from server if it exists
            if (islVideoPath) {
                // Note: This would need to be implemented when real ISL video generation is added
                // For now, we'll just log it
                console.log(`Would delete ISL video: ${islVideoPath}`)
            }

            // Clear all state
            setAudioFile(null)
            setAudioUrl(null)
            setSavedAudioFilePath(null)
            setDetectedLanguage('')
            setTranscribedText('')
            setTranslations([])
            setGeneratedVideoUrl(null)
            setIslVideoPath(null)
            setIsGeneratingISL(false)
            setProcessingStep({
                step: 'uploading',
                message: '',
                progress: 0
            })

            // Clean up audio URL
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl)
            }

            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }

            toast.success('All data cleared successfully!')
        } catch (error) {
            console.error('Error clearing data:', error)
            toast.error('Error clearing some data. Please try again.')
        }
    }

    const handlePlaybackSpeedChange = (speed: number) => {
        setPlaybackSpeed(speed)
    }

    const handleGenerateISL = async () => {
        if (!transcribedText.trim()) {
            toast.error('No transcribed text available. Please process an audio file first.')
            return
        }

        // Get English text from translations
        const englishTranslation = translations.find(t => t.language === 'English')
        const textForISL = englishTranslation?.text || transcribedText

        if (!textForISL.trim()) {
            toast.error('No English translation available for ISL video generation.')
            return
        }

        setIsGeneratingISL(true)

        try {
            console.log('Generating ISL video with text:', textForISL)
            console.log('Selected AI model:', selectedModel)

            // Use actual ISL video generation service
            const response = await islVideoGenerationService.generateVideo({
                text: textForISL,
                model: selectedModel,
                user_id: 1 // TODO: Use actual user ID from auth context
            })

            if (response.success && response.temp_video_id) {
                // Set the preview URL for the generated video
                const previewUrl = islVideoGenerationService.getPreviewVideoUrl(response.temp_video_id)
                setGeneratedVideoUrl(previewUrl)
                setIslVideoPath(response.temp_video_id)

                toast.success('ISL video generated successfully!')
            } else {
                throw new Error(response.error || 'Video generation failed')
            }
        } catch (error) {
            console.error('ISL video generation error:', error)
            toast.error('Failed to generate ISL video. Please try again.')
        } finally {
            setIsGeneratingISL(false)
        }
    }

    return (
        <div className="p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                        <Volume2 className="w-8 h-8 text-blue-600" />
                        Audio File to ISL
                    </h1>
                    <p className="text-gray-600">Upload an audio file to convert it to Indian Sign Language video</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Panel - Audio Upload and Processing */}
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center">
                            <Volume2 className="w-5 h-5 mr-2" />
                            Audio Upload & Processing
                        </h2>

                        {/* Audio Upload Area */}
                        <div className="mb-6">
                            <div
                                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                                onDrop={handleFileDrop}
                                onDragOver={handleDragOver}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="audio/wav,audio/x-wav,audio/wave,audio/mp3,audio/mpeg,audio/aiff,audio/aac,audio/ogg,audio/flac"
                                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                    className="hidden"
                                />

                                {audioFile ? (
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                                            <Volume2 className="w-8 h-8 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-medium text-gray-900">{audioFile.name}</p>
                                            <p className="text-sm text-gray-500">
                                                {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                                            </p>
                                            {detectedLanguage && (
                                                <p className="text-sm text-blue-600 font-medium mt-1">
                                                    Language: {detectedLanguage}
                                                </p>
                                            )}
                                        </div>
                                        {audioUrl && (
                                            <audio controls className="w-full max-w-md mx-auto">
                                                <source src={audioUrl} type={audioFile.type} />
                                                Your browser does not support the audio element.
                                            </audio>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                                            <Upload className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-medium text-gray-900">Drop audio file here</p>
                                            <p className="text-sm text-gray-500">or click to browse</p>
                                            <p className="text-xs text-gray-400 mt-2">
                                                Supports: WAV, MP3, AIFF, AAC, OGG, FLAC (Max 10MB)
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Processing Results */}

                        {transcribedText && (
                            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <h3 className="font-medium text-green-900 mb-2">Transcribed Text</h3>
                                <p className="text-green-800">{transcribedText}</p>
                            </div>
                        )}

                        {/* Translations */}
                        {translations.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="font-medium text-gray-900 mb-3">Translations</h3>
                                {translations.map((translation, index) => (
                                    <div key={index} className={`p-3 rounded-lg border ${translation.color}`}>
                                        <div className="mb-2">
                                            <span className="font-medium text-lg">{translation.language}</span>
                                        </div>
                                        <p className="text-sm">{translation.text}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Clear Button */}
                        {(audioFile || transcribedText || translations.length > 0) && (
                            <div className="mt-6">
                                <Button
                                    onClick={handleClear}
                                    variant="outline"
                                    className="w-full"
                                >
                                    Clear All
                                </Button>
                            </div>
                        )}
                    </Card>

                    {/* Right Panel - ISL Video Preview */}
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center">
                            <Play className="w-5 h-5 mr-2" />
                            ISL Video Preview
                        </h2>

                        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                            {generatedVideoUrl ? (
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
                                    <p className="text-sm">Upload an audio file to generate ISL video</p>
                                </div>
                            )}
                        </div>

                        {/* AI Avatar Model Selection */}
                        {transcribedText && (
                            <div className="mt-4">
                                <div className="flex items-center space-x-3">
                                    <label className="text-sm font-medium text-gray-700">
                                        AI Avatar Model:
                                    </label>
                                    <div className="flex space-x-1">
                                        <Button
                                            variant={selectedModel === 'male' ? 'default' : 'outline'}
                                            onClick={() => setSelectedModel('male')}
                                            disabled={isGeneratingISL || isProcessing}
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
                                            disabled={isGeneratingISL || isProcessing}
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

                        {/* Generate ISL Video Button */}
                        {transcribedText && (
                            <div className="mt-4">
                                <Button
                                    onClick={handleGenerateISL}
                                    disabled={!transcribedText.trim() || isGeneratingISL || isProcessing}
                                    className="w-full"
                                    variant="outline"
                                >
                                    <Volume2 className="w-4 h-4 mr-2" />
                                    {isGeneratingISL ? 'Generating ISL Video...' : 'Generate ISL Video'}
                                </Button>
                            </div>
                        )}

                        {/* Playback Speed Controls */}
                        {generatedVideoUrl && (
                            <div className="mt-4">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Playback Speed</h3>
                                <div className="flex space-x-2">
                                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                                        <Button
                                            key={speed}
                                            variant={playbackSpeed === speed ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => handlePlaybackSpeedChange(speed)}
                                            className={`text-xs ${playbackSpeed === speed
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
                    </Card>
                </div>
            </div>

            {/* Progress Modal */}
            {showProgressModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Processing Audio</h3>
                            {processingStep.step === 'error' && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancel}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            )}
                        </div>

                        <div className="space-y-4">
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${processingStep.progress}%` }}
                                ></div>
                            </div>

                            {/* Progress Text */}
                            <div className="text-center">
                                <p className="text-sm text-gray-600">{processingStep.message}</p>
                                <p className="text-xs text-gray-500 mt-1">{processingStep.progress}% complete</p>
                            </div>

                            {/* Error Display */}
                            {processingStep.step === 'error' && processingStep.error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="flex items-center mb-2">
                                        <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                                        <span className="text-sm font-medium text-red-800">Error</span>
                                    </div>
                                    <p className="text-sm text-red-700">{processingStep.error}</p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            {processingStep.step === 'error' && (
                                <div className="flex space-x-3">
                                    <Button
                                        onClick={handleRetry}
                                        className="flex-1"
                                        disabled={isProcessing}
                                    >
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Retry
                                    </Button>
                                    <Button
                                        onClick={handleCancel}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            )}

                            {/* Auto-close for completion */}
                            {processingStep.step === 'completed' && (
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="text-sm text-green-800 font-medium">Processing completed successfully!</p>
                                    <Button
                                        onClick={() => setShowProgressModal(false)}
                                        className="mt-3"
                                        size="sm"
                                    >
                                        Close
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AudioToISL
