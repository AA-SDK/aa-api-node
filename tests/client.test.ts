import { mockConfig, mockFetch, mockNow, fetches, Fetchable } from './test-utils.ts'
import { Client, ApiError, TimeoutError } from '../src/client.ts'
import { createHash } from 'crypto'
import { jest, describe, it, expect, afterAll } from '@jest/globals'

const { env } = process

const _loadConfiguration = 'loadConfiguration'
const _generateToken = 'generateToken'
const _headers = 'headers'

const overrideEnv = (): void => {
  env.AA_KEY_ID = 'k'
  env.AA_SECRET = 's'
  env.AA_ORIGIN = 'o'
}

const clearEnv = (): void => {
  delete process.env.AA_KEY_ID
  delete process.env.AA_SECRET
  delete process.env.AA_ORIGIN
  delete process.env.AA_TIMEOUT
  delete process.env.AA_RETRIES
  delete process.env.AA_DELAY
  delete process.env.AA_BACKOFF
}

describe('Client', () => {
  const client = Client.use(mockConfig)
  const config = mockConfig as any
  const overrides = { keyId: 'k', secret: 's', origin: 'o' }

  clearEnv()
  mockNow()

  afterAll(() => {
    jest.restoreAllMocks()
  })

  it('should set client configuration directly', () => {
    const client = Client.use(mockConfig)
    expect(client).toMatchObject(config)
  })

  it('should reuse clients with identical configuration', () => {
    const a = Client.use(mockConfig)
    const b = Client.use(mockConfig)
    expect(b).toStrictEqual(a)
  })

  it('should use environment variables', () => {
    overrideEnv()
    const client = new Client()
    client[_loadConfiguration]()
    expect(client).toMatchObject(overrides)
    clearEnv()
  })

  it('should prefer direct configuration over environment variables', () => {
    overrideEnv()
    const client = new Client(mockConfig)
    client[_loadConfiguration]()
    expect(client).toMatchObject(config)
    clearEnv()
  })

  it('should read an .env file', () => {
    const client = new Client()
    process.chdir('tests')
    client[_loadConfiguration]()
    process.chdir('../')
    expect(client).toMatchObject({ ...config, origin: 'http://env.example.com' })
  })

  it('should prefer environment variables over .env file entries', () => {
    env.AA_ORIGIN = 'http://var.example.com'
    const client = new Client()
    process.chdir('tests')
    client[_loadConfiguration]()
    process.chdir('../')
    expect(client).toMatchObject({ ...config, origin: 'http://var.example.com' })
    delete env.AA_ORIGIN
  })

  it('should throw an error if required options are missing', () => {
    const client = new Client()
    let error: any
    try {
      client[_loadConfiguration]()
    } catch (e) {
      error = e
    }
    expect(error.message).toBe('Missing "keyId" in client configuration. Pass configuration or add "AA_KEY_ID" to an ".env" file in the current directory.')
  })

  it('should generate a token correctly', () => {
    const now = Date.now().toString(36)
    const hash = createHash('md5').update(`${now}${mockConfig.secret as string}`).digest('hex')
    const expectedToken = `${mockConfig.keyId as string}${now}${hash}`
    client[_generateToken]()
    expect(client[_headers].Authorization).toBe(`Bearer ${expectedToken}`)
  })

  it('should process a GET request correctly', async () => {
    mockFetch('http://api.example.com/get?param=value', 200, { data: 'got' })
    expect(await client.get('/get', { param: 'value' })).toEqual({ data: 'got' })
  })

  it('should process a POST request correctly', async () => {
    mockFetch('http://api.example.com/post', 200, { data: 'posted' })
    expect(await client.post('/post', {})).toEqual({ data: 'posted' })
  })

  it('should throw an ApiError when the API returns an error', async () => {
    const client = Client.use(mockConfig)
    mockFetch('http://api.example.com/bad?', 400, { error: 'Bad Request' })
    await expect(client.get('/bad', {})).rejects.toThrow(ApiError)
  })

  it('should throw a TimeoutError when a request times out', async () => {
    mockFetch('http://api.example.com/wait?', 200, { data: 'waited' }, 1e3)
    const client = new Client({ ...mockConfig, timeout: 1 })
    await expect(client.get('/wait', {})).rejects.toThrow(TimeoutError)
  })

  it('should throw an error if the response is not JSON', async () => {
    fetches['http://api.example.com/text?'] = {
      status: 200,
      json: async () => {
        throw new SyntaxError('Not valid JSON')
      }
    } as unknown as Fetchable
    const client = new Client(mockConfig)
    await expect(client.get('/text', {})).rejects.toThrow(ApiError)
  })

  it('should retry if retries > 0', async () => {
    const client = Client.use({ ...mockConfig, retries: 1 })
    fetches['http://api.example.com/retry?'] = {
      status: 500,
      json: async () => {
        mockFetch('http://api.example.com/retry?', 200, { data: 'Success' })
        return { error: 'Internal Server Error' }
      }
    } as unknown as Fetchable
    expect(await client.get('/retry', {})).toEqual({ data: 'Success' })
  })
})
