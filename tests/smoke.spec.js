const { test, expect } = require('@playwright/test');

const READING_SETTINGS = {
  focusWeak: false,
  dakuten: false,
  yoon: false,
  extendedKatakana: false,
  hint: false,
  srs: false,
  mobileMode: false,
  endless: false,
  timeTrial: false,
  speedRun: false,
  dailyChallenge: false,
  testMode: false,
  comboKana: false,
  comboMode: 'random',
  hiraganaRows: ['h_a'],
  katakanaRows: [],
  statsVisible: true,
  scoresVisible: true,
  activeBottomTab: null
};

const WRITING_SETTINGS = {
  ...READING_SETTINGS,
  keyboardMode: false,
  keyboardInputType: 'kana',
  choiceCount: 4
};

async function seedStableLocalState(page) {
  await page.addInitScript(({ readingSettings, writingSettings }) => {
    try {
      localStorage.clear();
      localStorage.setItem('settings', JSON.stringify(readingSettings));
    localStorage.setItem('reverseSettings', JSON.stringify(writingSettings));
    localStorage.setItem('charStats', JSON.stringify({}));
    localStorage.setItem('reverseCharStats', JSON.stringify({}));
    localStorage.setItem('charTimes', JSON.stringify({}));
    localStorage.setItem('reverseCharTimes', JSON.stringify({}));
    localStorage.setItem('charSrs', JSON.stringify({}));
    localStorage.setItem('reverseCharSrs', JSON.stringify({}));
    localStorage.setItem('scoreHistory', JSON.stringify({ endlessBest: { total: 0, correct: 0, wrong: 0 }, speedRunTop3: [], comboKanaBest: { same_row: 0, random: 0 }, timeTrialTop3: [] }));
    localStorage.setItem('reverseScoreHistory', JSON.stringify({ endlessBest: { total: 0, correct: 0, wrong: 0 }, speedRunTop3: [], comboKanaBest: { same_row: 0, random: 0 }, timeTrialTop3: [] }));
    localStorage.setItem('dailyChallengeHistory', JSON.stringify({}));
    localStorage.setItem('reverseDailyChallengeHistory', JSON.stringify({}));
    localStorage.setItem('highScore', '0');
    localStorage.setItem('reverseHighScore', '0');
    } catch (error) {
      // Initial about:blank documents may not allow localStorage. The app-origin page will.
    }
  }, { readingSettings: READING_SETTINGS, writingSettings: WRITING_SETTINGS });
}


async function gotoApp(page, path) {
  await page.route(/https:\/\/(www\.)?gstatic\.com\/.*/, route => route.abort());
  await page.route(/https:\/\/(www\.)?googleapis\.com\/.*/, route => route.abort());
  await page.goto(path, { waitUntil: 'commit', timeout: 5000 });
  await page.waitForSelector('body', { timeout: 5000 });
  await page.waitForTimeout(1000);
}

async function expectNoSevereConsoleErrors(page, run) {
  const severe = [];
  page.on('pageerror', error => severe.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') severe.push(message.text());
  });

  await run();

  const ignored = severe.filter(text => {
    // Firebase/network errors should not fail local static smoke tests when no real auth is configured.
    return !/firebase|firestore|auth|network|Failed to load resource|ERR_/i.test(text);
  });

  expect(ignored, `Unexpected browser errors:\n${ignored.join('\n')}`).toEqual([]);
}

test.describe('Mode Atlas core smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await seedStableLocalState(page);
  });

  test('home, kana hub, and results pages load key UI', async ({ page }) => {
    await expectNoSevereConsoleErrors(page, async () => {
      await gotoApp(page, '/');
      await expect(page.locator('#profileOpenBtn')).toBeVisible();
      await expect(page.locator('#branches')).toBeVisible();

      await gotoApp(page, '/kana/');
      await expect(page.locator('#kanaHub')).toBeVisible();
      await expect(page.locator('#kanaContinueAction')).toBeVisible();
      await expect(page.locator('#kanaMasteryGrid')).toBeVisible();

      await gotoApp(page, '/results/');
      await expect(page.locator('#testsGrid')).toBeVisible();
      await expect(page.locator('#testHeatmap')).toBeVisible();
    });
  });

  test('reading trainer starts, session controls work, and session can end', async ({ page }) => {
    await expectNoSevereConsoleErrors(page, async () => {
      await gotoApp(page, '/reading/');

      await expect(page.locator('#hiragana')).toBeVisible();
      await page.locator('#startBtn').click();

      await expect(page.locator('#sessionActions')).toBeVisible();
      await expect(page.locator('#skipKanaBtn')).toBeVisible();
      await expect(page.locator('#pauseSessionBtn')).toBeVisible();
      await expect(page.locator('#endSessionBtn')).toBeVisible();

      await page.locator('#pauseSessionBtn').click();
      await expect(page.locator('body')).toHaveClass(/ma-session-paused/);

      await page.locator('#pauseSessionBtn').click();
      await expect(page.locator('body')).not.toHaveClass(/ma-session-paused/);

      await page.locator('#skipKanaBtn').click();
      await expect(page.locator('#hint')).toContainText('Answer:', { timeout: 3000 });

      await page.locator('#endSessionBtn').click();
      await expect(page.locator('#sessionModalBackdrop')).toHaveClass(/open/);
    });
  });

  test('writing trainer starts, choice buttons answer, and session can end', async ({ page }) => {
    await expectNoSevereConsoleErrors(page, async () => {
      await gotoApp(page, '/writing/');

      await expect(page.locator('#prompt')).toBeVisible();
      await page.locator('#startBtn').click();

      await expect(page.locator('#sessionActions')).toBeVisible();
      await expect(page.locator('#choiceGrid button')).toHaveCount(4);

      await page.locator('#choiceGrid button').first().click();
      await expect(page.locator('#choiceGrid')).toBeVisible();

      await page.locator('#endSessionBtn').click();
      await expect(page.locator('#sessionModalBackdrop')).toHaveClass(/open/);
    });
  });

  test('mobile profile and settings drawers open and close', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await expectNoSevereConsoleErrors(page, async () => {
      await gotoApp(page, '/kana/');

      await page.locator('#profileOpenBtn').click();
      const profileDrawer = page.locator('#maSharedProfileDrawer, [data-ma-profile-drawer], .ma-profile-drawer').first();
      await expect(profileDrawer).toBeVisible();

      const settingsButton = page.locator('[data-ma-open-settings], #maOpenSettingsBtn, button:has-text("Settings")').first();
      await settingsButton.click();

      const settingsDrawer = page.locator('#maSharedSettingsDrawer, [data-ma-settings-drawer], .ma-settings-drawer').first();
      await expect(settingsDrawer).toBeVisible();

      const closeButton = settingsDrawer.locator('button[aria-label*="Close"], button:has-text("Close")').first();
      await closeButton.click();
      await expect(settingsDrawer).toBeHidden();
    });
  });
});
