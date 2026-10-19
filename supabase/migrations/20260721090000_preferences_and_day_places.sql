-- Settings that follow the account, and the places visited on each day of a trip.

-- The favourite country is chosen in the app but had nowhere to live, so it only existed on one device.
alter table public.user_preferences
  add column favourite_country_code text references public.countries(iso_code);

create index user_preferences_favourite_country_idx on public.user_preferences (favourite_country_code);

-- The web app offers a Dissolve transition in addition to Fade, Slide and None.
alter table public.user_preferences drop constraint user_preferences_transition_valid;
alter table public.user_preferences add constraint user_preferences_transition_valid
  check (slideshow_transition in ('fade', 'slide', 'dissolve', 'none'));

-- Place names visited on a day, in the order they were visited. They refer to the trip's places by name.
alter table public.trip_days add column places text[] not null default '{}';
alter table public.trip_days add constraint trip_days_places_size
  check (cardinality(places) <= 30 and char_length(array_to_string(places, ' ')) <= 3000);
