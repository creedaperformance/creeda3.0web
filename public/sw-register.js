(() => {
  if (!('serviceWorker' in navigator)) return

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
