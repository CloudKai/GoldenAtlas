You are a senior product designer, mobile UX architect, design-systems specialist, accessibility expert, and privacy-focused interaction designer.

Design a complete, production-ready mobile application interface for iOS and Android called **Golden Atlas**.

Golden Atlas is a private visual travel diary. Users mark countries they have visited on an interactive world map, organise their memories into trips, upload travel photographs, and revisit their experiences through galleries, timelines, statistics, and cinematic slideshows.

Create the complete UI design, interaction model, design system, reusable components, responsive layouts, prototypes, edge cases, and all important application states.

Do not create only a small number of attractive mock-ups. Design the full usable product.

---

# 1. Product goals

The application should help users:

* Remember where they have travelled
* Organise multiple trips within the same country
* Save private travel photos and written memories
* Revisit past trips through a world map
* Browse memories chronologically
* Present memories through a full-screen slideshow
* Reflect on their experiences without feeling pressured or ranked
* Control the privacy of their travel information

The product should feel:

* Personal
* Calm
* Reflective
* Warm
* Premium
* Private
* Easy to understand
* Emotionally meaningful

The product should not feel:

* Competitive
* Overly gamified
* Social-media-driven
* Crowded
* Childish
* Aggressive
* Like a direct copy of Apple Photos or another existing product

The slideshow may be inspired by the general idea of an ambient photo presentation, but it must have its own original visual identity.

---

# 2. Target platform

Design for:

* iOS
* Android
* Small mobile screens
* Large mobile screens
* Portrait orientation
* Landscape orientation for slideshow mode where appropriate
* Light mode
* Dark mode
* Dynamic text sizing
* Safe areas
* Device notches
* Rounded device corners
* Android navigation areas

Use mobile-native interaction patterns while maintaining one consistent cross-platform design language.

Do not make the interface look like a desktop website placed inside a phone.

---

# 3. Visual direction

Use a refined travel-journal visual identity.

Suggested palette:

* Warm gold for visited countries
* Soft neutral backgrounds
* Muted grey for unvisited countries
* Deep charcoal for dark mode
* Warm white for light mode
* Subtle green or blue accents only where necessary
* Red reserved for destructive actions and critical errors

Visited-country gold should feel elegant rather than bright yellow.

Use restrained animation, spacious layouts, clear typography, and strong photography.

Use a clean sans-serif typeface suitable for mobile interfaces.

Images should remain the primary visual focus.

Avoid:

* Excessive gradients
* Excessive glassmorphism
* Overly heavy shadows
* Tiny text
* Excessive rounded cards
* Decorative elements that reduce usability
* Colour as the only means of communicating status

---

# 4. Design system

Create a reusable design system page covering:

## Colours

Define semantic tokens for:

* Background primary
* Background secondary
* Surface
* Elevated surface
* Primary text
* Secondary text
* Disabled text
* Border
* Divider
* Gold visited state
* Gold selected state
* Unvisited state
* Success
* Warning
* Error
* Information
* Focus
* Scrim
* Image-overlay gradient

Provide light-mode and dark-mode values.

## Typography

Create styles for:

* Display title
* Page title
* Section heading
* Card title
* Body
* Secondary body
* Caption
* Metadata
* Button
* Input label
* Error message
* Slideshow location
* Slideshow caption

Design for Dynamic Type and scalable text.

## Spacing

Create a consistent spacing scale.

## Layout

Define:

* Screen margins
* Card padding
* Section spacing
* Bottom-navigation height
* Safe-area spacing
* Modal padding
* Grid spacing
* Gallery gutters

## Radius

Create semantic radius tokens for:

* Buttons
* Inputs
* Cards
* Image thumbnails
* Sheets
* Dialogs
* Avatars

## Elevation

Define restrained elevation levels.

## Motion

Define motion tokens for:

* Fast feedback
* Standard transition
* Slow cinematic transition
* Reduced-motion alternatives

## Icons

Use one consistent icon family.

All icons must have accessible text labels when meaning is not visually obvious.

---

# 5. Reusable components

Create production-ready component variants for:

