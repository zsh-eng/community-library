import { initTelegramSdk } from "@/lib/telegram";
import { useEffect, useState } from "react";
import "../mini-app.css";

function MiniApp() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initTelegramSdk().then(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <div>
      <h1>Mini App</h1>
      {/* Transfer your mini app components here */}
    </div>
  );
}

export default MiniApp;
