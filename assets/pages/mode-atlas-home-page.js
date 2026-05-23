const topProfileDot = document.getElementById('topProfileDot');
const identityAvatar = document.getElementById('identityAvatar');

function updateTopProfileDot() {
  const user = window.KanaCloudSync?.getUser?.();
  if (user?.photoURL) {
    const image = document.createElement('img');
    image.src = user.photoURL;
    image.alt = '';
    topProfileDot.replaceChildren(image);
  } else {
    topProfileDot.textContent = user?.displayName?.trim()?.[0]?.toUpperCase() || 'M';
  }
}

try {
  if (window.KanaCloudSync) {
    window.KanaCloudSync.bindUi({
      signInBtn: document.getElementById('identitySignInBtn'),
      signOutBtn: document.getElementById('identitySignOutBtn'),
      statusEl: document.getElementById('identityStatus'),
      nameEl: document.getElementById('identityName'),
      emailEl: document.getElementById('identityEmail'),
      photoEl: identityAvatar
    });

    window.KanaCloudSync.ready.then(updateTopProfileDot);
    document.getElementById('identitySignInBtn')?.addEventListener('click', () => window.ModeAtlasLifecycle?.requestUiRefresh?.('home-sign-in'));
    document.getElementById('identitySignOutBtn')?.addEventListener('click', () => window.ModeAtlasLifecycle?.requestUiRefresh?.('home-sign-out'));
  }
} catch (error) {
  console.warn('Cloud profile controls could not load.', error);
  const status = document.getElementById('identityStatus');
  if (status) status.textContent = 'Profile is available, but cloud sign-in could not load on this page.';
}
