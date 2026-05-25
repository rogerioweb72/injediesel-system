-- Allow franchise users to insert orders for their own unit
create policy "orders_unit_insert" on public.orders
  for insert with check (
    unit_id in (
      select unit_id from public.user_unit_roles where user_id = auth.uid()
    )
  );

-- Allow franchise users to insert order_items for orders they own
create policy "order_items_unit_insert" on public.order_items
  for insert with check (
    order_id in (
      select id from public.orders
      where unit_id in (
        select unit_id from public.user_unit_roles where user_id = auth.uid()
      )
    )
  );

-- Allow franchise users to read their own order_items
create policy "order_items_unit_read" on public.order_items
  for select using (
    order_id in (
      select id from public.orders
      where unit_id in (
        select unit_id from public.user_unit_roles where user_id = auth.uid()
      )
    )
  );
