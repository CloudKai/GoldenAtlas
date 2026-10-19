import SwiftUI

struct AtlasResource: Decodable, Sendable {
    struct CountryShape: Decodable, Identifiable, Sendable {
        let id: String
        let name: String
        let rings: [[[Double]]]

        var bounds: CGRect {
            let points = rings.flatMap { $0 }.compactMap { point -> CGPoint? in
                guard point.count == 2 else { return nil }
                return CGPoint(x: point[0], y: point[1])
            }
            guard let first = points.first else { return .zero }
            return points.dropFirst().reduce(CGRect(origin: first, size: .zero)) { $0.union(CGRect(origin: $1, size: .zero)) }
        }

        func path() -> Path {
            var path = Path()
            for ring in rings {
                guard let first = ring.first, first.count == 2 else { continue }
                path.move(to: CGPoint(x: first[0], y: first[1]))
                for point in ring.dropFirst() where point.count == 2 { path.addLine(to: CGPoint(x: point[0], y: point[1])) }
                path.closeSubpath()
            }
            return path
        }

        func contains(_ point: CGPoint) -> Bool { path().contains(point, eoFill: true) }
    }

    let attribution: String
    let viewBox: [Double]
    let countries: [CountryShape]

    static let bundled: AtlasResource = {
        guard let url = Bundle.main.url(forResource: "world-atlas", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let atlas = try? JSONDecoder().decode(AtlasResource.self, from: data) else {
            return AtlasResource(attribution: "Unavailable", viewBox: [0, 0, 1010, 666], countries: [])
        }
        return atlas
    }()
}

struct AtlasMapScreen: View {
    @Bindable var store: AppStore
    @State private var selectedCode: String?
    @State private var zoom: CGFloat = 1
    @State private var lastZoom: CGFloat = 1
    @State private var offset: CGSize = .zero
    @State private var lastOffset: CGSize = .zero
    @State private var showCountryList = false

    var selectedCountry: Country? { store.countries.first { $0.isoCode == selectedCode } }

    var body: some View {
        ZStack(alignment: .bottom) {
            GAColor.warmBackground.ignoresSafeArea()
            GeometryReader { proxy in
                let base = min(proxy.size.width / 1010, proxy.size.height / 666)
                Canvas { context, size in
                    context.translateBy(x: size.width / 2 + offset.width, y: size.height / 2 + offset.height)
                    context.scaleBy(x: base * zoom, y: base * zoom)
                    context.translateBy(x: -505, y: -333)
                    for country in AtlasResource.bundled.countries {
                        let isVisited = store.visitedCountryCodes.contains(country.id)
                        let isSelected = selectedCode == country.id
                        let path = country.path()
                        context.fill(path, with: .color(isSelected ? GAColor.selectedGold : isVisited ? GAColor.gold : GAColor.unvisited), style: .init(eoFill: true))
                        if store.bucketList.contains(country.id) {
                            context.stroke(path, with: .color(.blue.opacity(0.8)), style: StrokeStyle(lineWidth: 1.8 / (base * zoom), dash: [4 / (base * zoom), 3 / (base * zoom)]))
                        }
                        let bounds = country.bounds
                        if bounds.width * bounds.height < 30 {
                            let marker = CGRect(x: bounds.midX - 2.2 / (base * zoom), y: bounds.midY - 2.2 / (base * zoom), width: 4.4 / (base * zoom), height: 4.4 / (base * zoom))
                            context.fill(Path(ellipseIn: marker), with: .color(isVisited ? GAColor.gold : .secondary))
                        }
                    }
                }
                .contentShape(Rectangle())
                .gesture(
                    DragGesture().onChanged { value in
                        offset = CGSize(width: lastOffset.width + value.translation.width, height: lastOffset.height + value.translation.height)
                    }.onEnded { _ in lastOffset = offset }
                )
                .simultaneousGesture(
                    MagnifyGesture().onChanged { value in zoom = min(7, max(1, lastZoom * value.magnification)) }
                        .onEnded { _ in lastZoom = zoom }
                )
                .simultaneousGesture(
                    SpatialTapGesture().onEnded { value in
                        let point = CGPoint(
                            x: (value.location.x - proxy.size.width / 2 - offset.width) / (base * zoom) + 505,
                            y: (value.location.y - proxy.size.height / 2 - offset.height) / (base * zoom) + 333
                        )
                        selectedCode = AtlasResource.bundled.countries.reversed().first { $0.contains(point) }?.id
                    }
                )
                .accessibilityLabel("Interactive world map")
                .accessibilityHint("Use the country list for an accessible text alternative.")
            }
            .padding(.bottom, selectedCountry == nil ? 0 : 116)

            if let country = selectedCountry {
                NavigationLink {
                    CountryDetailView(country: country, store: store)
                } label: {
                    HStack(spacing: 14) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(country.name).font(.headline).foregroundStyle(.primary)
                            let count = store.trips.filter { $0.countryCode == country.isoCode }.count
                            Text(count == 0 ? (store.bucketList.contains(country.isoCode) ? "On your bucket list" : "Not visited yet") : "\(count) trip\(count == 1 ? "" : "s")")
                                .font(.subheadline).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right").foregroundStyle(.secondary)
                    }
                    .padding(18).background(.regularMaterial, in: RoundedRectangle(cornerRadius: 20))
                    .padding()
                }.buttonStyle(.plain)
            }
        }
        .navigationTitle("Your Atlas")
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button("Reset map", systemImage: "arrow.counterclockwise") { zoom = 1; lastZoom = 1; offset = .zero; lastOffset = .zero }
                Button("Country list", systemImage: "list.bullet") { showCountryList = true }
            }
        }
        .sheet(isPresented: $showCountryList) { CountryListView(store: store, selectedCode: $selectedCode) }
    }
}

