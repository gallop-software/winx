'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'

export interface SidebarItem {
  id: string
  title: string
  componentId: string
  url?: string
  /** Whether to show title immediately or fade in on scroll. Default is false (hidden initially) */
  showTitleImmediately?: boolean
}

/** Function that loads content for a given componentId */
export type ContentLoader = (componentId: string) => Promise<ReactNode>

interface SidebarStackContextType {
  /** Array of open sidebars in order */
  stack: SidebarItem[]
  /** Push a new sidebar onto the stack, returns id */
  push: (item: Omit<SidebarItem, 'id'>) => string
  /** Close a specific sidebar by id */
  close: (id: string) => void
  /** Close all sidebars */
  closeAll: () => void
  /** Check if any sidebar is open */
  isOpen: boolean
  /** Content loader for async loading */
  contentLoader: ContentLoader | null
  /** Set the content loader */
  setContentLoader: (loader: ContentLoader) => void
  /** Cache of loaded content */
  contentCache: Map<string, ReactNode>
  /** Set cached content */
  setCachedContent: (componentId: string, content: ReactNode) => void
}

const SidebarStackContext = createContext<SidebarStackContextType | null>(null)

let idCounter = 0
function generateId(): string {
  return `sidebar-${++idCounter}`
}

interface SidebarStackProviderProps {
  children: ReactNode
  /** Optional content loader for async loading */
  contentLoader?: ContentLoader
}

export function SidebarStackProvider({
  children,
  contentLoader: initialLoader,
}: SidebarStackProviderProps) {
  const [stack, setStack] = useState<SidebarItem[]>([])
  const [contentLoader, setContentLoaderState] = useState<ContentLoader | null>(
    initialLoader ?? null
  )
  const contentCacheRef = useRef<Map<string, ReactNode>>(new Map())

  const push = useCallback((item: Omit<SidebarItem, 'id'>): string => {
    const id = generateId()
    const newItem: SidebarItem = { ...item, id }
    setStack((prev) => [...prev, newItem])
    return id
  }, [])

  const close = useCallback((id: string) => {
    setStack((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const closeAll = useCallback(() => {
    setStack([])
  }, [])

  const setContentLoader = useCallback((loader: ContentLoader) => {
    setContentLoaderState(() => loader)
  }, [])

  const setCachedContent = useCallback(
    (componentId: string, content: ReactNode) => {
      contentCacheRef.current.set(componentId, content)
    },
    []
  )

  const isOpen = stack.length > 0

  return (
    <SidebarStackContext.Provider
      value={{
        stack,
        push,
        close,
        closeAll,
        isOpen,
        contentLoader,
        setContentLoader,
        contentCache: contentCacheRef.current,
        setCachedContent,
      }}
    >
      {children}
    </SidebarStackContext.Provider>
  )
}

export function useSidebarStack(): SidebarStackContextType {
  const context = useContext(SidebarStackContext)
  if (!context) {
    throw new Error(
      'useSidebarStack must be used within a SidebarStackProvider'
    )
  }
  return context
}
