import SwiftUI

struct TripsScreen: View {
    @Bindable var store: AppStore
    @State private var search = ""
    @State private var showForm = false
    @State private var favouritesOnly = false

    var filteredTrips: [Trip] {
        store.trips.filter { trip in
            (!favouritesOnly || trip.isFavourite) &&
            (search.isEmpty || trip.name.localizedCaseInsensitiveContains(search) || (trip.city?.localizedCaseInsensitiveContains(search) ?? false) || (store.countries.first { $0.isoCode == trip.countryCode }?.name.localizedCaseInsensitiveContains(search) ?? false))
        }
    }

    var body: some View {
        Group {
            if filteredTrips.isEmpty {
                ContentUnavailableView(
                    store.trips.isEmpty ? "No trips yet" : "No matching trips",
                    systemImage: "suitcase.rolling",
                    description: Text(store.trips.isEmpty ? "Record a journey to begin your timeline." : "Try another search or filter.")
                )
            } else {
                List(filteredTrips) { trip in
                    NavigationLink(value: trip) {
                        TripRow(trip: trip, country: store.countries.first { $0.isoCode == trip.countryCode })
                    }
                }.listStyle(.plain)
            }
        }
        .navigationTitle("Trips")
        .searchable(text: $search, prompt: "Search trips")
        .navigationDestination(for: Trip.self) { TripDetailView(trip: $0, store: store) }
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button(favouritesOnly ? "Show all" : "Show favourites", systemImage: favouritesOnly ? "star.fill" : "star") { favouritesOnly.toggle() }
            }
            ToolbarItem(placement: .topBarTrailing) { Button("Add trip", systemImage: "plus") { showForm = true } }
        }
        .sheet(isPresented: $showForm) { TripFormView(store: store, initial: store.tripDraft ?? TripDraft()) }
    }
}

struct TripRow: View {
    let trip: Trip
    let country: Country?

    var body: some View {
        HStack(spacing: 14) {
            RoundedRectangle(cornerRadius: 12).fill(GAColor.gold.opacity(0.18)).frame(width: 52, height: 52)
                .overlay(Image(systemName: "mappin.and.ellipse").foregroundStyle(GAColor.gold))
            VStack(alignment: .leading, spacing: 4) {
                HStack { Text(trip.name).font(.headline); if trip.isFavourite { Image(systemName: "star.fill").font(.caption).foregroundStyle(GAColor.gold).accessibilityLabel("Favourite") } }
                Text([trip.city, country?.name ?? trip.countryCode].compactMap { $0 }.joined(separator: ", ")).font(.subheadline).foregroundStyle(.secondary)
                Text("\(trip.startDate.formatted(date: .abbreviated, time: .omitted)) – \(trip.endDate.formatted(date: .abbreviated, time: .omitted))").font(.caption).foregroundStyle(.secondary)
            }
        }.padding(.vertical, 4)
    }
}

struct TripDetailView: View {
    let trip: Trip
    @Bindable var store: AppStore
    @Environment(\.dismiss) private var dismiss
    @State private var showEdit = false
    @State private var confirmDelete = false
    @State private var errorMessage: String?
    @State private var places: [Place] = []
    @State private var companions: [Companion] = []

    var activeTrip: Trip { store.trips.first { $0.id == trip.id } ?? trip }
    var memories: [Memory] { store.memories.filter { $0.tripId == trip.id } }

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 12) {
                    Text(activeTrip.startDate.formatted(date: .long, time: .omitted) + " – " + activeTrip.endDate.formatted(date: .long, time: .omitted))
                    Label("\(activeTrip.durationDays) day\(activeTrip.durationDays == 1 ? "" : "s")", systemImage: "calendar")
                    if let mood = activeTrip.mood { Label(mood, systemImage: "face.smiling") }
                    if let rating = activeTrip.rating { Label("\(rating) of 5", systemImage: "star") }
                }.font(.subheadline)
            }
            if let journal = activeTrip.journal, !journal.isEmpty {
                Section("Journal") { Text(journal).textSelection(.enabled) }
            }
            if !places.isEmpty { Section("Places") { ForEach(places) { Label($0.name, systemImage: "mappin") } } }
            if !companions.isEmpty { Section("Companions") { ForEach(companions) { Label($0.displayName, systemImage: "person") } } }
            Section("Memories") {
                if memories.isEmpty { Text("No photos added yet.").foregroundStyle(.secondary) }
                ScrollView(.horizontal) {
                    LazyHStack(spacing: 10) {
                        ForEach(memories.prefix(12)) { memory in
                            NavigationLink(value: memory) { MemoryThumbnail(memory: memory, store: store).frame(width: 110, height: 110).clipShape(RoundedRectangle(cornerRadius: 12)) }
                        }
                    }
                }.scrollIndicators(.hidden)
            }
            Section {
                Button(activeTrip.isFavourite ? "Remove from favourites" : "Mark as favourite", systemImage: activeTrip.isFavourite ? "star.slash" : "star") {
                    Task { do { try await store.toggleTripFavourite(activeTrip) } catch { errorMessage = AppSession.safeMessage(error) } }
                }
                Button("Delete trip", systemImage: "trash", role: .destructive) { confirmDelete = true }
            }
        }
        .navigationTitle(activeTrip.name)
        .navigationDestination(for: Memory.self) { MemoryDetailView(memory: $0, store: store) }
        .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Edit") { showEdit = true } } }
        .sheet(isPresented: $showEdit) { TripFormView(store: store, initial: TripDraft(activeTrip)) }
        .task {
            places = (try? await store.services.trips.places(tripId: trip.id)) ?? []
            companions = (try? await store.services.trips.companions(tripId: trip.id)) ?? []
        }
        .confirmationDialog("Delete this trip and all of its private photos?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete trip", role: .destructive) {
                Task { do { try await store.deleteTrip(activeTrip); dismiss() } catch { errorMessage = AppSession.safeMessage(error) } }
            }
        }
        .alert("Trip error", isPresented: Binding(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })) { Button("OK", role: .cancel) {} } message: { Text(errorMessage ?? "") }
    }
}

