export function compressImage(file, cb) {
  const reader = new FileReader()
  reader.onload = (ev) => {
    const img = new Image()
    img.onload = () => {
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
      cb(c.toDataURL('image/jpeg', 0.6))
    }
    img.src = ev.target.result
  }
  reader.readAsDataURL(file)
}
