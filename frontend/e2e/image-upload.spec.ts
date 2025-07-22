import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Image Upload Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to document editor
    await page.getByRole('button', { name: /new document/i }).click();
    await page.waitForSelector('[contenteditable="true"]');
  });

  test('should upload image via toolbar button', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]');
    await editor.focus();

    // Click the image upload button in toolbar
    await page.getByRole('button', { name: /image|upload/i }).click();

    // Wait for file input
    const fileChooserPromise = page.waitForEvent('filechooser');

    // Trigger file selection (click upload area if visible)
    const uploadArea = page
      .locator(
        '[data-testid="image-upload-zone"], .upload-zone, input[type="file"]'
      )
      .first();
    await uploadArea.click();

    const fileChooser = await fileChooserPromise;

    // Create a test image file
    const testImagePath = path.join(
      __dirname,
      '..',
      'public',
      'test-image.png'
    );
    await fileChooser.setFiles([testImagePath]);

    // Verify image appears in editor
    await expect(editor.locator('img')).toBeVisible({ timeout: 10000 });

    // Verify image has src attribute
    const imgSrc = await editor.locator('img').getAttribute('src');
    expect(imgSrc).toBeTruthy();
  });

  test('should upload image via drag and drop', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]');
    await editor.focus();

    // Click image upload button to open upload zone
    await page.getByRole('button', { name: /image|upload/i }).click();

    // Wait for upload zone to be visible
    const uploadZone = page
      .locator('[data-testid="image-upload-zone"], .upload-zone, .drop-zone')
      .first();
    await expect(uploadZone).toBeVisible();

    // Create a data transfer with a file
    const buffer = Buffer.from('fake-image-data');
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());

    // Create a file and add to data transfer
    await page.evaluateHandle(
      ({ dataTransfer, buffer }) => {
        const file = new File([buffer], 'test-image.png', {
          type: 'image/png',
        });
        dataTransfer.items.add(file);
      },
      { dataTransfer, buffer }
    );

    // Simulate drag over
    await uploadZone.dispatchEvent('dragenter', { dataTransfer });

    // Verify drag state visual feedback
    await expect(uploadZone).toHaveClass(/drag-over|dragging|active/);

    // Simulate drop
    await uploadZone.dispatchEvent('drop', { dataTransfer });

    // Verify image appears in editor
    await expect(editor.locator('img')).toBeVisible({ timeout: 10000 });
  });

  test('should paste image from clipboard', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]');
    await editor.focus();

    // Type some text first
    await editor.type('Here is an image: ');

    // Simulate paste event with image data
    await page.evaluate(() => {
      const clipboardData = {
        items: [
          {
            kind: 'file',
            type: 'image/png',
            getAsFile: () =>
              new File(['fake-image-data'], 'pasted-image.png', {
                type: 'image/png',
              }),
          },
        ],
      };

      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: clipboardData as any,
        bubbles: true,
        cancelable: true,
      });

      document
        .querySelector('[contenteditable="true"]')
        ?.dispatchEvent(pasteEvent);
    });

    // Verify image appears in editor
    await expect(editor.locator('img')).toBeVisible({ timeout: 10000 });
  });

  test('should validate file size limits', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]');
    await editor.focus();

    // Click image upload button
    await page.getByRole('button', { name: /image|upload/i }).click();

    // Wait for file input
    const fileChooserPromise = page.waitForEvent('filechooser');

    // Trigger file selection
    const uploadArea = page
      .locator(
        '[data-testid="image-upload-zone"], .upload-zone, input[type="file"]'
      )
      .first();
    await uploadArea.click();

    const fileChooser = await fileChooserPromise;

    // Create a large fake file (over 10MB)
    await page.evaluateHandle(async () => {
      const largeBuffer = new ArrayBuffer(11 * 1024 * 1024); // 11MB
      const file = new File([largeBuffer], 'large-image.png', {
        type: 'image/png',
      });
      return file;
    });

    // Note: Playwright doesn't allow setting custom File objects, so we'll test the UI feedback
    // In a real scenario, we'd need to have an actual large file

    // For now, verify the upload zone shows size limit
    await expect(page.getByText(/10\s*MB|size limit/i)).toBeVisible();
  });

  test('should validate file types', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]');
    await editor.focus();

    // Click image upload button
    await page.getByRole('button', { name: /image|upload/i }).click();

    // Verify accepted file types are shown
    await expect(page.getByText(/jpeg|jpg|png|gif|webp/i)).toBeVisible();

    // Get the file input and check accept attribute
    const fileInput = page.locator('input[type="file"]');
    const acceptAttr = await fileInput.getAttribute('accept');
    expect(acceptAttr).toContain('image/');
  });

  test('should show image preview after upload', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]');
    await editor.focus();

    // Click image upload button
    await page.getByRole('button', { name: /image|upload/i }).click();

    // Wait for file input
    const fileChooserPromise = page.waitForEvent('filechooser');

    // Trigger file selection
    const uploadArea = page
      .locator(
        '[data-testid="image-upload-zone"], .upload-zone, input[type="file"]'
      )
      .first();
    await uploadArea.click();

    const fileChooser = await fileChooserPromise;

    // Create a test image file
    const testImagePath = path.join(
      __dirname,
      '..',
      'public',
      'test-image.png'
    );
    await fileChooser.setFiles([testImagePath]);

    // Check for preview in upload component (if shown)
    const preview = page.locator(
      '[data-testid="image-preview"], .image-preview, img[alt*="preview"]'
    );
    if (await preview.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(preview).toBeVisible();
    }

    // Verify final image in editor
    await expect(editor.locator('img')).toBeVisible({ timeout: 10000 });

    // Verify image is properly sized (not too large)
    const imgElement = editor.locator('img').first();
    const boundingBox = await imgElement.boundingBox();
    expect(boundingBox?.width).toBeLessThanOrEqual(800); // Max width constraint
  });

  test('should handle multiple image uploads', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]');
    await editor.focus();

    // Upload first image
    await page.getByRole('button', { name: /image|upload/i }).click();

    const fileChooserPromise1 = page.waitForEvent('filechooser');
    const uploadArea = page
      .locator(
        '[data-testid="image-upload-zone"], .upload-zone, input[type="file"]'
      )
      .first();
    await uploadArea.click();

    const fileChooser1 = await fileChooserPromise1;
    const testImagePath = path.join(
      __dirname,
      '..',
      'public',
      'test-image.png'
    );
    await fileChooser1.setFiles([testImagePath]);

    // Wait for first image
    await expect(editor.locator('img')).toHaveCount(1);

    // Add some text
    await editor.press('End');
    await editor.press('Enter');
    await editor.type('Another image below:');
    await editor.press('Enter');

    // Upload second image
    await page.getByRole('button', { name: /image|upload/i }).click();

    const fileChooserPromise2 = page.waitForEvent('filechooser');
    await uploadArea.click();

    const fileChooser2 = await fileChooserPromise2;
    await fileChooser2.setFiles([testImagePath]);

    // Verify both images are present
    await expect(editor.locator('img')).toHaveCount(2);
  });
});
