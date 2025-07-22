import { test, expect } from '@playwright/test';

test.describe('Performance Regression Tests', () => {
  // Performance thresholds (in milliseconds)
  const PERFORMANCE_THRESHOLDS = {
    pageLoad: 3000,
    firstContentfulPaint: 2000,
    timeToInteractive: 3500,
    editorInit: 1000,
    imageUpload: 2000,
    aiResponse: 5000,
  };

  test('should load homepage within performance budget', async ({ page }) => {
    // Start measuring
    const startTime = Date.now();

    // Navigate and wait for load
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Check load time
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);

    // Get performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');

      return {
        domContentLoaded:
          navigation.domContentLoadedEventEnd -
          navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find((p) => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint:
          paint.find((p) => p.name === 'first-contentful-paint')?.startTime ||
          0,
      };
    });

    // Check First Contentful Paint
    expect(metrics.firstContentfulPaint).toBeLessThan(
      PERFORMANCE_THRESHOLDS.firstContentfulPaint
    );
  });

  test('should initialize editor quickly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Measure editor initialization
    const startTime = Date.now();

    await page.goto('/write/test-document');

    // Wait for editor to be ready
    await page.waitForSelector('[contenteditable="true"]');

    const editorInitTime = Date.now() - startTime;

    // Check editor init time
    expect(editorInitTime).toBeLessThan(PERFORMANCE_THRESHOLDS.editorInit);

    // Verify editor is interactive
    const editor = page.locator('[contenteditable="true"]');
    await editor.focus();
    await editor.type('Test');

    // Should respond immediately
    await expect(editor).toContainText('Test');
  });

  test('should handle rapid typing without lag', async ({ page }) => {
    await page.goto('/write/test-document');
    await page.waitForSelector('[contenteditable="true"]');

    const editor = page.locator('[contenteditable="true"]');
    await editor.focus();

    // Type rapidly
    const testText = 'The quick brown fox jumps over the lazy dog. '.repeat(10);
    const startTime = Date.now();

    await editor.type(testText, { delay: 10 }); // 10ms between keystrokes

    const typingTime = Date.now() - startTime;
    const expectedTime = testText.length * 10; // Should be close to this

    // Allow 20% overhead
    expect(typingTime).toBeLessThan(expectedTime * 1.2);

    // Verify all text was captured
    const editorContent = await editor.textContent();
    expect(editorContent).toContain(testText.trim());
  });

  test('should maintain performance with large documents', async ({ page }) => {
    await page.goto('/write/test-document');
    await page.waitForSelector('[contenteditable="true"]');

    const editor = page.locator('[contenteditable="true"]');
    await editor.focus();

    // Create a large document
    const paragraph =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(20);

    // Add 50 paragraphs
    for (let i = 0; i < 50; i++) {
      await editor.type(paragraph);
      await editor.press('Enter');
      await editor.press('Enter');
    }

    // Measure scrolling performance
    const scrollStartTime = Date.now();

    // Scroll to bottom
    await editor.evaluate((el) => el.scrollTo(0, el.scrollHeight));

    // Scroll back to top
    await editor.evaluate((el) => el.scrollTo(0, 0));

    const scrollTime = Date.now() - scrollStartTime;

    // Scrolling should be smooth (under 500ms for both operations)
    expect(scrollTime).toBeLessThan(500);

    // Test typing at the end of large document
    await editor.press('End');

    const typeStartTime = Date.now();
    await editor.type('Final paragraph.');
    const typeTime = Date.now() - typeStartTime;

    // Typing should still be responsive
    expect(typeTime).toBeLessThan(200);
  });

  test('should handle image uploads efficiently', async ({ page }) => {
    await page.goto('/write/test-document');
    await page.waitForSelector('[contenteditable="true"]');

    const editor = page.locator('[contenteditable="true"]');
    await editor.focus();

    // Measure image upload process
    const startTime = Date.now();

    // Simulate image paste
    await page.evaluate(() => {
      const dataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

      // Create a blob from data URL
      fetch(dataUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const clipboardData = {
            items: [
              {
                kind: 'file',
                type: 'image/png',
                getAsFile: () =>
                  new File([blob], 'test.png', { type: 'image/png' }),
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
    });

    // Wait for image to appear
    await expect(editor.locator('img')).toBeVisible({
      timeout: PERFORMANCE_THRESHOLDS.imageUpload,
    });

    const uploadTime = Date.now() - startTime;
    expect(uploadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.imageUpload);
  });

  test('should measure memory usage stays reasonable', async ({ page }) => {
    // Navigate to editor
    await page.goto('/write/test-document');
    await page.waitForSelector('[contenteditable="true"]');

    // Get initial memory usage (if available)
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });

    if (initialMemory !== null) {
      const editor = page.locator('[contenteditable="true"]');
      await editor.focus();

      // Perform memory-intensive operations
      for (let i = 0; i < 100; i++) {
        await editor.type(`Paragraph ${i}: Lorem ipsum dolor sit amet. `);
        if (i % 10 === 0) {
          await editor.press('Enter');
        }
      }

      // Get final memory usage
      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return null;
      });

      if (finalMemory !== null) {
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

        // Memory increase should be reasonable (less than 50MB)
        expect(memoryIncreaseMB).toBeLessThan(50);
      }
    }
  });

  test('should track custom performance metrics', async ({ page }) => {
    await page.goto('/write/test-document');
    await page.waitForSelector('[contenteditable="true"]');

    // Check if performance monitor is available in development
    const performanceMonitor = page.locator(
      '[data-testid="performance-monitor"]'
    );

    if (
      await performanceMonitor.isVisible({ timeout: 2000 }).catch(() => false)
    ) {
      // Get custom metrics
      const metrics = await page.evaluate(() => {
        const tracker = (window as any).performanceTracker;
        if (tracker) {
          return tracker.getMetrics();
        }
        return null;
      });

      if (metrics) {
        // Check editor initialization metric
        const editorInitMetric = metrics.find(
          (m: any) => m.name === 'editor_initialization'
        );
        if (editorInitMetric) {
          expect(editorInitMetric.duration).toBeLessThan(
            PERFORMANCE_THRESHOLDS.editorInit
          );
        }
      }
    }
  });

  test('should bundle size stay within limits', async ({ page }) => {
    // This test checks the network tab for bundle sizes
    const resources: Array<{ url: string; size: number }> = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('.js') || url.includes('.css')) {
        const headers = response.headers();
        const size = parseInt(headers['content-length'] || '0');
        if (size > 0) {
          resources.push({ url, size });
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check main bundle size
    const mainBundle = resources.find(
      (r) => r.url.includes('main') && r.url.includes('.js')
    );
    if (mainBundle) {
      const mainBundleSizeKB = mainBundle.size / 1024;
      expect(mainBundleSizeKB).toBeLessThan(250); // 250KB limit for main bundle
    }

    // Check CSS bundle size
    const cssBundle = resources.find((r) => r.url.includes('.css'));
    if (cssBundle) {
      const cssBundleSizeKB = cssBundle.size / 1024;
      expect(cssBundleSizeKB).toBeLessThan(50); // 50KB limit for CSS
    }

    // Check total size
    const totalSize = resources.reduce((sum, r) => sum + r.size, 0);
    const totalSizeKB = totalSize / 1024;
    expect(totalSizeKB).toBeLessThan(500); // 500KB total limit
  });

  test('should maintain Time to Interactive under threshold', async ({
    page,
  }) => {
    // Custom function to measure TTI
    const measureTTI = async () => {
      const startTime = Date.now();

      await page.goto('/', { waitUntil: 'domcontentloaded' });

      // Wait for page to be interactive
      await page.waitForLoadState('networkidle');

      // Verify page is interactive by clicking a button
      const button = page.locator('button').first();
      await button.click({ trial: true }); // Trial click to ensure it's clickable

      const tti = Date.now() - startTime;
      return tti;
    };

    const tti = await measureTTI();
    expect(tti).toBeLessThan(PERFORMANCE_THRESHOLDS.timeToInteractive);
  });

  test('should handle concurrent operations efficiently', async ({ page }) => {
    await page.goto('/write/test-document');
    await page.waitForSelector('[contenteditable="true"]');

    const editor = page.locator('[contenteditable="true"]');
    await editor.focus();

    // Start multiple operations concurrently
    const operations = [
      // Type text
      editor.type('Concurrent operation 1'),

      // Format text (after slight delay)
      (async () => {
        await page.waitForTimeout(100);
        await page.keyboard.press('Control+A');
        await page.getByRole('button', { name: /bold/i }).click();
      })(),

      // Navigate toolbar
      (async () => {
        await page.waitForTimeout(200);
        const buttons = page.locator('[role="toolbar"] button');
        const count = await buttons.count();
        for (let i = 0; i < Math.min(count, 3); i++) {
          await buttons.nth(i).hover();
        }
      })(),
    ];

    const startTime = Date.now();
    await Promise.all(operations);
    const totalTime = Date.now() - startTime;

    // All operations should complete quickly
    expect(totalTime).toBeLessThan(1000);
  });
});
