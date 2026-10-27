import Dexie, { type EntityTable } from "dexie";
import type { Note } from "./model";
export const db = new Dexie("imagingquill") as Dexie & {
  notes: EntityTable<Note, "id">;
  snapshots: EntityTable<
    { id: string; noteId: string; savedAt: number; note: Note },
    "id"
  >;
};
db.version(1).stores({
  notes: "id,updatedAt,deletedAt",
  snapshots: "id,noteId,savedAt",
});
export async function saveNote(note: Note, expected: number) {
  return db.transaction("rw", db.notes, db.snapshots, async () => {
    const existing = await db.notes.get(note.id);
    if (existing && existing.revision !== expected)
      throw new Error(
        "This note changed in another tab. Export a backup of your current work, then reopen it to load the latest version.",
      );
    const saved = { ...note, revision: expected + 1, updatedAt: Date.now() };
    const last = await db.snapshots
      .where("noteId")
      .equals(note.id)
      .sortBy("savedAt");
    if (
      existing &&
      (!last.length || Date.now() - last.at(-1)!.savedAt > 60000)
    ) {
      await db.snapshots.put({
        id: crypto.randomUUID(),
        noteId: note.id,
        savedAt: Date.now(),
        note: existing,
      });
      if (last.length >= 10)
        await db.snapshots.bulkDelete(
          last.slice(0, last.length - 9).map((s) => s.id),
        );
    }
    await db.notes.put(saved);
    return saved;
  });
}
