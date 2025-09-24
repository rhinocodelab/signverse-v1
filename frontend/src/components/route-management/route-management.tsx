'use client'

import { useState, useEffect, useCallback } from 'react'
import { trainRouteService, TrainRoute, CreateTrainRouteRequest, UpdateTrainRouteRequest } from '@/services/train-route-service'
import { trainRouteTranslationService, TrainRouteTranslation } from '@/services/train-route-translation-service'
import { routeTranslationService, TranslationProgress } from '@/services/route-translation-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Edit, Trash2, Search, ChevronLeft, ChevronRight, X, Languages } from 'lucide-react'
import { TranslationProgressModal } from './translation-progress-modal'
import toast from 'react-hot-toast'

export const RouteManagement: React.FC = () => {
    const [trainRoutes, setTrainRoutes] = useState<TrainRoute[]>([])
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(0)
    const [searchTerm, setSearchTerm] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showTranslationModal, setShowTranslationModal] = useState(false)
    const [editingRoute, setEditingRoute] = useState<TrainRoute | null>(null)
    const [deletingRoute, setDeletingRoute] = useState<TrainRoute | null>(null)
    const [viewingRoute, setViewingRoute] = useState<TrainRoute | null>(null)
    const [routeTranslation, setRouteTranslation] = useState<TrainRouteTranslation | null>(null)
    const [translationLoading, setTranslationLoading] = useState(false)
    const [showTranslationProgress, setShowTranslationProgress] = useState(false)
    const [translationProgress, setTranslationProgress] = useState<TranslationProgress>({
        step: 'creating_route',
        message: 'Initializing...',
        progress: 0
    })
    const [pendingRouteData, setPendingRouteData] = useState<CreateTrainRouteRequest | null>(null)
    const [formData, setFormData] = useState<CreateTrainRouteRequest>({
        train_number: '',
        train_name: '',
        from_station_name: '',
        from_station_code: '',
        to_station_name: '',
        to_station_code: ''
    })

    const recordsPerPage = 10

    const loadTrainRoutes = useCallback(async () => {
        try {
            setLoading(true)
            const data = await trainRouteService.getTrainRoutes(
                currentPage,
                recordsPerPage,
                searchTerm || undefined
            )
            setTrainRoutes(data)
        } catch {
            toast.error('Failed to load train routes')
        } finally {
            setLoading(false)
        }
    }, [currentPage, recordsPerPage, searchTerm])

    useEffect(() => {
        loadTrainRoutes()
    }, [loadTrainRoutes])

    const handleCreateRoute = async (e: React.FormEvent) => {
        e.preventDefault()

        // Store the form data and start translation process
        setPendingRouteData(formData)
        setShowCreateModal(false)
        setShowTranslationProgress(true)

        // Reset progress
        setTranslationProgress({
            step: 'creating_route',
            message: 'Initializing...',
            progress: 0
        })

        // Start the translation process
        const result = await routeTranslationService.createRouteWithTranslations(
            formData,
            (progress) => {
                setTranslationProgress(progress)
            }
        )

        if (result.success) {
            toast.success('Train route with translations created successfully!')
            resetForm()
            loadTrainRoutes()
        } else {
            toast.error(result.error || 'Failed to create train route with translations')
        }
    }

    const handleUpdateRoute = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingRoute) return

        try {
            const updateData: UpdateTrainRouteRequest = {
                train_name: formData.train_name,
                from_station_name: formData.from_station_name,
                from_station_code: formData.from_station_code,
                to_station_name: formData.to_station_name,
                to_station_code: formData.to_station_code
            }
            await trainRouteService.updateTrainRoute(editingRoute.id, updateData)
            toast.success('Train route updated successfully!')
            setShowEditModal(false)
            setEditingRoute(null)
            resetForm()
            loadTrainRoutes()
        } catch {
            toast.error('Failed to update train route')
        }
    }

    const handleDeleteRoute = (route: TrainRoute) => {
        setDeletingRoute(route)
        setShowDeleteModal(true)
    }

    const confirmDeleteRoute = async () => {
        if (!deletingRoute) return

        try {
            await trainRouteService.deleteTrainRoute(deletingRoute.id)
            toast.success('Train route deleted successfully!')
            setShowDeleteModal(false)
            setDeletingRoute(null)
            loadTrainRoutes()
        } catch {
            toast.error('Failed to delete train route')
        }
    }

    const cancelDelete = () => {
        setShowDeleteModal(false)
        setDeletingRoute(null)
    }

    const handleEditRoute = (route: TrainRoute) => {
        setEditingRoute(route)
        setFormData({
            train_number: route.train_number,
            train_name: route.train_name,
            from_station_name: route.from_station_name,
            from_station_code: route.from_station_code,
            to_station_name: route.to_station_name,
            to_station_code: route.to_station_code
        })
        setShowEditModal(true)
    }

    const resetForm = () => {
        setFormData({
            train_number: '',
            train_name: '',
            from_station_name: '',
            from_station_code: '',
            to_station_name: '',
            to_station_code: ''
        })
        setEditingRoute(null)
    }

    const handleViewTranslation = async (route: TrainRoute) => {
        setTranslationLoading(true)

        try {
            const translation = await trainRouteTranslationService.getTranslationByTrainRoute(route.id)
            // If translation found, open modal
            setRouteTranslation(translation)
            setViewingRoute(route)
            setShowTranslationModal(true)
        } catch {
            // If no translation found, show toast message only
            toast.error('Translation not available')
        } finally {
            setTranslationLoading(false)
        }
    }

    const handleRetryTranslation = async () => {
        if (!pendingRouteData) return

        // Reset progress
        setTranslationProgress({
            step: 'creating_route',
            message: 'Retrying...',
            progress: 0
        })

        // Retry the translation process
        const result = await routeTranslationService.createRouteWithTranslations(
            pendingRouteData,
            (progress) => {
                setTranslationProgress(progress)
            }
        )

        if (result.success) {
            toast.success('Train route with translations created successfully!')
            resetForm()
            loadTrainRoutes()
            setShowTranslationProgress(false)
            setPendingRouteData(null)
        } else {
            toast.error(result.error || 'Failed to create train route with translations')
        }
    }

    const handleCloseTranslationProgress = () => {
        setShowTranslationProgress(false)
        setPendingRouteData(null)
        setTranslationProgress({
            step: 'creating_route',
            message: 'Initializing...',
            progress: 0
        })
    }

    const handleCancel = () => {
        setShowCreateModal(false)
        setShowEditModal(false)
        setShowDeleteModal(false)
        setShowTranslationModal(false)
        setShowTranslationProgress(false)
        setEditingRoute(null)
        setDeletingRoute(null)
        setViewingRoute(null)
        setRouteTranslation(null)
        setPendingRouteData(null)
        resetForm()
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setCurrentPage(0)
        loadTrainRoutes()
    }

    const handlePreviousPage = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1)
        }
    }

    const handleNextPage = () => {
        setCurrentPage(currentPage + 1)
    }

    return (
        <div className="p-6">
            <div className="max-w-7xl mx-auto">
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-gray-900">Route Management</h1>
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            className="text-white"
                            style={{ backgroundColor: 'oklch(50% 0.134 242.749)' }}
                        >
                            Add Route
                        </Button>
                    </div>


            {/* Search and Train Routes Table */}
            <Card className="overflow-hidden">
                {/* Search Form */}
                <div className="p-4 border-b border-gray-200">
                    <form onSubmit={handleSearch} className="flex items-center space-x-4">
                        <div className="flex-1">
                            <Input
                                type="text"
                                placeholder="Search by train number..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <Button type="submit" variant="outline" className="flex items-center space-x-2">
                            <Search className="w-4 h-4" />
                            <span>Search</span>
                        </Button>
                    </form>
                </div>

                {/* Train Routes Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Train Number
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Train Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    From Station
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    To Station
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                            <span className="ml-2">Loading...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : trainRoutes.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                        No train routes found
                                    </td>
                                </tr>
                            ) : (
                                trainRoutes.map((route) => (
                                    <tr key={route.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {route.train_number}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {route.train_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <div>
                                                <div className="font-medium">{route.from_station_name}</div>
                                                <div className="text-gray-500">({route.from_station_code})</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <div>
                                                <div className="font-medium">{route.to_station_name}</div>
                                                <div className="text-gray-500">({route.to_station_code})</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewTranslation(route)}
                                                    className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    title="View Translations"
                                                >
                                                    <Languages className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEditRoute(route)}
                                                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    title="Edit Route"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDeleteRoute(route)}
                                                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    title="Delete Route"
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
                <div className="bg-gray-50 px-6 py-3 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                        Page {currentPage + 1} • {recordsPerPage} records per page
                    </div>
                    <div className="flex space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePreviousPage}
                            disabled={currentPage === 0}
                            className="flex items-center space-x-1"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span>Previous</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleNextPage}
                            disabled={trainRoutes.length < recordsPerPage}
                            className="flex items-center space-x-1"
                        >
                            <span>Next</span>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Edit Modal */}
            {showEditModal && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-50"
                    onClick={handleCancel}
                >
                    <div
                        className="bg-white p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Edit Train Route
                            </h2>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancel}
                                className="p-2"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <form onSubmit={handleUpdateRoute} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Train Number (5 digits)
                                    </label>
                                    <Input
                                        type="text"
                                        value={formData.train_number}
                                        placeholder="12345"
                                        maxLength={5}
                                        disabled
                                        className="bg-gray-100"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Train number cannot be changed</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Train Name
                                    </label>
                                    <Input
                                        type="text"
                                        value={formData.train_name}
                                        onChange={(e) => setFormData({ ...formData, train_name: e.target.value })}
                                        placeholder="Express Train"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        From Station Name
                                    </label>
                                    <Input
                                        type="text"
                                        value={formData.from_station_name}
                                        onChange={(e) => setFormData({ ...formData, from_station_name: e.target.value })}
                                        placeholder="Mumbai Central"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        From Station Code
                                    </label>
                                    <Input
                                        type="text"
                                        value={formData.from_station_code}
                                        onChange={(e) => setFormData({ ...formData, from_station_code: e.target.value })}
                                        placeholder="BCT"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        To Station Name
                                    </label>
                                    <Input
                                        type="text"
                                        value={formData.to_station_name}
                                        onChange={(e) => setFormData({ ...formData, to_station_name: e.target.value })}
                                        placeholder="Delhi"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        To Station Code
                                    </label>
                                    <Input
                                        type="text"
                                        value={formData.to_station_code}
                                        onChange={(e) => setFormData({ ...formData, to_station_code: e.target.value })}
                                        placeholder="DLI"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex space-x-4 pt-4">
                                <Button
                                    type="submit"
                                    className="text-white"
                                    style={{ backgroundColor: 'oklch(50% 0.134 242.749)' }}
                                >
                                    Update Route
                                </Button>
                                <Button type="button" variant="outline" onClick={handleCancel}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-50"
                    onClick={handleCancel}
                >
                    <div
                        className="bg-white p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Add New Train Route
                            </h2>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancel}
                                className="p-2"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <form onSubmit={handleCreateRoute} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Train Number (5 digits)
                                    </label>
                                    <Input
                                        type="text"
                                        value={formData.train_number}
                                        onChange={(e) => setFormData({ ...formData, train_number: e.target.value })}
                                        placeholder="12345"
                                        maxLength={5}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Train Name
                                    </label>
                                    <Input
                                        type="text"
                                        value={formData.train_name}
                                        onChange={(e) => setFormData({ ...formData, train_name: e.target.value })}
                                        placeholder="Express Train"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        From Station Name
                                    </label>
                                    <Input
                                        type="text"
                                        value={formData.from_station_name}
                                        onChange={(e) => setFormData({ ...formData, from_station_name: e.target.value })}
                                        placeholder="Mumbai Central"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        From Station Code
                                    </label>
                                    <Input
                                        type="text"
                                        value={formData.from_station_code}
                                        onChange={(e) => setFormData({ ...formData, from_station_code: e.target.value })}
                                        placeholder="BCT"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        To Station Name
                                    </label>
                                    <Input
                                        type="text"
                                        value={formData.to_station_name}
                                        onChange={(e) => setFormData({ ...formData, to_station_name: e.target.value })}
                                        placeholder="Delhi"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        To Station Code
                                    </label>
                                    <Input
                                        type="text"
                                        value={formData.to_station_code}
                                        onChange={(e) => setFormData({ ...formData, to_station_code: e.target.value })}
                                        placeholder="DLI"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex space-x-4 pt-4">
                                <Button
                                    type="submit"
                                    className="text-white"
                                    style={{ backgroundColor: 'oklch(50% 0.134 242.749)' }}
                                >
                                    Create Route
                                </Button>
                                <Button type="button" variant="outline" onClick={handleCancel}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && deletingRoute && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-50"
                    onClick={cancelDelete}
                >
                    <div
                        className="bg-white p-6 w-full max-w-md mx-4 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Confirm Delete
                            </h2>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={cancelDelete}
                                className="p-2"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="mb-6">
                            <p className="text-gray-600 mb-4">
                                Are you sure you want to delete this train route?
                            </p>
                            <div className="bg-gray-50 p-4 border border-gray-200">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="font-medium text-gray-700">Train Number:</span>
                                        <span className="text-gray-900">{deletingRoute.train_number}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium text-gray-700">Train Name:</span>
                                        <span className="text-gray-900">{deletingRoute.train_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium text-gray-700">Route:</span>
                                        <span className="text-gray-900">
                                            {deletingRoute.from_station_name} → {deletingRoute.to_station_name}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex space-x-4">
                            <Button
                                onClick={confirmDeleteRoute}
                                className="text-white bg-red-600 hover:bg-red-700"
                            >
                                Delete Route
                            </Button>
                            <Button type="button" variant="outline" onClick={cancelDelete}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Translation View Modal */}
            {showTranslationModal && viewingRoute && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-50"
                    onClick={handleCancel}
                >
                    <div
                        className="bg-white p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Train Route Translations - {viewingRoute.train_number}
                            </h2>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancel}
                                className="p-2"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        {translationLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className="ml-2">Loading translations...</span>
                            </div>
                        ) : routeTranslation ? (
                            <div className="space-y-6">
                                {/* Route Information */}
                                <div className="bg-gray-50 p-4 border border-gray-200">
                                    <h3 className="text-lg font-medium text-gray-900 mb-3">Route Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <span className="font-medium text-gray-700">Train Number:</span>
                                            <span className="ml-2 text-gray-900">{viewingRoute.train_number}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-700">Route:</span>
                                            <span className="ml-2 text-gray-900">
                                                {viewingRoute.from_station_name} ({viewingRoute.from_station_code}) → {viewingRoute.to_station_name} ({viewingRoute.to_station_code})
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Translations Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full border border-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                                                    Language
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                                                    Train Name
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                                                    From Station
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                                                    To Station
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {/* Hindi */}
                                            <tr>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <span className="w-6 h-6 bg-orange-100 text-orange-800 rounded-full flex items-center justify-center text-sm font-bold mr-2">हि</span>
                                                        <span className="text-sm font-medium text-gray-900">हिन्दी</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {routeTranslation.train_name_hi}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {routeTranslation.from_station_name_hi}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {routeTranslation.to_station_name_hi}
                                                </td>
                                            </tr>
                                            {/* Marathi */}
                                            <tr>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <span className="w-6 h-6 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-sm font-bold mr-2">म</span>
                                                        <span className="text-sm font-medium text-gray-900">मराठी</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {routeTranslation.train_name_mr}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {routeTranslation.from_station_name_mr}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {routeTranslation.to_station_name_mr}
                                                </td>
                                            </tr>
                                            {/* Gujarati */}
                                            <tr>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <span className="w-6 h-6 bg-purple-100 text-purple-800 rounded-full flex items-center justify-center text-sm font-bold mr-2">ગ</span>
                                                        <span className="text-sm font-medium text-gray-900">ગુજરાતી</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {routeTranslation.train_name_gu}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {routeTranslation.from_station_name_gu}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {routeTranslation.to_station_name_gu}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Languages className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Translations Available</h3>
                                <p className="text-gray-600">
                                    This train route doesn&apos;t have any translations yet.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Translation Progress Modal */}
            <TranslationProgressModal
                isOpen={showTranslationProgress}
                progress={translationProgress}
                onClose={handleCloseTranslationProgress}
                onRetry={handleRetryTranslation}
                canRetry={translationProgress.step === 'error' && !!pendingRouteData}
            />
                </div>
            </div>
        </div>
    )
}
