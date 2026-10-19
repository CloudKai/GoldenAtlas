import Foundation
import Observation
import SwiftUI

// MARK: - Configuration

struct AppConfiguration: Sendable {
    enum Environment: String, Sendable { case local = "Local", staging = "Staging", production = "Production" }

    let supabaseURL: URL
    let publishableKey: String
    let environment: Environment

    static func load(bundle: Bundle = .main, process: ProcessInfo = .processInfo) throws -> Self {
        let values = process.environment
        let rawURL = values["SUPABASE_URL"] ?? bundle.object(forInfoDictionaryKey: "SUPABASE_URL") as? String
        let key = values["SUPABASE_PUBLISHABLE_KEY"] ?? bundle.object(forInfoDictionaryKey: "SUPABASE_PUBLISHABLE_KEY") as? String
        let rawEnvironment = values["GOLDEN_ATLAS_CONFIGURATION"] ?? bundle.object(forInfoDictionaryKey: "GOLDEN_ATLAS_CONFIGURATION") as? String ?? "Local"

        guard let rawURL, let url = URL(string: rawURL), ["http", "https"].contains(url.scheme?.lowercased()) else {
            throw AppError.configuration("SUPABASE_URL is missing or invalid.")
        }
        guard let key, !key.isEmpty, !key.contains("YOUR_") else {
            throw AppError.configuration("Add a Supabase publishable key to the active xcconfig file.")
        }
        guard key.hasPrefix("sb_publishable_") else {
            throw AppError.configuration("Use a modern sb_publishable_ key. Secret, service-role, and legacy JWT keys are rejected by the iOS client.")
        }
        guard let environment = Environment(rawValue: rawEnvironment) else {
            throw AppError.configuration("Unknown app configuration \(rawEnvironment).")
        }
        return Self(supabaseURL: url, publishableKey: key, environment: environment)
    }
}

enum AppError: LocalizedError, Equatable, Sendable {
    case configuration(String)
    case validation(String)
    case network(String)
    case unauthorized
    case uploadIncomplete
    case service(String)

    var errorDescription: String? {
        switch self {
        case .configuration(let message), .validation(let message), .network(let message), .service(let message): message
        case .unauthorized: "Your session has expired. Please sign in again."
        case .uploadIncomplete: "The photo upload is incomplete. It is safe to retry."
        }
    }
}

enum AppDate {
    private static func dayFormatter() -> DateFormatter {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }

    private static func instantFormatter(fractional: Bool) -> ISO8601DateFormatter {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = fractional ? [.withInternetDateTime, .withFractionalSeconds] : [.withInternetDateTime]
        return formatter
    }

    static func parseDay(_ value: String) -> Date { dayFormatter().date(from: value) ?? .distantPast }
    static func formatDay(_ value: Date) -> String { dayFormatter().string(from: value) }
    static func formatInstant(_ value: Date) -> String { instantFormatter(fractional: true).string(from: value) }
    static func parseInstant(_ value: String?) -> Date? {
        guard let value else { return nil }
        return instantFormatter(fractional: true).date(from: value) ?? instantFormatter(fractional: false).date(from: value)
    }
}

// MARK: - Domain

struct AuthUser: Identifiable, Equatable, Codable, Sendable {
    let id: UUID
    let email: String
}

struct Country: Identifiable, Equatable, Codable, Hashable, Sendable {
    var id: String { isoCode }
    let isoCode: String
    let iso3Code: String
    let name: String
    let continentName: String
    let region: String?
    let countsTowardWorldTotal: Bool
}

struct Trip: Identifiable, Equatable, Codable, Hashable, Sendable {
    let id: UUID
    let countryCode: String
    var name: String
    var city: String?
    var region: String?
    var startDate: Date
    var endDate: Date
    var journal: String?
    var favouriteMemory: String?
    var mood: String?
    var rating: Int?
    var expenseAmount: Decimal?
    var expenseCurrency: String?
    var isFavourite: Bool
    let updatedAt: Date

    var durationDays: Int {
        max(1, (Calendar.current.dateComponents([.day], from: startDate, to: endDate).day ?? 0) + 1)
    }
}

struct TripDraft: Equatable, Codable, Sendable {
    var id: UUID?
    var countryCode = ""
    var name = ""
    var city = ""
    var region = ""
    var startDate = Date()
    var endDate = Date()
    var journal = ""
    var favouriteMemory = ""
    var mood = ""
    var rating = 0
    var expenseAmount = ""
    var expenseCurrency = ""
    var isFavourite = false

