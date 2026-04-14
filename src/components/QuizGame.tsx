import { useState, useEffect, useCallback } from 'react';
import { capitals, type Country } from '../data/capitals';

type GameState = 'loading' | 'question' | 'feedback' | 'finished';

interface Question {
  country: Country;
  options: string[];
  correctIndex: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestions(count = 10): Question[] {
  const selected = shuffle(capitals).slice(0, count);
  return selected.map((country) => {
    const wrongPool = capitals
      .filter((c) => c.capital !== country.capital)
      .map((c) => c.capital);
    const wrongs = shuffle(wrongPool).slice(0, 3);
    const allOptions = shuffle([country.capital, ...wrongs]);
    return {
      country,
      options: allOptions,
      correctIndex: allOptions.indexOf(country.capital),
    };
  });
}

const QUESTIONS_PER_ROUND = 10;
const POINTS_PER_CORRECT = 10;

export default function QuizGame() {
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rankingPosition, setRankingPosition] = useState<number | null>(null);

  useEffect(() => {
    const name = localStorage.getItem('playerName');
    if (!name) {
      window.location.href = '/';
      return;
    }
    setPlayerName(name);
    const qs = buildQuestions(QUESTIONS_PER_ROUND);
    setQuestions(qs);
    setGameState('question');
  }, []);

