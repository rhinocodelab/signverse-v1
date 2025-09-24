'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CreateAnnouncement } from './create-announcement'
import { 
    Plus, 
    Search, 
    Edit, 
    Trash2, 
    Play, 
    RefreshCw,
    Megaphone
} from 'lucide-react'

interface GeneralAnnouncement {
    id: number
    announcement_name: string
    category: string
    model: 'male' | 'female'
    final_video_path?: string
    final_video_url?: string
    preview_url?: string
    announcement_text_english: string
    announcement_text_hindi?: string
    announcement_text_gujarati?: string
    announcement_text_marathi?: string
    is_active: boolean
    is_saved: boolean
    created_at: string
    updated_at: string
}

interface AnnouncementStatistics {
    total_announcements: number
    active_announcements: number
    inactive_announcements: number
    announcements_by_category: Record<string, number>
    announcements_by_model: Record<string, number>
}

export const GeneralAnnouncementISL: React.FC = () => {
    const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit'>('list')
    const [announcements, setAnnouncements] = useState<GeneralAnnouncement[]>([])
    const [statistics, setStatistics] = useState<AnnouncementStatistics | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [selectedModel, setSelectedModel] = useState<string>('all')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [limit] = useState(10)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<GeneralAnnouncement | null>(null)
    const [showVideoModal, setShowVideoModal] = useState(false)
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Fetch announcements
    const fetchAnnouncements = useCallback(async () => {
        setIsLoading(true)
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: limit.toString()
            })

                    if (searchTerm) params.append('search', searchTerm)
                    if (selectedCategory !== 'all') params.append('category', selectedCategory)
                    if (selectedModel !== 'all') params.append('model', selectedModel)

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/isl-announcements/?${params}`)
            if (response.ok) {
                const data = await response.json()
                setAnnouncements(data.announcements)
                setTotalCount(data.total_count)
            }
        } catch (error) {
            console.error('Failed to fetch announcements:', error)
        } finally {
            setIsLoading(false)
        }
    }, [currentPage, limit, searchTerm, selectedCategory, selectedModel])

    // Fetch statistics
    const fetchStatistics = useCallback(async (forceRefresh = false) => {
        try {
            const url = forceRefresh 
                ? `${process.env.NEXT_PUBLIC_API_URL}/isl-announcements/statistics/overview?t=${Date.now()}`
                : `${process.env.NEXT_PUBLIC_API_URL}/isl-announcements/statistics/overview`
            const response = await fetch(url)
            if (response.ok) {
                const data = await response.json()
                setStatistics(data)
            } else {
                console.error('Failed to fetch statistics:', response.status, response.statusText)
            }
        } catch (error) {
            console.error('Error fetching statistics:', error)
        }
    }, [])

    // Fetch categories
    const [categories, setCategories] = useState<string[]>([])
    const fetchCategories = useCallback(async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/isl-announcements/categories/list`)
            if (response.ok) {
                const data = await response.json()
                setCategories(data.categories)
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error)
        }
    }, [])

    useEffect(() => {
        fetchAnnouncements()
        fetchStatistics(true)
        fetchCategories()
    }, [fetchAnnouncements, fetchStatistics, fetchCategories])

    const handleDelete = async (announcement: GeneralAnnouncement) => {
        setIsDeleting(true)
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/isl-announcements/${announcement.id}`, {
                method: 'DELETE'
            })
            
            if (response.ok) {
                // Refresh the data
                await fetchAnnouncements()
                await fetchStatistics(true)
                setShowDeleteModal(false)
                setSelectedAnnouncement(null)
            } else {
                console.error('Failed to delete announcement:', response.status, response.statusText)
            }
        } catch (error) {
            console.error('Failed to delete announcement:', error)
        } finally {
            setIsDeleting(false)
        }
    }

    const handlePlayVideo = (announcementId: number) => {
        const videoUrl = `${process.env.NEXT_PUBLIC_API_URL}/isl-announcements/${announcementId}/video/stream`
        setSelectedVideo(videoUrl)
        setShowVideoModal(true)
    }


    const getModelBadgeColor = (model: string) => {
        return model === 'male' 
            ? 'bg-blue-100 text-blue-800 border-blue-200' 
            : 'bg-pink-100 text-pink-800 border-pink-200'
    }


    const totalPages = Math.ceil(totalCount / limit)

    // Handle navigation
    const handleBackToList = () => {
        setCurrentView('list')
        fetchAnnouncements()
        fetchStatistics(true)
    }

    // Render different views
    if (currentView === 'create') {
        return <CreateAnnouncement onBack={handleBackToList} />
    }

    return (
        <div className="p-6">
            <div className="max-w-7xl mx-auto">
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <Megaphone className="w-8 h-8 text-blue-600" />
                                General Announcement ISL
                            </h1>
                            <p className="text-gray-600 mt-1">Manage and view all general announcements with ISL videos</p>
                        </div>
                <Button 
                    onClick={() => setCurrentView('create')}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Announcement
                </Button>
            </div>

            {/* Statistics Summary */}
            {statistics && (
                <div className="mb-6">
                    <p className="text-gray-600">
                        <span className="font-semibold text-gray-900">Total:</span> {statistics.total_announcements} |
                        <span className="font-semibold text-blue-600 ml-2">Male Model:</span> {statistics.announcements_by_model.male || 0} |
                        <span className="font-semibold text-pink-600 ml-2">Female Model:</span> {statistics.announcements_by_model.female || 0}
                    </p>
                </div>
            )}


            {/* Announcements Table */}
            <Card className="overflow-hidden rounded-none">
                {/* Search and Filters */}
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search announcements..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Category Filter */}
                        <div className="lg:w-48">
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">All Categories</option>
                                {categories.map((category) => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                        </div>

                        {/* Model Filter */}
                        <div className="lg:w-32">
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">All Models</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        </div>


                        {/* Refresh Button */}
                        <Button
                            onClick={fetchAnnouncements}
                            variant="outline"
                            className="lg:w-auto"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Announcement
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Category
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Model
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
                                            <span className="text-gray-600">Loading announcements...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : announcements.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center">
                                        <div className="text-gray-500">
                                            <Megaphone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                            <p className="text-lg font-medium">No announcements found</p>
                                            <p className="text-sm">Create your first announcement to get started</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                announcements.map((announcement) => (
                                    <tr key={announcement.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {announcement.announcement_name}
                                                </div>
                                                <div 
                                                    className="text-sm text-gray-500 truncate max-w-xs cursor-help"
                                                    title={announcement.announcement_text_english}
                                                >
                                                    {announcement.announcement_text_english}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-none text-xs font-medium bg-gray-100 text-gray-800">
                                                {announcement.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-none text-xs font-medium border ${getModelBadgeColor(announcement.model)}`}>
                                                {announcement.model}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-2">
                                                {(announcement.final_video_path || announcement.preview_url) && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handlePlayVideo(announcement.id)}
                                                        className="p-1"
                                                        title="Play ISL Video"
                                                    >
                                                        <Play className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        // TODO: Implement edit functionality
                                                        console.log('Edit functionality not yet implemented')
                                                    }}
                                                    className="p-1"
                                                    disabled
                                                    title="Edit Announcement"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedAnnouncement(announcement)
                                                        setShowDeleteModal(true)
                                                    }}
                                                    className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    title="Delete Announcement"
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

            {/* Video Modal */}
            {showVideoModal && selectedVideo && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-transparent">
                    <div className="bg-white p-6 max-w-4xl w-full mx-4 rounded-lg shadow-2xl border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">ISL Video</h3>
                            <Button
                                onClick={() => {
                                    setShowVideoModal(false)
                                    setSelectedVideo(null)
                                }}
                                variant="outline"
                            >
                                Close
                            </Button>
                        </div>
                        <video
                            src={selectedVideo}
                            controls
                            className="w-full h-auto rounded-lg"
                            autoPlay
                        >
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedAnnouncement && (
                <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-transparent" onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setShowDeleteModal(false)
                        setSelectedAnnouncement(null)
                    }
                }}>
                    <div className="bg-white p-6 max-w-md w-full mx-4 shadow-2xl rounded-lg border border-gray-200">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                <Trash2 className="h-6 w-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Announcement</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Are you sure you want to delete &quot;{selectedAnnouncement.announcement_name}&quot;? This action cannot be undone.
                            </p>
                            <div className="flex space-x-3">
                                <Button
                                    onClick={() => {
                                        setShowDeleteModal(false)
                                        setSelectedAnnouncement(null)
                                    }}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => handleDelete(selectedAnnouncement!)}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        'Delete'
                                    )}
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