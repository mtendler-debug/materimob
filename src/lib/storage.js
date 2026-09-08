// Chaves do Supabase Storage rejeitam acento e alguns caracteres do nome
// original do arquivo ("Invalid key") — normaliza antes de montar o path.
export function sanitizeFileName(name) {
  const normalized = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9.\-]+/g, "-");
  return normalized.replace(/-+/g, "-");
}

export function storageKeyFor(userId, file) {
  return `${userId}/${Date.now()}-${sanitizeFileName(file.name)}`;
}
