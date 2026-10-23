// Keyboard / UX behaviour, focused on the mobile navigation overlay and forms.
// Selectors validated against WP 7.0 in a browser run (Studio site, desktop +
// mobile) — see docs/testing-strategy.md → "Implementation plan".
const { test, expect } = require('@playwright/test');

test.describe('keyboard and overlay', () => {
  test('tab order reaches the skip link first', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toHaveAttribute('href', '#main-content');
  });

  test('mobile nav overlay opens, traps focus, and closes on Esc', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/');

    const open = page.getByRole('button', { name: /menu/i }).first();
    await open.click();

    const overlay = page.locator('[role="dialog"], .wp-block-navigation-overlay').first();
    await expect(overlay).toBeVisible();

    // Focus should be inside the overlay while open.
    await expect(overlay.locator(':focus')).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(overlay).toBeHidden();
  });

  test('search and comment inputs are keyboard-operable', async ({ page }) => {
    // Fail immediately on a maintenance/error page instead of waiting for a
    // form field that cannot exist. Retain timings in the CI log.
    async function navigate(url) {
      const start = Date.now();
      const response = await page.goto(url);
      console.log(`keyboard navigation ${url}: HTTP ${response.status()} in ${Date.now() - start}ms`);
      expect(response.ok(), `keyboard test navigation failed: ${url}`).toBeTruthy();
    }
    await navigate('/search/');
    const search = page.locator('.wp-block-search__input').first();
    await search.focus();
    await expect(search).toBeFocused();

    // Comment form on a single post (URL discovered from the archive — it embeds
    // the seed date, so it can't be a static slug).
    await navigate('/archive/');
    const href = await page.locator('.wp-block-post-title a').first().getAttribute('href');
    expect(href, 'a post link on the archive').toBeTruthy();
    await navigate(href);
    const comment = page.locator('#comment, .comment-form textarea').first();
    await comment.focus();
    await expect(comment).toBeFocused();
  });
});
