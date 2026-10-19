import Foundation
import Supabase

public enum PublicSchema {
  public struct AccountDeletionRequestsSelect: Codable, Hashable, Sendable {
    public let completedAt: String?
    public let createdAt: String
    public let failureCode: String?
    public let id: UUID
    public let requestedAt: String
    public let retryCount: Int32
    public let status: String
    public let updatedAt: String
    public let userId: UUID
    public enum CodingKeys: String, CodingKey {
      case completedAt = "completed_at"
      case createdAt = "created_at"
      case failureCode = "failure_code"
      case id = "id"
      case requestedAt = "requested_at"
      case retryCount = "retry_count"
      case status = "status"
      case updatedAt = "updated_at"
      case userId = "user_id"
    }
  }
  public struct AccountDeletionRequestsInsert: Codable, Hashable, Sendable {
    public let completedAt: String?
    public let createdAt: String?
    public let failureCode: String?
    public let id: UUID?
    public let requestedAt: String?
    public let retryCount: Int32?
    public let status: String?
    public let updatedAt: String?
    public let userId: UUID
    public enum CodingKeys: String, CodingKey {
      case completedAt = "completed_at"
      case createdAt = "created_at"
      case failureCode = "failure_code"
      case id = "id"
      case requestedAt = "requested_at"
      case retryCount = "retry_count"
      case status = "status"
      case updatedAt = "updated_at"
      case userId = "user_id"
    }
  }
  public struct AccountDeletionRequestsUpdate: Codable, Hashable, Sendable {
    public let completedAt: String?
    public let createdAt: String?
    public let failureCode: String?
    public let id: UUID?
    public let requestedAt: String?
    public let retryCount: Int32?
    public let status: String?
    public let updatedAt: String?
    public let userId: UUID?
    public enum CodingKeys: String, CodingKey {
      case completedAt = "completed_at"
      case createdAt = "created_at"
      case failureCode = "failure_code"
      case id = "id"
      case requestedAt = "requested_at"
      case retryCount = "retry_count"
      case status = "status"
      case updatedAt = "updated_at"
      case userId = "user_id"
    }
  }
  public struct BucketListSelect: Codable, Hashable, Sendable {
    public let countryCode: String
    public let createdAt: String
    public let id: UUID
    public let notes: String?
    public let updatedAt: String
    public let userId: UUID
    public enum CodingKeys: String, CodingKey {
      case countryCode = "country_code"
      case createdAt = "created_at"
      case id = "id"
      case notes = "notes"
      case updatedAt = "updated_at"
      case userId = "user_id"
    }
  }
  public struct BucketListInsert: Codable, Hashable, Sendable {
    public let countryCode: String
    public let createdAt: String?
    public let id: UUID?
    public let notes: String?
    public let updatedAt: String?
    public let userId: UUID?
    public enum CodingKeys: String, CodingKey {
      case countryCode = "country_code"
      case createdAt = "created_at"
      case id = "id"
      case notes = "notes"
      case updatedAt = "updated_at"
      case userId = "user_id"
    }
  }
  public struct BucketListUpdate: Codable, Hashable, Sendable {
    public let countryCode: String?
    public let createdAt: String?
    public let id: UUID?
    public let notes: String?
    public let updatedAt: String?
    public let userId: UUID?
    public enum CodingKeys: String, CodingKey {
      case countryCode = "country_code"
      case createdAt = "created_at"
      case id = "id"
      case notes = "notes"
      case updatedAt = "updated_at"
      case userId = "user_id"
    }
  }
  public struct CountriesSelect: Codable, Hashable, Sendable {
    public let continentCode: String
    public let continentName: String
    public let countsTowardWorldTotal: Bool
    public let createdAt: String
    public let isActive: Bool
    public let isoCode: String
    public let iso3Code: String
    public let name: String
    public let numericCode: String?
    public let officialName: String?
    public let region: String?
    public let sortOrder: Int32
    public let subregion: String?
    public let updatedAt: String
    public enum CodingKeys: String, CodingKey {
      case continentCode = "continent_code"
      case continentName = "continent_name"
      case countsTowardWorldTotal = "counts_toward_world_total"
      case createdAt = "created_at"
      case isActive = "is_active"
      case isoCode = "iso_code"
      case iso3Code = "iso3_code"
      case name = "name"
      case numericCode = "numeric_code"
      case officialName = "official_name"
      case region = "region"
      case sortOrder = "sort_order"
      case subregion = "subregion"
      case updatedAt = "updated_at"
    }
  }
  public struct CountriesInsert: Codable, Hashable, Sendable {
    public let continentCode: String
    public let continentName: String
    public let countsTowardWorldTotal: Bool?
    public let createdAt: String?
    public let isActive: Bool?
    public let isoCode: String
    public let iso3Code: String
    public let name: String
    public let numericCode: String?
    public let officialName: String?
    public let region: String?
    public let sortOrder: Int32?
    public let subregion: String?
    public let updatedAt: String?
    public enum CodingKeys: String, CodingKey {
      case continentCode = "continent_code"
      case continentName = "continent_name"
      case countsTowardWorldTotal = "counts_toward_world_total"
      case createdAt = "created_at"
      case isActive = "is_active"
      case isoCode = "iso_code"
      case iso3Code = "iso3_code"
      case name = "name"
      case numericCode = "numeric_code"
      case officialName = "official_name"
      case region = "region"
      case sortOrder = "sort_order"
      case subregion = "subregion"
      case updatedAt = "updated_at"
    }
  }
  public struct CountriesUpdate: Codable, Hashable, Sendable {
    public let continentCode: String?
    public let continentName: String?
    public let countsTowardWorldTotal: Bool?
    public let createdAt: String?
    public let isActive: Bool?
    public let isoCode: String?
    public let iso3Code: String?
    public let name: String?
    public let numericCode: String?
    public let officialName: String?
    public let region: String?
    public let sortOrder: Int32?
    public let subregion: String?
    public let updatedAt: String?
    public enum CodingKeys: String, CodingKey {
      case continentCode = "continent_code"
      case continentName = "continent_name"
      case countsTowardWorldTotal = "counts_toward_world_total"
      case createdAt = "created_at"
      case isActive = "is_active"
      case isoCode = "iso_code"
      case iso3Code = "iso3_code"
      case name = "name"
      case numericCode = "numeric_code"
      case officialName = "official_name"
      case region = "region"
      case sortOrder = "sort_order"
      case subregion = "subregion"
      case updatedAt = "updated_at"
    }
  }
  public struct DataExportJobsSelect: Codable, Hashable, Sendable {
    public let completedAt: String?
    public let createdAt: String
    public let errorCode: String?
    public let expiresAt: String?
    public let format: String
    public let id: UUID
    public let requestedAt: String
    public let status: String
    public let storagePath: String?
    public let updatedAt: String
    public let userId: UUID
    public enum CodingKeys: String, CodingKey {
      case completedAt = "completed_at"
      case createdAt = "created_at"
      case errorCode = "error_code"
      case expiresAt = "expires_at"
      case format = "format"
      case id = "id"
      case requestedAt = "requested_at"
      case status = "status"
      case storagePath = "storage_path"
      case updatedAt = "updated_at"
      case userId = "user_id"
    }
  }
  public struct DataExportJobsInsert: Codable, Hashable, Sendable {
    public let completedAt: String?
    public let createdAt: String?
    public let errorCode: String?
    public let expiresAt: String?
    public let format: String?
    public let id: UUID?
    public let requestedAt: String?
    public let status: String?
    public let storagePath: String?
    public let updatedAt: String?
    public let userId: UUID?
    public enum CodingKeys: String, CodingKey {
      case completedAt = "completed_at"
      case createdAt = "created_at"
      case errorCode = "error_code"
      case expiresAt = "expires_at"
      case format = "format"
      case id = "id"
      case requestedAt = "requested_at"
      case status = "status"
      case storagePath = "storage_path"
      case updatedAt = "updated_at"
      case userId = "user_id"
    }
  }
  public struct DataExportJobsUpdate: Codable, Hashable, Sendable {
    public let completedAt: String?
    public let createdAt: String?
    public let errorCode: String?
    public let expiresAt: String?
    public let format: String?
    public let id: UUID?
    public let requestedAt: String?
    public let status: String?
    public let storagePath: String?
    public let updatedAt: String?
    public let userId: UUID?
    public enum CodingKeys: String, CodingKey {
      case completedAt = "completed_at"
      case createdAt = "created_at"
      case errorCode = "error_code"
      case expiresAt = "expires_at"
      case format = "format"
      case id = "id"
      case requestedAt = "requested_at"
      case status = "status"
      case storagePath = "storage_path"
      case updatedAt = "updated_at"
      case userId = "user_id"
    }
  }
  public struct MemoriesSelect: Codable, Hashable, Sendable {
    public let caption: String?
    public let createdAt: String
    public let declaredSizeBytes: Int64
    public let declaredThumbnailSizeBytes: Int64
    public let displayOrder: Int32
    public let height: Int32?
    public let id: UUID
    public let isFavourite: Bool
    public let locationLabel: String?
    public let originalMimeType: String
    public let originalPath: String
    public let storedSizeBytes: Int64?
    public let storedThumbnailSizeBytes: Int64?
    public let takenAt: String?
    public let thumbnailPath: String
    public let tripId: UUID
    public let updatedAt: String
    public let uploadStatus: String
    public let userId: UUID
    public let width: Int32?
    public enum CodingKeys: String, CodingKey {
      case caption = "caption"
      case createdAt = "created_at"
      case declaredSizeBytes = "declared_size_bytes"
      case declaredThumbnailSizeBytes = "declared_thumbnail_size_bytes"
      case displayOrder = "display_order"
      case height = "height"
      case id = "id"
      case isFavourite = "is_favourite"
      case locationLabel = "location_label"
      case originalMimeType = "original_mime_type"
      case originalPath = "original_path"
      case storedSizeBytes = "stored_size_bytes"
      case storedThumbnailSizeBytes = "stored_thumbnail_size_bytes"
      case takenAt = "taken_at"
      case thumbnailPath = "thumbnail_path"
      case tripId = "trip_id"
      case updatedAt = "updated_at"
      case uploadStatus = "upload_status"
      case userId = "user_id"
      case width = "width"
    }
  }
  public struct MemoriesInsert: Codable, Hashable, Sendable {
    public let caption: String?
    public let createdAt: String?
    public let declaredSizeBytes: Int64
    public let declaredThumbnailSizeBytes: Int64
    public let displayOrder: Int32?
    public let height: Int32?
    public let id: UUID?
    public let isFavourite: Bool?
    public let locationLabel: String?
    public let originalMimeType: String
    public let originalPath: String?
    public let storedSizeBytes: Int64?
    public let storedThumbnailSizeBytes: Int64?
    public let takenAt: String?
    public let thumbnailPath: String?
    public let tripId: UUID
    public let updatedAt: String?
    public let uploadStatus: String?
    public let userId: UUID?
    public let width: Int32?
    public enum CodingKeys: String, CodingKey {
      case caption = "caption"
      case createdAt = "created_at"
      case declaredSizeBytes = "declared_size_bytes"
      case declaredThumbnailSizeBytes = "declared_thumbnail_size_bytes"
      case displayOrder = "display_order"
      case height = "height"
      case id = "id"
      case isFavourite = "is_favourite"
      case locationLabel = "location_label"
      case originalMimeType = "original_mime_type"
      case originalPath = "original_path"
      case storedSizeBytes = "stored_size_bytes"
      case storedThumbnailSizeBytes = "stored_thumbnail_size_bytes"
      case takenAt = "taken_at"
      case thumbnailPath = "thumbnail_path"
      case tripId = "trip_id"
      case updatedAt = "updated_at"
      case uploadStatus = "upload_status"
      case userId = "user_id"
      case width = "width"
    }
  }
  public struct MemoriesUpdate: Codable, Hashable, Sendable {
    public let caption: String?
    public let createdAt: String?
    public let declaredSizeBytes: Int64?
    public let declaredThumbnailSizeBytes: Int64?
    public let displayOrder: Int32?
    public let height: Int32?
    public let id: UUID?
    public let isFavourite: Bool?
    public let locationLabel: String?
    public let originalMimeType: String?
    public let originalPath: String?
    public let storedSizeBytes: Int64?
    public let storedThumbnailSizeBytes: Int64?
    public let takenAt: String?
    public let thumbnailPath: String?
    public let tripId: UUID?
    public let updatedAt: String?
    public let uploadStatus: String?
    public let userId: UUID?
    public let width: Int32?
    public enum CodingKeys: String, CodingKey {
      case caption = "caption"
      case createdAt = "created_at"
      case declaredSizeBytes = "declared_size_bytes"
      case declaredThumbnailSizeBytes = "declared_thumbnail_size_bytes"
      case displayOrder = "display_order"
      case height = "height"
      case id = "id"
      case isFavourite = "is_favourite"
      case locationLabel = "location_label"
      case originalMimeType = "original_mime_type"
      case originalPath = "original_path"
      case storedSizeBytes = "stored_size_bytes"
      case storedThumbnailSizeBytes = "stored_thumbnail_size_bytes"
      case takenAt = "taken_at"
      case thumbnailPath = "thumbnail_path"
      case tripId = "trip_id"
      case updatedAt = "updated_at"
      case uploadStatus = "upload_status"
      case userId = "user_id"
      case width = "width"
    }
  }
  public struct PlacesSelect: Codable, Hashable, Sendable {
    public let city: String?
    public let countryCode: String
    public let createdAt: String
    public let id: UUID
    public let latitude: Decimal?
    public let longitude: Decimal?
    public let name: String
    public let notes: String?
    public let tripId: UUID
    public let updatedAt: String
    public let userId: UUID
    public enum CodingKeys: String, CodingKey {
      case city = "city"
      case countryCode = "country_code"
      case createdAt = "created_at"
      case id = "id"
      case latitude = "latitude"
      case longitude = "longitude"
      case name = "name"
      case notes = "notes"
      case tripId = "trip_id"
      case updatedAt = "updated_at"
      case userId = "user_id"
    }
  }
  public struct PlacesInsert: Codable, Hashable, Sendable {
    public let city: String?
    public let countryCode: String
    public let createdAt: String?
    public let id: UUID?
    public let latitude: Decimal?
    public let longitude: Decimal?
    public let name: String
    public let notes: String?
    public let tripId: UUID
    public let updatedAt: String?
    public let userId: UUID?
    public enum CodingKeys: String, CodingKey {
      case city = "city"
      case countryCode = "country_code"
      case createdAt = "created_at"
      case id = "id"
      case latitude = "latitude"
      case longitude = "longitude"
      case name = "name"
      case notes = "notes"
      case tripId = "trip_id"
      case updatedAt = "updated_at"
      case userId = "user_id"
    }
  }
  public struct PlacesUpdate: Codable, Hashable, Sendable {
    public let city: String?
    public let countryCode: String?
    public let createdAt: String?
    public let id: UUID?
    public let latitude: Decimal?
    public let longitude: Decimal?
    public let name: String?
    public let notes: String?
    public let tripId: UUID?
    public let updatedAt: String?
    public let userId: UUID?
    public enum CodingKeys: String, CodingKey {
      case city = "city"
      case countryCode = "country_code"
      case createdAt = "created_at"
      case id = "id"
      case latitude = "latitude"
      case longitude = "longitude"
      case name = "name"
      case notes = "notes"
      case tripId = "trip_id"
      case updatedAt = "updated_at"
      case userId = "user_id"
    }
  }
  public struct ProfilesSelect: Codable, Hashable, Sendable {
    public let avatarPath: String?
    public let createdAt: String
    public let displayName: String?
    public let id: UUID
    public let updatedAt: String
    public enum CodingKeys: String, CodingKey {
      case avatarPath = "avatar_path"
      case createdAt = "created_at"
      case displayName = "display_name"
      case id = "id"
      case updatedAt = "updated_at"
    }
  }
  public struct ProfilesInsert: Codable, Hashable, Sendable {
    public let avatarPath: String?
    public let createdAt: String?
    public let displayName: String?
    public let id: UUID
    public let updatedAt: String?
    public enum CodingKeys: String, CodingKey {
      case avatarPath = "avatar_path"
      case createdAt = "created_at"
      case displayName = "display_name"
      case id = "id"
      case updatedAt = "updated_at"
    }
  }
  public struct ProfilesUpdate: Codable, Hashable, Sendable {
    public let avatarPath: String?
    public let createdAt: String?
    public let displayName: String?
    public let id: UUID?
    public let updatedAt: String?
    public enum CodingKeys: String, CodingKey {
      case avatarPath = "avatar_path"
      case createdAt = "created_at"
      case displayName = "display_name"
      case id = "id"
      case updatedAt = "updated_at"
    }
  }
  public struct TravelCompanionsSelect: Codable, Hashable, Sendable {
    public let createdAt: String
    public let displayName: String
    public let id: UUID
    public let notes: String?
    public let updatedAt: String
    public let userId: UUID
    public enum CodingKeys: String, CodingKey {
      case createdAt = "created_at"
      case displayName = "display_name"
      case id = "id"
      case notes = "notes"
      case updatedAt = "updated_at"
      case userId = "user_id"
    }
  }
  public struct TravelCompanionsInsert: Codable, Hashable, Sendable {
    public let createdAt: String?
    public let displayName: String
    public let id: UUID?
    public let notes: String?
    public let updatedAt: String?
    public let userId: UUID?
    public enum CodingKeys: String, CodingKey {
      case createdAt = "created_at"
      case displayName = "display_name"
      case id = "id"
      case notes = "notes"
      case updatedAt = "updated_at"
      case userId = "user_id"
    }
  }
  public struct TravelCompanionsUpdate: Codable, Hashable, Sendable {
    public let createdAt: String?
    public let displayName: String?
    public let id: UUID?
    public let notes: String?
    public let updatedAt: String?
    public let userId: UUID?
    public enum CodingKeys: String, CodingKey {
      case createdAt = "created_at"
      case displayName = "display_name"
      case id = "id"
      case notes = "notes"
      case updatedAt = "updated_at"
      case userId = "user_id"
    }
  }
  public struct TripCompanionsSelect: Codable, Hashable, Sendable {
    public let companionId: UUID
    public let createdAt: String
    public let tripId: UUID
    public let userId: UUID
    public enum CodingKeys: String, CodingKey {
      case companionId = "companion_id"
      case createdAt = "created_at"
      case tripId = "trip_id"
      case userId = "user_id"
    }
  }
  public struct TripCompanionsInsert: Codable, Hashable, Sendable {
    public let companionId: UUID
    public let createdAt: String?
    public let tripId: UUID
    public let userId: UUID?
    public enum CodingKeys: String, CodingKey {
      case companionId = "companion_id"
      case createdAt = "created_at"
      case tripId = "trip_id"
      case userId = "user_id"
    }
  }
  public struct TripCompanionsUpdate: Codable, Hashable, Sendable {
    public let companionId: UUID?
    public let createdAt: String?
    public let tripId: UUID?
    public let userId: UUID?
    public enum CodingKeys: String, CodingKey {
      case companionId = "companion_id"
      case createdAt = "created_at"
      case tripId = "trip_id"
      case userId = "user_id"
    }
  }
  public struct TripDaysSelect: Codable, Hashable, Sendable {
    public let createdAt: String
    public let dayDate: String
    public let id: UUID
    public let notes: String?
    public let places: [String]
    public let title: String?
    public let tripId: UUID
    public let updatedAt: String
    public let userId: UUID
    public enum CodingKeys: String, CodingKey {
      case createdAt = "created_at"
      case dayDate = "day_date"
      case id = "id"
      case notes = "notes"
      case places = "places"
      case title = "title"
      case tripId = "trip_id"
      case updatedAt = "updated_at"
      case userId = "user_id"
    }
  }
  public struct TripDaysInsert: Codable, Hashable, Sendable {
    public let createdAt: String?
    public let dayDate: String
    public let id: UUID?
    public let notes: String?
    public let places: [String]?
    public let title: String?
    public let tripId: UUID
    public let updatedAt: String?
    public let userId: UUID?
    public enum CodingKeys: String, CodingKey {
      case createdAt = "created_at"
      case dayDate = "day_date"
      case id = "id"
      case notes = "notes"
      case places = "places"
      case title = "title"
      case tripId = "trip_id"
      case updatedAt = "updated_at"
      case userId = "user_id"
    }
  }
  public struct TripDaysUpdate: Codable, Hashable, Sendable {
    public let createdAt: String?
    public let dayDate: String?
    public let id: UUID?
    public let notes: String?
    public let places: [String]?
    public let title: String?
    public let tripId: UUID?
    public let updatedAt: String?
    public let userId: UUID?
    public enum CodingKeys: String, CodingKey {
      case createdAt = "created_at"
      case dayDate = "day_date"
      case id = "id"
      case notes = "notes"
      case places = "places"
      case title = "title"
      case tripId = "trip_id"
      case updatedAt = "updated_at"
      case userId = "user_id"
    }
  }
  public struct TripsSelect: Codable, Hashable, Sendable {
    public let city: String?
    public let countryCode: String
    public let createdAt: String
    public let endDate: String
    public let expenseAmount: Decimal?
    public let expenseCurrency: String?
    public let favouriteMemory: String?
    public let id: UUID
    public let isFavourite: Bool
    public let journal: String?
    public let mood: String?
    public let name: String
    public let rating: Int16?
    public let region: String?
    public let startDate: String
    public let updatedAt: String
    public let userId: UUID
    public enum CodingKeys: String, CodingKey {
      case city = "city"
      case countryCode = "country_code"
      case createdAt = "created_at"
      case endDate = "end_date"
      case expenseAmount = "expense_amount"
      case expenseCurrency = "expense_currency"
      case favouriteMemory = "favourite_memory"
      case id = "id"
      case isFavourite = "is_favourite"
      case journal = "journal"
      case mood = "mood"
      case name = "name"
      case rating = "rating"
      case region = "region"
      case startDate = "start_date"
      case updatedAt = "updated_at"
      case userId = "user_id"
    }
  }
  public struct TripsInsert: Codable, Hashable, Sendable {
    public let city: String?
    public let countryCode: String
    public let createdAt: String?
    public let endDate: String
    public let expenseAmount: Decimal?
    public let expenseCurrency: String?
    public let favouriteMemory: String?
    public let id: UUID?
    public let isFavourite: Bool?
    public let journal: String?
    public let mood: String?
    public let name: String
    public let rating: Int16?
    public let region: String?
    public let startDate: String
    public let updatedAt: String?
    public let userId: UUID?
    public enum CodingKeys: String, CodingKey {
      case city = "city"
      case countryCode = "country_code"
      case createdAt = "created_at"
      case endDate = "end_date"
      case expenseAmount = "expense_amount"
      case expenseCurrency = "expense_currency"
      case favouriteMemory = "favourite_memory"
      case id = "id"
      case isFavourite = "is_favourite"
      case journal = "journal"
      case mood = "mood"
      case name = "name"
      case rating = "rating"
      case region = "region"
      case startDate = "start_date"
      case updatedAt = "updated_at"
      case userId = "user_id"
    }
  }
  public struct TripsUpdate: Codable, Hashable, Sendable {
    public let city: String?
    public let countryCode: String?
    public let createdAt: String?
    public let endDate: String?
    public let expenseAmount: Decimal?
    public let expenseCurrency: String?
    public let favouriteMemory: String?
    public let id: UUID?
    public let isFavourite: Bool?
    public let journal: String?
    public let mood: String?
    public let name: String?
    public let rating: Int16?
    public let region: String?
    public let startDate: String?
    public let updatedAt: String?
    public let userId: UUID?
    public enum CodingKeys: String, CodingKey {
      case city = "city"
      case countryCode = "country_code"
      case createdAt = "created_at"
      case endDate = "end_date"
      case expenseAmount = "expense_amount"
      case expenseCurrency = "expense_currency"
      case favouriteMemory = "favourite_memory"
      case id = "id"
      case isFavourite = "is_favourite"
      case journal = "journal"
      case mood = "mood"
      case name = "name"
      case rating = "rating"
      case region = "region"
      case startDate = "start_date"
      case updatedAt = "updated_at"
      case userId = "user_id"
    }
  }
  public struct UserPreferencesSelect: Codable, Hashable, Sendable {
    public let analyticsConsent: Bool
    public let createdAt: String
    public let favouriteCountryCode: String?
    public let reducedMotion: Bool
    public let removePhotoGpsByDefault: Bool
    public let showSlideshowCaption: Bool
    public let showSlideshowCity: Bool
    public let showSlideshowCountry: Bool
    public let showSlideshowDate: Bool
    public let slideshowDurationSeconds: Int16
    public let slideshowOrder: String
    public let slideshowTransition: String
    public let theme: String
    public let updatedAt: String
    public let userId: UUID
    public enum CodingKeys: String, CodingKey {
      case analyticsConsent = "analytics_consent"
      case createdAt = "created_at"
      case favouriteCountryCode = "favourite_country_code"
      case reducedMotion = "reduced_motion"
      case removePhotoGpsByDefault = "remove_photo_gps_by_default"
      case showSlideshowCaption = "show_slideshow_caption"
      case showSlideshowCity = "show_slideshow_city"
      case showSlideshowCountry = "show_slideshow_country"
      case showSlideshowDate = "show_slideshow_date"
      case slideshowDurationSeconds = "slideshow_duration_seconds"
      case slideshowOrder = "slideshow_order"
      case slideshowTransition = "slideshow_transition"
      case theme = "theme"
      case updatedAt = "updated_at"
      case userId = "user_id"
    }
  }
  public struct UserPreferencesInsert: Codable, Hashable, Sendable {
    public let analyticsConsent: Bool?
    public let createdAt: String?
    public let favouriteCountryCode: String?
    public let reducedMotion: Bool?
    public let removePhotoGpsByDefault: Bool?
    public let showSlideshowCaption: Bool?
    public let showSlideshowCity: Bool?
    public let showSlideshowCountry: Bool?
    public let showSlideshowDate: Bool?
    public let slideshowDurationSeconds: Int16?
    public let slideshowOrder: String?
    public let slideshowTransition: String?
    public let theme: String?
    public let updatedAt: String?
    public let userId: UUID
    public enum CodingKeys: String, CodingKey {
      case analyticsConsent = "analytics_consent"
      case createdAt = "created_at"
      case favouriteCountryCode = "favourite_country_code"
      case reducedMotion = "reduced_motion"
      case removePhotoGpsByDefault = "remove_photo_gps_by_default"
      case showSlideshowCaption = "show_slideshow_caption"
      case showSlideshowCity = "show_slideshow_city"
      case showSlideshowCountry = "show_slideshow_country"
      case showSlideshowDate = "show_slideshow_date"
      case slideshowDurationSeconds = "slideshow_duration_seconds"
      case slideshowOrder = "slideshow_order"
      case slideshowTransition = "slideshow_transition"
      case theme = "theme"
      case updatedAt = "updated_at"
      case userId = "user_id"
    }
  }
  public struct UserPreferencesUpdate: Codable, Hashable, Sendable {
    public let analyticsConsent: Bool?
    public let createdAt: String?
    public let favouriteCountryCode: String?
    public let reducedMotion: Bool?
    public let removePhotoGpsByDefault: Bool?
    public let showSlideshowCaption: Bool?
    public let showSlideshowCity: Bool?
    public let showSlideshowCountry: Bool?
    public let showSlideshowDate: Bool?
    public let slideshowDurationSeconds: Int16?
    public let slideshowOrder: String?
    public let slideshowTransition: String?
    public let theme: String?
    public let updatedAt: String?
    public let userId: UUID?
    public enum CodingKeys: String, CodingKey {
      case analyticsConsent = "analytics_consent"
      case createdAt = "created_at"
      case favouriteCountryCode = "favourite_country_code"
      case reducedMotion = "reduced_motion"
      case removePhotoGpsByDefault = "remove_photo_gps_by_default"
      case showSlideshowCaption = "show_slideshow_caption"
      case showSlideshowCity = "show_slideshow_city"
      case showSlideshowCountry = "show_slideshow_country"
      case showSlideshowDate = "show_slideshow_date"
      case slideshowDurationSeconds = "slideshow_duration_seconds"
      case slideshowOrder = "slideshow_order"
      case slideshowTransition = "slideshow_transition"
      case theme = "theme"
      case updatedAt = "updated_at"
      case userId = "user_id"
    }
  }
  public struct PersonalStatisticsSelect: Codable, Hashable, Sendable {
    public let continentsVisited: Int64?
    public let countriesVisited: Int64?
    public let firstTripDate: String?
    public let latestTripDate: String?
    public let totalMemories: Int64?
    public let totalTravelDays: Int64?
    public let totalTrips: Int64?
    public let userId: UUID?
    public enum CodingKeys: String, CodingKey {
      case continentsVisited = "continents_visited"
      case countriesVisited = "countries_visited"
      case firstTripDate = "first_trip_date"
      case latestTripDate = "latest_trip_date"
      case totalMemories = "total_memories"
      case totalTravelDays = "total_travel_days"
      case totalTrips = "total_trips"
      case userId = "user_id"
    }
  }
}
