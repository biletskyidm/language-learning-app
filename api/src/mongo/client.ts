import { MongoClient } from 'mongodb'

export const connect = async (uri: string, dbName: string) => {
  const client = new MongoClient(uri)
  await client.connect()
  return { client, db: client.db(dbName) }
}
