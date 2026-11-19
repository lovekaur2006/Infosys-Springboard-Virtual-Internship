import { useEffect, useState } from "react"
import App from "./App"
import LandingPage from "./components/LandingPage"

const inApp = () => window.location.hash === "#app"

export default function Root() {
  const [showApp, setShowApp] = useState(inApp)

  useEffect(() => {
    const onHash = () => {
      const next = inApp()
      setShowApp((prev) => {
        if (prev !== next) window.scrollTo(0, 0)
        return next
      })
    }
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])

  return showApp ? <App /> : <LandingPage />
}
