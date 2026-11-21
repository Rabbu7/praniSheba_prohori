export function formatRequestNote(note, t) {
  if (!note) return '';
  if (note === 'Already added') return t('requests.noteAlreadyAdded');
  if (note === 'Already linked to another account') return t('requests.noteAlreadyLinked');
  return note;
}
