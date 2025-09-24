'use client'

import { RouteManagement } from '@/components/route-management/route-management'
import { TextToISL } from '@/components/text-to-isl/text-to-isl'
import AudioToISL from '@/components/audio-to-isl/audio-to-isl'
import SpeechToISL from '@/components/speech-to-isl/speech-to-isl'
import { ISLDictionary } from '@/components/isl-dictionary/isl-dictionary'
import { GeneralAnnouncementISL } from '@/components/general-announcement-isl/general-announcement-isl'
import { AnnouncementTemplates } from '@/components/announcement-templates/announcement-templates'
import { Dashboard } from '@/components/dashboard/dashboard'
import { LiveAnnouncements } from '@/components/live-announcements/live-announcements'

interface ContentAreaProps {
    activeMenu: string
}

export const ContentArea: React.FC<ContentAreaProps> = ({ activeMenu }) => {
    const renderContent = () => {
        switch (activeMenu) {
            case 'dashboard':
            case 'dashboard-main':
                return <Dashboard />

            case 'live-announcements':
                return <LiveAnnouncements />

            case 'route-management':
                return <RouteManagement />

            case 'text-to-isl':
                return <TextToISL />

            case 'audio-file-to-isl':
                return <AudioToISL />

            case 'speech-to-isl':
                return <SpeechToISL />

            case 'isl-dictionary':
                return <ISLDictionary />

            case 'general-announcement-isl':
                return <GeneralAnnouncementISL />

            case 'announcement-templates':
                return <AnnouncementTemplates />


            default:
                return (
                    <div className="text-center py-12">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
                        <p className="text-gray-600">The requested page could not be found.</p>
                    </div>
                )
        }
    }

    return (
        <div className="p-6 bg-gray-50">
            {renderContent()}
        </div>
    )
}
