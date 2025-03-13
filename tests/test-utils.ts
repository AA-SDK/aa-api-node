import { jest } from '@jest/globals'
import { Configuration } from '../src/client'

export const mockConfig: Configuration = {
  keyId: '1234123412341234',
  secret: '12345678123456781234567812345678',
  origin: 'http://api.example.com',
  timeout: 1e3,
  retries: 0,
  delay: 0,
  backoff: 1
}

export interface Fetchable extends Response {
  wait?: number
  req: RequestInit
}

export const fetches: Record<string, Fetchable > = {}

Object.assign(global, {
  fetch: async (url: string, request: RequestInit) => {
    const response: Fetchable = fetches[String(url)]
    response.req = request
    if (response.wait !== undefined) {
      await new Promise(resolve => setTimeout(resolve, response.wait))
      if (request.signal?.aborted === true) {
        request.signal.throwIfAborted()
      }
    }
    return response
  }
})

export const mockFetch = (url: string, status: number, data: any, wait?: number): void => {
  Object.assign(fetches, { [url]: { status, json: async () => data, wait } })
}

let now: number

export const mockNow = (time: number = 1741724659397): void => {
  now = time
  jest.spyOn(Date, 'now').mockImplementation(() => now)
}
