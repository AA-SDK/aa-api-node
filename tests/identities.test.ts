import { mockConfig, mockFetch } from './test-utils'
import { jest, describe, it, afterAll, expect } from '@jest/globals'
import { Client } from '../src/client'
import { Identities } from '../src/identities'

const _instance = 'instance'
const _client = 'client'
const _defaults = 'defaults'

describe('Identities', () => {
  const identities = Identities[_instance] as any
  identities[_client] = Client.use(mockConfig)
  const data = { identities: [{ id: 1 }] }
  const results = { results: [data, data] }

  afterAll(() => {
    jest.resetModules()
  })

  it('should automatically create a client', async () => {
    const identities = new Identities(mockConfig)
    mockFetch('http://api.example.com/v1/identities/byId?id=1', 200, data)
    await identities.byId(1)
    expect(identities[_client]).toBeDefined()
  })

  it('should set default options', () => {
    const identities = new Identities()
    const defaults = { template: 1234 }
    identities.setDefaults(defaults)
    expect(identities[_defaults]).toEqual(defaults)
  })

  it('should find identities by anything', async () => {
    mockFetch('http://api.example.com/v1/identities/byAny?phone=1231231234&firstName=John', 200, data)
    expect(await Identities.byAny({ phone: 1231231234, firstName: 'John' })).toEqual(data)
  })

  it('should find identities by device', async () => {
    mockFetch('http://api.example.com/v1/identities/byDevice?device=123456', 200, data)
    expect(await Identities.byDevice('123456')).toEqual(data)
  })

  it('should find identities by email', async () => {
    mockFetch('http://api.example.com/v1/identities/byEmail?email=john%40doe.org', 200, data)
    const result = await Identities.byEmail('john@doe.org')
    expect(result).toEqual(data)
  })

  it('should find identities by ID', async () => {
    mockFetch('http://api.example.com/v1/identities/byId?id=12345678', 200, data)
    const result = await Identities.byId(12345678)
    expect(result).toEqual(data)
  })

  it('should find identities by IP address', async () => {
    mockFetch('http://api.example.com/v1/identities/byIp?ip=123.123.123.123', 200, data)
    const result = await Identities.byIp('123.123.123.123')
    expect(result).toEqual(data)
  })

  it('should find identities by MD5 hash', async () => {
    mockFetch('http://api.example.com/v1/identities/byMd5?md5=abcd1234abcd1234abcd1234abcd1234', 200, data)
    const result = await Identities.byMd5('abcd1234abcd1234abcd1234abcd1234')
    expect(result).toEqual(data)
  })

  it('should find identities by phone number', async () => {
    mockFetch('http://api.example.com/v1/identities/byPhone?phone=1231231234', 200, data)
    const result = await Identities.byPhone(1231231234)
    expect(result).toEqual(data)
  })

  it('should find identities by personally-identifiable information', async () => {
    mockFetch('http://api.example.com/v1/identities/byPii?firstName=John&lastName=Doe&address=PO+Box+123&zip=12345', 200, data)
    const result = await Identities.byPii({ firstName: 'John', lastName: 'Doe', address: 'PO Box 123', zip: '12345' })
    expect(result).toEqual(data)
  })

  it('should find identities by VIN', async () => {
    mockFetch('http://api.example.com/v1/identities/byVehicle?vin=abc123', 200, data)
    const result = await Identities.byVehicle('abc123')
    expect(result).toEqual(data)
  })

  it('should find identities by multiple inputs', async () => {
    mockFetch('http://api.example.com/v1/identities/byId', 200, results)
    const result = await Identities.byId([12345678, 23456789])
    expect(result).toEqual(results)
  })
})
