import { useState, useCallback } from 'react'

const STORAGE_KEY = 'ekam-onboarding-complete'

export function useOnboarding() {
  const [isOpen, setIsOpen] = useState(() => {
    return !localStorage.getItem(STORAGE_KEY)
  })
  const [step, setStep] = useState(0)

  const totalSteps = 5

  const nextStep = useCallback(() => {
    if (step < totalSteps - 1) {
      setStep(s => s + 1)
    } else {
      completeOnboarding()
    }
  }, [step])

  const prevStep = useCallback(() => {
    if (step > 0) setStep(s => s - 1)
  }, [step])

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsOpen(false)
  }, [])

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setIsOpen(true)
    setStep(0)
  }, [])

  const goToStep = useCallback((s: number) => {
    if (s >= 0 && s < totalSteps) setStep(s)
  }, [])

  return {
    isOpen,
    step,
    totalSteps,
    nextStep,
    prevStep,
    completeOnboarding,
    resetOnboarding,
    goToStep,
  }
}