  const submitScore = useCallback(async (finalScore: number, name: string, isFinal = false) => {
    if (isFinal) setIsSubmitting(true);
    try {
      const res = await fetch('/api/ranking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, score: finalScore }),
      });
      const data = await res.json();
      if (res.ok && isFinal) {
        const pos = data.ranking?.findIndex(
          (entry: { name: string }) => entry.name === name
        );
        if (pos !== -1 && pos !== undefined) {
          setRankingPosition(pos + 1);
        }
      } else if (!res.ok && isFinal) {
        setSubmitError(`Error ${res.status}: ${data.error ?? 'desconegut'}`);
      }
    } catch {
      if (isFinal) setSubmitError("No s'ha pogut enviar la puntuació. Comprova la connexió.");
    } finally {
      if (isFinal) setIsSubmitting(false);
    }
  }, []);

  const advanceQuestion = useCallback((nextIndex: number, currentScore: number, name: string) => {
    if (nextIndex >= QUESTIONS_PER_ROUND) {
      setGameState('finished');
      submitScore(currentScore, name, true);
    } else {
      setCurrentIndex(nextIndex);
      setSelectedOption(null);
      setIsCorrect(null);
      setGameState('question');
    }
  }, [submitScore]);

  const handleAnswer = useCallback(
    (optionIndex: number) => {
      if (gameState !== 'question') return;
      const q = questions[currentIndex];
      const correct = optionIndex === q.correctIndex;
      setSelectedOption(optionIndex);
      setIsCorrect(correct);
      const newScore = correct ? score + POINTS_PER_CORRECT : score;
      if (correct) setScore(newScore);
      setGameState('feedback');

      // Guardar puntuació després de cada resposta (silent)
      submitScore(newScore, playerName!, false);

      // Auto-advance: 1.2s if correct, 3.5s if wrong (time to read mnemonic)
      const delay = correct ? 1200 : 3500;
      setTimeout(() => {
        advanceQuestion(currentIndex + 1, newScore, playerName!);
      }, delay);
    },
    [gameState, questions, currentIndex, score, playerName, advanceQuestion, submitScore]
  );

  // Keyboard support (only for answering)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState === 'question') {
        const map: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3 };
        if (map[e.key] !== undefined) handleAnswer(map[e.key]);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState, handleAnswer]);

  if (gameState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400">Carregant preguntes...</p>
      </div>
    );
  }

  if (gameState === 'finished') {
    const percentage = Math.round((score / (QUESTIONS_PER_ROUND * POINTS_PER_CORRECT)) * 100);
    let emoji = '😅';
    let message = 'Continua practicant!';
    if (percentage >= 90) { emoji = '🏆'; message = 'Increïble! Ets un expert en capitals asiàtiques!'; }
    else if (percentage >= 70) { emoji = '🎉'; message = 'Molt bé! Gairebé perfecte!'; }
    else if (percentage >= 50) { emoji = '👍'; message = 'Bon intent! Pots millorar!'; }

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="card p-10 max-w-md w-full space-y-6">
          <div className="text-6xl">{emoji}</div>
          <div>
            <h2 className="text-3xl font-extrabold text-white">
              {score} / {QUESTIONS_PER_ROUND * POINTS_PER_CORRECT} punts
            </h2>
            <p className="text-slate-400 mt-1">{percentage}% correctes</p>
          </div>
          <p className="text-lg font-semibold text-indigo-300">{message}</p>

          {rankingPosition && (
            <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-xl px-4 py-3">
              <p className="text-indigo-300 text-sm">
                Posició al rànquing: <span className="font-bold text-white">#{rankingPosition}</span>
              </p>
            </div>
          )}

          {submitError && (
            <p className="text-red-400 text-sm">{submitError}</p>
          )}

          {isSubmitting && (
            <p className="text-slate-400 text-sm flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin inline-block" />
              Guardant puntuació...
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setQuestions(buildQuestions(QUESTIONS_PER_ROUND));
                setCurrentIndex(0);
                setScore(0);
                setSelectedOption(null);
                setIsCorrect(null);
                setRankingPosition(null);
                setSubmitError('');
                setGameState('question');
              }}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <span>🔄</span> Tornar a jugar
            </button>
            <button
              onClick={() => { window.location.href = '/ranking'; }}
              disabled={isSubmitting}
              className="btn-secondary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
            >
              <span>🏆</span> {isSubmitting ? 'Guardant...' : 'Veure Ranking'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex) / QUESTIONS_PER_ROUND) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400 font-medium">
          Pregunta <span className="text-white font-bold">{currentIndex + 1}</span> / {QUESTIONS_PER_ROUND}
        </div>
        <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
          <span className="text-yellow-400">⭐</span>
          <span className="font-bold text-white">{score}</span>
          <span className="text-slate-400 text-sm">pts</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question card */}
      <div className="card p-6 text-center space-y-2">
        <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">Capital de...</p>
        <h2 className="text-4xl font-extrabold text-white">{currentQuestion.country.country}</h2>
      </div>

      {/* Options + Feedback side by side */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Options grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 w-full">
          {currentQuestion.options.map((option, idx) => {
            let buttonClass =
              'w-full p-4 rounded-xl border text-left font-semibold transition-all duration-200 ';

            if (gameState === 'question') {
              buttonClass +=
                'bg-white/5 border-white/10 hover:bg-white/15 hover:border-white/30 hover:-translate-y-0.5 text-white cursor-pointer';
            } else {
              if (idx === currentQuestion.correctIndex) {
                buttonClass += 'bg-green-500/20 border-green-500/50 text-green-300 cursor-default';
              } else if (idx === selectedOption && !isCorrect) {
                buttonClass += 'bg-red-500/20 border-red-500/50 text-red-300 cursor-default';
              } else {
                buttonClass += 'bg-white/5 border-white/10 text-slate-500 cursor-default opacity-40';
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                disabled={gameState !== 'question'}
                className={buttonClass}
              >
                <span className="flex items-center gap-3">
                  <span className="w-7 h-7 flex-shrink-0 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-slate-300">
                    {idx + 1}
                  </span>
                  <span>{option}</span>
                  {gameState === 'feedback' && idx === currentQuestion.correctIndex && (
                    <span className="ml-auto text-green-400">✓</span>
                  )}
                  {gameState === 'feedback' && idx === selectedOption && !isCorrect && (
                    <span className="ml-auto text-red-400">✗</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Feedback panel — apareix al costat */}
        {gameState === 'feedback' && (
          <div
            className={`w-full lg:w-72 xl:w-80 flex-shrink-0 card p-5 space-y-3 border ${
              isCorrect
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{isCorrect ? '🎉' : '💡'}</span>
              <p className={`font-bold ${isCorrect ? 'text-green-300' : 'text-red-300'}`}>
                {isCorrect ? 'Correcte! +10 punts' : `Incorrecte`}
              </p>
            </div>

            {!isCorrect && (
              <>
                <p className="text-slate-300 text-sm">
                  Resposta: <span className="font-bold text-white">{currentQuestion.country.capital}</span>
                </p>
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <p className="text-xs font-semibold uppercase tracking-widest text-purple-400 mb-1.5">
                    🧠 Mnemotècnic
                  </p>
                  <p className="text-slate-300 text-sm leading-relaxed italic">
                    "{currentQuestion.country.mnemonic}"
                  </p>
                </div>
              </>
            )}

            {/* Countdown bar */}
            <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
              <div
                className={`h-full rounded-full ${isCorrect ? 'bg-green-400' : 'bg-red-400'}`}
                style={{
                  animation: `shrink ${isCorrect ? '1.2s' : '3.5s'} linear forwards`,
                }}
              />
            </div>
            <p className="text-slate-500 text-xs text-center">Passant a la següent...</p>
          </div>
        )}
      </div>
    </div>
  );
}
