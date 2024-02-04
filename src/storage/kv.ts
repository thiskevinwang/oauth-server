import type { Env } from "@/types";

import { KeyValue } from "./internal";

export class CloudflareKV implements KeyValue {
  kvBinding: KVNamespace;
  constructor(env: Env) {
    this.kvBinding = env.DATASTORE;
  }

  async get<T = any>(path: string) {
    return this.kvBinding.get<T>(path, "json");
  }

  async put(path: string, value: any) {
    return this.kvBinding.put(path, JSON.stringify(value));
  }
}
