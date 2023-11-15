import { type Model } from '@/providers/models/model-list'

import { ModelSwitcher } from './model-switcher'

export function Header({ models }: { models: Model[] }) {
  return (
    <div className="sticky top-0 z-50 flex h-16 w-full items-center border-b bg-background/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <ModelSwitcher models={models} />
    </div>
  )
}
