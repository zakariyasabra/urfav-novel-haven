// Portable OAuth wrapper — uses standard supabase.auth.signInWithOAuth.
// No Lovable-only infrastructure. Works with any external Supabase project.
import { supabase } from "../supabase/client";

type Provider = "google" | "apple" | "microsoft" | "github" | "facebook";
type SignInOptions = { redirect_uri?: string; extraParams?: Record<string, string> };

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: Provider, opts?: SignInOptions) => {
      const providerMap: Record<Provider, "google" | "apple" | "azure" | "github" | "facebook"> = {
        google: "google",
        apple: "apple",
        microsoft: "azure",
        github: "github",
        facebook: "facebook",
      };
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: providerMap[provider],
        options: {
          redirectTo: opts?.redirect_uri ?? `${window.location.origin}/`,
          queryParams: opts?.extraParams,
        },
      });
      if (error) return { error, redirected: false };
      return { redirected: true, url: data.url };
    },
  },
};
