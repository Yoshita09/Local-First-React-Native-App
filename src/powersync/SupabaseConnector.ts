import {
  AbstractPowerSyncDatabase,
  CrudEntry,
  PowerSyncBackendConnector,
  UpdateType,
} from "@powersync/react-native";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-url-polyfill/auto";

const FATAL_RESPONSE_CODES = [
  new RegExp("^22...$"),
  new RegExp("^23...$"),
  new RegExp("^42501$"),
];

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string;
const powersyncUrl = process.env.EXPO_PUBLIC_POWERSYNC_URL as string;

export class SupabaseConnector implements PowerSyncBackendConnector {
  client: SupabaseClient;

  constructor() {
    if (!supabaseUrl || !supabaseKey || !powersyncUrl) {
      throw new Error("Missing Supabase or PowerSync env variables");
    }

    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: AsyncStorage,
      },
    });
  }

  async login(username: string, password: string) {
    const { error } = await this.client.auth.signInWithPassword({
      email: username,
      password,
    });

    if (error) {
      throw error;
    }
  }

  async fetchCredentials() {
    const {
      data: { session },
      error,
    } = await this.client.auth.getSession();

    if (!session || error) {
      throw new Error(`Could not fetch Supabase credentials: ${error}`);
    }

    return {
      client: this.client,
      endpoint: powersyncUrl,
      token: session.access_token ?? "",
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
      userID: session.user.id,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) return;

    let lastOp: CrudEntry | null = null;

    try {
      for (const op of transaction.crud) {
        lastOp = op;
        const table = this.client.from(op.table);
        let result: any = null;

        switch (op.op) {
          case UpdateType.PUT: {
            const record = { ...(op.opData ?? {}), id: op.id };
            result = await table.upsert(record);
            break;
          }

          case UpdateType.PATCH: {
            const patchData = op.opData ?? {};
            result = await table.update(patchData).eq("id", op.id);
            break;
          }

          case UpdateType.DELETE:
            result = await table.delete().eq("id", op.id);
            break;
        }

        if (result?.error) {
          throw new Error(
            `Could not ${op.op} data to Supabase: ${JSON.stringify(result)}`
          );
        }
      }

      await transaction.complete();
    } catch (ex: any) {
      if (
        typeof ex?.code === "string" &&
        FATAL_RESPONSE_CODES.some((regex) => regex.test(ex.code))
      ) {
        await transaction.complete();
      } else {
        throw ex;
      }
    }
  }
}