import { Client, Configuration } from './client.ts'
import { EventEmitter } from 'events'

/**
 * Base class for AA API resources
 *
 * @ignore No public constructor or functions
 */
export class Resource<Options> extends EventEmitter {
  #client?: Client
  protected defaults?: Options

  /**
   * @param client client The configured AA API client
   */
  constructor (configuration?: Configuration) {
    super()
    this.once('init', () => {
      this.#client = Client.use(configuration)
    })
  }

  protected get client (): Client {
    return this.#client ?? (this.emit('init'), this.#client as unknown as Client)
  }

  protected set client (client: Client) {
    this.#client = client
  }

  /**
   * Set default options for all requests.
   * @param options
   */
  public setDefaults = (options: Options): this => {
    this.defaults = { ...this.defaults, ...options }
    return this
  }
}
