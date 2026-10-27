'use client'

import React, { Children, isValidElement, useState } from 'react'
import { DateTime } from 'luxon'
import clsx from 'clsx'
import { trackConversion } from '@/hooks/flow-trace'
import type { FtConversion } from '@/utils/flow-trace-types'

// Sub-components
import { FormInput } from './form-input'
import { FormTextArea } from './form-textarea'
import { FormUpload } from './form-upload'
import { FormRadioGroup } from './form-radio'
import { FormCheckboxGroup } from './form-checkbox'
import { FormName, FormFirstName, FormLastName } from './form-name'
import { FormButton, type FormButtonProps } from './form-button'
import { DatePickerInput } from './date-picker'
import { TimePickerInput } from './time-picker'

// ============================================================================
// Main Form Component
// ============================================================================

type FormProps = {
  classname?: string
  children: React.ReactNode
  gap?: string
  flexDirection?: string
  action?: string
  honeypot?: boolean
  // Called with the server's answer when it accepted the form.
  onSuccess?: (data: Record<string, unknown>) => void
  // Called with the server's answer when it refused the form. Its message is
  // shown either way; this is for a page that does something more about it.
  onFailure?: (data: Record<string, unknown>) => void
  // Whether the fields are emptied after success. Default true.
  resetOnSuccess?: boolean
}

// The forms whose success is a conversion FlowTrace reports
// (src/hooks/flow-trace.tsx), by the route they send to: the contact form,
// the newsletter forms, and the step that creates an account (choosing a
// password from the emailed link).
function conversionOf(
  api: string
): { type: FtConversion; label: string } | null {
  const path = api.split('?')[0]?.replace(/\/+$/, '') ?? ''
  if (path === '/api/submit-form')
    return { type: 'form', label: 'Contact form' }
  if (path === '/api/newsletter/subscribe')
    return { type: 'newsletter', label: 'Newsletter form' }
  if (path === '/api/account/confirm')
    return { type: 'signup', label: 'Account confirmed' }
  return null
}

function Form({
  classname,
  children,
  gap = 'gap-8',
  flexDirection = 'flex-col',
  action,
  honeypot = false,
  onSuccess,
  onFailure,
  resetOnSuccess = true,
}: FormProps) {
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [formStartTime] = useState(() => DateTime.now().toMillis())

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    const form = e.currentTarget
    const fd = new FormData(form)
    const obj: Record<string, any> = {}

    let submitMessage = ''

    const submitter = (e.nativeEvent as SubmitEvent)?.submitter as
      | HTMLButtonElement
      | HTMLInputElement
      | null

    const buttonMessage = submitter?.getAttribute?.('data-message') || null
    const hasButtonMessage = Boolean(buttonMessage)
    if (hasButtonMessage) submitMessage = buttonMessage as string

    const cssEscape = (s: string) =>
      typeof CSS !== 'undefined' && (CSS as any).escape
        ? (CSS as any).escape(s)
        : s.replace(/["\\]/g, '\\$&')

    const getFieldLabel = (domName: string) => {
      const nameSel = cssEscape(domName)
      const el = form.querySelector<HTMLElement>(`[name="${nameSel}"]`)
      return el?.getAttribute('data-label') || null
    }

    const getSubmitMessage = (domName: string) => {
      const nameSel = cssEscape(domName)
      const el = form.querySelector<HTMLElement>(`[name="${nameSel}"]`)
      return el?.getAttribute('data-message') || null
    }

    for (const [k, v] of fd) {
      const isArray = k.endsWith('[]')
      const key = isArray ? k.slice(0, -2) : k
      const val = v instanceof File ? v : String(v)

      const label = getFieldLabel(k)

      if (!hasButtonMessage) {
        const fieldMsg = getSubmitMessage(k)
        if (fieldMsg) submitMessage = fieldMsg
      }

      if (key === 'files') {
        if (!obj[key]) obj[key] = []
        if (val instanceof File && val.name) {
          let base64: string
          try {
            base64 = await fileToBase64(val)
          } catch {
            setIsLoading(false)
            setStatus(`The file ${val.name} could not be read.`)
            return
          }
          obj[key].push({
            name: val.name,
            type: val.type,
            size: val.size,
            base64,
            label,
          })
        }
        continue
      }

      if (isArray) {
        if (!obj[key]) obj[key] = { value: [], label }
        if (!Array.isArray(obj[key].value)) obj[key].value = []
        obj[key].value.push(val)
        if (!obj[key].label && label) obj[key].label = label
        continue
      }

      obj[key] = { value: val, label }
    }

    if (honeypot) {
      if (obj.website?.value) {
        setIsLoading(false)
        setStatus('Message did not send.')
        return
      }
      delete obj.website

      const submissionTime = DateTime.now().toMillis() - formStartTime
      if (submissionTime < 3000) {
        setIsLoading(false)
        setStatus('Message did not send.')
        return
      }
      obj._submissionTime = submissionTime
    }

    const api = action || '/api/submit-form/'
    let response: Response
    try {
      response = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obj),
      })
    } catch {
      // Offline, or the connection dropped: the button comes back.
      setIsLoading(false)
      setStatus(
        'The message could not be sent. Check your connection and try again.'
      )
      return
    }

    // A server that says something says it better than the button does.
    const answer: Record<string, unknown> | null = await response
      .json()
      .catch(() => null)
    const serverMessage =
      answer && typeof answer.message === 'string' ? answer.message : ''

    if (response.ok) {
      if (resetOnSuccess) {
        form.reset()
        form
          .querySelectorAll<HTMLInputElement>('input[type="file"]')
          .forEach((input) => {
            input.value = ''
          })
        form.dispatchEvent(new Event('form-cleared', { bubbles: true }))
      }
      if (serverMessage) submitMessage = serverMessage
      setIsLoading(false)
      setStatus(submitMessage)
      const conversion = conversionOf(api)
      if (conversion) trackConversion(conversion.type, conversion.label)
      onSuccess?.(answer ?? {})
      return
    }

    setIsLoading(false)
    setStatus(serverMessage || 'An error occurred.')
    onFailure?.(answer ?? {})
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className={clsx('flex', flexDirection, gap, classname)}
      >
        {honeypot && (
          <input
            type="text"
            name="website"
            className="!hidden"
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="off"
          />
        )}
        {Children.map(children, (child) => {
          if (
            isValidElement(child) &&
            (child.props as any)?.name === 'submit'
          ) {
            const btn = child as React.ReactElement<FormButtonProps>
            return React.cloneElement<FormButtonProps>(btn, { isLoading })
          }
          return child
        })}
      </form>
      {status && (
        <p className="text-center text-xs font-medium text-contrast-light mt-4">
          {status}
        </p>
      )}
    </>
  )
}

// Attach sub-components for compound component pattern
Form.Input = FormInput
Form.TextArea = FormTextArea
Form.File = FormUpload
Form.FormRadioGroup = FormRadioGroup
Form.FormCheckboxGroup = FormCheckboxGroup
Form.FormButton = FormButton
Form.FormName = FormName
Form.FormFirstName = FormFirstName
Form.FormLastName = FormLastName

// ============================================================================
// Exports
// ============================================================================

export {
  Form,
  FormInput,
  FormTextArea,
  FormUpload,
  FormRadioGroup,
  FormCheckboxGroup,
  FormButton,
  FormName,
  FormFirstName,
  FormLastName,
  DatePickerInput,
  TimePickerInput,
}
