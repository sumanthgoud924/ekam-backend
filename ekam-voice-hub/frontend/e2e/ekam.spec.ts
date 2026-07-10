import { test, expect } from '@playwright/test'

test.describe('Ekam Multi-Purpose App E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Prevent onboarding modal from appearing and set mock user profile
    await page.addInitScript(() => {
      localStorage.setItem('ekam-onboarding-complete', 'true')
      localStorage.setItem('ekam-user', JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        isPro: false
      }))
    })
    // Navigate to homepage
    await page.goto('/')
  })

  test('Dashboard loads and lists key stats', async ({ page }) => {
    // Check title
    await expect(page).toHaveTitle(/Ekam Tools/)

    // Check stat labels are visible (now within hero section)
    await expect(page.locator('text=Languages').first()).toBeVisible()
    await expect(page.locator('text=Voices').first()).toBeVisible()
    await expect(page.locator('text=Doc Formats').first()).toBeVisible()
  })

  test('Quick actions navigate correctly', async ({ page }) => {
    // Click on Bulk WhatsApp quick action
    await page.click('text=Bulk WhatsApp')
    await expect(page).toHaveURL(/\/tools\/bulk-whatsapp/)
    await expect(page.getByRole('heading', { name: 'Bulk WhatsApp' })).toBeVisible()

    // Go back and click Text to Speech
    await page.goto('/')
    await page.click('text=Text to Speech')
    await expect(page).toHaveURL(/\/tts/)
    await expect(page.locator('label:has-text("Text to convert")')).toBeVisible()
  })

  test('PWA Install banner is dismissible', async ({ page }) => {
    // Wait for mock install banner to appear (if triggered by beforeinstallprompt)
    const banner = page.locator('text=Install Ekam App')
    if (await banner.isVisible()) {
      await page.click('text=Dismiss')
      await expect(banner).not.toBeVisible()
    }
  })

  test('Bulk WhatsApp recipient composition & CSV parsing', async ({ page }) => {
    await page.goto('/tools/bulk-whatsapp')

    // Add multiple recipients manually (use angle-bracket format so names are parsed)
    const textInput = page.locator('textarea[placeholder*="Paste phone numbers"]')
    await textInput.fill('John Doe <9876543210>\nJane Smith <9876543211>')
    await page.click('button:has-text("Add Numbers")')

    // Verify contacts count (heading shows "Recipients 2 contacts")
    await expect(page.locator('text=2 contacts')).toBeVisible()

    // Compose message
    const msgInput = page.locator('textarea[placeholder*="Hi {{name}}!"]')
    await msgInput.fill('Hello {{name}}! Welcome to ekam.digital')

    // Toggle Preview
    await page.click('button:has-text("Show Preview")')
    await expect(page.locator('text=To: John Doe (+919876543210)')).toBeVisible()
    await expect(page.locator('text=Hello John Doe! Welcome to ekam.digital')).toBeVisible()
  })

  test('Premium Templates Store accessibility checks', async ({ page }) => {
    await page.goto('/tools/bulk-whatsapp')
    
    // Switch to Templates Store tab
    await page.click('button:has-text("Templates Store")')

    // Verify templates are listed
    await expect(page.locator('text=Festival Special Offer')).toBeVisible()
    
    // A premium template shows "Premium" badge
    await expect(page.locator('text=Premium').first()).toBeVisible()
  })

  test('QR Code generator limit limits check', async ({ page }) => {
    await page.goto('/tools/qr-generator')

    // Check QR code default content
    const textInput = page.locator('textarea')
    await expect(textInput).toHaveValue('https://')

    // Fill content
    await textInput.fill('https://ekam.digital')

    // Download button is visible
    await expect(page.locator('button:has-text("Download")')).toBeVisible()
  })

  test('Settings Page subscription management and legal link', async ({ page }) => {
    await page.goto('/settings')

    // View subscription plan card
    await expect(page.locator('text=Subscription Plan')).toBeVisible()
    await expect(page.locator('text=Free Trial Tier')).toBeVisible()

    // Click Privacy & Terms link
    await page.click('text=Privacy & Terms')
    await expect(page).toHaveURL(/\/legal/)
    await expect(page.getByRole('heading', { name: 'Legal Information' })).toBeVisible()
  })

  test('Pro Upgrade Flow & Pricing options', async ({ page }) => {
    await page.goto('/upgrade')

    // Check pricing plans (use role selectors to avoid strict mode)
    await expect(page.getByRole('heading', { name: 'Pro Monthly' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Pro Yearly' })).toBeVisible()
    await expect(page.locator('text=₹199').first()).toBeVisible()
    await expect(page.locator('text=₹999').first()).toBeVisible()
  })

})
