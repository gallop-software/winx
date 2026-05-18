import React from 'react'

// Helper function to generate a valid ID from children content
export function generateIdFromChildren(children: React.ReactNode): string {
  // Convert children to string
  const text = React.Children.toArray(children)
    .map((child) => {
      if (typeof child === 'string') return child
      if (typeof child === 'number') return String(child)
      return ''
    })
    .join(' ')
    .trim()

  // Generate slug-like ID: lowercase, replace spaces/special chars with hyphens
  return (
    text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '') || // Remove leading/trailing hyphens
    'heading'
  ) // Fallback if empty
}
