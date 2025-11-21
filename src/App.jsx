import { useState } from "react";
import AuthGate from "./components/AuthGate";
import Login from "./components/Login";
import Profile from "./components/Profile";
function App() {
  const [session, setSession] = useState(undefined);
  function handleSession(session) {
    setSession(session);
  }
  return (
    <AuthGate sendSession={handleSession}>
      {session === undefined ? (
        <div>Загрузка...</div>
      ) : session ? (
        <Profile session={session} />
      ) : (
        <Login session={session} />
      )}
    </AuthGate>
  );
}

export default App;