struct TripFormView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var store: AppStore
    @State private var draft: TripDraft
    @State private var placesText = ""
    @State private var companionsText = ""
    @State private var isSaving = false
    @State private var saved = false
    @State private var errorMessage: String?

    init(store: AppStore, initial: TripDraft) { self.store = store; _draft = State(initialValue: initial) }

    var body: some View {
        NavigationStack {
            Form {
                Section("Journey") {
                    Picker("Country", selection: $draft.countryCode) {
                        Text("Choose a country").tag("")
                        ForEach(store.countries) { Text($0.name).tag($0.isoCode) }
                    }
                    TextField("Trip name", text: $draft.name).accessibilityIdentifier("trip-name-field")
                    TextField("City", text: $draft.city)
                    TextField("Region", text: $draft.region)
                    DatePicker("Start", selection: $draft.startDate, displayedComponents: .date)
                    DatePicker("End", selection: $draft.endDate, in: draft.startDate..., displayedComponents: .date)
                }
                Section("Reflection") {
                    TextField("Journal", text: $draft.journal, axis: .vertical).lineLimit(5...14)
                    TextField("Favourite memory", text: $draft.favouriteMemory, axis: .vertical).lineLimit(2...6)
                    TextField("Mood", text: $draft.mood)
                    Picker("Rating", selection: $draft.rating) { Text("Not rated").tag(0); ForEach(1...5, id: \.self) { Text("\($0)").tag($0) } }
                    Toggle("Favourite trip", isOn: $draft.isFavourite)
                }
                Section("Details") {
                    TextField("Places, separated by commas", text: $placesText, axis: .vertical)
                    TextField("Companions, separated by commas", text: $companionsText, axis: .vertical)
                    HStack { TextField("Expense", text: $draft.expenseAmount).keyboardType(.decimalPad); TextField("Currency", text: $draft.expenseCurrency).textInputAutocapitalization(.characters).frame(width: 90) }
                }
                if let errorMessage { Section { Text(errorMessage).foregroundStyle(.red) } }
            }
            .navigationTitle(draft.id == nil ? "New trip" : "Edit trip")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? "Saving…" : "Save") { Task { await save() } }.disabled(isSaving).accessibilityIdentifier("save-trip-button")
                }
            }
            .task {
                guard let id = draft.id else { return }
                let places = (try? await store.services.trips.places(tripId: id)) ?? []
                let companions = (try? await store.services.trips.companions(tripId: id)) ?? []
                placesText = places.map(\.name).joined(separator: ", ")
                companionsText = companions.map(\.displayName).joined(separator: ", ")
            }
            .onDisappear { if !saved { Task { await store.preserveTripDraft(draft) } } }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        do {
            let trip = try await store.saveTrip(draft)
            let placeNames = split(placesText)
            let places = placeNames.map { Place(id: UUID(), tripId: trip.id, countryCode: trip.countryCode, name: $0, city: draft.city.isEmpty ? nil : draft.city, latitude: nil, longitude: nil, notes: nil) }
            try await store.services.trips.savePlaces(places, tripId: trip.id, countryCode: trip.countryCode)
            try await store.services.trips.saveCompanions(split(companionsText), tripId: trip.id)
            saved = true
            dismiss()
        } catch { errorMessage = AppSession.safeMessage(error) }
    }

    private func split(_ value: String) -> [String] {
        value.split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
    }
}

private extension TripDraft {
    init(_ trip: Trip) {
        self.init(
            id: trip.id, countryCode: trip.countryCode, name: trip.name, city: trip.city ?? "", region: trip.region ?? "",
            startDate: trip.startDate, endDate: trip.endDate, journal: trip.journal ?? "",
            favouriteMemory: trip.favouriteMemory ?? "", mood: trip.mood ?? "", rating: trip.rating ?? 0,
            expenseAmount: trip.expenseAmount.map { NSDecimalNumber(decimal: $0).stringValue } ?? "",
            expenseCurrency: trip.expenseCurrency ?? "", isFavourite: trip.isFavourite
        )
    }
}

