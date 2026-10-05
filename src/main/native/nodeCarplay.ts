/* eslint-disable @typescript-eslint/no-require-imports */
const nodeCarplay = require('node-carplay/node') as typeof import('node-carplay/node') & {
  default: new (config: import('../Globals').ExtraConfig) => import('node-carplay/node').default
}

// node-carplay is ESM; when required from the CJS native bundle the class is on `.default`.
export const CarplayNode = nodeCarplay.default

export const TouchAction = nodeCarplay.TouchAction
export const decodeTypeMap = nodeCarplay.decodeTypeMap
export type { AudioData } from 'node-carplay/node'

export type CarplayNodeInstance = InstanceType<typeof CarplayNode>
