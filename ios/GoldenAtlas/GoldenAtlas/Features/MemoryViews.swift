import PhotosUI
import SwiftUI
import UIKit

struct MemoriesScreen: View {
    @Bindable var store: AppStore
    @State private var search = ""
    @State private var favouritesOnly = false
    @State private var showAdd = false
    @State private var drafts: [MemoryUploadDraft] = []
    @State private var retrying: UUID?
    @State private var errorMessage: String?

    var filtered: [Memory] {
        store.memories.filter { memory in
            (!favouritesOnly || memory.isFavourite) &&
            (search.isEmpty || (memory.caption?.localizedCaseInsensitiveContains(search) ?? false) || (memory.locationLabel?.localizedCaseInsensitiveContains(search) ?? false))
        }
    }

    let columns = [GridItem(.adaptive(minimum: 106), spacing: 3)]

    var body: some View {
        ScrollView {
            if !drafts.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Waiting to upload").font(.headline)
                    ForEach(drafts) { draft in
                        HStack {
                            Image(systemName: "icloud.and.arrow.up")
                            VStack(alignment: .leading) { Text(draft.caption.isEmpty ? "Photo memory" : draft.caption); Text("Saved securely on this iPhone").font(.caption).foregroundStyle(.secondary) }
                            Spacer()
                            Button(retrying == draft.id ? "Retrying…" : "Retry") { Task { await retry(draft) } }.disabled(retrying != nil)
                        }.padding(12).background(GAColor.surface, in: RoundedRectangle(cornerRadius: 14))
                    }
                }.padding()
            }
            if filtered.isEmpty {
                ContentUnavailableView(
                    store.memories.isEmpty ? "No memories yet" : "No matching memories",
                    systemImage: "photo.on.rectangle.angled",
                    description: Text(store.memories.isEmpty ? "Add photographs to one of your trips." : "Try another search or filter.")
                ).padding(.top, 80)
            } else {
                LazyVGrid(columns: columns, spacing: 3) {
                    ForEach(filtered) { memory in
                        NavigationLink(value: memory) {
                            MemoryThumbnail(memory: memory, store: store).aspectRatio(1, contentMode: .fit)
                        }.buttonStyle(.plain).accessibilityLabel(memory.caption ?? "Travel memory")
                    }
                }
            }
        }
        .background(GAColor.warmBackground)
        .navigationTitle("Memories")
        .navigationDestination(for: Memory.self) { MemoryDetailView(memory: $0, store: store) }
        .searchable(text: $search, prompt: "Search captions and places")
        .toolbar {
            ToolbarItem(placement: .topBarLeading) { Button(favouritesOnly ? "Show all" : "Show favourites", systemImage: favouritesOnly ? "heart.fill" : "heart") { favouritesOnly.toggle() } }
            ToolbarItem(placement: .topBarTrailing) { Button("Add memory", systemImage: "plus") { showAdd = true }.disabled(store.trips.isEmpty) }
        }
        .sheet(isPresented: $showAdd, onDismiss: { Task { await loadDrafts() } }) { AddMemoryView(store: store) }
        .task { await loadDrafts() }
        .refreshable { do { try await store.refreshMemories() } catch { errorMessage = AppSession.safeMessage(error) }; await loadDrafts() }
        .alert("Memory error", isPresented: Binding(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })) { Button("OK", role: .cancel) {} } message: { Text(errorMessage ?? "") }
    }

    private func loadDrafts() async { drafts = await store.services.cache.uploadDrafts() }

    private func retry(_ draft: MemoryUploadDraft) async {
        retrying = draft.id
        defer { retrying = nil }
        do {
            _ = try await store.services.memories.retryUpload(draft)
            await store.services.cache.removeUploadDraft(id: draft.id)
            try await store.refreshMemories()
            await loadDrafts()
        } catch { errorMessage = AppSession.safeMessage(error) }
    }
}

struct MemoryThumbnail: View {
    let memory: Memory
    let store: AppStore

    var body: some View {
        SignedRemoteImage {
            try await store.services.memories.signedThumbnailURL(for: memory)
        } content: { image in
            image.resizable().scaledToFill()
        } placeholder: {
            ZStack { GAColor.unvisited; ProgressView() }
        }
        .clipped()
        .overlay(alignment: .topTrailing) {
            if memory.isFavourite { Image(systemName: "heart.fill").font(.caption).foregroundStyle(.white).padding(6).shadow(radius: 2).accessibilityHidden(true) }
        }
    }
}

struct MemoryDetailView: View {
    let memory: Memory
    @Bindable var store: AppStore
    @Environment(\.dismiss) private var dismiss
    @State private var confirmDelete = false
    @State private var errorMessage: String?

