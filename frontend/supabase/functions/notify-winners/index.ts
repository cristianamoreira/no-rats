// Edge Function: anuncia por push o vencedor da semana/mês aos membros da casa.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push@3.6.7"
import {
  periodWindow, computeWinners,
  winnerBodySelf, winnerBodyOther, ratBody,
  type Member, type LogEntry, type Period,
} from "./logic.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contato@noratsapp.com.br"
const CRON_SECRET = Deno.env.get("CRON_SECRET")!

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } })
}

const URL_APP = "https://www.noratsapp.com.br"

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    if ((req.headers.get("x-cron-secret") || "") !== CRON_SECRET) {
      return json({ error: "não autorizado" }, 401)
    }
    const { period } = await req.json() as { period?: Period }
    if (period !== "week" && period !== "month") {
      return json({ error: "period deve ser 'week' ou 'month'" }, 400)
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const today = new Date().toISOString().slice(0, 10)
    const pw = periodWindow(period, today)

    // Casas com ao menos uma inscrição de push.
    const { data: subRows } = await admin.from("push_subscriptions").select("household_id")
    const householdIds = [...new Set((subRows || []).map((r: any) => r.household_id))]

    const stale: string[] = []
    let pushesEnviados = 0
    let casasAnunciadas = 0

    for (const hid of householdIds) {
      const { data: hh } = await admin.from("households").select("data").eq("id", hid).maybeSingle()
      const data = (hh?.data || {}) as { members?: Member[]; log?: LogEntry[] }
      const members = data.members || []
      const log = data.log || []
      const { winners } = computeWinners(members, log, pw.inPeriod)

      // Dedupe: insere o registro do período; se já existia, pula a casa.
      const { data: inserted } = await admin
        .from("winner_announcements")
        .upsert(
          { household_id: hid, period_type: period, period_key: pw.key, winner_ids: winners.map((w) => w.id) },
          { onConflict: "household_id,period_type,period_key", ignoreDuplicates: true },
        )
        .select()
      if (!inserted || inserted.length === 0) continue // já anunciado
      casasAnunciadas++

      // Inscrições da casa.
      const { data: subs } = await admin
        .from("push_subscriptions")
        .select("id, user_id, subscription")
        .eq("household_id", hid)
      const subList = subs || []
      if (subList.length === 0) continue

      const send = async (sub: any, title: string, body: string) => {
        try {
          await webpush.sendNotification(sub.subscription, JSON.stringify({ title, body, url: URL_APP }))
          pushesEnviados++
        } catch (err: any) {
          const code = err?.statusCode
          if (code === 404 || code === 410) stale.push(sub.id)
        }
      }

      if (winners.length === 0) {
        // Ninguém pontuou: piada do rato para todos.
        await Promise.all(subList.map((s: any) => send(s, "No Rats 🐀", ratBody(period))))
      } else {
        // Um push por vencedor, em sequência (estilo Gym Rats).
        for (const w of winners) {
          await Promise.all(subList.map((s: any) => {
            const body = s.user_id === w.userId ? winnerBodySelf(period) : winnerBodyOther(period, w.name)
            return send(s, "No Rats 🏆", body)
          }))
        }
      }
    }

    if (stale.length) await admin.from("push_subscriptions").delete().in("id", stale)
    return json({ households: casasAnunciadas, pushesEnviados })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
