'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { DashboardHeader } from './dashboard-header'
import { ContentArea } from './content-area'

export const DashboardLayout: React.FC = () => {
    const [activeMenu, setActiveMenu] = useState('dashboard-main')

    const handleMenuChange = (menuId: string) => {
        setActiveMenu(menuId)
    }

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <Sidebar
                activeMenu={activeMenu}
                onMenuChange={handleMenuChange}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <DashboardHeader />

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    <ContentArea activeMenu={activeMenu} />
                </div>
            </div>
        </div>
    )
}