* Primary button
* Secondary button
* Tertiary button
* Destructive button
* Icon button
* Floating action button
* Loading button
* Disabled button
* Text input
* Password input
* Search field
* Date field
* Dropdown
* Country selector
* City input
* Currency field
* Text area
* Checkbox
* Radio control
* Toggle
* Segmented control
* Chip
* Filter chip
* Country status chip
* Trip card
* Country card
* Memory card
* Photo thumbnail
* Gallery tile
* Empty-state panel
* Error-state panel
* Offline banner
* Upload-progress item
* Toast
* Snackbar
* Alert dialog
* Confirmation dialog
* Bottom sheet
* Full-screen modal
* Avatar
* Navigation header
* Bottom navigation
* Tab bar
* Timeline entry
* Statistics card
* Privacy information panel
* Permission request panel
* Skeleton loaders
* Slideshow controls
* Slideshow progress indicator
* Map legend
* Country preview sheet
* Filter sheet
* Date-range picker
* Image picker preview
* Multi-image selection item

Create variants for:

* Default
* Pressed
* Focused
* Selected
* Loading
* Disabled
* Error
* Success
* Empty
* Offline

---

# 6. Application structure

Use the following primary authenticated navigation:

* Map
* Timeline
* Slideshow
* Statistics
* Profile

The Map should be the default landing screen after login.

Create protected and unauthenticated flows separately.

---

# 7. Authentication screens

Design:

## Welcome screen

Include:

* Product logo
* Short value proposition
* Sign in
* Create account
* Continue with Google
* Continue with Apple
* Privacy summary link
* Terms link

Suggested message:

“Your travels, remembered beautifully.”

## Sign-in screen

Include:

* Email
* Password
* Show or hide password
* Forgot password
* Sign in
* Google sign-in
* Apple sign-in
* Link to create account

## Create-account screen

Include:

* Display name
* Email
* Password
* Password requirements
* Confirm password
* Agreement acknowledgement
* Create account
* Google option
* Apple option

## Email-verification screen

Include:

* Verification explanation
* Resend email
* Open mail application
* Change email
* Sign out

## Password-reset flow

Design:

* Request reset
* Confirmation sent
* Enter new password
* Password successfully changed
* Expired or invalid reset link

## Authentication error states

Design:

* Incorrect email or password
* Account not verified
* Network unavailable
* Too many attempts
* Google sign-in cancelled
* Apple sign-in cancelled
* Session expired
* Account disabled
* Unknown error

Messages should be clear without exposing sensitive account details.

---

# 8. First-time onboarding

Create a short optional onboarding flow after registration.

Keep it to three or four screens maximum.

Suggested topics:

1. Mark the countries you have visited
2. Save trips and private memories
3. Revisit memories through slideshows
4. Your information stays private by default

Allow users to:

* Skip
* Continue
* Return
* Review privacy information

Do not require photo, location, or notification permission during onboarding unless needed at that moment.

---

# 9. World-map home screen

Design the main screen around an interactive spread-out world map.

## Default new-user state

* All countries are neutral or muted
* No country is gold
* A clear prompt explains how to begin
* Include an accessible “Add your first trip” action
* Include an accessible country-list alternative

## Visited state

* Visited countries are gold
* Selected country receives stronger emphasis
* Unvisited countries remain muted
* Status must not rely on colour alone
* Include optional outline, texture, icon, or accessible label

## Map controls

Include:

* Search country
* Zoom in
* Zoom out
* Reset view
* Accessible list view
* Map legend
* Profile avatar
* Add trip action

## Country preview bottom sheet

When a country is tapped, show:

* Country name
* Visited or not visited
* Number of trips
* Number of photos
* Most recent visit
* Country thumbnail or outline
* View memories
* Add trip
* Mark as visited
* Add to bucket list
* Remove from bucket list

Design different states for:

* Unvisited country
* Visited country with no photos
* Visited country with one trip
* Visited country with several trips
* Bucket-list country
* Loading
* Offline
* Error

## Country search

Include:

* Search input
* Recent searches
* Alphabetical country list
* Visited filter
* Unvisited filter
* Bucket-list filter
* No-results state

