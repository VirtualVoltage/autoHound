// Turns a flat list of paths into "what's directly inside this folder".
export function childrenOf(keys, folder) {
  const prefix = folder.replace(/\/$/, '') + '/', files = new Set(), folders = new Set();
  for (const k of keys) {
    if (!k.startsWith(prefix)) continue;
    const rest = k.slice(prefix.length), i = rest.indexOf('/');
    if (i < 0) files.add(rest); else folders.add(rest.slice(0, i));
  }
  return { files: [...files], folders: [...folders] };
}
export class TextHelpers {
  async readText(path) { const b = await this.readBytes(path); return b === null ? null : new TextDecoder().decode(b); }
  writeText(path, text) { return this.writeBytes(path, new TextEncoder().encode(text)); }
  async listFiles(folder) { return childrenOf(await this.listAll(folder.replace(/\/$/, '') + '/'), folder).files; }
  async listFolders(folder) { return childrenOf(await this.listAll(folder.replace(/\/$/, '') + '/'), folder).folders; }
  async exists(path) { return (await this.readBytes(path)) !== null; }
}
