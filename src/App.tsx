import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router'
import { bootstrapSession } from '@/lib/api/client'

export default function App() {
  useEffect(() => {
    void bootstrapSession()
  }, [])

  return <RouterProvider router={router} />
}
