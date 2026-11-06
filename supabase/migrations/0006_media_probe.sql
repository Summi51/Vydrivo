-- Vydrivo media probe metadata: native image/video properties after finalize.
-- Run this in the Supabase SQL editor after 0005_media_assets.sql. Until it is
-- applied, finalize fails closed and the pending asset remains retryable.

alter table public.media_assets
  add column if not exists native_properties jsonb;

alter table public.media_assets
  add column if not exists probe_error text;

do $$
begin
  alter table public.media_assets
    add constraint media_assets_native_properties_object
    check (native_properties is null or jsonb_typeof(native_properties) = 'object');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.media_assets
    add constraint media_assets_probe_error_length
    check (probe_error is null or char_length(probe_error) <= 500);
exception
  when duplicate_object then null;
end $$;

comment on column public.media_assets.native_properties is
  'Normalized ffprobe properties (kind, width, height, durationMs, codecs, frameRate, fullDecode) recorded after a successful finalize.';

comment on column public.media_assets.probe_error is
  'Bounded probe failure reason for a rejected asset; never contains storage credentials or signed URLs.';