---

# 10. Add-trip flow

Design a progressive, low-friction trip-creation flow.

Required fields:

* Country
* Trip name
* Start date
* End date

Optional fields:

* City or region
* Journal entry
* Favourite memory
* Mood
* Rating
* Travel companions
* Places visited
* Expenses
* Currency
* Photos

Avoid presenting every optional field at once.

Use expandable sections or a step-based flow.

Suggested steps:

1. Where and when
2. Memories
3. Photos
4. Review and save

Include optional writing prompts:

* What was your favourite moment?
* What surprised you?
* What food did you enjoy?
* Who did you travel with?
* Would you visit again?

Design validation states for:

* Missing required field
* End date before start date
* Future date warning
* Duplicate trip warning
* Invalid expense
* Offline save failure
* Upload still in progress
* Unsaved changes

Include:

* Save draft
* Save trip
* Cancel
* Discard confirmation
* Success confirmation

---

# 11. Image-selection and upload flow

Design a privacy-conscious image flow.

## Image-selection screen

Include:

* Select photos
* Explanation that only selected photos are accessed
* Selection counter
* Maximum upload limit
* Continue
* Cancel

## Selected-photo review

Allow:

* Reordering
* Removing
* Adding caption
* Adding date
* Adding location label
* Marking favourite
* Choosing whether exact location metadata is retained
* Reviewing total upload size

## Privacy notice

Show a clear optional-location control:

“Remove exact photo location”

This should be enabled by default.

Explain that GPS metadata is removed unless the user chooses to keep it.

## Upload-progress screen

Show:

* Individual photo progress
* Overall progress
* Cancel
* Retry failed upload
* Continue in background where technically supported
* Upload complete
* Partial failure
* No connection
* File too large
* Unsupported file type
* Photo-processing failure

Do not make failed uploads disappear without explanation.

---

# 12. Country-memory screen

Design the screen opened after selecting a visited country.

Include:

* Country name
* Country outline
* Trip count
* Photo count
* Last visited date
* Start slideshow
* Add trip
* Favourite country
* Overflow menu

Sections:

* Trips
* Photo gallery
* Favourites
* Memories by year
* Cities visited

Support display modes:

* Grid
* List
* Timeline

Design states:

* Country with one trip
* Country with many trips
* Country with no photos
* Country with journal entries only
* Loading
* Empty
* Offline
* Error

---

# 13. Trip-detail screen

Include:

* Trip title
* Country
* City
* Date range
* Trip duration
* Cover image
* Journal
* Favourite memory
* Mood
* Rating
* Companions
* Places
* Expenses
* Photo gallery
* Start slideshow
* Edit
* Delete

Design confirmation for deleting:

* One photograph
* Multiple photographs
* Trip but not country status
* Entire trip and all related memories

Make destructive consequences explicit.

---

# 14. Gallery

Design:

* Responsive image grid
* Thumbnail loading
* Multi-select
* Search
* Filter
* Sort
* Favourites
* Full-screen photo viewer

Photo viewer should include:

* Image
* Country
* City or location
* Date
* Caption
* Favourite
* Edit
* Delete
* Share placeholder for a later phase
* Previous and next
* Zoom
* Close

Privacy controls should remain accessible.

---

# 15. Slideshow

Create an original full-screen cinematic slideshow.

Each slide should show:

* Full-screen travel image
* Country name
* Optional city or location
* Trip name
* Date
* Optional caption

Place country and location information near the bottom-left.

Use a subtle image scrim or gradient to maintain text readability.

Include:

* Play
* Pause
* Previous
* Next
* Exit
* Progress
* Time remaining
* Slideshow settings
* Favourite
* Hide controls after inactivity
* Tap to reveal controls

Slideshow modes:

* All memories
* One country
* One trip
* Favourites
* Most recent
* Random
* Selected year
* On this day

Slideshow settings:

* Slide duration
* Chronological or random order
* Show captions
* Show date
* Show country
* Show city
* Transition type
* Reduced-motion option

Design country-transition cards showing:

* Country
* Cities visited
* Number of days
* Number of memories

Design:

* Portrait slideshow
* Landscape slideshow
* Loading next image
* Image unavailable
* Offline missing image
* Empty slideshow
* End of slideshow
* Repeat slideshow

Do not copy the exact interface of Apple StandBy or Apple Photos.

---

# 16. Timeline

Design a chronological travel timeline.

Group by:

* Year
* Country
* Trip

Include:

* Search
* Filters
* Jump to year
* Sort newest first
* Sort oldest first
* Favourites only
* Country filter
* City filter
* Month filter

Each timeline item should communicate:

* Country
* Trip
* Date
* Thumbnail
* Short caption
* Number of memories

Design states:

* Long timeline
* First-time empty state
* Search results
* No results
* Loading
* Offline
* Error

---

# 17. Statistics

Design a personal, non-competitive statistics page.

Show:

* Countries visited
* Percentage of supported world regions visited
* Continents visited
* Number of trips
* Total travel days
* Number of memories
* Most-visited country
* First trip
* Most recent trip
* Favourite country
* Trips by year

Use charts sparingly.

Explain how the world-visited percentage is calculated.

Avoid:

* Rankings
* Streaks
* Leaderboards
* Pressure-based language
* “You are behind” messages

---

# 18. Favourites and collections

Design:

* Favourite photos
* Favourite trips
* Favourite countries
* Favourite written memories

Generated collections may include:

* Best of the year
* Summer memories
* Family trips
* Recent memories
* First visit to Europe
* Favourites

Clearly distinguish generated collections from user-created trips.

---

# 19. Profile and settings

Design sections for:

## Profile

* Avatar
* Display name
* Email
* Edit profile

## Appearance

* System
* Light
* Dark
* Reduced motion

## Slideshow

* Duration
* Ordering
* Captions
* Dates
* Country
* City
* Transition

## Privacy

* Remove exact location by default
* Analytics consent
* Download data
* Privacy summary
* Privacy policy
* Connected authentication methods
* Manage active sessions

## Storage

* Storage used
* Number of photos
* Clear local cache
* Image quality setting

## Account

* Change password
* Sign out
* Delete account

Design the entire account-deletion flow:

1. Explain consequences
2. Show what will be deleted
3. Require reauthentication
4. Optional export-before-delete
5. Typed confirmation
6. Processing state
7. Success state
8. Failure and recovery state

---

# 20. Data-export flow

Design:

* Export explanation
* Select export contents
* Structured data
* Photos
* Journals
* Trip summaries
* File-format information
* Request export
* Preparing export
* Export ready
* Download
* Export expired
* Export failed
* Retry

Make it clear that export links expire.

---

# 21. Permission states

Design permission experiences for:

* Selected photo access
* Notifications, only if later required
* Location, only if the user chooses location features
* Camera, only if camera capture is introduced

Include:

* Pre-permission explanation
* Native permission transition
* Denied
* Limited
* Permanently denied
* Open settings
* Continue without permission

Do not pressure users into granting permissions.

---

# 22. Connectivity and resilience

Design:

* Offline banner
* Reconnected message
* Cached-content indication
* Upload waiting for connection
* Retry
* Partial data available
* Sync conflict
* Session expired
* Server unavailable
* Maintenance state

Users must understand whether an action has been saved.

---

# 23. Empty states

Create thoughtful empty states for:

* No trips
* No photos
* No visited countries
* No favourites
* No timeline results
* No slideshow memories
* No bucket-list countries
* No search results
* No statistics yet
* No internet connection

Each empty state should include one clear next action.

---

# 24. Loading states

Design skeleton and progress states for:

* Map loading
* Country selection
* Country memories
* Trips
* Gallery
* Statistics
* Timeline
* Search
* Image processing
* Image upload
* Slideshow preloading
* Account deletion
* Data export

Avoid unnecessary full-screen spinners.

---

# 25. Error states

Design clear error states for:

