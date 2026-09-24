// Cross-platform production entry: sets NODE_ENV before the server module loads (Windows, macOS, Linux).
export {}
process.env.NODE_ENV = 'production'
await import('./index')
