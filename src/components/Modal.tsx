import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  onClose(): void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Se false, Esc e click fuori non chiudono (utile durante operazioni lunghe). */
  dismissable?: boolean;
}

const SIZES = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl" };

// Pila dei modali aperti: Esc chiude solo quello in primo piano (es. "Nuova sfumatura" sopra il form del capo).
const openModals: symbol[] = [];

export function Modal({ open, onClose, title, children, footer, size = "md", dismissable = true }: Props) {
  const token = useRef(Symbol("modal")).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    openModals.push(token);
    return () => {
      openModals.splice(openModals.indexOf(token), 1);
    };
  }, [open, token]);

  useEffect(() => {
    if (!open || !dismissable) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openModals[openModals.length - 1] === token) onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissable, token]);

  if (!open) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-6 backdrop-blur-sm"
      onMouseDown={(e) => dismissable && e.target === e.currentTarget && onClose()}
    >
      <div className={`card animate-pop-in flex max-h-full w-full ${SIZES[size]} flex-col overflow-hidden shadow-2xl`}>
        {title && (
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            {dismissable && (
              <button className="icon-btn -mr-2" onClick={onClose} aria-label="Chiudi">
                <X className="size-4" />
              </button>
            )}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50/60 px-6 py-3.5 dark:border-zinc-800 dark:bg-zinc-900/60">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Elimina",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm(): void;
  onClose(): void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Annulla
          </button>
          <button
            className="btn-danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="px-6 py-5 text-sm text-zinc-600 dark:text-zinc-300">{message}</div>
    </Modal>
  );
}
