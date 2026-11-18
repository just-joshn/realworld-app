type RecordedDelete = () => Promise<void>;

let records: RecordedDelete[] | undefined;

export function recordDelete(deleteRecord: RecordedDelete) {
  records?.push(deleteRecord);
}

export function startRecordedDeletes() {
  records = [];
}

export async function runRecordedDeletes() {
  const pending = records ?? [];
  records = [];
  for (const deleteRecord of pending.reverse()) {
    await deleteRecord();
  }
}

export function stopRecordedDeletes() {
  records = undefined;
}
