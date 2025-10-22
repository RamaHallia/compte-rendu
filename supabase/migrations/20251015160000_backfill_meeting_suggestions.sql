-- Backfill des suggestions JSON (meetings.suggestions)
-- vers les tables normalisées meeting_clarifications et meeting_topics
-- Idempotent: n'insère pas de doublons si relancé

begin;

-- Clarifications (points à clarifier) depuis meetings.suggestions
with sug as (
  select m.id as meeting_id,
         m.user_id,
         jsonb_array_elements(coalesce(m.suggestions, '[]'::jsonb)) as s
  from public.meetings m
  where m.suggestions is not null
    and jsonb_typeof(m.suggestions) = 'array'
    and jsonb_array_length(m.suggestions) > 0
), clar as (
  select meeting_id,
         user_id,
         nullif(s->>'segment_number','')::int as segment_number,
         jsonb_array_elements_text(coalesce(s->'suggestions','[]'::jsonb)) as content
  from sug
)
insert into public.meeting_clarifications (meeting_id, content, segment_number, user_id)
select c.meeting_id,
       trim(c.content) as content,
       c.segment_number,
       c.user_id
from (
  select meeting_id,
         user_id,
         segment_number,
         content,
         row_number() over (
           partition by meeting_id, lower(regexp_replace(trim(content), '\\s+', ' ', 'g'))
           order by meeting_id
         ) as rn
  from clar
) c
where length(coalesce(c.content,'')) > 0
  and c.rn = 1
  and not exists (
    select 1 from public.meeting_clarifications mc
    where mc.meeting_id = c.meeting_id
      and lower(regexp_replace(trim(mc.content), '\\s+', ' ', 'g')) = lower(regexp_replace(trim(c.content), '\\s+', ' ', 'g'))
  );

-- Topics (sujets à explorer) depuis meetings.suggestions
with sug as (
  select m.id as meeting_id,
         m.user_id,
         jsonb_array_elements(coalesce(m.suggestions, '[]'::jsonb)) as s
  from public.meetings m
  where m.suggestions is not null
    and jsonb_typeof(m.suggestions) = 'array'
    and jsonb_array_length(m.suggestions) > 0
), topics as (
  select meeting_id,
         user_id,
         nullif(s->>'segment_number','')::int as segment_number,
         jsonb_array_elements_text(coalesce(s->'topics_to_explore','[]'::jsonb)) as topic
  from sug
)
insert into public.meeting_topics (meeting_id, topic, segment_number, user_id)
select t.meeting_id,
       trim(t.topic) as topic,
       t.segment_number,
       t.user_id
from (
  select meeting_id,
         user_id,
         segment_number,
         topic,
         row_number() over (
           partition by meeting_id, lower(regexp_replace(trim(topic), '\\s+', ' ', 'g'))
           order by meeting_id
         ) as rn
  from topics
) t
where length(coalesce(t.topic,'')) > 0
  and t.rn = 1
  and not exists (
    select 1 from public.meeting_topics mt
    where mt.meeting_id = t.meeting_id
      and lower(regexp_replace(trim(mt.topic), '\\s+', ' ', 'g')) = lower(regexp_replace(trim(t.topic), '\\s+', ' ', 'g'))
  );

commit;


