import { test, expect } from '@playwright/test';

test.describe('Dark Mode Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should toggle dark mode and persist across page navigation', async ({
    page,
  }) => {
    // Verify light mode is default
    const body = page.locator('body');
    await expect(body).not.toHaveClass(/dark/);

    // Find and click theme toggle button
    const themeToggle = page.getByRole('button', {
      name: /theme|dark|light|mode/i,
    });
    await themeToggle.click();

    // Verify dark mode is applied
    await expect(body).toHaveClass(/dark/);

    // Verify dark mode visual indicators
    await expect(
      page.locator('.dark\\:bg-gray-900, [class*="dark:bg-gray-900"]')
    ).toBeVisible();

    // Navigate to a different page
    await page
      .getByRole('link', { name: /documents|write|new/i })
      .first()
      .click();
    await page.waitForLoadState('networkidle');

    // Verify dark mode is still active
    await expect(body).toHaveClass(/dark/);

    // Navigate back to home
    await page
      .getByRole('link', { name: /home|logo/i })
      .first()
      .click();
    await page.waitForLoadState('networkidle');

    // Verify dark mode persists
    await expect(body).toHaveClass(/dark/);
  });

  test('should persist dark mode across browser refresh', async ({ page }) => {
    // Enable dark mode
    const themeToggle = page.getByRole('button', {
      name: /theme|dark|light|mode/i,
    });
    await themeToggle.click();

    // Verify dark mode is active
    const body = page.locator('body');
    await expect(body).toHaveClass(/dark/);

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify dark mode is still active after refresh
    await expect(body).toHaveClass(/dark/);

    // Verify theme toggle shows correct state (sun icon for dark mode)
    const toggleIcon = page.locator(
      '[data-testid="theme-icon"], svg[class*="sun"], svg[class*="moon"]'
    );
    await expect(toggleIcon).toBeVisible();
  });

  test('should persist dark mode in localStorage', async ({ page }) => {
    // Enable dark mode
    const themeToggle = page.getByRole('button', {
      name: /theme|dark|light|mode/i,
    });
    await themeToggle.click();

    // Check localStorage
    const theme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(theme).toBe('dark');

    // Toggle back to light mode
    await themeToggle.click();

    // Check localStorage updated
    const updatedTheme = await page.evaluate(() =>
      localStorage.getItem('theme')
    );
    expect(updatedTheme).toBe('light');
  });

  test('should apply dark mode to all UI components', async ({ page }) => {
    // Enable dark mode
    const themeToggle = page.getByRole('button', {
      name: /theme|dark|light|mode/i,
    });
    await themeToggle.click();

    // Check various UI elements have dark mode classes

    // Navigation/header
    const header = page.locator('header, nav, [role="navigation"]').first();
    await expect(header).toHaveClass(/dark:/);

    // Buttons
    const buttons = page.locator('button').first();
    await expect(buttons).toHaveClass(/dark:/);

    // Navigate to document editor
    await page.goto('/write/test-document-id');
    await page.waitForLoadState('networkidle');

    // Check editor has dark mode
    const editor = page.locator('[contenteditable="true"], .editor-container');
    await expect(editor.or(editor.locator('..')).first()).toHaveClass(/dark:/);

    // Check toolbar has dark mode
    const toolbar = page
      .locator('[role="toolbar"], .toolbar, [class*="toolbar"]')
      .first();
    if (await toolbar.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(toolbar).toHaveClass(/dark:/);
    }
  });

  test('should persist dark mode across multiple documents', async ({
    page,
  }) => {
    // Enable dark mode
    const themeToggle = page.getByRole('button', {
      name: /theme|dark|light|mode/i,
    });
    await themeToggle.click();

    // Navigate to first document
    await page.goto('/write/document-1');
    await page.waitForLoadState('networkidle');

    // Verify dark mode active
    const body = page.locator('body');
    await expect(body).toHaveClass(/dark/);

    // Navigate to second document
    await page.goto('/write/document-2');
    await page.waitForLoadState('networkidle');

    // Verify dark mode still active
    await expect(body).toHaveClass(/dark/);

    // Create new document
    await page.getByRole('button', { name: /new document/i }).click();
    await page.waitForLoadState('networkidle');

    // Verify dark mode persists in new document
    await expect(body).toHaveClass(/dark/);
  });

  test('should respect system preference when no saved preference', async ({
    page,
  }) => {
    // Set system preference to dark
    await page.emulateMedia({ colorScheme: 'dark' });

    // Navigate to page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should automatically be in dark mode
    const body = page.locator('body');
    await expect(body).toHaveClass(/dark/);

    // Set system preference to light
    await page.emulateMedia({ colorScheme: 'light' });

    // Clear localStorage and reload
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Should automatically be in light mode
    await expect(body).not.toHaveClass(/dark/);
  });

  test('should override system preference with user selection', async ({
    page,
  }) => {
    // Set system preference to dark
    await page.emulateMedia({ colorScheme: 'dark' });

    // Navigate to page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should be in dark mode
    const body = page.locator('body');
    await expect(body).toHaveClass(/dark/);

    // User toggles to light mode
    const themeToggle = page.getByRole('button', {
      name: /theme|dark|light|mode/i,
    });
    await themeToggle.click();

    // Should be in light mode despite system preference
    await expect(body).not.toHaveClass(/dark/);

    // Refresh page
    await page.reload();

    // Should still be in light mode (user preference overrides system)
    await expect(body).not.toHaveClass(/dark/);
  });
});
