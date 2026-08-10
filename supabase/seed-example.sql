-- Optional: run this after schema.sql to see the site working end to end.
-- Replace the meet_link values with real Google Meet links, and the dates
-- with your real August schedule, or delete these rows once you add real ones.

insert into clubs (slug, category, title, description, session_date, session_time, price_amount, currency, meet_link, capacity)
values
  (
    'book-aug-1', 'Book', 'Topic announced soon',
    'A perfect place to finally talk about that book you''ve just binged through — as well as for those who have been meaning to read more for a while but struggle to find the time. Either way, you''re among friends here.',
    '2026-08-14', '19:00 GMT+3', 1000, 'usd', 'https://meet.google.com/example-link-1', 6
  ),
  (
    'art-history-aug-1', 'Art History', 'Topic announced soon',
    'From cave walls, early sculpture, and pottery to light installations and happenings. Here, we talk about the "what" of art just as much as the "why" behind it.',
    '2026-08-18', '19:00 GMT+3', 1000, 'usd', 'https://meet.google.com/example-link-2', 6
  ),
  (
    'theatre-aug-1', 'Theatre & Its Backstage Story', 'Topic announced soon',
    'For those who are in love with theatre — or simply curious to peek behind the curtain. Stages, live performances, and the amazing, crazy people who pushed theatre forward and those who keep it alive today. From the Greek classics to the modern stages of London and Berlin — it''s all here.',
    '2026-08-21', '19:00 GMT+3', 1000, 'usd', 'https://meet.google.com/example-link-3', 6
  ),
  (
    'film-aug-1', 'Film', 'Topic announced soon',
    'The film industry has taken us on many an emotional roller coaster: it has made us cry, laugh, think about our loved ones, and look deeper within ourselves. Here, we talk about world classics, lesser-known arthouse films, and the art of filmmaking that made us fall in love with the silver screen.',
    '2026-08-25', '19:00 GMT+3', 1000, 'usd', 'https://meet.google.com/example-link-4', 6
  );
