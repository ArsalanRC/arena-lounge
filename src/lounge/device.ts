/**
 * Device helpers shared by the UI, the table systems and the sprite atlas. Kept free of
 * scene/UI imports so any module may import it without cycles.
 */
import { isMobile } from '@dcl/sdk/platform'
import { DEBUG_MOBILE_UI } from './config'

/** True on the phone client (or when the phone layout is being emulated). */
export function phone(): boolean {
  return DEBUG_MOBILE_UI || isMobile()
}
