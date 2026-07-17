// Edge Function: envia push notification aos OUTROS membros da casa quando alguém conclui uma tarefa.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push@3.6.7"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contato@noratsapp.com.br"

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "")
    if (!jwt) return json({ error: "sem autenticação" }, 401)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: userData } = await admin.auth.getUser(jwt)
    const caller = userData?.user
    if (!caller) return json({ error: "usuário inválido" }, 401)

    const { householdId, title, actorName, actorEmoji, xp } = await req.json()
    if (!householdId) return json({ error: "sem householdId" }, 400)

    // o chamador precisa ser membro da casa
    const { data: mem } = await admin
      .from("memberships")
      .select("household_id")
      .eq("user_id", caller.id)
      .eq("household_id", householdId)
      .maybeSingle()
    if (!mem) return json({ error: "não é membro da casa" }, 403)

    // inscrições dos OUTROS membros
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, user_id, subscription")
      .eq("household_id", householdId)
      .neq("user_id", caller.id)

    const body = `${actorEmoji || ""} ${actorName || "Alguém"} concluiu "${title}"${xp ? ` · +${xp} XP` : ""}`.trim()
    const payload = JSON.stringify({ title: "No Rats 🐭", body, url: "https://www.noratsapp.com.br" })

    let sent = 0
    const stale: string[] = []
    await Promise.all((subs || []).map(async (row: any) => {
      try {
        await webpush.sendNotification(row.subscription, payload)
        sent++
      } catch (err: any) {
        const code = err?.statusCode
        if (code === 404 || code === 410) stale.push(row.id)
      }
    }))
    if (stale.length) await admin.from("push_subscriptions").delete().in("id", stale)

    return json({ sent, total: (subs || []).length })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
