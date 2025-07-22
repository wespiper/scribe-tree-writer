import { test, expect, devices, Browser } from '@playwright/test';

test.describe('Mobile Responsiveness', () => {
  // Helper function to test in device context
  async function testInDevice(
    browser: Browser,
    deviceName: string,
    testFn: (page: any) => Promise<void>
  ) {
    const context = await browser.newContext(devices[deviceName]);
    const page = await context.newPage();
    try {
      await testFn(page);
    } finally {
      await context.close();
    }
  }

  test('should display mobile-optimized navigation', async ({ browser }) => {
    // Test on iPhone 12
    await testInDevice(browser, 'iPhone 12', async (page) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check for mobile menu button (hamburger)
      const mobileMenuButton = page.getByRole('button', {
        name: /menu|navigation/i,
      });
      await expect(mobileMenuButton).toBeVisible();

      // Click menu button
      await mobileMenuButton.click();

      // Check mobile menu is visible
      const mobileMenu = page
        .locator('[role="navigation"], nav')
        .filter({ hasText: /home|documents|profile/i });
      await expect(mobileMenu).toBeVisible();

      // Close menu by clicking outside or close button
      const closeButton = page.getByRole('button', { name: /close|x/i });
      if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeButton.click();
      } else {
        await page.locator('body').click({ position: { x: 10, y: 10 } });
      }

      // Menu should be hidden
      await expect(mobileMenu).not.toBeVisible();
    });

    // Test on Pixel 5
    await testInDevice(browser, 'Pixel 5', async (page) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Similar checks for Android device
      const mobileMenuButton = page.getByRole('button', {
        name: /menu|navigation/i,
      });
      await expect(mobileMenuButton).toBeVisible();
    });
  });

  test('should have touch-friendly button sizes', async ({ browser }) => {
    await testInDevice(browser, 'iPhone 12', async (page) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Get all buttons
      const buttons = page.locator('button:visible');
      const buttonCount = await buttons.count();

      // Check each button has minimum touch target size (44x44 px)
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();

        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });
  });

  test('should stack layout elements vertically on mobile', async ({
    browser,
  }) => {
    await testInDevice(browser, 'iPhone 12', async (page) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check if flex containers use column direction
      const containers = page.locator('[class*="flex"]:visible').first();
      const flexDirection = await containers.evaluate(
        (el) => window.getComputedStyle(el).flexDirection
      );

      // On mobile, many flex containers should be column
      expect(['column', 'column-reverse']).toContain(flexDirection);
    });
  });

  test('should have readable text sizes on mobile', async ({ browser }) => {
    await testInDevice(browser, 'Pixel 5', async (page) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check body text size
      const bodyText = page.locator('p, .text-base').first();
      const fontSize = await bodyText.evaluate((el) =>
        parseFloat(window.getComputedStyle(el).fontSize)
      );

      // Minimum readable size is 14px on mobile
      expect(fontSize).toBeGreaterThanOrEqual(14);

      // Check heading sizes are proportional
      const heading = page.locator('h1, h2, h3').first();
      if (await heading.isVisible({ timeout: 1000 }).catch(() => false)) {
        const headingSize = await heading.evaluate((el) =>
          parseFloat(window.getComputedStyle(el).fontSize)
        );
        expect(headingSize).toBeGreaterThanOrEqual(18);
      }
    });
  });

  test('should handle document editor on mobile', async ({ browser }) => {
    await testInDevice(browser, 'iPhone 12', async (page) => {
      await page.goto('/write/test-document');
      await page.waitForLoadState('networkidle');

      // Editor should be full width
      const editor = page.locator('[contenteditable="true"]');
      const editorBox = await editor.boundingBox();
      const viewportSize = page.viewportSize();

      if (editorBox && viewportSize) {
        // Editor should use most of viewport width (minus padding)
        expect(editorBox.width).toBeGreaterThan(viewportSize.width * 0.85);
      }

      // Toolbar should be accessible
      const toolbar = page.locator('[role="toolbar"], .toolbar');
      if (await toolbar.isVisible({ timeout: 2000 }).catch(() => false)) {
        // On mobile, toolbar might scroll horizontally
        const toolbarBox = await toolbar.boundingBox();
        expect(toolbarBox).toBeTruthy();
      }
    });
  });

  test('should show mobile-optimized reflection gate', async ({ browser }) => {
    await testInDevice(browser, 'iPhone 12', async (page) => {
      await page.goto('/write/test-document');
      await page.waitForLoadState('networkidle');

      // Open reflection gate
      const reflectButton = page.getByRole('button', { name: /reflect|ai/i });
      await reflectButton.click();

      // Reflection textarea should be appropriately sized
      const textarea = page.getByRole('textbox', { name: /reflection/i });
      const textareaBox = await textarea.boundingBox();
      const viewportSize = page.viewportSize();

      if (textareaBox && viewportSize) {
        // Should use most of viewport width
        expect(textareaBox.width).toBeGreaterThan(viewportSize.width * 0.85);
        // Should have reasonable height
        expect(textareaBox.height).toBeGreaterThanOrEqual(100);
      }
    });
  });

  test('should display two-column layout on tablet', async ({ browser }) => {
    await testInDevice(browser, 'iPad (gen 7)', async (page) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Look for grid or flex containers that might use columns
      const gridContainer = page
        .locator('[class*="grid"], [class*="md:grid-cols-2"]')
        .first();
      if (await gridContainer.isVisible({ timeout: 1000 }).catch(() => false)) {
        const gridStyle = await gridContainer.evaluate(
          (el) => window.getComputedStyle(el).gridTemplateColumns
        );
        // Should have multiple columns on tablet
        expect(gridStyle).not.toBe('none');
      }
    });
  });

  test('should adapt layout when rotating from portrait to landscape', async ({
    browser,
  }) => {
    // Start in portrait mode
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 }, // iPhone X portrait
      deviceScaleFactor: 3,
    });
    const page = await context.newPage();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check initial portrait layout
    const portraitMenuButton = page.getByRole('button', { name: /menu/i });
    await expect(portraitMenuButton).toBeVisible();

    // Rotate to landscape
    await page.setViewportSize({ width: 812, height: 375 });

    // Give time for responsive styles to apply
    await page.waitForTimeout(300);

    // In landscape, might have different navigation
    // Menu button might be hidden if nav is shown inline
    const isMenuVisible = await portraitMenuButton
      .isVisible()
      .catch(() => false);
    const navLinks = page.locator('nav a:visible');
    const navLinkCount = await navLinks.count();

    // Either menu button or nav links should be visible
    expect(isMenuVisible || navLinkCount > 0).toBeTruthy();

    await context.close();
  });

  test('should support touch gestures for navigation', async ({ browser }) => {
    await testInDevice(browser, 'iPhone 12', async (page) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Open mobile menu
      const menuButton = page.getByRole('button', { name: /menu/i });
      await menuButton.click();

      const menu = page
        .locator('[role="navigation"], nav')
        .filter({ hasText: /home|documents/i });
      await expect(menu).toBeVisible();

      // Simulate swipe to close (if supported)
      const menuBox = await menu.boundingBox();
      if (menuBox) {
        await page.touchscreen.tap(
          menuBox.x + menuBox.width / 2,
          menuBox.y + 50
        );
        await page.touchscreen.tap(10, menuBox.y + 50); // Swipe left
      }

      // Alternative: tap outside to close
      await page.locator('body').click({ position: { x: 10, y: 10 } });
      await expect(menu).not.toBeVisible();
    });
  });

  test('should handle touch scrolling in editor', async ({ browser }) => {
    await testInDevice(browser, 'iPhone 12', async (page) => {
      await page.goto('/write/test-document');
      await page.waitForLoadState('networkidle');

      const editor = page.locator('[contenteditable="true"]');
      await editor.focus();

      // Add content to make it scrollable
      for (let i = 0; i < 20; i++) {
        await editor.type(`Line ${i + 1} of content\n`);
      }

      // Get editor scroll position
      const initialScroll = await editor.evaluate((el) => el.scrollTop);

      // Simulate touch scroll
      const box = await editor.boundingBox();
      if (box) {
        await page.touchscreen.tap(
          box.x + box.width / 2,
          box.y + box.height / 2
        );
        await page.touchscreen.tap(box.x + box.width / 2, box.y + 50); // Scroll down
      }

      // Verify scroll occurred
      const finalScroll = await editor.evaluate((el) => el.scrollTop);
      expect(finalScroll).toBeGreaterThan(initialScroll);
    });
  });

  test('should resize images appropriately on mobile', async ({ browser }) => {
    await testInDevice(browser, 'iPhone 12', async (page) => {
      await page.goto('/write/test-document');
      await page.waitForLoadState('networkidle');

      // Add an image (mock the upload)
      const editor = page.locator('[contenteditable="true"]');
      await editor.evaluate((el) => {
        const img = document.createElement('img');
        img.src =
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        img.style.maxWidth = '100%';
        el.appendChild(img);
      });

      // Check image doesn't overflow
      const img = editor.locator('img');
      const imgBox = await img.boundingBox();
      const viewportSize = page.viewportSize();

      if (imgBox && viewportSize) {
        expect(imgBox.width).toBeLessThanOrEqual(viewportSize.width);
      }
    });
  });
});
