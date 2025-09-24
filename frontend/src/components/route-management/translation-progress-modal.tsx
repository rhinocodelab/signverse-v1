'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { X, RotateCcw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { TranslationProgress } from '@/services/route-translation-service'

interface TranslationProgressModalProps {
    isOpen: boolean
    progress: TranslationProgress
    onClose: () => void
    onRetry: () => void
    canRetry: boolean
}

export const TranslationProgressModal: React.FC<TranslationProgressModalProps> = ({
    isOpen,
    progress,
    onClose,
    onRetry,
    canRetry
}) => {
    if (!isOpen) return null

    const getStepIcon = () => {
        switch (progress.step) {
            case 'completed':
                return <CheckCircle className="w-6 h-6 text-green-600" />
            case 'error':
                return <AlertCircle className="w-6 h-6 text-red-600" />
            default:
                return <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        }
    }

    const getStepColor = () => {
        switch (progress.step) {
            case 'completed':
                return 'text-green-600'
            case 'error':
                return 'text-red-600'
            default:
                return 'text-blue-600'
        }
    }

    const getProgressBarColor = () => {
        switch (progress.step) {
            case 'completed':
                return 'bg-green-600'
            case 'error':
                return 'bg-red-600'
            default:
                return 'bg-blue-600'
        }
    }

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-white p-6 w-full max-w-md mx-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Creating Route with Translations
                    </h2>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onClose}
                        className="p-2"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Progress Section */}
                <div className="space-y-4">
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
                            style={{ width: `${progress.progress}%` }}
                        ></div>
                    </div>

                    {/* Progress Percentage */}
                    <div className="text-center">
                        <span className="text-2xl font-bold text-gray-900">
                            {progress.progress}%
                        </span>
                    </div>

                    {/* Current Step */}
                    <div className="flex items-center space-x-3">
                        {getStepIcon()}
                        <span className={`font-medium ${getStepColor()}`}>
                            {progress.message}
                        </span>
                    </div>

                    {/* Error Message */}
                    {progress.step === 'error' && progress.error && (
                        <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                            <p className="text-red-800 text-sm">
                                {progress.error}
                            </p>
                        </div>
                    )}

                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 mt-6">
                    {progress.step === 'error' && canRetry && (
                        <Button
                            onClick={onRetry}
                            className="flex items-center space-x-2"
                            style={{ backgroundColor: 'oklch(50% 0.134 242.749)' }}
                        >
                            <RotateCcw className="w-4 h-4" />
                            <span>Retry</span>
                        </Button>
                    )}

                    {(progress.step === 'completed' || progress.step === 'error') && (
                        <Button
                            onClick={onClose}
                            variant="outline"
                            className="flex-1"
                        >
                            {progress.step === 'completed' ? 'Done' : 'Close'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
