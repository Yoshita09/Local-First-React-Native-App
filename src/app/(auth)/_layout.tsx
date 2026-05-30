import { Ionicons } from "@expo/vector-icons";
import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import { TouchableOpacity } from "react-native";

import { supabase } from "../../lib/supabase";
import { system } from "../../powersync/PowerSync";

export default function AuthLayout() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const session = data.session;
      const onLoginPage = pathname === "/(auth)" || pathname === "/(auth)/";
      const onTodosPage = pathname.includes("/todos");

      if (session && onLoginPage) {
        router.replace("/(auth)/todos");
      }

      if (!session && onTodosPage) {
        router.replace("/(auth)");
      }
    };

    checkSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      if (session) {
        router.replace("/(auth)/todos");
      } else {
        router.replace("/(auth)");
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [pathname, router]);

  const signOut = async () => {
    await system.powersync.disconnectAndClear?.();
    await supabase.auth.signOut();
    router.replace("/(auth)");
  };

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Login" }} />
      <Stack.Screen
        name="todos"
        options={{
          title: "Todos",
          headerRight: () => (
            <TouchableOpacity onPress={signOut}>
              <Ionicons name="log-out-outline" size={24} color="black" />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
}