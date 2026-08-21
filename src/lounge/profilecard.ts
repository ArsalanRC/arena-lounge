/**
 * The host's live profile, shown INSIDE the welcome stele's reader panel so phones never
 * have to leave the app for a browser tab (Arsalan, 21 Aug). Only text comes from the
 * network (name + description via the peer profile lambda, one fetch per session, quiet
 * fallbacks); the face is the locally shipped images/host.jpg, which renders on every
 * client. The full web profile stays available behind an explicit button.
 */

/** The World owner's wallet (verified against the Worlds /permissions endpoint 20 Aug). */
export const HOST_ADDRESS = '0x3451a1e45b5f6b54c3c6a65d29db2584a53e5e9f'

export const hostCard = {
  state: 'idle' as 'idle' | 'loading' | 'ready' | 'failed',
  name: 'ArsalanRC',
  about: ''
}

/** Fetch name + description once; the panel renders whatever is here on each frame. */
export function loadHostCard(): void {
  if (hostCard.state !== 'idle') return
  hostCard.state = 'loading'
  fetch(`https://peer.decentraland.org/lambdas/profiles/${HOST_ADDRESS}`)
    .then(async (res) => {
      if (!res.ok) throw new Error(`profile ${res.status}`)
      const d = (await res.json()) as { avatars?: Array<{ name?: string; description?: string }> }
      const a = d.avatars?.[0]
      if (a?.name) hostCard.name = a.name
      hostCard.about = (a?.description ?? '').slice(0, 240)
      hostCard.state = 'ready'
    })
    .catch(() => {
      hostCard.state = 'failed' // the panel still shows the local face + greeting
    })
}
