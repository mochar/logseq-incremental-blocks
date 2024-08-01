import Beta from "../algorithm/beta";

export async function onCreateIbCommand({ uuid }: { uuid: string }) {
	const block = await logseq.Editor.getBlock(uuid);
	if (!block) return;

	let props = new Map<string, any>([
		['ib-a', block.properties?.ibA ?? 1.0],
		['ib-b', block.properties?.ibB ?? 1.0],
	]);
	console.log(props);
	props.set('ib-sample', 
		block.properties?.ibSample ?? new Beta(props.get('ib-a'), props.get('ib-b')).sample());
	for (let [prop, val] of props) {
		await logseq.Editor.upsertBlockProperty(block.uuid, prop, val);
	}
}