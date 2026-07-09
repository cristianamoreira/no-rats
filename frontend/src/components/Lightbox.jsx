export default function Lightbox({ src, onClose }) {
  return (
    <div className="nr-lightbox" onClick={onClose}>
      <img src={src} alt="check-in" />
    </div>
  )
}
