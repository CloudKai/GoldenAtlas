import Foundation
import Testing
@testable import GoldenAtlas

struct CacheTests {
    @Test func snapshotAndDraftRoundTrip() async throws {
        let cache = try SwiftDataCache(inMemory: true)
        let userId = UUID()
        let country = Country(isoCode: "SG", iso3Code: "SGP", name: "Singapore", continentName: "Asia", region: "South-eastern Asia", countsTowardWorldTotal: true)
        let snapshot = CachedSnapshot(countries: [country], trips: [], memories: [], bucketList: ["JP"], storedAt: .now)
        await cache.writeSnapshot(snapshot, userId: userId)
        let loaded = await cache.readSnapshot(userId: userId)
        #expect(loaded?.countries == [country])
        #expect(loaded?.bucketList == ["JP"])

        var draft = TripDraft()
        draft.countryCode = "SG"
        draft.name = "Home"
        await cache.saveTripDraft(draft, userId: userId)
        #expect(await cache.tripDraft(userId: userId) == draft)
        await cache.clear(userId: userId)
        #expect(await cache.readSnapshot(userId: userId) == nil)
    }
}
