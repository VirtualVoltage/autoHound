# Visual profiles

Each folder here is one complete look for the site, including its layouts. `site/js/profile.js` picks the active one.

```text
profile1/
  site.css     colors, fonts, spacing
  views.js     HTML for the header, banner, footer and every page
  img/         brand-banner.webp, brand-profile.webp, and anything else it needs
```

Copy a profile folder to start a new one. `views.js` can arrange anything, but it has to export the same functions, and these elements must stay so the shared logic can attach to them.

| Page | Needed |
|---|---|
| Frame | `#main`, `#toast`. Optional: `#headLinks`, `#searchForm`, `#searchInput` |
| Home | `#windows`. Optional: `#minPrice`, `#maxPrice`, `[data-sort]`, `#emptyMsg`, `#moreBtn` |
| Log in, sign up | `#authForm`, `#username`, `#password`, `#authErr` |
| Listing | Optional: `#thumbs` with `#mainPhoto`, `#msgForm` with `#msgText` and `#msgErr`, `#bidForm` with `#bidAmt` and `#bidErr`, `#reportBtn`, `#soldBtn`, `#deleteBtn` |
| Sell | `#sellForm`, `#upGrid`, `#sPhotos`, `#photoErr`, `#sellPreview`, `#sellErr`, `#pubBtn`, and the `s*` form fields. `[data-for]`, `#sCategoryField`, `#sPriceLabel`, `#useEst` are used if present |
| Chat | `#thread`, `#attachPreview`, `#composer`, `#attachInput`, `#msgText` |
| Your account | `#logoutBtn`, `#photoInput` |

Favorite buttons use `data-act="favorite"`, `data-id` and `data-style`. Keep to the owner's rules in `AGENTS.md`, like never showing IDs in page text or market value on auctions.
