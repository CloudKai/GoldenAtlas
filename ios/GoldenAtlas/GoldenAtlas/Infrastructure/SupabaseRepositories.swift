import Foundation
import ImageIO
import Supabase

actor SupabaseRepository: AuthRepository, CountryRepository, TripRepository, MemoryRepository, ProfileRepository, BucketListRepository {
    private let client: SupabaseClient
    private var signedURLs: [String: (url: URL, expiresAt: Date)] = [:]

    init(configuration: AppConfiguration) {
        let ephemeral = URLSessionConfiguration.ephemeral
        ephemeral.requestCachePolicy = .reloadIgnoringLocalCacheData
        ephemeral.urlCache = nil
        let session = URLSession(configuration: ephemeral)
        client = SupabaseClient(
            supabaseURL: configuration.supabaseURL,
            supabaseKey: configuration.publishableKey,
            options: .init(
                auth: .init(
                    storage: KeychainLocalStorage(service: "com.goldenatlas.ios.auth"),
                    redirectToURL: URL(string: "goldenatlas://auth/callback"),
                    storageKey: "golden-atlas-session",
                    flowType: .pkce,
                    emitLocalSessionAsInitialSession: true
                ),
                global: .init(session: session)
            )
        )
    }

    // MARK: Auth

    func currentUser() async -> AuthUser? {
        guard let session = try? await client.auth.session else { return nil }
        return AuthUser(id: session.user.id, email: session.user.email ?? "")
    }

    func authChanges() async -> AsyncStream<AuthUser?> {
        let upstream = client.auth.authStateChanges
        return AsyncStream { continuation in
            let task = Task {
                for await (_, session) in upstream {
                    continuation.yield(session.map { AuthUser(id: $0.user.id, email: $0.user.email ?? "") })
                }
                continuation.finish()
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    func signUp(email: String, password: String, displayName: String) async throws {
        guard password.count >= 10,
              password.rangeOfCharacter(from: .letters) != nil,
              password.rangeOfCharacter(from: .decimalDigits) != nil else {
            throw AppError.validation("Use at least 10 characters with letters and numbers.")
        }
        _ = try await client.auth.signUp(
            email: email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
            password: password,
            data: ["display_name": .string(displayName.trimmingCharacters(in: .whitespacesAndNewlines))],
            redirectTo: URL(string: "goldenatlas://auth/callback")
        )
    }

    func signIn(email: String, password: String) async throws {
        _ = try await client.auth.signIn(
            email: email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
            password: password
        )
    }

    func signOut() async throws {
        signedURLs.removeAll()
        try await client.auth.signOut()
    }

    func sendPasswordReset(email: String) async throws {
        try await client.auth.resetPasswordForEmail(
            email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
            redirectTo: URL(string: "goldenatlas://reset-password")
        )
    }

    func updatePassword(_ password: String) async throws {
        guard password.count >= 10,
              password.rangeOfCharacter(from: .letters) != nil,
              password.rangeOfCharacter(from: .decimalDigits) != nil else {
            throw AppError.validation("Use at least 10 characters with letters and numbers.")
        }
        _ = try await client.auth.update(user: .init(password: password))
    }

    func handle(url: URL) async throws { _ = try await client.auth.session(from: url) }

    // MARK: Countries and bucket list

    func countries() async throws -> [Country] {
        let rows: [PublicSchema.CountriesSelect] = try await client
            .from("countries")
            .select()
            .eq("is_active", value: true)
            .order("sort_order", ascending: true)
            .order("name", ascending: true)
            .execute().value
        return rows.map(Country.init)
    }

    func bucketList() async throws -> Set<String> {
        let rows: [PublicSchema.BucketListSelect] = try await client.from("bucket_list").select().execute().value
        return Set(rows.map(\.countryCode))
    }

    func setBucketList(countryCode: String, included: Bool) async throws {
        if included {
            try await client.from("bucket_list").insert(["country_code": countryCode]).execute()
        } else {
            try await client.from("bucket_list").delete().eq("country_code", value: countryCode).execute()
        }
    }

    // MARK: Trips

    func trips(limit: Int) async throws -> [Trip] {
        let rows: [PublicSchema.TripsSelect] = try await client
            .from("trips")
            .select()
            .order("start_date", ascending: false)
            .order("id", ascending: false)
            .limit(min(max(limit, 1), 500))
            .execute().value
        return rows.map(Trip.init)
    }

    func saveTrip(_ draft: TripDraft) async throws -> Trip {
        let values = tripPayload(draft)
        let row: PublicSchema.TripsSelect
        if let id = draft.id {
            row = try await client.from("trips").update(values).eq("id", value: id).select().single().execute().value
        } else {
            row = try await client.from("trips").insert(values).select().single().execute().value
        }
        return Trip(row)
    }

    func deleteTrip(id: UUID) async throws {
        let _: FunctionEnvelope<TripDeleteResult> = try await client.functions.invoke(
            "delete-trip",
            options: .init(body: ["trip_id": id.uuidString])
        )
    }

    func setTripFavourite(id: UUID, isFavourite: Bool) async throws {
        try await client.from("trips").update(["is_favourite": isFavourite]).eq("id", value: id).execute()
    }

    func places(tripId: UUID) async throws -> [Place] {
        let rows: [PublicSchema.PlacesSelect] = try await client.from("places").select().eq("trip_id", value: tripId).order("name").execute().value
        return rows.map(Place.init)
    }

    func savePlaces(_ places: [Place], tripId: UUID, countryCode: String) async throws {
        try await client.from("places").delete().eq("trip_id", value: tripId).execute()
        let payloads = places.map { place in
            PublicSchema.PlacesInsert(
                city: place.city, countryCode: countryCode, createdAt: nil, id: place.id,
                latitude: place.latitude, longitude: place.longitude, name: place.name,
                notes: place.notes, tripId: tripId, updatedAt: nil, userId: nil
            )
        }
        if !payloads.isEmpty { try await client.from("places").insert(payloads).execute() }
    }

    func companions(tripId: UUID) async throws -> [Companion] {
        struct Join: Decodable { let travelCompanions: PublicSchema.TravelCompanionsSelect; enum CodingKeys: String, CodingKey { case travelCompanions = "travel_companions" } }
        let rows: [Join] = try await client.from("trip_companions").select("travel_companions(*)").eq("trip_id", value: tripId).execute().value
        return rows.map { Companion($0.travelCompanions) }.sorted { $0.displayName.localizedCaseInsensitiveCompare($1.displayName) == .orderedAscending }
    }

    func saveCompanions(_ names: [String], tripId: UUID) async throws {
        try await client.from("trip_companions").delete().eq("trip_id", value: tripId).execute()
        for name in names.map({ $0.trimmingCharacters(in: .whitespacesAndNewlines) }).filter({ !$0.isEmpty }) {
            let companion: PublicSchema.TravelCompanionsSelect = try await client
                .from("travel_companions")
                .insert(["display_name": name])
                .select().single().execute().value
            try await client.from("trip_companions").insert([
                "trip_id": tripId.uuidString,
                "companion_id": companion.id.uuidString,
            ]).execute()
        }
    }

    // MARK: Memories

    func memories(limit: Int) async throws -> [Memory] {
        let rows: [PublicSchema.MemoriesSelect] = try await client
            .from("memories")
            .select()
            .eq("upload_status", value: UploadStatus.ready.rawValue)
            .order("taken_at", ascending: false, nullsFirst: false)
            .order("id", ascending: false)
            .limit(min(max(limit, 1), 1_000))
            .execute().value
        return rows.map(Memory.init)
    }

    func upload(photo: ProcessedPhoto, draft: MemoryUploadDraft) async throws -> Memory {
        let insert = PublicSchema.MemoriesInsert(
            caption: emptyToNil(draft.caption), createdAt: nil,
            declaredSizeBytes: Int64(photo.original.count),
            declaredThumbnailSizeBytes: Int64(photo.thumbnail.count), displayOrder: nil,
            height: Int32(photo.height), id: nil, isFavourite: nil,
            locationLabel: emptyToNil(draft.locationLabel), originalMimeType: photo.mimeType,
            originalPath: nil, storedSizeBytes: nil, storedThumbnailSizeBytes: nil,
            takenAt: AppDate.formatInstant(draft.takenAt), thumbnailPath: nil,
            tripId: draft.tripId, updatedAt: nil, uploadStatus: nil, userId: nil,
            width: Int32(photo.width)
        )
        let pending: PublicSchema.MemoriesSelect = try await client.from("memories").insert(insert).select().single().execute().value
        do {
            try await client.storage.from("travel-memories").upload(
                pending.originalPath, data: photo.original,
                options: .init(cacheControl: "0", contentType: photo.mimeType, upsert: false)
            )
            try await client.storage.from("travel-thumbnails").upload(
                pending.thumbnailPath, data: photo.thumbnail,
                options: .init(cacheControl: "0", contentType: "image/jpeg", upsert: false)
            )
            let _: FunctionEnvelope<FinalizeMemoryResult> = try await client.functions.invoke(
                "finalize-memory-upload",
                options: .init(body: ["memory_id": pending.id.uuidString])
            )
            let ready: PublicSchema.MemoriesSelect = try await client.from("memories").select().eq("id", value: pending.id).single().execute().value
            return Memory(ready)
        } catch {
            throw map(error)
        }
    }

    func retryUpload(_ draft: MemoryUploadDraft) async throws -> Memory {
        let originalURL = try DraftFileStore.fileURL(named: draft.originalFile)
        let thumbnailURL = try DraftFileStore.fileURL(named: draft.thumbnailFile)
        let original = try Data(contentsOf: originalURL, options: .mappedIfSafe)
        let thumbnail = try Data(contentsOf: thumbnailURL, options: .mappedIfSafe)
        guard let source = CGImageSourceCreateWithData(original as CFData, nil),
              let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
              let width = properties[kCGImagePropertyPixelWidth] as? Int,
              let height = properties[kCGImagePropertyPixelHeight] as? Int else {
            throw AppError.validation("The saved photo draft is unreadable.")
        }
        return try await upload(
            photo: ProcessedPhoto(original: original, thumbnail: thumbnail, width: width, height: height, mimeType: "image/jpeg"),
            draft: draft
        )
    }

    func setMemoryFavourite(id: UUID, isFavourite: Bool) async throws {
        try await client.from("memories").update(["is_favourite": isFavourite]).eq("id", value: id).execute()
    }

    func deleteMemory(id: UUID) async throws {
        let _: FunctionEnvelope<MemoryDeleteResult> = try await client.functions.invoke(
            "delete-memory", options: .init(body: ["memory_id": id.uuidString])
        )
        signedURLs = signedURLs.filter { !$0.key.contains(id.uuidString) }
    }

    func signedThumbnailURL(for memory: Memory) async throws -> URL {
        try await signedURL(bucket: "travel-thumbnails", path: memory.thumbnailPath)
    }

    func signedOriginalURL(for memory: Memory) async throws -> URL {
        try await signedURL(bucket: "travel-memories", path: memory.originalPath)
    }

    // MARK: Profile

    func profile() async throws -> (Profile, Preferences) {
        let session = try await client.auth.session
        async let profileRequest: PublicSchema.ProfilesSelect = client.from("profiles").select().eq("id", value: session.user.id).single().execute().value
        async let preferencesRequest: PublicSchema.UserPreferencesSelect = client.from("user_preferences").select().eq("user_id", value: session.user.id).single().execute().value
        let loaded = try await (profileRequest, preferencesRequest)
        return (
            Profile(id: loaded.0.id, displayName: loaded.0.displayName ?? "", email: session.user.email ?? ""),
            Preferences(
                theme: ThemePreference(rawValue: loaded.1.theme) ?? .system,
                reducedMotion: loaded.1.reducedMotion,
                removePhotoGPS: loaded.1.removePhotoGpsByDefault,
                analyticsConsent: loaded.1.analyticsConsent
            )
        )
    }

    func updateProfile(name: String) async throws -> Profile {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard (1...80).contains(trimmed.count) else { throw AppError.validation("Name must contain 1–80 characters.") }
        let session = try await client.auth.session
        let row: PublicSchema.ProfilesSelect = try await client.from("profiles").update(["display_name": trimmed]).eq("id", value: session.user.id).select().single().execute().value
        return Profile(id: row.id, displayName: row.displayName ?? "", email: session.user.email ?? "")
    }

    func updatePreferences(_ preferences: Preferences) async throws {
        try await client.from("user_preferences").update([
            "theme": .string(preferences.theme.rawValue),
            "reduced_motion": .bool(preferences.reducedMotion),
            "remove_photo_gps_by_default": .bool(preferences.removePhotoGPS),
            "analytics_consent": .bool(preferences.analyticsConsent),
        ] as [String: AnyJSON]).execute()
    }

    func deleteAccount(confirmation: String) async throws {
        guard confirmation == "DELETE" else { throw AppError.validation("Type DELETE exactly to continue.") }
        do {
            let _: FunctionEnvelope<AccountDeleteResult> = try await client.functions.invoke(
                "delete-account", options: .init(body: ["confirmation": confirmation])
            )
            signedURLs.removeAll()
            try? await client.auth.signOut()
        } catch { throw map(error) }
    }

    // MARK: Helpers

    private func signedURL(bucket: String, path: String) async throws -> URL {
        let key = "\(bucket):\(path)"
        if let cached = signedURLs[key], cached.expiresAt > Date().addingTimeInterval(30) { return cached.url }
        let url = try await client.storage.from(bucket).createSignedURL(path: path, expiresIn: 600)
        signedURLs[key] = (url, Date().addingTimeInterval(570))
        return url
    }

    private func tripPayload(_ draft: TripDraft) -> [String: AnyJSON] {
        let amount = Decimal(string: draft.expenseAmount).map { NSDecimalNumber(decimal: $0).doubleValue }
        return [
            "country_code": .string(draft.countryCode),
            "name": .string(draft.name.trimmingCharacters(in: .whitespacesAndNewlines)),
            "city": json(draft.city), "region": json(draft.region),
            "start_date": .string(AppDate.formatDay(draft.startDate)),
            "end_date": .string(AppDate.formatDay(draft.endDate)),
            "journal": json(draft.journal), "favourite_memory": json(draft.favouriteMemory),
            "mood": json(draft.mood),
            "rating": draft.rating == 0 ? .null : .integer(draft.rating),
            "expense_amount": amount.map(AnyJSON.double) ?? .null,
            "expense_currency": json(draft.expenseCurrency.uppercased()),
            "is_favourite": .bool(draft.isFavourite),
        ]
    }

    private func json(_ value: String) -> AnyJSON {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? .null : .string(trimmed)
    }

    private func emptyToNil(_ value: String) -> String? {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    private func map(_ error: Error) -> Error {
        if case FunctionsError.httpError(let code, let data) = error,
           let envelope = try? JSONDecoder().decode(FunctionErrorEnvelope.self, from: data) {
            switch envelope.error.code {
            case "AUTH_REQUIRED": return AppError.unauthorized
            case "UPLOAD_INCOMPLETE": return AppError.uploadIncomplete
            default: return AppError.service(envelope.error.message)
            }
        }
        return error
    }
}

private struct FunctionEnvelope<Value: Decodable>: Decodable { let data: Value }
private struct FunctionErrorEnvelope: Decodable { struct Payload: Decodable { let code: String; let message: String }; let error: Payload }
private struct FinalizeMemoryResult: Decodable { let memoryId: UUID; let uploadStatus: String; enum CodingKeys: String, CodingKey { case memoryId = "memory_id"; case uploadStatus = "upload_status" } }
private struct MemoryDeleteResult: Decodable { let memoryId: UUID; let deleted: Bool; enum CodingKeys: String, CodingKey { case memoryId = "memory_id"; case deleted } }
private struct TripDeleteResult: Decodable { let tripId: UUID; let deleted: Bool; enum CodingKeys: String, CodingKey { case tripId = "trip_id"; case deleted } }
private struct AccountDeleteResult: Decodable { let deleted: Bool }

private extension Country {
    init(_ row: PublicSchema.CountriesSelect) {
        self.init(isoCode: row.isoCode, iso3Code: row.iso3Code, name: row.name, continentName: row.continentName, region: row.region, countsTowardWorldTotal: row.countsTowardWorldTotal)
    }
}

private extension Trip {
    init(_ row: PublicSchema.TripsSelect) {
        self.init(
            id: row.id, countryCode: row.countryCode, name: row.name, city: row.city, region: row.region,
            startDate: AppDate.parseDay(row.startDate), endDate: AppDate.parseDay(row.endDate),
            journal: row.journal, favouriteMemory: row.favouriteMemory, mood: row.mood,
            rating: row.rating.map(Int.init), expenseAmount: row.expenseAmount,
            expenseCurrency: row.expenseCurrency, isFavourite: row.isFavourite,
            updatedAt: AppDate.parseInstant(row.updatedAt) ?? .distantPast
        )
    }
}

private extension Memory {
    init(_ row: PublicSchema.MemoriesSelect) {
        self.init(
            id: row.id, tripId: row.tripId, caption: row.caption, locationLabel: row.locationLabel,
            takenAt: AppDate.parseInstant(row.takenAt), displayOrder: Int(row.displayOrder),
            isFavourite: row.isFavourite, originalPath: row.originalPath,
            thumbnailPath: row.thumbnailPath, originalMimeType: row.originalMimeType,
            uploadStatus: UploadStatus(rawValue: row.uploadStatus) ?? .failed,
            width: row.width.map(Int.init), height: row.height.map(Int.init),
            updatedAt: AppDate.parseInstant(row.updatedAt) ?? .distantPast
        )
    }
}

private extension Place {
    init(_ row: PublicSchema.PlacesSelect) {
        self.init(id: row.id, tripId: row.tripId, countryCode: row.countryCode, name: row.name, city: row.city, latitude: row.latitude, longitude: row.longitude, notes: row.notes)
    }
}

private extension Companion {
    init(_ row: PublicSchema.TravelCompanionsSelect) { self.init(id: row.id, displayName: row.displayName, notes: row.notes) }
}
