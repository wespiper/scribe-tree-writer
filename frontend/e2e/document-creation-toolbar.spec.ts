import { test, expect } from '@playwright/test';

test.describe('Document Creation with Toolbar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should create a new document and use formatting toolbar', async ({
    page,
  }) => {
    // Navigate to document creation
    await page.getByRole('button', { name: /new document/i }).click();

    // Wait for editor to load
    await page.waitForSelector('[contenteditable="true"]');

    // Type some initial text
    const editor = page.locator('[contenteditable="true"]');
    await editor.focus();
    await editor.type('This is my document title');

    // Select the text for formatting
    await editor.selectText();

    // Apply heading 1 formatting
    await page.getByRole('button', { name: /heading 1/i }).click();

    // Verify H1 is applied
    await expect(editor.locator('h1')).toContainText(
      'This is my document title'
    );

    // Press Enter and add more text
    await editor.press('End');
    await editor.press('Enter');
    await editor.type('This is a paragraph with ');

    // Type text to be bolded
    const boldStart = await editor.evaluate(
      (el) => el.textContent?.length || 0
    );
    await editor.type('bold text');

    // Select the "bold text" portion
    await page.keyboard.down('Shift');
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press('ArrowLeft');
    }
    await page.keyboard.up('Shift');

    // Apply bold formatting
    await page.getByRole('button', { name: /bold/i }).click();

    // Verify bold is applied
    await expect(editor.locator('strong')).toContainText('bold text');

    // Move to end and continue typing
    await editor.press('End');
    await editor.type(' and ');

    // Type text to be italicized
    await editor.type('italic text');

    // Select the "italic text" portion
    await page.keyboard.down('Shift');
    for (let i = 0; i < 11; i++) {
      await page.keyboard.press('ArrowLeft');
    }
    await page.keyboard.up('Shift');

    // Apply italic formatting
    await page.getByRole('button', { name: /italic/i }).click();

    // Verify italic is applied
    await expect(editor.locator('em')).toContainText('italic text');
  });

  test('should create lists using toolbar', async ({ page }) => {
    // Navigate to document creation
    await page.getByRole('button', { name: /new document/i }).click();

    // Wait for editor to load
    await page.waitForSelector('[contenteditable="true"]');

    const editor = page.locator('[contenteditable="true"]');
    await editor.focus();

    // Create a bullet list
    await editor.type('Shopping list:');
    await editor.press('Enter');

    // Click bullet list button
    await page.getByRole('button', { name: /bullet list/i }).click();

    // Add list items
    await editor.type('Apples');
    await editor.press('Enter');
    await editor.type('Bananas');
    await editor.press('Enter');
    await editor.type('Oranges');

    // Verify bullet list is created
    await expect(editor.locator('ul')).toBeVisible();
    await expect(editor.locator('ul li')).toHaveCount(3);

    // Exit list and create numbered list
    await editor.press('Enter');
    await editor.press('Enter');
    await editor.type('Steps to follow:');
    await editor.press('Enter');

    // Click ordered list button
    await page
      .getByRole('button', { name: /ordered list|numbered list/i })
      .click();

    // Add numbered items
    await editor.type('First step');
    await editor.press('Enter');
    await editor.type('Second step');
    await editor.press('Enter');
    await editor.type('Third step');

    // Verify ordered list is created
    await expect(editor.locator('ol')).toBeVisible();
    await expect(editor.locator('ol li')).toHaveCount(3);
  });

  test('should insert links using toolbar', async ({ page }) => {
    // Navigate to document creation
    await page.getByRole('button', { name: /new document/i }).click();

    // Wait for editor to load
    await page.waitForSelector('[contenteditable="true"]');

    const editor = page.locator('[contenteditable="true"]');
    await editor.focus();

    // Type text that will become a link
    await editor.type('Visit our website for more information');

    // Select "website"
    await page.keyboard.down('Shift');
    for (let i = 0; i < 22; i++) {
      await page.keyboard.press('ArrowLeft');
    }
    await page.keyboard.up('Shift');

    // Click link button
    await page.getByRole('button', { name: /link/i }).click();

    // Enter URL in prompt/dialog
    await page.fill(
      'input[type="url"], input[placeholder*="URL"], input[placeholder*="url"]',
      'https://example.com'
    );
    await page.keyboard.press('Enter');

    // Verify link is created
    await expect(editor.locator('a[href="https://example.com"]')).toContainText(
      'website'
    );
  });

  test('should use undo/redo functionality', async ({ page }) => {
    // Navigate to document creation
    await page.getByRole('button', { name: /new document/i }).click();

    // Wait for editor to load
    await page.waitForSelector('[contenteditable="true"]');

    const editor = page.locator('[contenteditable="true"]');
    await editor.focus();

    // Type some text
    await editor.type('Original text');

    // Add more text
    await editor.press('Space');
    await editor.type('Additional text');

    // Verify full text
    await expect(editor).toContainText('Original text Additional text');

    // Click undo button
    await page.getByRole('button', { name: /undo/i }).click();

    // Verify "Additional text" is removed
    await expect(editor).toContainText('Original text');
    await expect(editor).not.toContainText('Additional text');

    // Click redo button
    await page.getByRole('button', { name: /redo/i }).click();

    // Verify "Additional text" is restored
    await expect(editor).toContainText('Original text Additional text');
  });

  test('should save document with formatted content', async ({ page }) => {
    // Navigate to document creation
    await page.getByRole('button', { name: /new document/i }).click();

    // Wait for editor to load
    await page.waitForSelector('[contenteditable="true"]');

    const editor = page.locator('[contenteditable="true"]');
    await editor.focus();

    // Create formatted content
    await editor.type('My Document');
    await editor.selectText();
    await page.getByRole('button', { name: /heading 1/i }).click();

    await editor.press('End');
    await editor.press('Enter');
    await editor.type('This document contains formatted text.');

    // Save the document
    await page.getByRole('button', { name: /save/i }).click();

    // Wait for save confirmation
    await expect(page.getByText(/saved|save successful/i)).toBeVisible();

    // Refresh page to ensure persistence
    await page.reload();

    // Verify formatted content is preserved
    await expect(page.locator('h1')).toContainText('My Document');
    await expect(page.locator('[contenteditable="true"]')).toContainText(
      'This document contains formatted text.'
    );
  });
});
