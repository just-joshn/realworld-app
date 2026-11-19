type RecordedDelete = () => Promise<void>;

let records: RecordedDelete[] | undefined;

export function recordDelete(deleteRecord: RecordedDelete) {
  if (records !== undefined) records = [...records, deleteRecord];
}

export function startRecordedDeletes() {
  records = [];
}

export async function runRecordedDeletes() {
  const pending = records ?? [];
  records = [];
  for (const deleteRecord of pending.toReversed()) {
    await deleteRecord();
  }
}

export function stopRecordedDeletes() {
  records = undefined;
}
