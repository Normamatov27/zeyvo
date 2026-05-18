ALTER TABLE app.ticket
  ADD COLUMN rating_stars smallint CHECK (rating_stars BETWEEN 1 AND 5),
  ADD COLUMN rating_comment text;
