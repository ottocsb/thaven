import {useRequest} from 'vue-request'
import {invoke} from '@tauri-apps/api'

// Interact with the backend.
enum url {
    greet = 'greet',
}

export const greet = () => {
    const {data, loading, error, run} =
        useRequest(
            (name:String) => invoke(url.greet, {name: name}),
            {manual: true,}
        )
    return {data, loading, error, run}
}
