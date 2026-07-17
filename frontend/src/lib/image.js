// Comprime uma imagem (arquivo da câmera/galeria) para um Blob JPEG ~500px, qualidade 0.6.
// Rejeita a Promise em qualquer falha (formato não suportado, leitura, canvas) para que a
// UI possa avisar o usuário em vez de a foto sumir silenciosamente.
export function compressImageToBlob(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Não consegui ler o arquivo da foto.'))
    reader.onload = (ev) => {
      const img = new Image()
      img.onerror = () => reject(new Error('Formato de imagem não suportado. Tente outra foto.'))
      img.onload = () => {
        try {
          const max = 500
          let w = img.width
          let h = img.height
          if (w > h && w > max) {
            h = Math.round((h * max) / w)
            w = max
          } else if (h >= w && h > max) {
            w = Math.round((w * max) / h)
            h = max
          }
          const c = document.createElement('canvas')
          c.width = w
          c.height = h
          c.getContext('2d').drawImage(img, 0, 0, w, h)
          c.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Não consegui processar a imagem.'))),
            'image/jpeg',
            0.6
          )
        } catch (e) {
          reject(e instanceof Error ? e : new Error('Falha ao processar a imagem.'))
        }
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  })
}
