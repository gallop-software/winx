import 'server-only'
import { kv } from '@vercel/kv'

export { kv }

export const likesKey = (postId: number) => `likes:${postId}`
export const likeCountKey = (postId: number) => `like_count:${postId}`
export const shareCountKey = (postId: number) => `share_count:${postId}`
