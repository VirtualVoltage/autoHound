// Loads the active profile's page layouts. Logic in site/js calls these and never writes page HTML.
export const view = await import(`${window.AUTOHOUND_LOOK}/views.js`);
