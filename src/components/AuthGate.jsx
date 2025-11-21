import { useEffect, useState } from "react";
import { Supabase } from "../supabase";
export default function AuthGate({ sendSession, children }) {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    async function getSession() {
      const { data } = await Supabase.auth.getSession();
      setSession(data.session);
    }
    getSession();

    const { data: sub } = Supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );
  }, []);
  useEffect(() => {
    async function createProfileNote() {
      const { error } = await Supabase.from("Profiles").upsert([
        {
          id: session.user.id,
          email: session.user.email,
          updated_at: new Date().toISOString(),
        },
      ]);
      if (error) {
        console.error(error);
      }
    }
    if (session?.user) {
      createProfileNote();
    }
    sendSession(session);
  }, [session]);

  return <div>{children}</div>;
}
