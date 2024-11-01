import { readFile } from 'node:fs/promises'

export async function imageB64(input) {
  let buffer;
  let contentType;

  if (input.startsWith('http://') || input.startsWith('https://')) {
    // Fetch para URL remotas
    const response = await fetch(input);
    if (!response.ok) throw new Error('Error al cargar la imagen');
    contentType = response.headers.get('content-type');
    buffer = await response.arrayBuffer();
  } else {
    // ReadFile para archivos locales
    buffer = await readFile(input);
    const ext = input.split('.').pop().toLowerCase();
    contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  }

  const base64String = Buffer.from(buffer).toString('base64');
  return `data:${contentType};base64,${base64String}`;
}
