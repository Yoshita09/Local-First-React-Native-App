import { Stack } from "expo-router";
import { PowerSyncProvider } from "../powersync/PowerSyncProvider";

export default function RootLayout() {
  return (
    <PowerSyncProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </PowerSyncProvider>
  );
}