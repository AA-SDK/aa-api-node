import { Resource } from './resource.ts'
import type { RequestId, TemplateId, Inputs } from './client.ts'

/**
 * The Identities API finds identities and their associated records by a variety of lookup fields.
 */
export class Identities extends Resource<IdentitiesOptions> {
  private static readonly instance = new this()

  public static byAny = this.instance.byAny
  public static byDevice = this.instance.byDevice
  public static byEmail = this.instance.byEmail
  public static byId = this.instance.byId
  public static byIp = this.instance.byIp
  public static byMd5 = this.instance.byMd5
  public static byPhone = this.instance.byPhone
  public static byPii = this.instance.byPii
  public static byVehicle = this.instance.byVehicle
  public static setDefaults = this.instance.setDefaults

  private readonly bys: Record<string, string> = {
    '/v1/identities/byDevice': 'device',
    '/v1/identities/byEmail': 'email',
    '/v1/identities/byId': 'id',
    '/v1/identities/byIp': 'ip',
    '/v1/identities/byMd5': 'md5',
    '/v1/identities/byPhone': 'phone',
    '/v1/identities/byVehicle': 'vin'
  }

  private readonly find = async (path: string, inputs: Inputs<any>, options: IdentitiesOptions): Promise<IdentitiesResponse> => {
    if (Array.isArray(inputs)) {
      const body = { ...this.defaults, ...options, inputs }
      return await this.client.post(path, body)
    } else {
      const query = { ...this.defaults, ...options, ...(typeof inputs === 'object' ? inputs : { [this.bys[path]]: inputs }) }
      return await this.client.get(path, query)
    }
  }

  /**
   * Return identities matching any combination of inputs.
   * @return The list of identities
   */
  public byAny = async (inputs: Inputs<IdentityInput>, options: IdentitiesOptions = {}): Promise<IdentitiesResponse> => await this.find('/v1/identities/byAny', inputs, options)

  /**
   * Return identities with specific device IDs.
   * @return The list of identities
   */
  public byDevice = async (inputs: Inputs<string>, options: IdentitiesOptions = {}): Promise<IdentitiesResponse> => await this.find('/v1/identities/byDevice', inputs, options)

  /**
   * Return identities with specific email addresses.
   * @return The list of identities
   */
  public byEmail = async (inputs: Inputs<string>, options: IdentitiesOptions = {}): Promise<IdentitiesResponse> => await this.find('/v1/identities/byEmail', inputs, options)

  /**
   * Return identities with specific Audience Acuity IDs.
   * @return The list of identities
   */
  public byId = async (inputs: Inputs<number>, options: IdentitiesOptions = {}): Promise<IdentitiesResponse> => await this.find('/v1/identities/byId', inputs, options)

  /**
   * Return identities with specific IP addresses.
   * @return The list of identities
   */
  public byIp = async (inputs: Inputs<string>, options: IdentitiesOptions = {}): Promise<IdentitiesResponse> => await this.find('/v1/identities/byIp', inputs, options)

  /**
   * Return identities with specific MD5 lowercase email hashes.
   * @return The list of identities
   */
  public byMd5 = async (inputs: Inputs<string>, options: IdentitiesOptions = {}): Promise<IdentitiesResponse> => await this.find('/v1/identities/byMd5', inputs, options)

  /**
   * Return identities with specific phone numbers
   * @return The list of identities
   */
  public byPhone = async (inputs: Inputs<number | string>, options: IdentitiesOptions = {}): Promise<IdentitiesResponse> => await this.find('/v1/identities/byPhone', inputs, options)

  /**
   * Return identities with specific phone numbers.
   * @return The list of identities
   */
  public byPii = async (inputs: Inputs<IdentityPii>, options: IdentitiesOptions = {}): Promise<IdentitiesResponse> => await this.find('/v1/identities/byPii', inputs, options)

  /**
   * Return identities with specific vehicle identification numbers.
   * @return The list of identities
   */
  public byVehicle = async (inputs: Inputs<string>, options: IdentitiesOptions = {}): Promise<IdentitiesResponse> => await this.find('/v1/identities/byVehicle', inputs, options)
}

export interface IdentityPii {
  firstName?: string
  lastName?: string
  address?: string
  zip?: string
}

export interface IdentityInput {
  address?: string
  device?: string
  email?: string
  firstName?: string
  id?: number
  ip?: string
  lastName?: string
  phone?: number | string
  vin?: string
  zip?: string
}

export interface IdentitiesOptions {
  request?: RequestId
  template?: TemplateId
}

export interface IdentityData {
  [property: string]: any
}

export interface IdentitiesResultResponse {
  requestId?: RequestId
  identities: IdentityData[]
}

export interface IdentitiesResultsResponse {
  requestId?: RequestId
  results: Array<{
    identities: IdentityData[]
  }>
}

export type IdentitiesResponse = IdentitiesResultResponse | IdentitiesResultsResponse
