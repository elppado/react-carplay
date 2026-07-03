import { DEFAULT_EXTRA_CONFIG } from '../../shared/defaultExtraConfig'
import { CarplayNativeApp } from './CarplayNativeApp'

const app = new CarplayNativeApp(DEFAULT_EXTRA_CONFIG)

const shutdown = async (signal: string): Promise<void> => {
  console.log(`[native] received ${signal}, shutting down`)
  await app.stop()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

app.start().catch((err: unknown) => {
  console.error('[native] fatal error:', err)
  process.exit(1)
})