    var activeMemory: Memory { store.memories.first { $0.id == memory.id } ?? memory }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            SignedRemoteImage {
                try await store.services.memories.signedOriginalURL(for: activeMemory)
            } content: { image in
                image.resizable().scaledToFit()
            } placeholder: {
                ProgressView().tint(.white)
            }
            VStack {
                Spacer()
                if activeMemory.caption != nil || activeMemory.locationLabel != nil {
                    VStack(alignment: .leading, spacing: 4) {
                        if let caption = activeMemory.caption { Text(caption).font(.headline) }
                        HStack {
                            if let location = activeMemory.locationLabel { Label(location, systemImage: "mappin") }
                            if let date = activeMemory.takenAt { Text(date.formatted(date: .abbreviated, time: .omitted)) }
                        }.font(.caption).foregroundStyle(.white.opacity(0.8))
                    }
                    .frame(maxWidth: .infinity, alignment: .leading).padding().background(.black.opacity(0.58))
                }
            }
        }
        .toolbarBackground(.black.opacity(0.65), for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button(activeMemory.isFavourite ? "Unfavourite" : "Favourite", systemImage: activeMemory.isFavourite ? "heart.fill" : "heart") {
                    Task { do { try await store.toggleMemoryFavourite(activeMemory) } catch { errorMessage = AppSession.safeMessage(error) } }
                }
                Button("Delete", systemImage: "trash", role: .destructive) { confirmDelete = true }
            }
        }
        .onAppear { OrientationController.memoryViewer(true) }
        .onDisappear { OrientationController.memoryViewer(false) }
        .confirmationDialog("Delete this private memory?", isPresented: $confirmDelete) {
            Button("Delete memory", role: .destructive) {
                Task { do { try await store.deleteMemory(activeMemory); dismiss() } catch { errorMessage = AppSession.safeMessage(error) } }
            }
        }
        .alert("Memory error", isPresented: Binding(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })) { Button("OK", role: .cancel) {} } message: { Text(errorMessage ?? "") }
    }
}

struct AddMemoryView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var store: AppStore
    @State private var selection: PhotosPickerItem?
    @State private var preview: Image?
    @State private var processed: ProcessedPhoto?
    @State private var tripId: UUID?
    @State private var caption = ""
    @State private var location = ""
    @State private var takenAt = Date()
    @State private var isWorking = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Photo") {
                    if let preview { preview.resizable().scaledToFit().frame(maxHeight: 260).clipShape(RoundedRectangle(cornerRadius: 14)) }
                    PhotosPicker(selection: $selection, matching: .images, photoLibrary: .shared()) {
                        Label(processed == nil ? "Choose photo" : "Choose another photo", systemImage: "photo.badge.plus")
                    }
                }
                Section("Memory") {
                    Picker("Trip", selection: $tripId) {
                        Text("Choose a trip").tag(UUID?.none)
                        ForEach(store.trips) { Text($0.name).tag(UUID?.some($0.id)) }
                    }
                    TextField("Caption", text: $caption, axis: .vertical).lineLimit(2...5)
                    TextField("Location", text: $location)
                    DatePicker("Taken", selection: $takenAt)
                }
                Section {
                    Label("Golden Atlas creates private JPEG copies without the source photo’s location or EXIF metadata.", systemImage: "hand.raised.fill")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                if isWorking { Section { HStack { ProgressView(); Text("Preparing and uploading securely…") } } }
                if let errorMessage { Section { Text(errorMessage).foregroundStyle(.red) } }
            }
            .navigationTitle("Add memory")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Upload") { Task { await upload() } }.disabled(processed == nil || tripId == nil || isWorking).accessibilityIdentifier("upload-memory-button") }
            }
            .onChange(of: selection) { _, item in Task { await prepare(item) } }
        }
    }

    @MainActor
    private func prepare(_ item: PhotosPickerItem?) async {
        guard let item else { return }
        isWorking = true
        defer { isWorking = false }
        do {
            guard let data = try await item.loadTransferable(type: Data.self) else { throw AppError.validation("The selected photo could not be read.") }
            let next = try PhotoProcessor.process(data)
            processed = next
            if let image = UIImage(data: next.thumbnail) { preview = Image(uiImage: image) }
        } catch { errorMessage = AppSession.safeMessage(error) }
    }

    private func upload() async {
        guard let processed, let tripId else { return }
        isWorking = true
        defer { isWorking = false }
        let id = UUID()
        do {
            let files = try DraftFileStore.save(processed, id: id)
            let draft = MemoryUploadDraft(
                id: id, tripId: tripId, caption: caption, locationLabel: location,
                takenAt: takenAt, originalFile: files.original, thumbnailFile: files.thumbnail, retryCount: 0
            )
            try await store.services.cache.saveUploadDraft(draft)
            _ = try await store.services.memories.upload(photo: processed, draft: draft)
            await store.services.cache.removeUploadDraft(id: id)
            try await store.refreshMemories()
            dismiss()
        } catch { errorMessage = AppSession.safeMessage(error) }
    }
}
