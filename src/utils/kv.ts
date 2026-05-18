import 'server-only'
import { kv } from '@vercel/kv'

export { kv }

export const likesKey = (postId: number) => `likes:${postId}`
export const likeCountKey = (postId: number) => `like_count:${postId}`
export const sharesKey = (postId: number) => `shares:${postId}`
