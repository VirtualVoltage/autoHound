// The active look. Change the name to switch profiles.
window.AUTOHOUND_PROFILE = 'profile2';
// Phones load the profile's mobile folder. Everything else, including tablets, loads desktop.
window.AUTOHOUND_DEVICE = /iPhone|iPod|Android.+Mobile|Windows Phone|IEMobile|BlackBerry|webOS|Opera Mini/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
window.AUTOHOUND_LOOK = `/profiles/${window.AUTOHOUND_PROFILE}/${window.AUTOHOUND_DEVICE}`;
document.write(`<link rel="icon" href="${window.AUTOHOUND_LOOK}/img/brand-profile.webp"><link rel="stylesheet" href="${window.AUTOHOUND_LOOK}/site.css">`);
