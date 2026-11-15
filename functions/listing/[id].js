// /listing/<id> with its own title and details for search engines. The edit page is unchanged.
import { cloudflarePage } from '../../server/adapters/cloudflare.js';
export const onRequestGet = cloudflarePage;
