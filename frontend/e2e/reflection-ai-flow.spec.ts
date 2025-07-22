import { test, expect } from '@playwright/test';

test.describe('Reflection → AI Access Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication - in a real app, you'd login properly
    await page.goto('/');

    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test('should block AI access when reflection is too short', async ({
    page,
  }) => {
    // Navigate to document editor
    await page.goto('/write/test-document-id');

    // Find and click the reflection gate button/link
    await page.getByRole('button', { name: /reflect|access ai/i }).click();

    // Type a short reflection (less than 50 words)
    const reflectionTextarea = page.getByRole('textbox', {
      name: /reflection/i,
    });
    await reflectionTextarea.fill(
      'This is a very short reflection that should not meet the minimum word requirement.'
    );

    // Check word count display
    await expect(page.getByText(/\d+ \/ 50 words/)).toBeVisible();

    // Submit button should be disabled
    const submitButton = page.getByRole('button', {
      name: /submit reflection/i,
    });
    await expect(submitButton).toBeDisabled();
  });

  test('should grant AI access with quality reflection', async ({ page }) => {
    // Navigate to document editor
    await page.goto('/write/test-document-id');

    // Find and click the reflection gate button/link
    await page.getByRole('button', { name: /reflect|access ai/i }).click();

    // Type a thoughtful reflection (50+ words)
    const reflectionTextarea = page.getByRole('textbox', {
      name: /reflection/i,
    });
    const thoughtfulReflection = `
      I'm working on an essay about climate change and I'm struggling with how to
      structure my argument effectively. I want to present both the scientific evidence
      and the economic implications, but I'm not sure how to balance these two aspects.
      I've been reading various sources and I'm feeling overwhelmed by the amount of
      information available. I think I need help organizing my thoughts and creating
      a clear narrative that will engage my readers while remaining factually accurate.
    `.trim();

    await reflectionTextarea.fill(thoughtfulReflection);

    // Check word count shows we're over minimum
    const wordCount = page.getByText(/\d+ \/ 50 words/);
    await expect(wordCount).toContainText(
      /[5-9]\d+ \/ 50 words|1\d+ \/ 50 words/
    );

    // Submit button should be enabled
    const submitButton = page.getByRole('button', {
      name: /submit reflection/i,
    });
    await expect(submitButton).toBeEnabled();

    // Submit the reflection
    await submitButton.click();

    // Wait for processing
    await expect(page.getByText(/processing|analyzing/i)).toBeVisible();

    // Should show success and AI access granted
    await expect(
      page.getByText(/access granted|reflection accepted/i)
    ).toBeVisible({ timeout: 10000 });

    // AI chat interface should become available
    await expect(
      page.getByRole('textbox', { name: /ask.*question|chat/i })
    ).toBeVisible();
  });

  test('should show rejection message for low quality reflection', async ({
    page,
  }) => {
    // Navigate to document editor
    await page.goto('/write/test-document-id');

    // Find and click the reflection gate button/link
    await page.getByRole('button', { name: /reflect|access ai/i }).click();

    // Type a low-quality reflection that meets word count but lacks depth
    const reflectionTextarea = page.getByRole('textbox', {
      name: /reflection/i,
    });
    const lowQualityReflection =
      'Help me write my essay. ' + 'I need help. '.repeat(20);

    await reflectionTextarea.fill(lowQualityReflection);

    // Submit the reflection
    const submitButton = page.getByRole('button', {
      name: /submit reflection/i,
    });
    await submitButton.click();

    // Should show rejection message
    await expect(
      page.getByText(/try again|think deeper|not sufficient/i)
    ).toBeVisible({ timeout: 10000 });

    // Should show suggestions for improvement
    await expect(page.getByText(/specific|elaborate|explain/i)).toBeVisible();

    // AI access should remain blocked
    await expect(
      page.getByRole('textbox', { name: /ask.*question|chat/i })
    ).not.toBeVisible();
  });

  test('should persist AI access after page refresh', async ({ page }) => {
    // Navigate to document editor
    await page.goto('/write/test-document-id');

    // Submit a quality reflection (abbreviated for test)
    await page.getByRole('button', { name: /reflect|access ai/i }).click();

    const reflectionTextarea = page.getByRole('textbox', {
      name: /reflection/i,
    });
    const reflection = `
      I need to analyze the themes in Shakespeare's Hamlet for my literature class.
      I'm particularly interested in exploring the theme of madness and how it relates
      to the broader questions of reality and perception in the play. I've noticed that
      multiple characters either feign or experience madness, and I want to understand
      how Shakespeare uses this as a literary device to advance the plot and develop
      character relationships throughout the play.
    `.trim();

    await reflectionTextarea.fill(reflection);
    await page.getByRole('button', { name: /submit reflection/i }).click();

    // Wait for AI access to be granted
    await expect(
      page.getByText(/access granted|reflection accepted/i)
    ).toBeVisible({ timeout: 10000 });

    // Refresh the page
    await page.reload();

    // AI chat should still be accessible
    await expect(
      page.getByRole('textbox', { name: /ask.*question|chat/i })
    ).toBeVisible();

    // Reflection gate should not be shown again
    await expect(
      page.getByRole('button', { name: /reflect|access ai/i })
    ).not.toBeVisible();
  });

  test('should track reflection quality and show AI level', async ({
    page,
  }) => {
    // Navigate to document editor
    await page.goto('/write/test-document-id');

    // Submit a high-quality reflection
    await page.getByRole('button', { name: /reflect|access ai/i }).click();

    const reflectionTextarea = page.getByRole('textbox', {
      name: /reflection/i,
    });
    const highQualityReflection = `
      I'm researching the impact of social media on teenage mental health for my
      psychology paper. I've been reviewing multiple studies that show correlations
      between social media usage and anxiety/depression rates, but I'm struggling
      to distinguish between correlation and causation. Additionally, I want to
      explore the positive aspects of social media connectivity, especially during
      the pandemic, to present a balanced view. I'm also considering the role of
      different platforms and how their specific features might impact mental health
      differently. My main challenge is synthesizing all this information into a
      coherent argument that acknowledges the complexity of the issue.
    `.trim();

    await reflectionTextarea.fill(highQualityReflection);
    await page.getByRole('button', { name: /submit reflection/i }).click();

    // Wait for processing
    await expect(
      page.getByText(/access granted|reflection accepted/i)
    ).toBeVisible({ timeout: 10000 });

    // Should show AI level achieved (basic/standard/advanced)
    await expect(page.getByText(/ai level:|assistant level:/i)).toBeVisible();
    await expect(page.getByText(/basic|standard|advanced/i)).toBeVisible();
  });
});
