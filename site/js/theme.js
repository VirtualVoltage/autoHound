// Loads the active profile's page layouts. Logic in site/js calls these and never writes page HTML.
export const view = await import(`/profiles/${window.AUTOHOUND_PROFILE}/views.js`);
