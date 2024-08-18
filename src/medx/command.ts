import { MedxArgs, renderArgs } from "./macro";

export async function insertIncrementalMedia({ uuid }: { uuid: string }) {
  const args: MedxArgs = {
    url: '/home/mochar/Music/acemkurdi.m4a',
    volume: 1,
    rate: 1,
    loop: false
  };
  const macro = renderArgs({ args });
  await logseq.Editor.insertAtEditingCursor(macro);
}