    func validated() throws -> Self {
        guard !countryCode.isEmpty else { throw AppError.validation("Choose a country.") }
        guard (1...120).contains(name.trimmingCharacters(in: .whitespacesAndNewlines).count) else {
            throw AppError.validation("Trip name must contain 1–120 characters.")
        }
        guard endDate >= startDate else { throw AppError.validation("End date cannot be before the start date.") }
        guard rating == 0 || (1...5).contains(rating) else { throw AppError.validation("Rating must be between 1 and 5.") }
        if !expenseCurrency.isEmpty, expenseCurrency.range(of: "^[A-Za-z]{3}$", options: .regularExpression) == nil {
            throw AppError.validation("Currency must be a three-letter code.")
        }
        return self
    }
}

enum UploadStatus: String, Codable, Sendable { case pending, ready, failed }

struct Memory: Identifiable, Equatable, Codable, Hashable, Sendable {
    let id: UUID
    let tripId: UUID
    var caption: String?
    var locationLabel: String?
    var takenAt: Date?
    var displayOrder: Int
    var isFavourite: Bool
    let originalPath: String
    let thumbnailPath: String
    let originalMimeType: String
    var uploadStatus: UploadStatus
    let width: Int?
    let height: Int?
    let updatedAt: Date
}

struct Place: Identifiable, Equatable, Codable, Hashable, Sendable {
    let id: UUID
    let tripId: UUID
    var countryCode: String
    var name: String
    var city: String?
    var latitude: Decimal?
    var longitude: Decimal?
    var notes: String?
}

struct Companion: Identifiable, Equatable, Codable, Hashable, Sendable {
    let id: UUID
    var displayName: String
    var notes: String?
}

enum ThemePreference: String, CaseIterable, Codable, Sendable { case system, light, dark }

struct Profile: Equatable, Codable, Sendable {
    let id: UUID
    var displayName: String
    let email: String
}

struct Preferences: Equatable, Codable, Sendable {
    var theme: ThemePreference = .system
    var reducedMotion = false
    var removePhotoGPS = true
    var analyticsConsent = false
}

struct ProcessedPhoto: Sendable {
    let original: Data
    let thumbnail: Data
    let width: Int
    let height: Int
    let mimeType: String
}

struct MemoryUploadDraft: Identifiable, Codable, Equatable, Sendable {
    let id: UUID
    let tripId: UUID
    var caption: String
    var locationLabel: String
    var takenAt: Date
    let originalFile: String
    let thumbnailFile: String
    var retryCount: Int
}

// MARK: - Repository contracts

protocol AuthRepository: Sendable {
    func currentUser() async -> AuthUser?
    func authChanges() async -> AsyncStream<AuthUser?>
    func signUp(email: String, password: String, displayName: String) async throws
    func signIn(email: String, password: String) async throws
    func signOut() async throws
    func sendPasswordReset(email: String) async throws
    func updatePassword(_ password: String) async throws
    func handle(url: URL) async throws
}

protocol CountryRepository: Sendable { func countries() async throws -> [Country] }

protocol TripRepository: Sendable {
    func trips(limit: Int) async throws -> [Trip]
    func saveTrip(_ draft: TripDraft) async throws -> Trip
    func deleteTrip(id: UUID) async throws
    func setTripFavourite(id: UUID, isFavourite: Bool) async throws
    func places(tripId: UUID) async throws -> [Place]
    func savePlaces(_ places: [Place], tripId: UUID, countryCode: String) async throws
    func companions(tripId: UUID) async throws -> [Companion]
    func saveCompanions(_ names: [String], tripId: UUID) async throws
}

protocol MemoryRepository: Sendable {
    func memories(limit: Int) async throws -> [Memory]
    func upload(photo: ProcessedPhoto, draft: MemoryUploadDraft) async throws -> Memory
    func retryUpload(_ draft: MemoryUploadDraft) async throws -> Memory
    func setMemoryFavourite(id: UUID, isFavourite: Bool) async throws
    func deleteMemory(id: UUID) async throws
    func signedThumbnailURL(for memory: Memory) async throws -> URL
    func signedOriginalURL(for memory: Memory) async throws -> URL
}

protocol ProfileRepository: Sendable {
    func profile() async throws -> (Profile, Preferences)
    func updateProfile(name: String) async throws -> Profile
    func updatePreferences(_ preferences: Preferences) async throws
    func deleteAccount(confirmation: String) async throws
}

protocol BucketListRepository: Sendable {
    func bucketList() async throws -> Set<String>
    func setBucketList(countryCode: String, included: Bool) async throws
}

