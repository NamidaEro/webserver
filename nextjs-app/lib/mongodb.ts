import { MongoClient, ServerApiVersion } from 'mongodb';

const uri = process.env.MONGODB_URI;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-unused-vars
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!uri) {
  throw new Error('MongoDB URI가 환경 변수에 설정되지 않았습니다. .env 파일을 확인해주세요.');
}

if (process.env.NODE_ENV === 'development') {
  // 개발 환경에서는 hot reloading 시 매번 새 연결을 만드는 것을 방지하기 위해
  // global_mongoClientPromise를 사용합니다.
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise; // 이 시점에는 global._mongoClientPromise가 반드시 할당되어 있음
} else {
  // 프로덕션 환경에서는 새 연결을 만듭니다.
  const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
  clientPromise = client.connect();
}

export default clientPromise; 