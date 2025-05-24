import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined');
}

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // 개발 환경에서는 전역 변수를 사용하여 연결 재사용
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // 프로덕션 환경에서는 새로운 연결 생성
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export interface DatabaseConnection {
  client: MongoClient;
  db: Db;
}

export async function connectToDatabase(): Promise<DatabaseConnection> {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || 'wow_auction');
  return { client, db };
}

export default clientPromise; 