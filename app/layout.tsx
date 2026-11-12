import './globals.css'
import type { Metadata } from 'next'
import { AuthProvider } from '@/components/auth/AuthContext'

export const metadata: Metadata = {
  title: 'CityByteHub - Internship Platform',
  description: 'Learn Data Analytics and Web Development',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-gray-50 text-gray-900">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}