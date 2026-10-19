import SwiftUI

struct RootView: View {
    @Bindable var session: AppSession

    var body: some View {
        ZStack {
            GAColor.warmBackground.ignoresSafeArea()
            switch session.state {
            case .launching:
                VStack(spacing: 18) {
                    Image(systemName: "globe.americas.fill").font(.system(size: 58)).foregroundStyle(GAColor.gold)
                    ProgressView("Opening your atlas…")
                }
            case .signedOut:
                AuthView(session: session)
            case .awaitingEmailVerification(let email):
                VerificationView(email: email) { session.showSignIn() }
            case .signedIn(let user):
                if let services = session.services { AuthenticatedRoot(user: user, services: services, session: session) }
            case .configurationError(let message):
                ContentUnavailableView("Configuration needed", systemImage: "wrench.and.screwdriver", description: Text(message))
                    .padding()
            }
        }
        .alert("Golden Atlas", isPresented: Binding(get: { session.message != nil }, set: { if !$0 { session.message = nil } })) {
            Button("OK") { session.message = nil }
        } message: { Text(session.message ?? "") }
    }
}

private struct AuthenticatedRoot: View {
    @State private var store: AppStore
    @Bindable var session: AppSession

    init(user: AuthUser, services: AppServices, session: AppSession) {
        _store = State(initialValue: AppStore(user: user, services: services))
        self.session = session
    }

    var body: some View {
        MainTabView(store: store, session: session)
            .preferredColorScheme(colorScheme)
            .task { await store.load() }
            .sheet(isPresented: $session.passwordRecoveryRequested) {
                PasswordChangeView(session: session)
            }
    }

    private var colorScheme: ColorScheme? {
        switch store.preferences.theme { case .system: nil; case .light: .light; case .dark: .dark }
    }
}

struct MainTabView: View {
    @Bindable var store: AppStore
    @Bindable var session: AppSession

    var body: some View {
        VStack(spacing: 0) {
            if store.isOffline { OfflineBanner() }
            TabView {
                NavigationStack { AtlasMapScreen(store: store) }
                    .tabItem { Label("Map", systemImage: "map") }
                    .accessibilityIdentifier("map-tab")
                NavigationStack { TripsScreen(store: store) }
                    .tabItem { Label("Trips", systemImage: "suitcase.rolling") }
                    .accessibilityIdentifier("trips-tab")
                NavigationStack { MemoriesScreen(store: store) }
                    .tabItem { Label("Memories", systemImage: "photo.on.rectangle.angled") }
                    .accessibilityIdentifier("memories-tab")
                NavigationStack { ProfileScreen(store: store, session: session) }
                    .tabItem { Label("Profile", systemImage: "person.crop.circle") }
                    .accessibilityIdentifier("profile-tab")
            }
        }
        .overlay {
            if store.isLoading && store.countries.isEmpty {
                ZStack { Color.black.opacity(0.08).ignoresSafeArea(); ProgressView("Loading your atlas…").padding(24).background(.regularMaterial, in: RoundedRectangle(cornerRadius: 18)) }
            }
        }
        .alert("Couldn’t load Golden Atlas", isPresented: Binding(get: { store.errorMessage != nil }, set: { if !$0 { store.errorMessage = nil } })) {
            Button("Retry") { Task { await store.load() } }
            Button("Cancel", role: .cancel) { store.errorMessage = nil }
        } message: { Text(store.errorMessage ?? "") }
    }
}
