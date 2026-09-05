import { MongoClient } from 'mongodb'

export const createClient = (uri: string) => new MongoClient(uri)

export const connect = async (uri: string, dbName: string) => {
  const client = createClient(uri)
  await client.connect()
  return { client, db: client.db(dbName) }
}
