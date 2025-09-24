'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
    Plus, 
    Search, 
    Edit, 
    Trash2, 
    RefreshCw,
    FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import { AddTemplateModal } from './add-template-modal'

interface AnnouncementTemplate {
    id: number
    template_category: string
    template_text_english: string
    template_text_hindi?: string
    template_text_marathi?: string
    template_text_gujarati?: string
    created_at: string
    updated_at: string
}


export const AnnouncementTemplates: React.FC = () => {
    const [templates, setTemplates] = useState<AnnouncementTemplate[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [limit] = useState(10)
    const [showAddModal, setShowAddModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState<AnnouncementTemplate | null>(null)
    const [showTranslationModal, setShowTranslationModal] = useState(false)
    const [selectedLanguage, setSelectedLanguage] = useState<string>('')
    const [translationText, setTranslationText] = useState<string>('')

    const categories = ['Arriving', 'Delay', 'Cancelled', 'Platform Change']

    // Fetch templates
    const fetchTemplates = useCallback(async () => {
        setIsLoading(true)
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: limit.toString()
            })

            if (searchTerm) params.append('search', searchTerm)
            if (selectedCategory !== 'all') params.append('template_category', selectedCategory)

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/announcement-templates/?${params}`)
            if (response.ok) {
                const data = await response.json()
                console.log('Fetched templates data:', data)
                setTemplates(data.templates)
                setTotalCount(data.total_count)
            } else {
                console.error('Failed to fetch templates:', response.status, response.statusText)
            }
        } catch (error) {
            console.error('Failed to fetch templates:', error)
        } finally {
            setIsLoading(false)
        }
    }, [currentPage, limit, searchTerm, selectedCategory])

    // Fetch categories
    const fetchCategories = useCallback(async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/announcement-templates/categories/list`)
            if (response.ok) {
                // Categories are already defined in the component
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error)
        }
    }, [])

    useEffect(() => {
        fetchTemplates()
        fetchCategories()
    }, [fetchTemplates, fetchCategories])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setCurrentPage(1)
        fetchTemplates()
    }

    const handleDeleteTemplate = async () => {
        if (!selectedTemplate) return

        try {
            console.log('Deleting template with ID:', selectedTemplate.id)
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/announcement-templates/${selectedTemplate.id}`, {
                method: 'DELETE'
            })

            console.log('Delete response status:', response.status)
            const responseData = await response.text()
            console.log('Delete response data:', responseData)

            if (response.ok) {
                // Close modal first
                setShowDeleteModal(false)
                setSelectedTemplate(null)
                
                // Add a small delay to ensure backend processing is complete
                setTimeout(() => {
                    console.log('Refreshing templates after delete...')
                    fetchTemplates()
                }, 100)
                
                toast.success('Template deleted successfully!')
            } else {
                toast.error('Failed to delete template. Please try again.')
            }
        } catch (error) {
            console.error('Failed to delete template:', error)
            toast.error('Failed to delete template. Please try again.')
        }
    }

    const handleViewTranslation = (template: AnnouncementTemplate, language: string) => {
        let text = ''
        switch (language) {
            case 'hindi':
                text = template.template_text_hindi || 'No translation available'
                break
            case 'marathi':
                text = template.template_text_marathi || 'No translation available'
                break
            case 'gujarati':
                text = template.template_text_gujarati || 'No translation available'
                break
        }
        
        setSelectedTemplate(template)
        setSelectedLanguage(language)
        setTranslationText(text)
        setShowTranslationModal(true)
    }

    const getCategoryBadgeColor = (category: string) => {
        const colors: Record<string, string> = {
            'Arriving': 'bg-green-100 text-green-800 border-green-200',
            'Delay': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'Cancelled': 'bg-red-100 text-red-800 border-red-200',
            'Platform Change': 'bg-blue-100 text-blue-800 border-blue-200'
        }
        return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200'
    }

    const totalPages = Math.ceil(totalCount / limit)

    return (
        <div className="p-6">
            <div className="max-w-7xl mx-auto">
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <FileText className="w-8 h-8 text-blue-600" />
                            Announcement Templates
                        </h1>
                        <Button
                            onClick={() => setShowAddModal(true)}
                            className="text-white"
                            style={{ backgroundColor: 'oklch(50% 0.134 242.749)' }}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Template
                        </Button>
                    </div>


                    {/* Search and Templates Table */}
                    <Card className="overflow-hidden">
                        {/* Search Form */}
                        <div className="p-4 border-b border-gray-200">
                            <form onSubmit={handleSearch} className="flex items-center space-x-4">
                                <div className="flex-1">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Search templates..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                >
                                    <option value="all">All Categories</option>
                                    {categories.map((category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>
                                <Button type="submit" variant="outline" className="rounded-none">
                                    Search
                                </Button>
                            </form>
                        </div>

                        {/* Templates Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Template
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Category
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Translations
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center">
                                                <div className="flex items-center justify-center">
                                                    <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                                                    <span className="text-gray-600">Loading templates...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : templates.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center">
                                                <div className="text-gray-500">
                                                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                                    <p className="text-lg font-medium">No templates found</p>
                                                    <p className="text-sm">Create your first template to get started</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        templates.map((template) => (
                                            <tr key={template.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {template.template_text_english}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-none text-xs font-medium border ${getCategoryBadgeColor(template.template_category)}`}>
                                                        {template.template_category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center space-x-1">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleViewTranslation(template, 'hindi')}
                                                            className="px-2 py-1 text-xs bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 rounded-none"
                                                            title="View Hindi Translation"
                                                        >
                                                            हिंदी
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleViewTranslation(template, 'marathi')}
                                                            className="px-2 py-1 text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 rounded-none"
                                                            title="View Marathi Translation"
                                                        >
                                                            मराठी
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleViewTranslation(template, 'gujarati')}
                                                            className="px-2 py-1 text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100 rounded-none"
                                                            title="View Gujarati Translation"
                                                        >
                                                            ગુજરાતી
                                                        </Button>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center space-x-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                // TODO: Implement edit functionality
                                                                console.log('Edit functionality not yet implemented')
                                                            }}
                                                            className="p-1"
                                                            disabled
                                                            title="Edit Template"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedTemplate(template)
                                                                setShowDeleteModal(true)
                                                            }}
                                                            className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            title="Delete Template"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                                <div className="flex-1 flex justify-between sm:hidden">
                                    <Button
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        variant="outline"
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        variant="outline"
                                    >
                                        Next
                                    </Button>
                                </div>
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Showing{' '}
                                            <span className="font-medium">{(currentPage - 1) * limit + 1}</span>
                                            {' '}to{' '}
                                            <span className="font-medium">
                                                {Math.min(currentPage * limit, totalCount)}
                                            </span>
                                            {' '}of{' '}
                                            <span className="font-medium">{totalCount}</span>
                                            {' '}results
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="relative z-0 inline-flex rounded-none shadow-sm -space-x-px">
                                            <Button
                                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                                disabled={currentPage === 1}
                                                variant="outline"
                                                className="rounded-none"
                                            >
                                                Previous
                                            </Button>
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                const page = i + 1
                                                return (
                                                    <Button
                                                        key={page}
                                                        onClick={() => setCurrentPage(page)}
                                                        variant={currentPage === page ? "default" : "outline"}
                                                        className="rounded-none"
                                                    >
                                                        {page}
                                                    </Button>
                                                )
                                            })}
                                            <Button
                                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                                disabled={currentPage === totalPages}
                                                variant="outline"
                                                className="rounded-none"
                                            >
                                                Next
                                            </Button>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Add Template Modal */}
            {showAddModal && (
                <AddTemplateModal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false)
                        fetchTemplates()
                    }}
                />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedTemplate && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-transparent">
                    <div className="bg-white p-6 max-w-md w-full mx-4 rounded-none shadow-2xl">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Template</h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete this template? This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <Button
                                onClick={() => {
                                    setShowDeleteModal(false)
                                    setSelectedTemplate(null)
                                }}
                                variant="outline"
                                className="rounded-none"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDeleteTemplate}
                                className="bg-red-600 hover:bg-red-700 text-white rounded-none"
                            >
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Translation View Modal */}
            {showTranslationModal && selectedTemplate && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-transparent">
                    <div className="bg-white p-6 max-w-2xl w-full mx-4 rounded-none shadow-2xl">
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                {selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1)} Translation
                            </h3>
                            
                            <div className="bg-blue-50 p-4 rounded-none border text-sm text-gray-800 min-h-[120px]">
                                {translationText}
                            </div>
                        </div>
                        
                        <div className="flex justify-end">
                            <Button
                                onClick={() => {
                                    setShowTranslationModal(false)
                                    setSelectedTemplate(null)
                                    setSelectedLanguage('')
                                    setTranslationText('')
                                }}
                                variant="outline"
                                className="rounded-none"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}