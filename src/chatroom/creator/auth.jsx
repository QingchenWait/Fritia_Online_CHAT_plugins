import React from "react";
import { createClient } from "@supabase/supabase-js";
import { verifyGitHubToken } from "./submission.mjs";

const url = import.meta.env.VITE_SUPABASE_URL || "";
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
export const isSubmissionConfigured = /^https:\/\//.test(url) && Boolean(key);
export const attachmentBucket = import.meta.env.VITE_SUPABASE_BUCKET || "character-card-attachments";
const storageKey = "heim-creator-github-provider";
const transientStorage = new Map();
const tabStorage = {
  getItem: (name) => { try { return sessionStorage.getItem(name); } catch { return transientStorage.get(name) || null; } },
  setItem: (name, value) => { try { sessionStorage.setItem(name, value); } catch { transientStorage.set(name, value); } },
  removeItem: (name) => { try { sessionStorage.removeItem(name); } catch { transientStorage.delete(name); } },
};
const client = isSubmissionConfigured ? createClient(url, key, {
  auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: tabStorage, storageKey: "heim-creator-session" },
}) : null;
const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = React.useState({ loading: Boolean(client), user: null, session: null, token: "", error: "" });
  const verifySequence = React.useRef(0);
  React.useEffect(() => {
    if (!client) return undefined;
    let active = true;
    const verify = async (session) => {
      const sequence = ++verifySequence.current;
      if (!session) {
        tabStorage.removeItem(storageKey);
        if (active) setState({ loading: false, user: null, session: null, token: "", error: "" });
        return;
      }
      let saved = {};
      try { saved = JSON.parse(tabStorage.getItem(storageKey) || "{}"); } catch { /* Reauthorization recovers an invalid saved session. */ }
      const token = session.provider_token || (saved.userId === session.user.id ? saved.token : "");
      if (!token) {
        if (active) setState({ loading: false, user: null, session: null, token: "", error: "请重新使用 GitHub 登录，以获取投稿授权。" });
        return;
      }
      try {
        const user = await verifyGitHubToken(token);
        const githubIdentity = session.user.identities?.find((identity) => identity.provider === "github");
        const githubId = githubIdentity?.identity_data?.sub || githubIdentity?.identity_data?.provider_id || githubIdentity?.id;
        if (String(githubId) !== String(user.id)) throw new Error("授权账号不一致，请重新使用 GitHub 登录。");
        if (!active || sequence !== verifySequence.current) return;
        tabStorage.setItem(storageKey, JSON.stringify({ token, userId: session.user.id }));
        setState({ loading: false, user, session, token, error: "" });
        if (new URLSearchParams(location.search).get("view") === "submit") {
          history.replaceState({}, "", `${location.pathname}#submit`);
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        }
      } catch (error) {
        if (!active || sequence !== verifySequence.current) return;
        tabStorage.removeItem(storageKey);
        setState({ loading: false, user: null, session: null, token: "", error: error.message });
      }
    };
    // Do not await Supabase auth methods inside an onAuthStateChange callback.
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (session?.provider_token) tabStorage.setItem(storageKey, JSON.stringify({ token: session.provider_token, userId: session.user.id }));
      setTimeout(() => { if (active) verify(session); }, 0);
    });
    client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setState({ loading: false, user: null, session: null, token: "", error: "登录暂时不可用，请重新登录。" });
      else verify(data.session);
    }).catch(() => { if (active) setState({ loading: false, user: null, session: null, token: "", error: "无法连接登录服务，请稍后重试。" }); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  const signIn = async () => {
    if (!client) return;
    setState((value) => ({ ...value, loading: true, error: "" }));
    const callback = new URL(location.pathname, location.origin);
    callback.searchParams.set("view", "submit");
    try {
      const { error } = await client.auth.signInWithOAuth({ provider: "github", options: { scopes: "public_repo", redirectTo: callback.href } });
      if (error) throw error;
    } catch {
      setState((value) => ({ ...value, loading: false, error: "GitHub 登录暂时不可用，请稍后重试。" }));
    }
  };
  const signOut = async () => {
    ++verifySequence.current;
    tabStorage.removeItem(storageKey);
    setState({ loading: false, user: null, session: null, token: "", error: "" });
    try { await client?.auth.signOut({ scope: "local" }); } catch { /* The in-tab credentials were already discarded. */ }
  };
  return <AuthContext.Provider value={{ ...state, client, configured: isSubmissionConfigured, bucket: attachmentBucket, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export const useCreatorAuth = () => React.useContext(AuthContext);
