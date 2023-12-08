import { useState } from 'react'
import { Outlet, useLoaderData, useNavigate } from 'react-router-dom'
import { suspend } from 'suspend-react'

import { DownloadStatus } from '@/components/downloads/download-status'
import { Setup } from '@/components/setup'
import { StatusBar } from '@/components/status-bar'
import { Titlebar } from '@/components/titlebar'
import { useHistoryManager } from '@/providers/history/manager'
import { DEFAULT_MODEL, useModelManager } from '@/providers/models/manager'

import { Sidebar } from './components/sidebar'

export function App() {
  const modelManager = useModelManager()
  const historyManager = useHistoryManager()

  const navigate = useNavigate()

  const { needsSetup } = useLoaderData() as { needsSetup: boolean }

  const [needsLocalModels, setNeedsLocalModels] = useState(needsSetup)

  suspend(async () => {
    await modelManager.loadAvailableModels()
  }, [modelManager])

  return (
    <>
      {needsLocalModels ? (
        <div className="fixed z-[100] flex h-screen w-screen items-center justify-center bg-background/60 p-8 backdrop-blur-lg">
          <Setup
            onComplete={() => {
              const thread = historyManager.addThread({
                createdAt: new Date(),
                messages: [],
                modelID: DEFAULT_MODEL,
                systemPrompt: 'You are a helpful AI assistant.',
                temperature: 0.5,
                topP: 0.3,
                title: 'New Thread',
              })
              setNeedsLocalModels(false)
              navigate(`/chats/${thread.id}`)
            }}
          />
        </div>
      ) : null}
      <div className="h-screen w-screen overflow-hidden">
        <div className="grid h-full grid-rows-[auto,24px]">
          <div className="grid min-h-full grid-cols-[min-content,_minmax(0,_1fr)]">
            <Sidebar />

            <div className="grid h-full w-full grid-rows-[36px,_minmax(0,_1fr)]">
              <Titlebar />

              <Outlet />
            </div>
          </div>

          <StatusBar />

          <DownloadStatus />
        </div>
      </div>
    </>
  )
}

export default App
