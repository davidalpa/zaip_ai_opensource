-- Habilitar extensão de vetores
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- VECTOR DATABASE FOR RAG
-- Create the vector table
CREATE TABLE IF NOT EXISTS public.zz_vector (
  id           BIGSERIAL PRIMARY KEY,
  date_created TIMESTAMPTZ DEFAULT NOW(),
  content      TEXT,
  metadata     JSONB,
  embedding    vector(1536) -- pode ser minúsculo, é o tipo da extensão
);

-- Enable RLS on the vector table
ALTER TABLE public.zz_vector
  ENABLE ROW LEVEL SECURITY;

-- Create permissive RLS policy
CREATE POLICY zz_vector_all
  ON public.zz_vector
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create function using extensions.cosine_distance instead of the operator <=>
CREATE OR REPLACE FUNCTION match_d(
  query_embedding vector(1536),
  match_count     INT     DEFAULT 10,
  filter          JSONB   DEFAULT '{}'
)
RETURNS TABLE (
  id         BIGINT,
  content    TEXT,
  metadata   JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
SET search_path = extensions, public
AS $func$
BEGIN
  RETURN QUERY
    SELECT
      d.id,
      d.content,
      d.metadata,
      1 - extensions.cosine_distance(d.embedding, query_embedding) AS similarity
    FROM public.zz_vector AS d
    WHERE d.metadata @> filter
    ORDER BY extensions.cosine_distance(d.embedding, query_embedding)
    LIMIT match_count;
END;
$func$;
