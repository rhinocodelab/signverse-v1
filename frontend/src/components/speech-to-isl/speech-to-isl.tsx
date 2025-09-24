'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Play, Volume2, AlertCircle, RotateCcw, X, Mic, Square } from 'lucide-react'
import toast from 'react-hot-toast'
import { translationService } from '../../services/translation-service'
import { islVideoGenerationService } from '../../services/isl-video-generation-service'

interface AudioProcessingStep {
    step: 'recording' | 'saving' | 'detecting_language' | 'transcribing' | 'translating' | 'generating_isl' | 'completed' | 'error'
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

const SpeechToISL: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false)
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
    const [audioUrl, setAudioUrl] = useState<string | null>(null)
    const [tempAudioId, setTempAudioId] = useState<string | null>(null)
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
        step: 'recording',
        message: '',
        progress: 0
    })
    const [playbackSpeed, setPlaybackSpeed] = useState(1)
    const videoRef = useRef<HTMLVideoElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])

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

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000
                }
            })

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            })

            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data)
                }
            }

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                setAudioBlob(audioBlob)
                const url = URL.createObjectURL(audioBlob)
                setAudioUrl(url)

                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop())

                // Start processing automatically after blob is created
                handleProcessAudio(audioBlob)
            }

            mediaRecorder.start()
            setIsRecording(true)
            toast.success('Recording started!')

        } catch (error) {
            console.error('Error starting recording:', error)
            toast.error('Failed to start recording. Please check microphone permissions.')
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
            toast.success('Recording stopped!')
        }
    }

    const handleProcessAudio = async (blob: Blob) => {
        setIsProcessing(true)
        setShowProgressModal(true)

        try {
            // Step 1: Save audio to temp
            setProcessingStep({
                step: 'saving',
                message: 'Saving audio recording...',
                progress: 10
            })

            const formData = new FormData()
            formData.append('audio_blob', blob, 'recording.webm')

            const saveResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/speech-to-isl/save-temp`, {
                method: 'POST',
                body: formData
            })

            if (!saveResponse.ok) {
                throw new Error('Failed to save audio recording')
            }

            const saveData = await saveResponse.json()
            setTempAudioId(saveData.temp_audio_id)
            console.log(`Audio recording saved with ID: ${saveData.temp_audio_id}`)

            // Step 2: Detect language
            setProcessingStep({
                step: 'detecting_language',
                message: 'Detecting language from recording...',
                progress: 30
            })

            const languageResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/speech-to-isl/detect-language/${saveData.temp_audio_id}`, {
                method: 'POST'
            })

            if (!languageResponse.ok) {
                throw new Error('Language detection failed')
            }

            const languageData = await languageResponse.json()
            setDetectedLanguage(languageData.detected_language)

            // Map detected language to appropriate language code for transcription
            const getLanguageCode = (detectedLang: string): string => {
                const lang = detectedLang.toLowerCase()
                if (lang.includes('hindi') || lang.includes('हिंदी')) return 'hi-IN'
                if (lang.includes('marathi') || lang.includes('मराठी')) return 'mr-IN'
                if (lang.includes('gujarati') || lang.includes('ગુજરાતી')) return 'gu-IN'
                if (lang.includes('english') || lang.includes('अंग्रेजी')) return 'en-IN'
                // Default to English if language not recognized
                return 'en-IN'
            }

            // Step 3: Transcribe audio
            const languageCode = getLanguageCode(languageData.detected_language)
            setProcessingStep({
                step: 'transcribing',
                message: `Transcribing audio to text in ${languageData.detected_language}...`,
                progress: 50
            })

            const transcribeFormData = new FormData()
            transcribeFormData.append('language_code', languageCode)

            const transcribeResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/speech-to-isl/transcribe-speech-isl/${saveData.temp_audio_id}`, {
                method: 'POST',
                body: transcribeFormData
            })

            if (!transcribeResponse.ok) {
                throw new Error('Audio transcription failed')
            }

            const transcribeData = await transcribeResponse.json()
            setTranscribedText(transcribeData.transcription_result.transcript)

            // Step 4: Translate text
            setProcessingStep({
                step: 'translating',
                message: 'Translating text to multiple languages...',
                progress: 75
            })

            // Use actual translation service
            // Extract source language code for translation (e.g., 'mr' from 'mr-IN')
            const sourceLanguageCode = languageCode.split('-')[0]

            // Define target languages (exclude source language to avoid self-translation)
            const allTargetLanguages = ['en', 'hi', 'mr', 'gu']
            const targetLanguages = allTargetLanguages.filter(lang => lang !== sourceLanguageCode)

            // If source language is not in our supported list, default to English
            const finalSourceLanguage = allTargetLanguages.includes(sourceLanguageCode) ? sourceLanguageCode : 'en'

            const translationResult = await translationService.translateText(
                transcribeData.transcription_result.transcript,
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
                    text: translationResult.translations.en || (finalSourceLanguage === 'en' ? transcribeData.transcription_result.transcript : ''),
                    icon: '',
                    color: 'bg-blue-100 border-blue-200 text-blue-800'
                },
                {
                    language: 'हिंदी',
                    text: translationResult.translations.hi || (finalSourceLanguage === 'hi' ? transcribeData.transcription_result.transcript : ''),
                    icon: '',
                    color: 'bg-orange-100 border-orange-200 text-orange-800'
                },
                {
                    language: 'मराठी',
                    text: translationResult.translations.mr || (finalSourceLanguage === 'mr' ? transcribeData.transcription_result.transcript : ''),
                    icon: '',
                    color: 'bg-green-100 border-green-200 text-green-800'
                },
                {
                    language: 'ગુજરાતી',
                    text: translationResult.translations.gu || (finalSourceLanguage === 'gu' ? transcribeData.transcription_result.transcript : ''),
                    icon: '',
                    color: 'bg-purple-100 border-purple-200 text-purple-800'
                }
            ]
            setTranslations(translationResults)

            // Step 5: Complete processing
            setProcessingStep({
                step: 'completed',
                message: 'Speech processing completed! Ready to generate ISL video.',
                progress: 100
            })

            // Close progress modal after a short delay
            setTimeout(() => {
                setShowProgressModal(false)
                setIsProcessing(false)
            }, 1000)

            toast.success('Speech processing completed successfully! You can now generate ISL video.')

        } catch (error) {
            console.error('Speech processing error:', error)
            setProcessingStep({
                step: 'error',
                message: 'Processing failed',
                progress: 0,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            })
            toast.error('Speech processing failed. Please try again.')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleRetry = () => {
        if (audioBlob) {
            handleProcessAudio(audioBlob)
        }
    }

    const handleCancel = () => {
        setIsProcessing(false)
        setShowProgressModal(false)
        setProcessingStep({
            step: 'recording',
            message: '',
            progress: 0
        })
    }

    const handleClear = async () => {
        try {
            // Delete temporary audio file from server if it exists
            if (tempAudioId) {
                const deleteResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/speech-to-isl/cleanup/${tempAudioId}`, {
                    method: 'DELETE'
                })

                if (deleteResponse.ok) {
                    console.log(`Deleted temporary audio file: ${tempAudioId}`)
                } else {
                    console.warn(`Failed to delete temporary audio file: ${tempAudioId}`)
                }
            }

            // Delete ISL video file from server if it exists
            if (islVideoPath) {
                try {
                    const cleanupResult = await islVideoGenerationService.cleanupTempVideo(islVideoPath)
                    if (cleanupResult.success) {
                        console.log(`Deleted ISL video file: ${islVideoPath}`)
                    } else {
                        console.warn(`Failed to delete ISL video file: ${islVideoPath}`)
                    }
                } catch (error) {
                    console.error(`Error deleting ISL video file: ${error}`)
                }
            }

            // Clear all state
            setAudioBlob(null)
            setAudioUrl(null)
            setTempAudioId(null)
            setDetectedLanguage('')
            setTranscribedText('')
            setTranslations([])
            setGeneratedVideoUrl(null)
            setIslVideoPath(null)
            setIsGeneratingISL(false)
            setProcessingStep({
                step: 'recording',
                message: '',
                progress: 0
            })

            // Clean up audio URL
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl)
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
            toast.error('No transcribed text available. Please record and process speech first.')
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
                        <Mic className="w-8 h-8 text-blue-600" />
                        Speech to ISL
                    </h1>
                    <p className="text-gray-600">Record your speech to convert it to Indian Sign Language video</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Panel - Audio Recording and Processing */}
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center">
                            <Mic className="w-5 h-5 mr-2" />
                            Speech Recording
                        </h2>

                        {/* Audio Recording Area */}
                        <div className="mb-6">
                            <div
                                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
                            >
                                {audioBlob ? (
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                                            <Volume2 className="w-8 h-8 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-medium text-gray-900">Recording.wav</p>
                                            <p className="text-sm text-gray-500">
                                                {(audioBlob.size / (1024 * 1024)).toFixed(2)} MB
                                            </p>
                                            {detectedLanguage && (
                                                <p className="text-sm text-blue-600 font-medium mt-1">
                                                    Language: {detectedLanguage}
                                                </p>
                                            )}
                                        </div>
                                        {audioUrl && (
                                            <audio controls className="w-full max-w-md mx-auto">
                                                <source src={audioUrl} type="audio/webm" />
                                                Your browser does not support the audio element.
                                            </audio>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                                            <Mic className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-medium text-gray-900">Click to start recording</p>
                                            <p className="text-sm text-gray-500">or use the record button below</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recording Controls */}
                        <div className="flex justify-center space-x-4 mb-6">
                            {!isRecording ? (
                                <Button
                                    onClick={startRecording}
                                    disabled={isProcessing}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                    <Mic className="w-4 h-4 mr-2" />
                                    Start Recording
                                </Button>
                            ) : (
                                <Button
                                    onClick={stopRecording}
                                    className="bg-gray-600 hover:bg-gray-700 text-white"
                                >
                                    <Square className="w-4 h-4 mr-2" />
                                    Stop Recording
                                </Button>
                            )}
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
                        {(audioBlob || transcribedText || translations.length > 0) && (
                            <div className="mt-6">
                                <Button
                                    onClick={handleClear}
                                    variant="outline"
                                    className="w-full"
                                >
                                    <RotateCcw className="w-4 h-4 mr-2" />
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
                                    <p className="text-sm">Record speech and generate ISL video</p>
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

                        {/* Playback Speed Controls */}
                        {transcribedText && (
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

                    </Card>
                </div>
            </div>

            {/* Progress Modal */}
            {showProgressModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Processing Speech</h3>
                            <Button
                                onClick={handleCancel}
                                variant="ghost"
                                size="sm"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-gray-600 font-medium">{processingStep.message}</p>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${processingStep.progress}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">{processingStep.progress}%</p>
                            </div>

                            {processingStep.step === 'error' && (
                                <div className="text-center space-y-3">
                                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                                    <p className="text-red-600">{processingStep.error}</p>
                                    <div className="flex space-x-2">
                                        <Button onClick={handleRetry} variant="outline" size="sm">
                                            <RotateCcw className="w-4 h-4 mr-2" />
                                            Retry
                                        </Button>
                                        <Button onClick={handleCancel} variant="outline" size="sm">
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SpeechToISL
