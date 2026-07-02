-- Fichas técnicas productivas y escalado de recetas internas.
-- Aditivo e idempotente. Ejecutar despues de supabase/admin_kiosko_production.sql.

alter table if exists public.admin_internal_recipes
  add column if not exists base_output_quantity numeric,
  add column if not exists base_output_unit text,
  add column if not exists expected_waste_percent numeric default 0,
  add column if not exists allergens text[] default '{}'::text[],
  add column if not exists steps jsonb default '[]'::jsonb,
  add column if not exists preservation_notes text,
  add column if not exists label_template text,
  add column if not exists theoretical_cost numeric default 0,
  add column if not exists inventory_product_id uuid,
  add column if not exists technical_notes text;

alter table if exists public.admin_internal_recipe_inputs
  add column if not exists waste_percent numeric default 0,
  add column if not exists allergen_tags text[] default '{}'::text[],
  add column if not exists unit_cost numeric,
  add column if not exists preparation_note text,
  add column if not exists sort_order integer default 0;

do $$
begin
  if to_regclass('public.admin_internal_recipes') is not null
     and to_regclass('public.admin_inventory_products') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_internal_recipes_inventory_product_fk') then
    alter table public.admin_internal_recipes
      add constraint admin_internal_recipes_inventory_product_fk
      foreign key (inventory_product_id) references public.admin_inventory_products(id) on delete set null
      not valid;
  end if;

  if to_regclass('public.admin_internal_recipes') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_internal_recipes_waste_percent_chk') then
    alter table public.admin_internal_recipes
      add constraint admin_internal_recipes_waste_percent_chk
      check (expected_waste_percent is null or expected_waste_percent >= 0)
      not valid;
  end if;

  if to_regclass('public.admin_internal_recipe_inputs') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_internal_recipe_inputs_waste_percent_chk') then
    alter table public.admin_internal_recipe_inputs
      add constraint admin_internal_recipe_inputs_waste_percent_chk
      check (waste_percent is null or waste_percent >= 0)
      not valid;
  end if;
end $$;

do $$
begin
  if to_regclass('public.admin_internal_recipes') is not null then
    create index if not exists admin_internal_recipes_inventory_product_idx
      on public.admin_internal_recipes (inventory_product_id);

    create index if not exists admin_internal_recipes_allergens_gin_idx
      on public.admin_internal_recipes using gin (allergens);

    comment on column public.admin_internal_recipes.base_output_quantity is
      'Cantidad base de salida de la ficha técnica. Si no existe, se usa expected_yield/final_weight para compatibilidad.';

    comment on column public.admin_internal_recipes.base_output_unit is
      'Unidad base de salida para escalado productivo: kg, g, l, ml, ud o raciones.';

    comment on column public.admin_internal_recipes.expected_waste_percent is
      'Porcentaje de merma prevista global de la receta.';

    comment on column public.admin_internal_recipes.allergens is
      'Alérgenos declarables de la receta técnica según Reglamento UE 1169/2011.';

    comment on column public.admin_internal_recipes.steps is
      'Pasos ordenados de elaboración en JSON. Cada paso puede incluir orden, título, descripción, tiempo y punto crítico APPCC.';

    comment on column public.admin_internal_recipes.preservation_notes is
      'Indicaciones de conservación y vida útil interna.';

    comment on column public.admin_internal_recipes.label_template is
      'Plantilla futura de etiqueta APPCC/Zebra sugerida para esta elaboración.';
  end if;

  if to_regclass('public.admin_internal_recipe_inputs') is not null then
    create index if not exists admin_internal_recipe_inputs_allergens_gin_idx
      on public.admin_internal_recipe_inputs using gin (allergen_tags);

    create index if not exists admin_internal_recipe_inputs_sort_idx
      on public.admin_internal_recipe_inputs (recipe_id, sort_order, input_product);

    comment on column public.admin_internal_recipe_inputs.unit_cost is
      'Coste unitario teórico del ingrediente para escandallo previo. No sustituye al coste FEFO real.';

    comment on column public.admin_internal_recipe_inputs.waste_percent is
      'Porcentaje de merma prevista del ingrediente.';

    comment on column public.admin_internal_recipe_inputs.allergen_tags is
      'Alérgenos aportados por este ingrediente.';
  end if;
end $$;
