import { useRequest } from 'vue-request'
import { invoke } from '@tauri-apps/api'

// Interact with the backend.
enum url {
  greet = 'greet',
}

export function greet() {
  const { data, loading, error, run }
        = useRequest(
          (name: string) => invoke(url.greet, { name }),
          { manual: true },
        )
  return { data, loading, error, run }
}
