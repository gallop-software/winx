'use client'

import { useEffect, useRef, useState } from 'react'

// ============================================================================
// FormUpload Component
// ============================================================================

export type FormUploadProps = {
  id?: string
  name: string
  multiple?: boolean
  accept?: string
  required?: boolean
  className?: string
  maxFiles?: number
  label?: string
}

export function FormUpload({
  id,
  name,
  multiple = true,
  accept = '.pdf,.doc,.docx',
  required,
  className = '',
  maxFiles = 3,
  label = '',
}: FormUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)

  const keyOf = (f: File) => `${f.name}-${f.size}-${f.lastModified}`

  const syncInput = (list: File[]) => {
    const input = inputRef.current
    if (!input) return
    const dt = new DataTransfer()
    list.forEach((f) => dt.items.add(f))
    input.files = dt.files
  }

  const setWithLimit = (next: File[], addedCount = 0) => {
    const capped = next.slice(0, maxFiles)
    if (capped.length < next.length) setError(`Only ${maxFiles} files allowed.`)
    else if (addedCount) setError(null)
    setFiles(capped)
    syncInput(capped)
  }

  const addFiles = (incoming: FileList | File[]) => {
    const list = Array.from(incoming)
    const map = new Map(files.map((f) => [keyOf(f), f]))
    list.forEach((f) => map.set(keyOf(f), f))
    setWithLimit(Array.from(map.values()), list.length)
  }

  const removeAt = (i: number) => {
    const next = files.filter((_, idx) => idx !== i)
    setError(null)
    setFiles(next)
    syncInput(next)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    if (inputRef.current) inputRef.current.value = ''
  }

  const prevent = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    prevent(e)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  // Clear files when form is reset
  useEffect(() => {
    const formElement = inputRef.current?.form
    if (!formElement) return

    const handleFormCleared = () => {
      setFiles([])
      setError(null)
      if (inputRef.current) inputRef.current.value = ''
    }

    formElement.addEventListener('form-cleared', handleFormCleared)
    return () =>
      formElement.removeEventListener('form-cleared', handleFormCleared)
  }, [])

  // Sync files to FormData
  useEffect(() => {
    const input = inputRef.current
    const form = input?.form
    if (!form || !input) return

    const onFormData = (ev: Event) => {
      const fd = (ev as any).formData as FormData
      const fieldName = input.name
      fd.delete(fieldName)
      files.forEach((f) => fd.append(fieldName, f))
    }

    form.addEventListener('formdata', onFormData as EventListener)
    return () =>
      form.removeEventListener('formdata', onFormData as EventListener)
  }, [files])

  const atLimit = files.length >= maxFiles

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={prevent}
      onDragEnter={prevent}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-accent2 hover:bg-accent2/5 transition-colors text-center ${className}`}
      aria-label="File uploader"
      role="button"
      tabIndex={0}
      onKeyDown={(e) =>
        (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()
      }
    >
      <input
        ref={inputRef}
        id={id ?? name}
        name={`${name}[]`}
        type="file"
        multiple={multiple}
        accept={accept}
        required={required && files.length === 0}
        onChange={handleChange}
        data-label={label}
        className="hidden"
      />

      <p className="text-contrast text-sm font-medium">
        <span className="font-semibold">
          {atLimit ? 'File limit reached' : 'Click to upload'}
        </span>
        {!atLimit && ' or drag and drop'}
      </p>
      <p className="text-xs font-medium text-contrast/70 mt-1">
        You can upload up to {maxFiles} {maxFiles === 1 ? 'file' : 'files'}
      </p>
      <p className="text-xs font-medium text-contrast/50 mt-1">
        PDF, DOC, DOCX files accepted
      </p>

      {error && (
        <p className="mt-3 text-xs font-medium text-red-500">{error}</p>
      )}

      {files.length > 0 && (
        <div className="mt-4 w-full text-left">
          <p className="text-xs font-semibold text-accent2">Uploaded Files:</p>
          <ul className="mt-2 space-y-2 text-xs text-contrast">
            {files.map((file, i) => (
              <li
                key={keyOf(file)}
                className="flex items-center justify-between gap-3"
              >
                <span
                  className="truncate font-medium"
                  title={file.name}
                >
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeAt(i)
                  }}
                  className="shrink-0 rounded-md px-2 py-1 outline outline-1 outline-accent2/50 hover:outline-accent2 hover:bg-accent2/10 transition"
                  aria-label={`Remove ${file.name}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs font-medium text-contrast/60">
            {files.length}/{maxFiles} selected
          </p>
        </div>
      )}
    </div>
  )
}