struct CountryListView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var store: AppStore
    @Binding var selectedCode: String?
    @State private var search = ""

    var filtered: [Country] {
        search.isEmpty ? store.countries : store.countries.filter { $0.name.localizedCaseInsensitiveContains(search) || $0.isoCode.localizedCaseInsensitiveContains(search) }
    }

    var body: some View {
        NavigationStack {
            List(filtered) { country in
                Button {
                    selectedCode = country.isoCode
                    dismiss()
                } label: {
                    HStack {
                        VStack(alignment: .leading) { Text(country.name); Text(country.continentName).font(.caption).foregroundStyle(.secondary) }
                        Spacer()
                        if store.visitedCountryCodes.contains(country.isoCode) { Image(systemName: "checkmark.seal.fill").foregroundStyle(GAColor.gold).accessibilityLabel("Visited") }
                        if store.bucketList.contains(country.isoCode) { Image(systemName: "bookmark.fill").foregroundStyle(.blue).accessibilityLabel("Bucket list") }
                    }
                }.foregroundStyle(.primary)
            }
            .searchable(text: $search, prompt: "Search countries")
            .navigationTitle("Countries")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
    }
}

struct CountryDetailView: View {
    let country: Country
    @Bindable var store: AppStore
    @State private var showTripForm = false
    @State private var errorMessage: String?

    var trips: [Trip] { store.trips.filter { $0.countryCode == country.isoCode } }

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text(country.continentName).font(.subheadline).foregroundStyle(.secondary)
                    Text(trips.isEmpty ? "A journey waiting to be remembered." : "\(trips.count) recorded trip\(trips.count == 1 ? "" : "s")")
                }.padding(.vertical, 8)
                Button(store.bucketList.contains(country.isoCode) ? "Remove from bucket list" : "Add to bucket list", systemImage: store.bucketList.contains(country.isoCode) ? "bookmark.slash" : "bookmark") {
                    Task { do { try await store.toggleBucketList(country.isoCode) } catch { errorMessage = AppSession.safeMessage(error) } }
                }
            }
            Section("Trips") {
                if trips.isEmpty { ContentUnavailableView("No trips yet", systemImage: "suitcase", description: Text("Add your first visit to \(country.name).")) }
                ForEach(trips) { trip in NavigationLink(value: trip) { TripRow(trip: trip, country: country) } }
            }
        }
        .navigationTitle(country.name)
        .navigationDestination(for: Trip.self) { TripDetailView(trip: $0, store: store) }
        .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Add trip", systemImage: "plus") { showTripForm = true } } }
        .sheet(isPresented: $showTripForm) { TripFormView(store: store, initial: TripDraft(countryCode: country.isoCode)) }
        .alert("Couldn’t update country", isPresented: Binding(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })) { Button("OK", role: .cancel) {} } message: { Text(errorMessage ?? "") }
    }
}

