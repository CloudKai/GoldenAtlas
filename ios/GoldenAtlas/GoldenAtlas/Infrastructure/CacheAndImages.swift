import Foundation
import ImageIO
import PhotosUI
import SwiftData
import SwiftUI
import UniformTypeIdentifiers
import UIKit

// MARK: - SwiftData cache

@Model
final class SnapshotRecord {
    @Attribute(.unique) var userId: String
    var payload: Data
    var storedAt: Date

    init(userId: String, payload: Data, storedAt: Date) {
        self.userId = userId
        self.payload = payload
        self.storedAt = storedAt
    }
}

@Model
final class TripDraftRecord {
    @Attribute(.unique) var userId: String
    var payload: Data

    init(userId: String, payload: Data) { self.userId = userId; self.payload = payload }
}

@Model
final class UploadDraftRecord {
    @Attribute(.unique) var id: String
    var payload: Data

    init(id: String, payload: Data) { self.id = id; self.payload = payload }
}

actor SwiftDataCache: CacheRepository {
    private let container: ModelContainer
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init(inMemory: Bool = false) throws {
        let configuration = ModelConfiguration(isStoredInMemoryOnly: inMemory)
        container = try ModelContainer(for: SnapshotRecord.self, TripDraftRecord.self, UploadDraftRecord.self, configurations: configuration)
    }

    func readSnapshot(userId: UUID) async -> CachedSnapshot? {
        let key = userId.uuidString
        let context = ModelContext(container)
        let descriptor = FetchDescriptor<SnapshotRecord>(predicate: #Predicate { $0.userId == key })
        guard let record = try? context.fetch(descriptor).first else { return nil }
        return try? decoder.decode(CachedSnapshot.self, from: record.payload)
    }

    func writeSnapshot(_ snapshot: CachedSnapshot, userId: UUID) async {
        guard let payload = try? encoder.encode(snapshot) else { return }
        let key = userId.uuidString
        let context = ModelContext(container)
        let descriptor = FetchDescriptor<SnapshotRecord>(predicate: #Predicate { $0.userId == key })
        if let existing = try? context.fetch(descriptor).first {
            existing.payload = payload
            existing.storedAt = snapshot.storedAt
        } else {
            context.insert(SnapshotRecord(userId: key, payload: payload, storedAt: snapshot.storedAt))
        }
        try? context.save()
    }

    func saveTripDraft(_ draft: TripDraft?, userId: UUID) async {
        let key = userId.uuidString
        let context = ModelContext(container)
        let descriptor = FetchDescriptor<TripDraftRecord>(predicate: #Predicate { $0.userId == key })
        if let existing = try? context.fetch(descriptor).first { context.delete(existing) }
        if let draft, let payload = try? encoder.encode(draft) { context.insert(TripDraftRecord(userId: key, payload: payload)) }
        try? context.save()
    }

    func tripDraft(userId: UUID) async -> TripDraft? {
        let key = userId.uuidString
        let context = ModelContext(container)
        let descriptor = FetchDescriptor<TripDraftRecord>(predicate: #Predicate { $0.userId == key })
        guard let payload = try? context.fetch(descriptor).first?.payload else { return nil }
        return try? decoder.decode(TripDraft.self, from: payload)
    }

    func saveUploadDraft(_ draft: MemoryUploadDraft) async throws {
        let context = ModelContext(container)
        let key = draft.id.uuidString
        let payload = try encoder.encode(draft)
        let descriptor = FetchDescriptor<UploadDraftRecord>(predicate: #Predicate { $0.id == key })
        if let existing = try context.fetch(descriptor).first { existing.payload = payload }
        else { context.insert(UploadDraftRecord(id: key, payload: payload)) }
        try context.save()
    }

    func uploadDrafts() async -> [MemoryUploadDraft] {
        let context = ModelContext(container)
        let records = (try? context.fetch(FetchDescriptor<UploadDraftRecord>())) ?? []
        return records.compactMap { try? decoder.decode(MemoryUploadDraft.self, from: $0.payload) }
    }

    func removeUploadDraft(id: UUID) async {
        let context = ModelContext(container)
        let key = id.uuidString
        let descriptor = FetchDescriptor<UploadDraftRecord>(predicate: #Predicate { $0.id == key })
        if let existing = try? context.fetch(descriptor).first { context.delete(existing); try? context.save() }
        try? DraftFileStore.removeFiles(for: id)
    }

    func clear(userId: UUID) async {
        let context = ModelContext(container)
        let key = userId.uuidString
        if let snapshot = try? context.fetch(FetchDescriptor<SnapshotRecord>(predicate: #Predicate { $0.userId == key })).first { context.delete(snapshot) }
        if let draft = try? context.fetch(FetchDescriptor<TripDraftRecord>(predicate: #Predicate { $0.userId == key })).first { context.delete(draft) }
        try? context.save()
    }
}

// MARK: - Protected photo drafts

enum DraftFileStore {
    static func directory() throws -> URL {
        let base = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        let directory = base.appendingPathComponent("PendingMemoryUploads", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try? FileManager.default.setAttributes([.protectionKey: FileProtectionType.complete], ofItemAtPath: directory.path)
        return directory
    }

    static func fileURL(named name: String) throws -> URL {
        guard name.range(of: "^[A-F0-9-]+-(original|thumbnail)\\.jpg$", options: [.regularExpression, .caseInsensitive]) != nil else {
            throw AppError.validation("Invalid local photo draft path.")
        }
        return try directory().appendingPathComponent(name)
    }

    static func save(_ photo: ProcessedPhoto, id: UUID) throws -> (original: String, thumbnail: String) {
        let originalName = "\(id.uuidString)-original.jpg"
        let thumbnailName = "\(id.uuidString)-thumbnail.jpg"
        try photo.original.write(to: fileURL(named: originalName), options: [.atomic, .completeFileProtection])
        try photo.thumbnail.write(to: fileURL(named: thumbnailName), options: [.atomic, .completeFileProtection])
        return (originalName, thumbnailName)
    }

    static func removeFiles(for id: UUID) throws {
        for suffix in ["original", "thumbnail"] {
            let url = try fileURL(named: "\(id.uuidString)-\(suffix).jpg")
            try? FileManager.default.removeItem(at: url)
        }
    }
}

// MARK: - Image sanitation and resizing

@MainActor
enum PhotoProcessor {
    static let originalLimit = 15 * 1_024 * 1_024
    static let thumbnailLimit = 512 * 1_024

    static func process(_ data: Data) throws -> ProcessedPhoto {
        guard let image = UIImage(data: data) else { throw AppError.validation("This photo could not be decoded.") }
        let normalized = render(image, maxSide: 2_600)
        let thumbnailImage = render(image, maxSide: 720)
        let original = try jpeg(normalized, maximumBytes: originalLimit, startingQuality: 0.90)
        let thumbnail = try jpeg(thumbnailImage, maximumBytes: thumbnailLimit, startingQuality: 0.82)
        guard let cgImage = normalized.cgImage else { throw AppError.validation("This photo could not be processed.") }
        return ProcessedPhoto(original: original, thumbnail: thumbnail, width: cgImage.width, height: cgImage.height, mimeType: UTType.jpeg.preferredMIMEType ?? "image/jpeg")
    }

    private static func render(_ image: UIImage, maxSide: CGFloat) -> UIImage {
        let source = image.size
        let scale = min(1, maxSide / max(source.width, source.height))
        let size = CGSize(width: max(1, floor(source.width * scale)), height: max(1, floor(source.height * scale)))
        let renderer = UIGraphicsImageRenderer(size: size, format: {
            let format = UIGraphicsImageRendererFormat()
            format.scale = 1
            format.opaque = true
            return format
        }())
        return renderer.image { context in
            UIColor.black.setFill()
            context.fill(CGRect(origin: .zero, size: size))
            image.draw(in: CGRect(origin: .zero, size: size))
        }
    }

    private static func jpeg(_ image: UIImage, maximumBytes: Int, startingQuality: CGFloat) throws -> Data {
        var quality = startingQuality
        while quality >= 0.45 {
            if let data = image.jpegData(compressionQuality: quality), data.count <= maximumBytes { return data }
            quality -= 0.08
        }
        throw AppError.validation("The processed photo is still too large. Choose a smaller image.")
    }
}

// MARK: - Ephemeral signed media loading

actor SignedImageLoader {
    static let shared = SignedImageLoader()
    private struct Entry: Sendable { let data: Data; let expiresAt: Date }
    private let session: URLSession
    private var cache: [URL: Entry] = [:]

    init() {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        configuration.urlCache = nil
        session = URLSession(configuration: configuration)
    }

    func data(for url: URL) async throws -> Data {
        if let entry = cache[url], entry.expiresAt > Date().addingTimeInterval(15) { return entry.data }
        let (data, response) = try await session.data(from: url)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw AppError.network("This private photo is temporarily unavailable.")
        }
        cache[url] = Entry(data: data, expiresAt: Date().addingTimeInterval(540))
        return data
    }

    func clear() { cache.removeAll() }
}

struct SignedRemoteImage<Content: View, Placeholder: View>: View {
    let url: @Sendable () async throws -> URL
    @ViewBuilder let content: (Image) -> Content
    @ViewBuilder let placeholder: () -> Placeholder
    @State private var image: UIImage?

    var body: some View {
        Group {
            if let image { content(Image(uiImage: image)) }
            else { placeholder() }
        }
        .task {
            do {
                let signedURL = try await url()
                let data = try await SignedImageLoader.shared.data(for: signedURL)
                image = UIImage(data: data)
            } catch { image = nil }
        }
    }
}

