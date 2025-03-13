import { createHash } from 'crypto'
import { readFileSync } from 'fs'
export * from './identities.ts'

const { env, version } = process

// istanbul ignore if
if (Number(version.split('.')[0]) < 22) {
  // Polyfill the fetch API for older node versions.
  global.fetch = require('node-fetch')
}

/**
 * The API client for communicating with the AA API.
 */
export class Client {
  private static readonly instances = new Map<string, Client>()

  /**
   * Get a client instance with the given configuration, or reuse if the configuration isn't unique.
   * @param configuration Client configuration options.
   * @returns A client instance.
   */
  public static use = (configuration?: Configuration): Client => {
    const key = JSON.stringify(configuration)
    let client = this.instances.get(key)
    if (client === undefined) {
      client = new this(configuration)
      this.instances.set(key, client)
    }
    return client
  }

  /** The API key ID to use for authentication. */
  private readonly keyId?: string

  /** The API key secret to use for authentication. */
  private readonly secret?: string

  /** The URL to use for communicating with the AA API. */
  private readonly origin?: string

  /** The timeout for requests to the AA API, in seconds. */
  private readonly timeout?: number

  /** The number of times to retry a request before throwing an error. */
  private readonly retries?: number

  /** The delay between retries, in milliseconds. */
  private readonly delay?: number

  /** The backoff factor for retry delays. */
  private readonly backoff?: number

  /** Reusable headers to send with outgoing requests. */
  private readonly headers: Record<string, string> = {
    // WARNING: Do not change. The build script replaces VERSION.
    'User-Agent': 'node aa-api <VERSION>'
  }

  /** Time that the current token will expire. */
  private tokenExpireTime = 0

  /** Required configuration variables. */
  private readonly requiredConfiguration: Array<[ConfigurationProperty, ConfigurationVariable]> = [
    ['keyId', 'AA_KEY_ID'],
    ['secret', 'AA_SECRET'],
    ['origin', 'AA_ORIGIN']
  ]

  /** Configuration environment variables and corresponding properties. */
  private readonly configurationProperties: Record<ConfigurationVariable, ConfigurationProperty> = {
    AA_KEY_ID: 'keyId',
    AA_SECRET: 'secret',
    AA_ORIGIN: 'origin',
    AA_TIMEOUT: 'timeout',
    AA_RETRIES: 'retries',
    AA_DELAY: 'delay',
    AA_BACKOFF: 'backoff'
  }

  /** Defaults for non-required configuration options. */
  private readonly configurationDefaults: Array<[ConfigurationProperty, ConfigurationValue, Function]> = [
    ['timeout', 1e4, Number],
    ['retries', 10, Number],
    ['delay', 1e3, Number],
    ['backoff', 1.5, Number]
  ]

  /**
   * @param configuration The client configuration.
   */
  constructor (configuration?: Configuration) {
    Object.assign(this, configuration)
  }

  /**
   * Load configuration from environment variables or a ".env" file.
   */
  loadConfiguration (): void {
    let found = 0
    const required = this.requiredConfiguration.length
    const configuration: Configuration = {}

    // Prefer direct configuration over environment variables.
    for (const [variable, property] of Object.entries(this.configurationProperties)) {
      const value = this[property] ?? env[variable]
      if (value !== undefined) {
        Object.assign(configuration, { [property]: value })
        found++
      }
    }

    // If some options aren't configured, try reading the ".env" file.
    if (found < required) {
      try {
        const content = readFileSync('.env', { encoding: 'utf8' })
        content.replace(/(AA_[A-Z_]+)\s*=\s*['"]?([^\r\n'"]+)/g, (_, variable: ConfigurationVariable, value: ConfigurationValue) => {
          const property = this.configurationProperties[variable]
          if (configuration[property] === undefined) {
            Object.assign(configuration, { [property]: value })
            found++
          }
          return _
        })
      } catch {}
    }

    // Set defaults for non-required configuration.
    for (const [property, value, fn] of this.configurationDefaults) {
      if (configuration[property] === undefined) {
        Object.assign(configuration, { [property]: value })
      } else {
        configuration[property] = fn(configuration[property])
      }
    }

    if (found < required) {
      for (const [property, variable] of this.requiredConfiguration) {
        if (configuration[property] === undefined) {
          throw new Error(`Missing "${property}" in client configuration. Pass configuration or add "${variable}" to an ".env" file in the current directory.`)
        }
      }
    }

    Object.assign(this, configuration)
  }

