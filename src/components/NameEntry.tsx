import { useState, useEffect } from 'react';

export default function NameEntry() {
  const [name, setName] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedName = localStorage.getItem('playerName');
    if (storedName) {
      setName(storedName);
    }
    setIsLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setError('Si us plau, introdueix el teu nom.');
      return;
    }
    if (trimmed.length < 2) {
      setError('El nom ha de tenir almenys 2 caràcters.');
      return;
    }
    if (trimmed.length > 30) {
      setError('El nom no pot tenir més de 30 caràcters.');
      return;
    }
    localStorage.setItem('playerName', trimmed);
    window.location.href = '/quiz';
  };

  const handlePlay = () => {
    window.location.href = '/quiz';
  };

  const handleChangeName = () => {
    localStorage.removeItem('playerName');
    setName('');
    setInputValue('');
  };

  if (isLoading) {
    return (
      <div class="flex justify-center py-12">
        <div class="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (name) {
    return (
      <div className="card p-8 text-center space-y-6 max-w-md mx-auto">
        <div className="text-5xl">👋</div>
        <div>
          <h2 className="text-2xl font-bold text-white">
            Benvingut/da de nou,
          </h2>
          <p className="text-3xl font-extrabold text-indigo-300 mt-1">{name}!</p>
        </div>
        <p className="text-slate-400 text-sm">
          Llest/a per posar a prova el teu coneixement de les capitals asiàtiques?
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handlePlay}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <span>🎯</span> Jugar
          </button>
          <a
            href="/ranking"
            className="btn-outline flex items-center justify-center gap-2"
          >
            <span>🏆</span> Ranking
          </a>
        </div>
        <button
          onClick={handleChangeName}
          className="text-slate-500 hover:text-slate-300 text-sm transition-colors underline"
        >
          Canviar de jugador
        </button>
      </div>
    );
  }

  return (
    <div className="card p-8 max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="text-5xl">🗺️</div>
        <h2 className="text-2xl font-bold text-white">Com et dius?</h2>
        <p className="text-slate-400 text-sm">
          Introdueix el teu nom per guardar la teva puntuació al rànquing global.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="playerName" className="block text-sm font-medium text-slate-300 mb-2">
            Nom del jugador
          </label>
          <input
            id="playerName"
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setError('');
            }}
            placeholder="Escriu el teu nom..."
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            autoFocus
            maxLength={30}
          />
          {error && (
            <p className="mt-2 text-red-400 text-sm">{error}</p>
          )}
        </div>
        <button
          type="submit"
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <span>🚀</span> Començar
        </button>
      </form>
    </div>
  );
}
