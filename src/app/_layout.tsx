import { Stack } from "expo-router";
import { useEffect } from "react";
import { initDatabase } from "../lib/sqlite";

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}