-- Removes raw HTML and raw TeX from the document before it is written.
--
-- The quick preview is HTML, so anything the writer passed through verbatim would be
-- markup chosen by the document's author. Dropping it here keeps that markup out of
-- the page, and matches the LaTeX output, where raw HTML is discarded as well.

function RawInline()
  return {}
end

function RawBlock()
  return {}
end
