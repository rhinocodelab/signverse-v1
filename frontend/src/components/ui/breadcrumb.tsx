'use client'

import React from 'react'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
    label: string
    href?: string
    onClick?: () => void
}

interface BreadcrumbProps {
    items: BreadcrumbItem[]
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
    return (
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
            <Home className="w-4 h-4" />
            {items.map((item, index) => (
                <React.Fragment key={index}>
                    <ChevronRight className="w-4 h-4" />
                    {item.href || item.onClick ? (
                        <button
                            onClick={item.onClick}
                            className="hover:text-gray-700 transition-colors"
                        >
                            {item.label}
                        </button>
                    ) : (
                        <span className="text-gray-900 font-medium">{item.label}</span>
                    )}
                </React.Fragment>
            ))}
        </nav>
    )
}