* Authentication failure
* Session expiry
* Network failure
* Server error
* Map-data failure
* Image-selection failure
* Unsupported file
* Image too large
* Upload failure
* Partial upload
* Trip save failure
* Duplicate action
* Delete failure
* Export failure
* Account-deletion failure
* Permission denial

Messages should explain:

* What happened
* Whether user data is safe
* What the user can do next

---

# 26. Accessibility

Ensure WCAG-informed mobile accessibility.

Include:

* Minimum accessible contrast
* Dynamic text sizing
* Screen-reader labels
* Screen-reader reading order
* Accessible map alternative
* Large touch targets
* Visible focus treatment
* Reduced motion
* Captions and labels
* Colour-independent status communication
* Slideshow controls that do not depend solely on gestures
* Clear destructive-action warnings
* Clear form errors
* Keyboard support where relevant

Create accessibility annotations for important screens.

The world map must have a country-list alternative.

---

# 27. Privacy design

All content is private by default.

Clearly communicate:

* Photos are private
* Travel history is private
* Exact location is optional
* Photo GPS metadata is removed by default
* Users control deletion and export
* Photos are not used for AI training without explicit consent
* No public social feed exists in the initial release

Avoid dark patterns.

Consent controls must not be preselected unless necessary for the requested service.

---

# 28. Prototype flows

Create clickable prototypes for at least these flows:

## Flow 1: New user

* Open app
* Create account
* Verify email
* Complete onboarding
* View empty map
* Add first trip
* Upload photos
* Country becomes gold
* Open country memories
* Start slideshow

## Flow 2: Returning user

* Sign in
* View map
* Select visited country
* Open trip
* Favourite memory
* Start country slideshow

## Flow 3: Add second trip to the same country

* Select country
* Add trip
* Enter dates and city
* Upload photos
* Save
* See both trips under the country

## Flow 4: Offline upload

* Select photos
* Lose connection
* See queued state
* Reconnect
* Resume upload
* Complete successfully

## Flow 5: Delete memory

* Open photo
* Delete
* Confirm
* Show processing
* Remove photo
* Show success

## Flow 6: Export and delete account

* Open privacy settings
* Request export
* Export ready
* Start account deletion
* Reauthenticate
* Confirm
* Delete
* Return to welcome screen

---

# 29. Figma file organisation

Organise the Figma file into pages:

1. Cover
2. Product principles
3. User flows
4. Information architecture
5. Design tokens
6. Components
7. Authentication
8. Onboarding
9. Map
10. Trips
11. Memories and gallery
12. Slideshow
13. Timeline
14. Statistics
15. Profile and settings
16. Privacy and account deletion
17. Empty states
18. Loading states
19. Error states
20. Accessibility annotations
21. Light mode
22. Dark mode
23. Prototype flows
24. Developer handoff

Use:

* Auto Layout
* Components
* Variants
* Variables
* Styles
* Semantic naming
* Constraints
* Responsive properties
* Reusable component instances

Avoid detached or duplicated components.

---

# 30. Developer handoff

Provide clear handoff information for:

* Spacing
* Dimensions
* Typography
* Colour tokens
* Component states
* Map behaviour
* Gallery behaviour
* Slideshow transitions
* Validation
* Loading
* Errors
* Empty states
* Offline states
* Accessibility
* Safe areas
* Motion durations

Use practical component names that can map cleanly to a React Native codebase.

Include notes where behaviour cannot be inferred from the static design.

---

# 31. Final deliverables

Produce:

* Complete mobile information architecture
* User-flow diagrams
* Full design system
* Reusable component library
* Light-mode screens
* Dark-mode screens
* iOS-ready layouts
* Android-ready layouts
* Complete authentication flow
* Complete map experience
* Complete trip-management flow
* Complete secure image-upload flow
* Country and trip galleries
* Complete slideshow experience
* Timeline
* Statistics
* Settings
* Privacy controls
* Data export
* Account deletion
* Permission states
* Loading states
* Empty states
* Error states
* Offline states
* Accessibility annotations
* Clickable high-fidelity prototypes
* Developer-ready handoff

Begin by establishing the information architecture and design system. Then design the complete application flow rather than producing only a landing screen or a few isolated mock-ups.
