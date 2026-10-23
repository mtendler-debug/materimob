import { createContext, useCallback, useContext, useRef, useState } from "react";
import Modal from "../components/ui/Modal";
import Button from "../components/ui/Button";

// Toast + modal de confirmação, um único provider pra tudo. Existia
// como window.confirm() nativo espalhado pelo app — a lógica de cada
// chamada (o que confirma, o que acontece depois) não mudou, só o
// vetor visual: em vez de bloquear a thread com o confirm() do
// navegador, `confirm()` daqui devolve uma Promise<boolean>, então todo
// call site vira `if (!(await confirm("..."))) return;` dentro de uma
// função async — mesmo formato de guarda, sem reescrever a regra.
const FeedbackContext = createContext(null);

const TOAST_TOM = {
  success: "border-success-border bg-success-bg text-success-text",
  warning: "border-warning-border bg-warning-bg text-warning-text",
  danger: "border-danger-border bg-danger-bg text-danger-text",
  info: "border-sky-200 bg-brand-soft text-sky-800",
};

// Tom do botão de confirmar: ação destrutiva fica em vermelho suave; o resto usa o azul da marca.
const DIALOG_BOTAO = { danger: "danger", warning: "primary", info: "primary" };

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
            className={`pointer-events-auto w-full max-w-sm rounded-2xl border px-4 py-3 text-body-sm font-medium shadow-float backdrop-blur-xl transition-all duration-200 ${TOAST_TOM[t.tone] ?? TOAST_TOM.success}`}
          >
            {t.message}
          </div>
        ))}
      </div>

      <Modal
        open={!!dialog}
        onClose={() => responder(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => responder(false)}>
              Cancelar
            </Button>
            <Button variant={DIALOG_BOTAO[dialog?.tone] ?? "danger"} onClick={() => responder(true)}>
              {dialog?.confirmLabel}
            </Button>
          </>
        }
      >
        <p className="text-base font-medium text-slate-700">{dialog?.message}</p>
      </Modal>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  return useContext(FeedbackContext);
}
