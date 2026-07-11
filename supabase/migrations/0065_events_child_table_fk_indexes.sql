-- 0065_events_child_table_fk_indexes: events itself already indexes created_by/updated_by
-- (0061); its two child tables were missed. Covering every FK is the project's standing
-- indexing convention -- caught by the performance advisor after 0061 landed.

create index event_checklist_items_created_by_idx on public.event_checklist_items (created_by);
create index event_checklist_items_updated_by_idx on public.event_checklist_items (updated_by);
create index event_timeline_items_created_by_idx on public.event_timeline_items (created_by);
create index event_timeline_items_updated_by_idx on public.event_timeline_items (updated_by);
