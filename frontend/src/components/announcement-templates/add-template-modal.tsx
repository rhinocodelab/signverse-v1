'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

interface AddTemplateModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

interface TranslationProgress {
    step: string
    message: string
    progress: number
}

export const AddTemplateModal: React.FC<AddTemplateModalProps> = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    const [category, setCategory] = useState('')
    const [englishText, setEnglishText] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showProgress, setShowProgress] = useState(false)
    const [translationProgress, setTranslationProgress] = useState<TranslationProgress>({
        step: 'creating_template',
        message: 'Creating template...',
        progress: 0
    })

    const categories = ['Arriving', 'Delay', 'Cancelled', 'Platform Change']

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!category || !englishText.trim()) {
            toast.error('Please fill in all required fields')
            return
        }

        setIsSubmitting(true)
        setShowProgress(true)

        try {
            // Step 1: Create template with English text
            setTranslationProgress({
                step: 'creating_template',
                message: 'Creating template...',
                progress: 10
            })

            const templateData = {
                template_category: category,
                template_text_english: englishText.trim()
            }

            const createResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/announcement-templates/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(templateData)
            })

            if (!createResponse.ok) {
                throw new Error('Failed to create template')
            }

            const createdTemplate = await createResponse.json()

            // Step 2: Translate to Hindi
            setTranslationProgress({
                step: 'translating_hindi',
                message: 'Translating to Hindi...',
                progress: 30
            })

            const hindiTranslation = await translateText(englishText.trim(), 'hi')

            // Step 3: Translate to Marathi
            setTranslationProgress({
                step: 'translating_marathi',
                message: 'Translating to Marathi...',
                progress: 60
            })

            const marathiTranslation = await translateText(englishText.trim(), 'mr')

            // Step 4: Translate to Gujarati
            setTranslationProgress({
                step: 'translating_gujarati',
                message: 'Translating to Gujarati...',
                progress: 80
            })

            const gujaratiTranslation = await translateText(englishText.trim(), 'gu')

            // Step 5: Update template with translations
            setTranslationProgress({
                step: 'saving_translations',
                message: 'Saving translations...',
                progress: 90
            })

            const updateData = {
                template_text_hindi: hindiTranslation,
                template_text_marathi: marathiTranslation,
                template_text_gujarati: gujaratiTranslation
            }

            const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/announcement-templates/${createdTemplate.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            })

            if (!updateResponse.ok) {
                throw new Error('Failed to save translations')
            }

            setTranslationProgress({
                step: 'completed',
                message: 'Template created successfully!',
                progress: 100
            })

            setTimeout(() => {
                setShowProgress(false)
                setIsSubmitting(false)
                onSuccess()
                toast.success('Template created successfully!')
            }, 1000)

        } catch (error) {
            console.error('Error creating template:', error)
            setTranslationProgress({
                step: 'error',
                message: 'Failed to create template. Please try again.',
                progress: 0
            })
            setTimeout(() => {
                setShowProgress(false)
                setIsSubmitting(false)
            }, 2000)
            toast.error('Failed to create template. Please try again.')
        }
    }

    const translateText = async (text: string, targetLanguage: string): Promise<string> => {
        try {
            console.log(`Translating to ${targetLanguage}:`, text)
            
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/translation/translate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    source_text: text,
                    source_language_code: "en",
                    target_language_codes: [targetLanguage]
                })
            })

            console.log(`Translation response status for ${targetLanguage}:`, response.status)

            if (!response.ok) {
                const errorText = await response.text()
                console.error(`Translation failed for ${targetLanguage}:`, response.status, errorText)
                throw new Error(`Translation failed for ${targetLanguage}: ${response.status} ${errorText}`)
            }

            const data = await response.json()
            console.log(`Translation result for ${targetLanguage}:`, data)
            
            const translatedText = data.translations[targetLanguage]?.translated_text || text
            console.log(`Final translated text for ${targetLanguage}:`, translatedText)
            
            return translatedText
        } catch (error) {
            console.error(`Translation error for ${targetLanguage}:`, error)
            return text // Return original text if translation fails
        }
    }

    const handleClose = () => {
        if (!isSubmitting) {
            setCategory('')
            setEnglishText('')
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <>
            {/* Main Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-transparent">
                <div className="bg-white p-6 max-w-2xl w-full mx-4 rounded-none shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            Add Announcement Template
                        </h2>
                        <Button
                            onClick={handleClose}
                            variant="outline"
                            size="sm"
                            disabled={isSubmitting}
                            className="rounded-none"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Category *
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                disabled={isSubmitting}
                                className="w-full px-3 py-2 border border-gray-300 rounded-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                required
                            >
                                <option value="">Select a category</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                English Template Text *
                            </label>
                            <textarea
                                value={englishText}
                                onChange={(e) => setEnglishText(e.target.value)}
                                disabled={isSubmitting}
                                placeholder="Enter the announcement template text in English. Use {placeholder} for dynamic values like {train_number}, {platform}, etc."
                                className="w-full px-3 py-2 border border-gray-300 rounded-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                                rows={6}
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Use curly braces for placeholders: {'{train_number}'}, {'{platform}'}, {'{start_station}'}, etc.
                            </p>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <Button
                                type="button"
                                onClick={handleClose}
                                variant="outline"
                                disabled={isSubmitting}
                                className="rounded-none"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || !category || !englishText.trim()}
                                className="rounded-none"
                                style={{ backgroundColor: 'oklch(50% 0.134 242.749)' }}
                            >
                                {isSubmitting ? 'Creating...' : 'Add Template'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Progress Modal */}
            {showProgress && (
                <div className="fixed inset-0 flex items-center justify-center z-60 bg-transparent">
                    <div className="bg-white p-6 max-w-md w-full mx-4 rounded-none border border-gray-200 shadow-2xl">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                                <FileText className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Creating Template
                            </h3>
                            <p className="text-gray-600 mb-4">
                                {translationProgress.message}
                            </p>
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${translationProgress.progress}%` }}
                                />
                            </div>
                            <p className="text-sm text-gray-500">
                                {translationProgress.progress}% Complete
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}