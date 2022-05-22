import {
  createClient,
  RedisClientType,
  RedisModules,
  RedisFunctions,
  RedisScripts,
} from "redis";

export class RedisClient {
  private static client: RedisClientType<
    any & RedisModules,
    RedisFunctions,
    RedisScripts
  >;

  async getClient() {
    if (RedisClient.client && RedisClient.client.isOpen) {
      return RedisClient.client;
    }

    RedisClient.client = createClient({
      url: process.env.REDISPUBSUB.trim().split("|")[0],
      password: process.env.REDISPUBSUB.trim().split("|")[1],
    });

    await RedisClient.client.connect();

    return RedisClient.client;
  }
}
