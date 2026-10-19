import ImageIO
import Testing
import UIKit
@testable import GoldenAtlas

struct DomainTests {
    @Test func tripDraftRejectsMissingCountryAndInvalidDates() throws {
        var draft = TripDraft()
        draft.name = "Summer in Kyoto"
        #expect(throws: AppError.self) { try draft.validated() }

        draft.countryCode = "JP"
        draft.endDate = draft.startDate.addingTimeInterval(-86_400)
        #expect(throws: AppError.self) { try draft.validated() }
    }

    @Test func tripDurationIncludesBothTravelDates() {
        let start = AppDate.parseDay("2026-07-01")
        let end = AppDate.parseDay("2026-07-03")
        let trip = Trip(
            id: UUID(), countryCode: "JP", name: "Kyoto", city: "Kyoto", region: nil,
            startDate: start, endDate: end, journal: nil, favouriteMemory: nil, mood: nil,
            rating: nil, expenseAmount: nil, expenseCurrency: nil, isFavourite: false, updatedAt: .now
        )
        #expect(trip.durationDays == 3)
    }

    @Test @MainActor func photoProcessorResizesAndRemovesMetadata() throws {
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 3_000, height: 2_000))
        let image = renderer.image { context in UIColor.systemBlue.setFill(); context.fill(CGRect(x: 0, y: 0, width: 3_000, height: 2_000)) }
        let input = try #require(image.jpegData(compressionQuality: 1))
        let processed = try PhotoProcessor.process(input)
        #expect(max(processed.width, processed.height) <= 2_600)
        #expect(processed.original.count <= PhotoProcessor.originalLimit)
        #expect(processed.thumbnail.count <= PhotoProcessor.thumbnailLimit)
        let source = try #require(CGImageSourceCreateWithData(processed.original as CFData, nil))
        let metadata = try #require(CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any])
        #expect(metadata[kCGImagePropertyGPSDictionary] == nil)
    }
}
