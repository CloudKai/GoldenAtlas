import SwiftUI

@main
struct GoldenAtlasApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var session: AppSession

    init() {
        do {
            let configuration = try AppConfiguration.load()
            let repository = SupabaseRepository(configuration: configuration)
            let cache = try SwiftDataCache()
            let services = AppServices(
                auth: repository, countries: repository, trips: repository,
                memories: repository, profile: repository, bucketList: repository, cache: cache
            )
            _session = State(initialValue: AppSession(services: services))
        } catch {
            _session = State(initialValue: AppSession(services: nil, configurationError: AppSession.safeMessage(error)))
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView(session: session)
                .tint(GAColor.gold)
                .onOpenURL { url in Task { await session.handle(url: url) } }
                .task { await session.bootstrap() }
        }
    }
}
