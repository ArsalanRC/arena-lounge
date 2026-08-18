/**
 * Suggestion box: one signed POST to the `feedback` Edge Function (see
 * supabase/functions/feedback). Signed with the player's identity so the note
 * carries its author and one wallet cannot flood the table. Never throws.
 */
import { signedFetch } from '~system/SignedFetch'
import { LEADERBOARD } from './config'
import { uiLang } from './i18n'
import { local, me } from './tables'

export function feedbackEnabled(): boolean {
  return LEADERBOARD.url !== '' && LEADERBOARD.key !== ''
}

/** Send the note in local.feedbackText; updates local.feedbackState. */
export async function sendFeedback(): Promise<void> {
  const text = local.feedbackText.trim()
  if (!feedbackEnabled() || text.length < 3 || local.feedbackState === 'sending') return
  local.feedbackState = 'sending'
  try {
    const res = await signedFetch({
      url: `${LEADERBOARD.url}/functions/v1/feedback`,
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: LEADERBOARD.key },
        body: JSON.stringify({ name: me.name, text, lang: uiLang.code, where: `floor ${local.floor}` })
      }
    })
    if (!res.ok) throw new Error(`feedback ${res.status} ${res.body}`)
    local.feedbackState = 'sent'
    local.feedbackText = ''
  } catch (e) {
    console.log('[arena] feedback failed', e)
    local.feedbackState = 'failed'
  }
}
