// The look everyone sees. Change the name to switch profiles. profile1 and profile2 stay as earlier looks.
const DEFAULT_PROFILE = 'profile3';
window.AUTOHOUND_PROFILE = DEFAULT_PROFILE;
// Phones load the profile's mobile folder. Everything else, including tablets, loads desktop.
window.AUTOHOUND_DEVICE = /iPhone|iPod|Android.+Mobile|Windows Phone|IEMobile|BlackBerry|webOS|Opera Mini/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
// AUTOHOUND_BASE is the versioned folder from index.html (/v/<version>), so each push loads fresh files.
window.AUTOHOUND_LOOK = `${window.AUTOHOUND_BASE || ''}/profiles/${window.AUTOHOUND_PROFILE}/${window.AUTOHOUND_DEVICE}`;
document.write(`<link rel="icon" href="${window.AUTOHOUND_LOOK}/img/brand-profile.webp"><link rel="stylesheet" href="${window.AUTOHOUND_LOOK}/site.css">`);