protocol CacheRepository: Sendable {
    func readSnapshot(userId: UUID) async -> CachedSnapshot?
    func writeSnapshot(_ snapshot: CachedSnapshot, userId: UUID) async
    func saveTripDraft(_ draft: TripDraft?, userId: UUID) async
    func tripDraft(userId: UUID) async -> TripDraft?
    func saveUploadDraft(_ draft: MemoryUploadDraft) async throws
    func uploadDrafts() async -> [MemoryUploadDraft]
    func removeUploadDraft(id: UUID) async
    func clear(userId: UUID) async
}

struct CachedSnapshot: Codable, Sendable {
    let countries: [Country]
    let trips: [Trip]
    let memories: [Memory]
    let bucketList: Set<String>
    let storedAt: Date
}

struct AppServices: Sendable {
    let auth: any AuthRepository
    let countries: any CountryRepository
    let trips: any TripRepository
    let memories: any MemoryRepository
    let profile: any ProfileRepository
    let bucketList: any BucketListRepository
    let cache: any CacheRepository
}

// MARK: - Shared state

@MainActor
@Observable
final class AppSession {
    enum State: Equatable { case launching, signedOut, awaitingEmailVerification(String), signedIn(AuthUser), configurationError(String) }

    private(set) var state: State = .launching
    private(set) var isWorking = false
    var message: String?
    var passwordRecoveryRequested = false
    let services: AppServices?
    @ObservationIgnored private var authTask: Task<Void, Never>?

    init(services: AppServices?, configurationError: String? = nil) {
        self.services = services
        if let configurationError { state = .configurationError(configurationError) }
    }

    deinit { authTask?.cancel() }

    func bootstrap() async {
        guard let services else { return }
        if let user = await services.auth.currentUser() { state = .signedIn(user) } else { state = .signedOut }
        let stream = await services.auth.authChanges()
        authTask = Task { [weak self] in
            for await user in stream {
                guard !Task.isCancelled else { break }
                await MainActor.run { self?.state = user.map(State.signedIn) ?? .signedOut }
            }
        }
    }

    func signIn(email: String, password: String) async {
        await perform { try await $0.auth.signIn(email: email, password: password) }
    }

    func showSignIn() { state = .signedOut }

    func signUp(email: String, password: String, displayName: String) async {
        await perform { services in
            try await services.auth.signUp(email: email, password: password, displayName: displayName)
            await MainActor.run { self.state = .awaitingEmailVerification(email) }
        }
    }

    func resetPassword(email: String) async {
        await perform { try await $0.auth.sendPasswordReset(email: email) }
        if message == nil { message = "Check your inbox for a password reset link." }
    }

    func signOut() async {
        guard let services else { return }
        let userId = if case .signedIn(let user) = state { user.id } else { nil }
        await perform { try await $0.auth.signOut() }
        if let userId { await services.cache.clear(userId: userId) }
    }

    func handle(url: URL) async {
        await perform { try await $0.auth.handle(url: url) }
        if url.host == "reset-password" || url.absoluteString.contains("type=recovery") {
            passwordRecoveryRequested = true
        }
    }

    private func perform(_ operation: @escaping (AppServices) async throws -> Void) async {
        guard let services, !isWorking else { return }
        isWorking = true
        message = nil
        defer { isWorking = false }
        do { try await operation(services) }
        catch { message = Self.safeMessage(error) }
    }

    static func safeMessage(_ error: Error) -> String {
        if let appError = error as? AppError { return appError.localizedDescription }
        return "Golden Atlas could not complete that request. Please try again."
    }
}

@MainActor
@Observable
final class AppStore {
    private(set) var countries: [Country] = []
    private(set) var trips: [Trip] = []
    private(set) var memories: [Memory] = []
    private(set) var bucketList: Set<String> = []
    private(set) var profile: Profile?
    private(set) var preferences = Preferences()
    private(set) var isLoading = false
    private(set) var isOffline = false
    var errorMessage: String?
    var tripDraft: TripDraft?

    let user: AuthUser
    let services: AppServices

    init(user: AuthUser, services: AppServices) {
        self.user = user
        self.services = services
    }

    var visitedCountryCodes: Set<String> { Set(trips.map(\.countryCode)) }

