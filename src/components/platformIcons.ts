import {
  InstagramLogo,
  LinkedinLogo,
  Newspaper,
  ThreadsLogo,
  TiktokLogo,
  XLogo,
  YoutubeLogo,
  type Icon,
} from '@phosphor-icons/react'
import type { PlatformId } from '../data/playbooks'

export const PLATFORM_ICONS: Record<PlatformId, Icon> = {
  instagram: InstagramLogo,
  tiktok: TiktokLogo,
  youtube: YoutubeLogo,
  linkedin: LinkedinLogo,
  x: XLogo,
  threads: ThreadsLogo,
  hackernews: Newspaper,
}
