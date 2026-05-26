const { createClient } = require('redis');

const client = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
  },
});

client.on('error', (err) => console.error('Redis error:', err));
client.on('connect', () => console.log('Redis connected'));

const connect = async () => {
  if (!client.isOpen) await client.connect();
};

const set = async (key, value, ttlSeconds) => {
  await connect();
  const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (ttlSeconds) {
    await client.setEx(key, ttlSeconds, serialized);
  } else {
    await client.set(key, serialized);
  }
};

const get = async (key) => {
  await connect();
  const val = await client.get(key);
  if (!val) return null;
  try { return JSON.parse(val); } catch { return val; }
};

const del = async (key) => {
  await connect();
  await client.del(key);
};

// 랭킹용 Sorted Set
const zAdd = async (key, score, member) => {
  await connect();
  await client.zAdd(key, [{ score, value: member }]);
};

const zRangeWithScores = async (key, start, stop) => {
  await connect();
  return client.zRangeWithScores(key, start, stop, { REV: true });
};

const zRank = async (key, member) => {
  await connect();
  return client.zRevRank(key, member);
};

module.exports = { client, connect, set, get, del, zAdd, zRangeWithScores, zRank };