    func load() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }

        if let cached = await services.cache.readSnapshot(userId: user.id) {
            countries = cached.countries
            trips = cached.trips
            memories = cached.memories
            bucketList = cached.bucketList
        }

        do {
            async let countriesRequest = services.countries.countries()
            async let tripsRequest = services.trips.trips(limit: 200)
            async let memoriesRequest = services.memories.memories(limit: 500)
            async let bucketRequest = services.bucketList.bucketList()
            async let profileRequest = services.profile.profile()
            let loaded = try await (countriesRequest, tripsRequest, memoriesRequest, bucketRequest, profileRequest)
            countries = loaded.0
            trips = loaded.1
            memories = loaded.2
            bucketList = loaded.3
            profile = loaded.4.0
            preferences = loaded.4.1
            isOffline = false
            await persistSnapshot()
        } catch {
            isOffline = !countries.isEmpty || !trips.isEmpty || !memories.isEmpty
            errorMessage = isOffline ? nil : AppSession.safeMessage(error)
        }

        tripDraft = await services.cache.tripDraft(userId: user.id)
    }

    @discardableResult
    func saveTrip(_ draft: TripDraft) async throws -> Trip {
        let saved = try await services.trips.saveTrip(draft.validated())
        if let index = trips.firstIndex(where: { $0.id == saved.id }) { trips[index] = saved } else { trips.insert(saved, at: 0) }
        trips.sort { ($0.startDate, $0.id.uuidString) > ($1.startDate, $1.id.uuidString) }
        tripDraft = nil
        await services.cache.saveTripDraft(nil, userId: user.id)
        await persistSnapshot()
        return saved
    }

    func preserveTripDraft(_ draft: TripDraft?) async {
        tripDraft = draft
        await services.cache.saveTripDraft(draft, userId: user.id)
    }

    func deleteTrip(_ trip: Trip) async throws {
        try await services.trips.deleteTrip(id: trip.id)
        trips.removeAll { $0.id == trip.id }
        memories.removeAll { $0.tripId == trip.id }
        await persistSnapshot()
    }

    func toggleTripFavourite(_ trip: Trip) async throws {
        try await services.trips.setTripFavourite(id: trip.id, isFavourite: !trip.isFavourite)
        if let index = trips.firstIndex(where: { $0.id == trip.id }) { trips[index].isFavourite.toggle() }
        await persistSnapshot()
    }

    func toggleBucketList(_ countryCode: String) async throws {
        let include = !bucketList.contains(countryCode)
        try await services.bucketList.setBucketList(countryCode: countryCode, included: include)
        if include { bucketList.insert(countryCode) } else { bucketList.remove(countryCode) }
        await persistSnapshot()
    }

    func toggleMemoryFavourite(_ memory: Memory) async throws {
        try await services.memories.setMemoryFavourite(id: memory.id, isFavourite: !memory.isFavourite)
        if let index = memories.firstIndex(where: { $0.id == memory.id }) { memories[index].isFavourite.toggle() }
        await persistSnapshot()
    }

    func deleteMemory(_ memory: Memory) async throws {
        try await services.memories.deleteMemory(id: memory.id)
        memories.removeAll { $0.id == memory.id }
        await persistSnapshot()
    }

    func refreshMemories() async throws {
        memories = try await services.memories.memories(limit: 500)
        await persistSnapshot()
    }

    func saveProfile(name: String) async throws { profile = try await services.profile.updateProfile(name: name) }

    func savePreferences(_ next: Preferences) async throws {
        try await services.profile.updatePreferences(next)
        preferences = next
    }

    private func persistSnapshot() async {
        await services.cache.writeSnapshot(
            CachedSnapshot(countries: countries, trips: trips, memories: memories, bucketList: bucketList, storedAt: .now),
            userId: user.id
        )
    }
}

// MARK: - Design system

enum GAColor {
    static let gold = Color(red: 0.78, green: 0.61, blue: 0.27)
    static let selectedGold = Color(red: 0.89, green: 0.72, blue: 0.35)
    static let warmBackground = Color(uiColor: UIColor { $0.userInterfaceStyle == .dark ? UIColor(red: 0.07, green: 0.07, blue: 0.06, alpha: 1) : UIColor(red: 0.98, green: 0.97, blue: 0.94, alpha: 1) })
    static let surface = Color(uiColor: .secondarySystemBackground)
    static let unvisited = Color.secondary.opacity(0.24)
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: .infinity, minHeight: 48)
            .foregroundStyle(Color.black)
            .background(GAColor.gold.opacity(configuration.isPressed ? 0.72 : 1), in: RoundedRectangle(cornerRadius: 14))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

struct OfflineBanner: View {
    var body: some View {
        Label("Showing saved data. Changes will retry when you reconnect.", systemImage: "wifi.slash")
            .font(.caption)
            .padding(.horizontal, 12).padding(.vertical, 8)
            .frame(maxWidth: .infinity)
            .background(Color.orange.opacity(0.16))
            .accessibilityIdentifier("offline-banner")
    }
}
