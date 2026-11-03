import PocketBase, { type RecordModel } from 'pocketbase'

export default defineNuxtPlugin(() => {
  const pb = new PocketBase(useRuntimeConfig().public.pbUrl || window.location.origin)
  pb.autoCancellation(false)
  const user = useState<RecordModel | null>('user', () => pb.authStore.record)
  pb.authStore.onChange((_, record) => { user.value = record })
  return { provide: { pb } }
})
