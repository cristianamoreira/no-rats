// Comprime uma imagem (câmera/galeria) para um Blob JPEG ~500px, qualidade 0.6.
// Rejeita a Promise em qualquer falha, para a UI poder avisar em vez de a foto sumir.
//
// Caminho preferencial: createImageBitmap decodifica direto do File — SEM o passo
// base64 (FileReader.readAsDataURL) — o que reduz muito o pico de memória e evita
// que o Android (pouca RAM) mate/recarregue a aba ao processar uma foto grande.
// Se não houver suporte, cai no caminho legado (FileReader + Image + canvas).
export async function compressImageToBlob(file) {
  const max = 500
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file)
      const blob = await drawToJpeg(bmp, max)
      if (bmp.close) bmp.close()
      if (blob) return blob
    } catch (_) {
      // formato sem suporte no createImageBitmap (ex.: alguns HEIC) → tenta o legado
    }
  }
  return legacyCompress(file, max)
}

function scaledDims(w, h, max) {
  if (w > h && w > max) return [max, Math.round((h * max) / w)]
  if (h >= w && h > max) return [Math.round((w * max) / h), max]
  return [w, h]
}

function drawToJpeg(source, max) {
  const [w, h] = scaledDims(source.width, source.height, max)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  c.getContext('2d').drawImage(source, 0, 0, w, h)
  return new Promise((resolve) => c.toBlob(resolve, 'image/jpeg', 0.6))
}

function legacyCompress(file, max) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Não consegui ler o arquivo da foto.'))
    reader.onload = (ev) => {
      const img = new Image()
      img.onerror = () => reject(new Error('Formato de imagem não suportado. Tente outra foto.'))
      img.onload = async () => {
        try {
          const blob = await drawToJpeg(img, max)
          blob ? resolve(blob) : reject(new Error('Não consegui processar a imagem.'))
        } catch (e) {
          reject(e instanceof Error ? e : new Error('Falha ao processar a imagem.'))
        }
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  })
}
