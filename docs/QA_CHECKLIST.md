# Manual QA checklist

Run this against a local backend (`./pnpmw backend:start`, then set the two `VITE_SUPABASE_*` values and `./pnpmw dev`) after every large change. Automated checks cover the logic (`./pnpmw test:unit`, `./pnpmw backend:verify`); this list covers what only a browser can show. Use two accounts (A and B) in two browsers where the step says so.

## Account
- [ ] Sign up; the confirmation email appears at `http://127.0.0.1:54324`; the link signs you in at the map.
- [ ] Wrong password shows a plain message. Forgot password sends a link; the link opens the new-password screen and the new password works.
- [ ] Sign out, then sign in on a second browser: your trips are there.
- [ ] **Try as guest** works with no account and shows nothing from account A. Leaving guest mode asks first, and the guest's trips are gone afterwards.

## Countries and map
- [ ] Add trip → Select country: Singapore, Antarctica, Hong Kong and Kosovo are all found by search (also "holland", "usa", "cote").
- [ ] Tap a country on the map: the hint "Tap a country to get started" never returns after the first tap (reload to confirm).
- [ ] Tap a tiny island (for example Midway); the sheet shows United States Minor Outlying Islands.
- [ ] A trip dated in the future gives a dashed gold outline and "Planned" in the legend; the country is **not** gold and statistics ignore it. After the trip starts, the country turns gold.

## Trips, days and photos
- [ ] Create a trip with 3 days, a companion, and a budget; the budget label changes to "Total spent" once the trip has started.
- [ ] Open Day 2: write a diary and tap two places; the folder shows "A → B". Reload: it is still there.
- [ ] Add 5 photos to Day 2: progress shows "n of 5 photos uploaded…". Edit a caption, move a photo to Day 3, and make one the cover.
- [ ] **Add another day** outside edit mode adds Day 4 immediately. Removing the last day is only offered when it is empty.
- [ ] Shorten the end date past a day that has a diary: saving is refused with a clear message.
- [ ] Turn off the network in dev tools, edit a diary, try to save: you get a connection message and the offline banner. Reload: "unsaved edits" offers a restore. Reconnect and save.
- [ ] Interrupt an upload (go offline mid-save): the trip is saved, a Retry banner appears, and Retry succeeds once back online.

## Memories
- [ ] Trips search finds words from a diary, a caption, a place, and a companion, and shows where it found them.
- [ ] Memories shows "On this day" when a past trip has photos or a diary for today's date.
- [ ] **Play this day** on a day with photos runs a slideshow of just that day.
- [ ] Trip book opens; Print or Save as PDF shows a clean, multi-page layout with photos and captions and without buttons.

## Privacy and data
- [ ] Account B cannot open account A's trip URL (shows "Trip not found").
- [ ] Download your data: the file includes `trip_days`, and only your own data.
- [ ] Settings (theme, reduce motion, slideshow, favourite country) follow you to a second browser after sign-in.
- [ ] Delete account asks for your password and typed DELETE; afterwards, signing in fails and storage objects are gone (Studio → Storage).
