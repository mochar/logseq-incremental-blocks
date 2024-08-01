export async function onCreateIbCommand({ uuid }: { uuid: string }) {
	const block = await logseq.Editor.getBlock(uuid);
	if (!block) return;

	let props = new Map<string, any>([
		['ib-a', block.properties?.ibA ?? 1.0],
		['ib-b', block.properties?.ibB ?? 1.0],
	]);
	console.log(props);
	for (let [prop, val] of props) {
		await logseq.Editor.upsertBlockProperty(block.uuid, prop, val);
	}
}