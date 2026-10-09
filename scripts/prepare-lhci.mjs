import { cp, mkdir, rm } from 'node:fs/promises'

const targetRoot = new URL('../.lighthouse-dist/', import.meta.url)
const target = new URL('./global-audience-pulse/', targetRoot)
await rm(targetRoot, { recursive: true, force: true })
await mkdir(target, { recursive: true })
await cp(new URL('../dist/', import.meta.url), target, { recursive: true })
