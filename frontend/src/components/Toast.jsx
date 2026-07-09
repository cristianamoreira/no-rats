export default function Toast({ toast }) {
  if (!toast) return null
  return <div className="nr-toast">{toast}</div>
}
