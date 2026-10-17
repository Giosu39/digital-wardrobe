import { CheckCircle2, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Kind = "success" | "error";
interface ToastMsg {
  id: number;
  kind: Kind;
  text: string;
}

const ToastContext = createContext<(text: string, kind?: Kind) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const show = useCallback((text: string, kind: Kind = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 6000 : 2800);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed right-5 bottom-5 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="card animate-pop-in pointer-events-auto flex max-w-sm items-center gap-2.5 px-4 py-3 text-sm shadow-lg"
          >
            {t.kind === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
            ) : (
              <XCircle className="size-4 shrink-0 text-red-500" />
            )}
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
