# Visual profiles

Each folder here is one complete look for the site, including its layouts. `site/js/profile.js` picks the active one, and loads `mobile` on phones and `desktop` on everything else, including tablets.

```text
profile1/
  desktop/
    site.css     colors, fonts, spacing
    views.js     HTML for the header, footer and every page
    img/         brand-banner.webp, brand-profile.webp, and anything else it needs
    *.js         optional visual effects, imported from views.js
  mobile/        the same files, with changes that suit phones
```

Copy a profile folder to start a new one. Most changes belong in both `desktop` and `mobile`. `views.js` can arrange anything, but it has to export the same functions, and these elements must stay so the shared logic can attach to them.

| Page | Needed |
|---|---|
| Frame | `#main`, `#toast`. Optional: `#headLinks`, `#searchForm`, `#searchInput`, and `#sideNav` filled by an exported `sideNav({ account, path })` |
| Edit listing | `#editForm`, `#editErr`, and the `e*` fields that apply |
| Home | `#windows`. Optional: `#minPrice`, `#maxPrice`, `[data-sort]`, `#emptyMsg`, `#moreBtn` |
| Log in, sign up | `#authForm`, `#password`, `#authErr`. Sign up: `#username`, `#email`. Log in: `#login`. Login code step: `#codeForm`, `#loginCode`, `#codeErr` |
| Your account, security | `#loginCodesBtn` with `data-on`, `#securityErr` |
| Listing | Optional: `#thumbs` with `#mainPhoto`, `#msgForm` with `#msgText` and `#msgErr`, `#bidForm` with `#bidAmt` and `#bidErr`, `#reportBtn`, `#soldBtn`, `#deleteBtn` |
| Sell | `#sellForm`, `#upGrid`, `#sPhotos`, `#photoErr`, `#sellPreview`, `#sellErr`, `#pubBtn`, and the `s*` form fields. `[data-for]`, `#sCategoryField`, `#sPriceLabel`, `#useEst` are used if present |
| Chat | `#thread`, `#attachPreview`, `#composer`, `#attachInput`, `#msgText` |
| Chat on the listing page | `#chatBox` with the chat elements above, `#chatTabs` with `[data-chat]` buttons for sellers, and `export const chatOnListing = true` |
| Your account | `#logoutBtn`, `#photoInput` |
| Confirm email | `#verifyForm`, `#code`, `#verifyErr`, `#resendBtn` |
| Site inbox (admins) | Nothing required. Link rows to `/admin/<id>`, and keep email text as plain text, never HTML |

## HTML first

`views.js` runs in the browser and on the server (`server/pages.js` builds every page with it), so pages must work as plain HTML with JavaScript off (see `AGENTS.md`):

- Never touch `window` or `document` at the top of `views.js`. Use `pagePath()` and `profileAsset()` from `site/js/util.js`. Effects like `logo.js` only start in the browser.
- Every action is a link or a form with a real `action`, `method` and `name`d fields. The forms post to page addresses the server knows: `/login`, `/login/code`, `/signup`, `/logout`, `/verify`, `/verify/resend`, `/saved`, `/sell`, `/listing/<address>/message`, `/bid`, `/sold`, `/delete`, `/admin-delete`, `/edit`, `/messages/<chat>`, `/account/photo`, `/account/email`, `/account/login-codes`. The header search is a GET form to `/` with `q`.
- Things the server fills in: the home grid (`listings`, `favorites`, `moreHref`), the chat box (`chat.messages`, `chat.action`), the photo shown (`at`, from `?photo=`), the delete and admin delete steps (`confirmDelete`, `adminOpen`), the sell preview (`preview`) and the map list (`mapPage(data)`). Error lines (`#authErr` and the rest) and `#toast` get filled by ID, so keep those IDs.
- Thumbnails and photo arrows are `?photo=` links, sort buttons are submit buttons, buyer tabs are `?chat=` links. The shared logic stops these from reloading the page when JavaScript runs.
- Give controls that only work with JavaScript the `js-only` class, and no-JavaScript extras `nojs-only` (each `site.css` hides them at the right time).

Favorite buttons use `data-act="favorite"`, `data-id` and `data-style`. Keep to the owner's rules in `AGENTS.md`, like never showing IDs in page text or market value on auctions.
