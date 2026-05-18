'use client'

import { useEffect } from 'react'

// ----------------------------------------------------------------------

const IframeHeight = () => {
  useEffect(() => {
    // Only run if inside an iframe
    if (window.self === window.top) {
      return
    }

    const sendHeight = () => {
      const height = document.body.scrollHeight
      window.parent.postMessage(
        {
          type: 'height',
          value: height,
        },
        '*'
      )
    }

    // Send initial height
    sendHeight()

    // Watch for resizes
    const resizeObserver = new ResizeObserver(() => {
      sendHeight()
    })

    resizeObserver.observe(document.body)

    // Listen for height requests from parent
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'requestHeight') sendHeight()
    })

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  return null
}

export default IframeHeight
