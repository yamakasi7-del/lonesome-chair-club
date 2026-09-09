-- Optional: run this after schema.sql to see the site working end to end.
-- Replace the meet_link values with real Google Meet links, and the dates
-- with your real August schedule, or delete these rows once you add real ones.

-- Note: the vocabulary column comes from schema.sql (or migration-001-vocabulary.sql
-- if your database predates it). Run that first if this insert complains.
insert into clubs (slug, category, title, description, vocabulary, session_date, session_time, price_amount, currency, meet_link, capacity)
values
  (
    'book-aug-1', 'Book', 'Why We Read',
    'This is the introductory session in a longer series of recurring book clubs. We''ll talk about why we read fiction, what kinds of stories move us, and what makes a story truly gripping. We''ll also discuss our favourite works of literature and, of course, practise some fancy vocabulary to help us express our thoughts more clearly. After the session, we''ll hold an open vote to choose the book we''ll read and discuss at the upcoming clubs.',
    'to binge-read — to read something in one long, greedy sitting
a page-turner — a book so gripping you can''t put it down
the premise — the idea a story is built on
an unreliable narrator — a storyteller you can''t quite trust
to resonate with — to feel personally true to you
a slow burn — a story that rewards patience',
    '2026-08-14', '19:00 GMT+3', 2000, 'usd', 'https://meet.google.com/example-link-1', 6
  ),
  (
    'art-history-aug-1', 'Art History', 'What Even Is Art?',
    'What even is art? Does it serve any practical purpose? What secrets can a canvas hold? Why do we create art and why do we enjoy experiencing it? Join us for our first art club: the beginning of a much longer journey through art and its mysteries.',
    null,
    '2026-08-18', '19:00 GMT+3', 2000, 'usd', 'https://meet.google.com/example-link-2', 6
  ),
  (
    'theatre-aug-1', 'Theatre & Its Backstage Story', 'Topic announced soon',
    'For those who are in love with theatre — or simply curious to peek behind the curtain. Stages, live performances, and the amazing, crazy people who pushed theatre forward and those who keep it alive today. From the Greek classics to the modern stages of London and Berlin — it''s all here.',
    null,
    '2026-08-21', '19:00 GMT+3', 2000, 'usd', 'https://meet.google.com/example-link-3', 6
  ),
  (
    'film-aug-1', 'Film', 'The Art of Cinema',
    'At our very first film club, we''ll talk about the art of cinema and share our thoughts on what makes a film truly great rather than merely entertaining. We''ll also discuss our favourite films of all time: from acclaimed cinematic masterpieces to guilty pleasures we''d never admit to liking in public but secretly adore.',
    null,
    '2026-08-25', '19:00 GMT+3', 2000, 'usd', 'https://meet.google.com/example-link-4', 6
  );
