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
| Frame | `#main`, `#toast`. Optional: `#headLinks`, `#searchForm`, `#searchInput` |
| Home | `#windows`. Optional: `#minPrice`, `#maxPrice`, `[data-sort]`, `#emptyMsg`, `#moreBtn` |
| Log in, sign up | `#authForm`, `#username`, `#password`, `#authErr`, and `#email` on sign up |
| Listing | Optional: `#thumbs` with `#mainPhoto`, `#msgForm` with `#msgText` and `#msgErr`, `#bidForm` with `#bidAmt` and `#bidErr`, `#reportBtn`, `#soldBtn`, `#deleteBtn` |
| Sell | `#sellForm`, `#upGrid`, `#sPhotos`, `#photoErr`, `#sellPreview`, `#sellErr`, `#pubBtn`, and the `s*` form fields. `[data-for]`, `#sCategoryField`, `#sPriceLabel`, `#useEst` are used if present |
| Chat | `#thread`, `#attachPreview`, `#composer`, `#attachInput`, `#msgText` |
| Your account | `#logoutBtn`, `#photoInput` |
| Site inbox (admins) | Nothing required. Link rows to `/admin/<id>`, and keep email text as plain text, never HTML |

Favorite buttons use `data-act="favorite"`, `data-id` and `data-style`. Keep to the owner's rules in `AGENTS.md`, like never showing IDs in page text or market value on auctions.
