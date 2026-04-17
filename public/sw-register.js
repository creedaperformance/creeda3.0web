(() => {
  const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)

  if (!('serviceWorker' in navigator) || isLocalHost) {
    return
  }

  window.addEventListener(
    'load',
    () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => registration.update())
        .catch(() => {
          // Ignore registration issues to avoid noisy client logs in production.
        })
    },
    { once: true }
  )
})()
