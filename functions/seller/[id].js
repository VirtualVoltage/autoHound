// /seller/<id> with its own title and details for search engines.
import { cloudflarePage } from '../../server/adapters/cloudflare.js';
export const onRequestGet = cloudflarePage;
