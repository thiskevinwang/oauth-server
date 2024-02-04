import * as date from "date-fns";

import type { Env } from "@/types";

import { KeyValue } from "./internal";

export class VaultKV implements KeyValue {
  addr: string;
  namespace: string;
  roleId: string;
  secretId: string;

  lastLogin: Date | null = null;
  token: string | null = null;

  constructor(env: Env) {
    this.addr = env.VAULT_ADDR;
    this.namespace = env.VAULT_NAMESPACE || "admin";
    this.roleId = env.VAULT_ROLE_ID;
    this.secretId = env.VAULT_SECRET_ID;
  }

  // Authenticate with Vault
  // Note: tokens last 3600 seconds (1 hour)
  async login() {
    // ghetto-throttle login to every (10 minutes)
    if (this.lastLogin) {
      const now = new Date();
      const diff = date.differenceInMinutes(now, this.lastLogin);
      if (diff < 10) {
        return;
      }
    }

    const url = new URL("/v1/auth/approle/login", this.addr);
    const headers = new Headers();
    headers.set("X-Vault-Namespace", this.namespace);

    const body = JSON.stringify({
      role_id: this.roleId,
      secret_id: this.secretId,
    });

    const req = new Request(url, {
      method: "POST",
      headers,
      body,
    });

    const res = await fetch(req);
    if (res.status !== 200) {
      throw new Error("login failed");
    } else {
    }
    const data = await res.json();

    // @ts-expect-error - TODO(kevinwang) type data
    const token = data.auth.client_token;
    this.token = token;
    this.lastLogin = new Date();
  }

  async get(path = "tester") {
    const secretMountPath = "kv";

    const url = new URL(`/v1/${secretMountPath}/data/${path}`, this.addr);

    const headers = new Headers();
    headers.set("X-Vault-Namespace", this.namespace);
    headers.set("X-Vault-Token", this.token as string);

    const req = new Request(url.toString(), {
      method: "GET",
      headers,
    });

    const res = await fetch(req);
    const data = await res.json();

    // @ts-expect-error - TODO type data
    return data.data.data;
  }

  // util for creating/updating a secret
  async put(path = "tester", obj: any) {
    const secretMountPath = "kv";

    const url = new URL(`/v1/${secretMountPath}/data/${path}`, this.addr);
    const headers = new Headers();
    headers.set("X-Vault-Namespace", this.namespace);
    headers.set("X-Vault-Token", this.token as string);

    const req = new Request(url.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify({ data: obj }),
    });

    const res = await fetch(req);
    const data = await res.json();
  }
}
