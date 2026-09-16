import { createContext, useCallback, useContext, useRef, useState } from "react";

// Toast + modal de confirmação, um único provider pra tudo. Existia
// como window.confirm() nativo espalhado pelo app — a lógica de cada
// chamada (o que confirma, o que acontece depois) não mudou, só o
// vetor visual: em vez de bloquear a thread com o confirm() do
// navegador, `confirm()` daqui devolve uma Promise<boolean>, então todo
// call site vira `if (!(await confirm("..."))) return;` dentro de uma
// função async — mesmo formato de guarda, sem reescrever a regra.
const FeedbackContext = createContext(null);

const TOAST_TOM = {
  success: "border-emerald-200 bg-emerald-100 text-emerald-800",
  warning: "border-amber-200 bg-amber-100 text-amber-800",
  danger: "border-rose-200 bg-rose-100 text-rose-800",
  info: "border-sky-200 bg-sky-100 text-sky-800",
};

const DIALOG_BOTAO_TOM = {
  danger: "bg-rose-100 text-rose-800 hover:bg-rose-200 focus-visible:ring-rose-300",
  warning: "bg-amber-100 text-amber-800 hover:bg-amber-200 focus-visible:ring-amber-300",
  info: "bg-sky-100 text-sky-800 hover:bg-sky-200 focus-visible:ring-sky-300",
};

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null); // { message, tone, confirmLabel, resolve }
  const idRef = useRef(0);

  const toast = useCallback((message, tone = "success") => {
    const id = ++idRef.current;
    setToasts((atual) => [...atual, { id, message, tone }]);
    setTimeout(() => setToasts((atual) => atual.filter((t) => t.id !== id)), 4000);
  }, []);

  const confirm = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      setDialog({
        message,
        tone: opts.tone ?? "danger",
        confirmLabel: opts.confirmLabel ?? "Confirmar",
        resolve,
      });
    });
  }, []);

  function responder(valor) {
    dialog?.resolve(valor);
    setDialog(null);
  }

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto w-full max-w-sm rounded-xl border px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${TOAST_TOM[t.tone] ?? TOAST_TOM.success}`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {dialog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[1px] transition-opacity duration-150"
          onClick={() => responder(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-transform duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-slate-700">{dialog.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => responder(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
              >
                cancelar
              </button>
              <button
                onClick={() => responder(true)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 ${DIALOG_BOTAO_TOM[dialog.tone] ?? DIALOG_BOTAO_TOM.danger}`}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  return useContext(FeedbackContext);
}
