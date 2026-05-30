import { PropsWithChildren, useEffect, useState } from "react";
import { SystemContext, system } from "./PowerSync";

export function PowerSyncProvider({
  children,
}: PropsWithChildren) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await system.init();
        setReady(true);
      } catch (err) {
        console.error(err);
      }
    };

    init();
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <SystemContext.Provider value={system}>
      {children}
    </SystemContext.Provider>
  );
}