  /**
   * Generate a new token for authenticating with the API.
   */
  private generateToken (): void {
    // If a token hasn't been generated yet, load the configuration first.
    if (this.tokenExpireTime === 0) {
      this.loadConfiguration()
    }
    // If the token is still valid, use it.
    if (Date.now() < this.tokenExpireTime) {
      return
    }
    const now = Date.now().toString(32)
    const hash = createHash('md5').update(`${now}${this.secret as string}`).digest('hex')
    const token = `${this.keyId as string}${now}${hash}`
    this.headers.Authorization = `Bearer ${token}`
    this.tokenExpireTime = Date.now() + 18e5
  }

  /**
   * Process a request to the API.
   * @param href The request URL, relative to the API origin
   * @param options The request options
   * @returns
   */
  private async fetch (href: string, options: RequestInit): Promise<any> {
    const url = new URL(href, this.origin)
    const controller = new AbortController()
    const signal = controller.signal
    const timer = setTimeout(() => {
      controller.abort()
    }, this.timeout)
    try {
      const response = await fetch(url, { ...options, signal })
      clearTimeout(timer)
      const data = await response.json().catch(() => ({ error: 'Failed to parse response' }))
      if (data.error !== undefined) {
        throw new ApiError(data.error, response.status)
      }
      return data
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new TimeoutError(url, this.timeout as number)
      }
      clearTimeout(timer)
      throw error
    }
  }

  /**
   * Process a GET request to the API.
   * @param path The path to the API endpoint
   * @param body The query parameters to send
   * @returns The data returned by the API
   */
  public async get (path: string, query: Record<string, any>): Promise<any> {
    return await this.retry(async () => {
      this.generateToken()
      return await this.fetch(`${path}?${String(new URLSearchParams(query))}`, {
        method: 'GET',
        headers: this.headers
      })
    })
  }

  /**
   * Process a POST request to the API.
   * @param path The path to the API endpoint
   * @param body The data to send as JSON
   * @returns The data returned by the API
   */
  public async post (path: string, body: Record<string, any>): Promise<any> {
    return await this.retry(async () => {
      this.generateToken()
      return await this.fetch(path, {
        method: 'POST',
        headers: { ...this.headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
    })
  }

  /**
   * Try to execute an asynchronous function, and retry before throwing an error.
   * @param fn The function to execute.
   * @returns The result of the function.
   */
  private async retry<T> (fn: (...args: any) => Promise<T>): Promise<T> {
    let tries = 0
    let delay = this.delay as number
    while (true) {
      try {
        return await fn()
      } catch (error) {
        if (++tries > (this.retries as number)) {
          throw error
        }
        await new Promise(resolve => setTimeout(resolve, delay))
        delay *= this.backoff as number
      }
    }
  }
}

/**
 * Error returned by the API.
 */
export class ApiError extends Error {
  /**
     * @param message The error message.
     * @param statusCode The status code of the response.
     */
  constructor (message: string, statusCode: number) {
    super(`${statusCode}: ${message}`)
  }
}

/**
 * Error thrown when a request times out.
 */
export class TimeoutError extends Error {
  /**
     * @param url The URL that timed out.
     * @param timeout The timeout value, in milliseconds.
     */
  constructor (url: URL, timeout: number) {
    super(`Request to "${String(url)}" timed out after ${timeout / 1e3} seconds.`)
  }
}

/**
 * Configuration options for initializing the AA SDK.
 * @property keyId The AA API key ID to use for authentication
 * @property secret The AA API key secret to use for authentication
 * @property origin The URL to use for communicating with the AA API
 * @property timeout The timeout for requests to the AA API, in seconds
 * @property tries The number of times to retry a request before throwing an error
 */
export interface Configuration {
  keyId?: string
  secret?: string
  origin?: string
  timeout?: number
  retries?: number
  delay?: number
  backoff?: number
}

export type ConfigurationProperty = 'keyId' | 'secret' | 'origin' | 'timeout' | 'retries' | 'delay' | 'backoff'
export type ConfigurationVariable = 'AA_KEY_ID' | 'AA_SECRET' | 'AA_ORIGIN' | 'AA_TIMEOUT' | 'AA_RETRIES' | 'AA_DELAY' | 'AA_BACKOFF'
export type ConfigurationValue = string | number

/** Optional user-chosen ID to for relating responses to their inputs. */
export type RequestId = number | string

/** Optional ID of a template to use for querying and formatting. */
export type TemplateId = number

/** One or more values or objects to query by. */
export type Inputs<T> = T | T[]
