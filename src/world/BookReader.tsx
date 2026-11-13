import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { books, type Page, type Quiz } from "./books";
import { XP } from "./progress";

function PageView({ page }: { page: Page }) {
  return (
    <>
      <h3>{page.heading}</h3>
      {page.body.map((p) => (
        <p key={p}>{p}</p>
      ))}
      {page.timeline && (
        <ol className="book-timeline">
          {page.timeline.map(([year, text]) => (
            <li key={year}>
              <b>{year}</b>
              <span>{text}</span>
            </li>
          ))}
        </ol>
      )}
      {page.flow && (
        <ol className="book-flow" aria-label="Alur">
          {page.flow.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
      {page.stats && (
        <dl className="book-stats">
          {page.stats.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
}

export function QuizCard({
  quiz,
  solved,
  onCorrect,
  reward,
}: {
  quiz: Quiz;
  solved: boolean;
  onCorrect: () => void;
  reward?: number;
}) {
  const [picked, setPicked] = useState<number | null>(solved ? quiz.answer : null);
  const right = picked === quiz.answer;
  return (
    <div className="quiz">
      <p className="quiz-q">{quiz.q}</p>
      <div className="quiz-options">
        {quiz.options.map((option, i) => (
          <button
            key={option}
            disabled={right}
            className={picked === i ? (i === quiz.answer ? "right" : "wrong") : ""}
            onClick={() => {
              setPicked(i);
              if (i === quiz.answer && !solved) onCorrect();
            }}
          >
            <span>{String.fromCharCode(65 + i)}</span>
            {option}
          </button>
        ))}
      </div>
      {picked !== null && (
        <p className={`quiz-why ${right ? "right" : "wrong"}`} role="status">
          <b>{right ? "Tepat." : "Belum tepat, coba lagi."}</b> {right ? quiz.why : ""}
        </p>
      )}
      {reward && !solved && picked === null && <small className="quiz-reward">Bonus +{reward} XP</small>}
    </div>
  );
}

export function BookReader({
  id,
  read,
  answered,
  onFinish,
  onCorrect,
  onClose,
}: {
  id: string;
  read: boolean;
  answered: boolean;
  onFinish: (id: string) => void;
  onCorrect: (id: string) => void;
  onClose: () => void;
}) {
  const book = books[id];
  const total = book.pages.length + (book.quiz ? 1 : 0);
  const [page, setPage] = useState(0);
  const body = useRef<HTMLDivElement>(null);
  const last = page === total - 1;
  const onQuiz = !!book.quiz && page === book.pages.length;

  useEffect(() => {
    if (page >= book.pages.length - 1 && !read) onFinish(id);
    body.current?.focus({ preventScroll: true });
    body.current?.scrollTo(0, 0);
  }, [page, book.pages.length, read, id, onFinish]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setPage((p) => Math.min(p + 1, total - 1));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(p - 1, 0));
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [total]);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="book-title">
      <article className="book" style={{ ["--book" as string]: book.color }}>
        <header className="book-head">
          <div className="book-spine" aria-hidden="true" />
          <div>
            <small>BUKU · {book.subtitle}</small>
            <h2 id="book-title">{book.title}</h2>
          </div>
          <button className="icon-close" onClick={onClose} aria-label="Tutup buku">
            <X size={20} />
          </button>
        </header>
        <div className="book-page" ref={body} tabIndex={-1} key={page}>
          {onQuiz ? (
            <>
              <h3>Uji pemahaman</h3>
              <QuizCard quiz={book.quiz!} solved={answered} onCorrect={() => onCorrect(id)} reward={XP.quiz} />
            </>
          ) : (
            <PageView page={book.pages[page]} />
          )}
        </div>
        <footer className="book-foot">
          <button onClick={() => setPage(page - 1)} disabled={page === 0}>
            <ArrowLeft size={16} /> Sebelumnya
          </button>
          <span className="book-dots" aria-label={`Halaman ${page + 1} dari ${total}`}>
            {Array.from({ length: total }, (_, i) => (
              <i key={i} className={i === page ? "on" : i < page ? "past" : ""} />
            ))}
          </span>
          {last ? (
            <button className="btn-gold" onClick={onClose}>
              {read ? <Check size={16} /> : null} Selesai membaca
            </button>
          ) : (
            <button className="btn-gold" onClick={() => setPage(page + 1)}>
              {page === book.pages.length - 1 && book.quiz ? "Kuis" : "Berikutnya"} <ArrowRight size={16} />
            </button>
          )}
        </footer>
        {!read && <p className="book-xp">Baca sampai halaman terakhir: +{XP.book} XP</p>}
      </article>
    </div>
  );
}
