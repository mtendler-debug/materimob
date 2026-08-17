import { Routes, Route } from "react-router-dom";

function Placeholder({ label }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6 text-center">
      <div>
        <p className="text-sm uppercase tracking-wide text-neutral-400">
          Avaliador MaterImob
        </p>
        <h1 className="mt-2 text-xl font-medium text-neutral-800">{label}</h1>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Placeholder label="Página inicial" />} />
      <Route path="/entrar" element={<Placeholder label="Login" />} />
      <Route path="/app/*" element={<Placeholder label="Área do corretor" />} />
      <Route path="/c/:token" element={<Placeholder label="Formulário de avaliação" />} />
      <Route path="/r/:token" element={<Placeholder label="Painel do cliente" />} />
    </Routes>
  );
}
