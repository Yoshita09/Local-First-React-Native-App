import "@azure/core-asynciterator-polyfill";
import "react-native-polyfill-globals/auto";
import { createContext, useContext } from "react";
import {
  AbstractPowerSyncDatabase,
  PowerSyncDatabase,
} from "@powersync/react-native";
import {
  PowerSyncKyselyDatabase,
  wrapPowerSyncWithKysely,
} from "@powersync/kysely-driver";

import { AppSchema, Database } from "./AppSchema";
import { SupabaseConnector } from "./SupabaseConnector";

export class System {
  supabaseConnector: SupabaseConnector;
  powersync: AbstractPowerSyncDatabase;
  db: PowerSyncKyselyDatabase<Database>;

  constructor() {
    this.supabaseConnector = new SupabaseConnector();

    this.powersync = new PowerSyncDatabase({
      schema: AppSchema,
      database: {
        dbFilename: "app.sqlite",
      },
    });

    this.db = wrapPowerSyncWithKysely<Database>(this.powersync);
  }

  async init() {
    await this.powersync.init();
    await this.powersync.connect(this.supabaseConnector);
  }
}

export const system = new System();
export const SystemContext = createContext(system);
export const useSystem = () => useContext(SystemContext);