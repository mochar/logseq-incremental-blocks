export async function onCreateIbCommand({ uuid }: { uuid: string }) {
	const block = await logseq.Editor.getBlock(uuid);
	if (!block) return;

  // Don't do anything if already contains macro.
  const rendererMacro = '{{renderer :ib}}';
  if (block.content.includes(rendererMacro)) return;

  // This returns the cursor back to original position, but doesn't
  // work reliably.
	// const blockPos = await logseq.Editor.getEditingCursorPosition();
  // await logseq.Editor.updateBlock(uuid, block.content + `\n${rendererMacro}`);
  // if (blockPos) {
  //   setTimeout(async () => { 
  //     await logseq.Editor.editBlock(uuid, { pos: blockPos.pos });
  //   }, 200);
  // }

  // Add macro.
  await logseq.Editor.updateBlock(uuid, block.content + `\n${rendererMacro}`);
  await logseq.Editor.exitEditingMode();
}