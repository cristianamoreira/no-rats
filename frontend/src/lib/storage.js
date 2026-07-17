import { supabase } from './supabase'

const BUCKET = 'checkins'

// Sobe uma foto de check-in (Blob JPEG) para o Storage e devolve a URL pública.
// O caminho é escopado por casa (primeiro segmento = householdId) para casar com a
// policy de RLS do Storage, e recebe um sufixo aleatório para não ser adivinhável.
export async function uploadCheckinPhoto(householdId, routineId, blob) {
  const rand = Math.random().toString(36).slice(2, 10)
  const path = `${householdId || 'sem-casa'}/${routineId || 'r'}-${Date.now()}-${rand}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw new Error(error.message || 'Falha ao enviar a foto.')
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
