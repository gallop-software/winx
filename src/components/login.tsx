'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Description,
} from '@headlessui/react'
import arrowPathIcon from '@iconify/icons-heroicons/arrow-path'
import { state, useSnapshot } from '@/state'
import { useLoggedIn } from '@/hooks/use-logged-in'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import { Icon } from '@/components/icon'

export default function LoginDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const snap = useSnapshot(state)

  useLoggedIn()

  const loginUser = async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      const response = await fetch('/api/is-logged-in/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const json = await response.json()

      if (response.ok && json?.user) {
        localStorage.setItem('wpToken', '1')
        state.isLoggedIn = true
        setIsOpen(false)
        setErrorMessage('')
        return
      }

      if (response.status === 429) {
        setErrorMessage('Too many attempts. Try again later.')
      } else {
        setErrorMessage('Login failed.')
      }
    } catch (error) {
      console.error('Login error', error)
      setErrorMessage('Login failed.')
    } finally {
      setIsLoading(false)
    }
  }

  if (snap.isLoggedIn) {
    return (
      <button
        onClick={() => {
          localStorage.removeItem('wpToken')
          state.isLoggedIn = false
        }}
        className="text-xs font-normal text-contrast cursor-pointer hover:text-contrast-light"
      >
        Log Out
      </button>
    )
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs font-normal text-contrast cursor-pointer hover:text-contrast-light"
      >
        Log In
      </button>
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="relative z-50"
      >
        <DialogPanel className="fixed inset-0 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-overlay/25"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative bg-body p-7 rounded-lg shadow-lg flex flex-col gap-4 w-full max-w-sm">
            <DialogTitle as="div">
              <Heading as="h3" margin="mb-0">
                Login
              </Heading>
            </DialogTitle>
            <Description as="div">
              <Paragraph margin="mb-0">
                Enter your username and password to log in.
              </Paragraph>
            </Description>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md bg-body2 px-3 py-2 text-xs text-contrast font-medium border border-contrast/40 outline-none transition placeholder:text-contrast/50 focus:border-contrast focus:ring-0"
              />
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loginUser()}
                className="w-full rounded-md bg-body2 px-3 py-2 text-xs text-contrast font-medium border border-contrast/40 outline-none transition placeholder:text-contrast/50 focus:border-contrast focus:ring-0"
              />
            </div>
            {errorMessage && (
              <Paragraph fontSize="text-xs" color="text-accent" margin="mb-0">
                {errorMessage}
              </Paragraph>
            )}
            <button
              onClick={loginUser}
              disabled={isLoading}
              className="w-full flex items-center justify-center text-center text-xs rounded-md py-2 px-4 bg-accent text-accent-contrast hover:bg-accent-light cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <span>Submit</span>
              {isLoading && (
                <Icon
                  icon={arrowPathIcon}
                  className="ml-2 h-5 w-5 animate-spin text-accent-contrast"
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
        </DialogPanel>
      </Dialog>
    </>
  )
}
